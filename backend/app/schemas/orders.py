"""
Order schemas — order creation and response models.
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class OrderItemCreate(BaseModel):
    glasses_id: int
    quantity: int = 1


class OrderCreate(BaseModel):
    full_name: str
    phone: str
    wilaya: str
    baladia: str
    delivery_type: str  # 'home' or 'desk'
    items: List[OrderItemCreate]


class OrderItemResponse(BaseModel):
    id: int
    glasses_id: int
    quantity: int

    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    id: int
    client_id: int
    total_price: float
    order_status: str
    created_at: datetime
    items: List[OrderItemResponse] = []
    client_name: Optional[str] = None

    class Config:
        from_attributes = True
