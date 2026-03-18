import logging
import tempfile
import os
from typing import Dict

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

from app.core.config import settings

logger = logging.getLogger(__name__)

# Path to the face_landmarker.task model
model_path = settings.MODEL_PATH

# ─── Face shape labels (capitalized, matching config.py) ─────
FACE_SHAPE_LABELS = ["Heart", "Oblong", "Oval", "Round", "Square"]


class FaceShapeService:
    """Face shape prediction using MediaPipe FaceLandmarker + geometric rules."""

    _instance = None
    _detector = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._load_landmarker()

    def _load_landmarker(self):
        """Load FaceLandmarker following official MediaPipe Tasks Python API."""
        try:
            # Exactly like the MediaPipe notebook:
            # base_options wraps the model path
            base_options = python.BaseOptions(model_asset_path=model_path)
            options = vision.FaceLandmarkerOptions(
                base_options=base_options,
                output_face_blendshapes=False,
                output_facial_transformation_matrixes=False,
                num_faces=1,
            )
            self._detector = vision.FaceLandmarker.create_from_options(options)
            logger.info(f"✅ Face Landmarker loaded from: {model_path}")
        except Exception as e:
            logger.error(f"Failed to load FaceLandmarker: {e}", exc_info=True)
            self._detector = None

    # ── Health check (called by main.py on startup) ──────────────
    def health_check(self) -> Dict:
        return {
            "model_loaded": self._detector is not None,
            "model_path": model_path,
            "status": "ready" if self._detector is not None else "not_loaded",
        }

    # ── Classify face shape from 468 landmarks ───────────────────
    def _classify_face_shape(
        self, landmarks: np.ndarray, img_w: int, img_h: int
    ) -> Dict:
        """
        Classify using geometric ratios.

        MediaPipe landmark indices:
            10  = top of forehead (midline)
            152 = chin (midline)
            234 = left ear‑jaw, 454 = right ear‑jaw
            93  = left cheekbone, 323 = right cheekbone
            54  = left forehead, 284 = right forehead
            58  = left lower jaw, 288 = right lower jaw
        """
        if landmarks.shape[0] < 468:
            return self._fallback()

        # Scale normalised coords → pixel coords for correct ratios
        s = landmarks.copy()
        s[:, 0] *= img_w
        s[:, 1] *= img_h

        dist = lambda a, b: float(np.linalg.norm(s[a][:2] - s[b][:2]))

        face_height     = dist(10, 152)
        forehead_width  = dist(54, 284)
        cheekbone_width = dist(93, 323)
        jaw_width       = dist(234, 454)
        lower_jaw_width = dist(58, 288)

        if face_height < 1 or cheekbone_width < 1:
            return self._fallback()

        w2h  = cheekbone_width / face_height
        f2c  = forehead_width  / cheekbone_width
        j2c  = jaw_width       / cheekbone_width
        lj2c = lower_jaw_width / cheekbone_width

        logger.debug(
            f"Ratios  W/H={w2h:.3f}  F/C={f2c:.3f}  J/C={j2c:.3f}  LJ/C={lj2c:.3f}"
        )

        scores = {k: 0.0 for k in FACE_SHAPE_LABELS}

        # Heart: wide forehead, narrow jaw
        if f2c > 0.85:  scores["Heart"] += 2
        if j2c < 0.90:  scores["Heart"] += 2
        if lj2c < 0.75: scores["Heart"] += 1.5
        if 0.65 < w2h < 0.85: scores["Heart"] += 1

        # Oblong: taller than wide
        if w2h < 0.65:    scores["Oblong"] += 3
        elif w2h < 0.72:  scores["Oblong"] += 1.5
        if 0.80 < f2c < 1.05: scores["Oblong"] += 1
        if 0.80 < j2c < 1.05: scores["Oblong"] += 1

        # Oval: balanced
        if 0.65 < w2h < 0.80:  scores["Oval"] += 2
        if 0.82 < f2c < 1.05:  scores["Oval"] += 1.5
        if 0.75 < j2c < 0.95:  scores["Oval"] += 1.5
        if 0.60 < lj2c < 0.85: scores["Oval"] += 1

        # Round: wide, soft jaw
        if w2h > 0.78:    scores["Round"] += 2.5
        elif w2h > 0.72:  scores["Round"] += 1
        if j2c > 0.88:    scores["Round"] += 1.5
        if lj2c > 0.78:   scores["Round"] += 1.5

        # Square: angular jaw, forehead ≈ jaw
        if j2c > 0.92:  scores["Square"] += 2.5
        if lj2c > 0.80: scores["Square"] += 1.5
        if abs(f2c - j2c) < 0.10: scores["Square"] += 1
        if 0.72 < w2h < 0.90:     scores["Square"] += 1

        total = max(sum(scores.values()), 1.0)
        probs = {k: round(v / total, 4) for k, v in scores.items()}
        winner = max(scores, key=scores.get)
        conf   = probs[winner]

        logger.info(f"Face shape → {winner}  ({conf:.0%})")
        return {
            "face_shape": winner,
            "confidence": round(conf, 4),
            "all_probabilities": probs,
        }

    @staticmethod
    def _fallback() -> Dict:
        return {
            "face_shape": "Oval",
            "confidence": 0.0,
            "all_probabilities": {k: 0.2 for k in FACE_SHAPE_LABELS},
        }

    @staticmethod
    def _empty(msg: str = "") -> Dict:
        return {
            "face_shape": "unknown",
            "landmarks": [],
            "num_landmarks": 0,
            "confidence": 0.0,
            "all_probabilities": {k: 0.2 for k in FACE_SHAPE_LABELS},
        }

    # ── Main prediction method ───────────────────────────────────
    def predict_landmarks(self, image_bytes: bytes) -> Dict:
        """Detect landmarks and classify face shape."""

        if self._detector is None:
            logger.warning("Landmarker not loaded, returning empty results")
            return self._empty()

        tmp_path = None
        try:
            # ── Save bytes to a temp file and use mp.Image.create_from_file ──
            # This is the exact approach from the official MediaPipe notebook
            # and avoids any issues with numpy array format / color space.
            suffix = ".png"
            # First decode to make sure the image is valid
            nparr = np.frombuffer(image_bytes, np.uint8)
            img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img_bgr is None:
                logger.error("Failed to decode uploaded image")
                return self._empty()

            img_h, img_w = img_bgr.shape[:2]

            # Write to temp file for MediaPipe
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                tmp_path = tmp.name
                cv2.imwrite(tmp_path, img_bgr)

            # Load image exactly like the notebook: mp.Image.create_from_file
            mp_image = mp.Image.create_from_file(tmp_path)

            # Detect landmarks
            detection_result = self._detector.detect(mp_image)

            if not detection_result.face_landmarks or len(detection_result.face_landmarks) == 0:
                logger.info("No face landmarks detected")
                return self._empty()

            # Extract the first face's landmarks
            face_landmarks = detection_result.face_landmarks[0]
            landmarks_list = [[lm.x, lm.y, lm.z] for lm in face_landmarks]
            landmarks_np = np.array(landmarks_list)

            # Classify face shape
            shape_result = self._classify_face_shape(landmarks_np, img_w, img_h)

            return {
                "face_shape": shape_result["face_shape"],
                "landmarks": landmarks_list,
                "num_landmarks": len(landmarks_list),
                "confidence": shape_result["confidence"],
                "all_probabilities": shape_result["all_probabilities"],
            }

        except Exception as e:
            logger.error(f"Prediction failed: {e}", exc_info=True)
            return self._empty()
        finally:
            # Clean up temp file
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass


# ── Singleton accessor ────────────────────────────────────────
_face_shape_service = None


def get_face_shape_service():
    global _face_shape_service
    if _face_shape_service is None:
        _face_shape_service = FaceShapeService()
    return _face_shape_service
