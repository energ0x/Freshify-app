import io
import base64
from PIL import Image


MAX_SIZE = (1024, 1024)
MAX_FILE_SIZE_MB = 5


def validate_and_compress_image(image_bytes: bytes) -> bytes:
    if len(image_bytes) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise ValueError(f"Image too large (max {MAX_FILE_SIZE_MB}MB)")

    img = Image.open(io.BytesIO(image_bytes))
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    img.thumbnail(MAX_SIZE, Image.LANCZOS)

    output = io.BytesIO()
    img.save(output, format="JPEG", quality=85, optimize=True)
    return output.getvalue()


def image_bytes_to_base64(image_bytes: bytes) -> str:
    return base64.b64encode(image_bytes).decode("utf-8")
