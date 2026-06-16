"""
Image Processing Utilities.

Provides helper functions to validate, resize, compress, and encode images
before sending them to AI analysis services or storing them.
"""

import io
import base64
from PIL import Image

# Maximum dimensions allowed for product images to balance upload speed and quality
MAX_SIZE = (1024, 1024)

# Maximum file size threshold for incoming images (5 Megabytes)
MAX_FILE_SIZE_MB = 5


def validate_and_compress_image(image_bytes: bytes) -> bytes:
    """
    Validates the size of incoming image bytes, resizes if it exceeds maximum dimensions,
    converts format/mode to standard RGB, and compresses it to a JPEG format.

    Args:
        image_bytes (bytes): The raw binary content of the uploaded image.

    Returns:
        bytes: The compressed JPEG format image bytes.

    Raises:
        ValueError: If the file size exceeds MAX_FILE_SIZE_MB.
    """
    # Check if the raw image size is within the allowed limit
    if len(image_bytes) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise ValueError(f"Image too large (max {MAX_FILE_SIZE_MB}MB)")

    # Open image from binary stream
    img = Image.open(io.BytesIO(image_bytes))
    
    # Convert image mode to RGB if it isn't RGB or grayscale (L) to ensure JPEG compatibility
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
        
    # Resize the image in-place keeping aspect ratio if dimensions are larger than MAX_SIZE
    img.thumbnail(MAX_SIZE, Image.LANCZOS)

    # Save the processed image to an in-memory buffer using JPEG compression
    output = io.BytesIO()
    img.save(output, format="JPEG", quality=85, optimize=True)
    return output.getvalue()


def image_bytes_to_base64(image_bytes: bytes) -> str:
    """
    Encodes raw binary image data into a base64 UTF-8 string representation.

    Args:
        image_bytes (bytes): The binary representation of the image.

    Returns:
        str: The base64 encoded string format of the image.
    """
    return base64.b64encode(image_bytes).decode("utf-8")
