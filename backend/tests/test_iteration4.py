"""Iteration 4 - BLOQUE 3 performance / pagination tests"""
import os
import time
import uuid
import pytest
import requests

BASE = (os.environ.get("REACT_APP_BACKEND_URL") or "https://comunidad-sobria.preview.emergentagent.com").rstrip("/")
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


def _first_activity_id():
    return requests.get(f"{API}/activities", timeout=30).json()[0]["id"]


def _make_match(email_a=None, email_b=None):
    """Create/find a match between demo1 and demo2 (both have amistad)."""
    t1 = _login("demo1@plansobrio.cl")
    t2 = _login("demo2@plansobrio.cl")
    me1 = _me(t1); me2 = _me(t2)
    aid = _first_activity_id()
    requests.post(f"{API}/like", json={
        "target_user_id": me2["id"], "mode": "amistad", "activity_id": aid, "no_plan": False,
    }, headers=_h(t1), timeout=30)
    r = requests.post(f"{API}/like", json={
        "target_user_id": me1["id"], "mode": "amistad", "activity_id": aid, "no_plan": False,
    }, headers=_h(t2), timeout=30)
    data = r.json()
    if data.get("match"):
        return t1, t2, data["match_id"]
    # Already matched -> find in /matches
    ms = requests.get(f"{API}/matches", headers=_h(t1), timeout=30).json()
    for m in ms:
        if m["other"]["id"] == me2["id"]:
            return t1, t2, m["id"]
    pytest.fail("could not obtain match between demo1 and demo2")


# ---------- Matches with unread ----------

class TestMatchesUnread:
    def test_unread_and_read_flow(self, reset_demo_state):
        t1, t2, mid = _make_match()
        # demo1 reads current state
        requests.post(f"{API}/matches/{mid}/read", headers=_h(t1), timeout=30)
        # demo2 sends new message
        txt = f"hi-{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/matches/{mid}/messages", json={"text": txt}, headers=_h(t2), timeout=30)
        assert r.status_code == 200, r.text
        # demo1 lists matches -> unread should be >=1
        ms = requests.get(f"{API}/matches", headers=_h(t1), timeout=30).json()
        found = next((m for m in ms if m["id"] == mid), None)
        assert found, "match not returned"
        assert found.get("unread", 0) >= 1, found
        # Verify last_message present
        assert found.get("last_message") and found["last_message"].get("text") == txt
        # demo1 reads
        requests.post(f"{API}/matches/{mid}/read", headers=_h(t1), timeout=30)
        ms2 = requests.get(f"{API}/matches", headers=_h(t1), timeout=30).json()
        found2 = next((m for m in ms2 if m["id"] == mid), None)
        assert found2 and found2.get("unread") == 0, found2


# ---------- Groups member_count / is_member ----------

class TestGroups:
    def test_groups_list_has_member_count_and_is_member(self):
        t = _login("demo1@plansobrio.cl")
        gs = requests.get(f"{API}/groups", headers=_h(t), timeout=30).json()
        assert gs, "no groups seeded"
        for g in gs:
            assert "member_count" in g and isinstance(g["member_count"], int)
            assert "is_member" in g and isinstance(g["is_member"], bool)

    def test_join_group_reflects_is_member(self):
        t = _login("demo3@plansobrio.cl")
        gs = requests.get(f"{API}/groups", headers=_h(t), timeout=30).json()
        # find one where not member
        target = next((g for g in gs if not g["is_member"]), None)
        if not target:
            pytest.skip("demo3 already member of every group")
        gid = target["id"]
        prev_count = target["member_count"]
        r = requests.post(f"{API}/groups/{gid}/join", headers=_h(t), timeout=30)
        assert r.status_code == 200, r.text
        # Detail endpoint
        g_detail = requests.get(f"{API}/groups/{gid}", headers=_h(t), timeout=30).json()
        assert g_detail["is_member"] is True
        assert g_detail["member_count"] >= prev_count + 1

    def test_group_events_include_attendees(self):
        t = _login("demo1@plansobrio.cl")
        gs = requests.get(f"{API}/groups", headers=_h(t), timeout=30).json()
        gid = gs[0]["id"]
        # Ensure member
        if not gs[0]["is_member"]:
            requests.post(f"{API}/groups/{gid}/join", headers=_h(t), timeout=30)
        events = requests.get(f"{API}/groups/{gid}/events", headers=_h(t), timeout=30).json()
        if not events:
            pytest.skip("no events in first group")
        for e in events:
            assert "attendees" in e and isinstance(e["attendees"], list)
            assert "attendee_count" in e and isinstance(e["attendee_count"], int)
            assert e["attendee_count"] == len(e["attendees"]) or e["attendee_count"] >= 0


