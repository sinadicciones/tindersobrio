"""Iteration 5 - BLOQUE 4 tests: banned/suspended login, videos hidden,
admin cleanup-tests, friendly upload errors, /report enum unchanged."""
import io
import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests

BASE = (os.environ.get("REACT_APP_BACKEND_URL") or "https://comunidad-sobria.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"
DEMO_PW = "Demo1234!"
ADMIN = {"email": "contacto@sinadicciones.org", "password": "Jodorowsky100"}


def _login(email, pw=DEMO_PW):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=30)
    return r


def _tok(email, pw=DEMO_PW):
    r = _login(email, pw)
    assert r.status_code == 200, f"login failed {email}: {r.status_code} {r.text}"
    return r.json()["token"]


def _h(t):
    return {"Authorization": f"Bearer {t}"}


def _admin_token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _me(t):
    r = requests.get(f"{API}/auth/me", headers=_h(t), timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


# ---------- 1. banned / suspended login ----------
class TestBanSuspendLogin:
    def test_banned_user_gets_403_and_reactivate_restores(self):
        admin_tok = _admin_token()
        demo2 = _me(_tok("demo2@plansobrio.cl"))
        try:
            # Ban demo2
            r = requests.post(
                f"{API}/admin/users/action",
                json={"action": "ban", "target_user_id": demo2["id"]},
                headers=_h(admin_tok), timeout=30,
            )
            assert r.status_code == 200, r.text
            # Login demo2 -> 403 account_banned
            r2 = _login("demo2@plansobrio.cl")
            assert r2.status_code == 403, r2.text
            detail = r2.json().get("detail", "")
            assert detail.startswith("account_banned"), detail
        finally:
            # Reactivate
            requests.post(
                f"{API}/admin/users/action",
                json={"action": "reactivate", "target_user_id": demo2["id"]},
                headers=_h(admin_tok), timeout=30,
            )
        # Login should succeed again
        r3 = _login("demo2@plansobrio.cl")
        assert r3.status_code == 200, r3.text

    def test_suspended_user_gets_403_account_suspended_with_until(self):
        """Directly set status=suspended via admin then verify login response."""
        admin_tok = _admin_token()
        # Use a fresh test user to avoid disrupting demos
        email = f"TEST_susp_{uuid.uuid4().hex[:8]}@ex.com"
        reg = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "Passw0rd!", "birthdate": "1995-03-15",
        }, timeout=30)
        assert reg.status_code == 200, reg.text
        uid = reg.json()["user"]["id"]
        # Suspend via admin action
        r = requests.post(f"{API}/admin/users/action",
                          json={"action": "suspend", "target_user_id": uid},
                          headers=_h(admin_tok), timeout=30)
        assert r.status_code == 200, r.text
        r2 = _login(email, "Passw0rd!")
        assert r2.status_code == 403, r2.text
        detail = r2.json().get("detail", "")
        assert detail.startswith("account_suspended:"), detail
        # The value after ':' should be an ISO timestamp in the future
        until_str = detail.split("account_suspended:", 1)[1]
        assert until_str, "empty until"
        try:
            until_dt = datetime.fromisoformat(until_str)
            assert until_dt > datetime.now(timezone.utc)
        except ValueError:
            pytest.fail(f"until not ISO parseable: {until_str}")


# ---------- 2. videos hidden from public endpoints ----------
class TestVideosHidden:
    def test_discover_has_no_videos_key(self):
        t = _tok("demo1@plansobrio.cl")
        r = requests.get(f"{API}/discover?mode=amistad", headers=_h(t), timeout=30)
        assert r.status_code == 200, r.text
        profiles = r.json()
        assert isinstance(profiles, list) and profiles
        for p in profiles:
            assert "videos" not in p, f"'videos' key present in discover profile: {p}"

    def test_profile_by_id_has_no_videos_key(self):
        t = _tok("demo1@plansobrio.cl")
        # Use demo3 to avoid race with parallel ban test on demo2
        demo3 = _me(_tok("demo3@plansobrio.cl"))
        r = requests.get(f"{API}/profile/{demo3['id']}", headers=_h(t), timeout=30)
        assert r.status_code == 200, r.text
        p = r.json()
        assert "videos" not in p, f"'videos' present in /profile/{{id}}: {p}"

    def test_auth_me_still_has_videos_owner_view(self):
        t = _tok("demo1@plansobrio.cl")
        me = _me(t)
        assert "videos" in me, f"'videos' missing from /auth/me (owner view): keys={list(me.keys())}"
        assert isinstance(me["videos"], list)


