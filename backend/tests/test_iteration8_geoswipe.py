"""GEOSWIPE Bloque 3 — distance-based discover + radius filter + waitlist."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://comunidad-sobria.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo1@plansobrio.cl"
DEMO_PASS = "Demo1234!"


@pytest.fixture(scope="module")
def demo1_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASS})
    assert r.status_code == 200, r.text
    yield s
    # Restore demo1 to Providencia in case tests moved it
    try:
        s.patch(f"{API}/profile/me", json={"comuna": "Providencia",
                                            "location": {"country": "CL",
                                                         "comuna": "Providencia",
                                                         "city": "Providencia",
                                                         "coords": [-70.61, -33.43]}})
    except Exception:
        pass


# ---------------- Discover: distance + radius ----------------

def test_discover_returns_distance_sorted_ascending(demo1_session):
    # Ensure demo1 has coords near Providencia
    demo1_session.patch(f"{API}/profile/me",
                        json={"location": {"country": "CL", "comuna": "Providencia",
                                            "city": "Providencia", "coords": [-70.61, -33.43]}})
    r = demo1_session.get(f"{API}/discover", params={"mode": "amistad"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list) and len(data) > 0
    # At least first candidate must have a numeric distance_km
    assert "distance_km" in data[0], f"first candidate missing distance_km: {data[0]}"
    assert isinstance(data[0]["distance_km"], (int, float))
    # Sorted ascending by distance
    dists = [c.get("distance_km") for c in data if c.get("distance_km") is not None]
    assert dists == sorted(dists), f"distances not sorted asc: {dists}"


def test_discover_radius_5km_narrows(demo1_session):
    default = demo1_session.get(f"{API}/discover", params={"mode": "amistad"}).json()
    small = demo1_session.get(f"{API}/discover", params={"mode": "amistad", "radius_km": 5}).json()
    assert isinstance(small, list)
    assert len(small) <= len(default)
    for c in small:
        assert c.get("distance_km") is not None
        assert c["distance_km"] <= 5.0, f"candidate exceeds 5km: {c['distance_km']}"


def test_discover_radius_1000_rejected(demo1_session):
    r = demo1_session.get(f"{API}/discover", params={"mode": "amistad", "radius_km": 1000})
    assert r.status_code == 422, r.text


def test_discover_privacy_no_sensitive_fields(demo1_session):
    r = demo1_session.get(f"{API}/discover", params={"mode": "amistad"})
    assert r.status_code == 200
    data = r.json()
    forbidden = {"_id", "email", "password_hash", "coords", "_score", "_distance_m", "_distance_km", "birthdate"}
    for c in data:
        leaked = forbidden & set(c.keys())
        assert not leaked, f"leaked keys {leaked} in candidate {c.get('alias')}"
        # location.coords must not be exposed either
        assert "location" not in c or "coords" not in (c.get("location") or {})
        if "distance_km" in c:
            # rounded to 1 decimal
            val = c["distance_km"]
            assert round(val, 1) == val


# ---------------- PATCH /profile/me ----------------

def test_patch_profile_coords_persist_and_reorder(demo1_session):
    # Move demo1 to Las Condes coordinates
    r = demo1_session.patch(f"{API}/profile/me",
                            json={"location": {"country": "CL",
                                                "comuna": "Las Condes",
                                                "city": "Las Condes",
                                                "coords": [-70.55, -33.41]}})
    assert r.status_code == 200
    me = demo1_session.get(f"{API}/auth/me").json()
    assert me.get("country") == "CL"
    coords_stored = ((me.get("location") or {}).get("coords") or {}).get("coordinates")
    assert coords_stored is not None
    assert abs(coords_stored[0] - (-70.55)) < 0.02
    assert abs(coords_stored[1] - (-33.41)) < 0.02

    # Discover should still return distance-sorted candidates, now relative to Las Condes
    disc = demo1_session.get(f"{API}/discover", params={"mode": "amistad"}).json()
    assert len(disc) > 0
    assert "distance_km" in disc[0]
    dists = [c["distance_km"] for c in disc if c.get("distance_km") is not None]
    assert dists == sorted(dists)

    # Restore
    demo1_session.patch(f"{API}/profile/me",
                        json={"location": {"country": "CL", "comuna": "Providencia",
                                            "city": "Providencia", "coords": [-70.61, -33.43]}})


def test_patch_comuna_only_rederives_to_CL(demo1_session):
    # Simulate: set user country to a non-CL temporarily via a location patch,
    # then send only {comuna:'Ñuñoa'} and assert country becomes CL again.
    demo1_session.patch(f"{API}/profile/me",
                        json={"location": {"country": "IN", "comuna": "Kolkata",
                                            "city": "Kolkata", "coords": [88.36, 22.57]}})
    me = demo1_session.get(f"{API}/auth/me").json()
    assert me.get("country") == "IN"

    r = demo1_session.patch(f"{API}/profile/me", json={"comuna": "Ñuñoa"})
    assert r.status_code == 200
    me2 = demo1_session.get(f"{API}/auth/me").json()
    assert me2.get("country") == "CL", f"country should be re-derived to CL, got {me2.get('country')}"
    loc = me2.get("location") or {}
    assert loc.get("country") == "CL"
    coords = (loc.get("coords") or {}).get("coordinates")
    assert coords is not None
    # Ñuñoa centroid ≈ [-70.60, -33.46]
    assert abs(coords[0] - (-70.60)) < 0.1
    assert abs(coords[1] - (-33.46)) < 0.1

    # Restore
    demo1_session.patch(f"{API}/profile/me",
                        json={"comuna": "Providencia",
                              "location": {"country": "CL", "comuna": "Providencia",
                                            "city": "Providencia", "coords": [-70.61, -33.43]}})


# ---------------- Waitlist ----------------

def test_waitlist_creates_and_upserts():
    email = f"test_wl_{int(time.time())}@example.com"
    r1 = requests.post(f"{API}/waitlist", json={"email": email, "country": "AR", "city": "Mendoza"})
    assert r1.status_code == 200
    assert r1.json().get("ok") is True
    # Upsert same email — should not error
    r2 = requests.post(f"{API}/waitlist", json={"email": email, "country": "AR", "city": "Cordoba"})
    assert r2.status_code == 200
    assert r2.json().get("ok") is True


def test_waitlist_invalid_email():
    r = requests.post(f"{API}/waitlist", json={"email": "not-an-email", "country": "AR"})
    assert r.status_code == 422


# ---------------- Regression ----------------

def test_geo_countries_still_works():
    r = requests.get(f"{API}/geo/countries")
    assert r.status_code == 200
    data = r.json()
    assert any(c.get("code") == "CL" for c in data)


def test_geo_helplines_still_works():
    r = requests.get(f"{API}/geo/helplines", params={"country": "CL"})
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) >= 1


def test_like_endpoint_still_works(demo1_session):
    # Get a candidate to like
    disc = demo1_session.get(f"{API}/discover", params={"mode": "amistad"}).json()
    if not disc:
        pytest.skip("No candidates available")
    target = disc[0]["id"]
    r = demo1_session.post(f"{API}/like", json={"target_user_id": target, "mode": "amistad", "kind": "pass"})
    assert r.status_code in (200, 400), r.text


def test_new_user_onboarding_backfills_CL():
    ts = int(time.time())
    email = f"test_geo3_{ts}@example.com"
    s = requests.Session()
    r = s.post(f"{API}/auth/register",
               json={"email": email, "password": "Testpass1!", "birthdate": "1995-01-01"})
    assert r.status_code == 200, r.text
    # Onboarding without GPS coords
    ob = {
        "alias": f"Tester{ts}",
        "gender": "femenino",
        "comuna": "Vitacura",
        "modes": ["amistad"],
        "interested_genders": [],
        "age_min": 18, "age_max": 99,
        "relationship_with_substances": "sin_consumo",
        "sober_time": "3-12m",
        "show_sober_time": True,
        "favorite_activities": ["act-1", "act-2", "act-3"],
        "photos": [], "prompts": [],
        "accepted_rules": True,
    }
    r = s.post(f"{API}/profile/onboarding", json=ob)
    assert r.status_code == 200, r.text
    me = s.get(f"{API}/auth/me").json()
    assert me.get("country") == "CL"
    loc = me.get("location") or {}
    assert loc.get("country") == "CL"
    # cleanup
    s.delete(f"{API}/profile/me")
