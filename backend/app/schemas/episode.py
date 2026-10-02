from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional

class EpisodeBase(BaseModel):
    episode_id: str
    robot_id: str
    task_name: str
    recorded_at: datetime
    duration_seconds: int
    operator_name: str
    quality: str

class EpisodeResponse(EpisodeBase):
    created_at: datetime
    is_assigned: bool = False
    assigned_request_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class EpisodeFilter(BaseModel):
    task_name: Optional[str] = None
    quality: Optional[str] = None
    robot_id: Optional[str] = None
    unassigned_only: bool = False
