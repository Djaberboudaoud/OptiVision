"""
FastAPI application entry point.
Main application setup and configuration.
"""
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from app.api.predict import router as predict_router
from app.api.auth import router as auth_router
from app.api.glasses import router as glasses_router
from app.api.orders import router as orders_router
from app.api.notifications import router as notifications_router
from app.api.chat import router as chat_router
from app.core.config import settings
from app.services.face_shape_service import get_face_shape_service
from app.database import engine, Base, async_session
from app.core.security import hash_password

# Import all models so Base.metadata picks them up
from app.models import AdminUser, GlassesModel, Client, Order, OrderItem, Notification

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# ─── Seed functions ───────────────────────────────────────────
async def seed_admin():
    """Seed default admin user (hashed password). Skips if already exists."""
    async with async_session() as db:
        result = await db.execute(
            select(AdminUser).where(AdminUser.username == settings.ADMIN_DEFAULT_USERNAME)
        )
        if result.scalar_one_or_none() is None:
            admin = AdminUser(
                username=settings.ADMIN_DEFAULT_USERNAME,
                hashed_password=hash_password(settings.ADMIN_DEFAULT_PASSWORD),
            )
            db.add(admin)
            await db.commit()
            logger.warning(
                f"⚠️  Default admin seeded: username='{settings.ADMIN_DEFAULT_USERNAME}' "
                f"— CHANGE THE PASSWORD IN PRODUCTION!"
            )
        else:
            logger.info("✅ Admin user already exists, skipping seed")


async def seed_glasses():
    """Seed initial glasses stock. Skips if table already has data."""
    async with async_session() as db:
        from sqlalchemy import func
        count = await db.execute(select(func.count(GlassesModel.id)))
        if count.scalar() > 0:
            logger.info("✅ Glasses already seeded, skipping")
            return

        initial_glasses = [
            GlassesModel(
                glasses_name="Classic Titanium", brand="OptiVision", frame_type="full-rim",
                material="Titanium", lens_color="Clear", frame_color="Black",
                gender="unisex", anti_blue_light=True,
                purchase_price=120, selling_price=189, quantity=50,
            ),
            GlassesModel(
                glasses_name="Elegant Round", brand="OptiVision", frame_type="full-rim",
                material="Acetate", lens_color="Clear", frame_color="Tortoise",
                gender="unisex", anti_blue_light=False,
                purchase_price=100, selling_price=159, quantity=50,
            ),
            GlassesModel(
                glasses_name="Aviator Pro", brand="OptiVision", frame_type="half-rim",
                material="Metal", lens_color="Gradient Gray", frame_color="Gold",
                gender="male", anti_blue_light=False,
                purchase_price=140, selling_price=219, quantity=50,
            ),
            GlassesModel(
                glasses_name="Cat Eye Chic", brand="OptiVision", frame_type="full-rim",
                material="Acetate", lens_color="Clear", frame_color="Pink",
                gender="female", anti_blue_light=True,
                purchase_price=110, selling_price=179, quantity=50,
            ),
            GlassesModel(
                glasses_name="Rimless Air", brand="OptiVision", frame_type="rimless",
                material="Titanium", lens_color="Clear", frame_color="Silver",
                gender="unisex", anti_blue_light=True,
                purchase_price=160, selling_price=249, quantity=50,
            ),
        ]
        db.add_all(initial_glasses)
        await db.commit()
        logger.info(f"✅ Seeded {len(initial_glasses)} glasses with quantity=50 each")


# ─── Lifespan ─────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup/shutdown events.
    """
    # Startup
    logger.info("🚀 Starting Smart Frame Guide Backend")
    logger.info(f"Project: {settings.PROJECT_NAME} v{settings.PROJECT_VERSION}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    
    # Create database tables
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("✅ Database tables created/verified")
    except Exception as e:
        logger.error(f"❌ Database connection failed: {str(e)}")
        logger.info("📖 Make sure PostgreSQL is running and the database exists")

    # Seed data
    try:
        await seed_admin()
        await seed_glasses()
    except Exception as e:
        logger.warning(f"⚠️ Seeding warning: {str(e)}")

    # Load ML model
    try:
        service = get_face_shape_service()
        health = service.health_check()
        if health["model_loaded"]:
            logger.info("✅ ML Model loaded successfully")
        else:
            logger.warning("⚠️  Model not loaded - API will return mock predictions")
            logger.info("📖 To fix: python convert_model.py")
    except Exception as e:
        logger.warning(f"⚠️  Model loading error (API will work with mock data): {str(e)}")
        logger.info("📖 To fix: python convert_model.py")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down Smart Frame Guide Backend")
    await engine.dispose()


# ─── Create app ───────────────────────────────────────────────
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="AI-powered glasses recommendation backend with face shape analysis",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_CREDENTIALS,
    allow_methods=settings.CORS_METHODS,
    allow_headers=settings.CORS_HEADERS,
)

# ─── Include routers ─────────────────────────────────────────
app.include_router(predict_router)
app.include_router(auth_router)
app.include_router(glasses_router)
app.include_router(orders_router)
app.include_router(notifications_router)
app.include_router(chat_router)

# Serve .glb files from caders directory
caders_path = (Path(__file__).parent.parent / "caders").resolve()
if caders_path.exists():
    app.mount("/caders", StaticFiles(directory=str(caders_path), html=False), name="caders")
    logger.info(f"✅ Mounted caders directory: {caders_path}")
    import mimetypes
    mimetypes.add_type("model/gltf-binary", ".glb")
else:
    logger.warning(f"⚠️  Caders directory not found: {caders_path}")

# Serve BufferGeometry JSON models from new_caders directory
new_caders_path = (Path(__file__).parent / "new_caders").resolve()
if new_caders_path.exists():
    app.mount("/new_caders", StaticFiles(directory=str(new_caders_path), html=False), name="new_caders")
    logger.info(f"✅ Mounted new_caders directory: {new_caders_path}")
else:
    logger.warning(f"⚠️  new_caders directory not found: {new_caders_path}")

# Serve uploaded glasses photos
photos_path = (Path(__file__).parent.parent / "glasses_photos").resolve()
photos_path.mkdir(exist_ok=True)
app.mount("/glasses_photos", StaticFiles(directory=str(photos_path), html=False), name="glasses_photos")
logger.info(f"✅ Mounted glasses_photos directory: {photos_path}")

# Serve uploaded glasses 3D models
models_upload_path = (Path(__file__).parent.parent / "glasses_models").resolve()
models_upload_path.mkdir(exist_ok=True)
app.mount("/glasses_models", StaticFiles(directory=str(models_upload_path), html=False), name="glasses_models")
logger.info(f"✅ Mounted glasses_models directory: {models_upload_path}")


@app.get("/")
async def root():
    """Root endpoint - API information."""
    return {
        "message": "Welcome to Smart Frame Guide API",
        "version": settings.PROJECT_VERSION,
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health():
    """Global health check endpoint."""
    try:
        service = get_face_shape_service()
        health_status = service.health_check()
        
        if health_status["model_loaded"]:
            return {
                "status": "healthy",
                "service": settings.PROJECT_NAME,
                "version": settings.PROJECT_VERSION
            }
        else:
            return JSONResponse(
                status_code=503,
                content={
                    "status": "unhealthy",
                    "service": settings.PROJECT_NAME,
                    "reason": "Model not loaded"
                }
            )
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "service": settings.PROJECT_NAME,
                "error": str(e)
            }
        )


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
