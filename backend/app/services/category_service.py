"""
Category Service Module.

Manages product categories for users in Freshify. This service supports
default category initialization, restoring missing defaults, creating custom
categories, updating/deleting categories, and checking whether a category is currently in use.
"""

from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
import uuid

from app.db.models import Category, User, Product, ConsumedProduct, GroceryItem
from app.schemas.category import CategoryCreate, CategoryUpdate

# List of default category names created for every new user upon registration.
DEFAULT_CATEGORIES = [
    'Молочні продукти',
    "М'ясо та риба",
    'Овочі',
    'Фрукти',
    'Зелень',
    'Хліб та випічка',
    'Напої',
    'Консерви',
    'Крупи та злаки',
    'Заморожені продукти',
    'Соуси та приправи',
    'Солодощі',
    'Інше',
]


def create_initial_categories_for_user(db: Session, user_id: uuid.UUID):
    """
    Populate a new user's account with the list of default categories.

    Parameters:
        db (Session): The active database session.
        user_id (uuid.UUID): ID of the target user.
    """
    for cat_name in DEFAULT_CATEGORIES:
        db_category = Category(name=cat_name, user_id=user_id)
        db.add(db_category)
    db.commit()


def restore_default_categories(db: Session, user_id: uuid.UUID) -> List[Category]:
    """
    Restore any missing default categories for a user.

    Compares existing user categories (case-insensitive) against the DEFAULT_CATEGORIES
    list and inserts those that are currently missing.

    Parameters:
        db (Session): The database session.
        user_id (uuid.UUID): ID of the user.

    Returns:
        List[Category]: The full list of user's categories after restoration.
    """
    # Отримуємо всі наявні категорії користувача (приводимо до нижнього регістру для точного порівняння)
    # Get all existing categories for the user in lowercase for comparison.
    existing_categories = {c.name.lower() for c in get_categories(db, user_id)}
    
    new_categories = []
    # Identify and insert default categories that do not exist yet.
    for cat_name in DEFAULT_CATEGORIES:
        if cat_name.lower() not in existing_categories:
            db_category = Category(name=cat_name, user_id=user_id)
            db.add(db_category)
            new_categories.append(db_category)
            
    db.commit()
    # Refresh the instances to fetch database-generated fields (like ID).
    for cat in new_categories:
        db.refresh(cat)
        
    return get_categories(db, user_id)


def get_categories(db: Session, user_id: uuid.UUID) -> List[Category]:
    """
    Retrieve all categories created by or assigned to a specific user.

    Parameters:
        db (Session): The database session.
        user_id (uuid.UUID): The user ID.

    Returns:
        List[Category]: List of category ORM models.
    """
    return db.query(Category).filter(Category.user_id == user_id).all()


def get_category_by_name(db: Session, name: str, user_id: uuid.UUID) -> Optional[Category]:
    """
    Retrieve a specific category by its name for a given user.

    Parameters:
        db (Session): The database session.
        name (str): Exact category name.
        user_id (uuid.UUID): The user ID.

    Returns:
        Optional[Category]: The matching Category object, or None if not found.
    """
    return db.query(Category).filter(
        and_(Category.name == name, Category.user_id == user_id)
    ).first()


def create_category(db: Session, user_id: uuid.UUID, category: CategoryCreate) -> Category:
    """
    Create a new custom category for a user.

    Parameters:
        db (Session): The database session.
        user_id (uuid.UUID): The user ID.
        category (CategoryCreate): Schema containing the new category details.

    Returns:
        Category: The newly created Category object.
    """
    db_category = Category(name=category.name, user_id=user_id)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category


def update_category(db: Session, category_id: uuid.UUID, category: CategoryUpdate) -> Optional[Category]:
    """
    Rename an existing category.

    Parameters:
        db (Session): The database session.
        category_id (uuid.UUID): The ID of the category to update.
        category (CategoryUpdate): Schema containing the updated category name.

    Returns:
        Optional[Category]: The updated Category object if found, otherwise None.
    """
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if db_category:
        db_category.name = category.name
        db.commit()
        db.refresh(db_category)
    return db_category


def check_category_in_use(db: Session, category_id: uuid.UUID) -> bool:
    """
    Check if a category is currently linked to any active products, consumed records, or grocery items.

    Parameters:
        db (Session): The database session.
        category_id (uuid.UUID): The ID of the category to check.

    Returns:
        bool: True if in use by any records, False otherwise.
    """
    # Checks if a category is used in any product, consumed product, or grocery item.
    if db.query(Product).filter(and_(Product.category_id == category_id, Product.is_active == True)).first():
        return True
    if db.query(ConsumedProduct).filter(ConsumedProduct.category_id == category_id).first():
        return True
    if db.query(GroceryItem).filter(GroceryItem.category_id == category_id).first():
        return True
    return False


def delete_category(db: Session, category_id: uuid.UUID) -> bool:
    """
    Delete a category by its ID.

    Parameters:
        db (Session): The database session.
        category_id (uuid.UUID): The ID of the category to delete.

    Returns:
        bool: True if the category was found and deleted, False otherwise.
    """
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if db_category:
        db.delete(db_category)
        db.commit()
        return True
    return False