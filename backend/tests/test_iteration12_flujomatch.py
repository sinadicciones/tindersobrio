"""
Iteration 12 - FLUJOMATCH v2 backend tests.

Coverage:
- POST /like proposals writing + 4 system-message variants
- GET /matches proposals / plan_status / confirmed_activity / nudge_sent shape
- GET /likes-received filters + shape
- POST /likes-received/seen + /notifications/counts unseen_likes
- Nudge job idempotency (>48h + both sides messaged, plan_status=confirmed skip)
- Regression: /admin/users has no location.coords.coordinates
"""
import os
import time
import uuid
from datetime import datetime, timezone, timedelta

import pytest
import requests
from pymongo import MongoClient

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else "https://comunidad-sobria.preview.emergentagent.com"
API = f"{BASE}/api"
MONGO = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
DB = MONGO[os.environ.get("DB_NAME", "test_database")]

ADMIN = ("contacto@sinadicciones.org", "Jodorowsky100")
DEMO = lambda n: (f"demo{n}@plansobrio.cl", "Demo1234!")


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    r.raise_for_status()
    return r.json()["token"]


def _h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _uid(email):
    u = DB.users.find_one({"email": email}, {"id": 1})
    return u["id"] if u else None


def _reset_pair(a_id, b_id):
    """Fully reset likes + match + messages between two users."""
    match_ids = [m["id"] for m in DB.matches.find({"users": {"$all": [a_id, b_id]}}, {"id": 1})]
    if match_ids:
        DB.messages.delete_many({"match_id": {"$in": match_ids}})
        DB.matches.delete_many({"id": {"$in": match_ids}})
    DB.likes.delete_many({"$or": [
        {"from_user": a_id, "to_user": b_id},
        {"from_user": b_id, "to_user": a_id},
    ]})


@pytest.fixture(scope="module")
def tokens():
    t1 = _login(*DEMO(1))
    t2 = _login(*DEMO(2))
    t_admin = _login(*ADMIN)
    return {"1": t1, "2": t2, "admin": t_admin, "id1": _uid(DEMO(1)[0]), "id2": _uid(DEMO(2)[0])}


@pytest.fixture(scope="module")
def activities(tokens):
    r = requests.get(f"{API}/activities", headers=_h(tokens["1"]), timeout=10)
    r.raise_for_status()
    acts = r.json()
    assert len(acts) >= 2, "need at least 2 activities for tests"
    return acts


# ------------------------------------------------------------------
# LIKE + system message cases
# ------------------------------------------------------------------

def _mode_between(tokens):
    """Pick a mode both demo1/demo2 profiles are compatible in. Use 'amistad' which
    has no gender/age gating."""
    return "amistad"


def _do_like(token, target_id, mode, activity_id=None):
    body = {"target_user_id": target_id, "mode": mode, "kind": "like"}
    if activity_id:
        body["activity_id"] = activity_id
    else:
        body["no_plan"] = True
    r = requests.post(f"{API}/like", headers=_h(token), json=body, timeout=15)
    return r


def test_like_case_a_same_activity(tokens, activities):
    """Both propose the same activity -> 'Están de acuerdo' message."""
    _reset_pair(tokens["id1"], tokens["id2"])
    act = activities[0]
    r1 = _do_like(tokens["1"], tokens["id2"], "amistad", act["id"])
    assert r1.status_code == 200, r1.text
    assert r1.json().get("match") is False
    r2 = _do_like(tokens["2"], tokens["id1"], "amistad", act["id"])
    assert r2.status_code == 200, r2.text
    data = r2.json()
    assert data["match"] is True
    assert "proposals" in data
    # both entries resolve to the same activity
    p = data["proposals"]
    assert set(p.keys()) == {tokens["id1"], tokens["id2"]}
    assert p[tokens["id1"]]["id"] == act["id"]
    assert p[tokens["id2"]]["id"] == act["id"]
    # verify system message
    match_id = data["match_id"]
    sysmsg = DB.messages.find_one({"match_id": match_id, "kind": "system"})
    assert sysmsg is not None
    assert "acuerdo" in sysmsg["text"].lower()
    assert act["name"] in sysmsg["text"]


