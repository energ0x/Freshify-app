from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.schemas.product import AIProductResponse
from app.services.gemini_service import analyze_product_image
from app.utils.image_utils import validate_and_compress_image
from app.utils.dependencies import get_current_user
from app.db.models import User

router = APIRouter(prefix="/ai", tags=["ai"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}


@router.post("/analyze-image", response_model=AIProductResponse)
async def analyze_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WebP images are allowed")

    image_bytes = await file.read()

    try:
        compressed = validate_and_compress_image(image_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    result = analyze_product_image(compressed, "image/jpeg")
    return result
