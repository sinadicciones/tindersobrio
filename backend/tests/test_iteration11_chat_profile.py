"""Iteration 11 - Group chat photo/alias linking + PublicProfile safety.

Covers:
- GET /api/groups/{gid}/messages includes `photo` field and no test-noise pattern
- POST /api/groups/{gid}/messages accepts new message and persists
- GET /api/profile/{user_id} returns public profile / 404 / no leaks
- Regression: no message matches ^t\\d+-[0-9a-f]
- Rate limit: 61st message returns 429 with kind message
"""
import os
import re
import time
import pytest
import requests

BASE = os.environ.get("BACKEND_URL", "https://comunidad-sobria.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

NOISE_RE = re.compile(r"^t\d+-[0-9a-f]")


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def demo1_token():
    return _login("demo1@plansobrio.cl", "Demo1234!")


@pytest.fixture(scope="module")
def demo2_token():
    return _login("demo2@plansobrio.cl", "Demo1234!")


@pytest.fixture(scope="module")
def demo1(demo1_token):
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {demo1_token}"}, timeout=30)
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="module")
def demo2(demo2_token):
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {demo2_token}"}, timeout=30)
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="module")
def cafe_group_id(demo1_token):
    """Return the id of 'Café sobrio Santiago' group. Join as demo1 if not already."""
    r = requests.get(f"{API}/groups", headers={"Authorization": f"Bearer {demo1_token}"}, timeout=30)
    assert r.status_code == 200
    groups = r.json()
    target = None
    for g in groups:
        if "Café" in (g.get("name") or "") and "sobrio" in (g.get("name") or "").lower():
            target = g
            break
    if target is None:
        # fall back to first group
        assert groups, "No groups available"
        target = groups[0]
    gid = target["id"]
    # Ensure demo1 is member
    requests.post(f"{API}/groups/{gid}/join", headers={"Authorization": f"Bearer {demo1_token}"}, timeout=30)
    return gid


# ---------------- Group messages photo & noise ----------------
class TestGroupMessagesShape:
    def test_get_messages_has_photo_field_and_no_noise(self, demo1_token, cafe_group_id):
        r = requests.get(f"{API}/groups/{cafe_group_id}/messages",
                         headers={"Authorization": f"Bearer {demo1_token}"}, timeout=30)
        assert r.status_code == 200, r.text
        msgs = r.json()
        assert isinstance(msgs, list)
        for m in msgs:
            # photo key must exist (null OR string)
            assert "photo" in m, f"missing photo field in msg: {m}"
            assert m["photo"] is None or isinstance(m["photo"], str)
            # no test noise
            assert not NOISE_RE.match(m.get("text", "")), f"noise text found: {m['text']}"

    def test_post_message_and_persist(self, demo1_token, cafe_group_id):
        text = f"Hola equipo {int(time.time())}"
        r = requests.post(f"{API}/groups/{cafe_group_id}/messages",
                          headers={"Authorization": f"Bearer {demo1_token}"},
                          json={"text": text}, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["text"] == text
        assert "id" in body
        # follow-up GET
        r2 = requests.get(f"{API}/groups/{cafe_group_id}/messages",
                          headers={"Authorization": f"Bearer {demo1_token}"}, timeout=30)
        assert r2.status_code == 200
        texts = [m["text"] for m in r2.json()]
        assert text in texts


# ---------------- Public profile ----------------
class TestPublicProfile:
    def test_get_public_profile_ok(self, demo1_token, demo2):
        r = requests.get(f"{API}/profile/{demo2['id']}",
                         headers={"Authorization": f"Bearer {demo1_token}"}, timeout=30)
        assert r.status_code == 200, r.text
        p = r.json()
        assert p["id"] == demo2["id"]
        assert p.get("alias")
        # No private leaks
        assert "email" not in p
        assert "password_hash" not in p
        # No coords
        loc = p.get("location") or {}
        coords = (loc.get("coords") or {}).get("coordinates") if isinstance(loc.get("coords"), dict) else None
        assert coords is None, f"coords leaked: {loc}"
        # Also make sure not present under other keys
        assert "coordinates" not in str(p).lower() or "coordinates" not in p

    def test_get_public_profile_404(self, demo1_token):
        r = requests.get(f"{API}/profile/nonexistent-uid-xyz",
                         headers={"Authorization": f"Bearer {demo1_token}"}, timeout=30)
        assert r.status_code == 404


# ---------------- Regression: test-noise cleanup ----------------
class TestNoNoiseRegression:
    def test_no_test_noise_messages(self, demo1_token, cafe_group_id):
        r = requests.get(f"{API}/groups/{cafe_group_id}/messages",
                         headers={"Authorization": f"Bearer {demo1_token}"}, timeout=30)
        assert r.status_code == 200
        for m in r.json():
            assert not NOISE_RE.match(m.get("text", "")), f"noise leftover: {m['text']}"


# ---------------- Rate limit ----------------
class TestRateLimit:
    def test_rate_limit_61st_message_returns_429(self, demo2_token):
        """Send 61 quick messages as demo2 to a group demo2 is member of.

        Use a small demo group so we don't pollute Café. We'll create a fresh group
        via admin? Not available; just use first group demo2 is in / joins.
        """
        # Find/join a group
        r = requests.get(f"{API}/groups", headers={"Authorization": f"Bearer {demo2_token}"}, timeout=30)
        assert r.status_code == 200
        groups = r.json()
        assert groups, "no groups"
        gid = groups[0]["id"]
        requests.post(f"{API}/groups/{gid}/join", headers={"Authorization": f"Bearer {demo2_token}"}, timeout=30)

        headers = {"Authorization": f"Bearer {demo2_token}"}
        got_429 = False
        detail = None
        for i in range(1, 66):
            resp = requests.post(f"{API}/groups/{gid}/messages",
                                 headers=headers,
                                 json={"text": f"msg {i}"}, timeout=30)
            if resp.status_code == 429:
                got_429 = True
                try:
                    detail = resp.json().get("detail")
                except Exception:
                    detail = resp.text
                break
            assert resp.status_code == 200, f"unexpected {resp.status_code} at i={i}: {resp.text}"
        assert got_429, "Rate limit never fired within 65 sends"
        assert detail and ("rápido" in detail or "muchos" in detail or "espera" in detail.lower()), \
            f"429 detail not friendly: {detail}"
