from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User
from app.services.gemini_service import generate_recipes
from app.services.product_service import get_products
from app.utils.dependencies import get_current_user
from app.core.config import get_settings
from jose import JWTError, jwt


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
    token: str = Query(...),
):
    await websocket.accept()
    db: Session = next(get_db())
    try:
        user = await get_user_from_token(token, db)
        if not user:
            await websocket.close(code=1008, reason="Invalid authentication credentials")
            return

        products = get_products(db, user.id)
        products_data = [
            {"name": p.name, "category": p.category, "quantity": p.quantity, "unit": p.unit}
            for p in products
        ]

        if not products_data:
             await websocket.send_text("У вас немає продуктів для генерації рецептів.")
             return

        async for chunk in generate_recipes(products_data, include_grocery):
            await websocket.send_text(chunk)

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"An error occurred: {e}")
        await websocket.send_text("\n\n**Помилка:** Не вдалося згенерувати рецепти.")
    finally:
        await websocket.close()
        db.close()