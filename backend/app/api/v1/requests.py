import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.models.user import User
from app.schemas.request import RequestCreate, RequestUpdateStatus, RequestResponse
from app.schemas.assignment import AssignmentCreate, AssignmentResponse
from app.services.request_service import (
    get_requests_for_user,
    get_request_by_id,
    create_request,
    transition_request_status
)
from app.services.assignment_service import (
    assign_episode_to_request,
    unassign_episode_from_request
)
from app.api.deps import get_current_user

router = APIRouter()

@router.get("", response_model=List[RequestResponse])
async def list_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    requests = await get_requests_for_user(current_user, db)
    return requests

@router.post("", response_model=RequestResponse, status_code=status.HTTP_201_CREATED)
async def create_new_request(
    request_in: RequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await create_request(current_user, request_in, db)

@router.get("/{request_id}", response_model=RequestResponse)
async def get_request(
    request_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    req = await get_request_by_id(request_id, db)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if current_user.role == "client" and req.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to this request")
    return req

@router.patch("/{request_id}/status", response_model=RequestResponse)
async def update_status(
    request_id: uuid.UUID,
    status_in: RequestUpdateStatus,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await transition_request_status(request_id, status_in.status, current_user, db)

@router.post("/{request_id}/assign", response_model=AssignmentResponse)
async def assign_episode(
    request_id: uuid.UUID,
    assignment_in: AssignmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await assign_episode_to_request(request_id, assignment_in.episode_id, current_user, db)

@router.delete("/{request_id}/unassign/{episode_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unassign_episode(
    request_id: uuid.UUID,
    episode_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await unassign_episode_from_request(request_id, episode_id, current_user, db)
