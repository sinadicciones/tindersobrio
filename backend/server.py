from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import random
import logging
import bcrypt
import jwt
import httpx
import requests
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from typing import List, Optional, Literal, Dict, Any

import re
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File, Header, Query
from fastapi.responses import Response as FastAPIResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

from core.storage import init_storage, put_object, get_object
from core.seed_data import SEED_ACTIVITIES, SEED_GROUPS, DEMO_PROFILES, DEMO_PHOTOS, DEMO_PROMPTS
from core.geo_seed import (
    RM_CENTROIDS, SANTIAGO_CENTER, COUNTRIES_SEED, HELPLINES_SEED_CL,
    city_coords_for, default_country_coords,
)
from core import metrics as metrics_mod
from core import email_service as email_svc
from datetime import date as date_cls
import asyncio

# ------------------------------------------------------------------
# Config
# ------------------------------------------------------------------
JWT_ALGORITHM = "HS256"
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_AUTH_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
APP_NAME = os.environ.get("APP_NAME", "plansobrio")
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="PlanSobrio API")
api = APIRouter(prefix="/api")

logger = logging.getLogger("plansobrio")
logging.basicConfig(level=logging.INFO)

# ------------------------------------------------------------------
# Storage (see core/storage.py)
# ------------------------------------------------------------------

