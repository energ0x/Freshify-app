from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User
from app.services.gemini_service import generate_recipes
from app.services.product_service import get_products
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.get("")
def get_recipes(
    include_grocery: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    products = get_products(db, current_user.id)
    if not products:
        return {"recipes": []}

    products_data = [
        {"name": p.name, "category": p.category, "quantity": p.quantity, "unit": p.unit}
        for p in products
    ]
    return generate_recipes(products_data, include_grocery)
