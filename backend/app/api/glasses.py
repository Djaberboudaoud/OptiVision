"""
Glasses CRUD routes — public list + admin-protected create/update/delete.
Create & Update accept multipart form data (files + fields).
"""
import logging
import shutil
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query, Form, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.api.deps import get_current_admin
from app.models.admin_user import AdminUser
from app.models.glasses import GlassesModel
from app.schemas.glasses import GlassesResponse, GlassesListResponse
from app.services.query_generator import QueryGenerator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/glasses", tags=["Glasses"])

# Upload directories (relative to backend root)
BACKEND_ROOT = Path(__file__).parent.parent.parent
PHOTOS_DIR = BACKEND_ROOT / "glasses_photos"
MODELS_DIR = BACKEND_ROOT / "glasses_models"
PHOTOS_DIR.mkdir(exist_ok=True)
MODELS_DIR.mkdir(exist_ok=True)


def _save_file(upload: UploadFile, dest_dir: Path) -> str:
    """Save an uploaded file with a unique name, return the filename."""
    ext = Path(upload.filename).suffix.lower() if upload.filename else ""
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = dest_dir / filename
    with open(filepath, "wb") as f:
        shutil.copyfileobj(upload.file, f)
    return filename


def _delete_file(filename: Optional[str], dest_dir: Path):
    """Delete a file if it exists."""
    if filename:
        filepath = dest_dir / filename
        if filepath.exists():
            filepath.unlink()


