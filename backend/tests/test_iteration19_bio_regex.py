"""Iteration 19 — Bio URL regex false-positive fix.

Bug: Users could not finish onboarding because bio regex matched '.com' as a
substring of normal Spanish words like 'vamos.como amigos' -> POST
/api/profile/onboarding returned 400 at the very last step.

Fix: BIO_URL_RE now requires a real domain (3+ alphanum, dot, real TLD, word
boundary). Test both accept and reject cases via PATCH /profile/me (same
validate_bio function as onboarding).
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://comunidad-sobria.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

def _hdr(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def token():
    import uuid as _uuid
    email = f"test.bio.{_uuid.uuid4().hex[:8]}@example.com"
    payload = {"email": email, "password": "TestPass123!", "birthdate": "1995-05-15"}
    r = requests.post(f"{API}/auth/register", json=payload, timeout=30)
    if r.status_code != 200:
        # try login if already exists
        r2 = requests.post(f"{API}/auth/login", json={"email": email, "password": payload["password"]}, timeout=30)
        if r2.status_code != 200:
            pytest.skip(f"register+login failed: {r.status_code} {r.text[:200]}")
        return r2.json()["token"]
    return r.json()["token"]


ACCEPT_CASES = [
    "Busco amistad y salir de la rutina",
    "Sobria desde 2024. Comence despues de un anio dificil.",
    "Vamos.como amigos",
    "Prefiero hablar de.com plicaciones",
    "a mi me gusta correr.como cardio",
    "",
]

REJECT_URL_CASES = [
    "sigueme en instagram.com/juanita",
    "mi web es misitio.com",
    "https://plansobrio.cl",
    "www.google.com",
]

REJECT_PHONE_CASES = [
    "llamame al +569 8765 4321",
]


@pytest.mark.parametrize("bio", ACCEPT_CASES)
def test_bio_accepted(token, bio):
    r = requests.patch(f"{API}/profile/me", headers=_hdr(token), json={"bio": bio}, timeout=15)
    assert r.status_code == 200, f"expected 200 for {bio!r}, got {r.status_code} {r.text[:200]}"
    # Verify persistence
    me = requests.get(f"{API}/auth/me", headers=_hdr(token), timeout=15).json()
    assert (me.get("bio") or "") == bio.strip()


@pytest.mark.parametrize("bio", REJECT_URL_CASES)
def test_bio_url_rejected(token, bio):
    r = requests.patch(f"{API}/profile/me", headers=_hdr(token), json={"bio": bio}, timeout=15)
    assert r.status_code == 400, f"expected 400 for {bio!r}, got {r.status_code} {r.text[:200]}"
    assert "Guarda los links" in (r.json().get("detail") or "")


@pytest.mark.parametrize("bio", REJECT_PHONE_CASES)
def test_bio_phone_rejected(token, bio):
    r = requests.patch(f"{API}/profile/me", headers=_hdr(token), json={"bio": bio}, timeout=15)
    assert r.status_code == 400, f"expected 400 for {bio!r}, got {r.status_code} {r.text[:200]}"
    assert "telefonos" in (r.json().get("detail") or "").lower() or "tel" in (r.json().get("detail") or "").lower()


def test_bio_cleanup(token):
    """Reset bio to a known clean value for other tests."""
    r = requests.patch(f"{API}/profile/me", headers=_hdr(token), json={"bio": "Bio limpia para tests"}, timeout=15)
    assert r.status_code == 200


# ---------- E2E: reproduce the user's onboarding bug ----------

def _register_fresh():
    import uuid as _uuid
    email = f"test.onbd.{_uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "TestPass123!", "birthdate": "1995-05-15",
    }, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"], email


def _onboarding_payload(bio_text):
    # Get any activity ids from the public /activities endpoint
    acts = requests.get(f"{API}/activities", timeout=15).json()
    act_ids = [a["id"] for a in acts[:3]]
    return {
        "alias": "TesterBio",
        "gender": "femenino",
        "comuna": "Providencia",
        "modes": ["amistad"],
        "interested_genders": [],
        "age_min": 22, "age_max": 40,
        "relationship_with_substances": "sin_consumo",
        "sober_time": "1-3m",
        "show_sober_time": False,
        "favorite_activities": act_ids,
        "photos": [],
        "prompts": [{"q": "Un hábito que amo", "a": "caminar por la mañana"}],
        "accepted_rules": True,
        "location": {"country": "CL", "comuna": "Providencia", "coords": [-70.61, -33.43]},
        "bio": bio_text,
    }


def test_onboarding_repro_original_bug_now_passes():
    """BEFORE fix: bio='Vamos.como amigos' -> 400 at step 9. AFTER: 200 OK."""
    tok, _ = _register_fresh()
    payload = _onboarding_payload("Vamos.como amigos")
    r = requests.post(f"{API}/profile/onboarding", headers=_hdr(tok), json=payload, timeout=20)
    assert r.status_code == 200, f"onboarding should NOT reject 'Vamos.como amigos': {r.status_code} {r.text[:300]}"
    assert r.json().get("ok") is True
    # verify persisted
    me = requests.get(f"{API}/auth/me", headers=_hdr(tok), timeout=15).json()
    assert me.get("onboarding_complete") is True
    assert me.get("bio") == "Vamos.como amigos"


def test_onboarding_still_blocks_real_domain():
    tok, _ = _register_fresh()
    payload = _onboarding_payload("sigueme en misitio.com")
    r = requests.post(f"{API}/profile/onboarding", headers=_hdr(tok), json=payload, timeout=20)
    assert r.status_code == 400
    assert "Guarda los links" in (r.json().get("detail") or "")


def test_onboarding_happy_path_clean_bio():
    tok, _ = _register_fresh()
    payload = _onboarding_payload("Busco amistad y salir de la rutina")
    r = requests.post(f"{API}/profile/onboarding", headers=_hdr(tok), json=payload, timeout=20)
    assert r.status_code == 200
    me = requests.get(f"{API}/auth/me", headers=_hdr(tok), timeout=15).json()
    assert me.get("onboarding_complete") is True
