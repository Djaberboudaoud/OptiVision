"""
Glasses schemas — CRUD request/response models.
Uses Form fields (not JSON body) since create/update use multipart file upload.
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel


class GlassesResponse(BaseModel):
    id: int
    glasses_name: str
    brand: Optional[str] = None
    frame_type: str
    material: Optional[str] = None
    lens_color: Optional[str] = None
    frame_color: Optional[str] = None
    gender: Optional[str] = None
    anti_blue_light: bool = False
    purchase_price: float
    selling_price: float
    quantity: int = 0
    image_path: Optional[str] = None
    model_path: Optional[str] = None
    frame_shape: Optional[str] = None
    san_glasses: bool = False
    anti_fracture: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class GlassesListResponse(BaseModel):
    glasses: List[GlassesResponse]
    total: int
    message: Optional[str] = None
    filter_summary: Optional[str] = None
