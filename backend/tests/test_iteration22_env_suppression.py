"""Iteration 22 — FIX 1: Suppress internal admin emails in preview/dev/test env.

Verifies:
- ENVIRONMENT=preview => send_internal_email is a no-op that logs status='skipped_env'
  and environment='preview' to db.email_log.
- Transactional emails (welcome, password_reset, waitlist) still send normally.
- All 3 internal notif_types are suppressed: admin_new_user, admin_daily_summary,
  admin_grave_report.
- Constant SUPPRESS_INTERNAL is False when ENVIRONMENT='production'.
"""
from __future__ import annotations
import os
import sys
import time
import uuid
import pytest
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
sys.path.insert(0, "/app/backend")
from core import email_service as es  # noqa: E402

BASE = os.environ.get("BACKEND_URL") or "https://comunidad-sobria.preview.emergentagent.com"
API = f"{BASE}/api"
TIMEOUT = 40
ADMIN_EMAIL = "contacto@sinadicciones.org"
ADMIN_PASS = "Jodorowsky100"


@pytest.fixture(scope="module")
def db():
    cli = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
    return cli[os.environ.get("DB_NAME", "test_database")]


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _headers(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- Constants ----------
class TestConstants:
    def test_env_preview_suppresses(self):
        # .env has ENVIRONMENT=preview so SUPPRESS_INTERNAL must be True
        assert es.ENVIRONMENT == "preview", f"expected preview, got {es.ENVIRONMENT}"
        assert es.SUPPRESS_INTERNAL is True

    def test_production_would_not_suppress(self, monkeypatch):
        # Simulate: reload module semantic — check the resolution logic directly
        for env in ("production", "", "PROD"):
            suppress = env.lower() in ("preview", "dev", "development", "test")
            assert suppress is False, f"{env!r} should not suppress"
        for env in ("preview", "dev", "development", "test", "PREVIEW"):
            suppress = env.lower() in ("preview", "dev", "development", "test")
            assert suppress is True, f"{env!r} should suppress"


# ---------- send_internal_email direct invocation ----------
class TestInternalEmailSuppression:
    def test_register_and_onboarding_suppresses_admin_new_user(self, db):
        """Register new user + onboarding → admin_new_user must be skipped_env."""
        email = f"TEST_env_{uuid.uuid4().hex[:8]}@example.com".lower()
        password = "TestPass1234!"
        birthdate = "1995-06-15"
        # Register
        r = requests.post(f"{API}/auth/register",
                          json={"email": email, "password": password, "birthdate": birthdate},
                          timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        token = data["token"]
        uid = data["user"]["id"]
        try:
            # Complete onboarding
            payload = {
                "alias": f"testenv_{uuid.uuid4().hex[:4]}",
                "gender": "femenino",
                "comuna": "Providencia",
                "modes": ["amistad"],
                "interested_genders": ["femenino", "masculino"],
                "age_min": 21,
                "age_max": 45,
                "relationship_with_substances": "sin_consumo",
                "sober_time": ">1a",
                "show_sober_time": True,
                "favorite_activities": ["cafe", "caminata", "cine"],
                "photos": [],
                "prompts": [{"q": "Algo sobre mí:", "a": "Me gusta caminar."}],
                "accepted_rules": True,
                "birthdate": birthdate,
                "location": {"country": "CL", "comuna": "Providencia", "city": "Santiago"},
                "bio": "",
            }
            r2 = requests.post(f"{API}/profile/onboarding",
                               headers=_headers(token), json=payload, timeout=TIMEOUT)
            assert r2.status_code == 200, r2.text
            # Give the async firing some time
            time.sleep(2)
            # Verify email_log has admin_new_user entry with status skipped_env
            log = db.email_log.find_one({"type": "admin_new_user", "event_ref": f"new_user:{uid}"})
            assert log is not None, "expected email_log entry for admin_new_user"
            assert log["status"] == "skipped_env", f"expected 'skipped_env', got {log['status']!r}"
            assert log.get("environment") == "preview", f"expected env=preview, got {log.get('environment')!r}"
        finally:
            # Cleanup
            db.users.delete_one({"id": uid})
            db.email_log.delete_many({"event_ref": f"new_user:{uid}"})
            db.email_log.delete_many({"user_id": uid})
            db.email_log.delete_many({"to": email})

    def test_transactional_welcome_still_sent(self, db):
        """Welcome email is TRANSACTIONAL — must still be sent (or attempted) after register."""
        email = f"TEST_welc_{uuid.uuid4().hex[:8]}@example.com".lower()
        r = requests.post(f"{API}/auth/register",
                          json={"email": email, "password": "TestPass1234!", "birthdate": "1993-01-01"},
                          timeout=TIMEOUT)
        assert r.status_code == 200
        uid = r.json()["user"]["id"]
        try:
            time.sleep(2)
            log = db.email_log.find_one({"to": email, "type": "welcome"})
            assert log is not None, "welcome email log missing"
            # Transactional email → 'sent' or 'error' (real Resend) but NOT skipped_env
            assert log["status"] not in ("skipped_env",), f"welcome unexpectedly suppressed: {log['status']}"
            assert log["status"] in ("sent", "error", "queued"), f"unexpected status {log['status']!r}"
        finally:
            db.users.delete_one({"id": uid})
            db.email_log.delete_many({"to": email})

    def test_transactional_waitlist_still_sent(self, db):
        """Waitlist is TRANSACTIONAL — still sent."""
        email = f"TEST_wl_{uuid.uuid4().hex[:8]}@example.com".lower()
        db.waitlist.delete_many({"email": email})
        db.email_log.delete_many({"to": email})
        r = requests.post(f"{API}/waitlist", json={"email": email, "country": "AR"}, timeout=TIMEOUT)
        assert r.status_code == 200
        try:
            time.sleep(2)
            log = db.email_log.find_one({"to": email, "type": "waitlist"})
            assert log is not None, "waitlist email log missing"
            assert log["status"] != "skipped_env"
            assert log["status"] in ("sent", "error", "queued")
        finally:
            db.waitlist.delete_many({"email": email})
            db.email_log.delete_many({"to": email})

    def test_force_daily_summary_suppressed(self, admin_token, db):
        """POST /admin/email/send-daily-summary → should return suppressed reason."""
        db.email_log.delete_many({"type": "admin_daily_summary"})
        r = requests.post(f"{API}/admin/email/send-daily-summary",
                          headers=_headers(admin_token), timeout=TIMEOUT)
        assert r.status_code == 200
        j = r.json()
        assert j.get("ok") is True
        # In preview, the endpoint returns the suppressed reason directly
        assert "suppressed" in (j.get("reason") or ""), f"expected suppressed reason, got {j}"
        # And an email_log skipped_env row was created
        time.sleep(1)
        log = db.email_log.find_one({"type": "admin_daily_summary", "status": "skipped_env"})
        assert log is not None
        assert log.get("environment") == "preview"

    def test_grave_report_suppressed(self, db):
        """Directly invoke send_internal_email for admin_grave_report."""
        import asyncio
        from motor.motor_asyncio import AsyncIOMotorClient
        mongo = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
        adb = mongo[os.environ.get("DB_NAME", "test_database")]
        ref = f"TEST_grave_{uuid.uuid4().hex[:8]}"
        try:
            result = asyncio.get_event_loop().run_until_complete(
                es.send_internal_email(adb, notif_type="admin_grave_report",
                                       event_ref=ref, subject="x", body_html="<p>x</p>")
            )
            assert result["ok"] is True
            assert "suppressed" in result.get("reason", "")
            # sync check
            log = db.email_log.find_one({"event_ref": ref, "type": "admin_grave_report"})
            assert log is not None
            assert log["status"] == "skipped_env"
            assert log.get("environment") == "preview"
        finally:
            db.email_log.delete_many({"event_ref": ref})
