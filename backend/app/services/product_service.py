from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from datetime import date, timedelta
from typing import Optional, List
from fastapi import HTTPException, status
import uuid
from app.db.models import Product, ConsumedProduct, User, Category
from app.schemas.product import ProductCreate, ProductUpdate


def add_xp(db: Session, user_id: uuid.UUID, amount: int):
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        if user.xp_points is None:
            user.xp_points = 0
        user.xp_points += amount


def get_products(
    db: Session,
    user_id: uuid.UUID,
    category_id: Optional[uuid.UUID] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> List[Product]:
    query = db.query(Product).options(joinedload(Product.category_obj)).filter(
        and_(Product.user_id == user_id, Product.is_active == True, Product.quantity > 0)
    )
    if category_id:
        query = query.filter(Product.category_id == category_id)

    sort_col = getattr(Product, sort_by, Product.created_at)
    if sort_order == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    return query.all()


def get_product(db: Session, product_id: uuid.UUID, user_id: uuid.UUID) -> Product:
    product = db.query(Product).options(joinedload(Product.category_obj)).filter(
        and_(Product.id == product_id, Product.user_id == user_id, Product.is_active == True)
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


def create_product(db: Session, data: ProductCreate, user_id: uuid.UUID) -> Product:
    product_data = data.model_dump()
    product = Product(**product_data, user_id=user_id)
    db.add(product)
    
    # Додаємо XP за додавання продукту (наприклад, 10 XP)
    add_xp(db, user_id, 10)
    
    db.commit()
    db.refresh(product)
    db.refresh(product, attribute_names=['category_obj'])
    return product


def update_product(db: Session, product_id: uuid.UUID, data: ProductUpdate, user_id: uuid.UUID) -> Product:
    product = get_product(db, product_id, user_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    db.refresh(product, attribute_names=['category_obj'])
    return product


def delete_product(db: Session, product_id: uuid.UUID, user_id: uuid.UUID) -> None:
    product = get_product(db, product_id, user_id)
    product.is_active = False
    db.commit()


def consume_product(db: Session, product_id: uuid.UUID, quantity: float, user_id: uuid.UUID) -> Product:
    product = get_product(db, product_id, user_id)
    if quantity > product.quantity:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient quantity")

    consumed = ConsumedProduct(
        user_id=user_id,
        product_id=product_id,
        product_name=product.name,
        category_id=product.category_id,
        quantity=quantity,
        unit=product.unit,
    )
    db.add(consumed)
    product.quantity -= quantity
    
    # Додаємо XP за споживання продукту (наприклад, 20 XP, оскільки ми врятували його від псування)
    add_xp(db, user_id, 20)
    
    db.commit()
    db.refresh(product)
    db.refresh(product, attribute_names=['category_obj'])
    return product


def get_expiring_products(db: Session, user_id: uuid.UUID, days: int = 3) -> List[Product]:
    cutoff = date.today() + timedelta(days=days)
    return db.query(Product).options(joinedload(Product.category_obj)).filter(
        and_(
            Product.user_id == user_id,
            Product.is_active == True,
            Product.expiry_date != None,
            Product.expiry_date <= cutoff,
            Product.expiry_date >= date.today(),
        )
    ).all()


def get_expired_products(db: Session, user_id: uuid.UUID) -> List[Product]:
    return db.query(Product).options(joinedload(Product.category_obj)).filter(
        and_(
            Product.user_id == user_id,
            Product.is_active == True,
            Product.expiry_date != None,
            Product.expiry_date < date.today(),
        )
    ).all()


def get_consumed_products(db: Session, user_id: uuid.UUID, limit: int = 100) -> List[ConsumedProduct]:
    """Get consumption history for a user sorted by consumed_at descending."""
    return db.query(ConsumedProduct).options(joinedload(ConsumedProduct.category_obj)).filter(
        ConsumedProduct.user_id == user_id
    ).order_by(ConsumedProduct.consumed_at.desc()).limit(limit).all()