@router.get("", response_model=GlassesListResponse)
async def list_glasses(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List all glasses (public endpoint)."""
    result = await db.execute(
        select(GlassesModel).offset(skip).limit(limit)
    )
    glasses = result.scalars().all()

    count_result = await db.execute(select(func.count(GlassesModel.id)))
    total = count_result.scalar()

    return GlassesListResponse(
        glasses=[GlassesResponse.model_validate(g) for g in glasses],
        total=total,
    )


@router.get("/{glasses_id}", response_model=GlassesResponse)
async def get_glasses(glasses_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single glasses by ID (public)."""
    result = await db.execute(
        select(GlassesModel).where(GlassesModel.id == glasses_id)
    )
    glasses = result.scalar_one_or_none()
    if not glasses:
        raise HTTPException(status_code=404, detail="Glasses not found")
    return GlassesResponse.model_validate(glasses)


@router.get("/filter/search", response_model=GlassesListResponse)
async def filter_glasses(
    price_min: Optional[float] = Query(None, ge=0),
    price_max: Optional[float] = Query(None, ge=0),
    frame_shape: Optional[str] = Query(None),
    frame_type: Optional[str] = Query(None),
    material: Optional[str] = Query(None),
    frame_color: Optional[str] = Query(None),
    gender: Optional[str] = Query(None),
    brand: Optional[str] = Query(None),
    anti_blue_light: Optional[bool] = Query(None),
    san_glasses: Optional[bool] = Query(None),
    anti_fracture: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Filter glasses with various criteria.
    Returns filtered glasses with user-friendly message.
    """
    # Build query with filters
    query, filter_summary = QueryGenerator.build_query(
        price_min=price_min,
        price_max=price_max,
        frame_shape=frame_shape,
        frame_type=frame_type,
        material=material,
        frame_color=frame_color,
        gender=gender,
        brand=brand,
        anti_blue_light=anti_blue_light,
        san_glasses=san_glasses,
        anti_fracture=anti_fracture,
        search=search,
    )
    
    # Execute query
    result = await db.execute(query)
    glasses = result.scalars().all()
    
    # Get user-friendly message
    total = len(glasses)
    user_message = QueryGenerator.get_user_friendly_response(
        filter_count=sum([price_min is not None, price_max is not None, frame_shape is not None,
                         frame_type is not None, material is not None, frame_color is not None,
                         gender is not None, brand is not None, anti_blue_light is not None,
                         san_glasses is not None, anti_fracture is not None, search is not None]),
        total_found=total
    )
    
    return GlassesListResponse(
        glasses=[GlassesResponse.model_validate(g) for g in glasses],
        total=total,
        message=user_message,
        filter_summary=filter_summary,
    )


@router.post("", response_model=GlassesResponse, status_code=status.HTTP_201_CREATED)
async def create_glasses(
    glasses_name: str = Form(...),
    frame_type: str = Form(...),
    purchase_price: float = Form(...),
    selling_price: float = Form(...),
    brand: Optional[str] = Form(None),
    material: Optional[str] = Form(None),
    lens_color: Optional[str] = Form(None),
    frame_color: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    anti_blue_light: bool = Form(False),
    san_glasses: bool = Form(False),
    anti_fracture: bool = Form(False),
    quantity: int = Form(0),
    frame_shape: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    model_3d: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
):
    """Create new glasses with optional photo/3D model upload (admin only)."""
    image_path = None
    model_path = None

    if photo and photo.filename:
        image_path = _save_file(photo, PHOTOS_DIR)
    if model_3d and model_3d.filename:
        model_path = _save_file(model_3d, MODELS_DIR)

    glasses = GlassesModel(
        glasses_name=glasses_name,
        brand=brand,
        frame_type=frame_type,
        material=material,
        lens_color=lens_color,
        frame_color=frame_color,
        gender=gender,
        anti_blue_light=anti_blue_light,
        purchase_price=purchase_price,
        selling_price=selling_price,
        quantity=quantity,
        frame_shape=frame_shape,
        san_glasses=san_glasses,
        anti_fracture=anti_fracture,
        image_path=image_path,
        model_path=model_path,
    )
    db.add(glasses)
    await db.commit()
    await db.refresh(glasses)
    logger.info(f"Admin '{admin.username}' created glasses: {glasses.glasses_name}")
    return GlassesResponse.model_validate(glasses)


@router.put("/{glasses_id}", response_model=GlassesResponse)
async def update_glasses(
    glasses_id: int,
    glasses_name: Optional[str] = Form(None),
    frame_type: Optional[str] = Form(None),
    purchase_price: Optional[float] = Form(None),
    selling_price: Optional[float] = Form(None),
    brand: Optional[str] = Form(None),
    material: Optional[str] = Form(None),
    lens_color: Optional[str] = Form(None),
    frame_color: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    anti_blue_light: Optional[bool] = Form(None),
    quantity: Optional[int] = Form(None),
    frame_shape: Optional[str] = Form(None),
    san_glasses: Optional[bool] = Form(None),
    anti_fracture: Optional[bool] = Form(None),
    photo: Optional[UploadFile] = File(None),
    model_3d: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
):
    """Update glasses with optional new photo/model upload (admin only)."""
    result = await db.execute(
        select(GlassesModel).where(GlassesModel.id == glasses_id)
    )
    glasses = result.scalar_one_or_none()
    if not glasses:
        raise HTTPException(status_code=404, detail="Glasses not found")

    # Update text fields if provided
    field_map = {
        "glasses_name": glasses_name,
        "brand": brand,
        "frame_type": frame_type,
        "material": material,
        "lens_color": lens_color,
        "frame_color": frame_color,
        "gender": gender,
        "anti_blue_light": anti_blue_light,
        "purchase_price": purchase_price,
        "selling_price": selling_price,
        "quantity": quantity,
        "frame_shape": frame_shape,
        "san_glasses": san_glasses,
        "anti_fracture": anti_fracture,
    }
    for key, value in field_map.items():
        if value is not None:
            setattr(glasses, key, value)

    # Handle file uploads — replace old files
    if photo and photo.filename:
        _delete_file(glasses.image_path, PHOTOS_DIR)
        glasses.image_path = _save_file(photo, PHOTOS_DIR)

    if model_3d and model_3d.filename:
        _delete_file(glasses.model_path, MODELS_DIR)
        glasses.model_path = _save_file(model_3d, MODELS_DIR)

    await db.commit()
    await db.refresh(glasses)
    logger.info(f"Admin '{admin.username}' updated glasses id={glasses_id}")
    return GlassesResponse.model_validate(glasses)


@router.delete("/{glasses_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_glasses(
    glasses_id: int,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
):
    """Delete glasses and its files (admin only)."""
    result = await db.execute(
        select(GlassesModel).where(GlassesModel.id == glasses_id)
    )
    glasses = result.scalar_one_or_none()
    if not glasses:
        raise HTTPException(status_code=404, detail="Glasses not found")

    # Clean up files
    _delete_file(glasses.image_path, PHOTOS_DIR)
    _delete_file(glasses.model_path, MODELS_DIR)

    await db.delete(glasses)
    await db.commit()
    logger.info(f"Admin '{admin.username}' deleted glasses id={glasses_id}")