# ---------- 3. admin cleanup-tests ----------
class TestAdminCleanupTests:
    def test_cleanup_requires_admin_non_admin_403(self):
        t = _tok("demo1@plansobrio.cl")
        r = requests.post(f"{API}/admin/cleanup-tests", headers=_h(t), timeout=30)
        assert r.status_code == 403, r.text

    def test_cleanup_deletes_test_users(self):
        admin_tok = _admin_token()
        # Create a new test user with 'test_' prefix
        email = f"test_cleanup_{uuid.uuid4().hex[:8]}@ex.com"
        reg = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "Passw0rd!", "birthdate": "1995-03-15",
        }, timeout=30)
        assert reg.status_code == 200, reg.text
        # Optional onboarding
        tok = reg.json()["token"]
        try:
            acts = requests.get(f"{API}/activities", timeout=30).json()
            fav = [acts[0]["id"]] if acts else []
            requests.post(f"{API}/profile/onboarding", json={
                "alias": "TestCleanup", "gender": "no_binario", "comuna": "Providencia",
                "modes": ["amistad"], "relationship_with_substances": "sin_consumo",
                "favorite_activities": fav, "photos": [], "videos": [],
                "prompts": [{"q": "algo", "a": "algo"}], "accepted_rules": True,
            }, headers=_h(tok), timeout=30)
        except Exception:
            pass
        # Call cleanup
        r = requests.post(f"{API}/admin/cleanup-tests", headers=_h(admin_tok), timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "deleted_users" in data and "emails" in data
        assert data["deleted_users"] >= 1
        assert any(email.lower() == e.lower() for e in data["emails"]), f"created {email} not in {data['emails']}"
        # Verify user is gone: login should fail
        r2 = _login(email, "Passw0rd!")
        assert r2.status_code == 401, r2.text


# ---------- 4. friendly upload errors ----------
class TestUploadPhotoErrors:
    def test_txt_file_rejected_with_spanish_message(self):
        t = _tok("demo1@plansobrio.cl")
        files = {"file": ("hello.txt", io.BytesIO(b"not an image"), "text/plain")}
        r = requests.post(f"{API}/uploads/photo", files=files, headers=_h(t), timeout=30)
        assert r.status_code == 400, r.text
        detail = r.json().get("detail", "")
        # Mentions JPG, PNG, or WebP
        assert any(k in detail for k in ("JPG", "PNG", "WebP")), detail

    def test_oversize_photo_rejected_with_8mb_msg(self):
        t = _tok("demo1@plansobrio.cl")
        big = b"\xff\xd8\xff\xe0" + b"a" * (9 * 1024 * 1024)  # >8MB, ext=jpg
        files = {"file": ("big.jpg", io.BytesIO(big), "image/jpeg")}
        r = requests.post(f"{API}/uploads/photo", files=files, headers=_h(t), timeout=60)
        assert r.status_code == 400, r.text
        detail = r.json().get("detail", "")
        assert "8MB" in detail or "8 MB" in detail, detail


# ---------- 5. /report enum unchanged ----------
class TestReportEnumUnchanged:
    def test_report_rejects_invalid_category(self):
        t = _tok("demo1@plansobrio.cl")
        demo2 = _me(_tok("demo2@plansobrio.cl"))
        r = requests.post(f"{API}/report", json={
            "target_user_id": demo2["id"], "category": "not_a_real_category", "detail": "x",
        }, headers=_h(t), timeout=30)
        # 422 unprocessable (pydantic enum)
        assert r.status_code == 422, r.text

    def test_report_accepts_known_category(self):
        t = _tok("demo1@plansobrio.cl")
        demo3 = _me(_tok("demo3@plansobrio.cl"))
        # A category widely used in the codebase
        for cat in ("consumo_promocion", "acoso", "spam", "menor_edad", "info_falsa", "otro"):
            r = requests.post(f"{API}/report", json={
                "target_user_id": demo3["id"], "category": cat, "detail": "test",
            }, headers=_h(t), timeout=30)
            if r.status_code == 200:
                return
        pytest.fail("No known /report category was accepted")
