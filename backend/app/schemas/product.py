"""
Product Schemas Module

Defines Pydantic schemas for food inventory products. Covers AI-parsed vision responses,
CRUD operations, consumption tracking, and category associations.
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
import uuid


class AIProductResponse(BaseModel):
    """
    Schema representing a single product recognized by Gemini AI Vision.
    Contains optional properties since parsing is heuristic and error-prone.
    """
    name: Optional[str] = None
    category: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    category_suggestion: Optional[str] = None
    has_allergen: Optional[bool] = False  # Flag indicates if product triggers user allergens
    estimated_shelf_life_days: Optional[int] = None
    calories: Optional[float] = None
    proteins: Optional[float] = None
    fats: Optional[float] = None
    carbohydrates: Optional[float] = None
    error: Optional[str] = None


class AIProductListResponse(BaseModel):
    """
    Wrapper schema returning a list of AI-detected products.
    """
    products: List[AIProductResponse] = []
    error: Optional[str] = None


class CategoryResponse(BaseModel):
    """
    Minimal representation of category details included with product structures.
    """
    id: uuid.UUID
    name: str

    class Config:
        # Enables ORM mapping
        from_attributes = True


class ProductCreate(BaseModel):
    """
    Schema validating payload for creating a new product in the fridge.
    """
    name: str
    category_id: Optional[uuid.UUID] = None
    quantity: float = 1.0
    unit: str = "шт"
    expiry_date: Optional[date] = None
    image_url: Optional[str] = None
    notes: Optional[str] = None
    calories: Optional[float] = None
    proteins: Optional[float] = None
    fats: Optional[float] = None
    carbohydrates: Optional[float] = None


class ProductUpdate(BaseModel):
    """
    Schema for validating modifications of an existing product in inventory.
    """
    name: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    expiry_date: Optional[date] = None
    notes: Optional[str] = None
    calories: Optional[float] = None
    proteins: Optional[float] = None
    fats: Optional[float] = None
    carbohydrates: Optional[float] = None
    image_url: Optional[str] = None


class ProductConsumeRequest(BaseModel):
    """
    Request payload representing the quantity of a product being consumed.
    Used for partial or complete usage of inventory items.
    """
    quantity: float = 1.0


class ProductResponse(BaseModel):
    """
    Full details of an active food product retrieved from the database.
    """
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    category_id: Optional[uuid.UUID] = None
    category_obj: Optional[CategoryResponse] = None
    quantity: float
    unit: str
    expiry_date: Optional[date] = None
    image_url: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool
    calories: Optional[float] = None
    proteins: Optional[float] = None
    fats: Optional[float] = None
    carbohydrates: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        # Seamless mapping from database objects (ORM)
        from_attributes = True


class ConsumedProductResponse(BaseModel):
    """
    Historical log of consumed food items for progress or nutritional analysis.
    """
    id: uuid.UUID
    user_id: uuid.UUID
    product_id: Optional[uuid.UUID] = None
    product_name: str
    category_id: Optional[uuid.UUID] = None
    category_obj: Optional[CategoryResponse] = None
    quantity: float
    unit: str
    consumed_at: datetime

    class Config:
        # Seamless mapping from database objects (ORM)
        from_attributes = True