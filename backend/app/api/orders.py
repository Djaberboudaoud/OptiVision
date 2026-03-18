"""
Order routes — client order submission with transaction safety.
"""
import logging
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.api.deps import get_current_admin
from app.models.admin_user import AdminUser
from app.models.client import Client
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.glasses import GlassesModel
from app.models.notification import Notification
from app.schemas.orders import OrderCreate, OrderResponse, OrderItemResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/orders", tags=["Orders"])


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(payload: OrderCreate, db: AsyncSession = Depends(get_db)):
    """
    Client submits an order.
    Wrapped in a transaction: if any step fails, everything rolls back.
    
    Flow:
    1. Create client
    2. Create order
    3. For each item: check stock → reduce quantity → create order_item
    4. Calculate total_price
    5. Create notification
    6. Commit transaction
    """
    if not payload.items or len(payload.items) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order must contain at least one item",
        )

    try:
        async with db.begin():
            # 1. Create client
            client = Client(
                full_name=payload.full_name,
                phone=payload.phone,
                wilaya=payload.wilaya,
                baladia=payload.baladia,
                delivery_type=payload.delivery_type,
            )
            db.add(client)
            await db.flush()  # Get client.id

            # 2. Create order
            order = Order(
                client_id=client.id,
                total_price=0.0,
                order_status="pending",
            )
            db.add(order)
            await db.flush()  # Get order.id

            # 3. Process each item
            total_price = Decimal("0")
            for item in payload.items:
                # Fetch glasses with row-level lock to prevent race conditions
                result = await db.execute(
                    select(GlassesModel)
                    .where(GlassesModel.id == item.glasses_id)
                    .with_for_update()
                )
                glasses = result.scalar_one_or_none()

                if glasses is None:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Glasses with id {item.glasses_id} not found",
                    )

                if glasses.quantity < item.quantity:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"'{glasses.glasses_name}' is out of stock (available: {glasses.quantity}, requested: {item.quantity})",
                    )

                # Reduce stock
                glasses.quantity -= item.quantity
                total_price += glasses.selling_price * item.quantity

                # Create order item
                order_item = OrderItem(
                    order_id=order.id,
                    glasses_id=item.glasses_id,
                    quantity=item.quantity,
                )
                db.add(order_item)

            # 4. Update total price
            order.total_price = total_price

            # 5. Create notification
            notification = Notification(
                message=f"طلب جديد من {client.full_name} — {len(payload.items)} منتج(ات) — {total_price} DA",
            )
            db.add(notification)

        # Transaction committed automatically by async with db.begin()
        logger.info(f"Order #{order.id} created for client '{client.full_name}' — total: {total_price} DA")

        # Refresh to load relationships
        await db.refresh(order)
        result = await db.execute(
            select(Order)
            .where(Order.id == order.id)
            .options(selectinload(Order.order_items))
        )
        order = result.scalar_one()

        return OrderResponse(
            id=order.id,
            client_id=order.client_id,
            total_price=order.total_price,
            order_status=order.order_status,
            created_at=order.created_at,
            items=[OrderItemResponse.model_validate(i) for i in order.order_items],
            client_name=client.full_name,
        )

    except HTTPException:
        raise  # Re-raise HTTP exceptions (stock errors, etc.)
    except Exception as e:
        logger.error(f"Order creation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create order. Please try again.",
        )


@router.get("", response_model=list[OrderResponse])
async def list_orders(
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
):
    """List all orders (admin only)."""
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.order_items), selectinload(Order.client))
        .order_by(Order.created_at.desc())
    )
    orders = result.scalars().all()

    return [
        OrderResponse(
            id=o.id,
            client_id=o.client_id,
            total_price=o.total_price,
            order_status=o.order_status,
            created_at=o.created_at,
            items=[OrderItemResponse.model_validate(i) for i in o.order_items],
            client_name=o.client.full_name if o.client else None,
        )
        for o in orders
    ]
