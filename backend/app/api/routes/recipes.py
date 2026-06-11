import asyncio
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from starlette.websockets import WebSocketState
from app.db.database import get_db
from app.db.models import User
from app.services.gemini_service import generate_recipes
from app.services.product_service import get_products
from app.core.config import get_settings
from jose import JWTError, jwt
from datetime import datetime, timedelta
import json
from app.core.limiter_config import RECIPE_GENERATIONS_LIMIT
from app.utils.dependencies import check_and_reset_limits

router = APIRouter(prefix="/recipes", tags=["recipes"])
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

@router.websocket("/ws/generate")
async def websocket_recipe_generator(
    websocket: WebSocket,
    include_grocery: bool = Query(False),
    token: str = Query(...)
):
    await websocket.accept()
    db: Session = next(get_db())
    try:
        user = await get_user_from_token(token, db)
        if not user:
            await websocket.close(code=1008, reason="Invalid authentication credentials")
            return
            
        # Оновлюємо ліміти перед перевіркою за допомогою централізованої функції
        check_and_reset_limits(user, db)

        # Перевіряємо ліміт для генерації рецептів
        if not user.is_premium:
            if user.recipe_generations_count >= RECIPE_GENERATIONS_LIMIT:
                # Відправляємо спеціальне повідомлення про помилку ліміту
                error_data = json.dumps({"error": "Limit reached", "detail": "Limit reached for recipe_generations. Please upgrade to Premium."})
                await websocket.send_text(error_data)
                await websocket.close(code=1008, reason="Limit reached")
                return
            
            # Інкрементуємо лічильник
            user.recipe_generations_count += 1
            db.commit()
            db.refresh(user) # Оновлюємо об'єкт після інкрементації

        products = get_products(db, user.id)
        products_data = [
            {
                "name": p.name,
                "category": p.category_obj.name if p.category_obj else "Інше",
                "quantity": p.quantity,
                "unit": p.unit,
            }
            for p in products
        ]

        if not products_data:
             await websocket.send_text("У вас немає продуктів для генерації рецептів.")
             return

        async def send_data():
            async for chunk in generate_recipes(
                products=products_data, 
                user_diet=user.dietary_preference,
                user_allergens=user.allergens,
                include_grocery=include_grocery
            ):
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
        print(f"An error occurred: {e}")
        await websocket.send_text("\n\n**Помилка:** Не вдалося згенерувати рецепти.")
    finally:
        try:
            if websocket.application_state == WebSocketState.CONNECTED:
                await websocket.close()
        except RuntimeError:
            pass
        db.close()