from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.models.episode import Episode
from app.models.assignment import Assignment
from app.models.user import User
from app.schemas.episode import EpisodeResponse
from app.schemas.import_report import ImportReport
from app.services.import_service import import_episodes_csv
from app.api.deps import require_roles

router = APIRouter()

@router.get("", response_model=List[EpisodeResponse])
async def list_episodes(
    task_name: Optional[str] = Query(None),
    quality: Optional[str] = Query(None),
    robot_id: Optional[str] = Query(None),
    unassigned_only: bool = Query(False),
    limit: int = Query(200, le=1000),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["operator", "admin", "client"]))
):
    stmt = select(Episode).options(selectinload(Episode.assignment)).order_by(Episode.recorded_at.desc())

    filters = []
    if task_name:
        filters.append(Episode.task_name.ilike(f"%{task_name}%"))
    if quality:
        filters.append(Episode.quality == quality.lower())
    if robot_id:
        filters.append(Episode.robot_id == robot_id)

    if filters:
        stmt = stmt.where(and_(*filters))

    result = await db.execute(stmt.offset(offset).limit(limit))
    episodes = result.scalars().all()

    response_items = []
    for ep in episodes:
        is_assigned = ep.assignment is not None
        if unassigned_only and is_assigned:
            continue
        
        ep_dict = EpisodeResponse(
            episode_id=ep.episode_id,
            robot_id=ep.robot_id,
            task_name=ep.task_name,
            recorded_at=ep.recorded_at,
            duration_seconds=ep.duration_seconds,
            operator_name=ep.operator_name,
            quality=ep.quality,
            created_at=ep.created_at,
            is_assigned=is_assigned,
            assigned_request_id=str(ep.assignment.request_id) if ep.assignment else None
        )
        response_items.append(ep_dict)

    return response_items

@router.post("/import", response_model=ImportReport)
async def import_episodes(
    file: Optional[UploadFile] = File(None),
    csv_text: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["operator", "admin"]))
):
    content = ""
    if file:
        raw_bytes = await file.read()
        content = raw_bytes.decode("utf-8", errors="replace")
    elif csv_text:
        content = csv_text
    else:
        raise HTTPException(status_code=400, detail="Must provide either a file or csv_text form field")

    report = await import_episodes_csv(content, db)
    return report
