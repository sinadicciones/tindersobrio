"""Iteration 25 — 'Chatear online' virtual activity in Discover Me-Tinca flow."""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"
PASSWORD = "Testing1234!"


def _register(email_prefix: str, modes=None, favs=None, gender="femenino", pref=None):
    email = f"test_iter25_{email_prefix}_{uuid.uuid4().hex[:6]}@plansobrio.cl"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": PASSWORD, "birthdate": "1995-01-01"})
    assert r.status_code in (200, 201), r.text
    token = r.json()["token"]
    h = {"Authorization": f"Bearer {token}"}

    # Fetch activities to obtain 3+ ids (non-virtual for favs)
    acts = requests.get(f"{API}/activities").json()
    non_virtual = [a for a in acts if not a.get("is_virtual")]
    fav_ids = favs or [non_virtual[i]["id"] for i in range(3)]

    onboarding = {
        "alias": f"user_{email_prefix}_{uuid.uuid4().hex[:4]}",
        "gender": gender,
        "gender_public": gender,
        "birthdate": "1995-01-01",
        "comuna": "Providencia",
        "modes": modes or ["amistad", "amor"],
        "preferred_genders": pref if pref is not None else ["masculino", "femenino", "no_binario"],
        "favorite_activities": fav_ids,
        "photos": ["https://example.com/photo1.jpg"],
        "prompts": [{"q": "Mi plan ideal sin alcohol es…", "a": "Café y conversación."}],
        "sober_time": "3-12m",
        "relationship_with_substances": "sin_consumo",
        "show_sober_time": True,
        "accepted_rules": True,
    }
    r = requests.post(f"{API}/profile/onboarding", headers=h, json=onboarding)
    assert r.status_code == 200, r.text
    me = requests.get(f"{API}/auth/me", headers=h).json()
    return {"email": email, "token": token, "headers": h, "id": me["id"], "favs": fav_ids}


# ---------- Backend tests ----------

def test_activities_include_chatear_online():
    r = requests.get(f"{API}/activities")
    assert r.status_code == 200
    data = r.json()
    virtual = [a for a in data if a.get("is_virtual") is True]
    assert len(virtual) == 1, f"Expected exactly 1 virtual activity, got {len(virtual)}"
    chat = virtual[0]
    assert chat["name"] == "Chatear online"
    assert chat["emoji"] == "💬"
    assert chat["category"] == "virtual"
    assert chat["icon"] == "MessageCircle"


def test_seed_idempotent_no_duplicate():
    # Just re-check total count is stable (upsert by name)
    r1 = requests.get(f"{API}/activities").json()
    count_by_name = {}
    for a in r1:
        count_by_name[a["name"]] = count_by_name.get(a["name"], 0) + 1
    assert count_by_name.get("Chatear online", 0) == 1


def test_match_message_when_both_pick_chat_online():
    a = _register("A", modes=["amistad"])
    b = _register("B", modes=["amistad"])
    chat_id = next(x["id"] for x in requests.get(f"{API}/activities").json() if x.get("is_virtual"))

    # a → b
    ra = requests.post(f"{API}/like", headers=a["headers"],
                      json={"target_user_id": b["id"], "mode": "amistad", "activity_id": chat_id})
    assert ra.status_code == 200, ra.text
    assert ra.json().get("match") is False

    # b → a (reciprocal)
    rb = requests.post(f"{API}/like", headers=b["headers"],
                      json={"target_user_id": a["id"], "mode": "amistad", "activity_id": chat_id})
    assert rb.status_code == 200, rb.text
    body = rb.json()
    assert body.get("match") is True
    match_id = body["match_id"]

    # Fetch match messages
    msgs = requests.get(f"{API}/matches/{match_id}/messages", headers=a["headers"]).json()
    sys_msgs = [m for m in msgs if m.get("kind") == "system"]
    assert sys_msgs, "no system message"
    txt = sys_msgs[0]["text"]
    assert "Empiecen conversando por acá" in txt, f"Got: {txt}"
    assert "Chatear online" in txt
    assert "Solo falta el cuándo" not in txt


def test_match_message_lone_virtual_proposal():
    a = _register("C", modes=["amistad"])
    b = _register("D", modes=["amistad"])
    chat_id = next(x["id"] for x in requests.get(f"{API}/activities").json() if x.get("is_virtual"))

    # a proposes chat online; b likes without plan
    requests.post(f"{API}/like", headers=a["headers"],
                  json={"target_user_id": b["id"], "mode": "amistad", "activity_id": chat_id})
    rb = requests.post(f"{API}/like", headers=b["headers"],
                      json={"target_user_id": a["id"], "mode": "amistad", "no_plan": True})
    assert rb.status_code == 200, rb.text
    match_id = rb.json()["match_id"]
    msgs = requests.get(f"{API}/matches/{match_id}/messages", headers=b["headers"]).json()
    sys = [m for m in msgs if m.get("kind") == "system"][0]["text"]
    assert "Cachen de qué se trata por acá" in sys, f"Got: {sys}"


def test_like_with_chat_online_does_not_create_plan():
    a = _register("E", modes=["amistad"])
    b = _register("F", modes=["amistad"])
    chat_id = next(x["id"] for x in requests.get(f"{API}/activities").json() if x.get("is_virtual"))
    requests.post(f"{API}/like", headers=a["headers"],
                  json={"target_user_id": b["id"], "mode": "amistad", "activity_id": chat_id})
    requests.post(f"{API}/like", headers=b["headers"],
                  json={"target_user_id": a["id"], "mode": "amistad", "activity_id": chat_id})

    # Neither user should see plans (virtual match does not create db.plans)
    p_a = requests.get(f"{API}/plans", headers=a["headers"]).json()
    p_b = requests.get(f"{API}/plans", headers=b["headers"]).json()
    # Ensure no plan references Chatear online / virtual
    for plans in (p_a, p_b):
        for item in plans:
            act = item.get("activity") or {}
            assert (act.get("name") if isinstance(act, dict) else None) != "Chatear online"
            assert item.get("kind") != "match" or not (act and act.get("is_virtual"))
