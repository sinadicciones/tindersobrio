"""Iteration 28 — Bloque 2: online meetings + community groups + moderators.

Coverage:
- 22 country-groups seeded (`Comunidad {país}`, group_type='pais', is_online=true).
- comunidad-cl detail (group_type, country, is_moderator, pinned_message hydration).
- Recurring meetings seeded to comunidad-cl (weekday, tz, meeting_url).
- meeting-status gating (not_rsvpd → too_early → ok) + join-meeting 403/200 + attendance.
- Admin add/remove moderator + moderator create/patch/delete event.
- pin/unpin/hide message flows (moderator/non-moderator).
- Onboarding auto-join to comunidad-{country}: verify endpoint side.
"""
import os
import time
import requests
import pytest
from datetime import datetime, timezone, timedelta

BASE = os.environ.get("BACKEND_URL", "http://localhost:8001")
API = f"{BASE}/api"

ADMIN = {"email": "contacto@sinadicciones.org", "password": "Jodorowsky100"}
DEMO1 = {"email": "demo1@plansobrio.cl", "password": "Demo1234!"}
DEMO2 = {"email": "demo2@plansobrio.cl", "password": "Demo1234!"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=30)
    r.raise_for_status()
    return r.json()["token"]


def _h(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN)


@pytest.fixture(scope="module")
def demo1_token():
    return _login(DEMO1)


@pytest.fixture(scope="module")
def demo2_token():
    return _login(DEMO2)


@pytest.fixture(scope="module")
def demo1_id(demo1_token):
    r = requests.get(f"{API}/auth/me", headers=_h(demo1_token), timeout=30)
    r.raise_for_status()
    return r.json()["id"]


@pytest.fixture(scope="module")
def demo2_id(demo2_token):
    r = requests.get(f"{API}/auth/me", headers=_h(demo2_token), timeout=30)
    r.raise_for_status()
    return r.json()["id"]


@pytest.fixture(scope="module")
def mongo_db():
    try:
        from pymongo import MongoClient
        cli = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
        return cli[os.environ.get("DB_NAME", "test_database")]
    except Exception as e:
        pytest.skip(f"Mongo unreachable: {e}")


# ---------------------- Groups: country seed ---------------------
class TestCountryGroups:
    def test_22_country_groups_present(self, demo1_token):
        r = requests.get(f"{API}/groups", headers=_h(demo1_token), timeout=30)
        assert r.status_code == 200, r.text
        groups = r.json()
        pais = [g for g in groups if g.get("group_type") == "pais"]
        assert len(pais) >= 22, f"Expected >=22 pais groups, got {len(pais)}"
        # Check each has the expected fields
        for g in pais:
            assert g.get("is_online") is True, f"{g['id']} is_online should be True"
            assert isinstance(g.get("country"), str) and len(g["country"]) == 2, g["id"]
            assert g["id"] == f"comunidad-{g['country'].lower()}"
            assert g["name"].startswith("Comunidad ")
        # Also there must be at least one non-pais group (legacy)
        # (allow zero if fresh env)

    def test_comunidad_cl_detail(self, demo2_token):
        # Use demo2 who is never a moderator in these tests → clean is_moderator=False
        r = requests.get(f"{API}/groups/comunidad-cl", headers=_h(demo2_token), timeout=30)
        assert r.status_code == 200
        g = r.json()
        assert g["group_type"] == "pais"
        assert g["country"] == "CL"
        assert g.get("is_moderator") is False
        # pinned_message must NOT be present when no pin
        # (unless previously pinned; clear precondition)
        assert "pinned_message" not in g or g.get("pinned_message") is None


# ---------------------- Recurring meetings seed ---------------------
class TestRecurringMeetings:
    def test_comunidad_cl_events(self, demo1_token):
        r = requests.get(f"{API}/groups/comunidad-cl/events", headers=_h(demo1_token), timeout=30)
        assert r.status_code == 200
        events = r.json()
        martes = next((e for e in events if e["id"] == "meeting-circulo-martes"), None)
        assert martes is not None, f"meeting-circulo-martes missing. events={[e['id'] for e in events]}"
        assert martes["is_online"] is True
        assert "meet.jit.si" in martes["meeting_url"]
        assert martes["recurrence"] == "Cada martes 20:00 (hora Chile)"
        assert martes["recurrence_weekday"] == 1
        assert martes["recurrence_time"] == "20:00"
        assert martes["tz"] == "America/Santiago"
        sabado = next((e for e in events if e["id"] == "meeting-conversacion-sabado"), None)
        assert sabado is not None
        assert sabado["recurrence_weekday"] == 5


