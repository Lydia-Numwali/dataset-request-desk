import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional
from app.schemas.episode import EpisodeResponse

class AssignmentCreate(BaseModel):
    episode_id: str

class ExportJobResponse(BaseModel):
    id: uuid.UUID
    assignment_id: uuid.UUID
    attempts: int
    status: str
    last_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AssignmentResponse(BaseModel):
    id: uuid.UUID
    request_id: uuid.UUID
    episode_id: str
    assigned_by_user_id: uuid.UUID
    assigned_at: datetime
    export_status: str
    episode: Optional[EpisodeResponse] = None

    model_config = ConfigDict(from_attributes=True)
