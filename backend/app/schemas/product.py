from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
import uuid


class AIProductResponse(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    estimated_shelf_life_days: Optional[int] = None
    error: Optional[str] = None


class ProductCreate(BaseModel):
    name: str
    category: Optional[str] = None
    quantity: float = 1.0
    unit: str = "шт"
    expiry_date: Optional[date] = None
    image_url: Optional[str] = None
    notes: Optional[str] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    expiry_date: Optional[date] = None
    notes: Optional[str] = None


class ProductConsumeRequest(BaseModel):
    quantity: float = 1.0


class ProductResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    category: Optional[str] = None
    quantity: float
    unit: str
    expiry_date: Optional[date] = None
    image_url: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConsumedProductResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    product_id: Optional[uuid.UUID] = None
    product_name: str
    category: Optional[str] = None
    quantity: float
    unit: str
    consumed_at: datetime

    class Config:
        from_attributes = True

