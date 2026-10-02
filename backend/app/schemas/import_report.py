from pydantic import BaseModel
from typing import List, Optional

class SkipReason(BaseModel):
    row_number: int
    episode_id: Optional[str] = None
    reason: str

class ImportReport(BaseModel):
    total_rows_processed: int
    imported_count: int
    skipped_count: int
    duplicate_count: int
    skip_reasons: List[SkipReason]
