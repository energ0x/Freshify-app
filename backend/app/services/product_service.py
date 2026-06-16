"""
Product Service Module.

Manages the core lifecycle of food products in the Freshify system. It includes
adding products, listing active products, updating details, soft-deleting products,
consuming/marking products consumed (which awards extra experience points), retrieving
expiring or expired items, and listing consumption history logs.
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from datetime import date, timedelta
from typing import Optional, List
from fastapi import HTTPException, status
import uuid
from app.db.models import Product, ConsumedProduct, User, Category
from app.schemas.product import ProductCreate, ProductUpdate


def add_xp(db: Session, user_id: uuid.UUID, amount: int):
    """
    Reward a user with experience points (XP).

    Parameters:
        db (Session): The active database session.
        user_id (uuid.UUID): ID of the user receiving the XP.
        amount (int): Number of XP points to award.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        # Default xp_points count to 0 if previously unitialized/None.
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
    """
    Retrieve active products for a specific user, sorted and filtered.

    Only retrieves products that are active, have quantity > 0, and belong to the user.
    Optionally filters by category.

    Parameters:
        db (Session): The database session.
        user_id (uuid.UUID): The user ID.
        category_id (Optional[uuid.UUID]): Optional category ID filter.
        sort_by (str): Column name to sort the result list (defaults to 'created_at').
        sort_order (str): Sort direction, either 'asc' or 'desc'.

    Returns:
        List[Product]: List of product models with loaded category objects.
    """
    # Build base query and load associated category objects to avoid N+1 query issues.
    query = db.query(Product).options(joinedload(Product.category_obj)).filter(
        and_(Product.user_id == user_id, Product.is_active == True, Product.quantity > 0)
    )
    # Apply category filter if specified.
    if category_id:
        query = query.filter(Product.category_id == category_id)

    # Dynamically extract sorting column.
    sort_col = getattr(Product, sort_by, Product.created_at)
    if sort_order == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    return query.all()


def get_product(db: Session, product_id: uuid.UUID, user_id: uuid.UUID) -> Product:
    """
    Retrieve a single active product by its ID.

    Parameters:
        db (Session): The database session.
        product_id (uuid.UUID): The product ID to query.
        user_id (uuid.UUID): The owner's user ID.

    Returns:
        Product: The retrieved Product model.

    Raises:
        HTTPException: 404 Not Found if the product doesn't exist, is inactive, or belongs to another user.
    """
    product = db.query(Product).options(joinedload(Product.category_obj)).filter(
        and_(Product.id == product_id, Product.user_id == user_id, Product.is_active == True)
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


def create_product(db: Session, data: ProductCreate, user_id: uuid.UUID) -> Product:
    """
    Create a new product in the database and award XP to the user.

    Parameters:
        db (Session): The database session.
        data (ProductCreate): Schema detailing parameters for the new product.
        user_id (uuid.UUID): User ID who owns the product.

    Returns:
        Product: The created and refreshed Product object.
    """
    # Extract data attributes and instantiate database model.
    product_data = data.model_dump()
    product = Product(**product_data, user_id=user_id)
    db.add(product)
    
    # Додаємо XP за додавання продукту (наприклад, 10 XP)
    # Award 10 XP points for logging a new product.
    add_xp(db, user_id, 10)
    
    db.commit()
    db.refresh(product)
    db.refresh(product, attribute_names=['category_obj'])
    return product


def update_product(db: Session, product_id: uuid.UUID, data: ProductUpdate, user_id: uuid.UUID) -> Product:
    """
    Update details of an existing product.

    Parameters:
        db (Session): The database session.
        product_id (uuid.UUID): Product ID.
        data (ProductUpdate): Schema detailing the fields to update.
        user_id (uuid.UUID): The owner's user ID.

    Returns:
        Product: The updated and refreshed Product object.
    """
    product = get_product(db, product_id, user_id)
    # Iterate and apply changes for fields set in the update request.
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    db.refresh(product, attribute_names=['category_obj'])
    return product


def delete_product(db: Session, product_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """
    Soft-delete a product by marking is_active to False.

    Parameters:
        db (Session): The database session.
        product_id (uuid.UUID): Product ID.
        user_id (uuid.UUID): Owner user ID.
    """
    product = get_product(db, product_id, user_id)
    product.is_active = False
    db.commit()


def consume_product(db: Session, product_id: uuid.UUID, quantity: float, user_id: uuid.UUID) -> Product:
    """
    Consume a specific amount of a product and log the event.

    Creates a ConsumedProduct record, reduces the product's remaining quantity,
    and awards XP to reward the user for utilizing food before it spoils.

    Parameters:
        db (Session): The database session.
        product_id (uuid.UUID): Product ID.
        quantity (float): Quantity consumed.
        user_id (uuid.UUID): User ID.

    Returns:
        Product: The updated Product model.

    Raises:
        HTTPException: 400 Bad Request if the requested quantity exceeds the remaining stock.
    """
    product = get_product(db, product_id, user_id)
    # Validate stock quantity bounds.
    if quantity > product.quantity:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient quantity")

    # Create a history record for the consumed product.
    consumed = ConsumedProduct(
        user_id=user_id,
        product_id=product_id,
        product_name=product.name,
        category_id=product.category_id,
        quantity=quantity,
        unit=product.unit,
    )
    db.add(consumed)
    # Decrement available quantity.
    product.quantity -= quantity
    
    # Додаємо XP за споживання продукту (наприклад, 20 XP, оскільки ми врятували його від псування)
    # Award 20 XP for consuming the product.
    add_xp(db, user_id, 20)
    
    db.commit()
    db.refresh(product)
    db.refresh(product, attribute_names=['category_obj'])
    return product


def get_expiring_products(db: Session, user_id: uuid.UUID, days: int = 3) -> List[Product]:
    """
    Get active products expiring within the specified number of days.

    Parameters:
        db (Session): The database session.
        user_id (uuid.UUID): User ID.
        days (int): Expiry threshold in days from today (default is 3).

    Returns:
        List[Product]: List of matching expiring Product objects.
    """
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
    """
    Get active products whose expiry dates are in the past.

    Parameters:
        db (Session): The database session.
        user_id (uuid.UUID): User ID.

    Returns:
        List[Product]: List of expired Product objects.
    """
    return db.query(Product).options(joinedload(Product.category_obj)).filter(
        and_(
            Product.user_id == user_id,
            Product.is_active == True,
            Product.expiry_date != None,
            Product.expiry_date < date.today(),
        )
    ).all()


def get_consumed_products(db: Session, user_id: uuid.UUID, limit: int = 100) -> List[ConsumedProduct]:
    """
    Get consumption history logs for a user sorted by consumed_at descending.

    Parameters:
        db (Session): The database session.
        user_id (uuid.UUID): User ID.
        limit (int): Maximum number of entries to return (default is 100).

    Returns:
        List[ConsumedProduct]: List of ConsumedProduct entries.
    """
    return db.query(ConsumedProduct).options(joinedload(ConsumedProduct.category_obj)).filter(
        ConsumedProduct.user_id == user_id
    ).order_by(ConsumedProduct.consumed_at.desc()).limit(limit).all()