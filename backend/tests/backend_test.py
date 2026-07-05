"""PlanSobrio backend API tests"""
import os
import io
import time
import uuid
import pytest
import requests
from datetime import datetime, timezone

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://comunidad-sobria.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

ADMIN_EMAIL = "contacto@sinadicciones.org"
ADMIN_PW = "Jodorowsky100"
DEMO_PW = "Demo1234!"


def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=30)
    assert r.status_code == 200, f"login {email} -> {r.status_code} {r.text}"
    return r.json()["token"]


def _h(t):
    return {"Authorization": f"Bearer {t}"}


# --- Auth ---
class TestAuth:
    def test_admin_login_and_me(self):
        t = _login(ADMIN_EMAIL, ADMIN_PW)
        r = requests.get(f"{API}/auth/me", headers=_h(t), timeout=30)
        assert r.status_code == 200
        me = r.json()
        assert me["role"] == "admin"
        assert me["email"] == ADMIN_EMAIL

    def test_register_underage_fails(self):
        r = requests.post(f"{API}/auth/register", json={
            "email": f"TEST_kid_{uuid.uuid4().hex[:8]}@ex.com",
            "password": "abcdef",
            "birthdate": "2015-01-01",
        }, timeout=30)
        assert r.status_code == 400

    def test_register_adult_and_onboarding_amor_requires_photo(self):
        email = f"TEST_adult_{uuid.uuid4().hex[:8]}@ex.com"
        r = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "abcdef", "birthdate": "1995-05-05"
        }, timeout=30)
        assert r.status_code == 200, r.text
        token = r.json()["token"]

        acts = requests.get(f"{API}/activities", timeout=30).json()
        assert len(acts) >= 3
        fav_ids = [a["id"] for a in acts[:3]]

        payload = {
            "alias": "TestUser",
            "gender": "femenino",
            "comuna": "Providencia",
            "modes": ["amistad", "amor"],
            "interested_genders": ["masculino"],
            "age_min": 18, "age_max": 40,
            "relationship_with_substances": "sin_consumo",
            "favorite_activities": fav_ids,
            "photos": [],
            "prompts": [{"q": "Q1", "a": "A1"}, {"q": "Q2", "a": "A2"}, {"q": "Q3", "a": "A3"}],
            "accepted_rules": True,
        }
        r = requests.post(f"{API}/profile/onboarding", json=payload, headers=_h(token), timeout=30)
        assert r.status_code == 400, f"expected 400 for amor+no-photo, got {r.status_code}"

        # switch to amistad only -> should succeed
        payload["modes"] = ["amistad"]
        r = requests.post(f"{API}/profile/onboarding", json=payload, headers=_h(token), timeout=30)
        assert r.status_code == 200, r.text

        # verify persistence
        me = requests.get(f"{API}/auth/me", headers=_h(token), timeout=30).json()
        assert me["onboarding_complete"] is True
        assert me["alias"] == "TestUser"
        assert me["modes"] == ["amistad"]


# --- Content ---
class TestSeed:
    def test_activities_16(self):
        r = requests.get(f"{API}/activities", timeout=30)
        assert r.status_code == 200
        assert len(r.json()) >= 16

    def test_groups_4(self):
        t = _login("demo1@plansobrio.cl", DEMO_PW)
        r = requests.get(f"{API}/groups", headers=_h(t), timeout=30)
        assert r.status_code == 200
        groups = r.json()
        assert len(groups) >= 4
        gid = groups[0]["id"]
        # Join then get events
        j = requests.post(f"{API}/groups/{gid}/join", headers=_h(t), timeout=30)
        assert j.status_code == 200
        g = requests.get(f"{API}/groups/{gid}", headers=_h(t), timeout=30).json()
        assert g["is_member"] is True
        ev = requests.get(f"{API}/groups/{gid}/events", headers=_h(t), timeout=30)
        assert ev.status_code == 200
        assert len(ev.json()) >= 1


# --- Discover / like / match ---
class TestDiscover:
    def test_discover_amistad_excludes_self(self):
        t = _login("demo1@plansobrio.cl", DEMO_PW)
        me = requests.get(f"{API}/auth/me", headers=_h(t), timeout=30).json()
        r = requests.get(f"{API}/discover?mode=amistad", headers=_h(t), timeout=30)
        assert r.status_code == 200, r.text
        cands = r.json()
        assert len(cands) > 0
        for c in cands:
            assert c["id"] != me["id"]
            assert "amistad" in c["modes"]

    def test_amor_mode_strict_for_user_without_amor(self):
        # demo2 (Javi_Sur) has ["apoyo","amistad"] only -> amor should 400
        t = _login("demo2@plansobrio.cl", DEMO_PW)
        r = requests.get(f"{API}/discover?mode=amor", headers=_h(t), timeout=30)
        assert r.status_code == 400


