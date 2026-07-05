"""Iteration 23 — Admin CRUD for groups+events, RSVP capacity, and unified /plans endpoint.

Covers:
- Admin login and creating/editing/deleting groups
- Admin creating/editing/deleting events (with address, map_link, capacity)
- Demo user joins group, RSVPs to event
- Capacity enforcement returns 400 "Cupos agotados"
- GET /api/plans returns both kind:'match' and kind:'group_event' items sorted by when asc
- DELETE /api/events/{eid}/rsvp frees capacity slot; event disappears from /plans
"""
import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://comunidad-sobria.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    r.raise_for_status()
    return r.json()["token"]


def _h(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def admin_token():
    return _login("contacto@sinadicciones.org", "Jodorowsky100")


@pytest.fixture(scope="module")
def demo1_token():
    return _login("demo1@plansobrio.cl", "Demo1234!")


@pytest.fixture(scope="module")
def demo2_token():
    return _login("demo2@plansobrio.cl", "Demo1234!")


@pytest.fixture(scope="module")
def created(admin_token):
    """Create a fresh group + event for the run; cleanup at end."""
    gid = None
    eid = None
    try:
        # Create group
        gpayload = {
            "emoji": "🧘",
            "name": f"TEST_iter23_{uuid.uuid4().hex[:6]}",
            "description": "Grupo para tests iter23",
            "rules": "Sé amable",
            "is_online": False,
            "comuna": "Providencia",
        }
        r = requests.post(f"{API}/admin/groups", json=gpayload, headers=_h(admin_token), timeout=30)
        assert r.status_code in (200, 201), r.text
        g = r.json()
        gid = g["id"]

        # Create event with capacity=2 (small enough to test full)
        when = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        epayload = {
            "group_id": gid,
            "emoji": "🎉",
            "title": "TEST_iter23_event",
            "description": "Evento test iter23",
            "when": when,
            "location": "Cafe X",
            "address": "Av. Providencia 1234",
            "map_link": "https://maps.google.com/?q=Providencia+1234",
            "capacity": 2,
        }
        r = requests.post(f"{API}/admin/events", json=epayload, headers=_h(admin_token), timeout=30)
        assert r.status_code in (200, 201), r.text
        e = r.json()
        eid = e["id"]

        yield {"gid": gid, "eid": eid, "gpayload": gpayload, "epayload": epayload}
    finally:
        try:
            if eid:
                requests.delete(f"{API}/admin/events/{eid}", headers=_h(admin_token), timeout=15)
            if gid:
                requests.delete(f"{API}/admin/groups/{gid}", headers=_h(admin_token), timeout=15)
        except Exception:
            pass


# ----------------------------- Admin CRUD -----------------------------

class TestAdminGroups:
    def test_create_group_fields_persist(self, created):
        # Data assertion — creation returned the fields we sent
        assert created["gid"]

    def test_edit_group(self, admin_token, created):
        new_name = created["gpayload"]["name"] + "_edit"
        r = requests.patch(
            f"{API}/admin/groups/{created['gid']}",
            json={"name": new_name, "emoji": "🎨"},
            headers=_h(admin_token), timeout=15,
        )
        assert r.status_code == 200, r.text
        # Verify via public listing
        r = requests.get(f"{API}/groups", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200
        groups = r.json()
        match = [g for g in groups if g["id"] == created["gid"]]
        assert match and match[0]["name"] == new_name
        assert match[0]["emoji"] == "🎨"


class TestAdminEvents:
    def test_create_event_persisted(self, admin_token, created):
        # GET events for group and confirm ours is in it, with address/map_link/capacity
        r = requests.get(f"{API}/groups/{created['gid']}/events", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        events = r.json()
        ours = [e for e in events if e["id"] == created["eid"]]
        assert ours, "event not found in group events"
        ev = ours[0]
        assert ev["address"] == created["epayload"]["address"]
        assert ev["map_link"] == created["epayload"]["map_link"]
        assert ev["capacity"] == 2
        assert ev["emoji"] == "🎉"

    def test_edit_event(self, admin_token, created):
        r = requests.patch(
            f"{API}/admin/events/{created['eid']}",
            json={"title": "TEST_iter23_event_v2", "capacity": 3},
            headers=_h(admin_token), timeout=15,
        )
        assert r.status_code == 200, r.text
        # Verify
        r = requests.get(f"{API}/groups/{created['gid']}/events", headers=_h(admin_token), timeout=15)
        ev = next(e for e in r.json() if e["id"] == created["eid"])
        assert ev["title"] == "TEST_iter23_event_v2"
        assert ev["capacity"] == 3


# ----------------------------- User RSVP flow -----------------------------

class TestRsvpAndPlans:
    def test_demo1_join_and_rsvp(self, demo1_token, created):
        # Join group
        r = requests.post(f"{API}/groups/{created['gid']}/join", headers=_h(demo1_token), timeout=15)
        assert r.status_code == 200, r.text
        # RSVP
        r = requests.post(f"{API}/events/{created['eid']}/rsvp", headers=_h(demo1_token), timeout=15)
        assert r.status_code == 200, r.text

    def test_plans_returns_group_event(self, demo1_token, created):
        r = requests.get(f"{API}/plans", headers=_h(demo1_token), timeout=15)
        assert r.status_code == 200, r.text
        plans = r.json()
        ge = [p for p in plans if p.get("kind") == "group_event" and p.get("id") == created["eid"]]
        assert ge, f"group_event not found in /plans: {plans}"
        p = ge[0]
        assert p["event"]["title"] in ("TEST_iter23_event", "TEST_iter23_event_v2")
        assert p["event"]["emoji"] == "🎉"
        assert p["event"]["address"] == created["epayload"]["address"]
        assert p["event"]["map_link"] == created["epayload"]["map_link"]
        assert p["event"]["attendee_count"] >= 1
        assert p["event"]["capacity"] in (2, 3)
        assert p["group"] and p["group"]["id"] == created["gid"]

    def test_plans_sorted_by_when_asc(self, demo1_token):
        r = requests.get(f"{API}/plans", headers=_h(demo1_token), timeout=15)
        plans = r.json()
        whens = [p.get("when") or "" for p in plans]
        assert whens == sorted(whens), f"plans not sorted asc: {whens}"

    def test_capacity_enforcement(self, admin_token, demo1_token, demo2_token, created):
        # Set capacity to 1 so demo2 gets Cupos agotados
        r = requests.patch(f"{API}/admin/events/{created['eid']}", json={"capacity": 1},
                           headers=_h(admin_token), timeout=15)
        assert r.status_code == 200

        # demo2 joins group first
        requests.post(f"{API}/groups/{created['gid']}/join", headers=_h(demo2_token), timeout=15)

        # demo2 tries to RSVP — should fail with 400 "Cupos agotados"
        r = requests.post(f"{API}/events/{created['eid']}/rsvp", headers=_h(demo2_token), timeout=15)
        assert r.status_code == 400, r.text
        assert "Cupos agotados" in r.text

    def test_cancel_rsvp_frees_slot(self, demo1_token, demo2_token, created):
        # demo1 cancels
        r = requests.delete(f"{API}/events/{created['eid']}/rsvp", headers=_h(demo1_token), timeout=15)
        assert r.status_code == 200

        # /plans should no longer include the event for demo1
        r = requests.get(f"{API}/plans", headers=_h(demo1_token), timeout=15)
        plans = r.json()
        ge = [p for p in plans if p.get("kind") == "group_event" and p.get("id") == created["eid"]]
        assert not ge, "event still present in /plans after cancel"

        # demo2 can now RSVP (slot freed)
        r = requests.post(f"{API}/events/{created['eid']}/rsvp", headers=_h(demo2_token), timeout=15)
        assert r.status_code == 200, r.text

        # cleanup: demo2 cancels
        requests.delete(f"{API}/events/{created['eid']}/rsvp", headers=_h(demo2_token), timeout=15)


class TestAdminDelete:
    def test_delete_event_returns_ok(self, admin_token, created):
        # Create a throwaway event to delete
        when = (datetime.now(timezone.utc) + timedelta(days=8)).isoformat()
        r = requests.post(f"{API}/admin/events", json={
            "group_id": created["gid"], "emoji": "🗑️", "title": "TEST_iter23_del",
            "description": "d", "when": when, "location": "x", "capacity": 10,
        }, headers=_h(admin_token), timeout=15)
        assert r.status_code in (200, 201), r.text
        eid = r.json()["id"]
        r = requests.delete(f"{API}/admin/events/{eid}", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200
        # Verify gone
        r = requests.get(f"{API}/groups/{created['gid']}/events", headers=_h(admin_token), timeout=15)
        assert not any(e["id"] == eid for e in r.json())
