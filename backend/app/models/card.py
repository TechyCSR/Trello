from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Card(Base):
    __tablename__ = "cards"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    list_id: Mapped[int] = mapped_column(ForeignKey("lists.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    position: Mapped[float] = mapped_column(Numeric(12, 4), default=0)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    archived: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    list = relationship("BoardList", back_populates="cards")
    label_links = relationship("CardLabel", back_populates="card", cascade="all, delete-orphan")
    member_links = relationship("CardMember", back_populates="card", cascade="all, delete-orphan")
    checklists = relationship("Checklist", back_populates="card", cascade="all, delete-orphan")


class CardMember(Base):
    __tablename__ = "card_members"
    __table_args__ = (UniqueConstraint("card_id", "user_id", name="uq_card_member"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    card_id: Mapped[int] = mapped_column(ForeignKey("cards.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    card = relationship("Card", back_populates="member_links")
    user = relationship("User", back_populates="card_memberships")


class Checklist(Base):
    __tablename__ = "checklists"

    id: Mapped[int] = mapped_column(primary_key=True)
    card_id: Mapped[int] = mapped_column(ForeignKey("cards.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(120), default="Checklist")

    card = relationship("Card", back_populates="checklists")
    items = relationship("ChecklistItem", back_populates="checklist", cascade="all, delete-orphan", order_by="ChecklistItem.position")


class ChecklistItem(Base):
    __tablename__ = "checklist_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    checklist_id: Mapped[int] = mapped_column(ForeignKey("checklists.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    is_done: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[float] = mapped_column(Numeric(12, 4), default=0)

    checklist = relationship("Checklist", back_populates="items")
