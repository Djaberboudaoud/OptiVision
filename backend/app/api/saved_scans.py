from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models.saved_scan import SavedScan
from app.schemas.saved_scan import SavedScanCreate, SavedScanResponse
from app.core.security import get_current_admin

router = APIRouter(prefix="/saved-scans", tags=["Saved Scans"])

@router.post("", response_model=SavedScanResponse, status_code=status.HTTP_201_CREATED)
async def create_saved_scan(scan_in: SavedScanCreate, db: AsyncSession = Depends(get_db)):
    """
    Public endpoint: Create a new saved face scan.
    """
    new_scan = SavedScan(
        face_shape=scan_in.face_shape,
        confidence=scan_in.confidence,
        mbs=scan_in.mbs,
        pupillary_distance=scan_in.pupillary_distance,
        face_width=scan_in.face_width,
        face_height=scan_in.face_height,
        photo_data_url=scan_in.photo_data_url
    )
    db.add(new_scan)
    await db.commit()
    await db.refresh(new_scan)
    return new_scan

@router.get("", response_model=List[SavedScanResponse])
async def get_all_saved_scans(
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """
    Protected endpoint: Get all saved scans for the admin dashboard.
    """
    result = await db.execute(select(SavedScan).order_by(desc(SavedScan.created_at)))
    return result.scalars().all()

@router.delete("/{scan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_saved_scan(
    scan_id: int,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """
    Protected endpoint: Delete a saved scan by ID.
    """
    result = await db.execute(select(SavedScan).where(SavedScan.id == scan_id))
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    await db.delete(scan)
    await db.commit()
    return None
