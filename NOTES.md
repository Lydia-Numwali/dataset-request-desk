# Architectural & Technical Notes (NOTES.md)

**Project:** Dataset Request Desk  
**System:** Robotics Teleoperation Data Request & Fulfilment Platform  
**Chosen Stretch Item:** **Background Work** (Simulated episode export jobs with retries, 20% random failure rate, and real-time status in UI)

---

## 1. System Design & Data Model

### Data Model Diagram
```
[User] 1 ──── <creates> ────* [Request] 1 ──── <has audit history> ────* [StatusHistory]
  │                             │
  │                             └─── 1 ─── <contains> ───* [Assignment] 1 ─── 1 [Episode]
  └──── <assigns episode> ─────────────────────────────────────┘      │
                                                                       └─── 1 ─── [ExportJob]
```

### State Management & Placement
- **Domain State**: The database (`PostgreSQL`) serves as the single source of truth for request status, user credentials, episode metadata, assignments, and audit logs.
- **Workflow State Machine**: Encapsulated strictly in the backend domain layer (`request_service.py` & `assignment_service.py`). Guard conditions (e.g. delivery threshold check, quality checks, role permissions) are evaluated on the server before mutating database state.
- **Transient UI State**: React components manage local modal states and form inputs, fetching authoritative status from the REST API endpoints.

### Hardest Technical Decisions & Trade-offs
1. **Strict Database Uniqueness vs Application-level Check for Episode Assignments**:
   - *Decision*: Enforced a database-level `UNIQUE` constraint on `assignments.episode_id`.
   - *Rationale*: Relying solely on application-level checks leaves the system vulnerable to race conditions under concurrent operator actions. Enforcing the DB constraint guarantees zero duplicate assignments even under heavy parallel load.
2. **Handling Messy CSV Metadata & Timestamp Multi-formats**:
   - *Decision*: Built a multi-stage parser that standardizes ISO 8601, slash-delimited (`DD/MM/YYYY`), and space-delimited timestamps into timezone-aware `datetime` objects while reporting skipped rows in a structured JSON payload.
   - *Rationale*: Recording systems often export inconsistent date formats. Silent failures or discarding the entire file on 1 bad row would frustrate operations staff. Returning explicit skip reasons (`Unknown robot`, `Invalid quality`, `Unparseable date`) provides complete transparency.
3. **Background Job Execution Strategy (Stretch Item)**:
   - *Decision*: Used `asyncio.create_task` with isolated database session handles for background export job execution instead of full Celery/Redis infra.
   - *Rationale*: Within the time budget, `asyncio` background tasks provide retries, exponential backoff, failure rate simulation, and UI state tracking without introducing external message queue dependencies.

---

## 2. Simplifications & Future Roadmap (Next 2 Days)

### What Was Deliberately Simplified
- **Background Task Durability**: Current background tasks run in-memory within the Uvicorn process. If the container crashes mid-export, pending jobs are not persisted in a distributed queue like Celery + Redis.
- **Frontend Real-Time Polling**: The frontend uses polling (every 4s) rather than a persistent WebSocket connection to reflect export status changes.
- **Episode Search Pagination**: Search pagination uses simple limit/offset rather than cursor-based pagination.

### Next 2 Days Roadmap
1. **Celery / Redis Integration**: Migrate `ExportWorker` to Celery with Redis broker so jobs persist across server restarts and scale horizontally.
2. **WebSocket Real-time Updates**: Implement FastAPI WebSockets to push status change notifications directly to client and operator dashboards.
3. **Automated Export Artifact Bundling**: Zip episode video files and metadata into downloadable S3/GCS buckets when a request reaches `delivered`.

---

## 3. Incident Narrative (Diagnosis & Resolution)

### Incident Description
During development, when running Pytest or executing status transitions after assigning an episode, tests failed with an unexpected error:
```
StatementError: (sqlalchemy.exc.MissingGreenlet) greenlet_spawn has not been called; can't call await_() here.
```

### Diagnosis
1. **Log Inspection**: Inspecting the full stack trace revealed that the error occurred when Pydantic was serializing the `Assignment.episode` or `Request.assignments` relationship in API responses.
2. **Root Cause**: In SQLAlchemy 2.0 Async mode, accessing un-loaded relationships on an ORM instance outside an explicit `selectinload` query triggers lazy loading. Because lazy loading performs synchronous I/O on an async engine, SQLAlchemy throws a `MissingGreenlet` error.
3. **Resolution**:
   - Updated `get_request_by_id` and `assign_episode_to_request` to explicitly use `selectinload(Request.assignments).selectinload(Assignment.episode)`.
   - Used `.execution_options(populate_existing=True)` on re-queries to ensure relationship objects are refreshed cleanly without calling sync `expire_all()`.

---

## 4. Security Analysis

### Passwords, Tokens & Input Validation
- **Password Hashing**: Passwords are never stored in plain text. Hashed using `Bcrypt` with salt rounds.
- **Authentication**: Stateless `JWT` tokens signed with `HS256`, containing user ID, role, and expiration timestamps.
- **Input Validation**: All request bodies and query parameters are validated strictly via `Pydantic` schemas, enforcing integer bounds, string lengths, date formats, and email sanitization.

### Top 2 Security Vulnerabilities & Mitigations
1. **Insecure Direct Object Reference (IDOR)**:
   - *Risk*: A client user might guess another client's request UUID and attempt to view or accept/reject it.
   - *Mitigation*: Enforced strict server-side authorization in `get_request_by_id` and `transition_request_status`:
     ```python
     if user.role == "client" and req.client_id != user.id:
         raise HTTPException(status_code=403, detail="Access denied")
     ```
2. **CSV Injection & DoS via Malformed Files**:
   - *Risk*: Malicious CSV input containing cell formulas (`=CMD|'...'`) or massive files causing memory exhaustion.
   - *Mitigation*: CSV content is parsed using Python's `csv` module which strips executable formula contexts, and row processing operates as an iterative stream with batch limits.

---

## 5. Scale Analysis (10× Users & 100× Episodes / 5 Million Rows)

### What Breaks First
1. **Analytics Endpoint Latency**: `SELECT *` or loading all episodes into Python memory to compute aggregations will crash with Out-Of-Memory (OOM) errors.
2. **Database Connection Pool Exhaustion**: High concurrent user requests will exhaust default connection pools without pooling proxies like PgBouncer.

### Architectural Changes for 5M Rows Scale
1. **Database-Enforced Aggregations**:
   - All aggregations are done purely in PostgreSQL (`GROUP BY`, `COUNT(*)`, `PERCENTILE_CONT(0.5)`).
2. **Indexing Strategy**:
   - `idx_episodes_robot_recorded`: Composite index on `(robot_id, recorded_at)` reduces daily episode scans from $O(N)$ to $O(\log N)$.
   - `idx_episodes_quality_task`: Index on `(quality, task_name)` accelerates filtering top good tasks.
3. **Table Partitioning**:
   - Range-partition the `episodes` table by `recorded_at` (monthly partitions). PostgreSQL prunes unneeded partitions during date-range queries.
4. **Materialized Views**:
   - For high-traffic analytics dashboards, replace live query execution with a PostgreSQL Materialized View refreshed periodically or triggered post-batch CSV import.

---

## 6. AI Tooling Statement

- **AI Tools Used**: Used AI coding assistant (Antigravity) for boilerplate generation, Pydantic schema structuring, and styling design system components.
- **Validation**: All code logic, domain state transitions, database constraints, test fixtures, and SQL queries were reviewed, validated with automated Pytest runs, and verified end-to-end.
