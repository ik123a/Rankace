from fastapi.testclient import TestClient
from app.main import app, startup
from app.core.database import init_db

init_db()
startup()
client = TestClient(app)


def test_api_health_and_demo():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    res_demo = client.get("/api/projects/demo")
    assert res_demo.status_code == 200
    assert res_demo.json()["demo"] is True
    assert "DEMO DATA" in res_demo.json()["note"]


def test_api_public_intent():
    res = client.get("/api/projects/intent/classify?query=buy+iphone+17")
    assert res.status_code == 200
    data = res.json()
    assert data["intent"] == "Transactional"
    assert "matched" in data["why"]


def test_api_auth_flow():
    import random
    rand_email = f"tester_{random.randint(10000, 99999)}@example.com"

    # Register
    res_reg = client.post("/api/auth/register", json={
        "name": "Integration Tester",
        "email": rand_email,
        "password": "strongPassword123!"
    })
    assert res_reg.status_code == 200
    token = res_reg.json()["access_token"]
    assert token

    headers = {"Authorization": f"Bearer {token}"}

    # /me
    res_me = client.get("/api/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["email"] == rand_email

    # Login
    res_login = client.post("/api/auth/login", json={
        "email": rand_email,
        "password": "strongPassword123!"
    })
    assert res_login.status_code == 200
    assert "access_token" in res_login.json()


def test_api_project_lifecycle():
    # Login demo user
    res_login = client.post("/api/auth/login", json={
        "email": "demo@rankace.local",
        "password": "demo1234"
    })
    token = res_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create project
    res_proj = client.post("/api/projects", headers=headers, json={
        "name": "Test Lifecycle Project",
        "website_url": "https://example.com",
        "target_keyword": "test keyword search"
    })
    assert res_proj.status_code == 200
    proj_id = res_proj.json()["id"]

    # Get project
    res_get = client.get(f"/api/projects/{proj_id}", headers=headers)
    assert res_get.status_code == 200
    assert res_get.json()["name"] == "Test Lifecycle Project"

    # Archive project
    res_arch = client.post(f"/api/projects/{proj_id}/archive", headers=headers)
    assert res_arch.status_code == 200
    assert res_arch.json()["status"] == "archived"

    # PDF Report export
    res_pdf = client.get(f"/api/projects/{proj_id}/report/pdf", headers=headers)
    assert res_pdf.status_code == 200
    assert res_pdf.headers["content-type"] == "application/pdf"
    assert res_pdf.content.startswith(b"%PDF")

    # Delete project
    res_del = client.delete(f"/api/projects/{proj_id}", headers=headers)
    assert res_del.status_code == 200
    assert res_del.json()["ok"] is True
