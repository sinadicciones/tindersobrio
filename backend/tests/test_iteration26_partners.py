"""Iteration 26: /api/partners (Convenios/B2B landing) tests."""
import os
import time
import uuid
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "https://comunidad-sobria.preview.emergentagent.com"
API = f"{BASE_URL}/api"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


@pytest.fixture(scope="module")
def db():
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]


def _payload(**over):
    p = {
        "contact_name": "QA Tester",
        "company": "QA Company TEST_",
        "comuna": "Providencia",
        "email": f"qa.partner+{uuid.uuid4().hex[:8]}@example.com",
        "whatsapp": "+56912345678",
        "offer_type": "cafe_restaurante_saludable",
        "offer_text": "Descuento 10% para miembros PlanSobrio en todas las bebidas.",
        "accept_public": True,
        "website": "",
    }
    p.update(over)
    return p


# --- Happy path ---
def test_create_partner_success(db):
    body = _payload()
    r = requests.post(f"{API}/partners", json=body, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["ok"] is True
    assert "id" in data and len(data["id"]) > 0

    doc = db.partners.find_one({"id": data["id"]})
    assert doc is not None
    assert doc["status"] == "nuevo"
    assert doc["email"] == body["email"].lower()
    assert doc["offer_type_label"] == "Café / Restaurante saludable"
    assert "client_ip" in doc

    # Cleanup
    db.partners.delete_one({"id": data["id"]})


# --- Honeypot ---
def test_honeypot_silently_drops(db):
    before = db.partners.count_documents({})
    body = _payload(website="http://spam.example.com", email=f"honey+{uuid.uuid4().hex[:6]}@example.com")
    r = requests.post(f"{API}/partners", json=body, timeout=15)
    assert r.status_code == 200
    assert r.json() == {"ok": True}
    after = db.partners.count_documents({})
    assert after == before, "Honeypot should not create doc"


# --- Validation ---
def test_invalid_offer_type():
    body = _payload(offer_type="fake_type", email=f"inv+{uuid.uuid4().hex[:6]}@example.com")
    r = requests.post(f"{API}/partners", json=body, timeout=15)
    assert r.status_code == 422


def test_invalid_whatsapp():
    body = _payload(whatsapp="123", email=f"invw+{uuid.uuid4().hex[:6]}@example.com")
    r = requests.post(f"{API}/partners", json=body, timeout=15)
    assert r.status_code == 422


def test_invalid_email():
    body = _payload(email="not-an-email")
    r = requests.post(f"{API}/partners", json=body, timeout=15)
    assert r.status_code == 422


def test_empty_required_fields():
    body = _payload(contact_name="", email=f"empty+{uuid.uuid4().hex[:6]}@example.com")
    r = requests.post(f"{API}/partners", json=body, timeout=15)
    assert r.status_code == 422


# --- Rate limit ---
def test_rate_limit_same_email(db):
    email = f"rl+{uuid.uuid4().hex[:8]}@example.com"
    body = _payload(email=email)
    r1 = requests.post(f"{API}/partners", json=body, timeout=15)
    assert r1.status_code == 200
    id1 = r1.json().get("id")

    r2 = requests.post(f"{API}/partners", json=body, timeout=15)
    assert r2.status_code == 429
    assert "Ya recibimos" in r2.json().get("detail", "")

    # cleanup
    if id1:
        db.partners.delete_one({"id": id1})


# --- Email log side effects ---
def test_email_log_entries(db):
    email = f"el+{uuid.uuid4().hex[:8]}@example.com"
    body = _payload(email=email)
    r = requests.post(f"{API}/partners", json=body, timeout=25)
    assert r.status_code == 200
    pid = r.json()["id"]

    # emails are awaited in-endpoint, they should exist immediately
    time.sleep(1.5)

    confirm = db.email_log.find_one({"type": "partner_confirmation", "to": email})
    assert confirm is not None, "partner_confirmation email log missing"
    assert confirm.get("status") in ("sent", "queued", "suppressed", "failed"), confirm.get("status")

    admin = db.email_log.find_one({"type": "admin_new_partner", "event_ref": f"partner_new:{pid}"})
    assert admin is not None, "admin_new_partner email log missing"
    assert admin.get("to") == "nelson@sinadicciones.org"
    # bypass_env_suppression should keep this from being suppressed
    assert admin.get("status") == "sent", f"expected sent, got {admin.get('status')}"

    # Also assert confirmation was sent
    assert confirm.get("status") == "sent", f"confirmation expected sent, got {confirm.get('status')}"

    # cleanup
    db.partners.delete_one({"id": pid})


# --- Sitemap / SEO ---
def test_sitemap_includes_convenios():
    r = requests.get(f"{BASE_URL}/sitemap.xml", timeout=15)
    assert r.status_code == 200
    assert "/convenios" in r.text


# --- /aliados redirect (frontend route — served by React SPA, check status) ---
def test_aliados_route_reachable():
    r = requests.get(f"{BASE_URL}/aliados", timeout=15, allow_redirects=False)
    # SPA returns 200 HTML; the redirect happens client-side via <Navigate>
    assert r.status_code in (200, 301, 302)
