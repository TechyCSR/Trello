from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.user import UserRead


class BoardCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str | None = None
    color: str = "sky"
    is_public: bool = False
    member_ids: list[int] = []


class BoardUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = None
    color: str | None = None
    is_public: bool | None = None
    member_ids: list[int] | None = None


class BoardSummary(BaseModel):
    id: int
    title: str
    description: str | None
    color: str
    is_public: bool
    owner_id: int
    created_at: datetime
    updated_at: datetime
    members: list[UserRead] = []
    list_count: int = 0
    card_count: int = 0


class BoardDetail(BoardSummary):
    labels: list["LabelRead"] = []
    lists: list["ListRead"] = []


from app.schemas.card import LabelRead, ListRead

BoardDetail.model_rebuild()
