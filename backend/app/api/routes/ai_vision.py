from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.product import AIProductListResponse
from app.services.gemini_service import analyze_product_image
from app.services.category_service import get_category_by_name, get_categories, DEFAULT_CATEGORIES
from app.utils.image_utils import validate_and_compress_image
from app.utils.dependencies import get_current_user
from app.db.models import User
from app.core.limiter_config import PHOTO_UPLOADS_LIMIT

router = APIRouter(prefix="/ai", tags=["ai"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}


@router.post("/analyze-image", response_model=AIProductListResponse)
async def analyze_image(
    file: UploadFile = File(...),
    lang: str = Query("uk"), # <-- ДОДАНО
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.is_premium and current_user.photo_uploads_count >= PHOTO_UPLOADS_LIMIT:
        raise HTTPException(
            status_code=403,
            detail="Limit reached for photo_uploads. Please upgrade to Premium.",
        )

    if not file.content_type or file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WebP images are allowed")

    image_bytes = await file.read()

    try:
        compressed = validate_and_compress_image(image_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    user_categories = get_categories(db, current_user.id)
    user_category_names = [c.name for c in user_categories]
    available_categories = list(set(user_category_names + DEFAULT_CATEGORIES))

    result = await analyze_product_image(
        image_bytes=compressed,
        mime_type="image/jpeg",
        user_allergens=current_user.allergens,
        available_categories=available_categories,
        lang=lang, # <-- ДОДАНО
    )

    if "error" in result and not result.get("products"):
        return {"error": result["error"], "products": []}

    # Charge only after a successful AI response
    if not current_user.is_premium:
        current_user.photo_uploads_count += 1
        db.commit()
        db.refresh(current_user)

    processed_products = []
    for prod in result.get("products", []):
        if "category" in prod and prod["category"]:
            category_name = prod["category"]
            category = get_category_by_name(db, category_name, current_user.id)
            if category:
                prod["category_id"] = category.id
                prod["category"] = category.name
            else:
                prod["category_suggestion"] = category_name
                prod.pop("category_id", None)
                prod["category"] = None
        processed_products.append(prod)

    return {"products": processed_products, "error": result.get("error")}