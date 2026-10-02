import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.request import Request
from app.models.user import User
from app.models.status_history import StatusHistory
from app.models.assignment import Assignment
from app.schemas.request import RequestCreate
from app.core.logging import logger

VALID_TRANSITIONS = {
    ("submitted", "in_progress"): ["operator", "admin"],
    ("in_progress", "delivered"): ["operator", "admin"],
    ("delivered", "accepted"): ["client"],
    ("delivered", "rejected"): ["client"],
    ("rejected", "in_progress"): ["operator", "admin"],
}

async def get_requests_for_user(user: User, db: AsyncSession) -> List[Request]:
    stmt = select(Request).options(
        selectinload(Request.client),
        selectinload(Request.assignments).selectinload(Assignment.episode),
        selectinload(Request.history).selectinload(StatusHistory.changed_by)
    ).execution_options(populate_existing=True).order_by(Request.created_at.desc())

    if user.role == "client":
        stmt = stmt.where(Request.client_id == user.id)

    result = await db.execute(stmt)
    return list(result.scalars().all())

async def get_request_by_id(request_id: uuid.UUID, db: AsyncSession) -> Optional[Request]:
    stmt = select(Request).options(
        selectinload(Request.client),
        selectinload(Request.assignments).selectinload(Assignment.episode),
        selectinload(Request.history).selectinload(StatusHistory.changed_by)
    ).execution_options(populate_existing=True).where(Request.id == request_id)
    
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

async def create_request(client_user: User, req_in: RequestCreate, db: AsyncSession) -> Request:
    if client_user.role != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can create dataset requests"
        )
    
    if req_in.episodes_requested <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="episodes_requested must be greater than 0"
        )

    db_req = Request(
        client_id=client_user.id,
        task_name=req_in.task_name,
        episodes_requested=req_in.episodes_requested,
        deadline=req_in.deadline,
        notes=req_in.notes,
        status="submitted"
    )
    db.add(db_req)
    await db.flush()

    # Record initial status in history
    history = StatusHistory(
        request_id=db_req.id,
        from_status=None,
        to_status="submitted",
        changed_by_user_id=client_user.id
    )
    db.add(history)
    await db.commit()
    
    req_id = db_req.id
    logger.info("request_created", request_id=str(req_id), client_id=str(client_user.id))
    return await get_request_by_id(req_id, db)

async def transition_request_status(
    request_id: uuid.UUID,
    target_status: str,
    user: User,
    db: AsyncSession
) -> Request:
    req = await get_request_by_id(request_id, db)
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    # Authorization scope check for client
    if user.role == "client" and req.client_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this request")

    current_status = req.status
    transition_key = (current_status, target_status)

    if transition_key not in VALID_TRANSITIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status transition from '{current_status}' to '{target_status}'"
        )

    allowed_roles = VALID_TRANSITIONS[transition_key]
    if user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Users with role '{user.role}' cannot perform transition from '{current_status}' to '{target_status}'"
        )

    # GUARD: Delivery threshold check
    if target_status == "delivered":
        assigned_count = len(req.assignments)
        if assigned_count < req.episodes_requested:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot deliver request: assigned episodes ({assigned_count}) is less than requested ({req.episodes_requested})"
            )

    # Perform transition
    old_status = req.status
    req.status = target_status

    history = StatusHistory(
        request_id=req.id,
        from_status=old_status,
        to_status=target_status,
        changed_by_user_id=user.id
    )
    db.add(history)
    await db.commit()
    
    logger.info("request_status_transitioned", request_id=str(req.id), from_status=old_status, to_status=target_status, user_id=str(user.id))
    return await get_request_by_id(req.id, db)
