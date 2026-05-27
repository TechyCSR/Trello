"""IMAP email poller — checks a Gmail inbox for board-addressed emails and creates cards."""

import email
import email.message
import imaplib
import logging
import re
import threading
import time
from email.header import decode_header
from email.utils import parseaddr

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models import Board, BoardList, Card, CardActivity
from app.utils.config import settings

logger = logging.getLogger("email_poller")

# Pattern to extract board token from plus-addressed email: local+board_TOKEN@domain
_TOKEN_RE = re.compile(r"\+board_([a-z0-9]+)@", re.IGNORECASE)


def _decode_header_value(raw: str | None) -> str:
    if not raw:
        return ""
    parts = decode_header(raw)
    decoded: list[str] = []
    for fragment, charset in parts:
        if isinstance(fragment, bytes):
            decoded.append(fragment.decode(charset or "utf-8", errors="replace"))
        else:
            decoded.append(fragment)
    return " ".join(decoded).strip()


def _extract_text_body(msg: email.message.Message) -> str:
    """Walk a MIME message and return the first text/plain part."""
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition", ""))
            if content_type == "text/plain" and "attachment" not in content_disposition:
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    return payload.decode(charset, errors="replace").strip()
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            charset = msg.get_content_charset() or "utf-8"
            return payload.decode(charset, errors="replace").strip()
    return ""


def _extract_board_token(to_address: str) -> str | None:
    match = _TOKEN_RE.search(to_address)
    return match.group(1) if match else None


def poll_once() -> int:
    """Check Gmail for unread emails, create cards, return number processed."""
    if not settings.email_address or not settings.email_app_password:
        return 0

    processed = 0
    mail: imaplib.IMAP4_SSL | None = None
    try:
        mail = imaplib.IMAP4_SSL(settings.email_imap_host)
        mail.login(settings.email_address, settings.email_app_password)
        mail.select("INBOX")

        _, message_ids = mail.search(None, "UNSEEN")
        if not message_ids or not message_ids[0]:
            return 0

        db: Session = SessionLocal()
        try:
            for msg_id in message_ids[0].split():
                _, msg_data = mail.fetch(msg_id, "(RFC822)")
                if not msg_data or not msg_data[0]:
                    continue
                raw_email = msg_data[0][1]
                if not isinstance(raw_email, bytes):
                    continue

                msg = email.message_from_bytes(raw_email)

                # Extract the To address and find the board token
                to_raw = msg.get("To", "") or msg.get("Delivered-To", "") or ""
                _, to_addr = parseaddr(to_raw)
                token = _extract_board_token(to_addr)
                if not token:
                    logger.debug("No board token in To: %s, skipping", to_addr)
                    continue

                # Find board by token
                board = db.query(Board).filter(Board.email_ingest_token == token).first()
                if not board:
                    logger.warning("No board for token %s, skipping", token)
                    continue

                # Find the inbox list for this board
                inbox_list = (
                    db.query(BoardList)
                    .filter(BoardList.board_id == board.id, BoardList.is_inbox.is_(True))
                    .first()
                )
                if not inbox_list:
                    inbox_list = (
                        db.query(BoardList)
                        .filter(BoardList.board_id == board.id)
                        .order_by(BoardList.position)
                        .first()
                    )
                if not inbox_list:
                    logger.warning("Board %d has no lists, skipping", board.id)
                    continue

                subject = _decode_header_value(msg.get("Subject")) or "Untitled email"
                body = _extract_text_body(msg)
                from_name, from_addr = parseaddr(msg.get("From", ""))
                from_display = _decode_header_value(from_name) or from_addr

                # Create card
                max_pos = (
                    db.query(func.max(Card.position))
                    .filter(Card.list_id == inbox_list.id, Card.archived.is_(False))
                    .scalar()
                ) or 0
                card = Card(
                    list_id=inbox_list.id,
                    title=subject[:160],
                    description=f"**From:** {from_display}\n\n{body}" if body else f"**From:** {from_display}",
                    position=float(max_pos) + 1024,
                    created_by_id=board.owner_id,
                )
                db.add(card)
                db.flush()
                db.add(
                    CardActivity(
                        board_id=board.id,
                        card_id=card.id,
                        user_id=None,
                        action="email",
                        detail=f"Created from email by {from_display}",
                    )
                )
                db.commit()
                processed += 1
                logger.info("Created card #%d from email to board %d", card.id, board.id)

                # Mark email as seen
                mail.store(msg_id, "+FLAGS", "\\Seen")
        finally:
            db.close()
    except imaplib.IMAP4.error as exc:
        logger.error("IMAP error: %s", exc)
    except Exception:
        logger.exception("Unexpected email poller error")
    finally:
        if mail:
            try:
                mail.close()
                mail.logout()
            except Exception:
                pass
    return processed


def _poll_loop() -> None:
    """Background thread loop that polls every N seconds."""
    interval = max(10, settings.email_poll_interval)
    while True:
        try:
            count = poll_once()
            if count:
                print(f"[email_poller] Processed {count} email(s)")
        except Exception as exc:
            print(f"[email_poller] Poll cycle error: {exc}")
        time.sleep(interval)


_thread: threading.Thread | None = None


def start_email_poller() -> None:
    """Start the background poller thread (safe to call multiple times)."""
    global _thread
    if not settings.email_address or not settings.email_app_password:
        print("[email_poller] DISABLED — EMAIL_ADDRESS or EMAIL_APP_PASSWORD not set in .env")
        return
    if _thread and _thread.is_alive():
        return
    _thread = threading.Thread(target=_poll_loop, daemon=True, name="email-poller")
    _thread.start()
    print(f"[email_poller] Started — polling {settings.email_imap_host} as {settings.email_address} every {settings.email_poll_interval}s")
