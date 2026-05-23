from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.models import Board, BoardList, BoardMember, Card, CardLabel, CardMember, Checklist, User
from app.routes.deps import current_user
from app.schemas.board import BoardCreate, BoardDetail, BoardSummary, BoardUpdate
from app.services.board_refs import assign_unique_board_code, assign_unique_share_token
from app.services.security import ensure_board_access, ensure_board_editor
from app.services.serializers import board_detail, board_summary

router = APIRouter(prefix="/boards", tags=["boards"])


def board_options():
    return (
        selectinload(Board.members).selectinload(BoardMember.user),
        selectinload(Board.lists).selectinload(BoardList.cards).selectinload(Card.label_links).selectinload(CardLabel.label),
        selectinload(Board.lists).selectinload(BoardList.cards).selectinload(Card.member_links).selectinload(CardMember.user),
        selectinload(Board.lists).selectinload(BoardList.cards).selectinload(Card.checklists).selectinload(Checklist.items),
        selectinload(Board.labels),
    )


def get_board_loaded(db: Session, board_ref: str | int) -> Board | None:
    query = db.query(Board).options(*board_options())
    if isinstance(board_ref, int):
        return query.filter(Board.id == board_ref).first()
    normalized = board_ref.strip().upper()
    board = query.filter(Board.board_code == normalized).first()
    if board:
        return board
    if board_ref.isdigit():
        return query.filter(Board.id == int(board_ref)).first()
    return None


@router.get("", response_model=list[BoardSummary])
def list_boards(
    q: str | None = None,
    visibility: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> list[dict]:
    accessible_board_ids = (
        db.query(Board.id)
        .outerjoin(BoardMember, BoardMember.board_id == Board.id)
        .filter(or_(Board.is_public.is_(True), Board.owner_id == user.id, BoardMember.user_id == user.id))
        .distinct()
        .subquery()
    )

    list_counts = (
        db.query(BoardList.board_id.label("board_id"), func.count(BoardList.id).label("list_count"))
        .group_by(BoardList.board_id)
        .subquery()
    )
    card_counts = (
        db.query(BoardList.board_id.label("board_id"), func.count(Card.id).label("card_count"))
        .join(Card, Card.list_id == BoardList.id)
        .filter(Card.archived.is_(False))
        .group_by(BoardList.board_id)
        .subquery()
    )

    query = (
        db.query(
            Board,
            func.coalesce(list_counts.c.list_count, 0).label("list_count"),
            func.coalesce(card_counts.c.card_count, 0).label("card_count"),
        )
        .options(selectinload(Board.members).selectinload(BoardMember.user))
        .join(accessible_board_ids, accessible_board_ids.c.id == Board.id)
        .outerjoin(list_counts, list_counts.c.board_id == Board.id)
        .outerjoin(card_counts, card_counts.c.board_id == Board.id)
    )
    if q:
        query = query.filter(Board.title.ilike(f"%{q}%"))
    if visibility == "public":
        query = query.filter(Board.is_public.is_(True))
    if visibility == "private":
        query = query.filter(Board.is_public.is_(False))
    rows = query.order_by(Board.updated_at.desc(), Board.id.desc()).all()
    return [board_summary(board, int(list_count), int(card_count)) for board, list_count, card_count in rows]


@router.post("", response_model=BoardDetail, status_code=status.HTTP_201_CREATED)
def create_board(payload: BoardCreate, db: Session = Depends(get_db), user: User = Depends(current_user)) -> dict:
    board = Board(
        board_code=assign_unique_board_code(db),
        title=payload.title,
        description=payload.description,
        color=payload.color,
        is_public=payload.is_public,
        visibility="public" if payload.is_public else "private",
        share_enabled=False,
        share_token=assign_unique_share_token(db),
        owner_id=user.id,
    )
    db.add(board)
    db.flush()
    member_ids = {user.id, *payload.member_ids}
    users = db.query(User).filter(User.id.in_(member_ids)).all()
    for member in users:
        db.add(BoardMember(board_id=board.id, user_id=member.id, role="owner" if member.id == user.id else "member"))
    db.commit()
    return board_detail(get_board_loaded(db, board.id))


@router.get("/{board_ref}", response_model=BoardDetail)
def get_board(board_ref: str, db: Session = Depends(get_db), user: User = Depends(current_user)) -> dict:
    board = ensure_board_access(db, get_board_loaded(db, board_ref), user)
    return board_detail(board)


@router.patch("/{board_ref}", response_model=BoardDetail)
def update_board(board_ref: str, payload: BoardUpdate, db: Session = Depends(get_db), user: User = Depends(current_user)) -> dict:
    board = ensure_board_editor(db, get_board_loaded(db, board_ref), user)
    for field in ("title", "description", "color", "is_public"):
        value = getattr(payload, field)
        if value is not None:
            setattr(board, field, value)
    board.visibility = "public" if board.is_public else "private"
    if payload.member_ids is not None:
        db.query(BoardMember).filter(BoardMember.board_id == board.id, BoardMember.user_id != board.owner_id).delete()
        valid_users = db.query(User).filter(User.id.in_(set(payload.member_ids))).all()
        for member in valid_users:
            if member.id != board.owner_id:
                db.add(BoardMember(board_id=board.id, user_id=member.id))
    db.commit()
    return board_detail(get_board_loaded(db, board.id))


@router.delete("/{board_ref}", status_code=status.HTTP_204_NO_CONTENT)
def delete_board(board_ref: str, db: Session = Depends(get_db), user: User = Depends(current_user)) -> None:
    board = ensure_board_editor(db, get_board_loaded(db, board_ref), user)
    if board.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the owner can delete a board")
    db.delete(board)
    db.commit()