def test_like_case_b_different_activities(tokens, activities):
    _reset_pair(tokens["id1"], tokens["id2"])
    a1, a2 = activities[0], activities[1]
    assert _do_like(tokens["1"], tokens["id2"], "amistad", a1["id"]).status_code == 200
    r = _do_like(tokens["2"], tokens["id1"], "amistad", a2["id"])
    assert r.status_code == 200
    data = r.json()
    assert data["match"] is True
    p = data["proposals"]
    assert p[tokens["id1"]]["id"] == a1["id"]
    assert p[tokens["id2"]]["id"] == a2["id"]
    match_id = data["match_id"]
    sysmsg = DB.messages.find_one({"match_id": match_id, "kind": "system"})
    assert sysmsg is not None
    txt = sysmsg["text"].lower()
    assert "le tinca" in txt
    assert a1["name"] in sysmsg["text"] or a1["name"].lower() in txt
    assert a2["name"] in sysmsg["text"] or a2["name"].lower() in txt


def test_like_case_c_only_one_proposes(tokens, activities):
    _reset_pair(tokens["id1"], tokens["id2"])
    a1 = activities[0]
    # demo1 proposes with an activity
    assert _do_like(tokens["1"], tokens["id2"], "amistad", a1["id"]).status_code == 200
    # demo2 responds with no plan
    r = _do_like(tokens["2"], tokens["id1"], "amistad", None)
    assert r.status_code == 200
    data = r.json()
    assert data["match"] is True
    p = data["proposals"]
    # exactly one non-null
    non_null = [v for v in p.values() if v]
    assert len(non_null) == 1
    assert non_null[0]["id"] == a1["id"]
    match_id = data["match_id"]
    sysmsg = DB.messages.find_one({"match_id": match_id, "kind": "system"})
    assert sysmsg is not None
    assert "sumas" in sysmsg["text"].lower() or "le tinca" in sysmsg["text"].lower()


def test_like_case_d_no_proposal(tokens):
    _reset_pair(tokens["id1"], tokens["id2"])
    assert _do_like(tokens["1"], tokens["id2"], "amistad", None).status_code == 200
    r = _do_like(tokens["2"], tokens["id1"], "amistad", None)
    assert r.status_code == 200
    data = r.json()
    assert data["match"] is True
    p = data["proposals"]
    assert all(v is None for v in p.values())
    match_id = data["match_id"]
    sysmsg = DB.messages.find_one({"match_id": match_id, "kind": "system"})
    assert sysmsg is not None
    assert "match" in sysmsg["text"].lower()


# ------------------------------------------------------------------
# GET /matches proposals resolution
# ------------------------------------------------------------------

def test_matches_returns_proposals_resolved(tokens, activities):
    """After case_d ran, /matches should still contain a match, with proposals dict."""
    # Ensure a match exists — reset + create case-B style
    _reset_pair(tokens["id1"], tokens["id2"])
    a1, a2 = activities[0], activities[1]
    _do_like(tokens["1"], tokens["id2"], "amistad", a1["id"])
    _do_like(tokens["2"], tokens["id1"], "amistad", a2["id"])
    r = requests.get(f"{API}/matches", headers=_h(tokens["1"]), timeout=15)
    assert r.status_code == 200
    matches = r.json()
    ours = [m for m in matches if tokens["id2"] == m["other"]["id"]]
    assert ours, "match with demo2 should be present"
    m = ours[0]
    assert "proposals" in m
    assert m["proposals"][tokens["id1"]]["id"] == a1["id"]
    assert m["proposals"][tokens["id2"]]["id"] == a2["id"]
    assert "plan_status" in m
    assert "confirmed_activity" in m
    # no mongo _id leak
    assert "_id" not in m


# ------------------------------------------------------------------
# /likes-received
# ------------------------------------------------------------------

