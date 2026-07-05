"""Iteration 3 - BLOQUE 2 security tests"""
import os
import io
import time
import uuid
import pytest
import requests

BASE = (os.environ.get("REACT_APP_BACKEND_URL") or "https://comunidad-sobria.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"
DEMO_PW = "Demo1234!"
ADMIN_EMAIL = "contacto@sinadicciones.org"
ADMIN_PW = "Jodorowsky100"


def _login(email, pw=DEMO_PW):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _h(t):
    return {"Authorization": f"Bearer {t}"}


def _me(t):
    return requests.get(f"{API}/auth/me", headers=_h(t), timeout=30).json()


def _first_activity_id():
    acts = requests.get(f"{API}/activities", timeout=30).json()
    return acts[0]["id"]


# ---------- Like validation ----------

class TestLikeValidation:
    def test_like_mode_not_enabled_amistad_on_amor_only(self):
        # demo3 -> Fer_Cafe(demo4). Fer_Cafe modes: only amor. mode=amistad => 403
        t3 = _login("demo3@plansobrio.cl")
        t4 = _login("demo4@plansobrio.cl")
        me4 = _me(t4)
        assert "amor" in (me4.get("modes") or []), me4.get("modes")
        # If Fer_Cafe also has amistad in this env, skip
        if "amistad" in (me4.get("modes") or []):
            pytest.skip("demo4 has amistad enabled in this env")
        aid = _first_activity_id()
        r = requests.post(f"{API}/like", json={
            "target_user_id": me4["id"], "mode": "amistad", "activity_id": aid, "no_plan": False
        }, headers=_h(t3), timeout=30)
        assert r.status_code == 403, r.text
        assert "modo" in r.json().get("detail", "").lower()

    def test_like_amor_target_lacks_amor(self):
        # demo1 -> demo2 with mode=amor : demo2 has apoyo+amistad only => 403
        t1 = _login("demo1@plansobrio.cl")
        t2 = _login("demo2@plansobrio.cl")
        me1 = _me(t1); me2 = _me(t2)
        if "amor" in (me2.get("modes") or []):
            pytest.skip("demo2 has amor enabled in this env")
        aid = _first_activity_id()
        r = requests.post(f"{API}/like", json={
            "target_user_id": me2["id"], "mode": "amor", "activity_id": aid, "no_plan": False
        }, headers=_h(t1), timeout=30)
        assert r.status_code == 403

    def test_like_amistad_ok_both_have_amistad(self, reset_demo_state):
        # demo1 -> demo2 mode=amistad => 200
        t1 = _login("demo1@plansobrio.cl")
        t2 = _login("demo2@plansobrio.cl")
        me2 = _me(t2)
        if "amistad" not in (me2.get("modes") or []):
            pytest.skip("demo2 lacks amistad in env")
        aid = _first_activity_id()
        r = requests.post(f"{API}/like", json={
            "target_user_id": me2["id"], "mode": "amistad", "activity_id": aid, "no_plan": False
        }, headers=_h(t1), timeout=30)
        assert r.status_code == 200, r.text

    def test_like_amor_incompatible_target_no_amor(self):
        # demo3 -> Beno_Deporte(demo9). demo9 no amor => 403
        t3 = _login("demo3@plansobrio.cl")
        t9 = _login("demo9@plansobrio.cl")
        me9 = _me(t9)
        if "amor" in (me9.get("modes") or []):
            pytest.skip("demo9 has amor in env")
        aid = _first_activity_id()
        r = requests.post(f"{API}/like", json={
            "target_user_id": me9["id"], "mode": "amor", "activity_id": aid, "no_plan": False
        }, headers=_h(t3), timeout=30)
        assert r.status_code == 403


# ---------- Blocks ----------

class TestBlockBehaviour:
    def test_pass_blocked_returns_403(self):
        # demo1 blocks demo2 then tries /api/pass on demo2 -> 403
        # Use temporary users to not corrupt seeded data. Instead, register 2 fresh users, complete onboarding for both, then block/pass.
        u1e = f"TEST_blk_a_{uuid.uuid4().hex[:8]}@ex.com"
        u2e = f"TEST_blk_b_{uuid.uuid4().hex[:8]}@ex.com"
        for e in (u1e, u2e):
            r = requests.post(f"{API}/auth/register", json={"email": e, "password": "abcdef", "birthdate": "1990-01-01"}, timeout=30)
            assert r.status_code == 200, r.text
        t1 = _login(u1e, "abcdef")
        t2 = _login(u2e, "abcdef")
        acts = requests.get(f"{API}/activities", timeout=30).json()
        favs = [a["id"] for a in acts[:3]]
        for t, alias in ((t1, "BlkA"), (t2, "BlkB")):
            payload = {
                "alias": alias, "gender": "no_binario", "comuna": "Ñuñoa",
                "modes": ["amistad"], "interested_genders": [],
                "age_min": 18, "age_max": 99,
                "relationship_with_substances": "sin_consumo",
                "favorite_activities": favs, "photos": [], "videos": [],
                "prompts": [{"q": "a", "a": "b"}], "accepted_rules": True,
            }
            r = requests.post(f"{API}/profile/onboarding", json=payload, headers=_h(t), timeout=30)
            assert r.status_code == 200, r.text
        me2 = _me(t2)
        # demo1 blocks demo2
        b = requests.post(f"{API}/block", json={"target_user_id": me2["id"]}, headers=_h(t1), timeout=30)
        assert b.status_code == 200
        # Now pass -> 403
        r = requests.post(f"{API}/pass", json={"target_user_id": me2["id"], "mode": "amistad"}, headers=_h(t1), timeout=30)
        assert r.status_code == 403
        # From the other side too
        me1 = _me(t1)
        r2 = requests.post(f"{API}/pass", json={"target_user_id": me1["id"], "mode": "amistad"}, headers=_h(t2), timeout=30)
        assert r2.status_code == 403
        return u1e, u2e, t1, t2, me1, me2

    def test_message_after_block_forbidden(self):
        # Fresh pair: create match then block; message must 403 or 404
        # Register two users, onboard, mutual like, then block, then message
        u1e = f"TEST_msgblk_a_{uuid.uuid4().hex[:8]}@ex.com"
        u2e = f"TEST_msgblk_b_{uuid.uuid4().hex[:8]}@ex.com"
        for e in (u1e, u2e):
            requests.post(f"{API}/auth/register", json={"email": e, "password": "abcdef", "birthdate": "1990-01-01"}, timeout=30)
        t1 = _login(u1e, "abcdef")
        t2 = _login(u2e, "abcdef")
        acts = requests.get(f"{API}/activities", timeout=30).json()
        favs = [a["id"] for a in acts[:3]]
        for t, alias in ((t1, "MbA"), (t2, "MbB")):
            payload = {
                "alias": alias, "gender": "no_binario", "comuna": "Ñuñoa",
                "modes": ["amistad"], "interested_genders": [],
                "age_min": 18, "age_max": 99,
                "relationship_with_substances": "sin_consumo",
                "favorite_activities": favs, "photos": [], "videos": [],
                "prompts": [{"q": "a", "a": "b"}], "accepted_rules": True,
            }
            requests.post(f"{API}/profile/onboarding", json=payload, headers=_h(t), timeout=30)
        me1 = _me(t1); me2 = _me(t2)
        aid = acts[0]["id"]
        requests.post(f"{API}/like", json={"target_user_id": me2["id"], "mode": "amistad", "activity_id": aid, "no_plan": False}, headers=_h(t1), timeout=30)
        r = requests.post(f"{API}/like", json={"target_user_id": me1["id"], "mode": "amistad", "activity_id": aid, "no_plan": False}, headers=_h(t2), timeout=30)
        data = r.json()
        assert data.get("match"), data
        match_id = data["match_id"]

        # Block from user1 side
        requests.post(f"{API}/block", json={"target_user_id": me2["id"]}, headers=_h(t1), timeout=30)

        # Send message: expect 403 or 404 (match deleted)
        msg = requests.post(f"{API}/matches/{match_id}/messages", json={"text": "hola"}, headers=_h(t1), timeout=30)
        assert msg.status_code in (403, 404), msg.text
        # From other side also
        msg2 = requests.post(f"{API}/matches/{match_id}/messages", json={"text": "hola"}, headers=_h(t2), timeout=30)
        assert msg2.status_code in (403, 404), msg2.text

        # Propose plan same
        p = requests.post(f"{API}/matches/{match_id}/propose-plan", json={"activity_id": aid, "when": "2030-01-01T10:00:00"}, headers=_h(t1), timeout=30)
        assert p.status_code in (403, 404), p.text


# ---------- Rate limiting on group chat ----------

class TestRateLimit:
    def test_group_chat_rate_limit_60_per_minute(self):
        t1 = _login("demo1@plansobrio.cl")
        # Find or join a group
        groups = requests.get(f"{API}/groups", headers=_h(t1), timeout=30).json()
        assert groups, "no groups seeded"
        gid = None
        for g in groups:
            if g.get("joined") or g.get("is_member"):
                gid = g["id"]; break
        if not gid:
            g = groups[0]; gid = g["id"]
            requests.post(f"{API}/groups/{gid}/join", headers=_h(t1), timeout=30)
        ok = 0
        limited = False
        for i in range(65):
            r = requests.post(f"{API}/groups/{gid}/messages", json={"text": f"t{i}-{uuid.uuid4().hex[:4]}"}, headers=_h(t1), timeout=30)
            if r.status_code == 200:
                ok += 1
            elif r.status_code == 429:
                limited = True
                break
            else:
                pytest.fail(f"unexpected {r.status_code}: {r.text}")
        assert limited, f"no rate limit triggered after {ok} messages"
        assert ok >= 55, f"expected ~60 to pass, got {ok}"
        # Cleanup noise so downstream tests (iter11 no-noise) stay green
        try:
            import os as _os
            from pymongo import MongoClient as _MC
            _cli = _MC(_os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
            _db = _cli[_os.environ.get("DB_NAME", "test_database")]
            _db.group_messages.delete_many({"text": {"$regex": r"^t\d+-[0-9a-f]"}})
        except Exception:
            pass


# ---------- CORS ----------

class TestCORS:
    """Test backend CORS directly on localhost:8001 (edge proxy at preview URL
    injects Access-Control-Allow-Origin: * regardless of app config, so this
    tests the app-level middleware which is what BLOQUE 2 changed)."""

    LOCAL = "http://localhost:8001"

    def test_options_allowed_origin(self):
        h = {
            "Origin": "https://comunidad-sobria.preview.emergentagent.com",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        }
        r = requests.options(f"{self.LOCAL}/api/auth/login", headers=h, timeout=30)
        assert r.status_code == 200
        assert r.headers.get("access-control-allow-origin") == "https://comunidad-sobria.preview.emergentagent.com"

    def test_options_disallowed_origin(self):
        h = {
            "Origin": "https://evil.com",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        }
        r = requests.options(f"{self.LOCAL}/api/auth/login", headers=h, timeout=30)
        # FastAPI CORSMiddleware returns 400 for disallowed origin
        assert r.status_code == 400 or r.headers.get("access-control-allow-origin") not in ("https://evil.com", "*")


# ---------- File download auth ----------

class TestFileAuth:
    @pytest.fixture(scope="class")
    def uploaded(self):
        t = _login("demo1@plansobrio.cl")
        files = {"file": ("t.png", io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 32), "image/png")}
        r = requests.post(f"{API}/uploads/photo", files=files, headers=_h(t), timeout=30)
        assert r.status_code == 200, r.text
        return t, r.json()["path"]

    def test_file_no_auth_returns_401(self, uploaded):
        _, path = uploaded
        r = requests.get(f"{API}/files/{path}", timeout=30)
        assert r.status_code == 401

    def test_file_with_bearer_ok(self, uploaded):
        t, path = uploaded
        r = requests.get(f"{API}/files/{path}", headers=_h(t), timeout=30)
        assert r.status_code == 200
        assert r.headers.get("Content-Type", "").startswith("image/")

    def test_file_with_query_auth_ok(self, uploaded):
        t, path = uploaded
        r = requests.get(f"{API}/files/{path}?auth={t}", timeout=30)
        assert r.status_code == 200
        assert r.headers.get("Content-Type", "").startswith("image/")

    def test_file_invalid_token_401(self, uploaded):
        _, path = uploaded
        r = requests.get(f"{API}/files/{path}?auth=not-a-token", timeout=30)
        assert r.status_code == 401


# ---------- Reports ----------

class TestReports:
    def test_report_invalid_category_422(self):
        t1 = _login("demo1@plansobrio.cl")
        t2 = _login("demo2@plansobrio.cl")
        me2 = _me(t2)
        r = requests.post(f"{API}/report", json={"target_user_id": me2["id"], "category": "spam"}, headers=_h(t1), timeout=30)
        assert r.status_code == 422, r.text

    def test_report_ofrece_sustancias_high_priority(self):
        t1 = _login("demo1@plansobrio.cl")
        t2 = _login("demo2@plansobrio.cl")
        me2 = _me(t2)
        r = requests.post(f"{API}/report", json={"target_user_id": me2["id"], "category": "ofrece_sustancias", "details": "TEST"}, headers=_h(t1), timeout=30)
        assert r.status_code == 200
        # Verify via admin list
        ta = _login(ADMIN_EMAIL, ADMIN_PW)
        rep = requests.get(f"{API}/admin/reports", headers=_h(ta), timeout=30)
        assert rep.status_code == 200
        reports = rep.json()
        high_open = [x for x in reports if x.get("category") == "ofrece_sustancias" and x.get("status") == "open"]
        assert high_open and all(x.get("priority") == "high" for x in high_open)

    def test_report_other_category_normal_priority(self):
        t1 = _login("demo1@plansobrio.cl")
        t3 = _login("demo3@plansobrio.cl")
        me3 = _me(t3)
        r = requests.post(f"{API}/report", json={"target_user_id": me3["id"], "category": "otro", "details": "TEST"}, headers=_h(t1), timeout=30)
        assert r.status_code == 200
        ta = _login(ADMIN_EMAIL, ADMIN_PW)
        reports = requests.get(f"{API}/admin/reports", headers=_h(ta), timeout=30).json()
        others = [x for x in reports if x.get("category") == "otro"]
        assert others and all(x.get("priority") == "normal" for x in others)

    def test_admin_reports_sorted_high_first(self):
        ta = _login(ADMIN_EMAIL, ADMIN_PW)
        reports = requests.get(f"{API}/admin/reports", headers=_h(ta), timeout=30).json()
        assert reports
        # Find first non-open-high position
        seen_lower = False
        for r in reports:
            is_top = (r.get("priority") == "high" and r.get("status") == "open")
            if not is_top:
                seen_lower = True
            elif seen_lower:
                pytest.fail("high+open appears after lower priority report")
