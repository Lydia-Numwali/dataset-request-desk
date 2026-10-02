import pytest
from httpx import AsyncClient
from app.tests.conftest import get_auth_header

MESSY_CSV = """episode_id,robot_id,task_name,recorded_at,duration_seconds,operator_name,quality
EP-10001,arm-01,pick cup,2026-08-16T23:28:00,78,Diane,good
EP-10002,unknown-robot-99,pour water,2026-09-10T15:08:00,32,Kevin,good
EP-10003,arm-02,fold towel,14/08/2026 09:15,43,Patrick,usable
EP-10004,humanoid-01,open drawer,2026-08-09T11:02:00,-10,Aline,good
EP-10005,mobile-01,wipe table,invalid-date-str,50,Eric,good
EP-10006,arm-03,stack blocks,2026-08-21T02:39:00,108,Diane,super_high_quality
 EP-10007 ,arm-01,pick cup,2026-08-05T13:18:00,53,Diane,bad
"""

@pytest.mark.asyncio
async def test_messy_csv_import_and_skip_reasons(client: AsyncClient, seed_users: dict):
    operator = seed_users["operator"]

    res = await client.post(
        "/api/v1/episodes/import",
        data={"csv_text": MESSY_CSV},
        headers=get_auth_header(operator)
    )
    assert res.status_code == 200
    report = res.json()

    # Total rows processed = 7
    assert report["total_rows_processed"] == 7
    # Imported rows: EP-10001, EP-10003, EP-10007 (with trimmed whitespace & quality 'bad') -> 3
    assert report["imported_count"] == 3
    # Skipped rows: unknown robot (EP-10002), negative duration (EP-10004), invalid date (EP-10005), invalid quality (EP-10006) -> 4
    assert report["skipped_count"] == 4
    assert len(report["skip_reasons"]) == 4

@pytest.mark.asyncio
async def test_csv_import_idempotency(client: AsyncClient, seed_users: dict):
    operator = seed_users["operator"]

    clean_csv = """episode_id,robot_id,task_name,recorded_at,duration_seconds,operator_name,quality
EP-20001,arm-01,pick cup,2026-08-16T23:28:00,78,Diane,good
EP-20002,arm-02,pour water,2026-09-10T15:08:00,32,Kevin,usable
"""

    # 1. First import run
    res1 = await client.post(
        "/api/v1/episodes/import",
        data={"csv_text": clean_csv},
        headers=get_auth_header(operator)
    )
    assert res1.status_code == 200
    report1 = res1.json()
    assert report1["imported_count"] == 2
    assert report1["skipped_count"] == 0

    # 2. Second import run with exact same file -> Should be 100% skipped, 0 imported
    res2 = await client.post(
        "/api/v1/episodes/import",
        data={"csv_text": clean_csv},
        headers=get_auth_header(operator)
    )
    assert res2.status_code == 200
    report2 = res2.json()
    assert report2["imported_count"] == 0
    assert report2["skipped_count"] == 2
    assert report2["duplicate_count"] == 2

    # Verify total episodes in system remains 2
    res_eps = await client.get("/api/v1/episodes", headers=get_auth_header(operator))
    assert res_eps.status_code == 200
    assert len(res_eps.json()) == 2
