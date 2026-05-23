from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, func
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.models import Board, BoardList, BoardMember, Card, CardLabel, CardMember, Checklist, ChecklistItem, Label, User
from app.routes.deps import board_share_token, current_user
from app.schemas.card import CardCreate, CardMove, CardRead, CardSearchResult, CardUpdate
from app.services.security import ensure_board_access, ensure_board_editor
from app.services.serializers import card_read

router = APIRouter(prefix="/cards", tags=["cards"])


def card_options():
    return (
        selectinload(Card.list).selectinload(BoardList.board),
        selectinload(Card.label_links).selectinload(CardLabel.label),
        selectinload(Card.member_links).selectinload(CardMember.user),
        selectinload(Card.checklists).selectinload(Checklist.items),
    )


def card_loaded(db: Session, card_id: int) -> Card | None:
    return db.query(Card).options(*card_options()).filter(Card.id == card_id).first()


def validate_card_relations(db: Session, board: Board, label_ids: list[int] | None, member_ids: list[int] | None) -> None:
    if label_ids is not None:
        found = db.query(Label.id).filter(Label.board_id == board.id, Label.id.in_(label_ids)).count()
        if found != len(set(label_ids)):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more labels do not belong to this board")
    if member_ids is not None:
        allowed = {board.owner_id}
        allowed.update(row[0] for row in db.query(BoardMember.user_id).filter(BoardMember.board_id == board.id).all())
        if not set(member_ids).issubset(allowed):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more users are not board members")


def sync_card_links(db: Session, card: Card, label_ids: list[int] | None, member_ids: list[int] | None) -> None:
    if label_ids is not None:
        db.query(CardLabel).filter(CardLabel.card_id == card.id).delete()
        for label_id in dict.fromkeys(label_ids):
            db.add(CardLabel(card_id=card.id, label_id=label_id))
    if member_ids is not None:
        db.query(CardMember).filter(CardMember.card_id == card.id).delete()
        for user_id in dict.fromkeys(member_ids):
            db.add(CardMember(card_id=card.id, user_id=user_id))


def sync_checklists(db: Session, card: Card, payload: CardUpdate) -> None:
    if payload.checklists is None:
        return
    db.query(Checklist).filter(Checklist.card_id == card.id).delete()
    db.flush()
    for checklist_payload in payload.checklists:
        checklist = Checklist(card_id=card.id, title=checklist_payload.title)
        db.add(checklist)
        db.flush()
        for item in checklist_payload.items:
            db.add(ChecklistItem(checklist_id=checklist.id, title=item.title, is_done=item.is_done, position=item.position))


@router.post("", response_model=CardRead, status_code=status.HTTP_201_CREATED)
def create_card(
    payload: CardCreate,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    share_token: str | None = Depends(board_share_token),
) -> dict:
    board_list = db.query(BoardList).options(selectinload(BoardList.board)).filter(BoardList.id == payload.list_id).first()
    board = ensure_board_editor(db, board_list.board if board_list else None, user, share_token)
    validate_card_relations(db, board, payload.label_ids, payload.member_ids)
    max_position = db.query(func.max(Card.position)).filter(Card.list_id == board_list.id, Card.archived.is_(False)).scalar() or 0
    card = Card(
        list_id=board_list.id,
        title=payload.title,
        description=payload.description,
        due_date=payload.due_date,
        position=float(max_position) + 1024,
        created_by_id=user.id,
    )
    db.add(card)
    db.flush()
    if card.created_at is None:
        card.created_at = datetime.now(timezone.utc)
    if card.updated_at is None:
        card.updated_at = card.created_at
    sync_card_links(db, card, payload.label_ids, payload.member_ids)
    db.commit()
    return card_read(card_loaded(db, card.id))


@router.patch("/move", response_model=CardRead)
def move_card(
    payload: CardMove,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    share_token: str | None = Depends(board_share_token),
) -> dict:
    card = card_loaded(db, payload.card_id)
    source_board = ensure_board_editor(db, card.list.board if card else None, user, share_token)
    target_list = db.query(BoardList).options(selectinload(BoardList.board)).filter(BoardList.id == payload.target_list_id).first()
    target_board = ensure_board_editor(db, target_list.board if target_list else None, user, share_token)
    if source_board.id != target_board.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cards can only move inside the same board")
    card.list_id = target_list.id
    card.position = payload.position
    db.commit()
    return card_read(card_loaded(db, card.id))


@router.patch("/{card_id}", response_model=CardRead)
def update_card(
    card_id: int,
    payload: CardUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    share_token: str | None = Depends(board_share_token),
) -> dict:
    card = card_loaded(db, card_id)
    board = ensure_board_editor(db, card.list.board if card else None, user, share_token)
    validate_card_relations(db, board, payload.label_ids, payload.member_ids)
    for field in ("title", "description", "due_date", "archived"):
        value = getattr(payload, field)
        if value is not None:
            setattr(card, field, value)
    sync_card_links(db, card, payload.label_ids, payload.member_ids)
    sync_checklists(db, card, payload)
    db.commit()
    return card_read(card_loaded(db, card.id))


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(
    card_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    share_token: str | None = Depends(board_share_token),
) -> None:
    card = card_loaded(db, card_id)
    ensure_board_editor(db, card.list.board if card else None, user, share_token)
    db.delete(card)
    db.commit()


@router.get("/search", response_model=list[CardSearchResult])
def search_cards(
    q: str = "",
    board_id: int | None = None,
    label_id: int | None = None,
    member_id: int | None = None,
    due: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    share_token: str | None = Depends(board_share_token),
) -> list[dict]:
    query = (
        db.query(Card)
        .options(*card_options())
        .join(BoardList)
        .join(Board)
        .filter(Card.archived.is_(False))
        .filter(Card.title.ilike(f"%{q}%"))
    )
    if board_id is not None:
        query = query.filter(Board.id == board_id)
    if label_id is not None:
        query = query.join(CardLabel).filter(CardLabel.label_id == label_id)
    if member_id is not None:
        query = query.join(CardMember).filter(CardMember.user_id == member_id)
    now = datetime.now(timezone.utc)
    if due == "overdue":
        query = query.filter(and_(Card.due_date.is_not(None), Card.due_date < now))
    if due == "week":
        query = query.filter(and_(Card.due_date.is_not(None), Card.due_date <= now + timedelta(days=7)))
    results = []
    for card in query.order_by(Card.updated_at.desc()).limit(50).all():
        board = ensure_board_access(db, card.list.board, user, share_token)
        item = card_read(card)
        item["board_id"] = board.id
        item["board_title"] = board.title
        item["list_title"] = card.list.title
        results.append(item)
    return results
