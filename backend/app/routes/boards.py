from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.models import Board, BoardList, BoardMember, Card, CardLabel, CardMember, Checklist, User
from app.routes.deps import current_user
from app.schemas.board import BoardCreate, BoardDetail, BoardSummary, BoardUpdate
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


def get_board_loaded(db: Session, board_id: int) -> Board | None:
    return db.query(Board).options(*board_options()).filter(Board.id == board_id).first()


@router.get("", response_model=list[BoardSummary])
def list_boards(
    q: str | None = None,
    visibility: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
) -> list[dict]:
    query = (
        db.query(Board)
        .options(*board_options())
        .outerjoin(BoardMember, BoardMember.board_id == Board.id)
        .filter(or_(Board.is_public.is_(True), Board.owner_id == user.id, BoardMember.user_id == user.id))
        .distinct()
    )
    if q:
        query = query.filter(Board.title.ilike(f"%{q}%"))
    if visibility == "public":
        query = query.filter(Board.is_public.is_(True))
    if visibility == "private":
        query = query.filter(Board.is_public.is_(False))
    boards = query.order_by(Board.updated_at.desc(), Board.id.desc()).all()
    return [board_summary(board) for board in boards]


@router.post("", response_model=BoardDetail, status_code=status.HTTP_201_CREATED)
def create_board(payload: BoardCreate, db: Session = Depends(get_db), user: User = Depends(current_user)) -> dict:
    board = Board(
        title=payload.title,
        description=payload.description,
        color=payload.color,
        is_public=payload.is_public,
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


@router.get("/{board_id}", response_model=BoardDetail)
def get_board(board_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)) -> dict:
    board = ensure_board_access(db, get_board_loaded(db, board_id), user)
    return board_detail(board)


@router.patch("/{board_id}", response_model=BoardDetail)
def update_board(board_id: int, payload: BoardUpdate, db: Session = Depends(get_db), user: User = Depends(current_user)) -> dict:
    board = ensure_board_editor(db, get_board_loaded(db, board_id), user)
    for field in ("title", "description", "color", "is_public"):
        value = getattr(payload, field)
        if value is not None:
            setattr(board, field, value)
    if payload.member_ids is not None:
        db.query(BoardMember).filter(BoardMember.board_id == board.id, BoardMember.user_id != board.owner_id).delete()
        valid_users = db.query(User).filter(User.id.in_(set(payload.member_ids))).all()
        for member in valid_users:
            if member.id != board.owner_id:
                db.add(BoardMember(board_id=board.id, user_id=member.id))
    db.commit()
    return board_detail(get_board_loaded(db, board.id))


@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_board(board_id: int, db: Session = Depends(get_db), user: User = Depends(current_user)) -> None:
    board = ensure_board_editor(db, db.get(Board, board_id), user)
    if board.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the owner can delete a board")
    db.delete(board)
    db.commit()
