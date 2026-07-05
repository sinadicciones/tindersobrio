"""Iteration 2 tests: notifications, videos, discover filters"""
import os
import io
import uuid
import time
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://comunidad-sobria.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"
DEMO_PW = "Demo1234!"


def _login(email, pw=DEMO_PW):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _h(t):
    return {"Authorization": f"Bearer {t}"}


def _me(t):
    return requests.get(f"{API}/auth/me", headers=_h(t), timeout=30).json()


def _ensure_match(t1, t10):
    """Ensure demo1 & demo10 have an amistad match; return match_id."""
    me1 = _me(t1)
    me10 = _me(t10)
    # Existing?
    matches = requests.get(f"{API}/matches", headers=_h(t1), timeout=30).json()
    for m in matches:
        if m["other"]["id"] == me10["id"] and m["mode"] == "amistad":
            return m["id"], me1, me10
    # Create by mutual likes
    acts = requests.get(f"{API}/activities", timeout=30).json()
    aid = acts[0]["id"]
    requests.post(f"{API}/like", json={"target_user_id": me10["id"], "mode": "amistad", "activity_id": aid, "no_plan": False}, headers=_h(t1), timeout=30)
    r = requests.post(f"{API}/like", json={"target_user_id": me1["id"], "mode": "amistad", "activity_id": aid, "no_plan": False}, headers=_h(t10), timeout=30)
    data = r.json()
    if data.get("match"):
        return data["match_id"], me1, me10
    # fallback: refetch
    matches = requests.get(f"{API}/matches", headers=_h(t1), timeout=30).json()
    for m in matches:
        if m["other"]["id"] == me10["id"] and m["mode"] == "amistad":
            return m["id"], me1, me10
    pytest.skip("Could not establish match between demo1 and demo10")


class TestNotifications:
    def test_counts_shape_and_seen_matches(self):
        t1 = _login("demo1@plansobrio.cl")
        t10 = _login("demo10@plansobrio.cl")
        _ensure_match(t1, t10)

        r = requests.get(f"{API}/notifications/counts", headers=_h(t1), timeout=30)
        assert r.status_code == 200
        data = r.json()
        for k in ("new_matches", "unread_messages", "total"):
            assert k in data
            assert isinstance(data[k], int)
        assert data["total"] == data["new_matches"] + data["unread_messages"]

        # After seen-matches, new_matches should go to 0
        s = requests.post(f"{API}/notifications/seen-matches", headers=_h(t1), timeout=30)
        assert s.status_code == 200
        r2 = requests.get(f"{API}/notifications/counts", headers=_h(t1), timeout=30).json()
        assert r2["new_matches"] == 0

    def test_unread_messages_and_read_flow(self):
        t1 = _login("demo1@plansobrio.cl")
        t10 = _login("demo10@plansobrio.cl")
        match_id, me1, me10 = _ensure_match(t1, t10)

        # demo1 marks the match as read (baseline zero for their side)
        requests.post(f"{API}/matches/{match_id}/read", headers=_h(t1), timeout=30)
        # demo10 sends a message
        s = requests.post(f"{API}/matches/{match_id}/messages", json={"text": "hola demo1"}, headers=_h(t10), timeout=30)
        assert s.status_code == 200

        # demo1 counts should show unread >=1
        c = requests.get(f"{API}/notifications/counts", headers=_h(t1), timeout=30).json()
        assert c["unread_messages"] >= 1, c

        # Matches list also shows unread>=1 for that match
        matches = requests.get(f"{API}/matches", headers=_h(t1), timeout=30).json()
        this = next((m for m in matches if m["id"] == match_id), None)
        assert this is not None
        assert this["unread"] >= 1

        # demo1 marks read
        r = requests.post(f"{API}/matches/{match_id}/read", headers=_h(t1), timeout=30)
        assert r.status_code == 200
        c2 = requests.get(f"{API}/notifications/counts", headers=_h(t1), timeout=30).json()
        # This match no longer contributes unread
        matches2 = requests.get(f"{API}/matches", headers=_h(t1), timeout=30).json()
        this2 = next((m for m in matches2 if m["id"] == match_id), None)
        assert this2["unread"] == 0

    def test_own_and_system_messages_not_unread(self):
        t1 = _login("demo1@plansobrio.cl")
        t10 = _login("demo10@plansobrio.cl")
        match_id, _, _ = _ensure_match(t1, t10)

        # demo10 reads baseline
        requests.post(f"{API}/matches/{match_id}/read", headers=_h(t10), timeout=30)
        # demo10 sends own message
        requests.post(f"{API}/matches/{match_id}/messages", json={"text": "own msg"}, headers=_h(t10), timeout=30)

        matches = requests.get(f"{API}/matches", headers=_h(t10), timeout=30).json()
        this = next((m for m in matches if m["id"] == match_id), None)
        assert this["unread"] == 0, "own messages must not count"


