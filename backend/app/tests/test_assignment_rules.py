import pytest
from httpx import AsyncClient
from app.tests.conftest import get_auth_header

@pytest.mark.asyncio
async def test_episode_assignment_quality_and_uniqueness(client: AsyncClient, seed_users: dict):
    client_a = seed_users["client_a"]
    operator = seed_users["operator"]

    # 1. Create two requests
    r1 = await client.post(
        "/api/v1/requests",
        json={"task_name": "open drawer", "episodes_requested": 2, "deadline": "2026-10-25T00:00:00Z"},
        headers=get_auth_header(client_a)
    )
    req1_id = r1.json()["id"]

    r2 = await client.post(
        "/api/v1/requests",
        json={"task_name": "open drawer", "episodes_requested": 1, "deadline": "2026-10-25T00:00:00Z"},
        headers=get_auth_header(client_a)
    )
    req2_id = r2.json()["id"]

    # Move req1 to in_progress
    await client.patch(f"/api/v1/requests/{req1_id}/status", json={"status": "in_progress"}, headers=get_auth_header(operator))
    await client.patch(f"/api/v1/requests/{req2_id}/status", json={"status": "in_progress"}, headers=get_auth_header(operator))

    # 2. Import episodes (good, usable, bad)
    csv_data = """episode_id,robot_id,task_name,recorded_at,duration_seconds,operator_name,quality
EP-80001,arm-01,open drawer,2026-09-01T10:00:00,45,Aline,good
EP-80002,arm-02,open drawer,2026-09-01T10:05:00,50,Eric,usable
EP-80003,arm-03,open drawer,2026-09-01T10:10:00,30,Kevin,bad
"""
    await client.post("/api/v1/episodes/import", data={"csv_text": csv_data}, headers=get_auth_header(operator))

    # 3. Assign BAD episode -> Expect 400 Bad Request
    res_bad = await client.post(
        f"/api/v1/requests/{req1_id}/assign",
        json={"episode_id": "EP-80003"},
        headers=get_auth_header(operator)
    )
    assert res_bad.status_code == 400
    assert "quality 'bad'" in res_bad.json()["detail"]

    # 4. Assign GOOD & USABLE episodes to req1 -> Success
    res_good = await client.post(
        f"/api/v1/requests/{req1_id}/assign",
        json={"episode_id": "EP-80001"},
        headers=get_auth_header(operator)
    )
    assert res_good.status_code == 200

    res_usable = await client.post(
        f"/api/v1/requests/{req1_id}/assign",
        json={"episode_id": "EP-80002"},
        headers=get_auth_header(operator)
    )
    assert res_usable.status_code == 200

    # 5. Try assigning EP-80001 to req2 (Double assignment prevention) -> Expect 400
    res_double = await client.post(
        f"/api/v1/requests/{req2_id}/assign",
        json={"episode_id": "EP-80001"},
        headers=get_auth_header(operator)
    )
    assert res_double.status_code == 400
    assert "already assigned" in res_double.json()["detail"]

@pytest.mark.asyncio
async def test_delivery_threshold_guard(client: AsyncClient, seed_users: dict):
    client_a = seed_users["client_a"]
    operator = seed_users["operator"]

    # Request requiring 2 episodes
    r = await client.post(
        "/api/v1/requests",
        json={"task_name": "stack blocks", "episodes_requested": 2, "deadline": "2026-10-30T00:00:00Z"},
        headers=get_auth_header(client_a)
    )
    req_id = r.json()["id"]

    await client.patch(f"/api/v1/requests/{req_id}/status", json={"status": "in_progress"}, headers=get_auth_header(operator))

    # Import 1 episode
    csv_data = "episode_id,robot_id,task_name,recorded_at,duration_seconds,operator_name,quality\nEP-70001,arm-01,stack blocks,2026-09-01T10:00:00,45,Aline,good\n"
    await client.post("/api/v1/episodes/import", data={"csv_text": csv_data}, headers=get_auth_header(operator))
    await client.post(f"/api/v1/requests/{req_id}/assign", json={"episode_id": "EP-70001"}, headers=get_auth_header(operator))

    # Attempt delivery with only 1 assigned episode (req requires 2) -> Expect 400
    res_deliv_fail = await client.patch(
        f"/api/v1/requests/{req_id}/status",
        json={"status": "delivered"},
        headers=get_auth_header(operator)
    )
    assert res_deliv_fail.status_code == 400
    assert "less than requested" in res_deliv_fail.json()["detail"]

    # Import and assign 2nd episode
    csv_data_2 = "episode_id,robot_id,task_name,recorded_at,duration_seconds,operator_name,quality\nEP-70002,arm-02,stack blocks,2026-09-01T10:05:00,50,Eric,good\n"
    await client.post("/api/v1/episodes/import", data={"csv_text": csv_data_2}, headers=get_auth_header(operator))
    await client.post(f"/api/v1/requests/{req_id}/assign", json={"episode_id": "EP-70002"}, headers=get_auth_header(operator))

    # Attempt delivery again -> Success
    res_deliv_ok = await client.patch(
        f"/api/v1/requests/{req_id}/status",
        json={"status": "delivered"},
        headers=get_auth_header(operator)
    )
    assert res_deliv_ok.status_code == 200
    assert res_deliv_ok.json()["status"] == "delivered"
