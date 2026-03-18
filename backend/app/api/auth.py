"""
Auth routes — admin login at /DjAbEr/login.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.core.security import verify_password, create_access_token
from app.models.admin_user import AdminUser
from app.schemas.auth import LoginRequest, TokenResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/DjAbEr", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def admin_login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Admin login — returns a JWT access token.
    Frontend redirects to /DjAbEr/gerer_stock after receiving the token.
    """
    result = await db.execute(
        select(AdminUser).where(AdminUser.username == payload.username)
    )
    admin = result.scalar_one_or_none()

    if admin is None or not verify_password(payload.password, admin.hashed_password):
        logger.warning(f"Failed login attempt for username: {payload.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": admin.username})
    logger.info(f"Admin '{admin.username}' logged in successfully")

    return TokenResponse(access_token=access_token)
