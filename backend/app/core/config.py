import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Dataset Request Desk"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-jwt-key-dataset-request-desk-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Database URLs
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/dataset_desk"
    )
    SYNC_DATABASE_URL: str = os.getenv(
        "SYNC_DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@localhost:5432/dataset_desk"
    )

    # Seed data path
    SEED_DIR: str = os.getenv(
        "SEED_DIR",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../seed"))
    )

    model_config = SettingsConfigDict(case_sensitive=True)

settings = Settings()
