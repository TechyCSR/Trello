from datetime import datetime

from pydantic import BaseModel


class UserRead(BaseModel):
    id: int
    name: str
    avatar: str
    created_at: datetime

    model_config = {"from_attributes": True}