def test_likes_received_and_seen_and_counts(tokens, activities):
    """demo5 -> demo1 unseen like, demo1 sees it in /likes-received, /notifications/counts.unseen_likes>=1, mark-seen zeroes it. Use demo5 (demo3 has a block from seed)."""
    id1 = tokens["id1"]
    id3 = _uid(DEMO(5)[0])
    assert id3
    _reset_pair(id1, id3)
    # Insert a raw like directly (bypass rate limit / other stuff)
    like_doc = {
        "id": str(uuid.uuid4()),
        "from_user": id3,
        "to_user": id1,
        "mode": "amistad",
        "kind": "like",
        "activity_id": activities[0]["id"],
        "date": datetime.now(timezone.utc).date().isoformat(),
        "seen": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    DB.likes.insert_one(like_doc)

    # counts should include unseen
    r = requests.get(f"{API}/notifications/counts", headers=_h(tokens["1"]), timeout=10)
    assert r.status_code == 200
    counts = r.json()
    assert "unseen_likes" in counts
    assert counts["unseen_likes"] >= 1
    assert counts["total"] >= counts["unseen_likes"]

    # /likes-received returns it, with clean profile (no email, no coords)
    r = requests.get(f"{API}/likes-received", headers=_h(tokens["1"]), timeout=15)
    assert r.status_code == 200
    items = r.json()
    mine = [x for x in items if x["profile"]["id"] == id3]
    assert mine, "demo3's like should appear"
    it = mine[0]
    assert it["proposed_activity"]["id"] == activities[0]["id"]
    assert it["seen"] is False
    assert "email" not in it["profile"]
    assert "password_hash" not in it["profile"]
    loc = it["profile"].get("location") or {}
    assert "coords" not in loc, f"public profile leaks coords: {loc}"

    # mark-seen
    r = requests.post(f"{API}/likes-received/seen", headers=_h(tokens["1"]), timeout=10)
    assert r.status_code in (200, 204)
    r = requests.get(f"{API}/notifications/counts", headers=_h(tokens["1"]), timeout=10)
    assert r.json()["unseen_likes"] == 0

    # cleanup
    DB.likes.delete_one({"id": like_doc["id"]})


def test_likes_received_excludes_matched(tokens):
    """Already-matched users don't appear in /likes-received."""
    # demo1 and demo2 are matched from earlier tests
    r = requests.get(f"{API}/likes-received", headers=_h(tokens["1"]), timeout=15)
    assert r.status_code == 200
    for it in r.json():
        assert it["profile"]["id"] != tokens["id2"], "matched user leaked into likes-received"


def test_likes_received_excludes_passed(tokens):
    """If I pass a user (kind=pass), their like should not appear."""
    id1 = tokens["id1"]
    id4 = _uid(DEMO(4)[0])
    _reset_pair(id1, id4)
    # insert like from demo4 to demo1
    DB.likes.insert_one({
        "id": str(uuid.uuid4()), "from_user": id4, "to_user": id1,
        "mode": "amistad", "kind": "like", "activity_id": None,
        "date": datetime.now(timezone.utc).date().isoformat(),
        "seen": False, "created_at": datetime.now(timezone.utc).isoformat(),
    })
    # demo1 passes on demo4
    DB.likes.insert_one({
        "id": str(uuid.uuid4()), "from_user": id1, "to_user": id4,
        "mode": "amistad", "kind": "pass", "activity_id": None,
        "date": datetime.now(timezone.utc).date().isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    r = requests.get(f"{API}/likes-received", headers=_h(tokens["1"]), timeout=15)
    assert r.status_code == 200
    for it in r.json():
        assert it["profile"]["id"] != id4
    _reset_pair(id1, id4)


# ------------------------------------------------------------------
# Nudge job
# ------------------------------------------------------------------

def test_nudge_job_fires_once(tokens):
    """Create a match 49h old with messages from both sides; verify one nudge
    system message is appended and nudge_sent=True; second call must not add another."""
    id1, id2 = tokens["id1"], tokens["id2"]
    # ensure clean state
    _reset_pair(id1, id2)
    created_at = (datetime.now(timezone.utc) - timedelta(hours=49)).isoformat()
    match_id = str(uuid.uuid4())
    DB.matches.insert_one({
        "id": match_id, "users": [id1, id2], "mode": "amistad",
        "proposals": {id1: None, id2: None}, "proposed_activity": None,
        "created_at": created_at,
    })
    now = datetime.now(timezone.utc).isoformat()
    DB.messages.insert_one({
        "id": str(uuid.uuid4()), "match_id": match_id, "from_user": id1,
        "text": "hola", "kind": "text", "created_at": now,
    })
    DB.messages.insert_one({
        "id": str(uuid.uuid4()), "match_id": match_id, "from_user": id2,
        "text": "hey", "kind": "text", "created_at": now,
    })
    # First /matches call -> nudge should fire
    r = requests.get(f"{API}/matches", headers=_h(tokens["1"]), timeout=15)
    assert r.status_code == 200
    time.sleep(0.5)
    doc = DB.matches.find_one({"id": match_id})
    assert doc.get("nudge_sent") is True, f"nudge_sent not set: {doc}"
    sys_msgs = list(DB.messages.find({"match_id": match_id, "kind": "system"}))
    assert len(sys_msgs) == 1, f"expected 1 system msg, got {len(sys_msgs)}"

    # Second call should NOT insert another nudge
    r2 = requests.get(f"{API}/matches", headers=_h(tokens["1"]), timeout=15)
    assert r2.status_code == 200
    sys_msgs2 = list(DB.messages.find({"match_id": match_id, "kind": "system"}))
    assert len(sys_msgs2) == 1, "nudge fired twice!"

    # cleanup
    DB.messages.delete_many({"match_id": match_id})
    DB.matches.delete_one({"id": match_id})


def test_nudge_skipped_when_confirmed(tokens):
    id1, id2 = tokens["id1"], tokens["id2"]
    _reset_pair(id1, id2)
    created_at = (datetime.now(timezone.utc) - timedelta(hours=49)).isoformat()
    match_id = str(uuid.uuid4())
    DB.matches.insert_one({
        "id": match_id, "users": [id1, id2], "mode": "amistad",
        "proposals": {id1: None, id2: None}, "proposed_activity": None,
        "plan_status": "confirmed",
        "created_at": created_at,
    })
    now = datetime.now(timezone.utc).isoformat()
    DB.messages.insert_one({"id": str(uuid.uuid4()), "match_id": match_id, "from_user": id1, "text": "hi", "kind": "text", "created_at": now})
    DB.messages.insert_one({"id": str(uuid.uuid4()), "match_id": match_id, "from_user": id2, "text": "hey", "kind": "text", "created_at": now})
    r = requests.get(f"{API}/matches", headers=_h(tokens["1"]), timeout=15)
    assert r.status_code == 200
    doc = DB.matches.find_one({"id": match_id})
    assert not doc.get("nudge_sent"), "nudge fired on confirmed plan!"
    sys_msgs = list(DB.messages.find({"match_id": match_id, "kind": "system"}))
    assert len(sys_msgs) == 0
    DB.messages.delete_many({"match_id": match_id})
    DB.matches.delete_one({"id": match_id})


# ------------------------------------------------------------------
# Regression: /admin/users no coords
# ------------------------------------------------------------------

def test_admin_users_no_coords(tokens):
    r = requests.get(f"{API}/admin/users", headers=_h(tokens["admin"]), timeout=15)
    assert r.status_code == 200
    users = r.json()
    assert isinstance(users, list) and len(users) > 0
    for u in users:
        loc = u.get("location")
        if isinstance(loc, dict):
            assert "coords" not in loc, f"admin/users leaks coords for {u.get('email')}: {loc}"


# ------------------------------------------------------------------
# Final teardown of any leftover test pair state
# ------------------------------------------------------------------

def test_zzz_cleanup(tokens):
    _reset_pair(tokens["id1"], tokens["id2"])
    _reset_pair(tokens["id1"], _uid(DEMO(3)[0]))
    _reset_pair(tokens["id1"], _uid(DEMO(4)[0]))
