from datetime import date, datetime
from typing import Optional, List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func
from app.schemas.analytics import (
    AnalyticsResponse,
    DailyRobotEpisodeCount,
    RequestStatusCount,
    RequestFulfilmentMetrics,
    TopTaskCount
)
from app.models.episode import Episode
from app.models.request import Request
from app.models.status_history import StatusHistory
from app.core.logging import logger

async def get_analytics_metrics(
    start_date: Optional[datetime],
    end_date: Optional[datetime],
    db: AsyncSession
) -> AnalyticsResponse:
    # 1. Episodes per day, per robot
    episodes_query = """
        SELECT DATE(recorded_at) AS record_date, robot_id, COUNT(*) AS episode_count
        FROM episodes
    """
    params = {}
    where_clauses = []
    if start_date:
        where_clauses.append("recorded_at >= :start_date")
        params["start_date"] = start_date
    if end_date:
        where_clauses.append("recorded_at <= :end_date")
        params["end_date"] = end_date

    if where_clauses:
        episodes_query += " WHERE " + " AND ".join(where_clauses)
    
    episodes_query += " GROUP BY DATE(recorded_at), robot_id ORDER BY record_date DESC, robot_id"

    ep_res = await db.execute(text(episodes_query), params)
    daily_robot_counts = []
    for row in ep_res.fetchall():
        r_date = row[0]
        if isinstance(r_date, str):
            r_date = date.fromisoformat(r_date)
        daily_robot_counts.append(
            DailyRobotEpisodeCount(
                record_date=r_date,
                robot_id=row[1],
                episode_count=int(row[2])
            )
        )

    # 2. Request fulfilment by status count
    status_query = """
        SELECT status, COUNT(*) AS status_count
        FROM requests
        GROUP BY status
    """
    st_res = await db.execute(text(status_query))
    status_counts = [
        RequestStatusCount(status=row[0], count=int(row[1]))
        for row in st_res.fetchall()
    ]

    # Median delivery time computation
    # Try PostgreSQL PERCENTILE_CONT first, with a fallback Python calculation for SQLite/other DBs
    median_seconds: Optional[float] = None
    median_hours: Optional[float] = None

    try:
        pg_median_query = """
            SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (h.changed_at - r.created_at)))
            FROM requests r
            JOIN status_history h ON r.id = h.request_id
            WHERE h.to_status = 'delivered'
        """
        med_res = await db.execute(text(pg_median_query))
        val = med_res.scalar_one_or_none()
        if val is not None:
            median_seconds = float(val)
            median_hours = round(median_seconds / 3600.0, 2)
    except Exception:
        # Fallback query calculating difference across rows for SQLite/compat
        fallback_query = """
            SELECT r.created_at, h.changed_at
            FROM requests r
            JOIN status_history h ON r.id = h.request_id
            WHERE h.to_status = 'delivered'
        """
        f_res = await db.execute(text(fallback_query))
        durations = []
        for r_created, h_changed in f_res.fetchall():
            if isinstance(r_created, str):
                r_created = datetime.fromisoformat(r_created)
            if isinstance(h_changed, str):
                h_changed = datetime.fromisoformat(h_changed)
            diff = (h_changed - r_created).total_seconds()
            if diff >= 0:
                durations.append(diff)
        
        if durations:
            durations.sort()
            n = len(durations)
            if n % 2 == 1:
                median_seconds = durations[n // 2]
            else:
                median_seconds = (durations[n // 2 - 1] + durations[n // 2]) / 2.0
            median_hours = round(median_seconds / 3600.0, 2)

    fulfilment_metrics = RequestFulfilmentMetrics(
        status_counts=status_counts,
        median_time_to_delivery_seconds=median_seconds,
        median_time_to_delivery_hours=median_hours
    )

    # 3. Top 5 task names by good episodes
    top_tasks_query = """
        SELECT task_name, COUNT(*) AS good_count
        FROM episodes
        WHERE quality = 'good'
        GROUP BY task_name
        ORDER BY good_count DESC
        LIMIT 5
    """
    top_res = await db.execute(text(top_tasks_query))
    top_tasks = [
        TopTaskCount(task_name=row[0], good_episodes_count=int(row[1]))
        for row in top_res.fetchall()
    ]

    return AnalyticsResponse(
        episodes_per_day_per_robot=daily_robot_counts,
        request_fulfilment=fulfilment_metrics,
        top_5_tasks_by_good_episodes=top_tasks
    )
