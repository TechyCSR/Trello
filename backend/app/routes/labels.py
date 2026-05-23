from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Board, Label, User
from app.routes.deps import board_share_token, current_user
from app.schemas.card import LabelCreate, LabelRead
from app.services.security import ensure_board_editor
from app.services.serializers import label_read

router = APIRouter(prefix="/labels", tags=["labels"])


@router.post("", response_model=LabelRead, status_code=status.HTTP_201_CREATED)
def create_label(
    payload: LabelCreate,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    share_token: str | None = Depends(board_share_token),
) -> dict:
    board = ensure_board_editor(db, db.get(Board, payload.board_id), user, share_token)
    label = Label(board_id=board.id, name=payload.name.strip(), color=payload.color)
    db.add(label)
    db.commit()
    db.refresh(label)
    return label_read(label)
