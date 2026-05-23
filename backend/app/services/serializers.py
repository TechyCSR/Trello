from datetime import datetime, timezone

from app.models import Board, BoardList, Card, Checklist, Label, User


def user_read(user: User) -> dict:
    return {"id": user.id, "name": user.name, "avatar": user.avatar, "created_at": user.created_at}


def label_read(label: Label) -> dict:
    return {"id": label.id, "board_id": label.board_id or 0, "name": label.name, "color": label.color}


def checklist_read(checklist: Checklist) -> dict:
    return {
        "id": checklist.id,
        "title": checklist.title,
        "items": [
            {"id": item.id, "title": item.title or "", "is_done": item.is_done, "position": float(item.position)}
            for item in checklist.items
        ],
    }


def card_read(card: Card) -> dict:
    created_at = card.created_at or datetime.now(timezone.utc)
    updated_at = card.updated_at or created_at
    return {
        "id": card.id,
        "list_id": card.list_id,
        "title": card.title,
        "description": card.description,
        "position": float(card.position),
        "due_date": card.due_date,
        "archived": card.archived,
        "created_by_id": card.created_by_id,
        "created_at": created_at,
        "updated_at": updated_at,
        "labels": [label_read(link.label) for link in card.label_links],
        "members": [user_read(link.user) for link in card.member_links],
        "checklists": [checklist_read(checklist) for checklist in card.checklists],
    }


def list_read(board_list: BoardList) -> dict:
    return {
        "id": board_list.id,
        "board_id": board_list.board_id,
        "title": board_list.title,
        "position": float(board_list.position),
        "cards": [card_read(card) for card in board_list.cards if not card.archived],
    }


def board_summary(board: Board, list_count: int | None = None, card_count: int | None = None) -> dict:
    resolved_list_count = list_count if list_count is not None else len(board.lists)
    resolved_card_count = (
        card_count if card_count is not None else sum(len([card for card in board_list.cards if not card.archived]) for board_list in board.lists)
    )
    return {
        "id": board.id,
        "board_code": board.board_code,
        "title": board.title,
        "description": board.description,
        "color": board.color,
        "is_public": board.is_public,
        "visibility": board.visibility or ("public" if board.is_public else "private"),
        "share_enabled": bool(board.share_enabled),
        "owner_id": board.owner_id,
        "created_at": board.created_at,
        "updated_at": board.updated_at,
        "members": [user_read(member.user) for member in board.members],
        "list_count": resolved_list_count,
        "card_count": resolved_card_count,
    }


def board_detail(board: Board) -> dict:
    detail = board_summary(board)
    detail["labels"] = [label_read(label) for label in board.labels]
    detail["lists"] = [list_read(board_list) for board_list in board.lists]
    return detail
