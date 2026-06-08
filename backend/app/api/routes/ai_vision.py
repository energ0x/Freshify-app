from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.product import AIProductResponse
from app.services.gemini_service import analyze_product_image
from app.services.category_service import get_category_by_name, DEFAULT_CATEGORIES
from app.utils.image_utils import validate_and_compress_image
from app.utils.dependencies import get_current_user
from app.db.models import User

router = APIRouter(prefix="/ai", tags=["ai"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}


@router.post("/analyze-image", response_model=AIProductResponse)
async def analyze_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WebP images are allowed")

    image_bytes = await file.read()

    try:
        compressed = validate_and_compress_image(image_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    result = analyze_product_image(compressed, "image/jpeg")

    if "category" in result and result["category"]:
        category_name = result["category"]
        
        # Шукаємо категорію ТІЛЬКИ серед існуючих у користувача
        category = get_category_by_name(db, category_name, current_user.id)
        
        if category:
            result["category_id"] = category.id
            result["category"] = category.name
        else:
            # Якщо категорію не знайдено, але вона є в списку дефолтних,
            # відправляємо її на фронтенд як "пропозицію"
            if category_name in DEFAULT_CATEGORIES:
                result["category_suggestion"] = category_name
            
            # Видаляємо category_id, оскільки його немає
            result.pop("category_id", None)
            result["category"] = None # Скидаємо, щоб фронтенд не заплутався

    return result