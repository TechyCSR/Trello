from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    avatar: Mapped[str] = mapped_column(String(8), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    owned_boards = relationship("Board", back_populates="owner")
    board_memberships = relationship("BoardMember", back_populates="user", cascade="all, delete-orphan")
    card_memberships = relationship("CardMember", back_populates="user", cascade="all, delete-orphan")