class TestMatchFlow:
    def test_like_then_reciprocal_match(self):
        # demo1 (Cata_23, F, amistad+amor, interested masc+fem)
        # demo10 (Anto_Museo, F, amistad+amor, interested fem+NB)
        # both include each other's gender. Use amistad to avoid gender constraints.
        t1 = _login("demo1@plansobrio.cl", DEMO_PW)
        t10 = _login("demo10@plansobrio.cl", DEMO_PW)
        me1 = requests.get(f"{API}/auth/me", headers=_h(t1), timeout=30).json()
        me10 = requests.get(f"{API}/auth/me", headers=_h(t10), timeout=30).json()

        acts = requests.get(f"{API}/activities", timeout=30).json()
        aid = acts[0]["id"]

        # Clean any pre-existing match/likes for a clean test
        # (we don't have a direct API, so just proceed — likes are unique per (from,to))

        r = requests.post(f"{API}/like", json={
            "target_user_id": me10["id"], "mode": "amistad", "activity_id": aid, "no_plan": False
        }, headers=_h(t1), timeout=30)
        assert r.status_code == 200, r.text
        # First like: match either False (fresh) or True (already reciprocal from prior run)
        first = r.json()
        assert "match" in first

        r2 = requests.post(f"{API}/like", json={
            "target_user_id": me1["id"], "mode": "amistad", "activity_id": aid, "no_plan": False
        }, headers=_h(t10), timeout=30)
        assert r2.status_code == 200, r2.text
        data = r2.json()
        # Now must be a match
        assert data["match"] is True, data
        match_id = data["match_id"]

        # Messages: system first message
        msgs = requests.get(f"{API}/matches/{match_id}/messages", headers=_h(t1), timeout=30)
        assert msgs.status_code == 200
        m_list = msgs.json()
        assert any(m.get("kind") == "system" for m in m_list)

        # Send message
        s = requests.post(f"{API}/matches/{match_id}/messages", json={"text": "Hola!"}, headers=_h(t1), timeout=30)
        assert s.status_code == 200

        # Propose plan from t1
        prop = requests.post(f"{API}/matches/{match_id}/propose-plan",
                             json={"activity_id": aid, "when": (datetime.now(timezone.utc)).isoformat()},
                             headers=_h(t1), timeout=30)
        assert prop.status_code == 200, prop.text
        plan_id = prop.json()["id"]

        # Accept from t10
        acc = requests.post(f"{API}/plans/{plan_id}/accept", headers=_h(t10), timeout=30)
        assert acc.status_code == 200


# --- Quota ---
class TestQuota:
    def test_daily_quota_limit(self):
        # Register fresh user, onboard amistad, then like 21 times
        email = f"TEST_quota_{uuid.uuid4().hex[:8]}@ex.com"
        r = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "abcdef", "birthdate": "1990-01-01"
        }, timeout=30)
        token = r.json()["token"]

        acts = requests.get(f"{API}/activities", timeout=30).json()
        fav_ids = [a["id"] for a in acts[:3]]
        requests.post(f"{API}/profile/onboarding", json={
            "alias": "QuotaUser", "gender": "femenino", "comuna": "Providencia",
            "modes": ["amistad"], "interested_genders": [], "age_min": 18, "age_max": 99,
            "relationship_with_substances": "sin_consumo",
            "favorite_activities": fav_ids, "photos": [],
            "prompts": [{"q": "a", "a": "b"}], "accepted_rules": True,
        }, headers=_h(token), timeout=30).raise_for_status()

        # Get some target ids
        cands = requests.get(f"{API}/discover?mode=amistad", headers=_h(token), timeout=30).json()
        assert len(cands) >= 1
        # We'll like each candidate distinctly; need at least 20. If fewer, reuse different fake ids after (they'll still increment quota until 20).
        target_ids = [c["id"] for c in cands]
        # ensure we have >20 distinct targets by padding with random ids
        while len(target_ids) < 25:
            target_ids.append(str(uuid.uuid4()))

        got_429 = False
        for i, tid in enumerate(target_ids[:21]):
            r = requests.post(f"{API}/like", json={
                "target_user_id": tid, "mode": "amistad", "no_plan": True
            }, headers=_h(token), timeout=30)
            if r.status_code == 429:
                got_429 = True
                assert i >= 20  # only after 20
                break
        assert got_429, "Expected 429 after 20 likes"


# --- Reasons ---
class TestReasons:
    def test_reasons_crud(self):
        t = _login("demo1@plansobrio.cl", DEMO_PW)
        r = requests.post(f"{API}/reasons", json={"text": "TEST razón"}, headers=_h(t), timeout=30)
        assert r.status_code == 200
        rid = r.json()["id"]
        lst = requests.get(f"{API}/reasons", headers=_h(t), timeout=30).json()
        assert any(x["id"] == rid for x in lst)
        d = requests.delete(f"{API}/reasons/{rid}", headers=_h(t), timeout=30)
        assert d.status_code == 200
        lst2 = requests.get(f"{API}/reasons", headers=_h(t), timeout=30).json()
        assert not any(x["id"] == rid for x in lst2)