# ---------------------- Meeting gate: too_early → ok ---------------------
class TestMeetingGate:
    def test_meeting_status_not_rsvpd(self, demo2_token):
        r = requests.get(f"{API}/events/meeting-circulo-martes/meeting-status",
                         headers=_h(demo2_token), timeout=30)
        # demo2 might have rsvpd from prior tests — clean state via unrsvp then re-check
        requests.delete(f"{API}/events/meeting-circulo-martes/rsvp", headers=_h(demo2_token), timeout=30)
        r = requests.get(f"{API}/events/meeting-circulo-martes/meeting-status",
                         headers=_h(demo2_token), timeout=30)
        assert r.status_code == 200
        s = r.json()
        assert s["can_join"] is False
        assert s["reason"] == "not_rsvpd"

    def test_join_flow_too_early_then_ok(self, demo1_token, demo1_id, mongo_db):
        # Ensure joined the group and rsvp'd
        requests.post(f"{API}/groups/comunidad-cl/join", headers=_h(demo1_token), timeout=30)
        rr = requests.post(f"{API}/events/meeting-circulo-martes/rsvp",
                           headers=_h(demo1_token), timeout=30)
        assert rr.status_code == 200
        # Force `when` to far future first
        far_future = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
        mongo_db.events.update_one({"id": "meeting-circulo-martes"}, {"$set": {"when": far_future}})
        s = requests.get(f"{API}/events/meeting-circulo-martes/meeting-status",
                         headers=_h(demo1_token), timeout=30).json()
        assert s["can_join"] is False
        assert s["reason"] == "too_early"
        assert s["minutes_until_open"] > 0
        assert s["window_minutes"] == 15
        # POST join-meeting should 403
        jr = requests.post(f"{API}/events/meeting-circulo-martes/join-meeting",
                           headers=_h(demo1_token), timeout=30)
        assert jr.status_code == 403
        assert "15 minutos" in jr.json().get("detail", "")

        # Force `when` to now+5min → can_join=true
        soon = (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
        mongo_db.events.update_one({"id": "meeting-circulo-martes"}, {"$set": {"when": soon}})
        s2 = requests.get(f"{API}/events/meeting-circulo-martes/meeting-status",
                          headers=_h(demo1_token), timeout=30).json()
        assert s2["can_join"] is True
        assert s2["reason"] == "ok"
        # POST join-meeting → 200 with meeting_url
        # Clear any previous attendance to test insertion side
        mongo_db.event_attendance.delete_many({"event_id": "meeting-circulo-martes", "user_id": demo1_id})
        jr2 = requests.post(f"{API}/events/meeting-circulo-martes/join-meeting",
                            headers=_h(demo1_token), timeout=30)
        assert jr2.status_code == 200
        assert jr2.json()["meeting_url"] == "https://meet.jit.si/plansobrio-circulo"
        # Attendance recorded
        att = list(mongo_db.event_attendance.find({"event_id": "meeting-circulo-martes", "user_id": demo1_id}))
        assert len(att) == 1


# ---------------------- Moderator role admin API + actions ---------------------
class TestModerators:
    def test_admin_add_and_remove_moderator(self, admin_token, demo1_token, demo1_id, mongo_db):
        # Ensure clean state
        mongo_db.groups.update_one({"id": "comunidad-cl"}, {"$pull": {"moderators": demo1_id}})
        # Add
        r = requests.post(f"{API}/admin/groups/comunidad-cl/moderators",
                          headers=_h(admin_token), json={"user_id": demo1_id}, timeout=30)
        assert r.status_code == 200, r.text
        # Idempotent (call again)
        requests.post(f"{API}/admin/groups/comunidad-cl/moderators",
                      headers=_h(admin_token), json={"user_id": demo1_id}, timeout=30)
        g = mongo_db.groups.find_one({"id": "comunidad-cl"})
        assert g["moderators"].count(demo1_id) == 1
        # demo1 now sees is_moderator=true
        gr = requests.get(f"{API}/groups/comunidad-cl", headers=_h(demo1_token), timeout=30).json()
        assert gr["is_moderator"] is True

    def test_moderator_create_patch_delete_event(self, admin_token, demo1_token, demo1_id, demo2_token, mongo_db):
        # demo1 is already moderator via previous test — belt-and-suspenders
        requests.post(f"{API}/admin/groups/comunidad-cl/moderators",
                      headers=_h(admin_token), json={"user_id": demo1_id}, timeout=30)
        payload = {
            "group_id": "comunidad-cl",
            "emoji": "🧪",
            "title": "TEST_evento_mod",
            "description": "test",
            "when": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            "location": "Online",
            "capacity": 20,
            "is_online": True,
            "meeting_url": "https://meet.jit.si/plansobrio-test",
            "recurrence": "Una vez",
        }
        # Non-moderator (demo2) should 403
        r_forbidden = requests.post(f"{API}/groups/comunidad-cl/events",
                                     headers=_h(demo2_token), json=payload, timeout=30)
        assert r_forbidden.status_code == 403
        assert "moderador" in r_forbidden.json()["detail"].lower()
        # demo1 moderator creates
        r = requests.post(f"{API}/groups/comunidad-cl/events",
                          headers=_h(demo1_token), json=payload, timeout=30)
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["title"] == "TEST_evento_mod"
        eid = doc["id"]
        # PATCH
        pr = requests.patch(f"{API}/groups/comunidad-cl/events/{eid}",
                            headers=_h(demo1_token), json={"title": "TEST_evento_mod_v2"}, timeout=30)
        assert pr.status_code == 200
        # Verify via GET
        events = requests.get(f"{API}/groups/comunidad-cl/events",
                              headers=_h(demo1_token), timeout=30).json()
        e = next(x for x in events if x["id"] == eid)
        assert e["title"] == "TEST_evento_mod_v2"
        # RSVP one user so we can verify rsvps are deleted
        requests.post(f"{API}/events/{eid}/rsvp", headers=_h(demo1_token), timeout=30)
        assert mongo_db.event_rsvps.count_documents({"event_id": eid}) >= 1
        # DELETE
        dr = requests.delete(f"{API}/groups/comunidad-cl/events/{eid}",
                             headers=_h(demo1_token), timeout=30)
        assert dr.status_code == 200
        assert mongo_db.events.count_documents({"id": eid}) == 0
        assert mongo_db.event_rsvps.count_documents({"event_id": eid}) == 0

    def test_pin_unpin_hide_message(self, admin_token, demo1_token, demo1_id, demo2_token, mongo_db):
        # Ensure demo1 mod, demo2 member
        requests.post(f"{API}/admin/groups/comunidad-cl/moderators",
                      headers=_h(admin_token), json={"user_id": demo1_id}, timeout=30)
        requests.post(f"{API}/groups/comunidad-cl/join", headers=_h(demo2_token), timeout=30)
        # Send 2 messages as demo2
        m1 = requests.post(f"{API}/groups/comunidad-cl/messages", headers=_h(demo2_token),
                           json={"text": "TEST pinme"}, timeout=30).json()
        time.sleep(0.5)
        m2 = requests.post(f"{API}/groups/comunidad-cl/messages", headers=_h(demo2_token),
                           json={"text": "TEST hideme"}, timeout=30).json()
        mid_pin, mid_hide = m1["id"], m2["id"]
        # Pin
        pr = requests.post(f"{API}/groups/comunidad-cl/pin/{mid_pin}",
                           headers=_h(demo1_token), timeout=30)
        assert pr.status_code == 200
        g = requests.get(f"{API}/groups/comunidad-cl", headers=_h(demo1_token), timeout=30).json()
        assert g.get("pinned_message"), "pinned_message should be hydrated"
        assert g["pinned_message"]["text"] == "TEST pinme"
        assert g["pinned_message"].get("alias")
        # Unpin
        up = requests.post(f"{API}/groups/comunidad-cl/unpin",
                           headers=_h(demo1_token), timeout=30)
        assert up.status_code == 200
        g2 = requests.get(f"{API}/groups/comunidad-cl", headers=_h(demo1_token), timeout=30).json()
        assert not g2.get("pinned_message")
        # Hide
        hr = requests.post(f"{API}/groups/comunidad-cl/hide/{mid_hide}",
                           headers=_h(demo1_token), timeout=30)
        assert hr.status_code == 200
        msgs = requests.get(f"{API}/groups/comunidad-cl/messages",
                            headers=_h(demo1_token), timeout=30).json()
        assert not any(m["id"] == mid_hide for m in msgs), "hidden msg leaked"
        assert any(m["id"] == mid_pin for m in msgs), "non-hidden msg missing"
        # Non-moderator cannot pin/hide
        forb = requests.post(f"{API}/groups/comunidad-cl/pin/{mid_pin}",
                             headers=_h(demo2_token), timeout=30)
        assert forb.status_code == 403

    def test_admin_remove_moderator(self, admin_token, demo1_token, demo1_id, mongo_db):
        r = requests.delete(f"{API}/admin/groups/comunidad-cl/moderators/{demo1_id}",
                            headers=_h(admin_token), timeout=30)
        assert r.status_code == 200
        gr = requests.get(f"{API}/groups/comunidad-cl", headers=_h(demo1_token), timeout=30).json()
        assert gr["is_moderator"] is False


# ---------------------- Onboarding auto-join (verified indirectly) ---------------------
class TestOnboardingAutojoin:
    """The auto-join call happens client-side after /profile/onboarding.
    We verify: (1) comunidad-mx exists, (2) POST /groups/comunidad-mx/join makes is_member=true.
    """
    def test_join_comunidad_mx(self, demo2_token):
        # Ensure clean state
        requests.post(f"{API}/groups/comunidad-mx/leave", headers=_h(demo2_token), timeout=30)
        # Join (same call frontend does)
        r = requests.post(f"{API}/groups/comunidad-mx/join", headers=_h(demo2_token), timeout=30)
        assert r.status_code == 200
        g = requests.get(f"{API}/groups/comunidad-mx", headers=_h(demo2_token), timeout=30).json()
        assert g["is_member"] is True
        assert g["group_type"] == "pais"
        assert g["country"] == "MX"
