import json
import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.core.security import get_password_hash
from app.core.config import settings
from app.core.logging import logger

async def seed_initial_users(db: AsyncSession):
    seed_file = os.path.join(settings.SEED_DIR, "users.json")
    if not os.path.exists(seed_file):
        logger.warning("seed_file_not_found", path=seed_file)
        return

    with open(seed_file, "r") as f:
        users_data = json.load(f)

    for u_data in users_data:
        result = await db.execute(select(User).where(User.email == u_data["email"]))
        existing_user = result.scalar_one_or_none()

        if not existing_user:
            user = User(
                email=u_data["email"],
                password_hash=get_password_hash(u_data["password"]),
                role=u_data["role"],
                name=u_data.get("name"),
                organisation=u_data.get("organisation"),
                is_active=True
            )
            db.add(user)
            logger.info("seeded_user", email=user.email, role=user.role)

    await db.commit()
