import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.db.session import async_engine, AsyncSessionLocal
from app.db.base_class import Base
from app.api.v1.router import api_router
from app.services.seed_service import seed_initial_users
import app.models  # Register all models for create_all

setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("application_starting", project=settings.PROJECT_NAME)
    
    # Initialize DB tables automatically if needed
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed initial users from seed/users.json
    async with AsyncSessionLocal() as session:
        await seed_initial_users(session)

    yield
    
    logger.info("application_stopping")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Structured Logging Middleware
@app.middleware("http")
async def structured_logging_middleware(request: Request, call_next):
    start_time = time.time()
    response = None
    try:
        response = await call_next(request)
        duration_ms = round((time.time() - start_time) * 1000, 2)
        
        user_id = getattr(request.state, "user_id", "anonymous")
        
        logger.info(
            "http_request",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
            user_id=user_id
        )
        return response
    except Exception as exc:
        duration_ms = round((time.time() - start_time) * 1000, 2)
        logger.error(
            "http_request_failed",
            method=request.method,
            path=request.url.path,
            duration_ms=duration_ms,
            error=str(exc)
        )
        raise exc

@app.get("/health", tags=["Health"])
async def health_check():
    db_status = "healthy"
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "ok",
        "database": db_status,
        "service": settings.PROJECT_NAME
    }

app.include_router(api_router, prefix=settings.API_V1_STR)
