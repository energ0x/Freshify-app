"""
Grocery Schemas Module

Defines Pydantic models for managing grocery items, including shopping list additions,
updates, responses, and cross-feature fridge transfers.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid
from app.schemas.product import CategoryResponse


class GroceryItemCreate(BaseModel):
    """
    Schema representing user input when creating/adding an item to their grocery list.
    """
    name: str
    category_id: Optional[uuid.UUID] = None
    quantity: float = 1.0
    unit: str = "шт"  # Defaults to pieces ('шт')
    notes: Optional[str] = None


class GroceryItemUpdate(BaseModel):
    """
    Schema for updating an existing grocery item.
    All attributes are optional to support patch operations.
    """
    name: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    is_purchased: Optional[bool] = None  # Allows marking items as bought
    notes: Optional[str] = None


class GroceryItemResponse(BaseModel):
    """
    Detailed database representation of a grocery list item, returned in response payload.
    Provides complete fields including associations with Category if resolved.
    """
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    category_id: Optional[uuid.UUID] = None
    category_obj: Optional[CategoryResponse] = None  # Populated category object info
    quantity: float
    unit: str
    is_purchased: bool
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        # Allows schema to interface seamlessly with SQLAlchemy objects
        from_attributes = True


class AddFromFridgeRequest(BaseModel):
    """
    Request model containing list of expired or consumed product IDs to add back 
    to the shopping list.
    """
    product_ids: list[uuid.UUID]