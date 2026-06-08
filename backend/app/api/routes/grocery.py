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

router = APIRouter(prefix="/grocery", tags=["grocery"])


@router.get("", response_model=List[GroceryItemResponse])
def list_grocery(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(GroceryItem).options(joinedload(GroceryItem.category_obj)).filter(GroceryItem.user_id == current_user.id).order_by(GroceryItem.created_at.desc()).all()


@router.post("", response_model=GroceryItemResponse, status_code=201)
def create_grocery_item(data: GroceryItemCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = GroceryItem(**data.model_dump(), user_id=current_user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    # Manually load category_obj after commit
    db.refresh(item, attribute_names=['category_obj'])
    return item


@router.put("/{item_id}", response_model=GroceryItemResponse)
def update_grocery_item(item_id: uuid.UUID, data: GroceryItemUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(GroceryItem).filter(and_(GroceryItem.id == item_id, GroceryItem.user_id == current_user.id)).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    db.refresh(item, attribute_names=['category_obj'])
    return item


@router.delete("/{item_id}", status_code=204)
def delete_grocery_item(item_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(GroceryItem).filter(and_(GroceryItem.id == item_id, GroceryItem.user_id == current_user.id)).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()


@router.post("/from-fridge", response_model=List[GroceryItemResponse])
def add_from_fridge(data: AddFromFridgeRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    products = db.query(Product).filter(
        and_(Product.id.in_(data.product_ids), Product.user_id == current_user.id, Product.is_active == True)
    ).all()
    items = []
    for product in products:
        item = GroceryItem(
            user_id=current_user.id,
            name=product.name,
            category_id=product.category_id,
            quantity=1.0,
            unit=product.unit,
        )
        db.add(item)
        items.append(item)
    db.commit()
    for item in items:
        db.refresh(item)
        db.refresh(item, attribute_names=['category_obj'])
    return items