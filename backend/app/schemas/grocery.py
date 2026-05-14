from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid


class GroceryItemCreate(BaseModel):
    name: str
    category: Optional[str] = None
    quantity: float = 1.0
    unit: str = "шт"
    notes: Optional[str] = None


class GroceryItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    is_purchased: Optional[bool] = None
    notes: Optional[str] = None


class GroceryItemResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    category: Optional[str] = None
    quantity: float
    unit: str
    is_purchased: bool
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AddFromFridgeRequest(BaseModel):
    product_ids: list[uuid.UUID]
