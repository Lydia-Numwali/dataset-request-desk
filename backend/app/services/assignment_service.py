import uuid
import asyncio
from typing import List
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.request import Request
from app.models.episode import Episode
from app.models.assignment import Assignment
from app.models.export_job import ExportJob
from app.models.user import User
from app.services.export_service import run_export_job_simulation
from app.core.logging import logger

async def assign_episode_to_request(
    request_id: uuid.UUID,
    episode_id: str,
    user: User,
    db: AsyncSession
) -> Assignment:
    if user.role not in ["operator", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only operators and admins can assign episodes to requests"
        )

    # 1. Fetch Request
    stmt_req = select(Request).where(Request.id == request_id)
    res_req = await db.execute(stmt_req)
    req = res_req.scalar_one_or_none()

    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    if req.status in ["delivered", "accepted"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot assign episodes to a request in '{req.status}' status"
        )

    # 2. Fetch Episode
    stmt_ep = select(Episode).where(Episode.episode_id == episode_id)
    res_ep = await db.execute(stmt_ep)
    ep = res_ep.scalar_one_or_none()

    if not ep:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Episode '{episode_id}' not found")

    # 3. Quality Check Guard
    if ep.quality not in ["good", "usable"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Episode '{episode_id}' has quality '{ep.quality}'. Only 'good' or 'usable' episodes can be assigned."
        )

    # 4. Uniqueness Check Guard
    stmt_existing = select(Assignment).where(Assignment.episode_id == episode_id)
    res_existing = await db.execute(stmt_existing)
    existing_assignment = res_existing.scalar_one_or_none()

    if existing_assignment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Episode '{episode_id}' is already assigned to request '{existing_assignment.request_id}'"
        )

    # 5. Create Assignment
    assignment = Assignment(
        request_id=request_id,
        episode_id=episode_id,
        assigned_by_user_id=user.id,
        export_status="pending"
    )
    db.add(assignment)
    await db.flush()

    export_job = ExportJob(
        assignment_id=assignment.id,
        status="pending",
        attempts=0
    )
    db.add(export_job)
    await db.commit()

    logger.info("episode_assigned", episode_id=episode_id, request_id=str(request_id), user_id=str(user.id))

    # Trigger background export simulation task
    asyncio.create_task(run_export_job_simulation(assignment.id))

    # Fetch fresh loaded assignment with episode relationship eagerly loaded
    stmt_full = select(Assignment).options(selectinload(Assignment.episode)).where(Assignment.id == assignment.id)
    res_full = await db.execute(stmt_full)
    return res_full.scalar_one()

async def unassign_episode_from_request(
    request_id: uuid.UUID,
    episode_id: str,
    user: User,
    db: AsyncSession
):
    if user.role not in ["operator", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only operators and admins can unassign episodes")

    stmt = select(Assignment).where(
        Assignment.request_id == request_id,
        Assignment.episode_id == episode_id
    )
    result = await db.execute(stmt)
    assignment = result.scalar_one_or_none()

    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    await db.delete(assignment)
    await db.commit()
    logger.info("episode_unassigned", episode_id=episode_id, request_id=str(request_id))
