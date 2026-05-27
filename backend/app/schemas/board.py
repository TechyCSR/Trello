from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.user import UserRead


class BoardCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    inbox_title: str = Field(default="Inbox", min_length=1, max_length=120)
    board_section_title: str = Field(default="Board", min_length=1, max_length=120)
    description: str | None = None
    color: str = "sky"
    is_public: bool = False
    member_ids: list[int] = []


class BoardUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    inbox_title: str | None = Field(default=None, min_length=1, max_length=120)
    board_section_title: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = None
    color: str | None = None
    is_public: bool | None = None
    member_ids: list[int] | None = None


class BoardSummary(BaseModel):
    id: int
    board_code: str
    title: str
    inbox_title: str
    board_section_title: str
    description: str | None
    color: str
    is_public: bool
    visibility: str
    share_enabled: bool
    owner_id: int
    created_at: datetime
    updated_at: datetime
    members: list[UserRead] = []
    list_count: int = 0
    card_count: int = 0
    email_ingest_token: str | None = None
    email_address: str | None = None


class BoardDetail(BoardSummary):
    labels: list["LabelRead"] = []
    lists: list["ListRead"] = []


from app.schemas.card import LabelRead, ListRead

BoardDetail.model_rebuild()