# ------------------------------------------------------------------
# Auth helpers
# ------------------------------------------------------------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def create_access_token(uid: str, email: str) -> str:
    payload = {"sub": uid, "email": email, "type": "access", "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_user_by_id(uid: str) -> Optional[dict]:
    doc = await db.users.find_one({"id": uid}, {"password_hash": 0})
    return doc

async def current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")
    try:
        payload = jwt.decode(token, jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sesión expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
    user = await get_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no existe")
    if user.get("status") == "banned":
        raise HTTPException(status_code=403, detail="account_banned")
    if user.get("status") == "suspended":
        until = user.get("suspended_until")
        if until:
            try:
                until_dt = datetime.fromisoformat(until)
                if until_dt > datetime.now(timezone.utc):
                    raise HTTPException(status_code=403, detail=f"account_suspended:{until}")
                else:
                    await db.users.update_one({"id": user["id"]}, {"$set": {"status": "active"}, "$unset": {"suspended_until": ""}})
            except HTTPException:
                raise
            except Exception:
                pass
    user.pop("_id", None)
    return user

async def require_admin(user: dict = Depends(current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores")
    return user

def set_auth_cookie(response: Response, token: str):
    response.set_cookie(key="access_token", value=token, httponly=True, secure=True, samesite="none", max_age=7*24*3600, path="/")

def zodiac_from_birthdate(birthdate_str: str) -> Optional[str]:
    """Return the western zodiac sign for a birthdate (ISO date string)."""
    if not birthdate_str:
        return None
    try:
        bd = datetime.fromisoformat(birthdate_str).date()
    except Exception:
        return None
    m, d = bd.month, bd.day
    signs = [
        ("Capricornio", (12, 22), (1, 19)),
        ("Acuario",     (1, 20),  (2, 18)),
        ("Piscis",      (2, 19),  (3, 20)),
        ("Aries",       (3, 21),  (4, 19)),
        ("Tauro",       (4, 20),  (5, 20)),
        ("Géminis",     (5, 21),  (6, 20)),
        ("Cáncer",      (6, 21),  (7, 22)),
        ("Leo",         (7, 23),  (8, 22)),
        ("Virgo",       (8, 23),  (9, 22)),
        ("Libra",       (9, 23),  (10, 22)),
        ("Escorpio",    (10, 23), (11, 21)),
        ("Sagitario",   (11, 22), (12, 21)),
    ]
    for name, start, end in signs:
        s_m, s_d = start
        e_m, e_d = end
        if s_m == e_m:
            if m == s_m and s_d <= d <= e_d:
                return name
        elif s_m < e_m:
            if (m == s_m and d >= s_d) or (m == e_m and d <= e_d) or (s_m < m < e_m):
                return name
        else:  # wraps year (Capricornio)
            if (m == s_m and d >= s_d) or (m == e_m and d <= e_d) or (m > s_m) or (m < e_m):
                return name
    return None


def _is_amor_visible(target: dict, viewer: Optional[dict]) -> bool:
    """Amor mode is only visible on a public profile to viewers who also have
    amor active AND match the mutual gender/age preferences of the target."""
    if not viewer:
        return False
    if "amor" not in (viewer.get("modes") or []):
        return False
    if "amor" not in (target.get("modes") or []):
        return False
    v_gender = viewer.get("gender")
    t_gender = target.get("gender")
    v_interested = viewer.get("interested_genders") or []
    t_interested = target.get("interested_genders") or []
    if v_interested and t_gender not in v_interested:
        return False
    if t_interested and v_gender not in t_interested:
        return False
    v_age = calc_age(viewer.get("birthdate"))
    t_age = calc_age(target.get("birthdate"))
    if v_age is None or t_age is None:
        return False
    if not (viewer.get("age_min", 18) <= t_age <= viewer.get("age_max", 99)):
        return False
    if not (target.get("age_min", 18) <= v_age <= target.get("age_max", 99)):
        return False
    return True


def clear_public(user: dict, viewer: Optional[dict] = None) -> dict:
    """Public view of a user - hides email, private fields.

    Coordinates are NEVER included; distance is added by callers via _distance_km.
    New (Feb 2026 – onboarding liviano): optional detail fields (height_cm,
    has_children, zodiac) are shown iff their visibility switch is on.
    `modes` are only exposed when `show_modes` is on (default True); the "amor"
    mode is additionally filtered out unless the viewer is amor-compatible.
    """
    loc = user.get("location") or {}
    show_modes = user.get("show_modes", True)
    modes = list(user.get("modes", []))
    if not show_modes:
        modes = []
    elif "amor" in modes and not _is_amor_visible(user, viewer):
        modes = [m for m in modes if m != "amor"]
    out = {
        "id": user["id"],
        "alias": user.get("alias"),
        "age": calc_age(user.get("birthdate")),
        "comuna": user.get("comuna"),
        "city": loc.get("city") or user.get("comuna"),
        "country": loc.get("country") or "CL",
        "gender": user.get("gender"),
        "modes": modes,
        "photos": user.get("photos", []),
        "prompts": user.get("prompts", []),
        "favorite_activities": user.get("favorite_activities", []),
        "sober_time_badge": user.get("sober_time") if user.get("show_sober_time") else None,
        "bio": user.get("bio") or "",
    }
    if user.get("show_height") and user.get("height_cm"):
        out["height_cm"] = user["height_cm"]
    hc = user.get("has_children")
    if user.get("show_children", True) and hc and hc != "prefiero_no_decir":
        out["has_children"] = hc
    if user.get("show_zodiac") and user.get("zodiac"):
        out["zodiac"] = user["zodiac"]
    if user.get("_distance_km") is not None:
        out["distance_km"] = user["_distance_km"]
    return out

def round_coords(lng: float, lat: float) -> list:
    return [round(float(lng), 2), round(float(lat), 2)]

def calc_age(birthdate_str: str) -> Optional[int]:
    if not birthdate_str:
        return None
    try:
        bd = datetime.fromisoformat(birthdate_str).date()
        today = datetime.now(timezone.utc).date()
        return today.year - bd.year - ((today.month, today.day) < (bd.month, bd.day))
    except Exception:
        return None

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# Match REAL URLs / domains only. Requires:
#   1) http(s):// prefix, OR
#   2) www.<something>, OR
#   3) At least 2 alphanumeric chars, a dot, a real TLD, and a word boundary.
# This avoids false positives like "vamos.com amigos" being flagged when the
# user just missed a space, while still blocking "misitio.com" or "instagram.com".
BIO_URL_RE = re.compile(
    r"(?:https?://[^\s]+"
    r"|\bwww\.[a-z0-9-]{2,}"
    r"|\b[a-z0-9-]{3,}\.(?:com|cl|net|org|io|co|app|es|ar|mx|pe|uy|xyz|info)\b)",
    re.IGNORECASE,
)
BIO_PHONE_RE = re.compile(r"(?:\+?\d[\s\-\.]?){6,}")


def validate_bio(bio: str) -> str:
    """Return the cleaned bio or raise 400.

    Rules: max 300 chars, no URLs, no phone-like sequences (6+ digits with optional
    separators). This prevents using bio to leak contact info before matching.
    """
    text = (bio or "").strip()
    if not text:
        return ""
    if len(text) > 300:
        raise HTTPException(status_code=400, detail="Tu 'Sobre mí' no puede pasar de 300 caracteres")
    if BIO_URL_RE.search(text):
        raise HTTPException(status_code=400, detail="Guarda los links para después del match ✨")
    if BIO_PHONE_RE.search(text):
        raise HTTPException(status_code=400, detail="Guarda los teléfonos para después del match ✨")
    return text

def build_location_doc(country: str, comuna: Optional[str], city: Optional[str], coords: Optional[list]) -> dict:
    """Build a normalized `location` doc.

    Prefers explicit coords (from GPS/IP), falls back to comuna/city centroid,
    and finally to the country default centroid. Returns None only if we truly
    cannot resolve anything (unknown country + no coords).

    PRIVACY: stored coords are rounded to 2 decimals (~1km grid) so an exact
    home address can never be reconstructed even if the DB leaks.
    """
    country = (country or "CL").upper()
    resolved = None
    if coords and len(coords) == 2:
        resolved = round_coords(float(coords[0]), float(coords[1]))
    if resolved is None and comuna:
        resolved = city_coords_for(country, comuna)
    if resolved is None and city:
        resolved = city_coords_for(country, city)
    if resolved is None:
        resolved = default_country_coords(country)
    if resolved is None:
        return None
    return {
        "country": country,
        "city": city or comuna,
        "comuna": comuna,
        "coords": {"type": "Point", "coordinates": resolved},
    }


def bucket_distance_km(km: float) -> int:
    """Round distance to a coarse bucket to prevent triangulation.

    - <5 km  -> 5
    - 5..50  -> next multiple of 5
    - >50    -> 50 (frontend shows "50+")
    """
    if km <= 0:
        return 5
    if km <= 5:
        return 5
    if km >= 50:
        return 50
    # Round UP to next multiple of 5 (so ~7 km never leaks as "6").
    import math
    return int(math.ceil(km / 5.0) * 5)

# ------------------------------------------------------------------
# Models
# ------------------------------------------------------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    birthdate: str  # ISO date

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class LocationIn(BaseModel):
    country: str = "CL"
    city: Optional[str] = None
    comuna: Optional[str] = None
    coords: Optional[List[float]] = None  # [lng, lat]


class OnboardingIn(BaseModel):
    alias: str
    gender: Literal["femenino", "masculino", "no_binario", "prefiero_no_decir"]
    comuna: str
    modes: List[Literal["apoyo", "amistad", "amor", "grupos"]]
    interested_genders: Optional[List[str]] = None
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    relationship_with_substances: Literal["sin_consumo", "en_proceso", "prefiero_no_decir"]
    sober_time: Optional[Literal["<30d", "1-3m", "3-12m", ">1a", ">5a"]] = None
    show_sober_time: bool = False
    favorite_activities: List[str]
    photos: List[str] = []
    videos: List[str] = []
    prompts: List[dict]  # [{q, a}] — min 1, max 6 (validated in the endpoint)
    accepted_rules: bool
    location: Optional[LocationIn] = None
    birthdate: Optional[str] = None
    bio: Optional[str] = None
    # New optional profile detail fields
    height_cm: Optional[int] = None
    has_children: Optional[Literal["si", "no", "prefiero_no_decir"]] = None
    show_height: Optional[bool] = None
    show_children: Optional[bool] = None
    show_zodiac: Optional[bool] = None
    show_modes: Optional[bool] = None

class ProfileUpdateIn(BaseModel):
    alias: Optional[str] = None
    comuna: Optional[str] = None
    modes: Optional[List[str]] = None
    interested_genders: Optional[List[str]] = None
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    show_sober_time: Optional[bool] = None
    sober_time: Optional[str] = None
    favorite_activities: Optional[List[str]] = None
    photos: Optional[List[str]] = None
    videos: Optional[List[str]] = None
    prompts: Optional[List[dict]] = None
    location: Optional[LocationIn] = None
    bio: Optional[str] = None
    height_cm: Optional[int] = None
    has_children: Optional[Literal["si", "no", "prefiero_no_decir"]] = None
    show_height: Optional[bool] = None
    show_children: Optional[bool] = None
    show_zodiac: Optional[bool] = None
    show_modes: Optional[bool] = None

class LikeIn(BaseModel):
    target_user_id: str
    mode: Literal["apoyo", "amistad", "amor"]
    activity_id: Optional[str] = None
    no_plan: bool = False

class MessageIn(BaseModel):
    text: str

class ProposePlanIn(BaseModel):
    activity_id: str
    when: str  # ISO datetime

class ReportIn(BaseModel):
    target_user_id: str
    category: Literal["ofrece_sustancias", "acoso", "perfil_falso", "mala_conducta_cita", "otro"]
    details: Optional[str] = ""

class BlockIn(BaseModel):
    target_user_id: str

class WaitlistIn(BaseModel):
    email: EmailStr
    country: str = "OTHER"
    city: Optional[str] = None

class ReasonIn(BaseModel):
    text: str

class ActivityIn(BaseModel):
    emoji: str
    name: str
    category: str

class GroupIn(BaseModel):
    emoji: str
    name: str
    description: str
    rules: str
    is_online: bool = False
    comuna: Optional[str] = None

class EventIn(BaseModel):
    group_id: str
    emoji: Optional[str] = ""
    title: str
    description: str
    when: str
    location: str
    address: Optional[str] = ""
    map_link: Optional[str] = ""
    capacity: int = 20

class AdminActionIn(BaseModel):
    target_user_id: str
    action: Literal["warn", "suspend", "ban", "reactivate"]
    note: Optional[str] = ""

# ------------------------------------------------------------------
# Auth Routes
# ------------------------------------------------------------------
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    # age check
    age = calc_age(body.birthdate)
    if age is None or age < 18:
        raise HTTPException(status_code=400, detail="Debes ser mayor de 18 años")
    exists = await db.users.find_one({"email": email})
    if exists:
        raise HTTPException(status_code=400, detail="Ya existe una cuenta con este correo")
    uid = str(uuid.uuid4())
    user_doc = {
        "id": uid,
        "email": email,
        "password_hash": hash_password(body.password),
        "birthdate": body.birthdate,
        "role": "user",
        "status": "active",
        "onboarding_complete": False,
        "created_at": now_iso(),
        "is_demo": False,
    }
    await db.users.insert_one(user_doc)
    token = create_access_token(uid, email)
    set_auth_cookie(response, token)
    # Welcome email (best-effort, transactional so it bypasses caps)
    try:
        subj, html_body = email_svc.welcome_body(alias=email.split("@")[0], is_google=False)
        await email_svc.send_email(
            db, user_id=uid, to=email, type="welcome",
            event_ref=f"welcome:{uid}", subject=subj, body_html=html_body,
        )
    except Exception:
        logger.exception("welcome email send failed")
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)
    return {"user": user_doc, "token": token}

@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    # Google-only accounts have no password_hash. Give a clear, kind hint.
    if not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Esta cuenta ingresa con Google. Usa el botón Continuar con Google")
    if not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    if user.get("status") == "banned":
        raise HTTPException(status_code=403, detail="account_banned")
    if user.get("status") == "suspended":
        raise HTTPException(status_code=403, detail=f"account_suspended:{user.get('suspended_until','')}")
    token = create_access_token(user["id"], email)
    set_auth_cookie(response, token)
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"user": user, "token": token}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

# ------------------------------------------------------------------
# Password reset (Resend flow)
# ------------------------------------------------------------------
class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str


@api.post("/auth/forgot-password")
async def forgot_password(body: ForgotPasswordIn):
    """Always returns 200 with the same body so we don't leak account existence.
    Sends a reset link if the account exists. If the account is Google-only,
    sends the 'no need for password' variant.
    """
    email = body.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if user:
        try:
            is_google_only = not user.get("password_hash") and "google" in (user.get("auth_providers") or [])
            if is_google_only:
                subj, html_body = email_svc.password_reset_body("", is_google_only=True)
            else:
                tok = email_svc.make_reset_token(user["id"])
                reset_url = f"{email_svc.FRONTEND_URL}/reset-password?token={tok}"
                subj, html_body = email_svc.password_reset_body(reset_url, is_google_only=False)
            await email_svc.send_email(
                db, user_id=user["id"], to=email, type="password_reset",
                event_ref=f"pwreset:{user['id']}:{int(datetime.now(timezone.utc).timestamp())}",
                subject=subj, body_html=html_body,
            )
        except Exception:
            logger.exception("forgot-password email failed")
    return {"ok": True}


@api.post("/auth/reset-password")
async def reset_password(body: ResetPasswordIn):
    payload = email_svc.read_reset_token(body.token)
    if not payload or payload.get("kind") != "pwreset":
        raise HTTPException(status_code=400, detail="Link inválido o expirado")
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    uid = payload["uid"]
    await db.users.update_one({"id": uid}, {"$set": {"password_hash": hash_password(body.new_password)}})
    return {"ok": True}


# ------------------------------------------------------------------
# Email preferences + unsubscribe + webhook
# ------------------------------------------------------------------
@api.get("/profile/email-preferences")
async def get_email_prefs(user: dict = Depends(current_user)):
    doc = await db.email_preferences.find_one({"user_id": user["id"]}, {"_id": 0}) or {}
    prefs = dict(email_svc.DEFAULT_PREFERENCES)
    for k in email_svc.DEFAULT_PREFERENCES:
        if k in doc:
            prefs[k] = bool(doc[k])
    return prefs


class EmailPrefsIn(BaseModel):
    matches_messages: Optional[bool] = None
    weekly_summary: Optional[bool] = None
    plan_reminders: Optional[bool] = None


@api.patch("/profile/email-preferences")
async def update_email_prefs(body: EmailPrefsIn, user: dict = Depends(current_user)):
    upd = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if upd:
        await db.email_preferences.update_one(
            {"user_id": user["id"]},
            {"$set": {**upd, "user_id": user["id"], "updated_at": now_iso()}},
            upsert=True,
        )
    return await get_email_prefs(user)


@api.get("/email/unsubscribe")
async def email_unsubscribe(token: str):
    """Public one-click unsubscribe (List-Unsubscribe compatible).
    If the token carries a specific pref, we only turn that off; otherwise
    we opt the user out of ALL non-transactional email.
    """
    payload = email_svc.read_unsub_token(token)
    if not payload or payload.get("kind") != "unsub":
        return {"ok": False, "reason": "invalid_token"}
    uid = payload.get("uid")
    pref = payload.get("pref")
    upd: Dict[str, Any] = {"updated_at": now_iso(), "user_id": uid}
    if pref:
        upd[pref] = False
    else:
        for k in email_svc.DEFAULT_PREFERENCES:
            upd[k] = False
    await db.email_preferences.update_one({"user_id": uid}, {"$set": upd}, upsert=True)
    return {"ok": True, "message": "Listo — dejarás de recibir estos correos"}


# Resend uses POST (JSON body). We also accept GET for List-Unsubscribe-Post.
@api.post("/email/unsubscribe")
async def email_unsubscribe_post(token: str = ""):
    return await email_unsubscribe(token)


@api.post("/webhooks/resend")
async def resend_webhook(request: Request):
    payload = await request.json()
    try:
        await email_svc.handle_webhook(db, payload)
    except Exception:
        logger.exception("resend webhook handler failed")
    return {"ok": True}


# ------------------------------------------------------------------
# Admin: notification recipients
# ------------------------------------------------------------------
class AdminRecipientIn(BaseModel):
    email: EmailStr
    active_for: Optional[Dict[str, bool]] = None


@api.get("/admin/email/recipients")
async def admin_list_recipients(_: dict = Depends(require_admin)):
    docs = await db.admin_notification_recipients.find({}, {"_id": 0}).sort("email", 1).to_list(50)
    return docs


@api.post("/admin/email/recipients")
async def admin_add_recipient(body: AdminRecipientIn, _: dict = Depends(require_admin)):
    email = body.email.lower()
    active_for = body.active_for or {"admin_new_user": True, "admin_daily_summary": True, "admin_grave_report": True}
    await db.admin_notification_recipients.update_one(
        {"email": email},
        {"$set": {"email": email, "active_for": active_for, "updated_at": now_iso()},
         "$setOnInsert": {"created_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True}


@api.delete("/admin/email/recipients/{email}")
async def admin_remove_recipient(email: str, _: dict = Depends(require_admin)):
    await db.admin_notification_recipients.delete_one({"email": email.lower()})
    return {"ok": True}


# ------------------------------------------------------------------
# Admin: email log / stats
# ------------------------------------------------------------------
@api.get("/admin/email/stats")
async def admin_email_stats(days: int = 7, _: dict = Depends(require_admin)):
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    pipeline = [
        {"$match": {"created_at": {"$gte": since}}},
        {"$group": {"_id": {"type": "$type", "status": "$status"}, "n": {"$sum": 1}}},
    ]
    rows = await db.email_log.aggregate(pipeline).to_list(500)
    stats: Dict[str, Dict[str, int]] = {}
    for r in rows:
        t = r["_id"]["type"]
        s = r["_id"]["status"]
        stats.setdefault(t, {})[s] = r["n"]
    return {"days": days, "by_type": stats}


@api.post("/admin/email/send-daily-summary")
async def admin_force_daily_summary(_: dict = Depends(require_admin)):
    """Force-send today's admin daily summary now (used for testing)."""
    yesterday = metrics_mod.today_local() - timedelta(days=1)
    snap = await metrics_mod.compute_daily_snapshot(db, yesterday)
    await metrics_mod.upsert_snapshot(db, snap)
    # 7d prior avg
    dates = [(yesterday - timedelta(days=i + 1)).isoformat() for i in range(7)]
    prev_docs = await db.metrics_daily.find({"date": {"$in": dates}}, {"_id": 0}).to_list(7)
    prev_avg: Dict[str, float] = {}
    if prev_docs:
        keys = ["plans_proposed", "plans_confirmed", "plans_realized", "registrations", "onboardings",
                "users_total", "dau", "likes", "matches", "msgs_1_1", "msgs_group", "rsvps",
                "reports_created", "blocks", "support_visits"]
        for k in keys:
            prev_avg[k] = sum(int(d.get(k) or 0) for d in prev_docs) / len(prev_docs)
    # Additional derived counters for the email
    pending_likes = await db.likes.count_documents({"kind": "like"})
    reports_open = await db.reports.count_documents({"status": "open"})
    grave_open = await db.reports.count_documents({"status": "open", "category": {"$in": ["ofrece_sustancias", "mala_conducta_cita"]}})
    snap_for_email = {**snap, "pending_likes": pending_likes, "reports_open": reports_open, "grave_open": grave_open}
    subj, html_body = email_svc.admin_daily_summary_body(date_str=yesterday.isoformat(), snapshot=snap_for_email, prev_avg=prev_avg)
    res = await email_svc.send_internal_email(
        db, notif_type="admin_daily_summary",
        event_ref=f"daily_summary:{yesterday.isoformat()}",
        subject=subj, body_html=html_body,
    )
    return res

@api.post("/auth/google/session")
async def google_session(request: Request, response: Response):
    """Exchange an Emergent Google Auth `session_id` (from the URL fragment on
    redirect) for our own JWT so the rest of the API keeps working unchanged.

    The frontend sends `X-Session-ID` in the header. We call Emergent's
    session-data endpoint from the server (never from the browser), then either
    link to an existing account by email or create a fresh one flagged as
    Google-provided (no password, `onboarding_complete=False`).
    """
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Falta X-Session-ID")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(EMERGENT_AUTH_SESSION_URL, headers={"X-Session-ID": session_id})
    except Exception:
        raise HTTPException(status_code=502, detail="No pudimos contactar el servicio de Google")
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Sesión de Google no válida")
    data = r.json()
    email = (data.get("email") or "").lower().strip()
    name = data.get("name") or ""
    picture = data.get("picture") or ""
    if not email:
        raise HTTPException(status_code=400, detail="Google no devolvió correo")

    existing = await db.users.find_one({"email": email})
    if existing:
        if existing.get("status") == "banned":
            raise HTTPException(status_code=403, detail="account_banned")
        if existing.get("status") == "suspended":
            raise HTTPException(status_code=403, detail=f"account_suspended:{existing.get('suspended_until','')}")
        uid = existing["id"]
        await db.users.update_one({"id": uid}, {
            "$set": {"google_name": name, "google_picture": picture, "last_google_login_at": now_iso()},
            "$addToSet": {"auth_providers": "google"},
        })
    else:
        uid = str(uuid.uuid4())
        await db.users.insert_one({
            "id": uid,
            "email": email,
            "password_hash": None,
            "google_name": name,
            "google_picture": picture,
            "role": "user",
            "status": "active",
            "onboarding_complete": False,
            "auth_providers": ["google"],
            "created_at": now_iso(),
            "last_google_login_at": now_iso(),
            "is_demo": False,
        })
        # Welcome email for brand-new Google sign-ups
        try:
            alias = name or email.split("@")[0]
            subj, html_body = email_svc.welcome_body(alias=alias, is_google=True)
            await email_svc.send_email(
                db, user_id=uid, to=email, type="welcome",
                event_ref=f"welcome:{uid}", subject=subj, body_html=html_body,
            )
        except Exception:
            logger.exception("welcome (google) email send failed")
    token = create_access_token(uid, email)
    set_auth_cookie(response, token)
    user_doc = await db.users.find_one({"id": uid}, {"password_hash": 0, "_id": 0})
    return {"user": user_doc, "token": token}

@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return user

# ------------------------------------------------------------------
# Geo (public)
# ------------------------------------------------------------------
@api.get("/geo/countries")
async def list_countries():
    """Returns available countries (only enabled ones exposed to app clients)."""
    docs = await db.countries.find({"enabled": True}, {"_id": 0}).sort("order", 1).to_list(50)
    return docs

@api.get("/geo/helplines")
async def list_helplines(country: str = Query("CL")):
    """Returns emergency/support helplines for a country."""
    country = country.upper()
    docs = await db.helplines.find({"country": country}, {"_id": 0}).sort("order", 1).to_list(50)
    return docs

@api.post("/waitlist")
async def join_waitlist(body: WaitlistIn):
    """Public: records interest from users outside enabled countries."""
    email = body.email.lower()
    country = (body.country or "OTHER").upper()
    await db.waitlist.update_one(
        {"email": email},
        {"$set": {
            "email": email,
            "country": country,
            "city": body.city,
            "updated_at": now_iso(),
        }, "$setOnInsert": {"created_at": now_iso()}},
        upsert=True,
    )
    # Best-effort waitlist confirmation email
    try:
        subj, html_body = email_svc.waitlist_body(country_name=country)
        await email_svc.send_email(
            db, user_id=None, to=email, type="waitlist",
            event_ref=f"waitlist:{email}:{country}", subject=subj, body_html=html_body,
            force=True,
        )
    except Exception:
        logger.exception("waitlist email send failed")
    return {"ok": True}

# ------------------------------------------------------------------
# Uploads
# ------------------------------------------------------------------
@api.post("/uploads/photo")
async def upload_photo(file: UploadFile = File(...), user: dict = Depends(current_user)):
    ext = (file.filename or "img").split(".")[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp", "gif"):
        raise HTTPException(status_code=400, detail="Formato de imagen no válido. Prueba con JPG, PNG o WebP.")
    mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp", "gif": "image/gif"}[ext]
    path = f"{APP_NAME}/photos/{user['id']}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="La foto pesa mucho. Máximo 8MB por imagen.")
    result = put_object(path, data, mime)
    await db.files.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "storage_path": result["path"],
        "content_type": mime,
        "size": result.get("size", len(data)),
        "created_at": now_iso(),
    })
    return {"path": result["path"], "url": f"/api/files/{result['path']}"}

@api.post("/uploads/video")
async def upload_video(file: UploadFile = File(...), user: dict = Depends(current_user)):
    ext = (file.filename or "vid").split(".")[-1].lower()
    if ext not in ("mp4", "mov", "webm", "m4v"):
        raise HTTPException(status_code=400, detail="Formato no permitido (mp4, mov, webm)")
    mime_map = {"mp4": "video/mp4", "mov": "video/quicktime", "webm": "video/webm", "m4v": "video/x-m4v"}
    mime = mime_map[ext]
    path = f"{APP_NAME}/videos/{user['id']}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    if len(data) > 40 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Video demasiado grande (máx 40MB, apunta a videos cortos <30s)")
    result = put_object(path, data, mime)
    await db.files.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "storage_path": result["path"],
        "content_type": mime,
        "size": result.get("size", len(data)),
        "kind": "video",
        "created_at": now_iso(),
    })
    return {"path": result["path"], "url": f"/api/files/{result['path']}"}

@api.get("/files/{path:path}")
async def download_file(path: str, request: Request, auth: Optional[str] = Query(None)):
    # Auth: Authorization header first, else ?auth= query param (for <img src>)
    token = None
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        token = header[7:]
    if not token and auth:
        token = auth
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")
    try:
        payload = jwt.decode(token, jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token inválido")
        u = await db.users.find_one({"id": payload["sub"]}, {"status": 1, "_id": 0})
        if not u or u.get("status") == "banned":
            raise HTTPException(status_code=401, detail="No autenticado")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sesión expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
    data, content_type = get_object(path)
    return FastAPIResponse(content=data, media_type=content_type, headers={"Cache-Control": "private, max-age=3600"})

# ------------------------------------------------------------------
# Profile / Onboarding
# ------------------------------------------------------------------
@api.post("/profile/onboarding")
async def complete_onboarding(body: OnboardingIn, user: dict = Depends(current_user)):
    if not body.accepted_rules:
        raise HTTPException(status_code=400, detail="Debes aceptar las reglas")
    if len(body.favorite_activities) < 3:
        raise HTTPException(status_code=400, detail="Elige al menos 3 actividades")
    if "amor" in body.modes and not body.photos:
        raise HTTPException(status_code=400, detail="Necesitas al menos 1 foto para el modo Amor")

    # Prompts: 1..6, each with a non-empty question and answer.
    valid_prompts = [p for p in (body.prompts or []) if isinstance(p, dict) and (p.get("q") or "").strip() and (p.get("a") or "").strip()]
    if len(valid_prompts) < 1:
        raise HTTPException(status_code=400, detail="Escribe al menos 1 frase para tu perfil")
    if len(valid_prompts) > 6:
        raise HTTPException(status_code=400, detail="Máximo 6 frases en tu perfil")

    # Validate optional detail fields
    if body.height_cm is not None and not (140 <= body.height_cm <= 210):
        raise HTTPException(status_code=400, detail="Estatura fuera de rango (140–210 cm)")

    effective_birthdate = user.get("birthdate") or body.birthdate
    if not effective_birthdate:
        raise HTTPException(status_code=400, detail="Necesitamos tu fecha de nacimiento")
    age = calc_age(effective_birthdate)
    if age is None or age < 18:
        raise HTTPException(status_code=400, detail="Debes ser mayor de 18 años")

    loc_in = body.location.model_dump() if body.location else {}
    location = build_location_doc(
        country=loc_in.get("country") or "CL",
        comuna=loc_in.get("comuna") or body.comuna,
        city=loc_in.get("city") or body.comuna,
        coords=loc_in.get("coords"),
    )

    update = {
        "alias": body.alias.strip(),
        "gender": body.gender,
        "comuna": body.comuna,
        "modes": body.modes,
        "interested_genders": body.interested_genders or [],
        "age_min": body.age_min or 18,
        "age_max": body.age_max or 99,
        "relationship_with_substances": body.relationship_with_substances,
        "sober_time": body.sober_time,
        "show_sober_time": body.show_sober_time,
        "favorite_activities": body.favorite_activities,
        "photos": body.photos,
        "prompts": valid_prompts,
        "accepted_rules_at": now_iso(),
        "onboarding_complete": True,
        "country": (location or {}).get("country", "CL"),
        "birthdate": effective_birthdate,
        "bio": validate_bio(body.bio or ""),
        "zodiac": zodiac_from_birthdate(effective_birthdate),
        # Visibility switches — sensible defaults following the spec
        "show_height": body.show_height if body.show_height is not None else (body.height_cm is not None),
        "show_children": body.show_children if body.show_children is not None else True,
        "show_zodiac": bool(body.show_zodiac) if body.show_zodiac is not None else False,
        "show_modes": body.show_modes if body.show_modes is not None else True,
    }
    if body.height_cm is not None:
        update["height_cm"] = body.height_cm
    if body.has_children is not None:
        update["has_children"] = body.has_children
    if location:
        update["location"] = location
    await db.users.update_one({"id": user["id"]}, {"$set": update})
    # Fire admin "new user" notification (once per user via idempotency)
    try:
        u_after = await db.users.find_one({"id": user["id"]}, {"_id": 0}) or user
        total_users = await db.users.count_documents({"deleted_at": {"$exists": False}})
        age = calc_age(u_after.get("birthdate", ""))
        via = "google" if "google" in (u_after.get("auth_providers") or []) else "email"
        subj, html_body = email_svc.admin_new_user_body(
            alias=u_after.get("alias", "sin_alias"),
            age=age,
            gender=u_after.get("gender", ""),
            city=(u_after.get("comuna") or (u_after.get("location") or {}).get("city") or ""),
            modes=u_after.get("modes", []),
            via=via,
            total_users=total_users,
        )
        await email_svc.send_internal_email(
            db, notif_type="admin_new_user",
            event_ref=f"new_user:{u_after['id']}",
            subject=subj, body_html=html_body,
        )
    except Exception:
        logger.exception("admin_new_user notification failed")
    return {"ok": True}

@api.patch("/profile/me")
async def update_profile(body: ProfileUpdateIn, user: dict = Depends(current_user)):
    payload = body.model_dump(exclude_unset=True)
    update = {k: v for k, v in payload.items() if v is not None and k not in ("location", "bio", "prompts", "height_cm")}

    if body.bio is not None:
        update["bio"] = validate_bio(body.bio)

    if body.prompts is not None:
        valid_prompts = [p for p in body.prompts if isinstance(p, dict) and (p.get("q") or "").strip() and (p.get("a") or "").strip()]
        if len(valid_prompts) < 1:
            raise HTTPException(status_code=400, detail="Deja al menos 1 frase en tu perfil")
        if len(valid_prompts) > 6:
            raise HTTPException(status_code=400, detail="Máximo 6 frases en tu perfil")
        update["prompts"] = valid_prompts

    if body.height_cm is not None:
        if not (140 <= body.height_cm <= 210):
            raise HTTPException(status_code=400, detail="Estatura fuera de rango (140–210 cm)")
        update["height_cm"] = body.height_cm
        # If the user is setting their height for the first time and hasn't set the switch,
        # default show_height to True.
        if "show_height" not in payload and not user.get("height_cm"):
            update.setdefault("show_height", True)

    # Only re-derive location when the user EXPLICITLY changed their location
    # (either sent a `location` object, or changed `comuna` to a different value).
    # This prevents editing the alias/photos/etc from silently pushing the GPS
    # coordinates back to the comuna centroid.
    location_changed = body.location is not None
    comuna_changed = (
        body.comuna is not None
        and (body.comuna or "").strip() != (user.get("comuna") or "").strip()
    )
    if location_changed or comuna_changed:
        loc_in = payload.get("location") or {}
        current_loc = user.get("location") or {}
        country = loc_in.get("country")
        if not country:
            country = "CL" if comuna_changed and not body.location else (current_loc.get("country") or "CL")
        comuna = payload.get("comuna") or loc_in.get("comuna") or user.get("comuna")
        city = loc_in.get("city") or comuna
        coords = loc_in.get("coords")
        location = build_location_doc(country=country, comuna=comuna, city=city, coords=coords)
        if location:
            update["location"] = location
            update["country"] = location["country"]
    if update:
        await db.users.update_one({"id": user["id"]}, {"$set": update})
    return {"ok": True}

@api.get("/profile/{user_id}")
async def get_public_profile(user_id: str, user: dict = Depends(current_user)):
    target = await db.users.find_one({"id": user_id}, {"password_hash": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    return clear_public(target, viewer=user)

@api.get("/profile/me/completeness")
async def profile_completeness(user: dict = Depends(current_user)):
    """Weighted 0..100 score used by the frontend progress meter."""
    score = 0
    next_suggestion = None
    if user.get("photos"):
        score += 20
    else:
        next_suggestion = next_suggestion or "Sube al menos una foto"
    if (user.get("bio") or "").strip():
        score += 15
    else:
        next_suggestion = next_suggestion or "Escribe tu 'Sobre mí'"
    prompts_full = [p for p in (user.get("prompts") or []) if (p.get("q") or "").strip() and (p.get("a") or "").strip()]
    if len(prompts_full) >= 3:
        score += 15
    elif len(prompts_full) >= 1:
        score += 5
        next_suggestion = next_suggestion or "Suma otra frase a tu perfil"
    else:
        next_suggestion = next_suggestion or "Escribe una frase para tu perfil"
    if len(user.get("favorite_activities") or []) >= 5:
        score += 10
    else:
        next_suggestion = next_suggestion or "Elige más panoramas favoritos"
    if user.get("height_cm"):
        score += 10
    else:
        next_suggestion = next_suggestion or "Agrega tu estatura"
    if user.get("has_children"):
        score += 10
    else:
        next_suggestion = next_suggestion or "Cuéntanos si tienes hijos"
    if user.get("show_zodiac") and user.get("zodiac"):
        score += 5
    elif user.get("zodiac"):
        next_suggestion = next_suggestion or "Muestra tu signo zodiacal"
    loc_coords = ((user.get("location") or {}).get("coords") or {}).get("coordinates")
    # A GPS-derived location has raw coords that don't match the exact comuna centroid.
    if loc_coords:
        score += 15
    else:
        next_suggestion = next_suggestion or "Actualiza tu ubicación con GPS"
    percent = min(100, score)
    if percent >= 100:
        next_suggestion = None
    return {"percent": percent, "next_suggestion": next_suggestion}

@api.delete("/profile/me")
async def delete_account(response: Response, user: dict = Depends(current_user)):
    uid = user["id"]
    # Get all matches user is part of (to also clean plans/messages related to those matches)
    my_matches = await db.matches.find({"users": uid}, {"id": 1, "_id": 0}).to_list(500)
    match_ids = [m["id"] for m in my_matches]

    # Delete/soft-delete everything
    await db.users.delete_one({"id": uid})
    await db.likes.delete_many({"$or": [{"from_user": uid}, {"to_user": uid}]})
    await db.matches.delete_many({"users": uid})
    if match_ids:
        await db.messages.delete_many({"match_id": {"$in": match_ids}})
        await db.plans.delete_many({"match_id": {"$in": match_ids}})
        await db.reads.delete_many({"match_id": {"$in": match_ids}})
    # Also user's own messages in any other chats (safety net)
    await db.messages.delete_many({"from_user": uid})
    await db.reasons.delete_many({"user_id": uid})
    await db.blocks.delete_many({"$or": [{"from_user": uid}, {"to_user": uid}]})
    await db.reports.delete_many({"from_user": uid})
    await db.group_members.delete_many({"user_id": uid})
    await db.group_messages.delete_many({"from_user": uid})
    await db.event_rsvps.delete_many({"user_id": uid})
    await db.reads.delete_many({"user_id": uid})
    # Soft-delete file records (Emergent storage has no delete API)
    await db.files.update_many({"user_id": uid}, {"$set": {"is_deleted": True, "deleted_at": now_iso()}})

    response.delete_cookie("access_token", path="/")
    return {"ok": True}

# ------------------------------------------------------------------
# Activities
# ------------------------------------------------------------------
@api.get("/activities")
async def list_activities():
    items = await db.activities.find({"active": True}, {"_id": 0}).to_list(500)
    return items

@api.post("/admin/activities")
async def admin_create_activity(body: ActivityIn, _: dict = Depends(require_admin)):
    doc = {"id": str(uuid.uuid4()), "emoji": body.emoji, "name": body.name, "category": body.category, "active": True, "created_at": now_iso()}
    await db.activities.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.patch("/admin/activities/{aid}")
async def admin_update_activity(aid: str, body: dict, _: dict = Depends(require_admin)):
    body.pop("id", None); body.pop("_id", None)
    await db.activities.update_one({"id": aid}, {"$set": body})
    return {"ok": True}

@api.delete("/admin/activities/{aid}")
async def admin_delete_activity(aid: str, _: dict = Depends(require_admin)):
    await db.activities.update_one({"id": aid}, {"$set": {"active": False}})
    return {"ok": True}

# ------------------------------------------------------------------
# Discovery
# ------------------------------------------------------------------
@api.get("/discover")
async def discover(
    mode: str = Query(...),
    age_min: Optional[int] = Query(None),
    age_max: Optional[int] = Query(None),
    comuna: Optional[str] = Query(None),
    radius_km: Optional[int] = Query(None, ge=1, le=500),
    user: dict = Depends(current_user),
):
    if mode not in ("apoyo", "amistad", "amor"):
        raise HTTPException(status_code=400, detail="Modo inválido")
    if not user.get("onboarding_complete"):
        raise HTTPException(status_code=400, detail="Completa tu perfil primero")
    if mode not in user.get("modes", []):
        raise HTTPException(status_code=400, detail="Activa este modo en tu perfil")
    uid = user["id"]

    # excluded: liked/passed, blocked, blockedby, reported
    liked = await db.likes.find({"from_user": uid}, {"to_user": 1, "_id": 0}).to_list(2000)
    excluded_ids = {l["to_user"] for l in liked}
    blocks = await db.blocks.find({"$or": [{"from_user": uid}, {"to_user": uid}]}, {"_id": 0}).to_list(2000)
    for b in blocks:
        excluded_ids.add(b["from_user"] if b["from_user"] != uid else b["to_user"])
    reports = await db.reports.find({"from_user": uid}, {"target_user": 1, "_id": 0}).to_list(2000)
    for r in reports:
        excluded_ids.add(r["target_user"])
    excluded_ids.add(uid)

    query = {
        "id": {"$nin": list(excluded_ids)},
        "onboarding_complete": True,
        "status": {"$ne": "banned"},
        "modes": mode,
    }
    if comuna:
        query["comuna"] = comuna

    if mode == "amor":
        my_gender = user.get("gender")
        my_interested = user.get("interested_genders") or []
        query["gender"] = {"$in": my_interested} if my_interested else {"$exists": True}
        query["interested_genders"] = my_gender

    # Prefer $geoNear when the actor has coords: this drives distance-first ordering
    # and returns `distance_km` for each candidate. If the actor lacks coords we fall
    # back to the legacy comuna-based flow to keep the app functional during rollout.
    my_loc = (user.get("location") or {}).get("coords")
    if my_loc and isinstance(my_loc, dict) and my_loc.get("coordinates"):
        max_m = (radius_km or 500) * 1000  # default 500km covers most of central Chile
        pipeline = [
            {"$geoNear": {
                "near": {"type": "Point", "coordinates": my_loc["coordinates"]},
                "distanceField": "_distance_m",
                "spherical": True,
                "maxDistance": max_m,
                "query": query,
            }},
            {"$limit": 500},
            {"$project": {"password_hash": 0}},
        ]
        candidates = [d async for d in db.users.aggregate(pipeline)]
        for c in candidates:
            # Bucket distance for privacy (see bucket_distance_km).
            raw_km = c.pop("_distance_m", 0) / 1000.0
            c["_distance_km"] = bucket_distance_km(raw_km)
    else:
        candidates = await db.users.find(query, {"password_hash": 0}).to_list(500)

    my_comuna = user.get("comuna")
    my_favs = set(user.get("favorite_activities", []))
    my_age = calc_age(user.get("birthdate"))

    scored = []
    for c in candidates:
        age = calc_age(c.get("birthdate"))
        # Global age filter (applies to all modes if provided)
        if age_min is not None and (age is None or age < age_min):
            continue
        if age_max is not None and (age is None or age > age_max):
            continue
        if mode == "amor":
            if age is None or age < user.get("age_min", 18) or age > user.get("age_max", 99):
                continue
            if my_age is None or my_age < c.get("age_min", 18) or my_age > c.get("age_max", 99):
                continue
        overlap = len(my_favs & set(c.get("favorite_activities", [])))
        # Primary sort: distance if we have it, else zone-based legacy.
        if c.get("_distance_km") is not None:
            primary = c["_distance_km"]
        elif c.get("comuna") == my_comuna:
            primary = 0
        elif c.get("comuna") == "Otra región" or my_comuna == "Otra región":
            primary = 200
        else:
            primary = 100
        c["_score"] = (primary, -overlap, random.random())
        c.pop("_id", None)
        scored.append(c)
    scored.sort(key=lambda x: x["_score"])
    result = [clear_public(c, viewer=user) for c in scored[:30]]
    return result

@api.get("/discover/quota")
async def discover_quota(user: dict = Depends(current_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    count = await db.likes.count_documents({"from_user": user["id"], "kind": "like", "date": today})
    return {"used": count, "limit": 20, "remaining": max(0, 20 - count)}

# ------------------------------------------------------------------
# Like / Pass / Match
# ------------------------------------------------------------------
async def _is_blocked(a: str, b: str) -> bool:
    return bool(await db.blocks.find_one({"$or": [
        {"from_user": a, "to_user": b},
        {"from_user": b, "to_user": a},
    ]}))

async def _validate_like_target(actor: dict, target_id: str, mode: str) -> dict:
    """Validate that the target is a legit person the actor is allowed to like."""
    if target_id == actor["id"]:
        raise HTTPException(status_code=403, detail="No puedes darte me tinca a ti mismo")
    target = await db.users.find_one({"id": target_id}, {"password_hash": 0, "_id": 0})
    if not target:
        raise HTTPException(status_code=403, detail="Este perfil no está disponible")
    if target.get("status") in ("banned", "suspended"):
        raise HTTPException(status_code=403, detail="Este perfil no está disponible")
    if not target.get("onboarding_complete"):
        raise HTTPException(status_code=403, detail="Este perfil no está disponible")
    if mode not in target.get("modes", []):
        raise HTTPException(status_code=403, detail="Esta persona no tiene ese modo activado")
    if await _is_blocked(actor["id"], target_id):
        raise HTTPException(status_code=403, detail="No es posible interactuar con este perfil")
    if mode == "amor":
        # Both sides must be gender-compatible
        actor_gender = actor.get("gender")
        actor_interested = set(actor.get("interested_genders") or [])
        target_gender = target.get("gender")
        target_interested = set(target.get("interested_genders") or [])
        if target_gender not in actor_interested or actor_gender not in target_interested:
            raise HTTPException(status_code=403, detail="No hay compatibilidad de género para modo Amor")
        # Age ranges both ways
        actor_age = calc_age(actor.get("birthdate"))
        target_age = calc_age(target.get("birthdate"))
        if actor_age is None or target_age is None:
            raise HTTPException(status_code=403, detail="Edad no disponible")
        if target_age < actor.get("age_min", 18) or target_age > actor.get("age_max", 99):
            raise HTTPException(status_code=403, detail="Fuera de tu rango de edad")
        if actor_age < target.get("age_min", 18) or actor_age > target.get("age_max", 99):
            raise HTTPException(status_code=403, detail="Fuera del rango de edad de la otra persona")
    return target

@api.post("/pass")
async def pass_user(body: LikeIn, user: dict = Depends(current_user)):
    # Even for a pass, refuse if blocked in any direction
    if body.target_user_id != user["id"] and await _is_blocked(user["id"], body.target_user_id):
        raise HTTPException(status_code=403, detail="No es posible interactuar con este perfil")
    doc = {
        "id": str(uuid.uuid4()),
        "from_user": user["id"],
        "to_user": body.target_user_id,
        "mode": body.mode,
        "kind": "pass",
        "date": datetime.now(timezone.utc).date().isoformat(),
        "created_at": now_iso(),
    }
    await db.likes.insert_one(doc)
    return {"ok": True}

@api.post("/like")
async def like_user(body: LikeIn, user: dict = Depends(current_user)):
    # Server-side validation: target compatibility + block check
    await _validate_like_target(user, body.target_user_id, body.mode)

    today = datetime.now(timezone.utc).date().isoformat()
    used = await db.likes.count_documents({"from_user": user["id"], "kind": "like", "date": today})
    if used >= 20:
        raise HTTPException(status_code=429, detail="Se acabaron tus me tinca de hoy. Vuelve mañana o revisa los grupos 👀")

    doc = {
        "id": str(uuid.uuid4()),
        "from_user": user["id"],
        "to_user": body.target_user_id,
        "mode": body.mode,
        "kind": "like",
        "activity_id": body.activity_id if not body.no_plan else None,
        "date": today,
        "seen": False,  # for Les tincas notification: false until target opens the tab
        "created_at": now_iso(),
    }
    await db.likes.insert_one(doc)

    # Check reciprocal like
    reciprocal = await db.likes.find_one({"from_user": body.target_user_id, "to_user": user["id"], "mode": body.mode, "kind": "like"})
    if not reciprocal:
        # "Te dieron me tinca" email — grouped (24h) and only if activity exists (or plain notice)
        try:
            target = await db.users.find_one({"id": body.target_user_id}, {"_id": 0})
            if target and target.get("email"):
                cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
                recent = await db.email_log.count_documents({
                    "user_id": target["id"], "type": "like_no_match", "sent_at": {"$gte": cutoff}, "status": "sent",
                })
                # Only send if there hasn't been one in the last 24h
                if recent == 0:
                    activity_name = None
                    if doc.get("activity_id"):
                        a = await db.activities.find_one({"id": doc["activity_id"]}, {"_id": 0})
                        activity_name = f"{a.get('emoji','') } {a.get('name','')}".strip() if a else None
                    # Count OTHER unseen likes (agrupación anti-ruido)
                    extra = await db.likes.count_documents({
                        "to_user": target["id"], "kind": "like", "seen": False, "from_user": {"$ne": user["id"]},
                    })
                    subj, html_body = email_svc.like_no_match_body(
                        alias_liker=user.get("alias", "alguien"),
                        count_extra=extra,
                        plan_activity=activity_name,
                    )
                    await email_svc.send_email(
                        db, user_id=target["id"], to=target["email"], type="like_no_match",
                        event_ref=f"like:{doc['id']}",
                        subject=subj, body_html=html_body, user_doc=target,
                    )
        except Exception:
            logger.exception("like_no_match email send failed")
    if reciprocal:
        match = await db.matches.find_one({"users": {"$all": [user["id"], body.target_user_id]}, "mode": body.mode})
        if not match:
            match_id = str(uuid.uuid4())
            # NEW: store both proposals side-by-side (each user's activity_id, or None).
            proposals = {
                user["id"]: doc["activity_id"],
                body.target_user_id: reciprocal.get("activity_id"),
            }
            # Resolve full activity docs for both sides — used by the celebration screen and system message.
            act_ids = [v for v in proposals.values() if v]
            acts_by_id = {}
            if act_ids:
                async for a in db.activities.find({"id": {"$in": act_ids}}, {"_id": 0}):
                    acts_by_id[a["id"]] = a
            proposals_resolved = {uid: (acts_by_id.get(aid) if aid else None) for uid, aid in proposals.items()}

            other_user = await db.users.find_one({"id": body.target_user_id}, {"password_hash": 0})
            my_alias = user.get("alias") or "alguien"
            other_alias = (other_user or {}).get("alias") or "alguien"

            my_act = proposals_resolved.get(user["id"])
            their_act = proposals_resolved.get(body.target_user_id)
            if my_act and their_act and my_act["id"] == their_act["id"]:
                sys_text = f"¡Están de acuerdo! {my_act['emoji']} {my_act['name']}. Solo falta el cuándo 😊"
            elif my_act and their_act:
                sys_text = (
                    f"A {my_alias} le tinca {my_act['emoji']} {my_act['name']} y a "
                    f"{other_alias} le tinca {their_act['emoji']} {their_act['name']}. ¿Cuál va primero?"
                )
            elif my_act or their_act:
                lone = my_act or their_act
                lone_alias = my_alias if my_act else other_alias
                sys_text = f"A {lone_alias} le tinca: {lone['emoji']} {lone['name']}. ¿Te sumas?"
            else:
                # Pick up to 3 shared favorite activities as inspiration.
                my_favs = set(user.get("favorite_activities") or [])
                their_favs = set((other_user or {}).get("favorite_activities") or [])
                shared = list(my_favs & their_favs)[:3]
                sys_text = "¡Se dio el match! " + (
                    f"Panoramas que les gustan a ambos: {', '.join(shared)} 💛" if shared
                    else "Ya pueden coordinar un panorama 💛"
                )

            match_doc = {
                "id": match_id,
                "users": [user["id"], body.target_user_id],
                "mode": body.mode,
                "proposals": proposals,  # {user_id: activity_id | None}
                # Kept for backward compatibility w/ /matches consumers that still read it:
                "proposed_activity": my_act or their_act,
                "created_at": now_iso(),
            }
            await db.matches.insert_one(match_doc)
            await db.messages.insert_one({
                "id": str(uuid.uuid4()),
                "match_id": match_id,
                "from_user": "system",
                "text": sys_text,
                "kind": "system",
                "created_at": now_iso(),
            })
            # Send "new match" emails to both users
            try:
                my_act_name = my_act["name"] if my_act else None
                their_act_name = their_act["name"] if their_act else None
                # → to current user
                subj_a, body_a = email_svc.new_match_body(
                    alias_other=other_alias, my_activity=my_act_name, other_activity=their_act_name, match_id=match_id,
                )
                await email_svc.send_email(
                    db, user_id=user["id"], to=user["email"], type="new_match",
                    event_ref=f"match:{match_id}:{user['id']}",
                    subject=subj_a, body_html=body_a,
                )
                # → to other user
                if other_user and other_user.get("email"):
                    subj_b, body_b = email_svc.new_match_body(
                        alias_other=my_alias, my_activity=their_act_name, other_activity=my_act_name, match_id=match_id,
                    )
                    await email_svc.send_email(
                        db, user_id=other_user["id"], to=other_user["email"], type="new_match",
                        event_ref=f"match:{match_id}:{other_user['id']}",
                        subject=subj_b, body_html=body_b,
                        user_doc=other_user,
                    )
            except Exception:
                logger.exception("new_match email send failed")
            return {
                "match": True,
                "match_id": match_id,
                "other": clear_public(other_user, viewer=user) if other_user else None,
                "proposals": proposals_resolved,
                "proposed_activity": my_act or their_act,  # legacy
            }
        else:
            # Match already existed — still signal match to the client so it can navigate to the chat
            other = await db.users.find_one({"id": body.target_user_id}, {"password_hash": 0})
            return {"match": True, "match_id": match["id"], "other": clear_public(other, viewer=user) if other else None, "proposed_activity": match.get("proposed_activity")}
    return {"match": False}

@api.get("/matches")
async def list_matches(user: dict = Depends(current_user)):
    matches = await db.matches.find({"users": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    if not matches:
        return []
    uid = user["id"]
    other_ids = [next(u for u in m["users"] if u != uid) for m in matches]
    match_ids = [m["id"] for m in matches]

    # Batch: users + reads + last messages
    users_cur = db.users.find({"id": {"$in": other_ids}}, {"password_hash": 0, "_id": 0})
    users_by_id = {u["id"]: u async for u in users_cur}

    reads_cur = db.reads.find({"user_id": uid, "match_id": {"$in": match_ids}}, {"_id": 0})
    reads = {r["match_id"]: r["last_read_at"] async for r in reads_cur}

    # Last message per match via aggregation
    pipeline = [
        {"$match": {"match_id": {"$in": match_ids}}},
        {"$sort": {"created_at": -1}},
        {"$group": {"_id": "$match_id", "doc": {"$first": "$$ROOT"}}},
    ]
    last_by_match = {}
    async for row in db.messages.aggregate(pipeline):
        d = row["doc"]; d.pop("_id", None)
        last_by_match[row["_id"]] = d

    # Unread count per match: messages after last_read from non-self, non-system.
    # Precompute the lowest last_read across matches for a coarse $match to reduce work.
    min_last_read = min(reads.values(), default="1970-01-01T00:00:00+00:00") if reads else "1970-01-01T00:00:00+00:00"
    unread_pipeline = [
        {"$match": {
            "match_id": {"$in": match_ids},
            "from_user": {"$nin": [uid, "system"]},
            "created_at": {"$gt": min_last_read},
        }},
        {"$group": {"_id": {"match_id": "$match_id", "created_at": "$created_at"}}},
        {"$group": {"_id": "$_id.match_id", "msgs": {"$push": "$_id.created_at"}}},
    ]
    unread_by_match = {}
    async for row in db.messages.aggregate(unread_pipeline):
        last_read = reads.get(row["_id"], "1970-01-01T00:00:00+00:00")
        unread_by_match[row["_id"]] = sum(1 for c in row["msgs"] if c > last_read)

    # Resolve proposals dict to full activity docs on each match for the client.
    all_act_ids = set()
    for m in matches:
        for aid in (m.get("proposals") or {}).values():
            if aid:
                all_act_ids.add(aid)
    acts_by_id = {}
    if all_act_ids:
        async for a in db.activities.find({"id": {"$in": list(all_act_ids)}}, {"_id": 0}):
            acts_by_id[a["id"]] = a

    result = []
    for m in matches:
        other_id = next(u for u in m["users"] if u != uid)
        other = users_by_id.get(other_id)
        if not other:
            continue
        proposals_raw = m.get("proposals") or {}
        proposals_resolved = {k: (acts_by_id.get(v) if v else None) for k, v in proposals_raw.items()}
        result.append({
            "id": m["id"],
            "mode": m["mode"],
            "other": clear_public(other, viewer=user),
            "proposed_activity": m.get("proposed_activity"),  # legacy
            "proposals": proposals_resolved,
            "plan_status": m.get("plan_status"),  # None | proposed | confirmed | past | feedback
            "confirmed_activity": m.get("confirmed_activity"),
            "confirmed_at": m.get("confirmed_at"),
            "last_message": last_by_match.get(m["id"]),
            "unread": unread_by_match.get(m["id"], 0),
            "created_at": m["created_at"],
        })
    # Fire the nudge check in-line (lightweight, only writes when needed).
    await _maybe_send_plan_nudges(uid, matches, last_by_match)
    return result


async def _maybe_send_plan_nudges(uid: str, matches: list, last_by_match: dict):
    """Insert one soft nudge message per match at >48h with no confirmed plan
    and at least one message from each side. Marks nudge_sent=True on the match
    so it can never fire twice. Cheap: iterates matches already loaded."""
    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
    for m in matches:
        if m.get("nudge_sent"):
            continue
        if m.get("plan_status") == "confirmed":
            continue
        if m.get("created_at", now_iso()) > cutoff:
            continue
        # Require at least one message from each side (skip the initial system msg).
        senders = set()
        async for msg in db.messages.find({"match_id": m["id"], "from_user": {"$ne": "system"}}, {"from_user": 1, "_id": 0}).limit(20):
            senders.add(msg["from_user"])
            if len(senders) >= 2:
                break
        if len(senders) < 2:
            continue
        # Build the nudge text.
        proposals = m.get("proposals") or {}
        act_ids = [v for v in proposals.values() if v]
        nudge = None
        if act_ids:
            act = await db.activities.find_one({"id": act_ids[0]}, {"_id": 0})
            if act:
                nudge = f"¿Le ponemos fecha al {act['emoji']} {act['name'].lower()}? 😊"
        if not nudge:
            other_id = next((u for u in m["users"] if u != uid), None)
            me = await db.users.find_one({"id": uid}, {"favorite_activities": 1, "_id": 0}) or {}
            other = await db.users.find_one({"id": other_id}, {"favorite_activities": 1, "_id": 0}) or {}
            shared = list(set(me.get("favorite_activities") or []) & set(other.get("favorite_activities") or []))
            if shared:
                nudge = f"¿Arman un plan? A ambos les gusta {shared[0]} 👀"
            else:
                nudge = "¿Les tinca coordinar algo esta semana? 💛"
        await db.messages.insert_one({
            "id": str(uuid.uuid4()),
            "match_id": m["id"],
            "from_user": "system",
            "text": nudge,
            "kind": "system",
            "created_at": now_iso(),
        })
        await db.matches.update_one({"id": m["id"]}, {"$set": {"nudge_sent": True}})


# ------------------------------------------------------------------
# Likes recibidos ("Les tincas")
# ------------------------------------------------------------------
@api.get("/likes-received")
async def likes_received(user: dict = Depends(current_user)):
    """Likes to me that are NOT yet a match, filtered for compat/blocks/pass."""
    uid = user["id"]
    # 1. Existing matches (I already reciprocated) — exclude their senders/modes.
    my_matches = await db.matches.find({"users": uid}, {"users": 1, "mode": 1, "_id": 0}).to_list(500)
    matched_pairs = {(next(u for u in m["users"] if u != uid), m["mode"]) for m in my_matches}
    # 2. I already passed on someone → exclude their likes.
    my_passes = await db.likes.find({"from_user": uid, "kind": "pass"}, {"to_user": 1, "mode": 1, "_id": 0}).to_list(2000)
    passed_pairs = {(p["to_user"], p["mode"]) for p in my_passes}
    # 3. Blocks in either direction.
    blocks = await db.blocks.find({"$or": [{"from_user": uid}, {"to_user": uid}]}, {"_id": 0}).to_list(2000)
    blocked_ids = {b["from_user"] if b["from_user"] != uid else b["to_user"] for b in blocks}

    likes = await db.likes.find({"to_user": uid, "kind": "like"}, {"_id": 0}).sort("created_at", -1).to_list(500)
    sender_ids = list({l["from_user"] for l in likes})
    if not sender_ids:
        return []
    senders = {}
    async for u in db.users.find({"id": {"$in": sender_ids}, "status": {"$ne": "banned"}}, {"password_hash": 0, "_id": 0}):
        if u.get("status") == "suspended":
            continue
        if u["id"] in blocked_ids:
            continue
        senders[u["id"]] = u

    act_ids = [l["activity_id"] for l in likes if l.get("activity_id")]
    acts_by_id = {}
    if act_ids:
        async for a in db.activities.find({"id": {"$in": act_ids}}, {"_id": 0}):
            acts_by_id[a["id"]] = a

    my_gender = user.get("gender")
    my_interested = user.get("interested_genders") or []
    my_age = calc_age(user.get("birthdate"))
    result = []
    for l in likes:
        sender_id = l["from_user"]
        mode = l["mode"]
        if (sender_id, mode) in matched_pairs:
            continue
        if (sender_id, mode) in passed_pairs:
            continue
        sender = senders.get(sender_id)
        if not sender:
            continue
        # Amor compatibility check: I like their gender, they like mine, ages inside both prefs.
        if mode == "amor":
            if my_interested and sender.get("gender") not in my_interested:
                continue
            if my_gender and my_gender not in (sender.get("interested_genders") or []):
                continue
            sender_age = calc_age(sender.get("birthdate"))
            if sender_age is None or sender_age < user.get("age_min", 18) or sender_age > user.get("age_max", 99):
                continue
            if my_age is None or my_age < sender.get("age_min", 18) or my_age > sender.get("age_max", 99):
                continue
        result.append({
            "id": l["id"],
            "profile": clear_public(sender, viewer=user),
            "mode": mode,
            "proposed_activity": acts_by_id.get(l.get("activity_id")) if l.get("activity_id") else None,
            "seen": bool(l.get("seen")),
            "created_at": l["created_at"],
        })
    # Ordering: with proposal first, then by date desc (already desc from mongo sort).
    result.sort(key=lambda x: (0 if x["proposed_activity"] else 1, ), reverse=False)
    return result


@api.post("/likes-received/seen")
async def mark_likes_received_seen(user: dict = Depends(current_user)):
    """Mark all pending received likes as seen (clears the badge)."""
    await db.likes.update_many({"to_user": user["id"], "kind": "like", "seen": {"$ne": True}}, {"$set": {"seen": True}})
    return {"ok": True}


# ------------------------------------------------------------------
# Notifications
# ------------------------------------------------------------------
@api.get("/notifications/counts")
async def notif_counts(user: dict = Depends(current_user)):
    seen_at = user.get("last_seen_matches_at", "1970-01-01T00:00:00+00:00")
    new_matches = await db.matches.count_documents({
        "users": user["id"],
        "created_at": {"$gt": seen_at},
    })
    my_matches = await db.matches.find({"users": user["id"]}, {"id": 1, "_id": 0}).to_list(500)
    if not my_matches:
        unseen_likes = await db.likes.count_documents({"to_user": user["id"], "kind": "like", "seen": {"$ne": True}})
        return {"new_matches": new_matches, "unread_messages": 0, "unseen_likes": unseen_likes, "total": new_matches + unseen_likes}
    match_ids = [m["id"] for m in my_matches]
    reads = {r["match_id"]: r["last_read_at"] async for r in db.reads.find({"user_id": user["id"], "match_id": {"$in": match_ids}}, {"_id": 0})}
    min_last_read = min(reads.values(), default="1970-01-01T00:00:00+00:00") if reads else "1970-01-01T00:00:00+00:00"
    pipe = [
        {"$match": {
            "match_id": {"$in": match_ids},
            "from_user": {"$nin": [user["id"], "system"]},
            "created_at": {"$gt": min_last_read},
        }},
        {"$group": {"_id": "$match_id", "msgs": {"$push": "$created_at"}}},
    ]
    unread_messages = 0
    async for row in db.messages.aggregate(pipe):
        last_read = reads.get(row["_id"], "1970-01-01T00:00:00+00:00")
        unread_messages += sum(1 for c in row["msgs"] if c > last_read)
    # NEW: unseen "Les tincas" (received likes without match yet).
    unseen_likes = await db.likes.count_documents({"to_user": user["id"], "kind": "like", "seen": {"$ne": True}})
    return {
        "new_matches": new_matches,
        "unread_messages": unread_messages,
        "unseen_likes": unseen_likes,
        "total": new_matches + unread_messages + unseen_likes,
    }

@api.post("/notifications/seen-matches")
async def seen_matches(user: dict = Depends(current_user)):
    await db.users.update_one({"id": user["id"]}, {"$set": {"last_seen_matches_at": now_iso()}})
    return {"ok": True}

@api.post("/matches/{match_id}/read")
async def mark_match_read(match_id: str, user: dict = Depends(current_user)):
    await get_match_or_403(match_id, user["id"])
    await db.reads.update_one(
        {"user_id": user["id"], "match_id": match_id},
        {"$set": {"last_read_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True}

# ------------------------------------------------------------------
# Chat
# ------------------------------------------------------------------
async def get_match_or_403(match_id: str, uid: str) -> dict:
    m = await db.matches.find_one({"id": match_id, "users": uid}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Match no encontrado")
    return m

async def _ensure_not_blocked_in_match(match: dict, uid: str):
    other_id = next((u for u in match["users"] if u != uid), None)
    if other_id and await _is_blocked(uid, other_id):
        raise HTTPException(status_code=403, detail="No es posible interactuar con este perfil")

async def _rate_limit_messages(uid: str, per_minute: int = 60):
    since = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
    recent = await db.messages.count_documents({"from_user": uid, "created_at": {"$gt": since}})
    recent += await db.group_messages.count_documents({"from_user": uid, "created_at": {"$gt": since}})
    if recent >= per_minute:
        raise HTTPException(status_code=429, detail="Estás enviando muchos mensajes muy rápido. Respira un poco 💛")

@api.get("/matches/{match_id}/messages")
async def get_messages(
    match_id: str,
    before: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    user: dict = Depends(current_user),
):
    await get_match_or_403(match_id, user["id"])
    q = {"match_id": match_id}
    if before:
        q["created_at"] = {"$lt": before}
    # Fetch latest 'limit' before cursor, then reverse to ascending
    docs = await db.messages.find(q, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    docs.reverse()
    return docs

@api.post("/matches/{match_id}/messages")
async def send_message(match_id: str, body: MessageIn, user: dict = Depends(current_user)):
    match = await get_match_or_403(match_id, user["id"])
    await _ensure_not_blocked_in_match(match, user["id"])
    await _rate_limit_messages(user["id"])
    doc = {
        "id": str(uuid.uuid4()),
        "match_id": match_id,
        "from_user": user["id"],
        "text": body.text.strip(),
        "kind": "text",
        "created_at": now_iso(),
    }
    await db.messages.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.post("/matches/{match_id}/propose-plan")
async def propose_plan(match_id: str, body: ProposePlanIn, user: dict = Depends(current_user)):
    m = await get_match_or_403(match_id, user["id"])
    await _ensure_not_blocked_in_match(m, user["id"])
    act = await db.activities.find_one({"id": body.activity_id}, {"_id": 0})
    if not act:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    plan_id = str(uuid.uuid4())
    plan_doc = {
        "id": plan_id,
        "match_id": match_id,
        "proposed_by": user["id"],
        "activity": act,
        "when": body.when,
        "status": "pending",
        "created_at": now_iso(),
    }
    await db.plans.insert_one(plan_doc)
    await db.messages.insert_one({
        "id": str(uuid.uuid4()),
        "match_id": match_id,
        "from_user": user["id"],
        "text": f"Propuse un plan: {act['emoji']} {act['name']} para el {body.when}",
        "kind": "plan_proposal",
        "plan_id": plan_id,
        "created_at": now_iso(),
    })
    plan_doc.pop("_id", None)
    return plan_doc

@api.post("/plans/{plan_id}/accept")
async def accept_plan(plan_id: str, user: dict = Depends(current_user)):
    plan = await db.plans.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")
    await get_match_or_403(plan["match_id"], user["id"])
    if plan["proposed_by"] == user["id"]:
        raise HTTPException(status_code=400, detail="No puedes aceptar tu propio plan")
    await db.plans.update_one({"id": plan_id}, {"$set": {"status": "accepted", "accepted_at": now_iso()}})
    # Persist on the match so the confirmed plan bar renders (green) in the chat header
    await db.matches.update_one(
        {"id": plan["match_id"]},
        {"$set": {
            "plan_status": "confirmed",
            "confirmed_activity": plan.get("activity"),
            "confirmed_when": plan.get("when"),
            "confirmed_plan_id": plan_id,
            "confirmed_at": now_iso(),
        }},
    )
    await db.messages.insert_one({
        "id": str(uuid.uuid4()),
        "match_id": plan["match_id"],
        "from_user": "system",
        "text": f"¡Plan confirmado! {plan['activity']['emoji']} {plan['activity']['name']} 🎉",
        "kind": "system",
        "created_at": now_iso(),
    })
    # Send "plan confirmed" emails to both users
    try:
        match = await db.matches.find_one({"id": plan["match_id"]}, {"_id": 0}) or {}
        act_name = f"{plan['activity']['emoji']} {plan['activity']['name']}"
        when_str = _format_when(plan.get("when"))
        for uid in match.get("users", []):
            u = await db.users.find_one({"id": uid}, {"_id": 0})
            if not u or not u.get("email"):
                continue
            other_id = next((x for x in match["users"] if x != uid), None)
            other = await db.users.find_one({"id": other_id}, {"_id": 0}) if other_id else None
            subj, html_body = email_svc.plan_confirmed_body(
                alias_other=(other or {}).get("alias", "alguien"),
                activity=act_name,
                when_str=when_str,
                match_id=plan["match_id"],
            )
            await email_svc.send_email(
                db, user_id=uid, to=u["email"], type="plan_confirmed",
                event_ref=f"plan_confirmed:{plan_id}:{uid}",
                subject=subj, body_html=html_body, user_doc=u,
            )
    except Exception:
        logger.exception("plan_confirmed email send failed")
    return {"ok": True}

@api.get("/plans")
async def my_plans(user: dict = Depends(current_user)):
    # 1) Confirmed 1-on-1 plans (existing behavior)
    my_matches = await db.matches.find({"users": user["id"]}, {"id": 1, "users": 1, "_id": 0}).to_list(500)
    match_ids = [m["id"] for m in my_matches]
    plans: List[dict] = []
    if match_ids:
        raw = await db.plans.find({"match_id": {"$in": match_ids}, "status": "accepted"}, {"_id": 0}).sort("when", 1).to_list(500)
        match_to_other = {m["id"]: next((u for u in m["users"] if u != user["id"]), None) for m in my_matches}
        other_ids = list({v for v in match_to_other.values() if v})
        others_by_id = {}
        if other_ids:
            async for u in db.users.find({"id": {"$in": other_ids}}, {"password_hash": 0, "_id": 0}):
                others_by_id[u["id"]] = u
        for p in raw:
            o_id = match_to_other.get(p["match_id"])
            p["kind"] = "match"
            p["with"] = clear_public(others_by_id[o_id], viewer=user) if o_id and o_id in others_by_id else None
            plans.append(p)

    # 2) Group events the user is RSVP'd to
    rsvps = await db.event_rsvps.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    if rsvps:
        eids = [r["event_id"] for r in rsvps]
        events = await db.events.find({"id": {"$in": eids}}, {"_id": 0}).to_list(500)
        group_ids = list({e["group_id"] for e in events})
        groups_by_id = {}
        if group_ids:
            async for g in db.groups.find({"id": {"$in": group_ids}}, {"_id": 0}):
                groups_by_id[g["id"]] = g
        attendee_counts: Dict[str, int] = {}
        for eid in eids:
            attendee_counts[eid] = await db.event_rsvps.count_documents({"event_id": eid})
        for ev in events:
            g = groups_by_id.get(ev.get("group_id"))
            plans.append({
                "id": ev["id"],
                "kind": "group_event",
                "when": ev.get("when"),
                "event": {
                    "id": ev["id"],
                    "emoji": ev.get("emoji", ""),
                    "title": ev.get("title", ""),
                    "description": ev.get("description", ""),
                    "location": ev.get("location", ""),
                    "address": ev.get("address", ""),
                    "map_link": ev.get("map_link", ""),
                    "capacity": ev.get("capacity", 0),
                    "attendee_count": attendee_counts.get(ev["id"], 0),
                },
                "group": {"id": g["id"], "name": g.get("name"), "emoji": g.get("emoji")} if g else None,
            })
    # Sort combined by when ascending
    plans.sort(key=lambda p: p.get("when") or "")
    return plans

@api.delete("/matches/{match_id}")
async def delete_match(match_id: str, user: dict = Depends(current_user)):
    await get_match_or_403(match_id, user["id"])
    await db.matches.delete_one({"id": match_id})
    await db.messages.delete_many({"match_id": match_id})
    await db.plans.delete_many({"match_id": match_id})
    return {"ok": True}

# ------------------------------------------------------------------
# Blocks & Reports
# ------------------------------------------------------------------
@api.post("/block")
async def block_user(body: BlockIn, user: dict = Depends(current_user)):
    await db.blocks.insert_one({
        "id": str(uuid.uuid4()),
        "from_user": user["id"],
        "to_user": body.target_user_id,
        "created_at": now_iso(),
    })
    # remove any match between them
    await db.matches.delete_many({"users": {"$all": [user["id"], body.target_user_id]}})
    return {"ok": True}

@api.post("/report")
async def report_user(body: ReportIn, user: dict = Depends(current_user)):
    priority = "high" if body.category == "ofrece_sustancias" else "normal"
    doc = {
        "id": str(uuid.uuid4()),
        "from_user": user["id"],
        "target_user": body.target_user_id,
        "category": body.category,
        "details": body.details or "",
        "status": "open",
        "priority": priority,
        "created_at": now_iso(),
    }
    await db.reports.insert_one(doc)
    # Grave category → immediate admin alert (throttled 1/hour globally via helper)
    if body.category in ("ofrece_sustancias", "mala_conducta_cita"):
        try:
            subj, html_body = email_svc.admin_grave_report_body(
                category=body.category, when=doc["created_at"],
            )
            await email_svc.send_internal_email(
                db, notif_type="admin_grave_report",
                event_ref=f"grave:{doc['id']}",
                subject=subj, body_html=html_body,
                grave_group_ref="grave:",
            )
        except Exception:
            logger.exception("admin_grave_report email failed")
    return {"ok": True}


def _format_when(when_iso: Optional[str]) -> str:
    """Human-friendly date/time for emails ('hoy 19:00', 'sáb 12 jul 15:30')."""
    if not when_iso:
        return ""
    try:
        dt = datetime.fromisoformat(when_iso).astimezone(ZoneInfo("America/Santiago"))
        return dt.strftime("%a %d %b · %H:%M").replace("Mon", "lun").replace("Tue", "mar").replace("Wed", "mié").replace("Thu", "jue").replace("Fri", "vie").replace("Sat", "sáb").replace("Sun", "dom")
    except Exception:
        return when_iso[:16].replace("T", " ")

# ------------------------------------------------------------------
# My Reasons (Necesito Apoyo)
# ------------------------------------------------------------------
@api.get("/reasons")
async def list_reasons(user: dict = Depends(current_user)):
    items = await db.reasons.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return items

@api.post("/reasons")
async def create_reason(body: ReasonIn, user: dict = Depends(current_user)):
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"], "text": body.text.strip(), "created_at": now_iso()}
    await db.reasons.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.delete("/reasons/{rid}")
async def delete_reason(rid: str, user: dict = Depends(current_user)):
    await db.reasons.delete_one({"id": rid, "user_id": user["id"]})
    return {"ok": True}

# ------------------------------------------------------------------
# Groups & Events
# ------------------------------------------------------------------
@api.get("/groups")
async def list_groups(user: dict = Depends(current_user)):
    groups = await db.groups.find({"active": True}, {"_id": 0}).to_list(500)
    if not groups:
        return []
    gids = [g["id"] for g in groups]
    # Batch counts + memberships
    counts_pipe = [{"$match": {"group_id": {"$in": gids}}}, {"$group": {"_id": "$group_id", "n": {"$sum": 1}}}]
    counts = {r["_id"]: r["n"] async for r in db.group_members.aggregate(counts_pipe)}
    my_memberships = {m["group_id"] async for m in db.group_members.find({"user_id": user["id"], "group_id": {"$in": gids}}, {"group_id": 1, "_id": 0})}
    for g in groups:
        g["member_count"] = counts.get(g["id"], 0)
        g["is_member"] = g["id"] in my_memberships
    return groups

@api.get("/groups/{gid}")
async def get_group(gid: str, user: dict = Depends(current_user)):
    g = await db.groups.find_one({"id": gid}, {"_id": 0})
    if not g:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    members = await db.group_members.find({"group_id": gid}, {"user_id": 1, "_id": 0}).to_list(500)
    member_ids = [m["user_id"] for m in members]
    users_cur = db.users.find({"id": {"$in": member_ids}}, {"alias": 1, "id": 1, "_id": 0})
    aliases = [u.get("alias") async for u in users_cur if u.get("alias")]
    g["member_count"] = len(members)
    g["is_member"] = user["id"] in set(member_ids)
    g["member_aliases"] = aliases
    return g

@api.post("/groups/{gid}/join")
async def join_group(gid: str, user: dict = Depends(current_user)):
    g = await db.groups.find_one({"id": gid})
    if not g:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    existing = await db.group_members.find_one({"group_id": gid, "user_id": user["id"]})
    if not existing:
        await db.group_members.insert_one({"id": str(uuid.uuid4()), "group_id": gid, "user_id": user["id"], "joined_at": now_iso()})
    return {"ok": True}

@api.post("/groups/{gid}/leave")
async def leave_group(gid: str, user: dict = Depends(current_user)):
    await db.group_members.delete_one({"group_id": gid, "user_id": user["id"]})
    return {"ok": True}

@api.get("/groups/{gid}/messages")
async def group_messages(gid: str, user: dict = Depends(current_user)):
    is_member = await db.group_members.find_one({"group_id": gid, "user_id": user["id"]})
    if not is_member:
        raise HTTPException(status_code=403, detail="Únete al grupo para ver el chat")
    msgs = await db.group_messages.find({"group_id": gid}, {"_id": 0}).sort("created_at", 1).to_list(500)
    # Batch-fetch alias + photo for every distinct sender at once (N+1 safe).
    uids = list({m["from_user"] for m in msgs if m.get("from_user") and m["from_user"] != "system"})
    profiles = {}
    if uids:
        async for u in db.users.find({"id": {"$in": uids}}, {"id": 1, "alias": 1, "photos": 1, "_id": 0}):
            profiles[u["id"]] = {
                "alias": u.get("alias") or "Alguien",
                "photo": (u.get("photos") or [None])[0],
            }
    for msg in msgs:
        p = profiles.get(msg.get("from_user"), {})
        if not msg.get("alias"):
            msg["alias"] = p.get("alias", "Alguien")
        msg["photo"] = p.get("photo")
    return msgs

@api.post("/groups/{gid}/messages")
async def send_group_message(gid: str, body: MessageIn, user: dict = Depends(current_user)):
    is_member = await db.group_members.find_one({"group_id": gid, "user_id": user["id"]})
    if not is_member:
        raise HTTPException(status_code=403, detail="Únete al grupo para escribir")
    await _rate_limit_messages(user["id"])
    doc = {
        "id": str(uuid.uuid4()),
        "group_id": gid,
        "from_user": user["id"],
        "alias": user.get("alias", "Alguien"),
        "text": body.text.strip(),
        "created_at": now_iso(),
    }
    await db.group_messages.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.get("/groups/{gid}/events")
async def list_events(gid: str, user: dict = Depends(current_user)):
    events = await db.events.find({"group_id": gid}, {"_id": 0}).sort("when", 1).to_list(200)
    if not events:
        return []
    eids = [e["id"] for e in events]
    rsvps = await db.event_rsvps.find({"event_id": {"$in": eids}}, {"_id": 0}).to_list(2000)
    # Group rsvps by event
    from collections import defaultdict
    by_event = defaultdict(list)
    for r in rsvps:
        by_event[r["event_id"]].append(r["user_id"])
    # Batch fetch aliases
    all_uids = list({uid for lst in by_event.values() for uid in lst})
    aliases_map = {}
    if all_uids:
        async for u in db.users.find({"id": {"$in": all_uids}}, {"id": 1, "alias": 1, "_id": 0}):
            aliases_map[u["id"]] = u.get("alias")
    for e in events:
        uids = by_event.get(e["id"], [])
        e["attendee_count"] = len(uids)
        e["going"] = user["id"] in uids
        e["attendees"] = [aliases_map.get(uid) for uid in uids if aliases_map.get(uid)]
    return events

@api.post("/events/{eid}/rsvp")
async def rsvp_event(eid: str, user: dict = Depends(current_user)):
    e = await db.events.find_one({"id": eid})
    if not e:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    existing = await db.event_rsvps.find_one({"event_id": eid, "user_id": user["id"]})
    if existing:
        return {"ok": True}
    count = await db.event_rsvps.count_documents({"event_id": eid})
    if count >= e.get("capacity", 999):
        raise HTTPException(status_code=400, detail="Cupos agotados")
    await db.event_rsvps.insert_one({"id": str(uuid.uuid4()), "event_id": eid, "user_id": user["id"], "created_at": now_iso()})
    return {"ok": True}

@api.delete("/events/{eid}/rsvp")
async def unrsvp_event(eid: str, user: dict = Depends(current_user)):
    await db.event_rsvps.delete_one({"event_id": eid, "user_id": user["id"]})
    return {"ok": True}

# ------------------------------------------------------------------
# Admin
# ------------------------------------------------------------------
@api.get("/admin/dashboard")
async def admin_dashboard(_: dict = Depends(require_admin)):
    total = await db.users.count_documents({})
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    new_week = await db.users.count_documents({"created_at": {"$gte": week_ago}})
    matches = await db.matches.count_documents({})
    open_reports = await db.reports.count_documents({"status": "open"})
    return {"total_users": total, "new_this_week": new_week, "matches": matches, "open_reports": open_reports}

@api.get("/admin/reports")
async def admin_list_reports(_: dict = Depends(require_admin)):
    reports = await db.reports.find({}, {"_id": 0}).to_list(500)
    if not reports:
        return []
    uids = list({r["from_user"] for r in reports} | {r["target_user"] for r in reports})
    users_by_id = {}
    async for u in db.users.find({"id": {"$in": uids}}, {"id": 1, "alias": 1, "email": 1, "_id": 0}):
        users_by_id[u["id"]] = u
    for r in reports:
        r.setdefault("priority", "high" if r.get("category") == "ofrece_sustancias" else "normal")
        f = users_by_id.get(r["from_user"], {})
        t = users_by_id.get(r["target_user"], {})
        r["from_alias"] = f.get("alias")
        r["target_alias"] = t.get("alias")
        r["target_email"] = t.get("email")
    reports.sort(key=lambda r: (
        0 if (r.get("priority") == "high" and r.get("status") == "open") else 1,
        0 if r.get("status") == "open" else 1,
        -datetime.fromisoformat(r["created_at"]).timestamp() if isinstance(r.get("created_at"), str) else 0,
    ))
    return reports

@api.post("/admin/reports/{rid}/resolve")
async def admin_resolve_report(rid: str, _: dict = Depends(require_admin)):
    await db.reports.update_one({"id": rid}, {"$set": {"status": "resolved", "resolved_at": now_iso()}})
    return {"ok": True}

@api.post("/admin/users/action")
async def admin_action(body: AdminActionIn, admin: dict = Depends(require_admin)):
    u = await db.users.find_one({"id": body.target_user_id})
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    log = {"id": str(uuid.uuid4()), "user_id": body.target_user_id, "admin_id": admin["id"], "action": body.action, "note": body.note or "", "created_at": now_iso()}
    await db.admin_actions.insert_one(log)
    if body.action == "warn":
        await db.users.update_one({"id": body.target_user_id}, {"$inc": {"strikes": 1}})
    elif body.action == "suspend":
        until = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        await db.users.update_one({"id": body.target_user_id}, {"$set": {"status": "suspended", "suspended_until": until}})
    elif body.action == "ban":
        await db.users.update_one({"id": body.target_user_id}, {"$set": {"status": "banned"}})
    elif body.action == "reactivate":
        await db.users.update_one({"id": body.target_user_id}, {"$set": {"status": "active"}, "$unset": {"suspended_until": ""}})
    return {"ok": True}

def _strip_admin_user(u: dict) -> dict:
    """Remove precise coords from admin views. Admin never needs raw GPS."""
    loc = u.get("location")
    if isinstance(loc, dict):
        u["location"] = {
            "country": loc.get("country"),
            "city": loc.get("city"),
            "comuna": loc.get("comuna"),
        }
    return u

@api.get("/admin/users")
async def admin_list_users(q: str = "", _: dict = Depends(require_admin)):
    query = {}
    if q:
        query = {"$or": [{"email": {"$regex": q, "$options": "i"}}, {"alias": {"$regex": q, "$options": "i"}}]}
    users = await db.users.find(query, {"password_hash": 0, "_id": 0}).sort("created_at", -1).to_list(500)
    if not users:
        return []
    uids = [u["id"] for u in users]
    counts_pipe = [{"$match": {"target_user": {"$in": uids}}}, {"$group": {"_id": "$target_user", "n": {"$sum": 1}}}]
    report_counts = {r["_id"]: r["n"] async for r in db.reports.aggregate(counts_pipe)}
    for u in users:
        u["strikes"] = u.get("strikes", 0)
        u["report_count"] = report_counts.get(u["id"], 0)
        _strip_admin_user(u)
    return users

@api.get("/admin/user/{uid}")
async def admin_get_user(uid: str, _: dict = Depends(require_admin)):
    u = await db.users.find_one({"id": uid}, {"password_hash": 0, "_id": 0})
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    _strip_admin_user(u)
    reports = await db.reports.find({"target_user": uid}, {"_id": 0}).to_list(200)
    actions = await db.admin_actions.find({"user_id": uid}, {"_id": 0}).to_list(200)
    return {"user": u, "reports": reports, "actions": actions}

@api.post("/admin/cleanup-tests")
async def admin_cleanup_tests(_: dict = Depends(require_admin)):
    """Delete test users (email starts with 'test' or 'TEST_') and their artifacts."""
    victims = await db.users.find(
        {"email": {"$regex": r"^test_", "$options": "i"}, "role": {"$ne": "admin"}},
        {"id": 1, "email": 1, "_id": 0},
    ).to_list(500)
    if not victims:
        return {"deleted_users": 0, "emails": []}
    vids = [v["id"] for v in victims]
    my_matches = await db.matches.find({"users": {"$in": vids}}, {"id": 1, "_id": 0}).to_list(2000)
    match_ids = [m["id"] for m in my_matches]

    await db.users.delete_many({"id": {"$in": vids}})
    await db.likes.delete_many({"$or": [{"from_user": {"$in": vids}}, {"to_user": {"$in": vids}}]})
    await db.matches.delete_many({"users": {"$in": vids}})
    if match_ids:
        await db.messages.delete_many({"match_id": {"$in": match_ids}})
        await db.plans.delete_many({"match_id": {"$in": match_ids}})
        await db.reads.delete_many({"match_id": {"$in": match_ids}})
    await db.messages.delete_many({"from_user": {"$in": vids}})
    await db.reasons.delete_many({"user_id": {"$in": vids}})
    await db.blocks.delete_many({"$or": [{"from_user": {"$in": vids}}, {"to_user": {"$in": vids}}]})
    # Delete reports FROM test users; keep reports ABOUT real users
    await db.reports.delete_many({"$or": [{"from_user": {"$in": vids}}, {"target_user": {"$in": vids}}]})
    await db.group_members.delete_many({"user_id": {"$in": vids}})
    await db.group_messages.delete_many({"from_user": {"$in": vids}})
    await db.event_rsvps.delete_many({"user_id": {"$in": vids}})
    await db.reads.delete_many({"user_id": {"$in": vids}})
    await db.files.update_many({"user_id": {"$in": vids}}, {"$set": {"is_deleted": True, "deleted_at": now_iso()}})
    return {"deleted_users": len(vids), "emails": [v["email"] for v in victims]}

# Admin CRUD groups & events
@api.post("/admin/groups")
async def admin_create_group(body: GroupIn, _: dict = Depends(require_admin)):
    doc = {"id": str(uuid.uuid4()), "active": True, "created_at": now_iso(), **body.model_dump()}
    await db.groups.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.patch("/admin/groups/{gid}")
async def admin_update_group(gid: str, body: dict, _: dict = Depends(require_admin)):
    body.pop("id", None); body.pop("_id", None)
    await db.groups.update_one({"id": gid}, {"$set": body})
    return {"ok": True}

@api.delete("/admin/groups/{gid}")
async def admin_delete_group(gid: str, _: dict = Depends(require_admin)):
    await db.groups.update_one({"id": gid}, {"$set": {"active": False}})
    return {"ok": True}

@api.post("/admin/events")
async def admin_create_event(body: EventIn, _: dict = Depends(require_admin)):
    doc = {"id": str(uuid.uuid4()), "created_at": now_iso(), **body.model_dump()}
    await db.events.insert_one(doc)
    # Notify group members
    try:
        group = await db.groups.find_one({"id": body.group_id}, {"_id": 0}) or {}
        members = await db.group_members.find({"group_id": body.group_id}, {"_id": 0}).to_list(1000)
        when_str = _format_when(doc.get("when"))
        for gm in members:
            u = await db.users.find_one({"id": gm["user_id"]}, {"_id": 0})
            if not u or not u.get("email"):
                continue
            subj, html_body = email_svc.event_in_group_body(
                group_name=group.get("name", "tu grupo"),
                event_title=doc.get("title", "Nuevo evento"),
                when_str=when_str,
                group_id=body.group_id,
            )
            await email_svc.send_email(
                db, user_id=u["id"], to=u["email"], type="event_new_in_group",
                event_ref=f"event:{doc['id']}:{u['id']}",
                subject=subj, body_html=html_body, user_doc=u,
            )
    except Exception:
        logger.exception("event_new_in_group email failed")
    doc.pop("_id", None)
    return doc

@api.patch("/admin/events/{eid}")
async def admin_update_event(eid: str, body: dict, _: dict = Depends(require_admin)):
    body.pop("id", None); body.pop("_id", None)
    await db.events.update_one({"id": eid}, {"$set": body})
    return {"ok": True}

@api.delete("/admin/events/{eid}")
async def admin_delete_event(eid: str, _: dict = Depends(require_admin)):
    await db.events.delete_one({"id": eid})
    await db.event_rsvps.delete_many({"event_id": eid})
    return {"ok": True}


# ------------------------------------------------------------------
# Admin - Reset Beta (danger zone)
# ------------------------------------------------------------------
class ResetBetaIn(BaseModel):
    confirmation: str  # must equal "RESETEAR"


@api.post("/admin/reset-beta")
async def admin_reset_beta(body: ResetBetaIn, admin: dict = Depends(require_admin)):
    """Wipe ALL non-admin users + their data, and turn off demo re-seeding.

    Deletes: users (role != admin), likes, matches, messages, plans, reads,
    blocks, reasons (user-created?), reports, group_members, group_messages,
    event_rsvps, email_log (user emails only, keep internal), email_preferences.
    Marks user file uploads as deleted. Keeps: groups, events, activities,
    countries, helplines, admin_notification_recipients, metrics_daily,
    support_page_views, admin users.
    """
    if body.confirmation != "RESETEAR":
        raise HTTPException(status_code=400, detail="Debes escribir RESETEAR para confirmar")

    counts: Dict[str, int] = {}

    # Get IDs of admin users to preserve
    admin_ids = [d["id"] async for d in db.users.find({"role": "admin"}, {"id": 1, "_id": 0})]

    # Delete non-admin users and everything tied to them
    users_res = await db.users.delete_many({"role": {"$ne": "admin"}})
    counts["users"] = users_res.deleted_count

    # Everything else — brute delete (safe: admins never appear in these)
    for coll, filt in [
        ("likes", {}),
        ("matches", {}),
        ("messages", {}),
        ("plans", {}),
        ("reads", {}),
        ("blocks", {}),
        ("reports", {}),
        ("group_members", {}),
        ("group_messages", {}),
        ("event_rsvps", {}),
        ("email_preferences", {}),
        # Only USER emails, keep internal team ones for audit trail
        ("email_log", {"user_id": {"$ne": None}}),
    ]:
        res = await db[coll].delete_many(filt)
        counts[coll] = res.deleted_count

    # Soft-delete user file uploads (don't unlink files, just mark)
    files_res = await db.files.update_many({}, {"$set": {"deleted": True, "deleted_at": now_iso()}})
    counts["files_soft_deleted"] = files_res.modified_count

    # Persist "demo_seed_enabled = false" so restarts never re-seed
    await db.app_settings.update_one(
        {"key": "demo_seed_enabled"},
        {"$set": {"key": "demo_seed_enabled", "value": False, "updated_at": now_iso(), "updated_by": admin["id"]}},
        upsert=True,
    )

    # Audit trail
    await db.admin_actions.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": admin["id"],
        "admin_email": admin.get("email"),
        "action": "reset_beta",
        "counts": counts,
        "created_at": now_iso(),
    })

    return {"ok": True, "counts": counts, "admins_preserved": len(admin_ids)}


@api.get("/admin/settings")
async def admin_get_settings(_: dict = Depends(require_admin)):
    docs = await db.app_settings.find({}, {"_id": 0}).to_list(50)
    return {d["key"]: d["value"] for d in docs}


# ------------------------------------------------------------------
# Admin - Metrics (aggregate-only, privacy-first)
# ------------------------------------------------------------------
@api.post("/support-page/view")
async def support_page_view():
    """Anonymous counter for 'Necesito apoyo' opens. NO user_id is stored,
    only date + counter."""
    today = metrics_mod.today_local().isoformat()
    await db.support_page_views.update_one(
        {"date": today},
        {"$inc": {"count": 1}, "$setOnInsert": {"date": today}},
        upsert=True,
    )
    return {"ok": True}


def _valid_days(days: int) -> int:
    if days not in (7, 30, 90):
        raise HTTPException(status_code=400, detail="El rango debe ser 7, 30 o 90 días")
    return days


@api.get("/admin/metrics/summary")
async def admin_metrics_summary(days: int = 7, _: dict = Depends(require_admin)):
    return await metrics_mod.build_summary(db, _valid_days(days))


@api.get("/admin/metrics/funnel")
async def admin_metrics_funnel(days: int = 30, _: dict = Depends(require_admin)):
    return await metrics_mod.build_funnel(db, _valid_days(days))


class MetricsBackfillIn(BaseModel):
    start: str  # YYYY-MM-DD
    end: str


@api.post("/admin/metrics/backfill")
async def admin_metrics_backfill(body: MetricsBackfillIn, _: dict = Depends(require_admin)):
    try:
        s = date_cls.fromisoformat(body.start)
        e = date_cls.fromisoformat(body.end)
    except ValueError:
        raise HTTPException(status_code=400, detail="Fechas inválidas (usar YYYY-MM-DD)")
    if s > e:
        raise HTTPException(status_code=400, detail="'start' debe ser <= 'end'")
    max_span = 400
    if (e - s).days > max_span:
        raise HTTPException(status_code=400, detail=f"Rango máximo {max_span} días")
    n = await metrics_mod.backfill_range(db, s, e)
    return {"ok": True, "days_computed": n}


@api.get("/admin/metrics/matching")
async def admin_metrics_matching(days: int = 30, _: dict = Depends(require_admin)):
    return await metrics_mod.build_matching(db, _valid_days(days))


@api.get("/admin/metrics/planes")
async def admin_metrics_planes(days: int = 30, _: dict = Depends(require_admin)):
    return await metrics_mod.build_planes(db, _valid_days(days))


@api.get("/admin/metrics/comunidad")
async def admin_metrics_comunidad(days: int = 30, _: dict = Depends(require_admin)):
    return await metrics_mod.build_comunidad(db, _valid_days(days))


@api.get("/admin/metrics/retencion")
async def admin_metrics_retencion(days: int = 30, _: dict = Depends(require_admin)):
    return await metrics_mod.build_retencion(db, _valid_days(days))


@api.get("/admin/metrics/seguridad")
async def admin_metrics_seguridad(days: int = 30, _: dict = Depends(require_admin)):
    return await metrics_mod.build_seguridad(db, _valid_days(days))


# ------------------------------------------------------------------
# Seed
# ------------------------------------------------------------------
async def seed_admin_and_data():
    # Indexes
    await db.users.create_index("id", unique=True)
    await db.users.create_index("email", unique=True)
    await db.users.create_index("alias")
    await db.users.create_index([("modes", 1), ("status", 1), ("onboarding_complete", 1)])
    await db.likes.create_index([("from_user", 1), ("to_user", 1), ("mode", 1), ("kind", 1)])
    await db.likes.create_index([("from_user", 1), ("kind", 1), ("date", 1)])
    await db.matches.create_index("users")
    await db.matches.create_index([("users", 1), ("created_at", -1)])
    await db.messages.create_index([("match_id", 1), ("created_at", 1)])
    await db.messages.create_index([("from_user", 1), ("created_at", -1)])
    await db.group_messages.create_index([("group_id", 1), ("created_at", 1)])
    await db.group_messages.create_index([("from_user", 1), ("created_at", -1)])
    await db.group_members.create_index([("group_id", 1), ("user_id", 1)], unique=False)
    await db.group_members.create_index("user_id")
    await db.event_rsvps.create_index([("event_id", 1), ("user_id", 1)])
    await db.events.create_index([("group_id", 1), ("when", 1)])
    await db.reads.create_index([("user_id", 1), ("match_id", 1)], unique=True)
    await db.blocks.create_index([("from_user", 1), ("to_user", 1)])
    await db.blocks.create_index("to_user")
    await db.reports.create_index([("status", 1), ("priority", 1), ("created_at", -1)])
    await db.reports.create_index("target_user")
    await db.plans.create_index([("match_id", 1), ("status", 1)])
    await db.files.create_index("user_id")
    await db.activities.create_index("active")
    await db.groups.create_index("active")
    await db.metrics_daily.create_index("date", unique=True)
    await db.support_page_views.create_index("date", unique=True)
    # Email
    await db.email_log.create_index("idempotency_key", unique=True)
    await db.email_log.create_index([("status", 1), ("deliver_after", 1)])
    await db.email_log.create_index([("user_id", 1), ("type", 1), ("sent_at", -1)])
    await db.email_preferences.create_index("user_id", unique=True)
    await db.admin_notification_recipients.create_index("email", unique=True)
    # Seed default admin recipient (idempotent). If deleted from /admin panel,
    # it stays deleted — $setOnInsert only fills on the initial insert.
    await db.admin_notification_recipients.update_one(
        {"email": "nelson@sinadicciones.org"},
        {"$setOnInsert": {
            "email": "nelson@sinadicciones.org",
            "active_for": {"admin_new_user": True, "admin_daily_summary": True, "admin_grave_report": True},
            "created_at": now_iso(),
        }},
        upsert=True,
    )
    # Geo indexes (idempotent)
    await db.users.create_index([("location.coords", "2dsphere")])
    await db.users.create_index("country")
    await db.groups.create_index([("location.coords", "2dsphere")])
    await db.countries.create_index("code", unique=True)
    await db.helplines.create_index([("country", 1), ("order", 1)])
    await db.waitlist.create_index("email", unique=True)

    # Admin
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_pw = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_pw),
            "alias": "Equipo PlanSobrio",
            "role": "admin",
            "status": "active",
            "onboarding_complete": True,
            "gender": "prefiero_no_decir",
            "comuna": "Santiago",
            "modes": [],
            "birthdate": "1990-01-01",
            "photos": [],
            "prompts": [],
            "favorite_activities": [],
            "created_at": now_iso(),
            "is_demo": False,
        })
        logger.info("Admin creado")
    else:
        if not verify_password(admin_pw, existing.get("password_hash", "")):
            await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_pw), "role": "admin"}})
        elif existing.get("role") != "admin":
            await db.users.update_one({"email": admin_email}, {"$set": {"role": "admin"}})

    # Activities
    if await db.activities.count_documents({}) == 0:
        for emoji, name, cat, icon in SEED_ACTIVITIES:
            await db.activities.insert_one({
                "id": str(uuid.uuid4()), "emoji": emoji, "icon": icon, "name": name,
                "category": cat, "active": True, "created_at": now_iso(),
            })
        logger.info("Actividades sembradas")
    else:
        # Backfill icon on existing activities (idempotent by name).
        icon_by_name = {name: icon for _, name, _, icon in SEED_ACTIVITIES}
        async for a in db.activities.find({"icon": {"$exists": False}}, {"id": 1, "name": 1, "_id": 0}):
            new_icon = icon_by_name.get(a.get("name"))
            if new_icon:
                await db.activities.update_one({"id": a["id"]}, {"$set": {"icon": new_icon}})

    # Groups
    if await db.groups.count_documents({}) == 0:
        for g in SEED_GROUPS:
            gid = str(uuid.uuid4())
            await db.groups.insert_one({"id": gid, "active": True, "created_at": now_iso(), **g})
            # sample event next week
            when = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
            await db.events.insert_one({
                "id": str(uuid.uuid4()),
                "group_id": gid,
                "title": f"Junta de bienvenida - {g['name']}",
                "description": "Una junta abierta para conocernos. Ven como quieras, sin presión.",
                "when": when,
                "location": g["comuna"] or "Online (link se compartirá)",
                "map_link": "",
                "capacity": 20,
                "created_at": now_iso(),
            })
        logger.info("Grupos sembrados")

    # Demo profiles - respect persistent app_settings flag (set to False after reset-beta)
    activities = await db.activities.find({}, {"_id": 0}).to_list(100)
    act_by_name = {a["name"]: a for a in activities}

    seed_setting = await db.app_settings.find_one({"key": "demo_seed_enabled"}, {"_id": 0})
    demo_seed_enabled = True if seed_setting is None else bool(seed_setting.get("value"))

    if demo_seed_enabled and await db.users.count_documents({"is_demo": True}) == 0:
        for i, (alias, gs, gender, age, comuna, modes, interested, fav_names, sober) in enumerate(DEMO_PROFILES, start=1):
            bd = (datetime.now(timezone.utc).date().replace(year=datetime.now(timezone.utc).year - age)).isoformat()
            favs = [act_by_name[n]["id"] for n in fav_names if n in act_by_name]
            prompts = random.sample(DEMO_PROMPTS, 3)
            uid = str(uuid.uuid4())
            await db.users.insert_one({
                "id": uid,
                "email": f"demo{i}@plansobrio.cl",
                "password_hash": hash_password("Demo1234!"),
                "alias": alias,
                "gender": gender,
                "birthdate": bd,
                "comuna": comuna,
                "modes": modes,
                "interested_genders": interested,
                "age_min": max(18, age - 8),
                "age_max": age + 12,
                "relationship_with_substances": "sin_consumo",
                "sober_time": sober,
                "show_sober_time": True,
                "favorite_activities": favs,
                "photos": DEMO_PHOTOS.get(alias, []),
                "prompts": [{"q": q, "a": a} for q, a in prompts],
                "role": "user",
                "status": "active",
                "onboarding_complete": True,
                "accepted_rules_at": now_iso(),
                "created_at": now_iso(),
                "is_demo": True,
            })
        logger.info("12 perfiles demo sembrados")

    # Backfill photos for existing demo profiles (idempotent - only if photos empty)
    for alias, urls in DEMO_PHOTOS.items():
        await db.users.update_one(
            {"alias": alias, "is_demo": True, "$or": [{"photos": []}, {"photos": {"$exists": False}}]},
            {"$set": {"photos": urls}},
        )

    # ---- GEO seed ----
    # Countries catalog (idempotent upsert).
    for idx, c in enumerate(COUNTRIES_SEED):
        await db.countries.update_one(
            {"code": c["code"]},
            {"$set": {
                "code": c["code"], "name": c["name"], "flag": c["flag"],
                "enabled": c.get("enabled", False), "timezone": c.get("timezone"),
                "cities": c.get("cities", []), "order": idx,
            }},
            upsert=True,
        )
    # Helplines (idempotent per name+country).
    for h in HELPLINES_SEED_CL:
        await db.helplines.update_one(
            {"country": h["country"], "name": h["name"]},
            {"$set": h},
            upsert=True,
        )

    # Backfill `location` + `country` on users missing them (demos, admin, early testers).
    async for u in db.users.find({"location": {"$exists": False}}, {"id": 1, "comuna": 1, "_id": 0}):
        loc = build_location_doc(country="CL", comuna=u.get("comuna"), city=u.get("comuna"), coords=None)
        if loc:
            await db.users.update_one({"id": u["id"]}, {"$set": {"location": loc, "country": "CL"}})
    # Same for groups
    async for g in db.groups.find({"location.coords": {"$exists": False}}, {"id": 1, "comuna": 1, "_id": 0}):
        loc = build_location_doc(country="CL", comuna=g.get("comuna"), city=g.get("comuna"), coords=None)
        if loc:
            await db.groups.update_one({"id": g["id"]}, {"$set": {"location": loc, "country": "CL"}})

    # Privacy migration: re-round coords stored with more than 2 decimals down to 2 (~1km grid).
    async for u in db.users.find({"location.coords.coordinates": {"$exists": True}}, {"id": 1, "location": 1, "_id": 0}):
        coords = (u.get("location") or {}).get("coords", {}).get("coordinates")
        if not coords or len(coords) != 2:
            continue
        rounded = round_coords(coords[0], coords[1])
        if rounded != coords:
            await db.users.update_one({"id": u["id"]}, {"$set": {"location.coords.coordinates": rounded}})

    # Migration: `proposals` field on matches. Old matches only stored a single
    # `proposed_activity`; treat it as shared between both users so the UI can render.
    async for m in db.matches.find({"proposals": {"$exists": False}}, {"id": 1, "users": 1, "proposed_activity": 1, "_id": 0}):
        pa = m.get("proposed_activity") or {}
        aid = pa.get("id") if isinstance(pa, dict) else None
        users = m.get("users") or []
        proposals = {u: aid for u in users}  # both share (best-effort inference)
        await db.matches.update_one({"id": m["id"]}, {"$set": {"proposals": proposals}})
    # Ensure existing likes are marked seen so the badge doesn't explode on startup.
    await db.likes.update_many({"seen": {"$exists": False}}, {"$set": {"seen": True}})

    # Profile enrichment migration (Feb 2026): compute zodiac from birthdate and
    # set sensible defaults for the new visibility switches, all idempotent.
    async for u in db.users.find({"birthdate": {"$exists": True, "$ne": None}, "zodiac": {"$exists": False}}, {"id": 1, "birthdate": 1, "_id": 0}):
        z = zodiac_from_birthdate(u.get("birthdate"))
        if z:
            await db.users.update_one({"id": u["id"]}, {"$set": {"zodiac": z}})
    # Defaults for the visibility switches so existing users behave as expected.
    await db.users.update_many({"show_modes": {"$exists": False}}, {"$set": {"show_modes": True}})
    await db.users.update_many({"show_zodiac": {"$exists": False}}, {"$set": {"show_zodiac": False}})
    await db.users.update_many({"show_children": {"$exists": False}}, {"$set": {"show_children": True}})
    await db.users.update_many({"show_height": {"$exists": False}}, {"$set": {"show_height": False}})

@app.on_event("startup")
async def on_startup():
    init_storage()
    await seed_admin_and_data()
    # Kick off the nightly metrics snapshot loop (03:00 America/Santiago)
    asyncio.create_task(metrics_mod.daily_snapshot_loop(db))
    # Email queue drain loop (every 10 min: delivers emails queued during quiet hours)
    asyncio.create_task(email_svc.queue_drain_loop(db))
    # Scheduled email jobs (admin daily summary 08:30, plan reminders 09:00, weekly Thu 12:00)
    asyncio.create_task(email_svc.scheduled_jobs_loop(db, metrics_mod))

# ------------------------------------------------------------------
app.include_router(api)

# CORS: allow only trusted frontend origins from env (comma-separated FRONTEND_URL).
_frontend_urls = [u.strip() for u in os.environ.get("FRONTEND_URL", "http://localhost:3000").split(",") if u.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_frontend_urls,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
