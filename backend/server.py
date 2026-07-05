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
import requests
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File, Header, Query
from fastapi.responses import Response as FastAPIResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

from core.storage import init_storage, put_object, get_object
from core.seed_data import SEED_ACTIVITIES, SEED_GROUPS, DEMO_PROFILES, DEMO_PHOTOS, DEMO_PROMPTS

# ------------------------------------------------------------------
# Config
# ------------------------------------------------------------------
JWT_ALGORITHM = "HS256"
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
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
        raise HTTPException(status_code=403, detail="Tu cuenta fue suspendida por incumplir las reglas de la comunidad")
    if user.get("status") == "suspended":
        until = user.get("suspended_until")
        if until:
            try:
                until_dt = datetime.fromisoformat(until)
                if until_dt > datetime.now(timezone.utc):
                    raise HTTPException(status_code=403, detail=f"Cuenta suspendida hasta {until}")
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

def clear_public(user: dict) -> dict:
    """Public view of a user - hides email, private fields."""
    return {
        "id": user["id"],
        "alias": user.get("alias"),
        "age": calc_age(user.get("birthdate")) if user.get("birthdate") else None,
        "comuna": user.get("comuna"),
        "gender": user.get("gender"),
        "modes": user.get("modes", []),
        "photos": user.get("photos", []),
        "videos": user.get("videos", []),
        "prompts": user.get("prompts", []),
        "favorite_activities": user.get("favorite_activities", []),
        "sober_time_badge": user.get("sober_time") if user.get("show_sober_time") else None,
    }

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
    prompts: List[dict]  # [{q, a}]
    accepted_rules: bool

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
    title: str
    description: str
    when: str
    location: str
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
    user_doc.pop("password_hash", None)
    user_doc.pop("_id", None)
    return {"user": user_doc, "token": token}

@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    if user.get("status") == "banned":
        raise HTTPException(status_code=403, detail="Tu cuenta fue suspendida por incumplir las reglas de la comunidad")
    token = create_access_token(user["id"], email)
    set_auth_cookie(response, token)
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"user": user, "token": token}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return user

# ------------------------------------------------------------------
# Uploads
# ------------------------------------------------------------------
@api.post("/uploads/photo")
async def upload_photo(file: UploadFile = File(...), user: dict = Depends(current_user)):
    ext = (file.filename or "img").split(".")[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp", "gif"):
        raise HTTPException(status_code=400, detail="Formato no permitido")
    mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp", "gif": "image/gif"}[ext]
    path = f"{APP_NAME}/photos/{user['id']}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Foto demasiado grande (máx 8MB)")
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
        "prompts": body.prompts,
        "accepted_rules_at": now_iso(),
        "onboarding_complete": True,
    }
    await db.users.update_one({"id": user["id"]}, {"$set": update})
    return {"ok": True}

@api.patch("/profile/me")
async def update_profile(body: ProfileUpdateIn, user: dict = Depends(current_user)):
    update = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if update:
        await db.users.update_one({"id": user["id"]}, {"$set": update})
    return {"ok": True}

