import pytest
from httpx import AsyncClient
from app.tests.conftest import get_auth_header

@pytest.mark.asyncio
async def test_client_request_isolation(client: AsyncClient, seed_users: dict):
    client_a = seed_users["client_a"]
    client_b = seed_users["client_b"]
    operator = seed_users["operator"]

    # 1. Client A creates a request
    payload = {
        "task_name": "pick cup",
        "episodes_requested": 5,
        "deadline": "2026-10-10T12:00:00Z",
        "notes": "Urgent request"
    }
    res_create = await client.post("/api/v1/requests", json=payload, headers=get_auth_header(client_a))
    assert res_create.status_code == 201
    req_a_id = res_create.json()["id"]

    # 2. Client B lists requests -> should NOT see Client A's request
    res_list_b = await client.get("/api/v1/requests", headers=get_auth_header(client_b))
    assert res_list_b.status_code == 200
    b_requests = res_list_b.json()
    assert len(b_requests) == 0

    # 3. Client B tries to get Client A's request directly -> 403 Forbidden
    res_get_b = await client.get(f"/api/v1/requests/{req_a_id}", headers=get_auth_header(client_b))
    assert res_get_b.status_code == 403

    # 4. Operator lists requests -> should see Client A's request
    res_list_op = await client.get("/api/v1/requests", headers=get_auth_header(operator))
    assert res_list_op.status_code == 200
    op_requests = res_list_op.json()
    assert len(op_requests) == 1
    assert op_requests[0]["id"] == req_a_id

@pytest.mark.asyncio
async def test_role_authorization_enforcement(client: AsyncClient, seed_users: dict):
    client_a = seed_users["client_a"]
    operator = seed_users["operator"]

    # Create request by client A
    payload = {
        "task_name": "fold towel",
        "episodes_requested": 2,
        "deadline": "2026-10-15T12:00:00Z"
    }
    res = await client.post("/api/v1/requests", json=payload, headers=get_auth_header(client_a))
    req_id = res.json()["id"]

    # Client A tries to transition submitted -> in_progress (Operator only)
    res_trans = await client.patch(
        f"/api/v1/requests/{req_id}/status",
        json={"status": "in_progress"},
        headers=get_auth_header(client_a)
    )
    assert res_trans.status_code == 403

    # Operator transitions submitted -> in_progress -> Success
    res_op = await client.patch(
        f"/api/v1/requests/{req_id}/status",
        json={"status": "in_progress"},
        headers=get_auth_header(operator)
    )
    assert res_op.status_code == 200

    # Operator tries to accept delivery (Client owner only)
    res_op_accept = await client.patch(
        f"/api/v1/requests/{req_id}/status",
        json={"status": "accepted"},
        headers=get_auth_header(operator)
    )
    assert res_op_accept.status_code == 400 or res_op_accept.status_code == 403

@pytest.mark.asyncio
async def test_admin_only_endpoints(client: AsyncClient, seed_users: dict):
    operator = seed_users["operator"]
    admin = seed_users["admin"]

    # Operator tries to access admin user management -> 403
    res_op = await client.get("/api/v1/users", headers=get_auth_header(operator))
    assert res_op.status_code == 403

    # Admin accesses user management -> 200
    res_admin = await client.get("/api/v1/users", headers=get_auth_header(admin))
    assert res_admin.status_code == 200
    assert len(res_admin.json()) == 4
