from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from app.db.database import get_db
from app.db.models import User, ConsumedProduct, Product
from app.services.gemini_service import generate_diet_recommendations
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("")
def get_analytics(
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(days=days)

    consumed = db.query(
        ConsumedProduct.product_name,
        ConsumedProduct.category,
        ConsumedProduct.unit,
        func.sum(ConsumedProduct.quantity).label("total_quantity"),
        func.count(ConsumedProduct.id).label("times_consumed"),
    ).filter(
        and_(ConsumedProduct.user_id == current_user.id, ConsumedProduct.consumed_at >= since)
    ).group_by(
        ConsumedProduct.product_name, ConsumedProduct.category, ConsumedProduct.unit
    ).all()

    by_category = db.query(
        ConsumedProduct.category,
        func.sum(ConsumedProduct.quantity).label("total"),
    ).filter(
        and_(ConsumedProduct.user_id == current_user.id, ConsumedProduct.consumed_at >= since)
    ).group_by(ConsumedProduct.category).all()

    daily = db.query(
        func.date_trunc("day", ConsumedProduct.consumed_at).label("day"),
        func.count(ConsumedProduct.id).label("count"),
    ).filter(
        and_(ConsumedProduct.user_id == current_user.id, ConsumedProduct.consumed_at >= since)
    ).group_by("day").order_by("day").all()

    active_count = db.query(func.count(Product.id)).filter(
        and_(Product.user_id == current_user.id, Product.is_active == True)
    ).scalar()

    return {
        "period_days": days,
        "total_products_in_fridge": active_count,
        "consumed_products": [
            {
                "product_name": r.product_name,
                "category": r.category,
                "unit": r.unit,
                "total_quantity": float(r.total_quantity or 0),
                "times_consumed": r.times_consumed,
            }
            for r in consumed
        ],
        "by_category": [
            {"category": r.category or "Інше", "total": float(r.total or 0)}
            for r in by_category
        ],
        "daily_activity": [
            {"day": str(r.day)[:10], "count": r.count}
            for r in daily
        ],
    }


@router.get("/ai-recommendations")
def get_ai_recommendations(
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(days=days)
    consumed = db.query(
        ConsumedProduct.product_name,
        ConsumedProduct.category,
        ConsumedProduct.unit,
        func.sum(ConsumedProduct.quantity).label("total_quantity"),
    ).filter(
        and_(ConsumedProduct.user_id == current_user.id, ConsumedProduct.consumed_at >= since)
    ).group_by(ConsumedProduct.product_name, ConsumedProduct.category, ConsumedProduct.unit).all()

    consumed_data = [
        {"product_name": r.product_name, "category": r.category, "unit": r.unit, "total_quantity": float(r.total_quantity or 0)}
        for r in consumed
    ]
    return generate_diet_recommendations(consumed_data)
