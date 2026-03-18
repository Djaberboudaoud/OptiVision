"""
GlassesModel — represents eyewear stock in the database.
Matches actual DB schema with file-based photo/model storage.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Numeric
from app.database import Base


class GlassesModel(Base):
    __tablename__ = "glasses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    glasses_name = Column(String(255), nullable=False)
    brand = Column(String(255), nullable=True)
    frame_type = Column(String(20), nullable=False)  # full-rim, half-rim, rimless
    material = Column(String(100), nullable=True)
    lens_color = Column(String(100), nullable=True)
    frame_color = Column(String(100), nullable=True)
    gender = Column(String(20), nullable=True)  # male, female, unisex
    anti_blue_light = Column(Boolean, default=False)
    purchase_price = Column(Numeric(10, 2), nullable=False)
    selling_price = Column(Numeric(10, 2), nullable=False)
    quantity = Column(Integer, default=0)
    image_path = Column(String(500), nullable=True)       # relative path in glasses_photos/
    model_path = Column(String(500), nullable=True)       # relative path in glasses_models/
    frame_shape = Column(String(20), nullable=True)       # round, square, rectangle, aviator, cat-eye, oval
    san_glasses = Column(Boolean, default=False)
    anti_fracture = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Glasses(id={self.id}, name='{self.glasses_name}', qty={self.quantity})>"