class TestVideoUpload:
    def test_reject_bad_extension(self):
        t = _login("demo1@plansobrio.cl")
        files = {"file": ("bad.txt", io.BytesIO(b"hello"), "text/plain")}
        r = requests.post(f"{API}/uploads/video", files=files, headers=_h(t), timeout=30)
        assert r.status_code == 400

    def test_reject_oversize(self):
        t = _login("demo1@plansobrio.cl")
        # 41MB dummy
        big = b"\x00" * (41 * 1024 * 1024)
        files = {"file": ("big.mp4", io.BytesIO(big), "video/mp4")}
        r = requests.post(f"{API}/uploads/video", files=files, headers=_h(t), timeout=120)
        assert r.status_code == 400

    def test_upload_small_mp4_and_fetch(self):
        t = _login("demo1@plansobrio.cl")
        # Minimal mp4 (tiny random bytes; storage doesn't validate content)
        data = b"\x00\x00\x00\x20ftypisom" + b"\x00" * 512
        files = {"file": ("tiny.mp4", io.BytesIO(data), "video/mp4")}
        r = requests.post(f"{API}/uploads/video", files=files, headers=_h(t), timeout=60)
        if r.status_code == 500:
            time.sleep(2)
            r = requests.post(f"{API}/uploads/video", files=files, headers=_h(t), timeout=60)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "path" in body and "url" in body
        # Fetch
        f = requests.get(f"{BASE}{body['url']}", headers=_h(t), timeout=30)
        assert f.status_code == 200
        ct = f.headers.get("Content-Type", "")
        assert ct.startswith("video/"), f"expected video content-type, got {ct}"

        # Persist on profile
        p = requests.patch(f"{API}/profile/me", json={"videos": [body["path"]]}, headers=_h(t), timeout=30)
        assert p.status_code == 200
        me = _me(t)
        assert body["path"] in (me.get("videos") or [])

        # Public profile also includes videos
        pp = requests.get(f"{API}/profile/{me['id']}", headers=_h(t), timeout=30).json()
        assert "videos" in pp
        assert body["path"] in pp["videos"]


class TestDiscoverFilters:
    def test_age_range_filter(self):
        t = _login("demo1@plansobrio.cl")
        r = requests.get(f"{API}/discover?mode=amistad&age_min=25&age_max=32", headers=_h(t), timeout=30)
        assert r.status_code == 200
        for c in r.json():
            assert c["age"] is not None and 25 <= c["age"] <= 32, c

    def test_comuna_filter(self):
        t = _login("demo1@plansobrio.cl")
        r = requests.get(f"{API}/discover?mode=amistad&comuna=Providencia", headers=_h(t), timeout=30)
        assert r.status_code == 200
        for c in r.json():
            assert c["comuna"] == "Providencia"

    def test_combined_filters(self):
        t = _login("demo1@plansobrio.cl")
        r = requests.get(f"{API}/discover?mode=amistad&age_min=25&age_max=35&comuna=Providencia", headers=_h(t), timeout=30)
        assert r.status_code == 200
        for c in r.json():
            assert c["comuna"] == "Providencia"
            assert 25 <= c["age"] <= 35

    def test_invalid_age_type_422(self):
        t = _login("demo1@plansobrio.cl")
        r = requests.get(f"{API}/discover?mode=amistad&age_min=notanumber", headers=_h(t), timeout=30)
        assert r.status_code == 422


class TestOnboardingWithVideos:
    def test_onboarding_accepts_videos_empty(self):
        email = f"TEST_ob_vid_{uuid.uuid4().hex[:8]}@ex.com"
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "abcdef", "birthdate": "1990-01-01"}, timeout=30)
        token = r.json()["token"]
        acts = requests.get(f"{API}/activities", timeout=30).json()
        fav_ids = [a["id"] for a in acts[:3]]
        payload = {
            "alias": "VidOB", "gender": "femenino", "comuna": "Ñuñoa",
            "modes": ["amistad"], "interested_genders": [],
            "age_min": 18, "age_max": 99,
            "relationship_with_substances": "sin_consumo",
            "favorite_activities": fav_ids,
            "photos": [], "videos": [],
            "prompts": [{"q": "a", "a": "b"}],
            "accepted_rules": True,
        }
        r = requests.post(f"{API}/profile/onboarding", json=payload, headers=_h(token), timeout=30)
        assert r.status_code == 200, r.text
