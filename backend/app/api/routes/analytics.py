import asyncio
import json
import logging
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timezone, timedelta, date
from starlette.websockets import WebSocketState
from sqlalchemy import case, cast, Date

from app.db.database import get_db
from app.db.models import User, ConsumedProduct, Product, Category
from app.services.gemini_service import stream_diet_recommendations
from app.utils.dependencies import get_current_user, check_and_reset_limits, get_user_from_ws_token
from app.core.limiter_config import ANALYTICS_GENERATIONS_LIMIT

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("")
def get_analytics(
    days: int = Query(30, ge=1, le=9999),
    start_date: date = Query(None),
    end_date: date = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if start_date and end_date:
        since = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        until = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=timezone.utc)
    else:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        until = datetime.now(timezone.utc)

    consumed = db.query(
        ConsumedProduct.product_name,
        Category.name.label("category"),
        ConsumedProduct.unit,
        func.sum(ConsumedProduct.quantity).label("total_quantity"),
        func.count(ConsumedProduct.id).label("times_consumed"),
    ).join(Category, ConsumedProduct.category_id == Category.id, isouter=True).filter(
        and_(ConsumedProduct.user_id == current_user.id, ConsumedProduct.consumed_at >= since, ConsumedProduct.consumed_at <= until)
    ).group_by(
        ConsumedProduct.product_name, Category.name, ConsumedProduct.unit
    ).all()

    by_category = db.query(
        Category.name.label("category"),
        func.sum(ConsumedProduct.quantity).label("total"),
    ).join(Category, ConsumedProduct.category_id == Category.id, isouter=True).filter(
        and_(ConsumedProduct.user_id == current_user.id, ConsumedProduct.consumed_at >= since, ConsumedProduct.consumed_at <= until)
    ).group_by(Category.name).all()

    daily = db.query(
        func.date_trunc("day", ConsumedProduct.consumed_at).label("day"),
        func.count(ConsumedProduct.id).label("count"),
    ).filter(
        and_(ConsumedProduct.user_id == current_user.id, ConsumedProduct.consumed_at >= since, ConsumedProduct.consumed_at <= until)
    ).group_by("day").order_by("day").all()
    
    multiplier = case(
        (func.lower(ConsumedProduct.unit).in_(['г', 'g', 'мл', 'ml']), ConsumedProduct.quantity / 100.0),
        (func.lower(ConsumedProduct.unit).in_(['кг', 'kg', 'л', 'l']), ConsumedProduct.quantity * 10.0),
        else_=ConsumedProduct.quantity
    )

    nutrition = db.query(
        func.date_trunc("day", ConsumedProduct.consumed_at).label("day"),
        func.sum(
            func.coalesce(
                ConsumedProduct.calories_consumed,
                func.coalesce(Product.calories, 0) * multiplier
            )
        ).label("total_calories"),
        func.sum(
            func.coalesce(
                ConsumedProduct.proteins_consumed,
                func.coalesce(Product.proteins, 0) * multiplier
            )
        ).label("total_proteins"),
        func.sum(
            func.coalesce(
                ConsumedProduct.fats_consumed,
                func.coalesce(Product.fats, 0) * multiplier
            )
        ).label("total_fats"),
        func.sum(
            func.coalesce(
                ConsumedProduct.carbohydrates_consumed,
                func.coalesce(Product.carbohydrates, 0) * multiplier
            )
        ).label("total_carbs"),
    ).outerjoin(Product, ConsumedProduct.product_id == Product.id).filter(
        and_(ConsumedProduct.user_id == current_user.id, ConsumedProduct.consumed_at >= since, ConsumedProduct.consumed_at <= until)
    ).group_by("day").order_by("day").all()

    piece_units = ('pcs', 'шт')
    unit_lower = func.lower(func.coalesce(Product.unit, ''))
    cond_is_piece = unit_lower.in_(piece_units)
    active_quantity = db.query(
        func.sum(
            case(
                (cond_is_piece, Product.quantity),
                else_=1
            )
        )
    ).filter(
        and_(Product.user_id == current_user.id, Product.is_active == True, Product.quantity > 0)
    ).scalar()

    return {
        "period_days": days if not (start_date and end_date) else (end_date - start_date).days,
        "total_products_in_fridge": float(active_quantity) if active_quantity is not None else 0.0,
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
        "nutrition_history": [
            {
                "date": str(r.day)[:10],
                "calories": float(r.total_calories or 0),
                "proteins": float(r.total_proteins or 0),
                "fats": float(r.total_fats or 0),
                "carbs": float(r.total_carbs or 0)
            }
            for r in nutrition
        ]
    }


@router.websocket("/ws/ai-recommendations")
async def websocket_ai_recommendations(
    websocket: WebSocket,
    days: int = Query(30, ge=7, le=365),
    token: str = Query(...),
    lang: str = Query("uk"), # <-- ДОДАНО
):
    await websocket.accept()
    db: Session = next(get_db())

    try:
        user = get_user_from_ws_token(token, db)
        if not user:
            await websocket.close(code=1008, reason="Not authenticated")
            return

        check_and_reset_limits(user, db)

        if not user.is_premium and user.analytics_generations_count >= ANALYTICS_GENERATIONS_LIMIT:
            await websocket.send_text(json.dumps({
                "error": "Limit reached",
                "detail": "Limit reached for analytics_generations. Please upgrade to Premium.",
            }))
            await websocket.close(code=1008, reason="Limit reached")
            return

        since = datetime.now(timezone.utc) - timedelta(days=days)
        consumed = db.query(
            ConsumedProduct.product_name,
            Category.name.label("category"),
            ConsumedProduct.unit,
            func.sum(ConsumedProduct.quantity).label("total_quantity"),
        ).join(Category, ConsumedProduct.category_id == Category.id, isouter=True).filter(
            and_(ConsumedProduct.user_id == user.id, ConsumedProduct.consumed_at >= since)
        ).group_by(ConsumedProduct.product_name, Category.name, ConsumedProduct.unit).all()

        consumed_data = [
            {
                "product_name": r.product_name,
                "category": r.category,
                "unit": r.unit,
                "total_quantity": float(r.total_quantity or 0),
            }
            for r in consumed
        ]

        if not user.is_premium:
            user.analytics_generations_count += 1
            db.commit()
            db.refresh(user)

        async def send_data():
            # Передаємо lang у gemini_service
            async for chunk in stream_diet_recommendations(consumed_data, lang=lang):
                await websocket.send_text(chunk)

        async def receive_disconnect():
            try:
                while True:
                    await websocket.receive_text()
            except WebSocketDisconnect:
                pass

        send_task = asyncio.create_task(send_data())
        receive_task = asyncio.create_task(receive_disconnect())

        done, pending = await asyncio.wait(
            [send_task, receive_task],
            return_when=asyncio.FIRST_COMPLETED,
        )

        for task in pending:
            task.cancel()

    except WebSocketDisconnect:
        logger.debug("Analytics WS: client disconnected")
    except Exception as e:
        logger.error("Analytics WS error: %s", e)
    finally:
        try:
            if websocket.application_state == WebSocketState.CONNECTED:
                await websocket.close()
        except RuntimeError:
            pass
        db.close()