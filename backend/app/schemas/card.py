from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.user import UserRead


class LabelRead(BaseModel):
    id: int
    board_id: int
    name: str
    color: str

    model_config = {"from_attributes": True}


class ChecklistItemRead(BaseModel):
    id: int
    title: str
    is_done: bool
    position: float

    model_config = {"from_attributes": True}


class ChecklistRead(BaseModel):
    id: int
    title: str
    items: list[ChecklistItemRead] = []

    model_config = {"from_attributes": True}


class CardRead(BaseModel):
    id: int
    list_id: int
    title: str
    description: str | None
    position: float
    due_date: datetime | None
    archived: bool
    created_by_id: int | None
    created_at: datetime
    updated_at: datetime
    labels: list[LabelRead] = []
    members: list[UserRead] = []
    checklists: list[ChecklistRead] = []


class ListRead(BaseModel):
    id: int
    board_id: int
    title: str
    is_inbox: bool = False
    position: float
    cards: list[CardRead] = []


class ListCreate(BaseModel):
    board_id: int
    title: str = Field(min_length=1, max_length=120)
    is_inbox: bool = False


class ListUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)


class ListReorderItem(BaseModel):
    id: int
    position: float


class ListReorder(BaseModel):
    board_id: int
    lists: list[ListReorderItem]


class CardCreate(BaseModel):
    list_id: int
    title: str = Field(min_length=1, max_length=160)
    description: str | None = None
    due_date: datetime | None = None
    label_ids: list[int] = []
    member_ids: list[int] = []


class ChecklistItemInput(BaseModel):
    id: int | None = None
    title: str = Field(min_length=1, max_length=180)
    is_done: bool = False
    position: float = 0


class ChecklistInput(BaseModel):
    id: int | None = None
    title: str = Field(default="Checklist", max_length=120)
    items: list[ChecklistItemInput] = []


class CardUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = None
    due_date: datetime | None = None
    archived: bool | None = None
    label_ids: list[int] | None = None
    member_ids: list[int] | None = None
    checklists: list[ChecklistInput] | None = None


class CardMove(BaseModel):
    card_id: int
    target_list_id: int
    position: float


class CardSearchResult(CardRead):
    board_id: int
    board_title: str
    list_title: str
