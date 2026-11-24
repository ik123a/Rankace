from uuid import uuid4

from fastapi.testclient import TestClient

from app.api import projects
from app.crawler.crawler import CrawledPage
from app.main import app, startup

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
    headers = register_project_owner()

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


def register_project_owner():
    response = client.post("/api/auth/register", json={
        "name": "Project owner",
        "email": f"owner-{uuid4().hex}@example.com",
        "password": "local-test-account-password",
    })
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def create_project(headers):
    response = client.post("/api/projects", headers=headers, json={
        "name": "Regression project", "website_url": "https://example.com",
    })
    assert response.status_code == 200
    return f"/api/projects/{response.json()['id']}"


def test_empty_recrawl_keeps_previous_audit(monkeypatch):
    headers = register_project_owner()
    path = create_project(headers)
    page = CrawledPage(url="https://example.com/", status_code=200, content_text="Original page")
    monkeypatch.setattr(projects, "crawl_site", lambda _url: [page])
    monkeypatch.setattr(projects, "build_keywords", lambda *_args: [])
    assert client.post(f"{path}/crawl", headers=headers).status_code == 200

    monkeypatch.setattr(projects, "crawl_site", lambda _url: [])
    empty = client.post(f"{path}/crawl", headers=headers)
    assert empty.status_code == 422
    assert client.get(f"{path}/crawl-status", headers=headers).json()["status"] == "error"
    saved_pages = client.get(f"{path}/pages", headers=headers).json()
    assert [saved["url"] for saved in saved_pages] == [page.url]


def test_competitor_gaps_use_body_and_exclude_failed_fetch(monkeypatch):
    headers = register_project_owner()
    path = create_project(headers)
    own = CrawledPage(url="https://example.com/", status_code=200, content_text="Welcome to our site")
    monkeypatch.setattr(projects, "crawl_site", lambda _url: [own])
    monkeypatch.setattr(projects, "build_keywords", lambda *_args: [])
    monkeypatch.setattr(projects, "embedding_similarity", lambda *_args: 0.0)
    url = "https://example.com/competition"

    monkeypatch.setattr(projects, "fetch_page", lambda _url: CrawledPage(url=url, status_code=503))
    failed = client.post(f"{path}/competitors", headers=headers, json={"url": url}).json()
    assert failed["fetch_error"] and failed["similarity"] is None
    assert client.post(f"{path}/crawl", headers=headers).status_code == 200
    assert client.get(f"{path}/content-gaps", headers=headers).json() == []

    competitor = CrawledPage(url=url, status_code=200, title="Adventures", content_text="Apply for a permit before arrival")
    monkeypatch.setattr(projects, "fetch_page", lambda _url: competitor)
    fetched = client.post(f"{path}/competitors", headers=headers, json={"url": url}).json()
    assert fetched["id"] == failed["id"] and not fetched["fetch_error"]
    assert client.post(f"{path}/crawl", headers=headers).status_code == 200
    gaps = client.get(f"{path}/content-gaps", headers=headers).json()
    permit = next(gap for gap in gaps if gap["topic"] == "Permits")
    assert permit["gap_level"] == "high"


def test_legacy_demo_account_is_disabled():
    response = client.post("/api/auth/login", json={
        "email": "demo@rankace.local", "password": "demo1234",
    })
    assert response.status_code == 401
