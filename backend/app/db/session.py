from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Handle SQLite vs PostgreSQL URL formats
db_url = settings.DATABASE_URL
sync_db_url = settings.SYNC_DATABASE_URL

if db_url.startswith("sqlite"):
    # SQLite async mode
    async_db_url = db_url.replace("sqlite://", "sqlite+aiosqlite://") if not "aiosqlite" in db_url else db_url
    engine_kwargs = {"connect_args": {"check_same_thread": False}}
else:
    async_db_url = db_url
    engine_kwargs = {}

async_engine = create_async_engine(
    async_db_url,
    echo=False,
    future=True,
    **engine_kwargs
)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

sync_engine = create_engine(
    sync_db_url if not sync_db_url.startswith("sqlite") else db_url.replace("+aiosqlite", ""),
    echo=False,
    future=True
)
SyncSessionLocal = sessionmaker(bind=sync_engine, autoflush=False, autocommit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
