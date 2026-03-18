"""
Image processing utilities.
"""
import io
import logging
from typing import Tuple

import cv2
import numpy as np
from PIL import Image

from app.core.config import settings

logger = logging.getLogger(__name__)


def validate_image_file(file_content: bytes, filename: str) -> bool:
    """
    Validate image file format and size.
    
    Args:
        file_content: Raw file bytes
        filename: Original filename
        
    Returns:
        bool: True if valid, False otherwise
    """
    # Check file size
    if len(file_content) > settings.MAX_FILE_SIZE:
        logger.warning(f"File {filename} exceeds max size of {settings.MAX_FILE_SIZE} bytes")
        return False
    
    # Check file extension
    file_ext = filename.split(".")[-1].lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        logger.warning(f"File {filename} has unsupported extension: {file_ext}")
        return False
    
    # Try to open as image
    try:
        image = Image.open(io.BytesIO(file_content))
        image.verify()
        return True
    except Exception as e:
        logger.warning(f"Invalid image file {filename}: {str(e)}")
        return False


def load_and_preprocess_image(file_content: bytes) -> np.ndarray:
    """
    Load and preprocess image for model inference.
    
    Args:
        file_content: Raw file bytes
        
    Returns:
        Preprocessed image array with shape (1, 288, 288, 3)
        
    Raises:
        ValueError: If image processing fails
    """
    try:
        # Load image using OpenCV from bytes
        nparr = np.frombuffer(file_content, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise ValueError("Failed to decode image")
        
        # Convert BGR to RGB
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Resize to model input size
        image = cv2.resize(image, (settings.IMG_SIZE, settings.IMG_SIZE))
        
        # Normalize to [0, 1]
        image = image.astype(np.float32) / 255.0
        
        # Expand dimensions for batch (add batch dimension)
        image = np.expand_dims(image, axis=0)
        
        logger.debug(f"Image preprocessed successfully. Shape: {image.shape}")
        return image
        
    except Exception as e:
        logger.error(f"Error preprocessing image: {str(e)}")
        raise ValueError(f"Failed to process image: {str(e)}")


def validate_image_dimensions(image_array: np.ndarray) -> bool:
    """
    Validate preprocessed image dimensions.
    
    Args:
        image_array: Preprocessed image array
        
    Returns:
        bool: True if dimensions are correct
    """
    expected_shape = (1, settings.IMG_SIZE, settings.IMG_SIZE, 3)
    return image_array.shape == expected_shape
