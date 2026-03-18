"""
Application configuration and constants.
"""
import os
from pathlib import Path
from typing import Dict

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # API
    PROJECT_NAME: str = "Smart Frame Guide"
    PROJECT_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    DEBUG: bool = False
    
    # CORS
    CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000", "http://localhost:8080"]
    CORS_CREDENTIALS: bool = True
    CORS_METHODS: list = ["*"]
    CORS_HEADERS: list = ["*"]
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres.dyhxhwsfsjhcrhpctmft:192837465ReportingSystem@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
    
    # JWT Authentication
    JWT_SECRET_KEY: str = "super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # Default admin seed credentials
    ADMIN_DEFAULT_USERNAME: str = "admin"
    ADMIN_DEFAULT_PASSWORD: str = "ChangeMe123"
    
    # OpenAI
    GEMINI_API_KEY: str = "AIzaSyDqihnfHBuyU-Mj_RFpHMY8eelI18FBVIw"

    
    # ML Model
    IMG_SIZE: int = 288
    
    @property
    def MODEL_PATH(self) -> str:
        """Get absolute path to model file."""
        backend_dir = Path(__file__).parent.parent.parent
        return str(backend_dir / "models" / "face_landmarker.task")
    
    # Image validation
    MAX_FILE_SIZE: int = 5 * 1024 * 1024  # 5MB
    ALLOWED_EXTENSIONS: set = {"jpg", "jpeg", "png"}
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Face shape labels
FACE_SHAPE_LABELS: Dict[int, str] = {
    0: "Heart",
    1: "Oblong",
    2: "Oval",
    3: "Round",
    4: "Square"
}

# Get settings instance
settings = Settings()
