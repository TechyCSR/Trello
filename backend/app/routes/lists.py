from fastapi import APIRouter, Depends, status
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.models import Board, BoardList, BoardMember, User
from app.routes.deps import board_share_token, current_user
from app.schemas.card import ListCreate, ListRead, ListReorder, ListUpdate
from app.services.security import ensure_board_editor
from app.services.serializers import list_read

router = APIRouter(prefix="/lists", tags=["lists"])


def list_loaded(db: Session, list_id: int) -> BoardList | None:
    return (
        db.query(BoardList)
        .options(
            selectinload(BoardList.cards),
            selectinload(BoardList.board).selectinload(Board.members).selectinload(BoardMember.user),
        )
        .filter(BoardList.id == list_id)
        .first()
    )


@router.post("", response_model=ListRead, status_code=status.HTTP_201_CREATED)
def create_list(
    payload: ListCreate,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    share_token: str | None = Depends(board_share_token),
) -> dict:
    board = ensure_board_editor(db, db.get(Board, payload.board_id), user, share_token)
    max_position = db.query(func.max(BoardList.position)).filter(BoardList.board_id == board.id).scalar() or 0
    board_list = BoardList(board_id=board.id, title=payload.title, position=float(max_position) + 1024)
    db.add(board_list)
    db.commit()
    db.refresh(board_list)
    return list_read(board_list)


@router.patch("/reorder", response_model=list[ListRead])
def reorder_lists(
    payload: ListReorder,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    share_token: str | None = Depends(board_share_token),
) -> list[dict]:
    board = ensure_board_editor(db, db.get(Board, payload.board_id), user, share_token)
    positions = {item.id: item.position for item in payload.lists}
    lists = db.query(BoardList).filter(BoardList.board_id == board.id, BoardList.id.in_(positions)).all()
    for board_list in lists:
        board_list.position = positions[board_list.id]
    db.commit()
    reloaded = db.query(BoardList).options(selectinload(BoardList.cards)).filter(BoardList.board_id == board.id).order_by(BoardList.position).all()
    return [list_read(board_list) for board_list in reloaded]


@router.patch("/{list_id}", response_model=ListRead)
def update_list(
    list_id: int,
    payload: ListUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    share_token: str | None = Depends(board_share_token),
) -> dict:
    board_list = list_loaded(db, list_id)
    ensure_board_editor(db, board_list.board if board_list else None, user, share_token)
    if payload.title is not None:
        board_list.title = payload.title
    db.commit()
    return list_read(list_loaded(db, list_id))


@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_list(
    list_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    share_token: str | None = Depends(board_share_token),
) -> None:
    board_list = list_loaded(db, list_id)
    ensure_board_editor(db, board_list.board if board_list else None, user, share_token)
    db.delete(board_list)
    db.commit()