# --- Photo upload ---
class TestUploads:
    def test_photo_upload_and_fetch(self):
        t = _login("demo1@plansobrio.cl", DEMO_PW)
        # 1x1 PNG
        png = (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02"
               b"\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0\x00\x00\x00\x03"
               b"\x00\x01[\xdb\xd7\xa6\x00\x00\x00\x00IEND\xaeB`\x82")
        files = {"file": ("t.png", io.BytesIO(png), "image/png")}
        r = requests.post(f"{API}/uploads/photo", files=files, headers=_h(t), timeout=60)
        if r.status_code == 500:
            # retry once as per problem statement
            time.sleep(2)
            r = requests.post(f"{API}/uploads/photo", files=files, headers=_h(t), timeout=60)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "path" in body and "url" in body
        fetch = requests.get(f"{BASE}{body['url']}", timeout=30)
        assert fetch.status_code == 200
        assert fetch.headers.get("Content-Type", "").startswith("image/")


# --- Report/block ---
class TestReportBlock:
    def test_report_and_block_hides_from_discover(self):
        t1 = _login("demo3@plansobrio.cl", DEMO_PW)  # amistad+amor+grupos
        cands = requests.get(f"{API}/discover?mode=amistad", headers=_h(t1), timeout=30).json()
        assert len(cands) >= 1
        target = cands[0]["id"]
        # block
        r = requests.post(f"{API}/block", json={"target_user_id": target}, headers=_h(t1), timeout=30)
        assert r.status_code == 200
        cands2 = requests.get(f"{API}/discover?mode=amistad", headers=_h(t1), timeout=30).json()
        assert not any(c["id"] == target for c in cands2)

        # report
        r = requests.post(f"{API}/report", json={
            "target_user_id": target, "category": "spam", "details": "test"
        }, headers=_h(t1), timeout=30)
        assert r.status_code == 200


# --- Admin endpoints ---
class TestAdmin:
    def test_admin_dashboard_reports_users_actions(self):
        t = _login(ADMIN_EMAIL, ADMIN_PW)
        d = requests.get(f"{API}/admin/dashboard", headers=_h(t), timeout=30)
        assert d.status_code == 200
        dj = d.json()
        for k in ("total_users", "new_this_week", "matches", "open_reports"):
            assert k in dj

        rep = requests.get(f"{API}/admin/reports", headers=_h(t), timeout=30)
        assert rep.status_code == 200

        u = requests.get(f"{API}/admin/users", headers=_h(t), timeout=30)
        assert u.status_code == 200
        users = u.json()
        # find a demo user to ban/reactivate
        demo = next((x for x in users if x.get("email", "").startswith("demo12@")), None)
        assert demo is not None
        target_id = demo["id"]

        b = requests.post(f"{API}/admin/users/action",
                          json={"target_user_id": target_id, "action": "ban", "note": "test"},
                          headers=_h(t), timeout=30)
        assert b.status_code == 200
        # verify demo12 cannot login
        fail = requests.post(f"{API}/auth/login", json={"email": "demo12@plansobrio.cl", "password": DEMO_PW}, timeout=30)
        assert fail.status_code == 403

        r = requests.post(f"{API}/admin/users/action",
                          json={"target_user_id": target_id, "action": "reactivate"},
                          headers=_h(t), timeout=30)
        assert r.status_code == 200
        ok = requests.post(f"{API}/auth/login", json={"email": "demo12@plansobrio.cl", "password": DEMO_PW}, timeout=30)
        assert ok.status_code == 200

    def test_admin_activities_and_groups_crud(self):
        t = _login(ADMIN_EMAIL, ADMIN_PW)
        # activity
        a = requests.post(f"{API}/admin/activities",
                          json={"emoji": "🧪", "name": "TEST_Act", "category": "test"},
                          headers=_h(t), timeout=30)
        assert a.status_code == 200
        aid = a.json()["id"]
        d = requests.delete(f"{API}/admin/activities/{aid}", headers=_h(t), timeout=30)
        assert d.status_code == 200

        # group
        g = requests.post(f"{API}/admin/groups",
                          json={"emoji": "🧪", "name": "TEST_Group", "description": "d", "rules": "r", "is_online": True},
                          headers=_h(t), timeout=30)
        assert g.status_code == 200
        gid = g.json()["id"]
        d2 = requests.delete(f"{API}/admin/groups/{gid}", headers=_h(t), timeout=30)
        assert d2.status_code == 200
