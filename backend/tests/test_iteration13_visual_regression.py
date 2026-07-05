"""Iteration 13 — Visual redesign 'Blanco Editorial' backend regression.

Only backend change should be an `icon` field on activities.
Every other endpoint contract must remain unchanged.
"""
import os
import requests
import pytest

BASE = os.environ.get("BACKEND_URL", "https://comunidad-sobria.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

DEMO1 = {"email": "demo1@plansobrio.cl", "password": "Demo1234!"}
DEMO2 = {"email": "demo2@plansobrio.cl", "password": "Demo1234!"}
ADMIN = {"email": "contacto@sinadicciones.org", "password": "Jodorowsky100"}

EXPECTED_ICON_BY_NAME = {
    "Café y conversación": "Coffee",
    "Caminata o trekking": "Mountain",
    "Paseo por un parque": "Trees",
    "Museo o centro cultural": "Landmark",
    "Cine": "Clapperboard",
    "Almorzar o cenar rico": "UtensilsCrossed",
    "Entrenar juntos": "Dumbbell",
    "Pichanga o deporte grupal": "Volleyball",
    "Yoga o meditación": "Flower2",
    "Club de lectura o librería": "BookOpen",
    "Taller creativo": "Palette",
    "Juegos de mesa": "Dice5",
    "Pasear a los perros": "Dog",
    "Concierto o música en vivo de día": "Music",
    "Escalada o panorama aventura": "MountainSnow",
    "Helado y vuelta a la manzana": "IceCreamCone",
}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=30)
    r.raise_for_status()
    return r.json()["token"]


@pytest.fixture(scope="module")
def demo1_token():
    return _login(DEMO1)


@pytest.fixture(scope="module")
def demo2_token():
    return _login(DEMO2)


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN)


def H(t):
    return {"Authorization": f"Bearer {t}"}


# ---------- Activities: icon field ----------

class TestActivitiesIcon:
    def test_activities_returns_16_with_icon_and_emoji(self, demo1_token):
        r = requests.get(f"{API}/activities", headers=H(demo1_token), timeout=30)
        assert r.status_code == 200
        acts = r.json()
        assert isinstance(acts, list)
        assert len(acts) == 16, f"expected 16 seeded activities, got {len(acts)}"
        for a in acts:
            assert "id" in a and "name" in a and "emoji" in a and "icon" in a, f"missing field in {a}"
            assert a["icon"] and isinstance(a["icon"], str), f"empty icon on {a['name']}"
            assert a["emoji"] and isinstance(a["emoji"], str), f"empty emoji on {a['name']}"

    def test_activities_icon_matches_seed_map(self, demo1_token):
        r = requests.get(f"{API}/activities", headers=H(demo1_token), timeout=30)
        acts = r.json()
        by_name = {a["name"]: a for a in acts}
        for name, expected_icon in EXPECTED_ICON_BY_NAME.items():
            assert name in by_name, f"activity '{name}' missing from response"
            assert by_name[name]["icon"] == expected_icon, (
                f"{name}: expected icon '{expected_icon}', got '{by_name[name]['icon']}'"
            )


# ---------- Auth ----------

class TestAuthRegression:
    def test_login_ok(self):
        r = requests.post(f"{API}/auth/login", json=DEMO1, timeout=30)
        assert r.status_code == 200
        j = r.json()
        assert "token" in j and "user" in j
        assert j["user"]["email"] == DEMO1["email"]

    def test_login_bad_pw(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": DEMO1["email"], "password": "wrong-xxx"},
                          timeout=30)
        assert r.status_code in (400, 401, 403)


# ---------- Discover / Like / Matches / Likes-received / Notifications ----------

class TestCoreFlowsRegression:
    def test_discover(self, demo1_token):
        r = requests.get(f"{API}/discover?mode=amistad", headers=H(demo1_token), timeout=30)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        # Coord privacy: no coords field or coords stripped
        for p in items:
            loc = p.get("location") or {}
            assert "coords" not in loc, f"coords leaked in discover: {loc}"
            assert "email" not in p, "email leaked in discover"
            assert "password_hash" not in p, "hash leaked"
            # distance bucket in 5..50 or null/undefined
            d = p.get("distance_km") if isinstance(p, dict) else None
            if d is not None:
                assert d in (5, 10, 15, 20, 25, 30, 35, 40, 45, 50, None), f"bad bucket {d}"

    def test_matches(self, demo1_token):
        r = requests.get(f"{API}/matches", headers=H(demo1_token), timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_likes_received(self, demo1_token):
        r = requests.get(f"{API}/likes-received", headers=H(demo1_token), timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_notifications_counts_shape(self, demo1_token):
        r = requests.get(f"{API}/notifications/counts", headers=H(demo1_token), timeout=30)
        assert r.status_code == 200
        j = r.json()
        for k in ("new_matches", "unread_messages", "unseen_likes", "total"):
            assert k in j, f"missing {k} in counts"
        assert j["total"] == j["new_matches"] + j["unread_messages"] + j["unseen_likes"]


# ---------- Profile ----------

class TestProfileRegression:
    def test_public_profile_clean_shape(self, demo1_token, demo2_token):
        # demo1 fetches demo2's public profile
        me2 = requests.get(f"{API}/auth/me", headers=H(demo2_token), timeout=30).json()
        pid = me2["id"]
        r = requests.get(f"{API}/profile/{pid}", headers=H(demo1_token), timeout=30)
        assert r.status_code == 200
        p = r.json()
        assert "email" not in p and "password_hash" not in p
        loc = p.get("location") or {}
        assert "coords" not in loc, "coords leaked in public profile"


# ---------- Admin coord regression ----------

class TestAdminCoordLeak:
    def test_admin_users_no_coords(self, admin_token):
        r = requests.get(f"{API}/admin/users", headers=H(admin_token), timeout=30)
        assert r.status_code == 200
        users = r.json()
        assert isinstance(users, list) and len(users) > 0
        for u in users:
            loc = u.get("location") or {}
            assert "coords" not in loc, f"coords leaked in admin/users for {u.get('email')}"
