from datetime import date
from pydantic import BaseModel
from typing import List, Dict, Optional

class DailyRobotEpisodeCount(BaseModel):
    record_date: date
    robot_id: str
    episode_count: int

class RequestStatusCount(BaseModel):
    status: str
    count: int

class RequestFulfilmentMetrics(BaseModel):
    status_counts: List[RequestStatusCount]
    median_time_to_delivery_seconds: Optional[float] = None
    median_time_to_delivery_hours: Optional[float] = None

class TopTaskCount(BaseModel):
    task_name: str
    good_episodes_count: int

class AnalyticsResponse(BaseModel):
    episodes_per_day_per_robot: List[DailyRobotEpisodeCount]
    request_fulfilment: RequestFulfilmentMetrics
    top_5_tasks_by_good_episodes: List[TopTaskCount]
