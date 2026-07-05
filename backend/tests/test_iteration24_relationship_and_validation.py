"""Iteration 24 tests — sober_time='' bugfix + new 'sin_problema' relationship
option + global RequestValidationError Spanish handler.

Covers:
  * OnboardingIn: sober_time='' -> None (no 422)
  * OnboardingIn: relationship_with_substances='sin_problema' + show_relationship=true persists
  * PATCH /profile/me updates relationship + show_relationship (and can flip back)
  * clear_public exposes relationship_badge appropriately
  * Global 422 handler returns Spanish {"detail": "<mensaje>"}
"""
import os
import uuid
import time
import requests
import pytest

BASE = os.environ.get("BACKEND_URL", "https://comunidad-sobria.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

ADMIN_EMAIL = "contacto@sinadicciones.org"
ADMIN_PASSWORD = "Jodorowsky100"


# ---------------- helpers ----------------

def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    r.raise_for_status()
    return r.json()["token"]


def _hdr(tok):
    return {"Authorization": f"Bearer {tok}"}


def _register_test_user():
    """Create a fresh test user; returns (email, token, uid)."""
    tag = uuid.uuid4().hex[:8]
    email = f"test_iter24_{tag}@plansobrio.cl"
    pw = "Testing1234!"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": pw,
        "birthdate": "1995-05-15",
    }, timeout=30)
    r.raise_for_status()
    data = r.json()
    return email, data["token"], data["user"]["id"]


def _get_activities(tok):
    r = requests.get(f"{API}/activities", headers=_hdr(tok), timeout=30)
    r.raise_for_status()
    return [a["id"] for a in r.json()][:3]


def _make_onboarding_payload(activities, **overrides):
    payload = {
        "alias": f"tst_{uuid.uuid4().hex[:5]}",
        "gender": "femenino",
        "comuna": "Providencia",
        "modes": ["amistad"],
        "interested_genders": [],
        "age_min": 22,
        "age_max": 40,
        "relationship_with_substances": "sin_consumo",
        "sober_time": "",   # <— the bug repro
        "show_sober_time": False,
        "show_relationship": False,
        "favorite_activities": activities,
        "photos": [],
        "videos": [],
        "prompts": [{"q": "Mi frase favorita es", "a": "Vamos con calma"}],
        "accepted_rules": True,
        "location": {"country": "CL", "city": "Providencia", "comuna": "Providencia"},
    }
    payload.update(overrides)
    return payload


# ------------------------------------------------------------------
# 1. sober_time="" bugfix — used to return 422; now must return 200
# ------------------------------------------------------------------
class TestSoberTimeEmptyStringBug:
    def test_onboarding_accepts_empty_sober_time(self):
        email, tok, uid = _register_test_user()
        acts = _get_activities(tok)
        payload = _make_onboarding_payload(acts, sober_time="")
        r = requests.post(f"{API}/profile/onboarding", json=payload, headers=_hdr(tok), timeout=30)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        assert r.json().get("ok") is True

        # Verify persisted: sober_time stored as None
        me = requests.get(f"{API}/auth/me", headers=_hdr(tok), timeout=30).json()
        assert me.get("sober_time") in (None, "", "null")
        assert me.get("onboarding_complete") is True


# ------------------------------------------------------------------
# 2. New 'sin_problema' option + show_relationship persistence
# ------------------------------------------------------------------
class TestSinProblemaOnboarding:
    def test_onboarding_sin_problema_with_show_relationship(self):
        email, tok, uid = _register_test_user()
        acts = _get_activities(tok)
        payload = _make_onboarding_payload(
            acts,
            relationship_with_substances="sin_problema",
            show_relationship=True,
            sober_time="",
        )
        r = requests.post(f"{API}/profile/onboarding", json=payload, headers=_hdr(tok), timeout=30)
        assert r.status_code == 200, r.text

        me = requests.get(f"{API}/auth/me", headers=_hdr(tok), timeout=30).json()
        assert me.get("relationship_with_substances") == "sin_problema"
        assert me.get("show_relationship") is True

        # Public profile of self via /profile/{uid} should expose relationship_badge
        pub = requests.get(f"{API}/profile/{uid}", headers=_hdr(tok), timeout=30).json()
        assert pub.get("relationship_badge") == "sin_problema"
        assert pub.get("sober_time_badge") in (None,)


# ------------------------------------------------------------------
# 3. PATCH /profile/me updates relationship + toggle + can flip back
# ------------------------------------------------------------------
class TestPatchRelationship:
    def test_patch_to_sin_problema_and_back(self):
        email, tok, uid = _register_test_user()
        acts = _get_activities(tok)
        # Onboard first as sin_consumo
        payload = _make_onboarding_payload(acts, relationship_with_substances="sin_consumo")
        r = requests.post(f"{API}/profile/onboarding", json=payload, headers=_hdr(tok), timeout=30)
        assert r.status_code == 200, r.text

        # PATCH → sin_problema + show_relationship=true
        r = requests.patch(f"{API}/profile/me", json={
            "relationship_with_substances": "sin_problema",
            "show_relationship": True,
        }, headers=_hdr(tok), timeout=30)
        assert r.status_code == 200, r.text
        me = requests.get(f"{API}/auth/me", headers=_hdr(tok), timeout=30).json()
        assert me["relationship_with_substances"] == "sin_problema"
        assert me["show_relationship"] is True

        pub = requests.get(f"{API}/profile/{uid}", headers=_hdr(tok), timeout=30).json()
        assert pub["relationship_badge"] == "sin_problema"

        # Toggle show_relationship OFF → badge disappears
        r = requests.patch(f"{API}/profile/me", json={"show_relationship": False}, headers=_hdr(tok), timeout=30)
        assert r.status_code == 200
        pub = requests.get(f"{API}/profile/{uid}", headers=_hdr(tok), timeout=30).json()
        assert pub.get("relationship_badge") is None

        # Flip back to sin_consumo
        r = requests.patch(f"{API}/profile/me", json={
            "relationship_with_substances": "sin_consumo",
        }, headers=_hdr(tok), timeout=30)
        assert r.status_code == 200
        me = requests.get(f"{API}/auth/me", headers=_hdr(tok), timeout=30).json()
        assert me["relationship_with_substances"] == "sin_consumo"


