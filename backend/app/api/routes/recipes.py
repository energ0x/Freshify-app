"""
Recipes Router
--------------
This router defines a WebSocket endpoint that streams AI-generated recipe suggestions
to the client in real-time. It retrieves user products, checks rate limits, triggers
the Gemini service's text generation stream, and handles concurrent client disconnect tasks.
"""

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

# Configure logger and router for the recipes namespace
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.websocket("/ws/generate")
async def websocket_recipe_generator(
    websocket: WebSocket,
    include_grocery: bool = Query(False),
    token: str = Query(...),
    lang: str = Query("uk"),
):
    """
    WebSocket endpoint for streaming AI recipes based on user's fridge contents.
    Requires token authentication passed via query params.

    Parameters:
    - websocket (WebSocket): The raw WebSocket connection channel.
    - include_grocery (bool): Flag to indicate whether to suggest adding missing items to grocery list.
    - token (str): Bearer token for authenticating the WS connection.
    - lang (str): The language ('uk' or 'en') for the recipe results. Defaults to 'uk'.
    """
    # 1. Accept the incoming WebSocket handshake
    await websocket.accept()
    
    # 2. Acquire a database session from the generator pool
    db: Session = next(get_db())
    try:
        # 3. Authenticate user from the WS query-provided JWT token
        user = get_user_from_ws_token(token, db)
        if not user:
            await websocket.close(code=1008, reason="Invalid authentication credentials")
            return

        # 4. Check and reset daily limits if a new day has started
        check_and_reset_limits(user, db)

        # 5. Enforce generation limits for non-premium accounts
        if not user.is_premium and user.recipe_generations_count >= RECIPE_GENERATIONS_LIMIT:
            import json
            await websocket.send_text(json.dumps({
                "error": "Limit reached",
                "detail": "Limit reached for recipe_generations. Please upgrade to Premium.",
            }))
            await websocket.close(code=1008, reason="Limit reached")
            return

        # 6. Retrieve active products in the user's inventory
        products = get_products(db, user.id)
        if not products:
            empty_msg = "You have no products to generate recipes from." if lang == "en" else "У вас немає продуктів для генерації рецептів."
            await websocket.send_text(empty_msg)
            return

        # 7. Increment generation counter for non-premium users
        if not user.is_premium:
            user.recipe_generations_count += 1
            db.commit()
            db.refresh(user)

        # 8. Simplify/format products for the AI prompt
        products_data = [
            {
                "name": p.name,
                "category": p.category_obj.name if p.category_obj else "Інше",
                "quantity": p.quantity,
                "unit": p.unit,
            }
            for p in products
        ]

        # Define an async task to poll the AI service and push chunks to the client
        async def send_data():
            async for chunk in generate_recipes(
                products=products_data,
                user_diet=user.dietary_preference,
                user_allergens=user.allergens,
                include_grocery=include_grocery,
                lang=lang,
            ):
                await websocket.send_text(chunk)

        # Define an async task to detect early client disconnects by listening on incoming frames
        async def receive_disconnect():
            try:
                while True:
                    await websocket.receive_text()
            except WebSocketDisconnect:
                pass

        # 9. Run the generator task and disconnect listener concurrently
        send_task = asyncio.create_task(send_data())
        receive_task = asyncio.create_task(receive_disconnect())

        # Wait for either the stream to finish or the user to disconnect
        done, pending = await asyncio.wait(
            [send_task, receive_task],
            return_when=asyncio.FIRST_COMPLETED,
        )

        # Clean up by cancelling any remaining tasks (e.g. if send finishes first, stop listening)
        for task in pending:
            task.cancel()

    except WebSocketDisconnect:
        logger.debug("Recipe WS: client disconnected")
    except Exception as e:
        logger.error("Recipe WS error: %s", e)
        try:
            error_msg = "\n\n**Error:** Failed to generate recipes." if lang == "en" else "\n\n**Помилка:** Не вдалося згенерувати рецепти."
            await websocket.send_text(error_msg)
        except Exception:
            pass
    finally:
        # 10. Always ensure the WS and database session are properly closed
        try:
            if websocket.application_state == WebSocketState.CONNECTED:
                await websocket.close()
        except RuntimeError:
            pass
        db.close()