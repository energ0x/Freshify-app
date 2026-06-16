"""
Categories Router
-----------------
This router manages operations for custom and default product categories associated
with a user. It supports operations like listing categories, restoring default categories,
creating new categories, updating category properties (e.g., name, icon), and deleting
unused categories.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.db.database import get_db
from app.db.models import User, Category
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate
from app.services import category_service
from app.utils.dependencies import get_current_user

# Set up the APIRouter for product categories
router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=List[CategoryResponse])
def read_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve all categories belonging to the current authenticated user.

    Parameters:
    - db (Session): The database session dependency.
    - current_user (User): The user object resolved from the authentication token.

    Returns:
    - List[CategoryResponse]: A list of category details owned by the user.
    """
    # Fetch only categories that are associated with the current user's ID
    return category_service.get_categories(db, current_user.id)


@router.post("/restore-defaults", response_model=List[CategoryResponse])
def restore_default_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Recreate/restore the default set of categories for the current user.

    Parameters:
    - db (Session): The database session dependency.
    - current_user (User): The user object resolved from the authentication token.

    Returns:
    - List[CategoryResponse]: The restored default categories for the user.
    """
    # Delegate default category restoration to the category service
    return category_service.restore_default_categories(db, current_user.id)


@router.post("", response_model=CategoryResponse)
def create_category(
    category: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new custom category for the user.

    Parameters:
    - category (CategoryCreate): The category details (name, color, icon, etc.).
    - db (Session): The database session dependency.
    - current_user (User): The user object resolved from the authentication token.

    Returns:
    - CategoryResponse: The newly created category representation.

    Raises:
    - HTTPException (400): If a category with the same name already exists for the user.
    """
    # Verify that the user doesn't already have a category with the same name
    existing_category = category_service.get_category_by_name(db, category.name, current_user.id)
    if existing_category:
         raise HTTPException(status_code=400, detail="Category with this name already exists")
         
    # Call the category service to insert the new category record
    return category_service.create_category(db=db, user_id=current_user.id, category=category)


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: uuid.UUID,
    category: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update an existing category.

    Parameters:
    - category_id (UUID): The unique ID of the category to update.
    - category (CategoryUpdate): The updated values (e.g. name, color).
    - db (Session): The database session dependency.
    - current_user (User): The user object resolved from the authentication token.

    Returns:
    - CategoryResponse: The updated category database model.

    Raises:
    - HTTPException (404): If the category is not found or does not belong to the user.
    - HTTPException (400): If the updated name conflicts with another existing category.
    """
    # Find the category ensuring it belongs to the active user
    db_category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id
    ).first()
    
    if db_category is None:
        raise HTTPException(status_code=404, detail="Category not found or access denied")
        
    # Check for name collisions if a name change is requested
    if category.name:
         existing_category = category_service.get_category_by_name(db, category.name, current_user.id)
         if existing_category and existing_category.id != category_id:
             raise HTTPException(status_code=400, detail="Category with this name already exists")
    
    # Save updates using the service layer
    return category_service.update_category(db, category_id, category)


@router.delete("/{category_id}", status_code=204)
def delete_category(
    category_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a category by ID if it is not in use.

    Parameters:
    - category_id (UUID): The unique identifier of the category to delete.
    - db (Session): The database session dependency.
    - current_user (User): The user object resolved from the authentication token.

    Returns:
    - Dict: A success indicator (though status_code 204 will omit content in standard responses).

    Raises:
    - HTTPException (404): If the category is not found or does not belong to the user.
    - HTTPException (400): If the category is currently referenced by any products.
    """
    # Ensure the category belongs to the current user before allowing deletion
    db_category = db.query(Category).filter(
        Category.id == category_id,
        Category.user_id == current_user.id
    ).first()

    if db_category is None:
        raise HTTPException(status_code=404, detail="Category not found or access denied")
        
    # Check if this category is currently referenced by existing products
    if category_service.check_category_in_use(db, category_id):
        raise HTTPException(status_code=400, detail="Cannot delete category because it is in use")
    
    # Delete the category record
    category_service.delete_category(db, category_id)
    return {"ok": True}