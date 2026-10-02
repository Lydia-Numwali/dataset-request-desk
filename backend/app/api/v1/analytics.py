from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.models.user import User
from app.schemas.analytics import AnalyticsResponse
from app.services.analytics_service import get_analytics_metrics
from app.api.deps import get_current_user

router = APIRouter()

@router.get("", response_model=AnalyticsResponse)
async def read_analytics(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    metrics = await get_analytics_metrics(start_date, end_date, db)
    return metrics
