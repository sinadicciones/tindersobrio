"""GEOSWIPE Bloque 2 - geo endpoints + location backfill + privacy regressions."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://comunidad-sobria.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo1@plansobrio.cl"
DEMO_PW = "Demo1234!"


def _login(email=DEMO_EMAIL, pw=DEMO_PW):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def demo_headers():
    return {"Authorization": f"Bearer {_login()}"}


# --- Public geo endpoints (no auth) ---

def test_geo_countries_public_chile_enabled():
    r = requests.get(f"{API}/geo/countries", timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list) and len(data) >= 1
    cl = next((c for c in data if c.get("code") == "CL"), None)
    assert cl is not None, "Chile country must be present"
    assert cl.get("enabled") is True
    assert isinstance(cl.get("cities"), list) and len(cl["cities"]) >= 5
    # sanity: santiago should be in cities catalog
    names = [c.get("name") for c in cl["cities"]]
    assert "Santiago" in names


def test_geo_helplines_cl_returns_four_sorted():
    r = requests.get(f"{API}/geo/helplines", params={"country": "CL"}, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 4, f"Expected 4 helplines, got {len(data)}: {data}"
    names = [h["name"] for h in data]
    for expected in ["Salud Responde", "Prevención del suicidio", "Urgencias", "Orientación profesional"]:
        assert expected in names, f"Missing helpline: {expected}"
    orders = [h.get("order") for h in data]
    assert orders == sorted(orders), f"Not sorted by order: {orders}"


def test_geo_helplines_us_empty():
    r = requests.get(f"{API}/geo/helplines", params={"country": "US"}, timeout=20)
    assert r.status_code == 200
    assert r.json() == []


# --- Auth me contains country + location ---

def test_auth_me_has_country_and_location(demo_headers):
    r = requests.get(f"{API}/auth/me", headers=demo_headers, timeout=20)
    assert r.status_code == 200, r.text
    me = r.json()
    assert me.get("country") == "CL", f"country missing/wrong: {me.get('country')}"
    loc = me.get("location")
    assert isinstance(loc, dict), f"location missing: {loc}"
    assert loc.get("country") == "CL"
    coords_doc = loc.get("coords")
    assert isinstance(coords_doc, dict)
    assert coords_doc.get("type") == "Point"
    coords = coords_doc.get("coordinates")
    assert isinstance(coords, list) and len(coords) == 2
    # Providencia centroid ~ [-70.61, -33.43]
    lng, lat = coords
    assert -71.0 <= lng <= -70.2, f"lng out of range: {lng}"
    assert -33.7 <= lat <= -33.2, f"lat out of range: {lat}"


# --- Discover privacy ---

def test_discover_amistad_no_private_fields(demo_headers):
    r = requests.get(f"{API}/discover", params={"mode": "amistad"}, headers=demo_headers, timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    # response could be list or dict wrapper
    candidates = body if isinstance(body, list) else (body.get("candidates") or body.get("results") or [])
    assert isinstance(candidates, list)
    assert len(candidates) >= 1, "No candidates returned"
    for c in candidates:
        for banned in ["coords", "_id", "email", "password_hash"]:
            assert banned not in c, f"Public payload leaked '{banned}' in {c}"
        # Check location doesn't leak coords either
        loc = c.get("location")
        if isinstance(loc, dict):
            assert "coords" not in loc, f"location.coords leaked: {loc}"
        for req_key in ["id", "alias", "comuna", "city", "country", "modes"]:
            assert req_key in c, f"Missing public key '{req_key}' in {c}"


# --- PATCH profile with comuna auto-derives location ---

def test_patch_profile_comuna_updates_location(demo_headers):
    # Change to Ñuñoa
    r = requests.patch(f"{API}/profile/me", json={"comuna": "Ñuñoa"}, headers=demo_headers, timeout=20)
    assert r.status_code == 200, r.text
    me = requests.get(f"{API}/auth/me", headers=demo_headers, timeout=20).json()
    loc = me.get("location") or {}
    coords = (loc.get("coords") or {}).get("coordinates")
    assert coords, f"No coords after PATCH: {loc}"
    # Ñuñoa centroid: [-70.60, -33.46]
    assert abs(coords[0] - (-70.60)) < 0.05, coords
    assert abs(coords[1] - (-33.46)) < 0.05, coords
    assert loc.get("comuna") == "Ñuñoa"

    # Restore back to Providencia to keep other tests deterministic
    requests.patch(f"{API}/profile/me", json={"comuna": "Providencia"}, headers=demo_headers, timeout=20)


def test_patch_profile_location_coords_rounded(demo_headers):
    payload = {"location": {"country": "CL", "comuna": "Las Condes", "coords": [-70.5567891, -33.4123456]}}
    r = requests.patch(f"{API}/profile/me", json=payload, headers=demo_headers, timeout=20)
    assert r.status_code == 200, r.text
    me = requests.get(f"{API}/auth/me", headers=demo_headers, timeout=20).json()
    coords = ((me.get("location") or {}).get("coords") or {}).get("coordinates")
    assert coords is not None
    # rounded to 4 decimals
    assert coords == [-70.5568, -33.4123], f"Not rounded to 4 dp: {coords}"
    # cleanup: restore
    requests.patch(f"{API}/profile/me", json={"comuna": "Providencia"}, headers=demo_headers, timeout=20)


# --- Like flow still works ---

def test_like_and_quota_still_works(demo_headers):
    # Get discover candidates
    r = requests.get(f"{API}/discover", params={"mode": "amistad"}, headers=demo_headers, timeout=30)
    body = r.json()
    candidates = body if isinstance(body, list) else (body.get("candidates") or body.get("results") or [])
    if not candidates:
        pytest.skip("No candidates available for like test")
    target_id = candidates[0]["id"]
    # Get quota before
    q1 = requests.get(f"{API}/discover/quota", headers=demo_headers, timeout=20)
    assert q1.status_code == 200
    quota_before = q1.json()
    # Post like
    r = requests.post(f"{API}/like", json={"target_user_id": target_id, "mode": "amistad", "no_plan": True}, headers=demo_headers, timeout=20)
    assert r.status_code in (200, 201), f"like failed: {r.status_code} {r.text}"
    # Quota after should have decremented (or used incremented)
    q2 = requests.get(f"{API}/discover/quota", headers=demo_headers, timeout=20).json()
    # some implementations return used, remaining, or both — just assert it changed
    assert q2 != quota_before, f"Quota did not change after like: before={quota_before}, after={q2}"


# --- Onboarding new user has location + country ---

def test_new_user_onboarding_sets_location_and_country():
    ts = int(time.time())
    email = f"test_geo_{ts}@example.com"
    pw = "TestPass1234!"
    # Register
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": pw, "birthdate": "1995-06-15"}, timeout=30)
    assert r.status_code in (200, 201), r.text
    token = r.json().get("token") or _login(email, pw)
    h = {"Authorization": f"Bearer {token}"}
    # Complete onboarding
    onboarding = {
        "alias": f"geo_test_{ts}",
        "gender": "femenino",
        "comuna": "Vitacura",
        "modes": ["amistad"],
        "relationship_with_substances": "sin_consumo",
        "sober_time": "1-3m",
        "show_sober_time": True,
        "prompts": [{"q": "Mi lugar favorito", "a": "el parque"}],
        "photos": [],
        "favorite_activities": ["yoga", "cine", "café"],
        "accepted_rules": True,
    }
    r = requests.post(f"{API}/profile/onboarding", json=onboarding, headers=h, timeout=30)
    assert r.status_code in (200, 201), r.text
    me = requests.get(f"{API}/auth/me", headers=h, timeout=20).json()
    assert me.get("country") == "CL"
    loc = me.get("location") or {}
    assert loc.get("country") == "CL"
    coords = (loc.get("coords") or {}).get("coordinates")
    assert coords is not None
    # Vitacura centroid: [-70.58, -33.38]
    assert abs(coords[0] - (-70.58)) < 0.05, coords
    assert abs(coords[1] - (-33.38)) < 0.05, coords

    # Regression: DELETE /api/profile/me still works
    d = requests.delete(f"{API}/profile/me", headers=h, timeout=30)
    assert d.status_code in (200, 204), f"Delete failed: {d.status_code} {d.text}"
    # Confirm can't login (or /me returns 401)
    r = requests.get(f"{API}/auth/me", headers=h, timeout=20)
    assert r.status_code in (401, 404), f"User still exists after delete: {r.status_code}"
