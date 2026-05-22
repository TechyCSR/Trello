from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import User
from app.services.security import get_current_user


def current_user(
    db: Annotated[Session, Depends(get_db)],
    x_user_id: Annotated[int | None, Header(alias="X-USER-ID")] = None,
) -> User:
    return get_current_user(db, x_user_id)
