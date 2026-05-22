from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Label(Base):
    __tablename__ = "labels"

    id: Mapped[int] = mapped_column(primary_key=True)
    board_id: Mapped[int] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(40), nullable=False)
    color: Mapped[str] = mapped_column(String(24), nullable=False)

    board = relationship("Board", back_populates="labels")
    card_links = relationship("CardLabel", back_populates="label", cascade="all, delete-orphan")


class CardLabel(Base):
    __tablename__ = "card_labels"
    __table_args__ = (UniqueConstraint("card_id", "label_id", name="uq_card_label"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    card_id: Mapped[int] = mapped_column(ForeignKey("cards.id", ondelete="CASCADE"), index=True)
    label_id: Mapped[int] = mapped_column(ForeignKey("labels.id", ondelete="CASCADE"), index=True)

    card = relationship("Card", back_populates="label_links")
    label = relationship("Label", back_populates="card_links")
