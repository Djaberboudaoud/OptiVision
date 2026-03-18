"""
OrderItem model — line items in an order, linked to glasses.
"""
from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    glasses_id = Column(Integer, ForeignKey("glasses.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)

    # Relationships
    order = relationship("Order", back_populates="order_items")
    glasses = relationship("GlassesModel")

    def __repr__(self):
        return f"<OrderItem(id={self.id}, glasses={self.glasses_id}, qty={self.quantity})>"
