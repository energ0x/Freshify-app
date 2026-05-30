import asyncio
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from jose import JWTError, jwt
from starlette.websockets import WebSocketState
from app.db.database import get_db
from app.db.models import User, ConsumedProduct, Product
from app.services.gemini_service import stream_diet_recommendations
from app.utils.dependencies import get_current_user
from app.core.config import get_settings

router = APIRouter(prefix="/analytics", tags=["analytics"])
settings = get_settings()

async def get_user_from_token(token: str, db: Session) -> User:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
    except JWTError:
        return None

    user = db.query(User).filter(User.id == user_id).first()
    return user


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


@router.websocket("/ws/ai-recommendations")
async def websocket_ai_recommendations(
    websocket: WebSocket,
    days: int = Query(30, ge=7, le=365),
    token: str = Query(...),
):
    await websocket.accept()
    db: Session = next(get_db())
    
    try:
        user = await get_user_from_token(token, db)
        if not user:
            await websocket.close(code=1008, reason="Not authenticated")
            return

        since = datetime.utcnow() - timedelta(days=days)
        consumed = db.query(
            ConsumedProduct.product_name,
            ConsumedProduct.category,
            ConsumedProduct.unit,
            func.sum(ConsumedProduct.quantity).label("total_quantity"),
        ).filter(
            and_(ConsumedProduct.user_id == user.id, ConsumedProduct.consumed_at >= since)
        ).group_by(ConsumedProduct.product_name, ConsumedProduct.category, ConsumedProduct.unit).all()

        consumed_data = [
            {"product_name": r.product_name, "category": r.category, "unit": r.unit, "total_quantity": float(r.total_quantity or 0)}
            for r in consumed
        ]
        
        async def send_data():
            async for chunk in stream_diet_recommendations(consumed_data):
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
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket Error: {e}")
    finally:
        try:
            if websocket.application_state == WebSocketState.CONNECTED:
                await websocket.close()
        except RuntimeError:
            pass
        db.close()