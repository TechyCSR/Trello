from fastapi import Header, HTTPException, status
from sqlalchemy.orm import Session

from app.models import Board, BoardMember, User


def get_current_user(db: Session, x_user_id: int | None = Header(default=None, alias="X-USER-ID")) -> User:
    if x_user_id is None:
        user = db.query(User).order_by(User.id).first()
    else:
        user = db.get(User, x_user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown simulated user")
    return user


def has_share_token_access(board: Board, share_token: str | None) -> bool:
    if not share_token:
        return False
    if not board.share_enabled:
        return False
    if not board.share_token:
        return False
    return board.share_token == share_token


def can_access_board(db: Session, board: Board, user: User, share_token: str | None = None) -> bool:
    if board.owner_id == user.id:
        return True
    is_member = db.query(BoardMember.board_id).filter_by(board_id=board.id, user_id=user.id).first() is not None
    if is_member:
        return True
    return has_share_token_access(board, share_token)


def ensure_board_access(db: Session, board: Board | None, user: User, share_token: str | None = None) -> Board:
    if not board or not can_access_board(db, board, user, share_token):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")
    return board


def ensure_board_editor(db: Session, board: Board | None, user: User, share_token: str | None = None) -> Board:
    board = ensure_board_access(db, board, user, share_token)
    if board.owner_id == user.id:
        return board
    member = db.query(BoardMember).filter_by(board_id=board.id, user_id=user.id).first()
    if not member:
        if not has_share_token_access(board, share_token):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Board membership required")
    return board
