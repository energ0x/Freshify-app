import asyncio
import logging
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from starlette.websockets import WebSocketState
from app.db.database import get_db
from app.services.gemini_service import generate_recipes
from app.services.product_service import get_products
from app.core.limiter_config import RECIPE_GENERATIONS_LIMIT
from app.utils.dependencies import check_and_reset_limits, get_user_from_ws_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.websocket("/ws/generate")
async def websocket_recipe_generator(
    websocket: WebSocket,
    include_grocery: bool = Query(False),
    token: str = Query(...),
):
    await websocket.accept()
    db: Session = next(get_db())
    try:
        user = get_user_from_ws_token(token, db)
        if not user:
            await websocket.close(code=1008, reason="Invalid authentication credentials")
            return

        check_and_reset_limits(user, db)

        if not user.is_premium and user.recipe_generations_count >= RECIPE_GENERATIONS_LIMIT:
            import json
            await websocket.send_text(json.dumps({
                "error": "Limit reached",
                "detail": "Limit reached for recipe_generations. Please upgrade to Premium.",
            }))
            await websocket.close(code=1008, reason="Limit reached")
            return

        products = get_products(db, user.id)
        if not products:
            await websocket.send_text("У вас немає продуктів для генерації рецептів.")
            return

        # Charge only after confirming there are products to generate from
        if not user.is_premium:
            user.recipe_generations_count += 1
            db.commit()
            db.refresh(user)

        products_data = [
            {
                "name": p.name,
                "category": p.category_obj.name if p.category_obj else "Інше",
                "quantity": p.quantity,
                "unit": p.unit,
            }
            for p in products
        ]

        async def send_data():
            async for chunk in generate_recipes(
                products=products_data,
                user_diet=user.dietary_preference,
                user_allergens=user.allergens,
                include_grocery=include_grocery,
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
        logger.debug("Recipe WS: client disconnected")
    except Exception as e:
        logger.error("Recipe WS error: %s", e)
        try:
            await websocket.send_text("\n\n**Помилка:** Не вдалося згенерувати рецепти.")
        except Exception:
            pass
    finally:
        try:
            if websocket.application_state == WebSocketState.CONNECTED:
                await websocket.close()
        except RuntimeError:
            pass
        db.close()
