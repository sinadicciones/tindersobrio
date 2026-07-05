"""Emergent object storage helpers (init + put + get)."""
import os
import logging
from typing import Optional

import requests
from fastapi import HTTPException

_STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
_state = {"key": None}
_log = logging.getLogger("plansobrio.storage")


def _emergent_key() -> str:
    return os.environ.get("EMERGENT_LLM_KEY", "")


def init_storage() -> Optional[str]:
    if _state["key"]:
        return _state["key"]
    key = _emergent_key()
    if not key:
        return None
    try:
        r = requests.post(f"{_STORAGE_URL}/init", json={"emergent_key": key}, timeout=30)
        r.raise_for_status()
        _state["key"] = r.json()["storage_key"]
        return _state["key"]
    except Exception as e:
        _log.error("storage init failed: %s", e)
        return None


def _headers() -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage no disponible")
    return {"X-Storage-Key": key}


def put_object(path: str, data: bytes, content_type: str) -> dict:
    r = requests.put(f"{_STORAGE_URL}/objects/{path}", headers={**_headers(), "Content-Type": content_type}, data=data, timeout=120)
    if r.status_code == 403:
        _state["key"] = None
        r = requests.put(f"{_STORAGE_URL}/objects/{path}", headers={**_headers(), "Content-Type": content_type}, data=data, timeout=120)
    r.raise_for_status()
    return r.json()


def get_object(path: str):
    r = requests.get(f"{_STORAGE_URL}/objects/{path}", headers=_headers(), timeout=60)
    if r.status_code == 403:
        _state["key"] = None
        r = requests.get(f"{_STORAGE_URL}/objects/{path}", headers=_headers(), timeout=60)
    if r.status_code == 404:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")
