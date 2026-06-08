from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
import uuid
from app.db.database import get_db
from app.db.models import User
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse, ProductConsumeRequest, ConsumedProductResponse
from app.services import product_service
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=List[ProductResponse])
def list_products(
    category_id: Optional[uuid.UUID] = Query(None),
    sort_by: str = Query("created_at", regex="^(name|quantity|expiry_date|created_at)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return product_service.get_products(db, current_user.id, category_id, sort_by, sort_order)


@router.post("", response_model=ProductResponse, status_code=201)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return product_service.create_product(db, data, current_user.id)


@router.get("/expiring", response_model=List[ProductResponse])
def get_expiring(
    days: int = Query(3, ge=1, le=30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return product_service.get_expiring_products(db, current_user.id, days)


@router.get("/expired", response_model=List[ProductResponse])
def get_expired(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return product_service.get_expired_products(db, current_user.id)


@router.get("/history/consumed", response_model=List[ConsumedProductResponse])
def get_consumed_history(
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return product_service.get_consumed_products(db, current_user.id, limit)


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return product_service.get_product(db, product_id, current_user.id)


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: uuid.UUID,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return product_service.update_product(db, product_id, data, current_user.id)


@router.delete("/{product_id}", status_code=204)
def delete_product(
    product_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product_service.delete_product(db, product_id, current_user.id)


@router.post("/{product_id}/consume", response_model=ProductResponse)
def consume_product(
    product_id: uuid.UUID,
    data: ProductConsumeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return product_service.consume_product(db, product_id, data.quantity, current_user.id)
