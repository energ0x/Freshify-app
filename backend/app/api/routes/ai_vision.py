from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.product import AIProductResponse
from app.services.gemini_service import analyze_product_image
from app.services.category_service import get_category_by_name, get_categories, DEFAULT_CATEGORIES
from app.utils.image_utils import validate_and_compress_image
from app.utils.dependencies import get_current_user
from app.db.models import User
from app.core.limiter_config import PHOTO_UPLOADS_LIMIT

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

    # Перевірка ліміту
    if not current_user.is_premium:
        if current_user.photo_uploads_count >= PHOTO_UPLOADS_LIMIT:
            raise HTTPException(
                status_code=403,
                detail="Limit reached for photo_uploads. Please upgrade to Premium."
            )
        current_user.photo_uploads_count += 1
        db.commit()
        db.refresh(current_user)

    image_bytes = await file.read()

    try:
        compressed = validate_and_compress_image(image_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Отримуємо список усіх категорій (користувацьких та дефолтних)
    user_categories_objects = get_categories(db, current_user.id)
    user_category_names = [c.name for c in user_categories_objects]
    
    # Формуємо список доступних категорій для промпту, щоб ШІ міг вибрати з них
    # Додаємо також дефолтні, на випадок, якщо користувач видалив їх, але ШІ розпізнає продукт як частину цієї категорії
    available_categories = list(set(user_category_names + DEFAULT_CATEGORIES))

    result = analyze_product_image(
        image_bytes=compressed, 
        mime_type="image/jpeg",
        user_allergens=current_user.allergens,
        available_categories=available_categories
    )

    if "category" in result and result["category"]:
        category_name = result["category"]
        
        # Шукаємо категорію ТІЛЬКИ серед існуючих у користувача
        category = get_category_by_name(db, category_name, current_user.id)
        
        if category:
            result["category_id"] = category.id
            result["category"] = category.name
        else:
            # Якщо категорію не знайдено (навіть якщо ШІ її запропонував), 
            # відправляємо її на фронтенд як "пропозицію"
            result["category_suggestion"] = category_name
            
            # Видаляємо category_id, оскільки його немає
            result.pop("category_id", None)
            result["category"] = None # Скидаємо, щоб фронтенд не заплутався

    return result