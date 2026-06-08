from pydantic import BaseModel
from typing import Optional
import uuid


class CategoryCreate(BaseModel):
    name: str


class CategoryUpdate(BaseModel):
    name: Optional[str] = None


class CategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    user_id: Optional[uuid.UUID] = None

    class Config:
        from_attributes = True