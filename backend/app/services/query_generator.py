"""
SQL Query Generator for Glasses Filter
Converts filter requests to safe PostgreSQL SELECT queries
"""
from typing import Optional, Dict, List, Any
from sqlalchemy import select, and_
from app.models.glasses import GlassesModel


class QueryGenerator:
    """Generate safe SQL queries for glasses filters."""

    ALLOWED_FILTERS = {
        "price": "selling_price",
        "frame_shape": "frame_shape",
        "frame_type": "frame_type",
        "material": "material",
        "frame_color": "frame_color",
        "gender": "gender",
        "brand": "brand",
        "anti_blue_light": "anti_blue_light",
        "san_glasses": "san_glasses",
        "anti_fracture": "anti_fracture",
    }

    FRAME_SHAPES = ["round", "square", "rectangle", "aviator", "cat-eye", "oval"]
    FRAME_TYPES = ["full-rim", "half-rim", "rimless"]
    MATERIALS = ["Acetate", "TR90", "Polycarbonate", "Stainless Steel", "Titanium", "Aluminum", "Wood", "Carbon Fiber", "Memory Metal"]
    GENDERS = ["male", "female", "unisex"]

    USER_FRIENDLY_MESSAGES = {
        "frame_shape": {
            "round": "👁️ Round frames - Classic & Timeless",
            "square": "📦 Square frames - Bold & Modern",
            "rectangle": "📐 Rectangle frames - Sophisticated",
            "aviator": "✈️ Aviator frames - Iconic Style",
            "cat-eye": "😸 Cat-eye frames - Trendy & Fun",
            "oval": "⭕ Oval frames - Elegant & Flattering",
        },
        "frame_type": {
            "full-rim": "🔲 Full-rim - Complete Protection",
            "half-rim": "〰️ Half-rim - Lightweight Look",
            "rimless": "💎 Rimless - Minimalist Design",
        },
        "material": {
            "Acetate": "🎨 Acetate - Colorful & Durable",
            "TR90": "💪 TR90 - Flexible & Unbreakable",
            "Polycarbonate": "🛡️ Polycarbonate - Strong & Safe",
            "Stainless Steel": "⚙️ Stainless Steel - Premium Metal",
            "Titanium": "🏆 Titanium - Ultra-Lightweight",
            "Aluminum": "🪶 Aluminum - Modern & Light",
            "Wood": "🌳 Wood - Natural & Eco-Friendly",
            "Carbon Fiber": "⚡ Carbon Fiber - High-Performance",
            "Memory Metal": "🧠 Memory Metal - Flexible & Durable",
        },
        "gender": {
            "male": "👨 Men's Styles",
            "female": "👩 Women's Styles",
            "unisex": "👥 Unisex Collection",
        }
    }

    @staticmethod
    def build_query(
        price_min: Optional[float] = None,
        price_max: Optional[float] = None,
        frame_shape: Optional[str] = None,
        frame_type: Optional[str] = None,
        material: Optional[str] = None,
        frame_color: Optional[str] = None,
        gender: Optional[str] = None,
        brand: Optional[str] = None,
        anti_blue_light: Optional[bool] = None,
        san_glasses: Optional[bool] = None,
        anti_fracture: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> tuple:
        """
        Build SQLAlchemy query with filters.
        Returns (query, filter_summary)
        """
        conditions = [GlassesModel.quantity > 0]
        filters_applied = []

        # Price filter
        if price_min is not None and price_min >= 0:
            conditions.append(GlassesModel.selling_price >= price_min)
            filters_applied.append(f"Min Price: ${price_min:.2f}")

        if price_max is not None and price_max >= 0:
            conditions.append(GlassesModel.selling_price <= price_max)
            filters_applied.append(f"Max Price: ${price_max:.2f}")

        # Text search
        if search:
            search_term = f"%{search}%"
            from sqlalchemy import or_
            conditions.append(
                or_(
                    GlassesModel.glasses_name.ilike(search_term),
                    GlassesModel.brand.ilike(search_term),
                )
            )
            filters_applied.append(f"Search: '{search}'")

        # Frame shape filter (exact match from whitelisted values)
        if frame_shape and frame_shape.lower() in QueryGenerator.FRAME_SHAPES:
            conditions.append(GlassesModel.frame_shape == frame_shape.lower())
            filters_applied.append(QueryGenerator.USER_FRIENDLY_MESSAGES["frame_shape"].get(frame_shape.lower(), frame_shape))

        # Frame type filter (exact match from whitelisted values)
        if frame_type and frame_type.lower() in QueryGenerator.FRAME_TYPES:
            conditions.append(GlassesModel.frame_type == frame_type.lower())
            filters_applied.append(QueryGenerator.USER_FRIENDLY_MESSAGES["frame_type"].get(frame_type.lower(), frame_type))

        # Material filter (exact match from whitelisted values)
        if material and material in QueryGenerator.MATERIALS:
            conditions.append(GlassesModel.material == material)
            filters_applied.append(QueryGenerator.USER_FRIENDLY_MESSAGES["material"].get(material, material))

        # Frame color filter (case-insensitive search for text)
        if frame_color:
            conditions.append(GlassesModel.frame_color.ilike(frame_color))
            filters_applied.append(f"🎨 Frame Color: {frame_color}")

        # Gender filter (exact match from whitelisted values)
        if gender and gender.lower() in QueryGenerator.GENDERS:
            conditions.append(GlassesModel.gender == gender.lower())
            filters_applied.append(QueryGenerator.USER_FRIENDLY_MESSAGES["gender"].get(gender.lower(), gender))

        # Brand filter
        if brand:
            conditions.append(GlassesModel.brand.ilike(brand))
            filters_applied.append(f"🏢 Brand: {brand}")

        # Anti-blue light filter
        if anti_blue_light is True:
            conditions.append(GlassesModel.anti_blue_light == True)
            filters_applied.append("🔵 Anti-Blue Light Protection")

        # San glasses filter
        if san_glasses is True:
            conditions.append(GlassesModel.san_glasses == True)
            filters_applied.append("☀️ Sunglasses")

        # Anti-fracture filter
        if anti_fracture is True:
            conditions.append(GlassesModel.anti_fracture == True)
            filters_applied.append("🛡️ Anti-Fracture Protection")

        # Build query
        query = select(GlassesModel).where(and_(*conditions)).limit(20)

        filter_summary = " • ".join(filters_applied) if filters_applied else "Showing all available glasses"

        return query, filter_summary

    @staticmethod
    def get_raw_sql_query(
        price_min: Optional[float] = None,
        price_max: Optional[float] = None,
        frame_shape: Optional[str] = None,
        frame_type: Optional[str] = None,
        material: Optional[str] = None,
        frame_color: Optional[str] = None,
        gender: Optional[str] = None,
        brand: Optional[str] = None,
        anti_blue_light: Optional[bool] = None,
        san_glasses: Optional[bool] = None,
        anti_fracture: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> str:
        """
        Generate raw SQL query string (for reference/debugging).
        """
        conditions = ["quantity > 0"]

        if price_min is not None and price_min >= 0:
            conditions.append(f"selling_price >= {price_min}")

        if price_max is not None and price_max >= 0:
            conditions.append(f"selling_price <= {price_max}")

        if search:
            search_term = search.replace("'", "''")
            conditions.append(f"(glasses_name ILIKE '%{search_term}%' OR brand ILIKE '%{search_term}%')")

        # Categorical filters use exact matching (=) not ILIKE
        if frame_shape and frame_shape.lower() in QueryGenerator.FRAME_SHAPES:
            conditions.append(f"frame_shape = '{frame_shape.lower()}'")

        if frame_type and frame_type.lower() in QueryGenerator.FRAME_TYPES:
            conditions.append(f"frame_type = '{frame_type.lower()}'")

        if material and material in QueryGenerator.MATERIALS:
            conditions.append(f"material = '{material}'")

        if frame_color:
            frame_color_clean = frame_color.replace("'", "''")
            conditions.append(f"frame_color ILIKE '%{frame_color_clean}%'")

        if gender and gender.lower() in QueryGenerator.GENDERS:
            conditions.append(f"gender = '{gender.lower()}'")

        if brand:
            brand_clean = brand.replace("'", "''")
            conditions.append(f"brand ILIKE '%{brand_clean}%'")

        if anti_blue_light is True:
            conditions.append("anti_blue_light = true")

        if san_glasses is True:
            conditions.append("san_glasses = true")

        if anti_fracture is True:
            conditions.append("anti_fracture = true")

        where_clause = " AND ".join(conditions)
        sql_query = f"SELECT * FROM glasses WHERE {where_clause} LIMIT 20;"

        return sql_query

    @staticmethod
    def get_user_friendly_response(filter_count: int, total_found: int) -> str:
        """Generate user-friendly response message."""
        if total_found == 0:
            return "😔 No glasses found matching your criteria. Try adjusting your filters!"
        elif total_found == 1:
            return f"✨ Found 1 perfect pair for you!"
        elif total_found < 5:
            return f"🎯 Found {total_found} great options for you!"
        elif total_found < 20:
            return f"👓 Found {total_found} styles matching your preferences!"
        else:
            return f"🌟 Showing 20 of {total_found} available options!"
