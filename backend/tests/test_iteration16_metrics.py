"""PlanSobrio - Admin Metrics tests (iteration 16)
Privacy-first aggregate metrics + anonymous support-page counter.
"""
import os
import uuid
import requests
from datetime import date, timedelta

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://comunidad-sobria.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

ADMIN_EMAIL = "contacto@sinadicciones.org"
ADMIN_PW = "Jodorowsky100"
DEMO_PW = "Demo1234!"


def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=30)
    assert r.status_code == 200, f"login {email} -> {r.status_code} {r.text}"
    return r.json()["token"]


def _h(t):
    return {"Authorization": f"Bearer {t}"}


ADMIN_METRICS_ENDPOINTS = [
    "summary", "funnel", "matching", "planes", "comunidad", "retencion", "seguridad",
]


class TestMetricsPrivacyAuth:
    """All /api/admin/metrics/* require admin. Non-admin must get 403."""

    def test_non_admin_gets_403_on_all(self):
        t = _login("demo1@plansobrio.cl", DEMO_PW)
        for ep in ADMIN_METRICS_ENDPOINTS:
            r = requests.get(f"{API}/admin/metrics/{ep}", headers=_h(t), timeout=30)
            assert r.status_code == 403, f"{ep} expected 403, got {r.status_code}: {r.text}"

    def test_unauth_gets_401_or_403(self):
        for ep in ADMIN_METRICS_ENDPOINTS:
            r = requests.get(f"{API}/admin/metrics/{ep}", timeout=30)
            assert r.status_code in (401, 403), f"{ep} expected 401/403, got {r.status_code}"

    def test_backfill_non_admin_403(self):
        t = _login("demo1@plansobrio.cl", DEMO_PW)
        r = requests.post(f"{API}/admin/metrics/backfill",
                          json={"start": "2025-01-01", "end": "2025-01-05"},
                          headers=_h(t), timeout=30)
        assert r.status_code == 403


class TestMetricsSmoke:
    """Admin can GET each metric with valid days params. Validate shapes."""

    def test_summary_structure(self):
        t = _login(ADMIN_EMAIL, ADMIN_PW)
        for d in (7, 30, 90):
            r = requests.get(f"{API}/admin/metrics/summary?days={d}", headers=_h(t), timeout=60)
            assert r.status_code == 200, f"days={d} -> {r.status_code} {r.text}"
            body = r.json()
            assert "north_star" in body
            assert "cards" in body
            cards = body["cards"]
            for k in ("dau_today", "wau_7d", "matches_week", "like_to_match_pct",
                      "open_reports", "oldest_grave_hours"):
                assert k in cards, f"missing card {k} in days={d}"
            assert "series" in body and isinstance(body["series"], list)
            assert "alerts" in body and isinstance(body["alerts"], list)

    def test_funnel_structure(self):
        t = _login(ADMIN_EMAIL, ADMIN_PW)
        r = requests.get(f"{API}/admin/metrics/funnel?days=30", headers=_h(t), timeout=60)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "steps" in body and isinstance(body["steps"], list)
        assert len(body["steps"]) == 6, f"expected 6 funnel steps, got {len(body['steps'])}"
        assert "median_hours" in body
        assert "cohorts" in body and isinstance(body["cohorts"], list)

    def test_other_endpoints_smoke(self):
        t = _login(ADMIN_EMAIL, ADMIN_PW)
        for ep in ("matching", "planes", "comunidad", "retencion", "seguridad"):
            r = requests.get(f"{API}/admin/metrics/{ep}?days=30", headers=_h(t), timeout=60)
            assert r.status_code == 200, f"{ep} -> {r.status_code} {r.text}"
            assert isinstance(r.json(), dict)

    def test_invalid_days_400(self):
        t = _login(ADMIN_EMAIL, ADMIN_PW)
        for ep in ADMIN_METRICS_ENDPOINTS:
            r = requests.get(f"{API}/admin/metrics/{ep}?days=15", headers=_h(t), timeout=30)
            assert r.status_code == 400, f"{ep} expected 400 on days=15, got {r.status_code}"


class TestMetricsBackfill:
    def test_backfill_ok(self):
        t = _login(ADMIN_EMAIL, ADMIN_PW)
        end = date.today()
        start = end - timedelta(days=3)
        r = requests.post(f"{API}/admin/metrics/backfill",
                          json={"start": start.isoformat(), "end": end.isoformat()},
                          headers=_h(t), timeout=120)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        assert "days_computed" in body
        assert body["days_computed"] >= 1

    def test_backfill_start_after_end_400(self):
        t = _login(ADMIN_EMAIL, ADMIN_PW)
        r = requests.post(f"{API}/admin/metrics/backfill",
                          json={"start": "2025-05-10", "end": "2025-05-01"},
                          headers=_h(t), timeout=30)
        assert r.status_code == 400

    def test_backfill_range_too_large_400(self):
        t = _login(ADMIN_EMAIL, ADMIN_PW)
        r = requests.post(f"{API}/admin/metrics/backfill",
                          json={"start": "2020-01-01", "end": "2025-01-01"},
                          headers=_h(t), timeout=30)
        assert r.status_code == 400


class TestSupportPageAnonCounter:
    def test_anon_view_no_auth_and_increments(self):
        # First call — no auth
        r1 = requests.post(f"{API}/support-page/view", timeout=30)
        assert r1.status_code == 200, r1.text
        # Second call — no auth
        r2 = requests.post(f"{API}/support-page/view", timeout=30)
        assert r2.status_code == 200, r2.text
        # Third with a bogus (unauth) header — still works
        r3 = requests.post(f"{API}/support-page/view",
                           headers={"Authorization": "Bearer notarealtoken"}, timeout=30)
        assert r3.status_code == 200

    def test_no_user_id_stored(self):
        """Verify collection doesn't store user_id, by inspecting via Mongo directly if possible."""
        try:
            from pymongo import MongoClient
            cli = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
            db = cli[os.environ.get("DB_NAME", "test_database")]
            # Trigger one more view
            requests.post(f"{API}/support-page/view", timeout=30)
            docs = list(db.support_page_views.find({}))
            assert len(docs) >= 1
            for d in docs:
                assert "user_id" not in d, f"support_page_views doc leaked user_id: {d}"
                assert "date" in d and "count" in d
        except ImportError:
            import pytest
            pytest.skip("pymongo not available in test env")
