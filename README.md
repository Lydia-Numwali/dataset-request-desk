# Dataset Request Desk

An internal platform for robotics data collection operations to manage dataset requests, track teleoperation episode assignments, handle messy CSV metadata imports, and execute database-enforced analytics.

---

## Quickstart (One Command Startup)

To spin up the entire system (PostgreSQL Database, FastAPI Backend REST API, Database Migrations, Auto-Seeding, and React Frontend UI) from a clean clone:

```bash
docker compose up --build
```

Access points:
- **Frontend Dashboard**: `http://localhost:3000`
- **Backend API Docs (Swagger UI)**: `http://localhost:8000/api/v1/openapi.json` / `http://localhost:8000/docs`
- **Health Endpoint**: `http://localhost:8000/health`

---

## Seed User Credentials

The system auto-seeds the following accounts on startup (password hashed securely with Bcrypt):

| Role | Email | Password | Name / Organisation | Description / Permissions |
|---|---|---|---|---|
| **Admin** | `admin@example.com` | `admin123` | Ada Admin | Full system access, user creation, role management |
| **Operator** | `ops1@example.com` | `ops123` | Olu Operator | Manage request lifecycle, assign episodes, run CSV import |
| **Operator** | `ops2@example.com` | `ops123` | Odile Operator | Manage request lifecycle, assign episodes, run CSV import |
| **Client** | `client-a@example.com` | `client123` | Acme Robotics | Create requests, view own requests, accept/reject delivery |
| **Client** | `client-b@example.com` | `client123` | Beta Labs | Create requests, view own requests, accept/reject delivery |


---

## Running Automated Tests

To run the Pytest test suite locally (covering RBAC authorization, state machine transitions, assignment quality/uniqueness guards, and CSV import idempotency):

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=. pytest -v
```

---

## Core Domain Rules & Transitions

### Request State Machine
```
submitted → in_progress → delivered → accepted
                                    ↘ rejected → in_progress (rework)
```
- **Role Permissions**:
  - `submitted` → `in_progress` (Operators/Admins)
  - `in_progress` → `delivered` (Operators/Admins, **requires `count(assignments) >= episodes_requested`**)
  - `delivered` → `accepted` (Client owner)
  - `delivered` → `rejected` (Client owner)
  - `rejected` → `in_progress` (Operators/Admins for rework)

### Episode Assignment Rules
- An episode can be assigned to **at most one request at a time** (enforced by a database UNIQUE constraint on `assignments.episode_id`).
- Only `good` or `usable` quality episodes can be assigned (quality `bad` is rejected).
- Assigning an episode triggers an asynchronous background **Export Simulation Job** with random 20% failure probability and automatic exponential backoff retries (Stretch Item).

### Idempotent CSV Import
- Normalizes whitespace, case-sensitivity, and multi-format timestamps (`ISO 8601`, `YYYY-MM-DD HH:MM:SS`, `DD/MM/YYYY HH:MM`).
- Validates against known robot registry (`arm-01`, `arm-02`, `arm-03`, `mobile-01`, `humanoid-01`).
- Re-running against the same file is safe and idempotent; existing `episode_id` records are skipped and reported in the JSON import summary without creating duplicate database rows.

---

## High-Volume Performance (5 Million Episodes Scale)

All analytics endpoints (`/api/v1/analytics`) execute directly inside PostgreSQL via SQL aggregations (`GROUP BY`, window functions, and `PERCENTILE_CONT(0.5)`).

At 5 million episodes:
1. **Indexes**: Composite index `(robot_id, recorded_at)` and `(quality, task_name)` ensure $O(\log N)$ range scans.
2. **Partitioning**: Range partitioning by `recorded_at` (monthly partitions) allows partition pruning for date-filtered queries.
3. **Pre-Aggregation**: Read-heavy analytics can use PostgreSQL Materialized Views refreshed asynchronously or triggered on batch import.
