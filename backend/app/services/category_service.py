from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
import uuid

from app.db.models import Category, User, Product, ConsumedProduct, GroceryItem
from app.schemas.category import CategoryCreate, CategoryUpdate


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
    for cat_name in DEFAULT_CATEGORIES:
        db_category = Category(name=cat_name, user_id=user_id)
        db.add(db_category)
    db.commit()


def restore_default_categories(db: Session, user_id: uuid.UUID) -> List[Category]:
    # Отримуємо всі наявні категорії користувача (приводимо до нижнього регістру для точного порівняння)
    existing_categories = {c.name.lower() for c in get_categories(db, user_id)}
    
    new_categories = []
    for cat_name in DEFAULT_CATEGORIES:
        if cat_name.lower() not in existing_categories:
            db_category = Category(name=cat_name, user_id=user_id)
            db.add(db_category)
            new_categories.append(db_category)
            
    db.commit()
    for cat in new_categories:
        db.refresh(cat)
        
    return get_categories(db, user_id)


def get_categories(db: Session, user_id: uuid.UUID) -> List[Category]:
    return db.query(Category).filter(Category.user_id == user_id).all()


def get_category_by_name(db: Session, name: str, user_id: uuid.UUID) -> Optional[Category]:
    return db.query(Category).filter(
        and_(Category.name == name, Category.user_id == user_id)
    ).first()


def create_category(db: Session, user_id: uuid.UUID, category: CategoryCreate) -> Category:
    db_category = Category(name=category.name, user_id=user_id)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category


def update_category(db: Session, category_id: uuid.UUID, category: CategoryUpdate) -> Optional[Category]:
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if db_category:
        db_category.name = category.name
        db.commit()
        db.refresh(db_category)
    return db_category


def check_category_in_use(db: Session, category_id: uuid.UUID) -> bool:
    """Checks if a category is used in any product, consumed product, or grocery item."""
    if db.query(Product).filter(Product.category_id == category_id).first():
        return True
    if db.query(ConsumedProduct).filter(ConsumedProduct.category_id == category_id).first():
        return True
    if db.query(GroceryItem).filter(GroceryItem.category_id == category_id).first():
        return True
    return False


def delete_category(db: Session, category_id: uuid.UUID) -> bool:
    db_category = db.query(Category).filter(Category.id == category_id).first()
    if db_category:
        db.delete(db_category)
        db.commit()
        return True
    return False