@api.get("/profile/{user_id}")
async def get_public_profile(user_id: str, user: dict = Depends(current_user)):
    target = await db.users.find_one({"id": user_id}, {"password_hash": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Perfil no encontrado")
    return clear_public(target)

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
        if c.get("comuna") == my_comuna:
            zone = 0
        elif c.get("comuna") == "Otra región" or my_comuna == "Otra región":
            zone = 2
        else:
            zone = 1
        c["_score"] = (zone, -overlap, random.random())
        c.pop("_id", None)
        scored.append(c)
    scored.sort(key=lambda x: x["_score"])
    result = [clear_public(c) for c in scored[:30]]
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

    activity = None
    if body.activity_id and not body.no_plan:
        activity = await db.activities.find_one({"id": body.activity_id}, {"_id": 0})

    doc = {
        "id": str(uuid.uuid4()),
        "from_user": user["id"],
        "to_user": body.target_user_id,
        "mode": body.mode,
        "kind": "like",
        "activity_id": body.activity_id if not body.no_plan else None,
        "date": today,
        "created_at": now_iso(),
    }
    await db.likes.insert_one(doc)

    # Check reciprocal like
    reciprocal = await db.likes.find_one({"from_user": body.target_user_id, "to_user": user["id"], "mode": body.mode, "kind": "like"})
    if reciprocal:
        # Create match if not exists
        match = await db.matches.find_one({"users": {"$all": [user["id"], body.target_user_id]}, "mode": body.mode})
        if not match:
            match_id = str(uuid.uuid4())
            proposed_activity = activity
            if not proposed_activity and reciprocal.get("activity_id"):
                proposed_activity = await db.activities.find_one({"id": reciprocal["activity_id"]}, {"_id": 0})
            match_doc = {
                "id": match_id,
                "users": [user["id"], body.target_user_id],
                "mode": body.mode,
                "proposed_activity": proposed_activity,
                "created_at": now_iso(),
            }
            await db.matches.insert_one(match_doc)
            # System message
            if proposed_activity:
                sys_text = f"A ambos les tinca: {proposed_activity['emoji']} {proposed_activity['name']}. ¿Coordinamos? 😊"
            else:
                sys_text = "¡Se dio el match! Ya pueden coordinar un panorama 💛"
            await db.messages.insert_one({
                "id": str(uuid.uuid4()),
                "match_id": match_id,
                "from_user": "system",
                "text": sys_text,
                "kind": "system",
                "created_at": now_iso(),
            })
            other = await db.users.find_one({"id": body.target_user_id}, {"password_hash": 0})
            return {"match": True, "match_id": match_id, "other": clear_public(other) if other else None, "proposed_activity": proposed_activity}
        else:
            # Match already existed — still signal match to the client so it can navigate to the chat
            other = await db.users.find_one({"id": body.target_user_id}, {"password_hash": 0})
            return {"match": True, "match_id": match["id"], "other": clear_public(other) if other else None, "proposed_activity": match.get("proposed_activity")}
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

    # Unread count per match: messages after last_read from non-self, non-system
    unread_pipeline = [
        {"$match": {
            "match_id": {"$in": match_ids},
            "from_user": {"$nin": [uid, "system"]},
        }},
        {"$group": {"_id": "$match_id", "msgs": {"$push": {"c": "$created_at"}}}},
    ]
    unread_by_match = {}
    async for row in db.messages.aggregate(unread_pipeline):
        last_read = reads.get(row["_id"], "1970-01-01T00:00:00+00:00")
        unread_by_match[row["_id"]] = sum(1 for m in row["msgs"] if m["c"] > last_read)

    result = []
    for m in matches:
        other_id = next(u for u in m["users"] if u != uid)
        other = users_by_id.get(other_id)
        if not other:
            continue
        result.append({
            "id": m["id"],
            "mode": m["mode"],
            "other": clear_public(other),
            "proposed_activity": m.get("proposed_activity"),
            "last_message": last_by_match.get(m["id"]),
            "unread": unread_by_match.get(m["id"], 0),
            "created_at": m["created_at"],
        })
    return result

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
        return {"new_matches": new_matches, "unread_messages": 0, "total": new_matches}
    match_ids = [m["id"] for m in my_matches]
    reads = {r["match_id"]: r["last_read_at"] async for r in db.reads.find({"user_id": user["id"], "match_id": {"$in": match_ids}}, {"_id": 0})}
    # One aggregation pipeline for unread messages count
    pipe = [
        {"$match": {"match_id": {"$in": match_ids}, "from_user": {"$nin": [user["id"], "system"]}}},
        {"$group": {"_id": "$match_id", "msgs": {"$push": "$created_at"}}},
    ]
    unread_messages = 0
    async for row in db.messages.aggregate(pipe):
        last_read = reads.get(row["_id"], "1970-01-01T00:00:00+00:00")
        unread_messages += sum(1 for c in row["msgs"] if c > last_read)
    return {"new_matches": new_matches, "unread_messages": unread_messages, "total": new_matches + unread_messages}

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
    await db.messages.insert_one({
        "id": str(uuid.uuid4()),
        "match_id": plan["match_id"],
        "from_user": "system",
        "text": f"¡Plan confirmado! {plan['activity']['emoji']} {plan['activity']['name']} 🎉",
        "kind": "system",
        "created_at": now_iso(),
    })
    return {"ok": True}

@api.get("/plans")
async def my_plans(user: dict = Depends(current_user)):
    my_matches = await db.matches.find({"users": user["id"]}, {"id": 1, "users": 1, "_id": 0}).to_list(500)
    ids = [m["id"] for m in my_matches]
    if not ids:
        return []
    plans = await db.plans.find({"match_id": {"$in": ids}, "status": "accepted"}, {"_id": 0}).sort("when", 1).to_list(500)
    if not plans:
        return []
    # Map match->other user
    match_to_other = {m["id"]: next((u for u in m["users"] if u != user["id"]), None) for m in my_matches}
    other_ids = list({v for v in match_to_other.values() if v})
    others_by_id = {}
    if other_ids:
        async for u in db.users.find({"id": {"$in": other_ids}}, {"password_hash": 0, "_id": 0}):
            others_by_id[u["id"]] = u
    for p in plans:
        o_id = match_to_other.get(p["match_id"])
        p["with"] = clear_public(others_by_id[o_id]) if o_id and o_id in others_by_id else None
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
    return {"ok": True}

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
    # Batch fetch aliases (though messages already store alias at write time)
    missing_uids = list({m["from_user"] for m in msgs if m.get("from_user") and m["from_user"] != "system" and not m.get("alias")})
    if missing_uids:
        aliases_map = {}
        async for u in db.users.find({"id": {"$in": missing_uids}}, {"id": 1, "alias": 1, "_id": 0}):
            aliases_map[u["id"]] = u.get("alias")
        for msg in msgs:
            if msg.get("from_user") and msg["from_user"] != "system" and not msg.get("alias"):
                msg["alias"] = aliases_map.get(msg["from_user"], "Alguien")
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
    return users

@api.get("/admin/user/{uid}")
async def admin_get_user(uid: str, _: dict = Depends(require_admin)):
    u = await db.users.find_one({"id": uid}, {"password_hash": 0, "_id": 0})
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    reports = await db.reports.find({"target_user": uid}, {"_id": 0}).to_list(200)
    actions = await db.admin_actions.find({"user_id": uid}, {"_id": 0}).to_list(200)
    return {"user": u, "reports": reports, "actions": actions}

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
        for emoji, name, cat in SEED_ACTIVITIES:
            await db.activities.insert_one({"id": str(uuid.uuid4()), "emoji": emoji, "name": name, "category": cat, "active": True, "created_at": now_iso()})
        logger.info("Actividades sembradas")

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

    # Demo profiles
    activities = await db.activities.find({}, {"_id": 0}).to_list(100)
    act_by_name = {a["name"]: a for a in activities}

    if await db.users.count_documents({"is_demo": True}) == 0:
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

@app.on_event("startup")
async def on_startup():
    init_storage()
    await seed_admin_and_data()

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
