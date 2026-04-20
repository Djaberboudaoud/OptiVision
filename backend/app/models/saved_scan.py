from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from app.database import Base

class SavedScan(Base):
    __tablename__ = "saved_scans"

    id = Column(Integer, primary_key=True, autoincrement=True)
    face_shape = Column(String(50), nullable=False)
    confidence = Column(Float, nullable=False)
    mbs = Column(Float, nullable=False)
    pupillary_distance = Column(Float, nullable=False)
    face_width = Column(Float, nullable=False)
    face_height = Column(Float, nullable=False)
    photo_data_url = Column(Text, nullable=False)  # Storing the base64 image
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<SavedScan(id={self.id}, face_shape='{self.face_shape}')>"
