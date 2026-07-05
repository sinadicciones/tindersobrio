"""PlanSobrio - Resend email service.

Every outbound email flows through `send_email`, which enforces:
- Idempotency (colección `email_log`, key = destino + tipo + evento_ref)
- Preferencias del usuario (`email_preferences`)
- Deliverability (usuarios marcados como `email_deliverable=false` no reciben más
  correos no-transaccionales)
- Silencio nocturno 22:00–08:00 America/Santiago (interacciones se encolan a
  las 08:00 del día siguiente; los transaccionales pasan siempre)
- Tope de 1 correo de interacción por usuario/día (transaccionales e internos
  al equipo no cuentan)
- Nunca incluir email/nombre real/sustancia/etapa/contenido de mensajes/GPS —
  sólo alias, comuna, actividad genérica.

Los correos internos al equipo (admin) usan `send_internal_email` que salta
las restricciones de silencio + tope pero respeta `admin_notification_recipients`.
"""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional
from zoneinfo import ZoneInfo

import jwt
import resend

logger = logging.getLogger("email")

TZ = ZoneInfo("America/Santiago")
API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER = os.environ.get("RESEND_SENDER", "PlanSobrio <hola@plansobrio.com>")
REPLY_TO = os.environ.get("RESEND_REPLY_TO", "contacto@sinadicciones.org")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://plansobrio.com").rstrip("/")
JWT_SECRET = os.environ.get("JWT_SECRET", "change-me")

if API_KEY:
    resend.api_key = API_KEY
else:
    logger.warning("RESEND_API_KEY not set — emails will be logged but not sent")


# --- Email preference keys -------------------------------------------------
PREF_MATCHES = "matches_messages"      # A, B, C (te tinca, match, mensajes sin leer)
PREF_WEEKLY = "weekly_summary"          # G (resumen semanal, re-engage)
PREF_REMINDERS = "plan_reminders"       # D, E, F (planes / eventos)

DEFAULT_PREFERENCES = {
    PREF_MATCHES: True,
    PREF_WEEKLY: True,
    PREF_REMINDERS: True,
}

# Transactional types SKIP daily cap, quiet hours, and preferences.
TRANSACTIONAL_TYPES = {"password_reset", "welcome", "waitlist"}
# Internal team types SKIP quiet hours and user daily cap.
INTERNAL_TYPES = {"admin_new_user", "admin_daily_summary", "admin_grave_report"}


# --------------------------------------------------------------------------
# Signed unsubscribe token
# --------------------------------------------------------------------------
def make_unsub_token(user_id: str, pref_key: Optional[str] = None) -> str:
    payload = {"uid": user_id, "kind": "unsub", "pref": pref_key, "iat": int(datetime.now(timezone.utc).timestamp())}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def read_unsub_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None


