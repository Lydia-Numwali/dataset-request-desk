import csv
import io
from datetime import datetime
from typing import List, Tuple, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.episode import Episode
from app.schemas.import_report import ImportReport, SkipReason
from app.core.logging import logger

KNOWN_ROBOTS = {"arm-01", "arm-02", "arm-03", "mobile-01", "humanoid-01"}
VALID_QUALITIES = {"good", "usable", "bad"}

DATE_FORMATS = [
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%d %H:%M:%S",
    "%d/%m/%Y %H:%M",
    "%d/%m/%Y %H:%M:%S",
    "%Y-%m-%d",
]

def parse_recorded_at(val: str) -> datetime:
    val = val.strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(val, fmt)
        except ValueError:
            continue
    raise ValueError(f"Unparseable date format: '{val}'")

async def import_episodes_csv(csv_content: str, db: AsyncSession) -> ImportReport:
    reader = csv.reader(io.StringIO(csv_content.strip()))
    
    total_processed = 0
    imported_count = 0
    skipped_count = 0
    duplicate_count = 0
    skip_reasons: List[SkipReason] = []

    header = None
    row_num = 0

    # Fetch existing episode IDs for batch idempotency check
    result = await db.execute(select(Episode.episode_id))
    existing_ids = set(result.scalars().all())

    episodes_to_add: Dict[str, Episode] = {}

    for row in reader:
        row_num += 1
        if not row:
            continue

        # Header check
        if row_num == 1 and "episode_id" in row[0].lower():
            header = [c.strip().lower() for c in row]
            continue

        total_processed += 1

        if len(row) < 7:
            skipped_count += 1
            skip_reasons.append(SkipReason(row_number=row_num, reason=f"Malformed row: expected at least 7 columns, got {len(row)}"))
            continue

        raw_ep_id = row[0].strip()
        raw_robot_id = row[1].strip()
        raw_task_name = row[2].strip()
        raw_recorded_at = row[3].strip()
        raw_duration = row[4].strip()
        raw_operator = row[5].strip()
        raw_quality = row[6].strip().lower()

        if not raw_ep_id:
            skipped_count += 1
            skip_reasons.append(SkipReason(row_number=row_num, reason="Missing episode_id"))
            continue

        # Check duplicate
        if raw_ep_id in existing_ids or raw_ep_id in episodes_to_add:
            skipped_count += 1
            duplicate_count += 1
            skip_reasons.append(SkipReason(row_number=row_num, episode_id=raw_ep_id, reason="Duplicate episode_id skipped (idempotent)"))
            continue

        # Validate robot_id
        if raw_robot_id not in KNOWN_ROBOTS:
            skipped_count += 1
            skip_reasons.append(SkipReason(row_number=row_num, episode_id=raw_ep_id, reason=f"Unknown robot_id '{raw_robot_id}'"))
            continue

        # Validate quality
        if raw_quality not in VALID_QUALITIES:
            skipped_count += 1
            skip_reasons.append(SkipReason(row_number=row_num, episode_id=raw_ep_id, reason=f"Invalid quality value '{raw_quality}'"))
            continue

        # Parse duration
        try:
            duration_sec = int(raw_duration)
            if duration_sec <= 0:
                raise ValueError("Duration must be positive")
        except ValueError:
            skipped_count += 1
            skip_reasons.append(SkipReason(row_number=row_num, episode_id=raw_ep_id, reason=f"Invalid duration_seconds '{raw_duration}'"))
            continue

        # Parse timestamp
        try:
            rec_dt = parse_recorded_at(raw_recorded_at)
        except ValueError as ve:
            skipped_count += 1
            skip_reasons.append(SkipReason(row_number=row_num, episode_id=raw_ep_id, reason=str(ve)))
            continue

        # Create Episode model instance
        ep = Episode(
            episode_id=raw_ep_id,
            robot_id=raw_robot_id,
            task_name=raw_task_name,
            recorded_at=rec_dt,
            duration_seconds=duration_sec,
            operator_name=raw_operator,
            quality=raw_quality
        )
        episodes_to_add[raw_ep_id] = ep
        imported_count += 1

    if episodes_to_add:
        db.add_all(episodes_to_add.values())
        await db.commit()

    logger.info("csv_import_completed", processed=total_processed, imported=imported_count, skipped=skipped_count, duplicates=duplicate_count)

    return ImportReport(
        total_rows_processed=total_processed,
        imported_count=imported_count,
        skipped_count=skipped_count,
        duplicate_count=duplicate_count,
        skip_reasons=skip_reasons
    )
