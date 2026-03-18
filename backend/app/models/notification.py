"""
Notification model — admin notifications for new orders.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    message = Column(String(500), nullable=False)
    is_read = Column(Boolean, default=False, index=True)  # Indexed for fast unread queries
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Notification(id={self.id}, read={self.is_read})>"