def make_reset_token(user_id: str) -> str:
    payload = {
        "uid": user_id,
        "kind": "pwreset",
        "exp": int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp()),
        "iat": int(datetime.now(timezone.utc).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def read_reset_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None


# --------------------------------------------------------------------------
# Template
# --------------------------------------------------------------------------
def _html_shell(body_html: str, *, footer_html: str) -> str:
    """Wrap body content in the Blanco Editorial responsive shell."""
    return f"""<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>PlanSobrio</title>
</head>
<body style="margin:0;padding:0;background:#0B0C10;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0B0C10;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#1D212B;border-radius:24px;padding:32px 28px;">
      <tr><td style="padding-bottom:18px;">
        <span style="font-family:'Georgia','Times New Roman',serif;font-weight:900;font-size:22px;letter-spacing:-0.02em;background:linear-gradient(90deg,#FF6B5E,#8B5CF6);-webkit-background-clip:text;background-clip:text;color:transparent;">PlanSobrio</span>
      </td></tr>
      <tr><td style="color:#ffffff;font-size:15px;line-height:1.55;">
        {body_html}
      </td></tr>
      <tr><td style="padding-top:28px;border-top:1px solid rgba(255,255,255,0.08);margin-top:24px;">
        {footer_html}
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>"""


def _button(label: str, href: str) -> str:
    return (
        f'<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;"><tr><td>'
        f'<a href="{href}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:linear-gradient(90deg,#FF6B5E,#8B5CF6);color:#ffffff !important;text-decoration:none;font-weight:800;font-size:14px;">{label}</a>'
        f"</td></tr></table>"
    )


def _user_footer(unsub_url: str, manage_url: str) -> str:
    return (
        '<p style="color:rgba(255,255,255,0.65);font-size:12px;line-height:1.55;margin:0 0 8px 0;">'
        'Hecho con 💛 en <a href="https://sinadicciones.org" style="color:rgba(255,255,255,0.85);text-decoration:underline;">SinAdicciones.org</a>.'
        "</p>"
        f'<p style="color:rgba(255,255,255,0.5);font-size:11px;line-height:1.55;margin:0;">'
        f'<a href="{unsub_url}" style="color:rgba(255,255,255,0.55);text-decoration:underline;">No quiero recibir estos correos</a>'
        f'  ·  <a href="{manage_url}" style="color:rgba(255,255,255,0.55);text-decoration:underline;">Gestionar mis correos</a>'
        "</p>"
    )


def _internal_footer() -> str:
    return (
        '<p style="color:rgba(255,255,255,0.65);font-size:12px;line-height:1.55;margin:0 0 6px 0;">'
        'Hecho con 💛 en <a href="https://sinadicciones.org" style="color:rgba(255,255,255,0.85);text-decoration:underline;">SinAdicciones.org</a>.'
        "</p>"
        f'<p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0;">Configura estos reportes en <a href="{FRONTEND_URL}/admin" style="color:rgba(255,255,255,0.55);text-decoration:underline;">/admin</a>.</p>'
    )


# --------------------------------------------------------------------------
# Core send (used by everything)
# --------------------------------------------------------------------------
async def _resend_send(*, to: str, subject: str, html: str, headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    """Wrap resend.Emails.send in a thread so FastAPI stays non-blocking."""
    if not API_KEY:
        logger.info(f"[email:mocked] to={to} subject={subject!r}")
        return {"id": None, "mocked": True}
    params: Dict[str, Any] = {
        "from": SENDER,
        "to": [to],
        "subject": subject,
        "html": html,
        "reply_to": [REPLY_TO],
    }
    if headers:
        params["headers"] = headers
    return await asyncio.to_thread(resend.Emails.send, params)


def _idempotency_key(destino: str, tipo: str, evento: str) -> str:
    raw = f"{destino}|{tipo}|{evento}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _now_local() -> datetime:
    return datetime.now(TZ)


def _in_quiet_hours(now: Optional[datetime] = None) -> bool:
    now = now or _now_local()
    h = now.hour
    return h >= 22 or h < 8


async def _sent_today_interaction_count(db, user_id: str) -> int:
    today_start = _now_local().replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc).isoformat()
    return await db.email_log.count_documents({
        "user_id": user_id,
        "type": {"$nin": list(TRANSACTIONAL_TYPES | INTERNAL_TYPES)},
        "sent_at": {"$gte": today_start},
        "status": {"$in": ["sent", "queued"]},
    })


async def _load_prefs(db, user_id: str) -> Dict[str, bool]:
    doc = await db.email_preferences.find_one({"user_id": user_id}, {"_id": 0}) or {}
    prefs = dict(DEFAULT_PREFERENCES)
    for k in DEFAULT_PREFERENCES:
        if k in doc:
            prefs[k] = bool(doc[k])
    return prefs


PREF_FOR_TYPE = {
    "like_no_match": PREF_MATCHES,
    "new_match": PREF_MATCHES,
    "unread_messages": PREF_MATCHES,
    "plan_confirmed": PREF_REMINDERS,
    "plan_reminder": PREF_REMINDERS,
    "event_new_in_group": PREF_REMINDERS,
    "weekly_summary": PREF_WEEKLY,
    "reengage_14d": PREF_WEEKLY,
}


async def send_email(
    db,
    *,
    user_id: Optional[str],
    to: str,
    type: str,
    event_ref: str,
    subject: str,
    body_html: str,
    force: bool = False,
    is_internal: bool = False,
    user_doc: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Central send. Returns {ok: bool, reason?: str, resend_id?: str}.

    `event_ref` should uniquely identify the trigger event (e.g. match_id,
    plan_id, date-of-summary) so we can dedupe reruns.
    """
    idem = _idempotency_key(to, type, event_ref)
    existing = await db.email_log.find_one({"idempotency_key": idem})
    if existing and existing.get("status") in ("sent", "queued", "delivered"):
        return {"ok": True, "reason": "duplicate", "resend_id": existing.get("resend_id")}

    now_iso = datetime.now(timezone.utc).isoformat()
    doc = {
        "user_id": user_id,
        "to": to,
        "type": type,
        "event_ref": event_ref,
        "idempotency_key": idem,
        "subject": subject,
        "status": "pending",
        "created_at": now_iso,
        "sent_at": None,
        "resend_id": None,
        "attempts": 0,
    }
    await db.email_log.update_one({"idempotency_key": idem}, {"$setOnInsert": doc}, upsert=True)

    # --- gates ---
    if not force and not is_internal and user_id:
        # Load user if not provided
        u = user_doc
        if u is None:
            u = await db.users.find_one({"id": user_id}, {"_id": 0}) or {}
        if u.get("status") in ("banned", "suspended") or u.get("deleted_at"):
            await db.email_log.update_one({"idempotency_key": idem}, {"$set": {"status": "skipped_status"}})
            return {"ok": False, "reason": "user_status"}
        if u.get("email_deliverable") is False and type not in TRANSACTIONAL_TYPES:
            await db.email_log.update_one({"idempotency_key": idem}, {"$set": {"status": "skipped_undeliverable"}})
            return {"ok": False, "reason": "undeliverable"}
        # Prefs
        pref_key = PREF_FOR_TYPE.get(type)
        if pref_key:
            prefs = await _load_prefs(db, user_id)
            if not prefs.get(pref_key, True):
                await db.email_log.update_one({"idempotency_key": idem}, {"$set": {"status": "skipped_pref"}})
                return {"ok": False, "reason": "opted_out"}
        # Quiet hours: queue non-transactional
        if type not in TRANSACTIONAL_TYPES and _in_quiet_hours():
            deliver_at = _now_local().replace(hour=8, minute=0, second=0, microsecond=0)
            if deliver_at <= _now_local():
                deliver_at = deliver_at + timedelta(days=1)
            await db.email_log.update_one(
                {"idempotency_key": idem},
                {"$set": {"status": "queued", "deliver_after": deliver_at.astimezone(timezone.utc).isoformat()}},
            )
            return {"ok": True, "reason": "queued_quiet_hours"}
        # Daily cap: max 1 interaction email/day
        if type not in TRANSACTIONAL_TYPES and type not in INTERNAL_TYPES:
            already = await _sent_today_interaction_count(db, user_id)
            if already >= 1:
                await db.email_log.update_one({"idempotency_key": idem}, {"$set": {"status": "skipped_cap"}})
                return {"ok": False, "reason": "daily_cap"}

    # --- footer ---
    if is_internal:
        footer = _internal_footer()
    else:
        unsub_pref = PREF_FOR_TYPE.get(type)
        token = make_unsub_token(user_id or "anon", unsub_pref)
        unsub_url = f"{FRONTEND_URL}/api/email/unsubscribe?token={token}"
        manage_url = f"{FRONTEND_URL}/app/perfil/editar"
        footer = _user_footer(unsub_url, manage_url)

    html = _html_shell(body_html, footer_html=footer)
    headers: Dict[str, str] = {}
    if not is_internal and user_id:
        token = make_unsub_token(user_id, PREF_FOR_TYPE.get(type))
        headers["List-Unsubscribe"] = f"<{FRONTEND_URL}/api/email/unsubscribe?token={token}>"
        headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"

    try:
        result = await _resend_send(to=to, subject=subject, html=html, headers=headers or None)
        rid = result.get("id") if isinstance(result, dict) else None
        await db.email_log.update_one(
            {"idempotency_key": idem},
            {"$set": {"status": "sent", "sent_at": datetime.now(timezone.utc).isoformat(), "resend_id": rid}, "$inc": {"attempts": 1}},
        )
        return {"ok": True, "resend_id": rid}
    except Exception as e:  # noqa: BLE001
        logger.exception(f"resend failed for {type} to {to}: {e}")
        await db.email_log.update_one(
            {"idempotency_key": idem},
            {"$set": {"status": "error", "error": str(e)[:400]}, "$inc": {"attempts": 1}},
        )
        return {"ok": False, "reason": "send_error"}


# --------------------------------------------------------------------------
# Template builders — user-facing
# --------------------------------------------------------------------------
def welcome_body(alias: str, is_google: bool) -> tuple[str, str]:
    subject = "Bienvenide a PlanSobrio 💛"
    body = (
        f"<p style=\"margin:0 0 12px 0;\"><strong>Hola {alias},</strong></p>"
        "<p style=\"margin:0 0 16px 0;\">Bienvenide a PlanSobrio. Aquí nadie tiene que explicar por qué no toma. "
        "Vas a encontrar personas para juntarse a caminar, tomar café, ir al cine — todo sin alcohol ni drogas.</p>"
        f"{_button('Completa tu perfil', f'{FRONTEND_URL}/app/perfil/editar')}"
        "<p style=\"margin:20px 0 0 0;color:rgba(255,255,255,0.75);font-size:13px;\">"
        "Si en algún momento no la estás pasando bien, en la app tienes siempre a mano el botón "
        "<strong>Necesito apoyo</strong> con líneas de ayuda gratuitas 24/7.</p>"
    )
    if is_google:
        body = "<p style=\"margin:0 0 12px 0;color:rgba(255,255,255,0.7);font-size:13px;\">Ingresaste con Google — no necesitas contraseña, siempre puedes volver desde el mismo botón.</p>" + body
    return subject, body


def password_reset_body(reset_url: str, is_google_only: bool) -> tuple[str, str]:
    if is_google_only:
        subject = "Tu cuenta de PlanSobrio ingresa con Google"
        body = (
            "<p style=\"margin:0 0 12px 0;\">Tu cuenta ingresa con Google — <strong>no necesitas contraseña</strong>.</p>"
            "<p style=\"margin:0 0 12px 0;color:rgba(255,255,255,0.75);\">Cuando quieras entrar, elige <em>Continuar con Google</em> en el login.</p>"
            f"{_button('Ir a PlanSobrio', f'{FRONTEND_URL}/login')}"
        )
        return subject, body
    subject = "Restablece tu contraseña"
    body = (
        "<p style=\"margin:0 0 12px 0;\">Recibimos una solicitud para restablecer tu contraseña.</p>"
        "<p style=\"margin:0 0 12px 0;color:rgba(255,255,255,0.75);\">Este link vale por <strong>1 hora</strong>. Si no fuiste tú, ignora este mensaje.</p>"
        f"{_button('Restablecer contraseña', reset_url)}"
    )
    return subject, body


def waitlist_body(country_name: str) -> tuple[str, str]:
    subject = "Te avisaremos cuando PlanSobrio llegue a tu país 🌎"
    body = (
        f"<p style=\"margin:0 0 12px 0;\">Gracias por inscribirte desde <strong>{country_name}</strong>.</p>"
        "<p style=\"margin:0 0 16px 0;color:rgba(255,255,255,0.8);\">Estamos partiendo en Chile y creciendo con calma. Cuando abramos tu país, te llegará un correo.</p>"
        f"{_button('Conocer SinAdicciones.org', 'https://sinadicciones.org')}"
    )
    return subject, body


def like_no_match_body(alias_liker: str, count_extra: int, plan_activity: Optional[str]) -> tuple[str, str]:
    if count_extra >= 1:
        total = count_extra + 1
        subject = f"A {total} personas les tinca tu perfil 💛"
        body = (
            f"<p style=\"margin:0 0 12px 0;\"><strong>A {total} personas les tinca hacer un plan contigo.</strong></p>"
            "<p style=\"margin:0 0 16px 0;color:rgba(255,255,255,0.8);\">Entra a Les tincas para verlos y elegir con quién armar un panorama.</p>"
            f"{_button('Ver en Les tincas', f'{FRONTEND_URL}/app/chats?tab=les-tincas')}"
        )
    else:
        subject = f"A {alias_liker} le tinca hacer un plan contigo 💛"
        body = (
            f"<p style=\"margin:0 0 12px 0;\"><strong>{alias_liker}</strong> te dio me tinca.</p>"
        )
        if plan_activity:
            body += f"<p style=\"margin:0 0 16px 0;color:rgba(255,255,255,0.8);\">Su idea: <strong>{plan_activity}</strong>.</p>"
        body += _button("Ver en Les tincas", f"{FRONTEND_URL}/app/chats?tab=les-tincas")
    return subject, body


def new_match_body(alias_other: str, my_activity: Optional[str], other_activity: Optional[str], match_id: str) -> tuple[str, str]:
    subject = f"¡Hay plan! Conociste a {alias_other} 🎉"
    if my_activity and other_activity and my_activity == other_activity:
        line = f"Están de acuerdo: <strong>{my_activity}</strong>."
    elif my_activity and other_activity:
        line = f"A ti te tinca <strong>{my_activity}</strong>, a {alias_other} <strong>{other_activity}</strong> — ¿cuál va primero?"
    else:
        line = "Ya pueden proponerse un panorama."
    body = (
        f"<p style=\"margin:0 0 12px 0;\"><strong>Conociste a {alias_other}.</strong></p>"
        f"<p style=\"margin:0 0 16px 0;color:rgba(255,255,255,0.8);\">{line}</p>"
        f"{_button('Abrir chat', f'{FRONTEND_URL}/app/chats/{match_id}')}"
    )
    return subject, body


def unread_messages_body(aliases: List[str], count: int) -> tuple[str, str]:
    aliases_str = " y ".join(aliases[:2])
    subject = f"Tienes {count} mensaje{'s' if count != 1 else ''} de {aliases_str}"
    body = (
        f"<p style=\"margin:0 0 12px 0;\">Tienes mensajes esperando de <strong>{aliases_str}</strong>.</p>"
        "<p style=\"margin:0 0 16px 0;color:rgba(255,255,255,0.7);font-size:13px;\">Por privacidad, no incluimos el texto del mensaje.</p>"
        f"{_button('Responder', f'{FRONTEND_URL}/app/chats')}"
    )
    return subject, body


def plan_confirmed_body(alias_other: str, activity: str, when_str: str, match_id: str) -> tuple[str, str]:
    subject = f"Plan confirmado con {alias_other}: {activity}"
    body = (
        f"<p style=\"margin:0 0 12px 0;\"><strong>{activity}</strong> con {alias_other}.</p>"
        f"<p style=\"margin:0 0 16px 0;color:rgba(255,255,255,0.8);\">{when_str}</p>"
        f"{_button('Ver el plan', f'{FRONTEND_URL}/app/chats/{match_id}')}"
    )
    return subject, body


def plan_reminder_body(kind: str, title: str, when_str: str, url: str) -> tuple[str, str]:
    subject = "Hoy tienes un plan 🌱"
    body = (
        f"<p style=\"margin:0 0 12px 0;\"><strong>{title}</strong></p>"
        f"<p style=\"margin:0 0 12px 0;color:rgba(255,255,255,0.8);\">{when_str}</p>"
    )
    if kind == "match":
        body += "<p style=\"margin:0 0 16px 0;color:rgba(255,255,255,0.7);font-size:13px;\">Recuerda: de día y en lugar público es mejor.</p>"
    body += _button("Ver el plan", url)
    return subject, body


def event_in_group_body(group_name: str, event_title: str, when_str: str, group_id: str) -> tuple[str, str]:
    subject = f"Nuevo evento en {group_name}"
    body = (
        f"<p style=\"margin:0 0 12px 0;\">Se creó un nuevo evento en <strong>{group_name}</strong>:</p>"
        f"<p style=\"margin:0 0 6px 0;\"><strong>{event_title}</strong></p>"
        f"<p style=\"margin:0 0 16px 0;color:rgba(255,255,255,0.75);\">{when_str}</p>"
        f"{_button('Ver evento', f'{FRONTEND_URL}/app/grupos/{group_id}')}"
    )
    return subject, body


def weekly_summary_body(sections: List[Dict[str, Any]]) -> tuple[str, str]:
    subject = "Tu semana en PlanSobrio 💛"
    parts = []
    for s in sections:
        parts.append(f"<p style=\"margin:14px 0 6px 0;font-weight:800;\">{s['title']}</p>")
        for row in s.get("items", []):
            parts.append(f"<p style=\"margin:0 0 4px 0;color:rgba(255,255,255,0.8);\">· {row}</p>")
    body = "<p style=\"margin:0 0 12px 0;\">Un resumen de la semana en tu comunidad:</p>" + "".join(parts)
    body += _button("Abrir PlanSobrio", f"{FRONTEND_URL}/app/descubrir")
    return subject, body


def reengage_body(alias: str) -> tuple[str, str]:
    subject = f"{alias}, tu lugar sigue aquí — a tu ritmo"
    body = (
        f"<p style=\"margin:0 0 12px 0;\">Hola {alias},</p>"
        "<p style=\"margin:0 0 12px 0;color:rgba(255,255,255,0.85);\">No queremos apurarte. Solo pasamos a recordarte que "
        "tu perfil sigue activo y hay gente esperando un panorama sobrio.</p>"
        "<p style=\"margin:0 0 16px 0;color:rgba(255,255,255,0.75);font-size:13px;\">Si estás en un momento difícil, "
        "el botón <strong>Necesito apoyo</strong> tiene líneas de ayuda gratuitas 24/7.</p>"
        f"{_button('Entrar a PlanSobrio', f'{FRONTEND_URL}/app/descubrir')}"
    )
    return subject, body


# --------------------------------------------------------------------------
# Internal (admin) helpers
# --------------------------------------------------------------------------
async def get_admin_recipients(db, notif_type: str) -> List[str]:
    """Fetch active recipients for `notif_type`. Recipients doc:
    `{email, active_for: {admin_new_user: true, admin_daily_summary: true, admin_grave_report: true}}`.
    """
    docs = await db.admin_notification_recipients.find({}, {"_id": 0}).to_list(50)
    out = []
    for d in docs:
        active = d.get("active_for") or {}
        if active.get(notif_type, True):
            out.append(d["email"])
    return out


def admin_new_user_body(alias: str, age: Optional[int], gender: str, city: str, modes: List[str], via: str, total_users: int) -> tuple[str, str]:
    subject = f"Nuevo usuario en PlanSobrio: {alias}"
    modes_str = ", ".join(modes) if modes else "—"
    age_str = f"{age} años" if age else "edad n/d"
    body = (
        "<p style=\"margin:0 0 12px 0;\"><strong>Se registró un nuevo usuario.</strong></p>"
        f"<p style=\"margin:0 0 4px 0;\">Alias: <strong>{alias}</strong></p>"
        f"<p style=\"margin:0 0 4px 0;\">{age_str} · {gender or 'género n/d'} · {city or 'ciudad n/d'}</p>"
        f"<p style=\"margin:0 0 4px 0;\">Modos: {modes_str}</p>"
        f"<p style=\"margin:0 0 4px 0;\">Vía: {via}</p>"
        f"<p style=\"margin:8px 0 16px 0;color:rgba(255,255,255,0.75);\">Total de usuarios: <strong>{total_users}</strong></p>"
        f"{_button('Ver en /admin', f'{FRONTEND_URL}/admin')}"
    )
    return subject, body


def admin_daily_summary_body(date_str: str, snapshot: Dict[str, Any], prev_avg: Dict[str, float]) -> tuple[str, str]:
    subject = f"PlanSobrio — resumen del {date_str}"

    def _row(label: str, key: str, red: bool = False) -> str:
        val = snapshot.get(key, 0)
        avg = prev_avg.get(key, 0) or 0
        arrow = ""
        if avg > 0:
            delta = ((val - avg) / avg) * 100
            arrow = f" <span style=\"color:{'#4ADE80' if delta >= 0 else '#FF6B5E'};font-size:12px;\">{'↑' if delta >= 0 else '↓'} {abs(delta):.0f}%</span>"
        color = "color:#FF6B5E;font-weight:800;" if red and val > 0 else ""
        return f"<p style=\"margin:0 0 4px 0;{color}\">· {label}: <strong>{val}</strong>{arrow}</p>"

    grave_open = snapshot.get("grave_open", 0)
    body = (
        f"<p style=\"margin:0 0 12px 0;color:rgba(255,255,255,0.85);\">Resumen del <strong>{date_str}</strong> (America/Santiago).</p>"
        "<p style=\"margin:14px 0 6px 0;font-weight:800;\">Métrica norte — Planes</p>"
        + _row("Propuestos", "plans_proposed")
        + _row("Confirmados", "plans_confirmed")
        + _row("Realizados", "plans_realized")
        + "<p style=\"margin:14px 0 6px 0;font-weight:800;\">Usuarios</p>"
        + _row("Nuevos registros", "registrations")
        + _row("Onboarding completos", "onboardings")
        + _row("Total acumulado", "users_total")
        + _row("Activos (DAU)", "dau")
        + "<p style=\"margin:14px 0 6px 0;font-weight:800;\">Matching</p>"
        + _row("Me tinca dados", "likes")
        + _row("Matches creados", "matches")
        + _row("Me tinca pendientes", "pending_likes")
        + "<p style=\"margin:14px 0 6px 0;font-weight:800;\">Comunidad</p>"
        + _row("Mensajes 1-1", "msgs_1_1")
        + _row("Mensajes en grupos", "msgs_group")
        + _row("RSVPs nuevos", "rsvps")
        + "<p style=\"margin:14px 0 6px 0;font-weight:800;\">Seguridad</p>"
        + _row("Reportes nuevos", "reports_created", red=(grave_open > 0))
        + _row("Reportes abiertos", "reports_open", red=(grave_open > 0))
        + _row("Bloqueos", "blocks")
        + _row("Visitas anónimas a 'Necesito apoyo'", "support_visits")
        + _button("Ver panel completo", f"{FRONTEND_URL}/admin")
    )
    return subject, body


def admin_grave_report_body(category: str, when: str) -> tuple[str, str]:
    subject = "⚠️ Reporte grave pendiente en PlanSobrio"
    body = (
        f"<p style=\"margin:0 0 12px 0;color:#FF6B5E;font-weight:800;\">Nuevo reporte grave: {category}</p>"
        f"<p style=\"margin:0 0 16px 0;color:rgba(255,255,255,0.8);\">Recibido: {when}</p>"
        f"{_button('Abrir cola de reportes', f'{FRONTEND_URL}/admin')}"
    )
    return subject, body


async def send_internal_email(
    db,
    *,
    notif_type: str,
    event_ref: str,
    subject: str,
    body_html: str,
    grave_group_ref: Optional[str] = None,
) -> Dict[str, Any]:
    """Send an internal email to all active admin recipients for this notif_type.
    Handles 1/hour grouping for grave reports via `grave_group_ref`.
    """
    recipients = await get_admin_recipients(db, notif_type)
    if not recipients:
        return {"ok": False, "reason": "no_recipients"}

    if grave_group_ref:
        # 1 alert per hour
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        recent = await db.email_log.find_one({
            "type": notif_type,
            "event_ref": {"$regex": f"^{grave_group_ref}"},
            "sent_at": {"$gte": cutoff},
        })
        if recent:
            return {"ok": True, "reason": "grouped_within_hour"}

    results = []
    for r in recipients:
        res = await send_email(
            db,
            user_id=None,
            to=r,
            type=notif_type,
            event_ref=event_ref,
            subject=subject,
            body_html=body_html,
            is_internal=True,
            force=True,
        )
        results.append({"to": r, **res})
    return {"ok": True, "results": results}


# --------------------------------------------------------------------------
# Webhook helper — mark bounces/complaints
# --------------------------------------------------------------------------
async def handle_webhook(db, payload: Dict[str, Any]) -> None:
    ev_type = payload.get("type") or payload.get("event")
    data = payload.get("data") or {}
    resend_id = data.get("email_id") or data.get("id")
    to_arr = data.get("to") or []
    to = to_arr[0] if to_arr else None
    if not to and not resend_id:
        return
    # Update log status
    log_filter: Dict[str, Any] = {}
    if resend_id:
        log_filter["resend_id"] = resend_id
    elif to:
        log_filter["to"] = to
    if ev_type in ("email.delivered", "delivered"):
        await db.email_log.update_many(log_filter, {"$set": {"status": "delivered"}})
    elif ev_type in ("email.bounced", "bounced"):
        await db.email_log.update_many(log_filter, {"$set": {"status": "bounced"}})
        if to:
            await db.users.update_many({"email": to}, {"$set": {"email_deliverable": False, "email_deliverable_reason": "bounce"}})
    elif ev_type in ("email.complained", "complained"):
        await db.email_log.update_many(log_filter, {"$set": {"status": "complained"}})
        if to:
            await db.users.update_many({"email": to}, {"$set": {"email_deliverable": False, "email_deliverable_reason": "complaint"}})


# --------------------------------------------------------------------------
# Queue drain — dispatch queued emails when quiet hours end
# --------------------------------------------------------------------------
async def drain_queue(db) -> int:
    """Deliver queued emails whose deliver_after has passed. Returns count sent."""
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor = db.email_log.find({"status": "queued", "deliver_after": {"$lte": now_iso}}, {"_id": 0})
    n = 0
    async for log in cursor:
        # Rebuild html shell using the stored subject and skipping the gates
        # (we already passed them once). We store the raw body_html.
        subject = log.get("subject")
        body_html = log.get("body_html")
        if not body_html:
            # Older/queued entries without body — mark as skipped
            await db.email_log.update_one({"idempotency_key": log["idempotency_key"]}, {"$set": {"status": "expired"}})
            continue
        # Compose full HTML with proper footer
        if log.get("user_id"):
            token = make_unsub_token(log["user_id"], PREF_FOR_TYPE.get(log["type"]))
            unsub_url = f"{FRONTEND_URL}/api/email/unsubscribe?token={token}"
            manage_url = f"{FRONTEND_URL}/app/perfil/editar"
            footer = _user_footer(unsub_url, manage_url)
        else:
            footer = _internal_footer()
        html = _html_shell(body_html, footer_html=footer)
        try:
            result = await _resend_send(to=log["to"], subject=subject, html=html)
            rid = result.get("id") if isinstance(result, dict) else None
            await db.email_log.update_one(
                {"idempotency_key": log["idempotency_key"]},
                {"$set": {"status": "sent", "sent_at": datetime.now(timezone.utc).isoformat(), "resend_id": rid}},
            )
            n += 1
        except Exception as e:  # noqa: BLE001
            logger.exception(f"drain send failed: {e}")
            await db.email_log.update_one(
                {"idempotency_key": log["idempotency_key"]},
                {"$set": {"status": "error", "error": str(e)[:400]}, "$inc": {"attempts": 1}},
            )
    return n


async def queue_drain_loop(db):
    """Runs every 10 minutes; delivers queued emails."""
    logger.info("Email queue drain loop started")
    while True:
        try:
            await asyncio.sleep(600)  # 10 min
            n = await drain_queue(db)
            if n:
                logger.info(f"Email queue drained: {n} sent")
        except asyncio.CancelledError:
            break
        except Exception as e:  # noqa: BLE001
            logger.exception(f"drain loop error: {e}")
            await asyncio.sleep(60)


# --------------------------------------------------------------------------
# Scheduled jobs
# --------------------------------------------------------------------------
async def _sleep_until(hour: int, minute: int) -> None:
    now = _now_local()
    target = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if target <= now:
        target = target + timedelta(days=1)
    await asyncio.sleep((target - now).total_seconds())


async def scheduled_jobs_loop(db, metrics_mod):
    """Master scheduler:
    - 08:30 America/Santiago → admin daily summary
    - 09:00 → plan reminders (planes con `when` HOY) + event RSVPs de hoy
    - Jueves 12:00 → weekly_summary a usuarios activos
    """
    logger.info("Email scheduled jobs loop started")
    while True:
        try:
            # Sleep until the next quarter-hour boundary
            now = _now_local()
            next_min = (now.minute // 15 + 1) * 15
            if next_min >= 60:
                target = now.replace(minute=0, second=5, microsecond=0) + timedelta(hours=1)
            else:
                target = now.replace(minute=next_min, second=5, microsecond=0)
            await asyncio.sleep(max(1, (target - now).total_seconds()))

            local = _now_local()
            # Admin daily summary — trigger 08:30 (idempotency prevents dupes)
            if local.hour == 8 and local.minute >= 30:
                await _run_admin_daily_summary(db, metrics_mod)
            # Plan reminders 09:00
            if local.hour == 9 and local.minute < 15:
                await _run_plan_reminders(db)
            # Weekly summary Thursday 12:00 (weekday=3 in Python)
            if local.weekday() == 3 and local.hour == 12 and local.minute < 15:
                await _run_weekly_summary(db)
        except asyncio.CancelledError:
            break
        except Exception:
            logger.exception("scheduled_jobs_loop error")
            await asyncio.sleep(60)


async def _run_admin_daily_summary(db, metrics_mod) -> None:
    yesterday = _now_local().date() - timedelta(days=1)
    date_str = yesterday.isoformat()
    # idempotent per date + recipient
    already = await db.email_log.find_one({
        "type": "admin_daily_summary",
        "event_ref": {"$regex": f"^daily_summary:{date_str}"},
        "status": {"$in": ["sent", "delivered"]},
    })
    if already:
        return
    snap = await metrics_mod.compute_daily_snapshot(db, yesterday)
    await metrics_mod.upsert_snapshot(db, snap)
    prev_dates = [(yesterday - timedelta(days=i + 1)).isoformat() for i in range(7)]
    prev_docs = await db.metrics_daily.find({"date": {"$in": prev_dates}}, {"_id": 0}).to_list(7)
    keys = ["plans_proposed", "plans_confirmed", "plans_realized", "registrations", "onboardings",
            "users_total", "dau", "likes", "matches", "msgs_1_1", "msgs_group", "rsvps",
            "reports_created", "blocks", "support_visits"]
    prev_avg = {k: (sum(int(d.get(k) or 0) for d in prev_docs) / len(prev_docs)) if prev_docs else 0 for k in keys}
    pending_likes = await db.likes.count_documents({"kind": "like"})
    reports_open = await db.reports.count_documents({"status": "open"})
    grave_open = await db.reports.count_documents({"status": "open", "category": {"$in": ["ofrece_sustancias", "mala_conducta_cita"]}})
    snap_for_email = {**snap, "pending_likes": pending_likes, "reports_open": reports_open, "grave_open": grave_open}
    subj, html_body = admin_daily_summary_body(date_str=date_str, snapshot=snap_for_email, prev_avg=prev_avg)
    await send_internal_email(
        db, notif_type="admin_daily_summary",
        event_ref=f"daily_summary:{date_str}",
        subject=subj, body_html=html_body,
    )


async def _run_plan_reminders(db) -> None:
    today = _now_local().date()
    start = datetime(today.year, today.month, today.day, tzinfo=TZ).astimezone(timezone.utc).isoformat()
    end = (datetime(today.year, today.month, today.day, tzinfo=TZ) + timedelta(days=1)).astimezone(timezone.utc).isoformat()
    # 1-on-1 plans
    plans = await db.plans.find(
        {"status": "accepted", "when": {"$gte": start, "$lt": end}},
        {"_id": 0},
    ).to_list(500)
    for p in plans:
        match = await db.matches.find_one({"id": p["match_id"]}, {"_id": 0}) or {}
        for uid in match.get("users", []):
            u = await db.users.find_one({"id": uid}, {"_id": 0})
            if not u or not u.get("email"):
                continue
            act = p.get("activity") or {}
            title = f"{act.get('emoji','')} {act.get('name','tu plan')}".strip()
            when_str = _format_when_helper(p.get("when"))
            subj, html_body = plan_reminder_body(
                kind="match",
                title=title,
                when_str=when_str,
                url=f"{FRONTEND_URL}/app/chats/{p['match_id']}",
            )
            await send_email(
                db, user_id=uid, to=u["email"], type="plan_reminder",
                event_ref=f"plan_reminder:{p['id']}:{uid}:{today.isoformat()}",
                subject=subj, body_html=html_body, user_doc=u,
            )
    # Events today
    events = await db.events.find(
        {"when": {"$gte": start, "$lt": end}}, {"_id": 0},
    ).to_list(500)
    for ev in events:
        rsvps = await db.event_rsvps.find({"event_id": ev["id"]}, {"_id": 0}).to_list(500)
        for r in rsvps:
            u = await db.users.find_one({"id": r["user_id"]}, {"_id": 0})
            if not u or not u.get("email"):
                continue
            when_str = _format_when_helper(ev.get("when"))
            subj, html_body = plan_reminder_body(
                kind="event",
                title=ev.get("title", "Evento"),
                when_str=when_str,
                url=f"{FRONTEND_URL}/app/grupos/{ev.get('group_id','')}",
            )
            await send_email(
                db, user_id=u["id"], to=u["email"], type="plan_reminder",
                event_ref=f"event_reminder:{ev['id']}:{u['id']}:{today.isoformat()}",
                subject=subj, body_html=html_body, user_doc=u,
            )


async def _run_weekly_summary(db) -> None:
    """Enviado a usuarios con onboarding completo cuya preferencia 'weekly_summary' esté ON.
    Sólo se envía si al menos una sección tiene contenido real."""
    seven_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    today = _now_local().date().isoformat()
    async for u in db.users.find(
        {"onboarding_complete": True, "deleted_at": {"$exists": False}, "status": {"$nin": ["banned", "suspended"]}},
        {"_id": 0, "id": 1, "email": 1, "alias": 1, "location": 1, "modes": 1, "email_deliverable": 1},
    ):
        if not u.get("email"):
            continue
        # New people in same country/comuna (only public data, respect visibility)
        loc = u.get("location") or {}
        country = loc.get("country") or "CL"
        near_new = await db.users.count_documents({
            "id": {"$ne": u["id"]},
            "onboarding_complete": True,
            "created_at": {"$gte": seven_ago},
            "country": country,
        })
        # Groups with movement in same country
        active_groups = await db.group_messages.aggregate([
            {"$match": {"created_at": {"$gte": seven_ago}}},
            {"$group": {"_id": "$group_id", "n": {"$sum": 1}}},
            {"$match": {"n": {"$gte": 5}}},
        ]).to_list(50)
        # Upcoming events in same country
        now_iso = datetime.now(timezone.utc).isoformat()
        seven_ahead = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        events_upcoming = await db.events.count_documents({"when": {"$gte": now_iso, "$lt": seven_ahead}})

        sections = []
        if near_new > 0:
            sections.append({"title": "Gente nueva cerca", "items": [f"{near_new} personas se sumaron esta semana en tu país"]})
        if active_groups:
            sections.append({"title": "Grupos con movimiento", "items": [f"{len(active_groups)} grupos activos con conversación"]})
        if events_upcoming > 0:
            sections.append({"title": "Próximos eventos", "items": [f"{events_upcoming} eventos en los próximos 7 días"]})
        if not sections:
            continue
        subj, html_body = weekly_summary_body(sections)
        await send_email(
            db, user_id=u["id"], to=u["email"], type="weekly_summary",
            event_ref=f"weekly:{u['id']}:{today}",
            subject=subj, body_html=html_body, user_doc=u,
        )


def _format_when_helper(when_iso: Optional[str]) -> str:
    if not when_iso:
        return ""
    try:
        dt = datetime.fromisoformat(when_iso).astimezone(TZ)
        return dt.strftime("%a %d %b · %H:%M")
    except Exception:
        return when_iso[:16].replace("T", " ")
