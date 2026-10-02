import asyncio
import random
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.assignment import Assignment
from app.models.export_job import ExportJob
from app.core.logging import logger

async def run_export_job_simulation(assignment_id: uuid.UUID):
    """Background task to simulate episode export job with retries and failure rates."""
    try:
        async with AsyncSessionLocal() as db:
            stmt = select(Assignment).where(Assignment.id == assignment_id)
            result = await db.execute(stmt)
            assignment = result.scalar_one_or_none()

            if not assignment:
                logger.error("export_job_assignment_not_found", assignment_id=str(assignment_id))
                return

            stmt_job = select(ExportJob).where(ExportJob.assignment_id == assignment_id)
            res_job = await db.execute(stmt_job)
            job = res_job.scalar_one_or_none()

            if not job:
                job = ExportJob(assignment_id=assignment_id, status="processing", attempts=0)
                db.add(job)
            
            job.status = "processing"
            assignment.export_status = "processing"
            await db.commit()

            max_attempts = 3
            success = False

            for attempt in range(1, max_attempts + 1):
                job.attempts = attempt
                await db.commit()

                # Simulate delay between 0.1 to 0.5 seconds during execution
                simulated_delay = random.uniform(0.1, 0.5)
                await asyncio.sleep(simulated_delay)

                # 20% failure probability
                is_failure = random.random() < 0.20

                if not is_failure:
                    success = True
                    job.status = "completed"
                    job.last_error = None
                    assignment.export_status = "completed"
                    await db.commit()
                    logger.info("export_job_completed", assignment_id=str(assignment_id), attempt=attempt)
                    break
                else:
                    job.last_error = f"Export connection timeout on attempt {attempt}"
                    logger.warning("export_job_attempt_failed", assignment_id=str(assignment_id), attempt=attempt)
                    if attempt < max_attempts:
                        await asyncio.sleep(0.2 * attempt)

            if not success:
                job.status = "failed"
                assignment.export_status = "failed"
                await db.commit()
                logger.error("export_job_failed_finally", assignment_id=str(assignment_id), attempts=max_attempts)
    except Exception as e:
        logger.warning("export_job_simulation_offline", assignment_id=str(assignment_id), error=str(e))
