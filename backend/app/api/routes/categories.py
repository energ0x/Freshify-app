from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.db.database import get_db
from app.db.models import User, Category
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate
from app.services import category_service
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=List[CategoryResponse])
def read_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Тепер повертаємо тільки категорії, що належать користувачу
    return category_service.get_categories(db, current_user.id)


@router.post("/restore-defaults", response_model=List[CategoryResponse])
def restore_default_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return category_service.restore_default_categories(db, current_user.id)


@router.post("", response_model=CategoryResponse)
def create_category(
    category: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Перевіряємо, чи немає вже категорії з такою назвою у користувача
    existing_category = category_service.get_category_by_name(db, category.name, current_user.id)
    if existing_category:
         raise HTTPException(status_code=400, detail="Category with this name already exists")
         
    return category_service.create_category(db=db, user_id=current_user.id, category=category)


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: uuid.UUID,
    category: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id
    ).first()
    
    if db_category is None:
        raise HTTPException(status_code=404, detail="Category not found or access denied")
        
    if category.name:
         existing_category = category_service.get_category_by_name(db, category.name, current_user.id)
         if existing_category and existing_category.id != category_id:
             raise HTTPException(status_code=400, detail="Category with this name already exists")
    
    return category_service.update_category(db, category_id, category)


@router.delete("/{category_id}", status_code=204)
def delete_category(
    category_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id
    ).first()

    if db_category is None:
        raise HTTPException(status_code=404, detail="Category not found or access denied")
        
    # Перевіряємо, чи не використовується категорія
    if category_service.check_category_in_use(db, category_id):
        raise HTTPException(status_code=400, detail="Cannot delete category because it is in use")
    
    category_service.delete_category(db, category_id)
    return {"ok": True}