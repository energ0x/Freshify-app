from pydantic import BaseModel
from datetime import date
from typing import Optional

#gemini response schema
class AIProductResponse(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    estimated_shelf_life_days: Optional[int] = None
    error: Optional[str] = None

#react native schema
class ProductCreate(BaseModel):
    name: str
    category: str
    expiry_date: date
    image_uri: Optional[str] = None
    barcode: Optional[str] = None

# Відповідь для клієнта після створення продукту
class ProductResponse(ProductCreate):
    id: int

    class Config:
        from_attributes = True