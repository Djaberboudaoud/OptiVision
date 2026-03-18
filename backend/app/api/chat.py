import json
import logging
import re
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.database import get_db
from app.models.glasses import GlassesModel
from app.schemas.glasses import GlassesResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["Chat"])


# ─── Known values ─────────────────────────────────────────────

FRAME_TYPES = ["full-rim", "half-rim", "rimless"]

FRAME_SHAPES = [
    "round", "square", "rectangle", "aviator", "cat-eye", "oval"
]

GENDERS = ["male", "female", "unisex"]

MATERIALS = [
    "acetate", "tr90", "polycarbonate", "stainless steel",
    "titanium", "aluminum", "wood", "carbon fiber", "memory metal",
]

COLORS = [
    "black", "brown", "tortoise", "gold", "silver",
    "rose gold", "gunmetal", "navy blue", "burgundy", "red",
    "white", "crystal", "transparent", "green", "blue",
    "pink", "purple", "orange", "yellow", "grey",
    "havana", "champagne", "bronze", "ivory", "matte black",
]


# ─── Request model ────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    message: str
    filters: Dict[str, Any]
    results: List[GlassesResponse]


# ─── AI call to Gemini ────────────────────────────────────────

async def extract_filters_with_ai(user_message: str):

    prompt = f"""
You are an AI that extracts structured filters for a glasses search database.

Allowed filters:
frame_shape: {FRAME_SHAPES}
frame_type: {FRAME_TYPES}
material: {MATERIALS}
frame_color: {COLORS}
gender: {GENDERS}

Boolean filters:
anti_blue_light
san_glasses
anti_fracture

Price filters:
min_price
max_price

User message:
{user_message}

Return ONLY JSON.
Example:
{{
 "frame_shape": "round",
 "gender": "male",
 "max_price": 100
}}
"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key={settings.GEMINI_API_KEY}"

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }

    async with httpx.AsyncClient(timeout=30) as client:

        response = await client.post(url, json=payload)

    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="AI request failed")

    data = response.json()

    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]

        json_match = re.search(r"\{.*\}", text, re.DOTALL)

        if not json_match:
            return {}

        filters = json.loads(json_match.group())

        return filters

    except Exception as e:
        logger.error("AI parsing error: %s", e)
        return {}


# ─── SQL query builder ────────────────────────────────────────

async def search_glasses(filters: Dict[str, Any], db: AsyncSession):

    query = select(GlassesModel)

    if "frame_shape" in filters:
        query = query.where(GlassesModel.frame_shape == filters["frame_shape"])

    if "frame_type" in filters:
        query = query.where(GlassesModel.frame_type == filters["frame_type"])

    if "material" in filters:
        query = query.where(GlassesModel.material == filters["material"])

    if "frame_color" in filters:
        query = query.where(GlassesModel.frame_color == filters["frame_color"])

    if "gender" in filters:
        query = query.where(GlassesModel.gender == filters["gender"])

    if filters.get("anti_blue_light"):
        query = query.where(GlassesModel.anti_blue_light == True)

    if filters.get("san_glasses"):
        query = query.where(GlassesModel.san_glasses == True)

    if filters.get("anti_fracture"):
        query = query.where(GlassesModel.anti_fracture == True)

    if "min_price" in filters:
        query = query.where(GlassesModel.selling_price >= filters["min_price"])

    if "max_price" in filters:
        query = query.where(GlassesModel.selling_price <= filters["max_price"])

    result = await db.execute(query)

    glasses = result.scalars().all()

    return glasses


# ─── MAIN ENDPOINT ────────────────────────────────────────────

@router.post("/ai-search", response_model=ChatResponse)

async def ai_search(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db)
):

    user_message = request.message.strip()

    if not user_message:
        raise HTTPException(status_code=400, detail="Message required")

    filters = await extract_filters_with_ai(user_message)

    glasses = await search_glasses(filters, db)

    response_message = (
        f"I found {len(glasses)} glasses matching your request."
        if glasses else
        "No glasses found for this request."
    )

    return ChatResponse(
        message=response_message,
        filters=filters,
        results=glasses
    )
