# predict.py
import logging
from typing import Dict

from fastapi import APIRouter, File, UploadFile, HTTPException, status

from app.services.face_shape_service import get_face_shape_service
from app.utils.image_utils import validate_image_file

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["prediction"])


@router.post("/predict-face-shape", response_model=Dict)
async def predict_face_shape(file: UploadFile = File(...)) -> Dict:
    """
    Predict face shape from uploaded image and return landmarks.
    
    Returns JSON:
        - face_shape: Predicted face shape
        - landmarks: List of 468 landmark coordinates [[x,y],...]
        - num_landmarks: Number of landmarks detected
    """
    try:
        # Read file content
        content = await file.read()

        # Validate file type (jpg/png, max 5MB)
        if not validate_image_file(content, file.filename):
            logger.warning(f"Invalid file uploaded: {file.filename}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file. Please upload a JPG or PNG image (max 5MB)."
            )

        # Get face shape service
        service = get_face_shape_service()
        result = service.predict_landmarks(content)

        # Check if no landmarks detected
        if result.get("num_landmarks", 0) == 0:
            return {
                "face_shape": "unknown",
                "landmarks": [],
                "num_landmarks": 0,
                "confidence": 0.0,
                "all_probabilities": {"Heart": 0.2, "Oblong": 0.2, "Oval": 0.2, "Round": 0.2, "Square": 0.2},
                "message": "No face detected in the image."
            }

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction endpoint error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during face shape prediction."
        )
