from pydantic import BaseModel, ConfigDict
from datetime import datetime

class SavedScanBase(BaseModel):
    face_shape: str
    confidence: float
    mbs: float
    pupillary_distance: float
    face_width: float
    face_height: float
    photo_data_url: str

class SavedScanCreate(SavedScanBase):
    pass

class SavedScanResponse(SavedScanBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
