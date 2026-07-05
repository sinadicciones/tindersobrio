"""Iteration 9 — Emergent Google Auth backend surface + onboarding birthdate gate + regressions."""
import os
import time
import uuid
import jwt
import pytest
import requests
from datetime import datetime, timezone
from pymongo import MongoClient

# Load backend .env so we get JWT_SECRET / MONGO_URL / DB_NAME even when pytest is run bare
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://comunidad-sobria.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]

cli = MongoClient(MONGO_URL)
db = cli[DB_NAME]


def mint_jwt(uid: str, email: str) -> str:
    now = int(time.time())
    return jwt.encode({"sub": uid, "email": email, "iat": now, "exp": now + 3600}, JWT_SECRET, algorithm="HS256")


# --- Google session endpoint contract -----------------------------------
class TestGoogleSessionContract:
    def test_missing_header_returns_400(self):
        r = requests.post(f"{API}/auth/google/session", timeout=15)
        assert r.status_code == 400, r.text
        assert "X-Session-ID" in (r.json().get("detail") or "")

    def test_bogus_session_returns_401(self):
        r = requests.post(f"{API}/auth/google/session", headers={"X-Session-ID": "fake_test_xyz"}, timeout=15)
        assert r.status_code == 401, r.text
        assert "no válida" in (r.json().get("detail") or "").lower() or "invalida" in (r.json().get("detail") or "").lower()


# --- Link-by-email regression: mutate a real user to look Google-linked --
class TestLinkByEmailRegression:
    def test_register_then_link_then_login(self):
        email = f"test_link_{int(time.time())}@example.com"
        password = "Testpass1234!"
        r = requests.post(f"{API}/auth/register", json={
            "email": email, "password": password, "birthdate": "1990-01-01"
        }, timeout=20)
        assert r.status_code in (200, 201), r.text
        uid = r.json()["user"]["id"]
        # Patch the user to look Google-linked (simulating a link event)
        db.users.update_one({"id": uid}, {"$set": {"google_name": "Test Link", "auth_providers": ["password", "google"]}})
        doc = db.users.find_one({"id": uid})
        assert doc.get("password_hash"), "password_hash must remain intact for linked user"
        assert "google" in doc.get("auth_providers", [])
        # Email/password login must still work
        lr = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
        assert lr.status_code == 200, lr.text
        assert lr.json()["user"]["email"] == email
        # Cleanup
        db.users.delete_one({"id": uid})


# --- Onboarding birthdate gate for Google-only users --------------------
class TestOnboardingBirthdateGate:
    def _create_google_user(self, birthdate=None):
        uid = str(uuid.uuid4())
        email = f"test_gauth_{int(time.time())}_{uid[:6]}@example.com"
        db.users.insert_one({
            "id": uid, "email": email, "password_hash": None,
            "google_name": "G User", "role": "user", "status": "active",
            "onboarding_complete": False, "auth_providers": ["google"],
            "birthdate": birthdate, "is_demo": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        return uid, email

    def _payload(self, **overrides):
        p = {
            "alias": "TestUser",
            "gender": "femenino",
            "comuna": "Providencia",
            "modes": ["amistad"],
            "interested_genders": ["femenino", "masculino"],
            "age_min": 18, "age_max": 99,
            "relationship_with_substances": "sin_consumo",
            "sober_time": ">1a",
            "show_sober_time": True,
            "favorite_activities": ["yoga", "cafe", "cine"],
            "photos": [],
            "prompts": [{"q": "Un plan ideal", "a": "Un cafe conversando al sol"}],
            "accepted_rules": True,
        }
        p.update(overrides)
        return p

    def test_onboarding_rejects_missing_birthdate(self):
        uid, email = self._create_google_user(birthdate=None)
        try:
            token = mint_jwt(uid, email)
            r = requests.post(f"{API}/profile/onboarding",
                              json=self._payload(),
                              headers={"Authorization": f"Bearer {token}"}, timeout=20)
            assert r.status_code == 400, r.text
            det = (r.json().get("detail") or "").lower()
            assert "fecha" in det or "18" in det
        finally:
            db.users.delete_one({"id": uid})

    def test_onboarding_rejects_underage(self):
        uid, email = self._create_google_user(birthdate=None)
        try:
            token = mint_jwt(uid, email)
            r = requests.post(f"{API}/profile/onboarding",
                              json=self._payload(birthdate="2015-01-01"),
                              headers={"Authorization": f"Bearer {token}"}, timeout=20)
            assert r.status_code == 400, r.text
            assert "18" in (r.json().get("detail") or "")
        finally:
            db.users.delete_one({"id": uid})

    def test_onboarding_success_with_valid_dob(self):
        uid, email = self._create_google_user(birthdate=None)
        try:
            token = mint_jwt(uid, email)
            r = requests.post(f"{API}/profile/onboarding",
                              json=self._payload(birthdate="1993-05-10"),
                              headers={"Authorization": f"Bearer {token}"}, timeout=20)
            assert r.status_code == 200, r.text
            doc = db.users.find_one({"id": uid})
            assert doc["birthdate"] == "1993-05-10"
            assert doc["onboarding_complete"] is True
        finally:
            db.users.delete_one({"id": uid})


# --- Regression: existing email/password + admin login ------------------
class TestRegressions:
    def test_admin_login(self):
        r = requests.post(f"{API}/auth/login", json={
            "email": "contacto@sinadicciones.org", "password": "Jodorowsky100"
        }, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["user"]["role"] == "admin"

    def test_demo_login_and_me(self):
        r = requests.post(f"{API}/auth/login", json={
            "email": "demo1@plansobrio.cl", "password": "Demo1234!"
        }, timeout=15)
        assert r.status_code == 200, r.text
        token = r.json()["token"]
        m = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=15)
        assert m.status_code == 200
        assert m.json()["email"] == "demo1@plansobrio.cl"

    def test_discover_regression(self):
        r = requests.post(f"{API}/auth/login", json={
            "email": "demo1@plansobrio.cl", "password": "Demo1234!"
        }, timeout=15)
        token = r.json()["token"]
        d = requests.get(f"{API}/discover?mode=amistad", headers={"Authorization": f"Bearer {token}"}, timeout=20)
        assert d.status_code == 200, d.text
        data = d.json()
        assert isinstance(data, list)

    def test_patch_profile_regression(self):
        r = requests.post(f"{API}/auth/login", json={
            "email": "demo1@plansobrio.cl", "password": "Demo1234!"
        }, timeout=15).json()
        token = r["token"]
        # No-op patch
        p = requests.patch(f"{API}/profile/me", json={"show_sober_time": True},
                          headers={"Authorization": f"Bearer {token}"}, timeout=15)
        assert p.status_code == 200, p.text
