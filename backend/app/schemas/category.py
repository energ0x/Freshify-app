"""
Category Schemas Module

Defines Pydantic models representing food categories used to classify inventory items
and organize the shopping list.
"""

from pydantic import BaseModel
from typing import Optional
import uuid


class CategoryCreate(BaseModel):
    """
    Schema validating user-defined input when creating a new custom category.
    """
    name: str


class CategoryUpdate(BaseModel):
    """
    Schema validating updates to an existing food category.
    """
    name: Optional[str] = None


class CategoryResponse(BaseModel):
    """
    Serializer model returned in HTTP responses representing category details.
    Includes support for system-wide categories (user_id is None) and user-specific custom ones.
    """
    id: uuid.UUID
    name: str
    user_id: Optional[uuid.UUID] = None

    class Config:
        # Allows reading properties directly from database ORM models
        from_attributes = True