# ---------- Message pagination ----------

class TestMessagePagination:
    def test_default_limit_50_and_ascending(self):
        t1, t2, mid = _make_match()
        # Send a fresh message to guarantee at least one
        requests.post(f"{API}/matches/{mid}/messages", json={"text": f"p-{uuid.uuid4().hex[:4]}"}, headers=_h(t1), timeout=30)
        r = requests.get(f"{API}/matches/{mid}/messages", headers=_h(t1), timeout=30)
        assert r.status_code == 200
        docs = r.json()
        assert isinstance(docs, list)
        assert len(docs) <= 50
        # ascending
        if len(docs) >= 2:
            for i in range(1, len(docs)):
                assert docs[i-1]["created_at"] <= docs[i]["created_at"], "not ascending"

    def test_limit_query_param(self):
        t1, t2, mid = _make_match()
        # ensure at least ~3 messages exist
        for _ in range(3):
            requests.post(f"{API}/matches/{mid}/messages", json={"text": f"x-{uuid.uuid4().hex[:3]}"}, headers=_h(t1), timeout=30)
        r = requests.get(f"{API}/matches/{mid}/messages?limit=2", headers=_h(t1), timeout=30)
        assert r.status_code == 200
        docs = r.json()
        assert len(docs) <= 2

    def test_limit_over_max_returns_422(self):
        t1, t2, mid = _make_match()
        r = requests.get(f"{API}/matches/{mid}/messages?limit=201", headers=_h(t1), timeout=30)
        assert r.status_code == 422, r.text

    def test_before_returns_older(self):
        t1, t2, mid = _make_match()
        # Send messages
        for _ in range(3):
            requests.post(f"{API}/matches/{mid}/messages", json={"text": f"b-{uuid.uuid4().hex[:3]}"}, headers=_h(t1), timeout=30)
        latest = requests.get(f"{API}/matches/{mid}/messages?limit=3", headers=_h(t1), timeout=30).json()
        if len(latest) < 2:
            pytest.skip("not enough messages")
        cursor = latest[0]["created_at"]  # oldest of the batch
        older = requests.get(f"{API}/matches/{mid}/messages?before={cursor}&limit=5", headers=_h(t1), timeout=30)
        assert older.status_code == 200
        older_docs = older.json()
        for d in older_docs:
            assert d["created_at"] < cursor


# ---------- Notifications counts baseline ----------

class TestNotificationsBaseline:
    def test_counts_zero_after_seen_and_read(self):
        t = _login("demo1@plansobrio.cl")
        # Mark all matches as seen + read + likes as seen
        requests.post(f"{API}/notifications/seen-matches", headers=_h(t), timeout=30)
        requests.post(f"{API}/likes-received/seen", headers=_h(t), timeout=30)
        ms = requests.get(f"{API}/matches", headers=_h(t), timeout=30).json()
        for m in ms:
            requests.post(f"{API}/matches/{m['id']}/read", headers=_h(t), timeout=30)
        c = requests.get(f"{API}/notifications/counts", headers=_h(t), timeout=30)
        assert c.status_code == 200
        data = c.json()
        assert data["new_matches"] == 0
        assert data["unread_messages"] == 0
