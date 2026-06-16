"""
AI Vision Router
----------------
This router facilitates AI-assisted product intake by analyzing images of food products or receipts.
It performs access limit checks for non-premium users, compresses the input image, fetches
available categories (both default and custom to the user), invokes the Gemini vision model via
the Gemini service, increments the user's upload count if successful (for non-premium users),
and resolves the returned category names to DB category entities (or suggestions).
"""

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

# Set up the APIRouter for AI operations
router = APIRouter(prefix="/ai", tags=["ai"])

# Define supported media formats for the AI vision parser
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}


@router.post("/analyze-image", response_model=AIProductListResponse)
async def analyze_image(
    file: UploadFile = File(...),
    lang: str = Query("uk"),
    mode: str = Query("product"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Analyze an uploaded image (photo of food or receipt) using the AI Vision service.
    Verifies premium status, compresses the image, retrieves category mappings, and returns
    a list of parsed products.

    Parameters:
    - file (UploadFile): The uploaded image containing the food product(s) or receipt.
    - lang (str): Language parameter for the AI response (e.g. 'uk', 'en'). Defaults to 'uk'.
    - mode (str): The parsing mode ('product' or 'receipt'). Defaults to 'product'.
    - current_user (User): The authenticated user making the request.
    - db (Session): The database session dependency.

    Returns:
    - AIProductListResponse: A list of products detected by the AI model, along with warnings or errors.

    Raises:
    - HTTPException (403): If a non-premium user exceeds the allowed photo upload limit.
    - HTTPException (400): If the uploaded file is not in a supported image format or is corrupted.
    """
    # 1. Enforce usage limits for non-premium accounts
    if not current_user.is_premium and current_user.photo_uploads_count >= PHOTO_UPLOADS_LIMIT:
        raise HTTPException(
            status_code=403,
            detail="Limit reached for photo_uploads. Please upgrade to Premium.",
        )

    # 2. Check if the mime type is supported
    if not file.content_type or file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WebP images are allowed")

    # 3. Read image binary data
    image_bytes = await file.read()

    # 4. Compress the image to avoid hitting payload or model size limits
    try:
        compressed = validate_and_compress_image(image_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 5. Fetch all possible category names (default categories + user-specific custom categories)
    user_categories = get_categories(db, current_user.id)
    user_category_names = [c.name for c in user_categories]
    available_categories = list(set(user_category_names + DEFAULT_CATEGORIES))

    # 6. Request analysis from the Gemini service
    result = await analyze_product_image(
        image_bytes=compressed,
        mime_type="image/jpeg",
        user_allergens=current_user.allergens,
        available_categories=available_categories,
        lang=lang, 
        mode=mode
    )

    # If the response contains an error details list but no products, return early
    if "error" in result and not result.get("products"):
        return {"error": result["error"], "products": []}

    # 7. Deduct/increment upload count for non-premium users after successful parsing
    if not current_user.is_premium:
        current_user.photo_uploads_count += 1
        db.commit()
        db.refresh(current_user)

    # 8. Post-process parsed products to map string category names to actual database category UUIDs
    processed_products = []
    for prod in result.get("products", []):
        if "category" in prod and prod["category"]:
            category_name = prod["category"]
            # Look up category in database matching the category name for this user
            category = get_category_by_name(db, category_name, current_user.id)
            if category:
                prod["category_id"] = category.id
                prod["category"] = category.name
            else:
                # If category doesn't exist in DB, treat it as a suggestion without category_id mapping
                prod["category_suggestion"] = category_name
                prod.pop("category_id", None)
                prod["category"] = None
        processed_products.append(prod)

    return {"products": processed_products, "error": result.get("error")}