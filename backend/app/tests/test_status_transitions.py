import pytest
from httpx import AsyncClient
from app.tests.conftest import get_auth_header

@pytest.mark.asyncio
async def test_request_lifecycle_and_history(client: AsyncClient, seed_users: dict):
    client_a = seed_users["client_a"]
    operator = seed_users["operator"]

    # 1. Create Request
    req_payload = {
        "task_name": "pour water",
        "episodes_requested": 1,
        "deadline": "2026-10-20T00:00:00Z"
    }
    res = await client.post("/api/v1/requests", json=req_payload, headers=get_auth_header(client_a))
    assert res.status_code == 201
    req_data = res.json()
    req_id = req_data["id"]
    assert req_data["status"] == "submitted"

    # 2. Invalid Transition direct to delivered or accepted -> 400
    res_invalid = await client.patch(
        f"/api/v1/requests/{req_id}/status",
        json={"status": "delivered"},
        headers=get_auth_header(operator)
    )
    assert res_invalid.status_code == 400

    # 3. Transition submitted -> in_progress
    res_in_prog = await client.patch(
        f"/api/v1/requests/{req_id}/status",
        json={"status": "in_progress"},
        headers=get_auth_header(operator)
    )
    assert res_in_prog.status_code == 200
    assert res_in_prog.json()["status"] == "in_progress"

    # 4. Import a good episode & assign it so delivery threshold is met
    csv_data = "episode_id,robot_id,task_name,recorded_at,duration_seconds,operator_name,quality\nEP-99901,arm-01,pour water,2026-09-01T10:00:00,45,Aline,good\n"
    await client.post("/api/v1/episodes/import", data={"csv_text": csv_data}, headers=get_auth_header(operator))
    await client.post(f"/api/v1/requests/{req_id}/assign", json={"episode_id": "EP-99901"}, headers=get_auth_header(operator))

    # 5. Transition in_progress -> delivered
    res_deliv = await client.patch(
        f"/api/v1/requests/{req_id}/status",
        json={"status": "delivered"},
        headers=get_auth_header(operator)
    )
    assert res_deliv.status_code == 200
    assert res_deliv.json()["status"] == "delivered"

    # 6. Client A rejects delivery -> status becomes rejected
    res_rej = await client.patch(
        f"/api/v1/requests/{req_id}/status",
        json={"status": "rejected"},
        headers=get_auth_header(client_a)
    )
    assert res_rej.status_code == 200
    assert res_rej.json()["status"] == "rejected"

    # 7. Operator moves rejected -> in_progress (rework)
    res_rework = await client.patch(
        f"/api/v1/requests/{req_id}/status",
        json={"status": "in_progress"},
        headers=get_auth_header(operator)
    )
    assert res_rework.status_code == 200
    assert res_rework.json()["status"] == "in_progress"

    # 8. Deliver again and Client A accepts
    res_deliv2 = await client.patch(f"/api/v1/requests/{req_id}/status", json={"status": "delivered"}, headers=get_auth_header(operator))
    assert res_deliv2.status_code == 200

    res_accept = await client.patch(f"/api/v1/requests/{req_id}/status", json={"status": "accepted"}, headers=get_auth_header(client_a))
    print("DEBUG_RES_ACCEPT:", res_accept.json())
    assert res_accept.status_code == 200
    assert res_accept.json()["status"] == "accepted"

    # Verify status history audit entries
    history = res_accept.json()["history"]
    assert len(history) >= 6
    assert history[0]["to_status"] == "submitted"
    assert history[-1]["to_status"] == "accepted"
