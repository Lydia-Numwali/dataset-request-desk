import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.core.security import get_password_hash
from app.api.deps import require_roles

router = APIRouter()

@router.get("", response_model=List[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()

@router.post("", response_model=UserResponse)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    existing = await db.execute(select(User).where(User.email == user_in.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User with this email already exists")

    new_user = User(
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role=user_in.role,
        name=user_in.name,
        organisation=user_in.organisation,
        is_active=True
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["admin"]))
):
    result = await db.execute(select(User).where(User.id == user_id))
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_in.email:
        target_user.email = user_in.email
    if user_in.name is not None:
        target_user.name = user_in.name
    if user_in.organisation is not None:
        target_user.organisation = user_in.organisation
    if user_in.role:
        target_user.role = user_in.role
    if user_in.is_active is not None:
        target_user.is_active = user_in.is_active
    if user_in.password:
        target_user.password_hash = get_password_hash(user_in.password)

    await db.commit()
    await db.refresh(target_user)
    return target_user
