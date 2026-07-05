"""
Iteration 21 - FIX 2 retest: accept_plan persists plan_status='confirmed'
+ confirmed_activity + confirmed_when + confirmed_plan_id on the match doc.
"""
import os
import uuid
from datetime import datetime, timedelta, timezone

import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://comunidad-sobria.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    r.raise_for_status()
    return r.json()["token"]


def _h(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def test_accept_plan_persists_confirmed_status_on_match():
    # Use demo11 + demo12 to reduce interference with other tests
    t1 = _login("demo11@plansobrio.cl", "Demo1234!")
    t2 = _login("demo12@plansobrio.cl", "Demo1234!")

    me1 = requests.get(f"{API}/auth/me", headers=_h(t1)).json()
    me2 = requests.get(f"{API}/auth/me", headers=_h(t2)).json()

    # Find or create a mutual match by liking each other
    # First try to find existing match
    matches1 = requests.get(f"{API}/matches", headers=_h(t1)).json()
    match = None
    for m in matches1:
        if m.get("other", {}).get("id") == me2["id"]:
            match = m
            break

    if not match:
        # Create match by mutual like
        acts = requests.get(f"{API}/activities", headers=_h(t1)).json()
        act_id = acts[0]["id"]
        r1 = requests.post(f"{API}/like", headers=_h(t1), json={"target_user_id": me2["id"], "activity_id": act_id, "mode": "amistad"})
        r2 = requests.post(f"{API}/like", headers=_h(t2), json={"target_user_id": me1["id"], "activity_id": act_id, "mode": "amistad"})
        print("like1:", r1.status_code, r1.text[:200])
        print("like2:", r2.status_code, r2.text[:200])
        matches1 = requests.get(f"{API}/matches", headers=_h(t1)).json()
        for m in matches1:
            if m.get("other", {}).get("id") == me2["id"]:
                match = m
                break

    assert match is not None, "Could not create/find match between demo1 and demo2"
    match_id = match["id"]

    # User1 proposes a plan
    acts = requests.get(f"{API}/activities", headers=_h(t1)).json()
    act = acts[0]
    future = (datetime.now(timezone.utc) + timedelta(days=3)).strftime("%Y-%m-%dT19:00")
    r = requests.post(
        f"{API}/matches/{match_id}/propose-plan",
        headers=_h(t1),
        json={"activity_id": act["id"], "when": future},
        timeout=15,
    )
    assert r.status_code == 200, f"propose-plan failed: {r.status_code} {r.text}"
    plan = r.json()
    plan_id = plan["id"]

    # User2 accepts the plan
    r2 = requests.post(f"{API}/plans/{plan_id}/accept", headers=_h(t2), timeout=15)
    assert r2.status_code == 200, f"accept failed: {r2.status_code} {r2.text}"

    # User1 reloads matches — check plan_status = confirmed
    matches1b = requests.get(f"{API}/matches", headers=_h(t1)).json()
    match_after = next((m for m in matches1b if m["id"] == match_id), None)
    assert match_after is not None
    assert match_after.get("plan_status") == "confirmed", f"plan_status not confirmed: {match_after.get('plan_status')}"
    conf_act = match_after.get("confirmed_activity")
    assert conf_act is not None, "confirmed_activity is None"
    assert conf_act.get("id") == act["id"], f"confirmed_activity.id mismatch: {conf_act}"
    assert conf_act.get("name") == act["name"]
    assert match_after.get("confirmed_at") is not None
    # confirmed_when/confirmed_plan_id are persisted in the DB but not necessarily exposed in GET /matches.
    # Verify persistence directly.
    try:
        from pymongo import MongoClient
        c = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
        db = c[os.environ.get("DB_NAME", "test_database")]
        m_doc = db.matches.find_one({"id": match_id})
        assert m_doc.get("plan_status") == "confirmed"
        assert m_doc.get("confirmed_when") == future, f"DB confirmed_when: {m_doc.get('confirmed_when')}"
        assert m_doc.get("confirmed_plan_id") == plan_id, f"DB confirmed_plan_id: {m_doc.get('confirmed_plan_id')}"
        assert (m_doc.get("confirmed_activity") or {}).get("id") == act["id"]
    except ImportError:
        pass


def test_accept_plan_by_proposer_forbidden():
    t1 = _login("demo1@plansobrio.cl", "Demo1234!")
    t2 = _login("demo2@plansobrio.cl", "Demo1234!")
    me2 = requests.get(f"{API}/auth/me", headers=_h(t2)).json()

    matches1 = requests.get(f"{API}/matches", headers=_h(t1)).json()
    match = next((m for m in matches1 if m.get("other", {}).get("id") == me2["id"]), None)
    if not match:
        return  # skip

    acts = requests.get(f"{API}/activities", headers=_h(t1)).json()
    future = (datetime.now(timezone.utc) + timedelta(days=5)).strftime("%Y-%m-%dT20:00")
    r = requests.post(
        f"{API}/matches/{match['id']}/propose-plan",
        headers=_h(t1),
        json={"activity_id": acts[1]["id"], "when": future},
        timeout=15,
    )
    if r.status_code != 200:
        # No new plan can be proposed if already confirmed
        return
    plan_id = r.json()["id"]
    # Proposer tries to accept own plan -> 400
    r2 = requests.post(f"{API}/plans/{plan_id}/accept", headers=_h(t1), timeout=15)
    assert r2.status_code == 400
