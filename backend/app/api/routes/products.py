"""
Products Router
---------------
This module manages operations for user products in the inventory (the "fridge" or "pantry").
It handles operations such as image uploads, barcode lookup/scraping, listing, creating,
updating, deleting, and consuming products, as well as tracking expiring and expired items
and fetching the history of consumed items.
"""

import httpx
from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
import uuid
import os
from app.db.database import get_db
from app.db.models import User
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse, ProductConsumeRequest, ConsumedProductResponse
from app.services import product_service
from app.utils.dependencies import get_current_user
from app.utils.image_utils import validate_and_compress_image
from app.scraper import fetch_product_slug, parse_nutrition_info

# Setup the APIRouter for product-related operations
router = APIRouter(prefix="/products", tags=["products"])


@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Handle product image upload, validate/compress it, and save it locally.

    Parameters:
    - file (UploadFile): The uploaded raw image file.
    - current_user (User): The authenticated user making the request.

    Returns:
    - Dict: A dictionary with the file path ("image_url") of the saved image.

    Raises:
    - HTTPException (400): If the file format is not an image or is invalid/corrupted.
    """
    # Verify file type is an image
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    content = await file.read()
    try:
        # Validate file size, type, and compress image to reduce storage space
        compressed = validate_and_compress_image(content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Generate a unique filename using UUID and save it to the local uploads directory
    unique_filename = f"{uuid.uuid4()}.jpg"
    file_path = os.path.join("uploads", unique_filename)
    with open(file_path, "wb") as f:
        f.write(compressed)

    return {"image_url": f"/uploads/{unique_filename}"}


@router.get("/barcode/{barcode}")
async def get_by_barcode(
    barcode: str,
    current_user: User = Depends(get_current_user)
):
    """
    Look up a product's nutritional details by scanning its barcode.
    Uses the scraping module to fetch details from public databases.

    Parameters:
    - barcode (str): The product's GTIN/EAN barcode string.
    - current_user (User): The authenticated user making the request.

    Returns:
    - Dict: Scraped nutrition details of the product.

    Raises:
    - HTTPException (404): If the product or nutritional info is not found.
    """
    # Fetch slug associated with the barcode from scraper
    slug = await fetch_product_slug(barcode)
    if not slug:
        raise HTTPException(status_code=404, detail="Product not found on scraper")
        
    # Extract nutrition details and details such as calories, protein, etc.
    result = await parse_nutrition_info(slug, barcode)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
        
    # Map raw scraped info to expected frontend response format
    return {
        "name": result.get("name", "Unknown Product"),
        "category": None,
        "image_url": result.get("image_url"),
        "calories": result.get("calories"),
        "proteins": result.get("proteins"),
        "fats": result.get("fats"),
        "carbohydrates": result.get("carbs"),
        "has_allergen": False
    }


@router.get("", response_model=List[ProductResponse])
def list_products(
    category_id: Optional[uuid.UUID] = Query(None),
    sort_by: str = Query("created_at", regex="^(name|quantity|expiry_date|created_at)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all active products in the user's inventory, optionally filtered and sorted.

    Parameters:
    - category_id (UUID, optional): Filter products by category.
    - sort_by (str): Property to sort by (name, quantity, expiry_date, created_at).
    - sort_order (str): Ascending or descending order (asc, desc).
    - db (Session): The database session dependency.
    - current_user (User): The authenticated user.

    Returns:
    - List[ProductResponse]: A list of matching products.
    """
    return product_service.get_products(db, current_user.id, category_id, sort_by, sort_order)


@router.post("", response_model=ProductResponse, status_code=201)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Add a new product to the user's inventory.

    Parameters:
    - data (ProductCreate): The payload detailing the product characteristics.
    - db (Session): The database session dependency.
    - current_user (User): The authenticated user.

    Returns:
    - ProductResponse: The newly created product record.
    """
    return product_service.create_product(db, data, current_user.id)


@router.get("/expiring", response_model=List[ProductResponse])
def get_expiring(
    days: int = Query(3, ge=1, le=30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get active products expiring within the specified number of days.

    Parameters:
    - days (int): Threshold in days (1 to 30, defaults to 3).
    - db (Session): The database session dependency.
    - current_user (User): The authenticated user.

    Returns:
    - List[ProductResponse]: A list of products whose expiry date is close.
    """
    return product_service.get_expiring_products(db, current_user.id, days)


@router.get("/expired", response_model=List[ProductResponse])
def get_expired(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all active products whose expiry dates have passed.

    Parameters:
    - db (Session): The database session dependency.
    - current_user (User): The authenticated user.

    Returns:
    - List[ProductResponse]: A list of expired products.
    """
    return product_service.get_expired_products(db, current_user.id)


@router.get("/history/consumed", response_model=List[ConsumedProductResponse])
def get_consumed_history(
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve historical logs of products consumed by the user.

    Parameters:
    - limit (int): The max number of logs to return (1 to 1000, defaults to 100).
    - db (Session): The database session dependency.
    - current_user (User): The authenticated user.

    Returns:
    - List[ConsumedProductResponse]: Consumption history records.
    """
    return product_service.get_consumed_products(db, current_user.id, limit)


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Fetch details of a single product in the user's inventory by its ID.

    Parameters:
    - product_id (UUID): The unique ID of the product.
    - db (Session): The database session dependency.
    - current_user (User): The authenticated user.

    Returns:
    - ProductResponse: The matching product data.
    """
    return product_service.get_product(db, product_id, current_user.id)


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: uuid.UUID,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Modify fields of an existing product.

    Parameters:
    - product_id (UUID): The unique ID of the product to update.
    - data (ProductUpdate): The update schema.
    - db (Session): The database session dependency.
    - current_user (User): The authenticated user.

    Returns:
    - ProductResponse: The updated product.
    """
    return product_service.update_product(db, product_id, data, current_user.id)


@router.delete("/{product_id}", status_code=204)
def delete_product(
    product_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a product from the user's inventory (soft delete or hard delete depending on implementation).

    Parameters:
    - product_id (UUID): The unique ID of the product to delete.
    - db (Session): The database session dependency.
    - current_user (User): The authenticated user.
    """
    product_service.delete_product(db, product_id, current_user.id)


@router.post("/{product_id}/consume", response_model=ProductResponse)
def consume_product(
    product_id: uuid.UUID,
    data: ProductConsumeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Log partial or full consumption of a product.
    Decrements quantity and updates statuses accordingly.

    Parameters:
    - product_id (UUID): The unique ID of the product.
    - data (ProductConsumeRequest): The payload specifying the amount consumed.
    - db (Session): The database session dependency.
    - current_user (User): The authenticated user.

    Returns:
    - ProductResponse: The updated state of the product.
    """
    return product_service.consume_product(db, product_id, data.quantity, current_user.id)
