"""
Client model — stores customer information from orders.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, autoincrement=True)
    full_name = Column(String(200), nullable=False)
    phone = Column(String(20), nullable=False)
    wilaya = Column(String(100), nullable=False)
    baladia = Column(String(100), nullable=False)
    delivery_type = Column(String(20), nullable=False)  # 'home' or 'desk'
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    orders = relationship("Order", back_populates="client")

    def __repr__(self):
        return f"<Client(id={self.id}, name='{self.full_name}')>"
