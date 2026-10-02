import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from app.schemas.user import UserResponse
from app.schemas.assignment import AssignmentResponse

class RequestCreate(BaseModel):
    task_name: str
    episodes_requested: int
    deadline: datetime
    notes: Optional[str] = None

class RequestUpdateStatus(BaseModel):
    status: str

class StatusHistoryResponse(BaseModel):
    id: uuid.UUID
    from_status: Optional[str] = None
    to_status: str
    changed_by_user_id: uuid.UUID
    changed_by_name: Optional[str] = None
    changed_at: datetime

    model_config = ConfigDict(from_attributes=True)

class RequestResponse(BaseModel):
    id: uuid.UUID
    client_id: uuid.UUID
    task_name: str
    episodes_requested: int
    deadline: datetime
    notes: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    client: Optional[UserResponse] = None
    assignments: List[AssignmentResponse] = []
    history: List[StatusHistoryResponse] = []

    model_config = ConfigDict(from_attributes=True)
