import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.main import app as fastapi_app
from app.db.base_class import Base
from app.db.session import get_db
from app.models import User
from app.core.security import get_password_hash, create_access_token

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_async_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

TestAsyncSessionLocal = async_sessionmaker(
    bind=test_async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

@pytest_asyncio.fixture(autouse=True)
async def prepare_db():
    async with test_async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with TestAsyncSessionLocal() as session:
        yield session

@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def _override_get_db():
        yield db_session

    fastapi_app.dependency_overrides[get_db] = _override_get_db
    async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as ac:
        yield ac
    fastapi_app.dependency_overrides.clear()

@pytest_asyncio.fixture
async def seed_users(db_session: AsyncSession):
    client_a = User(
        email="clienta@example.com",
        password_hash=get_password_hash("password123"),
        role="client",
        name="Client A",
        organisation="Acme Corp"
    )
    client_b = User(
        email="clientb@example.com",
        password_hash=get_password_hash("password123"),
        role="client",
        name="Client B",
        organisation="Beta Inc"
    )
    operator = User(
        email="operator@example.com",
        password_hash=get_password_hash("password123"),
        role="operator",
        name="Operator Olu"
    )
    admin = User(
        email="admin@example.com",
        password_hash=get_password_hash("password123"),
        role="admin",
        name="Admin Ada"
    )
    db_session.add_all([client_a, client_b, operator, admin])
    await db_session.commit()
    await db_session.refresh(client_a)
    await db_session.refresh(client_b)
    await db_session.refresh(operator)
    await db_session.refresh(admin)

    return {
        "client_a": client_a,
        "client_b": client_b,
        "operator": operator,
        "admin": admin
    }

def get_auth_header(user: User) -> dict:
    token = create_access_token(subject=user.id, role=user.role)
    return {"Authorization": f"Bearer {token}"}