# ------------------------------------------------------------------
# 4. clear_public relationship_badge visibility rules
# ------------------------------------------------------------------
class TestClearPublicBadge:
    def test_prefiero_no_decir_never_shows_badge(self):
        email, tok, uid = _register_test_user()
        acts = _get_activities(tok)
        payload = _make_onboarding_payload(
            acts,
            relationship_with_substances="prefiero_no_decir",
            show_relationship=True,  # even if user turns it on, must NOT leak
        )
        r = requests.post(f"{API}/profile/onboarding", json=payload, headers=_hdr(tok), timeout=30)
        assert r.status_code == 200, r.text
        pub = requests.get(f"{API}/profile/{uid}", headers=_hdr(tok), timeout=30).json()
        assert pub.get("relationship_badge") is None

    def test_show_relationship_false_hides_badge(self):
        email, tok, uid = _register_test_user()
        acts = _get_activities(tok)
        payload = _make_onboarding_payload(
            acts,
            relationship_with_substances="sin_problema",
            show_relationship=False,
        )
        r = requests.post(f"{API}/profile/onboarding", json=payload, headers=_hdr(tok), timeout=30)
        assert r.status_code == 200, r.text
        pub = requests.get(f"{API}/profile/{uid}", headers=_hdr(tok), timeout=30).json()
        assert pub.get("relationship_badge") is None


# ------------------------------------------------------------------
# 5. Global RequestValidationError → Spanish friendly handler
# ------------------------------------------------------------------
class TestFriendlyValidationHandler:
    def test_missing_field_returns_spanish(self):
        email, tok, uid = _register_test_user()
        acts = _get_activities(tok)
        payload = _make_onboarding_payload(acts)
        payload.pop("gender")  # missing required field
        r = requests.post(f"{API}/profile/onboarding", json=payload, headers=_hdr(tok), timeout=30)
        assert r.status_code == 422
        body = r.json()
        assert "detail" in body
        assert isinstance(body["detail"], str), f"detail must be a string, got {type(body['detail'])}: {body}"
        assert "Falta completar" in body["detail"]
        assert "género" in body["detail"].lower() or "genero" in body["detail"].lower()

    def test_invalid_literal_returns_spanish(self):
        email, tok, uid = _register_test_user()
        acts = _get_activities(tok)
        payload = _make_onboarding_payload(acts, relationship_with_substances="algo_invalido")
        r = requests.post(f"{API}/profile/onboarding", json=payload, headers=_hdr(tok), timeout=30)
        assert r.status_code == 422
        body = r.json()
        assert isinstance(body.get("detail"), str)
        assert "Elige una opción válida" in body["detail"]
        assert "relación" in body["detail"] or "relacion" in body["detail"]

    def test_missing_query_param_mode_returns_spanish(self):
        email, tok, uid = _register_test_user()
        acts = _get_activities(tok)
        # Complete onboarding first
        r = requests.post(f"{API}/profile/onboarding",
                          json=_make_onboarding_payload(acts),
                          headers=_hdr(tok), timeout=30)
        assert r.status_code == 200, r.text
        # Now hit /discover without required `mode`
        r = requests.get(f"{API}/discover", headers=_hdr(tok), timeout=30)
        assert r.status_code == 422
        body = r.json()
        assert isinstance(body.get("detail"), str), f"detail must be string, got: {body}"
        assert "Falta completar" in body["detail"]
        assert "mode" in body["detail"].lower() or "modo" in body["detail"].lower()


# ------------------------------------------------------------------
# 6. Regression: existing sin_consumo + show_sober_time=true still works
# ------------------------------------------------------------------
class TestRegressionSoberBadge:
    def test_demo_user_sober_badge_unaffected(self):
        # login demo1 (seeded with a sober badge)
        r = requests.post(f"{API}/auth/login", json={
            "email": "demo1@plansobrio.cl", "password": "Demo1234!",
        }, timeout=30)
        assert r.status_code == 200
        tok = r.json()["token"]
        me = r.json()["user"]
        uid = me["id"]
        pub = requests.get(f"{API}/profile/{uid}", headers=_hdr(tok), timeout=30).json()
        # If demo1 has show_sober_time+sober_time, badge should appear
        if me.get("show_sober_time") and me.get("sober_time"):
            assert pub.get("sober_time_badge") == me["sober_time"], pub


# ------------------------------------------------------------------
# 7. Cleanup — delete any test_iter24_* accounts we created
# ------------------------------------------------------------------
def teardown_module(module):
    """Best-effort cleanup — call /admin cleanup-tests if available."""
    try:
        tok = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        # Try common cleanup endpoint; ignore result
        for path in ("/admin/cleanup-tests", "/admin/users/cleanup-test", "/admin/test-cleanup"):
            try:
                requests.post(f"{API}{path}", headers=_hdr(tok), timeout=15)
            except Exception:
                pass
    except Exception:
        pass
