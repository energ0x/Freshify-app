import io
from PIL import Image
from unittest.mock import patch, AsyncMock
import pytest

from app.services.auth_service import hash_password, verify_password, create_access_token
from app.utils.image_utils import validate_and_compress_image, MAX_FILE_SIZE_MB
from app.core.limiter_config import PHOTO_UPLOADS_LIMIT


def test_password_hashing_and_verification():
    raw_pwd = "SuperSecretPassword#2026"
    hashed = hash_password(raw_pwd)
    assert hashed != raw_pwd
    assert verify_password(raw_pwd, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

    # Unique salts produce different hashes for same password
    hashed2 = hash_password(raw_pwd)
    assert hashed != hashed2


def test_image_compression_and_validation():
    # 1. Create a dummy test image
    img = Image.new("RGB", (1600, 1200), color=(255, 0, 0))
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG")
    raw_bytes = buffer.getvalue()

    # 2. Compress image
    compressed_bytes = validate_and_compress_image(raw_bytes)
    assert len(compressed_bytes) > 0

    # 3. Check resulting dimensions are clamped to MAX_SIZE (1024x1024)
    res_img = Image.open(io.BytesIO(compressed_bytes))
    assert res_img.width <= 1024
    assert res_img.height <= 1024

    # 4. Check excessive file size rejection
    oversized_bytes = b"0" * (MAX_FILE_SIZE_MB * 1024 * 1024 + 1024)
    with pytest.raises(ValueError, match="Image too large"):
        validate_and_compress_image(oversized_bytes)


def test_ai_analyze_image_invalid_content_type(client, auth_headers):
    files = {"file": ("test.txt", b"plain text data", "text/plain")}
    response = client.post("/ai/analyze-image", files=files, headers=auth_headers)
    assert response.status_code == 400
    assert "Only JPEG, PNG, or WebP" in response.json()["detail"]


@patch("app.api.routes.ai_vision.analyze_product_image", new_callable=AsyncMock)
def test_ai_analyze_image_success_mock(mock_analyze, client, auth_headers):
    # Mock Gemini response
    mock_analyze.return_value = {
        "products": [
            {
                "name": "Яблука Голден",
                "category": "Фрукти",
                "estimated_shelf_life_days": 14,
                "has_allergen": False,
                "proteins": 0.3,
                "fats": 0.2,
                "carbohydrates": 14.0
            }
        ]
    }

    # Generate a small valid image
    img = Image.new("RGB", (200, 200), color="green")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    files = {"file": ("apple.jpg", buf.getvalue(), "image/jpeg")}

    response = client.post("/ai/analyze-image", files=files, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["products"]) == 1
    assert data["products"][0]["name"] == "Яблука Голден"
    assert data["products"][0]["category"] == "Фрукти"


def test_ai_photo_quota_limit_enforcement(client, auth_headers, test_user, db_session):
    # Simulate user reaching photo upload limit within active window
    from datetime import datetime, timezone
    test_user.limits_reset_at = datetime.now(timezone.utc)
    test_user.photo_uploads_count = PHOTO_UPLOADS_LIMIT
    test_user.is_premium = False
    db_session.commit()


    img = Image.new("RGB", (100, 100), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    files = {"file": ("item.jpg", buf.getvalue(), "image/jpeg")}

    response = client.post("/ai/analyze-image", files=files, headers=auth_headers)
    assert response.status_code == 403
    assert "Limit reached for photo_uploads" in response.json()["detail"]


def test_recipe_websocket_empty_products(client, test_user):
    token = create_access_token({"sub": str(test_user.id)})
    with client.websocket_connect(f"/recipes/ws/generate?token={token}&lang=uk") as websocket:
        msg = websocket.receive_text()
        assert "немає продуктів" in msg


def test_recipe_websocket_invalid_token(client):
    from starlette.websockets import WebSocketDisconnect
    with client.websocket_connect("/recipes/ws/generate?token=invalid.jwt.token") as ws:
        with pytest.raises(WebSocketDisconnect) as exc_info:
            ws.receive_text()
        assert exc_info.value.code == 1008


