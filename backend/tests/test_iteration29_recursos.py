"""Iteration 29 - Fase 3 Recursos: sober-counter + blog visibility."""
import os
import time
import requests
from datetime import datetime, timezone, timedelta

BASE = os.environ.get("BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE}/api"

DEMO_EMAIL = "demo1@plansobrio.cl"
DEMO_PW = "Demo1234!"
OTHER_EMAIL = "demo2@plansobrio.cl"
ADMIN_EMAIL = "contacto@sinadicciones.org"
ADMIN_PW = "Jodorowsky100"


def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=30)
    r.raise_for_status()
    return r.json()["token"]


def _hdr(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- Sober counter ----------

def test_sober_counter_flow():
    tok = _login(DEMO_EMAIL, DEMO_PW)
    h = _hdr(tok)
    # Ensure clean start: stop first
    requests.post(f"{API}/sober-counter/stop", headers=h, timeout=15)

    # GET → inactive
    r = requests.get(f"{API}/sober-counter", headers=h, timeout=15)
    assert r.status_code == 200
    assert r.json() == {"active": False}

    # POST /start (no body) → today, days=0, next=7
    r = requests.post(f"{API}/sober-counter/start", json={}, headers=h, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["active"] is True
    assert data["days"] == 0
    assert data["next_milestone"] == 7
    assert data["milestones_reached"] == []
    assert data["start_date"] == datetime.now(timezone.utc).date().isoformat()

    # POST /start with 42 days ago
    past = (datetime.now(timezone.utc).date() - timedelta(days=42)).isoformat()
    r = requests.post(f"{API}/sober-counter/start", json={"start_date": past}, headers=h, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["active"] is True
    assert d["days"] == 42
    assert d["next_milestone"] == 90
    assert set(d["milestones_reached"]) == {7, 30}

    # POST /start future → 422 with 'futura' in detail
    future = (datetime.now(timezone.utc).date() + timedelta(days=1)).isoformat()
    r = requests.post(f"{API}/sober-counter/start", json={"start_date": future}, headers=h, timeout=15)
    assert r.status_code == 422, r.text
    body = r.json()
    detail = str(body.get("detail") or body)
    assert "futura" in detail, detail

    # POST /reset → days=0
    r = requests.post(f"{API}/sober-counter/reset", headers=h, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["active"] is True
    assert d["days"] == 0
    assert d["milestones_notified"] == []

    # PATCH /date with 100 days ago
    new_start = (datetime.now(timezone.utc).date() - timedelta(days=100)).isoformat()
    r = requests.patch(f"{API}/sober-counter/date", json={"start_date": new_start}, headers=h, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["start_date"] == new_start
    assert d["days"] == 100
    assert d["milestones_notified"] == []

    # POST /stop → inactive
    r = requests.post(f"{API}/sober-counter/stop", headers=h, timeout=15)
    assert r.status_code == 200
    assert r.json() == {"active": False}

    # GET → inactive
    r = requests.get(f"{API}/sober-counter", headers=h, timeout=15)
    assert r.status_code == 200
    assert r.json() == {"active": False}


def test_sober_counter_private_in_public_profile():
    tok1 = _login(DEMO_EMAIL, DEMO_PW)
    h1 = _hdr(tok1)
    # Activate demo1 counter
    requests.post(f"{API}/sober-counter/start", json={}, headers=h1, timeout=15)
    # Get demo1 user id
    me = requests.get(f"{API}/auth/me", headers=h1, timeout=15).json()
    demo1_id = me["id"]

    # Log in as another user, view demo1 profile
    tok2 = _login(OTHER_EMAIL, DEMO_PW)
    h2 = _hdr(tok2)
    r = requests.get(f"{API}/profile/{demo1_id}", headers=h2, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "sober_counter" not in body, f"sober_counter leaked in public profile: {list(body.keys())}"

    # Own /sober-counter still works
    r = requests.get(f"{API}/sober-counter", headers=h1, timeout=15)
    assert r.status_code == 200
    assert r.json().get("active") is True

    # cleanup
    requests.post(f"{API}/sober-counter/stop", headers=h1, timeout=15)


# ---------- Blog visibility ----------

def test_blog_private_vs_public():
    admin_tok = _login(ADMIN_EMAIL, ADMIN_PW)
    demo_tok = _login(DEMO_EMAIL, DEMO_PW)
    ah = _hdr(admin_tok)
    dh = _hdr(demo_tok)

    ts = int(time.time())
    slug = f"test-private-{ts}"
    payload = {
        "slug": slug,
        "title": f"Test Private {ts}",
        "meta_description": "test description meta",
        "excerpt": "excerpt for test",
        "content_html": "<p>Hello</p>",
        "tags": ["test"],
        "status": "publicado",
        "visibility": "private",
    }
    r = requests.post(f"{API}/admin/blog/posts", json=payload, headers=ah, timeout=20)
    assert r.status_code in (200, 201), r.text
    created = r.json()
    pid = created.get("id")

    try:
        # Public list: NOT include the private slug
        r = requests.get(f"{API}/blog/posts", timeout=15)
        assert r.status_code == 200
        pub_slugs = [p["slug"] for p in r.json()]
        assert slug not in pub_slugs, f"private post leaked to public list: {pub_slugs}"

        # Public detail: 404
        r = requests.get(f"{API}/blog/posts/{slug}", timeout=15)
        assert r.status_code == 404

        # App list (auth): includes private
        r = requests.get(f"{API}/app/blog/posts", headers=dh, timeout=15)
        assert r.status_code == 200
        app_slugs = [p["slug"] for p in r.json()]
        assert slug in app_slugs, f"private post missing from app list: {app_slugs}"

        # App list requires auth
        r = requests.get(f"{API}/app/blog/posts", timeout=15)
        assert r.status_code in (401, 403)
    finally:
        if pid:
            requests.delete(f"{API}/admin/blog/posts/{pid}", headers=ah, timeout=15)
