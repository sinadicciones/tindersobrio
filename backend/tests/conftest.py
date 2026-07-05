"""Shared pytest fixtures for the PlanSobrio test suite."""
import pytest
import requests
import os

BASE = os.environ.get("BACKEND_URL", "http://localhost:8001")
API = f"{BASE}/api"


def _admin_token():
    r = requests.post(f"{API}/auth/login", json={
        "email": "contacto@sinadicciones.org",
        "password": "Jodorowsky100",
    }, timeout=30)
    r.raise_for_status()
    return r.json()["token"]


@pytest.fixture(scope="function", autouse=False)
def reset_demo_state():
    """Reset daily 'like' quota + recent messages for demo1 & demo2 via direct Mongo.

    Falls back to a no-op if mongo isn't reachable from the test runner.
    """
    try:
        from pymongo import MongoClient
        cli = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
        db = cli[os.environ.get("DB_NAME", "test_database")]
        demo_ids = [u["id"] for u in db.users.find({"email": {"$in": ["demo1@plansobrio.cl", "demo2@plansobrio.cl"]}}, {"id": 1})]
        if demo_ids:
            # Clear today's likes so quota resets
            from datetime import datetime, timezone
            today = datetime.now(timezone.utc).date().isoformat()
            db.likes.delete_many({"from_user": {"$in": demo_ids}, "date": today})
            # Clear last minute of messages so rate limit resets
            from datetime import timedelta
            since = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
            db.messages.delete_many({"from_user": {"$in": demo_ids}, "created_at": {"$gt": since}})
    except Exception:
        pass
    yield
