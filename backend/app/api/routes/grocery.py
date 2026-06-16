"""
Grocery Router
--------------
This router manages the grocery shopping list for users. It supports CRUD operations
on grocery list items (GroceryItem), as well as a feature to bulk-populate the grocery
shopping list from expired or low-stock products currently in the user's fridge/pantry.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from typing import List
import uuid
from app.db.database import get_db
from app.db.models import User, GroceryItem, Product
from app.schemas.grocery import GroceryItemCreate, GroceryItemUpdate, GroceryItemResponse, AddFromFridgeRequest
from app.utils.dependencies import get_current_user
from fastapi import HTTPException

# Define the APIRouter for grocery list endpoints
router = APIRouter(prefix="/grocery", tags=["grocery"])


@router.get("", response_model=List[GroceryItemResponse])
def list_grocery(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    List all grocery shopping items belonging to the current user.

    Parameters:
    - db (Session): The database session dependency.
    - current_user (User): The authenticated user making the request.

    Returns:
    - List[GroceryItemResponse]: A list of grocery items with their categories, ordered by creation date descending.
    """
    # Fetch all items matching the user_id and eagerly load the category relationship
    return db.query(GroceryItem).options(joinedload(GroceryItem.category_obj)).filter(GroceryItem.user_id == current_user.id).order_by(GroceryItem.created_at.desc()).all()


@router.post("", response_model=GroceryItemResponse, status_code=201)
def create_grocery_item(data: GroceryItemCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Create a new grocery list item.

    Parameters:
    - data (GroceryItemCreate): The schema with grocery item name, quantity, category, etc.
    - db (Session): The database session dependency.
    - current_user (User): The authenticated user making the request.

    Returns:
    - GroceryItemResponse: The created grocery item database record.
    """
    # Instantiate grocery item and associate it with the active user
    item = GroceryItem(**data.model_dump(), user_id=current_user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    # Eagerly refresh and load the associated category details object for schema representation
    db.refresh(item, attribute_names=['category_obj'])
    return item


@router.put("/{item_id}", response_model=GroceryItemResponse)
def update_grocery_item(item_id: uuid.UUID, data: GroceryItemUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Update details of a specific grocery item (e.g. quantity, category, or checked status).

    Parameters:
    - item_id (UUID): The unique ID of the grocery item.
    - data (GroceryItemUpdate): The updated fields.
    - db (Session): The database session dependency.
    - current_user (User): The authenticated user making the request.

    Returns:
    - GroceryItemResponse: The updated grocery item database record.

    Raises:
    - HTTPException (404): If the item doesn't exist or doesn't belong to the user.
    """
    # Query matching item belonging specifically to the user
    item = db.query(GroceryItem).filter(and_(GroceryItem.id == item_id, GroceryItem.user_id == current_user.id)).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Dynamically apply only the fields provided in the update payload
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    # Refresh category relationship object to ensure response matches schema expectations
    db.refresh(item, attribute_names=['category_obj'])
    return item


@router.delete("/{item_id}", status_code=204)
def delete_grocery_item(item_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Remove an item from the grocery shopping list.

    Parameters:
    - item_id (UUID): The unique ID of the grocery item.
    - db (Session): The database session dependency.
    - current_user (User): The authenticated user making the request.

    Raises:
    - HTTPException (404): If the item doesn't exist or does not belong to the user.
    """
    # Query and verify ownership of the grocery item
    item = db.query(GroceryItem).filter(and_(GroceryItem.id == item_id, GroceryItem.user_id == current_user.id)).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Remove the record and commit
    db.delete(item)
    db.commit()


@router.post("/from-fridge", response_model=List[GroceryItemResponse])
def add_from_fridge(data: AddFromFridgeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Add multiple products from the user's active fridge inventory to the grocery shopping list.
    Prevents duplicate entries if the item is already present and unpurchased on the list.

    Parameters:
    - data (AddFromFridgeRequest): The schema detailing a list of product UUIDs to move to the shopping list.
    - db (Session): The database session dependency.
    - current_user (User): The authenticated user making the request.

    Returns:
    - List[GroceryItemResponse]: A list of newly created grocery item database records.
    """
    # Fetch all specified active products owned by the user
    products = db.query(Product).filter(
        and_(Product.id.in_(data.product_ids), Product.user_id == current_user.id, Product.is_active == True)
    ).all()
    
    # Retrieve all existing unpurchased items in the shopping list for this user to avoid duplicates
    existing_unpurchased_items = db.query(GroceryItem).filter(
        and_(GroceryItem.user_id == current_user.id, GroceryItem.is_purchased == False)
    ).all()
    
    # Create a set of existing lowercase names for quick lookup and duplicate avoidance
    existing_names = {item.name.lower() for item in existing_unpurchased_items}
    
    items_to_return = []
    
    for product in products:
        product_name_lower = product.name.lower()
        
        # If the product name isn't already in the unpurchased list, add it
        if product_name_lower not in existing_names:
            item = GroceryItem(
                user_id=current_user.id,
                name=product.name,
                category_id=product.category_id,
                quantity=1.0,
                unit=product.unit,
            )
            db.add(item)
            items_to_return.append(item)
            # Add to set dynamically to prevent duplicates in case the request contains duplicates
            existing_names.add(product_name_lower)
            
    db.commit()
    
    # Load category objects for all newly added grocery items to return fully populated objects
    for item in items_to_return:
        db.refresh(item)
        db.refresh(item, attribute_names=['category_obj'])
        
    return items_to_return