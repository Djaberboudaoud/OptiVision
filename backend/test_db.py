import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def test_connection():
    print(f"Connecting to: {settings.DATABASE_URL}")
    engine = create_async_engine(
        settings.DATABASE_URL, 
        echo=True,
    )
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT 1"))
            print("Query successful:", result.scalar())
    except Exception as e:
        print("Error connecting to database:", e)
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_connection())
