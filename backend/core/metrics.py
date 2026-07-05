"""PlanSobrio - Admin metrics engine (aggregate-only, privacy-first).

All calculations run on our own MongoDB — no external analytics SDKs. The panel
NEVER exposes individual message content, substance/etapa data, or the identity
of users who visited "Necesito apoyo" (only anonymous per-day counters).

The nightly snapshot writes to `metrics_daily`. Range endpoints (7/30/90 days)
read that pre-computed cache. Backfill recomputes a date range on demand.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone, timedelta, date as date_cls
from typing import List, Dict, Any, Optional
from zoneinfo import ZoneInfo

logger = logging.getLogger("metrics")

TZ = ZoneInfo("America/Santiago")


# ----------------------------------------------------------------------------
# Time helpers
# ----------------------------------------------------------------------------
def day_str(d: date_cls) -> str:
    """Format a date as YYYY-MM-DD."""
    return d.isoformat()


def today_local() -> date_cls:
    return datetime.now(TZ).date()


def day_bounds_utc(d: date_cls) -> tuple[str, str]:
    """Return the UTC ISO bounds [start, end) for a local-timezone day."""
    start_local = datetime.combine(d, datetime.min.time(), tzinfo=TZ)
    end_local = start_local + timedelta(days=1)
    return start_local.astimezone(timezone.utc).isoformat(), end_local.astimezone(timezone.utc).isoformat()


def iso_range(days_back: int) -> tuple[str, str, List[str]]:
    """Return (start_iso, end_iso, [YYYY-MM-DD list]) for the last N days
    including today (local TZ)."""
    today = today_local()
    start_day = today - timedelta(days=days_back - 1)
    start_iso, _ = day_bounds_utc(start_day)
    _, end_iso = day_bounds_utc(today)
    days = [day_str(start_day + timedelta(days=i)) for i in range(days_back)]
    return start_iso, end_iso, days


# ----------------------------------------------------------------------------
# Daily snapshot
# ----------------------------------------------------------------------------
async def compute_daily_snapshot(db, d: date_cls) -> Dict[str, Any]:
    """Compute all aggregate counters for a single local-tz day.

    Every counter here is a scalar — no user IDs, no messages, no substances.
    """
    start_iso, end_iso = day_bounds_utc(d)
    day = day_str(d)

    users_total = await db.users.count_documents({"deleted_at": {"$exists": False}})
    registrations = await db.users.count_documents({"created_at": {"$gte": start_iso, "$lt": end_iso}})
    onboardings = await db.users.count_documents({
        "onboarding_complete": True,
        "accepted_rules_at": {"$gte": start_iso, "$lt": end_iso},
    })

    likes = await db.likes.count_documents({"created_at": {"$gte": start_iso, "$lt": end_iso}, "kind": "like"})
    passes = await db.likes.count_documents({"created_at": {"$gte": start_iso, "$lt": end_iso}, "kind": "pass"})
    matches = await db.matches.count_documents({"created_at": {"$gte": start_iso, "$lt": end_iso}})
    plans_proposed = await db.plans.count_documents({"created_at": {"$gte": start_iso, "$lt": end_iso}})
    plans_confirmed = await db.plans.count_documents({"accepted_at": {"$gte": start_iso, "$lt": end_iso}, "status": "accepted"})

    # Realized plans: accepted plans whose `when` fell inside this day
    plans_realized = await db.plans.count_documents({
        "status": "accepted",
        "when": {"$gte": start_iso, "$lt": end_iso},
    })

    msgs_1_1 = await db.messages.count_documents({"created_at": {"$gte": start_iso, "$lt": end_iso}, "from_user": {"$ne": "system"}})
    msgs_group = await db.group_messages.count_documents({"created_at": {"$gte": start_iso, "$lt": end_iso}})
    rsvps = await db.event_rsvps.count_documents({"created_at": {"$gte": start_iso, "$lt": end_iso}})

    reports_created = await db.reports.count_documents({"created_at": {"$gte": start_iso, "$lt": end_iso}})
    reports_resolved = await db.reports.count_documents({"resolved_at": {"$gte": start_iso, "$lt": end_iso}})
    blocks = await db.blocks.count_documents({"created_at": {"$gte": start_iso, "$lt": end_iso}})

    # Anonymous support-page visits (no user_id ever stored)
    support_doc = await db.support_page_views.find_one({"date": day}) or {}
    support_visits = int(support_doc.get("count", 0))

    # DAU: distinct users with any activity on this day (likes, msgs, rsvps)
    dau_ids: set = set()
    async for lk in db.likes.find({"created_at": {"$gte": start_iso, "$lt": end_iso}}, {"from_user": 1, "_id": 0}):
        if lk.get("from_user"):
            dau_ids.add(lk["from_user"])
    async for m in db.messages.find({"created_at": {"$gte": start_iso, "$lt": end_iso}}, {"from_user": 1, "_id": 0}):
        if m.get("from_user") and m["from_user"] != "system":
            dau_ids.add(m["from_user"])
    async for r in db.event_rsvps.find({"created_at": {"$gte": start_iso, "$lt": end_iso}}, {"user_id": 1, "_id": 0}):
        if r.get("user_id"):
            dau_ids.add(r["user_id"])
    dau = len(dau_ids)

    # New users by gender + comuna
    new_by_gender: Dict[str, int] = {}
    new_by_comuna: Dict[str, int] = {}
    async for u in db.users.find(
        {"created_at": {"$gte": start_iso, "$lt": end_iso}},
        {"gender": 1, "comuna": 1, "_id": 0},
    ):
        g = u.get("gender") or "sin_dato"
        new_by_gender[g] = new_by_gender.get(g, 0) + 1
        c = u.get("comuna") or "sin_comuna"
        new_by_comuna[c] = new_by_comuna.get(c, 0) + 1

    return {
        "date": day,
        "tz": "America/Santiago",
        "users_total": users_total,
        "registrations": registrations,
        "onboardings": onboardings,
        "dau": dau,
        "likes": likes,
        "passes": passes,
        "matches": matches,
        "plans_proposed": plans_proposed,
        "plans_confirmed": plans_confirmed,
        "plans_realized": plans_realized,
        "msgs_1_1": msgs_1_1,
        "msgs_group": msgs_group,
        "rsvps": rsvps,
        "reports_created": reports_created,
        "reports_resolved": reports_resolved,
        "blocks": blocks,
        "support_visits": support_visits,
        "new_by_gender": new_by_gender,
        "new_by_comuna": new_by_comuna,
        "computed_at": datetime.now(timezone.utc).isoformat(),
    }


async def upsert_snapshot(db, snap: Dict[str, Any]) -> None:
    await db.metrics_daily.update_one({"date": snap["date"]}, {"$set": snap}, upsert=True)


async def backfill_range(db, start: date_cls, end: date_cls) -> int:
    """Recompute all daily snapshots between start and end inclusive."""
    n = 0
    d = start
    while d <= end:
        snap = await compute_daily_snapshot(db, d)
        await upsert_snapshot(db, snap)
        n += 1
        d += timedelta(days=1)
    return n


# ----------------------------------------------------------------------------
# Range queries — read from metrics_daily cache
# ----------------------------------------------------------------------------
async def _fetch_range(db, days: int) -> List[Dict[str, Any]]:
    """Fetch the last `days` snapshots (auto-computes today on the fly for freshness)."""
    today = today_local()
    # Ensure today's snapshot is always fresh
    fresh = await compute_daily_snapshot(db, today)
    await upsert_snapshot(db, fresh)
    dates = [day_str(today - timedelta(days=i)) for i in range(days - 1, -1, -1)]
    docs = await db.metrics_daily.find({"date": {"$in": dates}}, {"_id": 0}).to_list(days)
    by_date = {d["date"]: d for d in docs}
    # Fill missing days with zeros so charts don't skip
    filled = []
    for dt in dates:
        if dt in by_date:
            filled.append(by_date[dt])
        else:
            snap = await compute_daily_snapshot(db, date_cls.fromisoformat(dt))
            await upsert_snapshot(db, snap)
            filled.append(snap)
    return filled


def _sum(rows: List[Dict[str, Any]], key: str) -> int:
    return int(sum(r.get(key, 0) or 0 for r in rows))


# ----------------------------------------------------------------------------
# Summary tab
# ----------------------------------------------------------------------------
async def build_summary(db, days: int) -> Dict[str, Any]:
    rows = await _fetch_range(db, days)
    prev_rows = await _fetch_range(db, days * 2)
    prev_only = prev_rows[: len(prev_rows) - days]

    today = today_local()
    week_start = today - timedelta(days=6)
    this_week_rows = [r for r in rows if r["date"] >= day_str(week_start)]
    last_week_rows = [r for r in prev_only if r["date"] >= day_str(week_start - timedelta(days=7)) and r["date"] < day_str(week_start)]
    realized_this_week = _sum(this_week_rows, "plans_realized")
    realized_last_week = _sum(last_week_rows, "plans_realized")

    dau_today = rows[-1].get("dau", 0) if rows else 0
    # WAU = distinct active users last 7 days (approximate by summing DAU can double-count;
    # do a proper distinct query to be accurate)
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    wau_set: set = set()
    async for lk in db.likes.find({"created_at": {"$gte": seven_days_ago}}, {"from_user": 1, "_id": 0}):
        if lk.get("from_user"):
            wau_set.add(lk["from_user"])
    async for m in db.messages.find({"created_at": {"$gte": seven_days_ago}}, {"from_user": 1, "_id": 0}):
        if m.get("from_user") and m["from_user"] != "system":
            wau_set.add(m["from_user"])
    wau = len(wau_set)

    matches_week = _sum(this_week_rows, "matches")
    likes_week = _sum(this_week_rows, "likes")
    likes_to_match_pct = (matches_week * 2 * 100.0 / likes_week) if likes_week else 0.0  # match consumes 2 likes

    # Open reports + oldest grave age hours
    open_reports = await db.reports.count_documents({"status": "open"})
    oldest_grave_h = 0
    grave = await db.reports.find({"status": "open", "category": {"$in": ["ofrece_sustancias", "mala_conducta_cita"]}}, {"created_at": 1, "_id": 0}).sort("created_at", 1).limit(1).to_list(1)
    if grave:
        try:
            created = datetime.fromisoformat(grave[0]["created_at"])
            oldest_grave_h = (datetime.now(timezone.utc) - created).total_seconds() / 3600.0
        except Exception:
            pass

    # Liquidity alerts
    alerts: List[Dict[str, str]] = []
    # 1. Gender ratio of active pool (last 14 days)
    fourteen_ago = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()
    active_uids: set = set()
    async for lk in db.likes.find({"created_at": {"$gte": fourteen_ago}}, {"from_user": 1, "_id": 0}):
        if lk.get("from_user"):
            active_uids.add(lk["from_user"])
    async for m in db.messages.find({"created_at": {"$gte": fourteen_ago}}, {"from_user": 1, "_id": 0}):
        if m.get("from_user") and m["from_user"] != "system":
            active_uids.add(m["from_user"])
    gender_counts: Dict[str, int] = {}
    if active_uids:
        async for u in db.users.find({"id": {"$in": list(active_uids)}}, {"gender": 1, "_id": 0}):
            g = u.get("gender") or "sin_dato"
            gender_counts[g] = gender_counts.get(g, 0) + 1
    total_active = sum(gender_counts.values()) or 1
    fem_pct = gender_counts.get("femenino", 0) * 100.0 / total_active
    masc_pct = gender_counts.get("masculino", 0) * 100.0 / total_active
    if fem_pct + masc_pct > 0 and (max(fem_pct, masc_pct) > 60 and total_active >= 10):
        alerts.append({"key": "gender_ratio", "message": f"Pool activo desbalanceado: {fem_pct:.0f}% F / {masc_pct:.0f}% M"})

    # 2. Likes without response last 7 days
    likes_7 = await db.likes.count_documents({"created_at": {"$gte": seven_days_ago}, "kind": "like"})
    matches_7 = await db.matches.count_documents({"created_at": {"$gte": seven_days_ago}})
    if likes_7 >= 20:
        unresponded_pct = max(0.0, (likes_7 - matches_7 * 2) * 100.0 / likes_7)
        if unresponded_pct > 30:
            alerts.append({"key": "unresponded_likes", "message": f"{unresponded_pct:.0f}% de los 'me tinca' sin respuesta"})

    # 3. Amor pool size
    amor_active = await db.users.count_documents({"modes": "amor", "onboarding_complete": True, "deleted_at": {"$exists": False}})
    if amor_active < 10:
        alerts.append({"key": "amor_thin", "message": f"Sólo {amor_active} personas activas con modo Amor"})

    # Daily series for charts
    series = [
        {
            "date": r["date"],
            "registrations": r.get("registrations", 0),
            "onboardings": r.get("onboardings", 0),
            "matches": r.get("matches", 0),
            "plans_confirmed": r.get("plans_confirmed", 0),
            "plans_realized": r.get("plans_realized", 0),
            "dau": r.get("dau", 0),
            "likes": r.get("likes", 0),
        }
        for r in rows
    ]

    return {
        "days": days,
        "north_star": {
            "realized_this_week": realized_this_week,
            "realized_last_week": realized_last_week,
            "delta_pct": ((realized_this_week - realized_last_week) * 100.0 / realized_last_week) if realized_last_week else None,
        },
        "cards": {
            "dau_today": dau_today,
            "wau_7d": wau,
            "matches_week": matches_week,
            "like_to_match_pct": round(likes_to_match_pct, 1),
            "open_reports": open_reports,
            "oldest_grave_hours": round(oldest_grave_h, 1),
        },
        "series": series,
        "alerts": alerts,
    }


# ----------------------------------------------------------------------------
# Funnel tab
# ----------------------------------------------------------------------------
async def build_funnel(db, days: int) -> Dict[str, Any]:
    """Funnel over the range for users REGISTERED in the range.

    Steps: registered → onboarded → first_like → first_match → first_confirmed_plan → first_realized_plan.
    """
    start_iso, end_iso, _ = iso_range(days)

    reg_ids: List[str] = []
    async for u in db.users.find({"created_at": {"$gte": start_iso, "$lt": end_iso}}, {"id": 1, "created_at": 1, "onboarding_complete": 1, "_id": 0}):
        reg_ids.append(u["id"])
    reg_set = set(reg_ids)
    total_registered = len(reg_ids)

    onboarded = await db.users.count_documents({"created_at": {"$gte": start_iso, "$lt": end_iso}, "onboarding_complete": True})

    if not reg_ids:
        first_like = first_match = first_conf = first_real = 0
    else:
        # First like given
        first_like_users: set = set()
        async for lk in db.likes.find({"from_user": {"$in": reg_ids}, "kind": "like"}, {"from_user": 1, "_id": 0}):
            first_like_users.add(lk["from_user"])
        first_like = len(first_like_users)

        # First match (user is a member)
        first_match_users: set = set()
        async for m in db.matches.find({"users": {"$in": reg_ids}}, {"users": 1, "_id": 0}):
            for uid in m.get("users", []):
                if uid in reg_set:
                    first_match_users.add(uid)
        first_match = len(first_match_users)

        # First confirmed plan (either user is member of match with accepted plan)
        match_ids_for_regs: List[str] = []
        match_users: Dict[str, List[str]] = {}
        async for m in db.matches.find({"users": {"$in": reg_ids}}, {"id": 1, "users": 1, "_id": 0}):
            match_ids_for_regs.append(m["id"])
            match_users[m["id"]] = m.get("users", [])
        confirmed_users: set = set()
        realized_users: set = set()
        now_iso = datetime.now(timezone.utc).isoformat()
        async for p in db.plans.find({"match_id": {"$in": match_ids_for_regs}, "status": "accepted"}, {"match_id": 1, "when": 1, "_id": 0}):
            for uid in match_users.get(p["match_id"], []):
                if uid in reg_set:
                    confirmed_users.add(uid)
                    if p.get("when") and p["when"] < now_iso:
                        realized_users.add(uid)
        first_conf = len(confirmed_users)
        first_real = len(realized_users)

    # Median times (in seconds → hours)
    async def _median_hours(field_from: str, field_to: str, coll_from, coll_to, join_field_from: str, join_field_to: str) -> Optional[float]:
        # Not used in this simple pass; we compute directly below.
        return None

    # Compute simple medians: registered→first like, first like→first match, match→confirmed plan.
    reg_created: Dict[str, str] = {}
    async for u in db.users.find({"id": {"$in": reg_ids}}, {"id": 1, "created_at": 1, "_id": 0}):
        reg_created[u["id"]] = u.get("created_at", "")
    first_like_at: Dict[str, str] = {}
    async for lk in db.likes.find({"from_user": {"$in": reg_ids}, "kind": "like"}, {"from_user": 1, "created_at": 1, "_id": 0}).sort("created_at", 1):
        first_like_at.setdefault(lk["from_user"], lk.get("created_at", ""))
    first_match_at: Dict[str, str] = {}
    async for m in db.matches.find({"users": {"$in": reg_ids}}, {"users": 1, "created_at": 1, "_id": 0}).sort("created_at", 1):
        for uid in m.get("users", []):
            if uid in reg_set:
                first_match_at.setdefault(uid, m.get("created_at", ""))

    def _diff_hours(a: str, b: str) -> Optional[float]:
        try:
            da = datetime.fromisoformat(a)
            db_ = datetime.fromisoformat(b)
            return (db_ - da).total_seconds() / 3600.0
        except Exception:
            return None

    def _median(vals: List[float]) -> Optional[float]:
        v = [x for x in vals if x is not None and x >= 0]
        if not v:
            return None
        v.sort()
        n = len(v)
        if n % 2:
            return round(v[n // 2], 1)
        return round((v[n // 2 - 1] + v[n // 2]) / 2, 1)

    reg_to_like = [_diff_hours(reg_created.get(uid, ""), first_like_at[uid]) for uid in first_like_at]
    like_to_match = [_diff_hours(first_like_at[uid], first_match_at[uid]) for uid in first_match_at if uid in first_like_at]

    # match→confirmed plan
    match_created_by_user: Dict[str, str] = {}
    match_ids_by_user: Dict[str, List[str]] = {}
    async for m in db.matches.find({"users": {"$in": reg_ids}}, {"id": 1, "users": 1, "created_at": 1, "_id": 0}):
        for uid in m.get("users", []):
            if uid in reg_set:
                match_created_by_user.setdefault(uid, m.get("created_at", ""))
                match_ids_by_user.setdefault(uid, []).append(m["id"])
    first_confirmed_at: Dict[str, str] = {}
    for uid, mids in match_ids_by_user.items():
        async for p in db.plans.find({"match_id": {"$in": mids}, "status": "accepted"}, {"accepted_at": 1, "_id": 0}).sort("accepted_at", 1).limit(1):
            first_confirmed_at[uid] = p.get("accepted_at", "")
    match_to_confirmed = [_diff_hours(match_created_by_user[uid], first_confirmed_at[uid]) for uid in first_confirmed_at if uid in match_created_by_user]

    def _pct(n: int, d: int) -> float:
        return round(n * 100.0 / d, 1) if d else 0.0

    return {
        "days": days,
        "steps": [
            {"key": "registered", "label": "Registrados", "count": total_registered, "pct": 100.0},
            {"key": "onboarded", "label": "Onboarding completo", "count": onboarded, "pct": _pct(onboarded, total_registered)},
            {"key": "first_like", "label": "Dieron su primer me tinca", "count": first_like, "pct": _pct(first_like, total_registered)},
            {"key": "first_match", "label": "Lograron su primer match", "count": first_match, "pct": _pct(first_match, total_registered)},
            {"key": "first_confirmed", "label": "Confirmaron su primer plan", "count": first_conf, "pct": _pct(first_conf, total_registered)},
            {"key": "first_realized", "label": "Plan realizado", "count": first_real, "pct": _pct(first_real, total_registered)},
        ],
        "median_hours": {
            "reg_to_first_like": _median(reg_to_like),
            "first_like_to_first_match": _median(like_to_match),
            "match_to_confirmed": _median(match_to_confirmed),
        },
        "cohorts": await _weekly_cohorts(db, days),
    }


async def _weekly_cohorts(db, days: int) -> List[Dict[str, Any]]:
    """Weekly cohort table for the funnel (last N days grouped in weeks starting Monday)."""
    today = today_local()
    weeks: List[tuple[date_cls, date_cls]] = []
    # Iterate backwards from today's week Monday
    monday_today = today - timedelta(days=today.weekday())
    d = monday_today - timedelta(days=(days // 7 - 1) * 7)
    while d <= monday_today:
        weeks.append((d, d + timedelta(days=6)))
        d += timedelta(days=7)

    result = []
    for wstart, wend in weeks:
        s_iso, _ = day_bounds_utc(wstart)
        _, e_iso = day_bounds_utc(wend)
        reg = []
        async for u in db.users.find({"created_at": {"$gte": s_iso, "$lt": e_iso}}, {"id": 1, "_id": 0}):
            reg.append(u["id"])
        reg_set = set(reg)
        total = len(reg)
        if not total:
            result.append({"week": day_str(wstart), "registered": 0, "onboarded_pct": 0, "match_pct": 0, "confirmed_pct": 0})
            continue
        onb = await db.users.count_documents({"created_at": {"$gte": s_iso, "$lt": e_iso}, "onboarding_complete": True})
        # match & confirmed
        match_set: set = set()
        async for m in db.matches.find({"users": {"$in": reg}}, {"users": 1, "_id": 0}):
            for uid in m.get("users", []):
                if uid in reg_set:
                    match_set.add(uid)
        conf_set: set = set()
        if match_set:
            match_ids: List[str] = []
            m_users: Dict[str, List[str]] = {}
            async for m in db.matches.find({"users": {"$in": reg}}, {"id": 1, "users": 1, "_id": 0}):
                match_ids.append(m["id"])
                m_users[m["id"]] = m.get("users", [])
            async for p in db.plans.find({"match_id": {"$in": match_ids}, "status": "accepted"}, {"match_id": 1, "_id": 0}):
                for uid in m_users.get(p["match_id"], []):
                    if uid in reg_set:
                        conf_set.add(uid)
        def _pct(n: int) -> float:
            return round(n * 100.0 / total, 1)

        result.append({
            "week": day_str(wstart),
            "registered": total,
            "onboarded_pct": _pct(onb),
            "match_pct": _pct(len(match_set)),
            "confirmed_pct": _pct(len(conf_set)),
        })
    return result


# ----------------------------------------------------------------------------
# Cron scheduler
# ----------------------------------------------------------------------------
async def _seconds_until_next_run(hour: int = 3, minute: int = 0) -> float:
    now = datetime.now(TZ)
    target = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if target <= now:
        target = target + timedelta(days=1)
    return (target - now).total_seconds()


async def daily_snapshot_loop(db):
    """Long-running loop: computes yesterday's snapshot each night at 03:00 America/Santiago."""
    logger.info("Metrics scheduler started (03:00 America/Santiago)")
    while True:
        try:
            secs = await _seconds_until_next_run(3, 0)
            await asyncio.sleep(secs)
            yesterday = today_local() - timedelta(days=1)
            snap = await compute_daily_snapshot(db, yesterday)
            await upsert_snapshot(db, snap)
            logger.info(f"Metrics daily snapshot written for {snap['date']}")
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.exception(f"Daily snapshot failed: {e}")
            await asyncio.sleep(60 * 15)  # retry in 15 min


# ----------------------------------------------------------------------------
# BLOQUE 2 — Detalle: Matching / Planes / Comunidad / Retención / Seguridad
# ----------------------------------------------------------------------------
async def build_matching(db, days: int) -> Dict[str, Any]:
    start_iso, end_iso, _ = iso_range(days)
    rows = await _fetch_range(db, days)

    likes = _sum(rows, "likes")
    matches_created = await db.matches.count_documents({"created_at": {"$gte": start_iso, "$lt": end_iso}})
    like_to_match_pct = round((matches_created * 2 * 100.0 / likes), 1) if likes else 0.0

    # Users who reached ≥1 match in their first 7 days (by weekly cohort)
    today = today_local()
    weeks = []
    monday_today = today - timedelta(days=today.weekday())
    d = monday_today - timedelta(days=(days // 7 - 1) * 7)
    while d <= monday_today:
        weeks.append((d, d + timedelta(days=6)))
        d += timedelta(days=7)
    liquidity_cohorts = []
    for wstart, wend in weeks:
        s_iso, _ = day_bounds_utc(wstart)
        _, e_iso = day_bounds_utc(wend)
        reg = []
        async for u in db.users.find({"created_at": {"$gte": s_iso, "$lt": e_iso}}, {"id": 1, "created_at": 1, "_id": 0}):
            reg.append(u)
        if not reg:
            liquidity_cohorts.append({"week": day_str(wstart), "registered": 0, "matched_first_7d_pct": 0})
            continue
        matched_first_7d = 0
        for u in reg:
            try:
                cu = datetime.fromisoformat(u["created_at"])
                cutoff = (cu + timedelta(days=7)).isoformat()
                got = await db.matches.count_documents({"users": u["id"], "created_at": {"$lte": cutoff}})
                if got:
                    matched_first_7d += 1
            except Exception:
                continue
        liquidity_cohorts.append({
            "week": day_str(wstart),
            "registered": len(reg),
            "matched_first_7d_pct": round(matched_first_7d * 100.0 / len(reg), 1),
        })

    # Unresponded likes (likes without reciprocation)
    all_likes = await db.likes.find({"kind": "like", "created_at": {"$gte": start_iso}}, {"from_user": 1, "to_user": 1, "mode": 1, "created_at": 1, "_id": 0}).to_list(5000)
    unresponded = 0
    ages_hours: List[float] = []
    for lk in all_likes:
        recip = await db.likes.find_one({"from_user": lk["to_user"], "to_user": lk["from_user"], "mode": lk.get("mode"), "kind": "like"})
        if not recip:
            unresponded += 1
            try:
                ages_hours.append((datetime.now(timezone.utc) - datetime.fromisoformat(lk["created_at"])).total_seconds() / 3600.0)
            except Exception:
                pass
    ages_hours.sort()
    median_age = round(ages_hours[len(ages_hours) // 2], 1) if ages_hours else None

    # Attention concentration
    like_recipients_count: Dict[str, int] = {}
    for lk in all_likes:
        like_recipients_count[lk["to_user"]] = like_recipients_count.get(lk["to_user"], 0) + 1
    total_likes = sum(like_recipients_count.values())
    top10_share = 0.0
    if total_likes:
        counts = sorted(like_recipients_count.values(), reverse=True)
        top10 = max(1, len(counts) // 10)
        top10_share = round(sum(counts[:top10]) * 100.0 / total_likes, 1)

    # Active pool composition (last 14 days)
    fourteen_ago = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()
    active_uids: set = set()
    async for lk in db.likes.find({"created_at": {"$gte": fourteen_ago}}, {"from_user": 1, "_id": 0}):
        if lk.get("from_user"):
            active_uids.add(lk["from_user"])
    async for m in db.messages.find({"created_at": {"$gte": fourteen_ago}}, {"from_user": 1, "_id": 0}):
        if m.get("from_user") and m["from_user"] != "system":
            active_uids.add(m["from_user"])
    by_gender: Dict[str, int] = {}
    by_mode: Dict[str, int] = {}
    by_age: Dict[str, int] = {"18-24": 0, "25-34": 0, "35-44": 0, "45+": 0}
    by_comuna: Dict[str, int] = {}
    if active_uids:
        async for u in db.users.find({"id": {"$in": list(active_uids)}}, {"gender": 1, "modes": 1, "birthdate": 1, "comuna": 1, "_id": 0}):
            g = u.get("gender") or "sin_dato"
            by_gender[g] = by_gender.get(g, 0) + 1
            for md in (u.get("modes") or []):
                by_mode[md] = by_mode.get(md, 0) + 1
            # Age bucket
            try:
                yr = datetime.fromisoformat(u["birthdate"]).date()
                age = today_local().year - yr.year - ((today_local().month, today_local().day) < (yr.month, yr.day))
                if age < 25: by_age["18-24"] += 1
                elif age < 35: by_age["25-34"] += 1
                elif age < 45: by_age["35-44"] += 1
                else: by_age["45+"] += 1
            except Exception:
                pass
            c = u.get("comuna") or "sin_comuna"
            by_comuna[c] = by_comuna.get(c, 0) + 1

    # Daily quota exhaustion
    today_iso = today_local().isoformat()
    exhausted = await db.likes.aggregate([
        {"$match": {"date": today_iso, "kind": "like"}},
        {"$group": {"_id": "$from_user", "n": {"$sum": 1}}},
        {"$match": {"n": {"$gte": 20}}},
        {"$count": "total"},
    ]).to_list(1)
    exhausted_count = exhausted[0]["total"] if exhausted else 0
    quota_pct = round(exhausted_count * 100.0 / len(active_uids), 1) if active_uids else 0.0

    return {
        "days": days,
        "likes_series": [{"date": r["date"], "likes": r.get("likes", 0)} for r in rows],
        "like_to_match_pct": like_to_match_pct,
        "liquidity_cohorts": liquidity_cohorts,
        "unresponded_likes": {"total": unresponded, "median_age_hours": median_age},
        "attention_top10_pct": top10_share,
        "pool": {
            "total_active": len(active_uids),
            "by_gender": by_gender,
            "by_mode": by_mode,
            "by_age": by_age,
            "by_comuna": dict(sorted(by_comuna.items(), key=lambda x: -x[1])[:10]),
        },
        "quota_exhausted_pct": quota_pct,
    }


async def build_planes(db, days: int) -> Dict[str, Any]:
    start_iso, end_iso, _ = iso_range(days)
    now_iso_str = datetime.now(timezone.utc).isoformat()

    matches_n = await db.matches.count_documents({"created_at": {"$gte": start_iso, "$lt": end_iso}})
    proposed_n = await db.plans.count_documents({"created_at": {"$gte": start_iso, "$lt": end_iso}})
    confirmed_n = await db.plans.count_documents({"accepted_at": {"$gte": start_iso, "$lt": end_iso}, "status": "accepted"})
    realized_n = await db.plans.count_documents({"status": "accepted", "when": {"$gte": start_iso, "$lt": now_iso_str}})

    # Top proposed vs realized activities
    proposed_agg = await db.plans.aggregate([
        {"$match": {"created_at": {"$gte": start_iso, "$lt": end_iso}}},
        {"$group": {"_id": "$activity.name", "n": {"$sum": 1}}},
        {"$sort": {"n": -1}}, {"$limit": 8},
    ]).to_list(8)
    realized_agg = await db.plans.aggregate([
        {"$match": {"status": "accepted", "when": {"$gte": start_iso, "$lt": now_iso_str}}},
        {"$group": {"_id": "$activity.name", "n": {"$sum": 1}}},
        {"$sort": {"n": -1}}, {"$limit": 8},
    ]).to_list(8)
    activities_data = []
    all_names = list({p["_id"] for p in proposed_agg} | {r["_id"] for r in realized_agg})
    prop_map = {p["_id"]: p["n"] for p in proposed_agg}
    real_map = {r["_id"]: r["n"] for r in realized_agg}
    for name in all_names:
        activities_data.append({"name": name, "proposed": prop_map.get(name, 0), "realized": real_map.get(name, 0)})
    activities_data.sort(key=lambda x: -(x["proposed"] + x["realized"]))

    # Medians
    match_created_map: Dict[str, str] = {}
    async for m in db.matches.find({}, {"id": 1, "created_at": 1, "_id": 0}):
        match_created_map[m["id"]] = m.get("created_at", "")
    plans = await db.plans.find({"accepted_at": {"$gte": start_iso, "$lt": end_iso}, "status": "accepted"}, {"match_id": 1, "accepted_at": 1, "when": 1, "_id": 0}).to_list(2000)
    match_to_conf: List[float] = []
    conf_to_when: List[float] = []
    for p in plans:
        try:
            mc = datetime.fromisoformat(match_created_map.get(p["match_id"], ""))
            ac = datetime.fromisoformat(p["accepted_at"])
            match_to_conf.append((ac - mc).total_seconds() / 3600.0)
            if p.get("when"):
                wh = datetime.fromisoformat(p["when"])
                conf_to_when.append((wh - ac).total_seconds() / 3600.0)
        except Exception:
            continue

    def _median(vals: List[float]) -> Optional[float]:
        v = sorted([x for x in vals if x is not None])
        if not v:
            return None
        n = len(v)
        return round(v[n // 2] if n % 2 else (v[n // 2 - 1] + v[n // 2]) / 2, 1)

    return {
        "days": days,
        "funnel": {
            "matches": matches_n,
            "proposed": proposed_n,
            "confirmed": confirmed_n,
            "realized": realized_n,
            "proposed_pct": round(proposed_n * 100.0 / matches_n, 1) if matches_n else 0.0,
            "confirmed_pct": round(confirmed_n * 100.0 / matches_n, 1) if matches_n else 0.0,
            "realized_pct": round(realized_n * 100.0 / matches_n, 1) if matches_n else 0.0,
        },
        "activities": activities_data,
        "medians": {
            "match_to_confirmed_h": _median(match_to_conf),
            "confirmed_to_when_h": _median(conf_to_when),
        },
        # Feedback not implemented yet
        "feedback": {"available": False, "note": "Feedback post-plan pendiente de integración"},
    }


async def build_comunidad(db, days: int) -> Dict[str, Any]:
    start_iso, _, _ = iso_range(days)
    seven_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

    groups = await db.groups.find({}, {"_id": 0}).to_list(500)
    groups_total = len(groups)
    group_stats = []
    active_groups = 0
    for g in groups:
        msg_n = await db.group_messages.count_documents({"group_id": g["id"], "created_at": {"$gte": seven_ago}})
        member_n = await db.group_members.count_documents({"group_id": g["id"]})
        new_member_n = await db.group_members.count_documents({"group_id": g["id"], "joined_at": {"$gte": seven_ago}})
        events_n = await db.events.count_documents({"group_id": g["id"], "when": {"$gte": seven_ago}})
        is_active = msg_n >= 5 or events_n >= 1
        if is_active:
            active_groups += 1
        # Next event
        nxt_ev_docs = await db.events.find({"group_id": g["id"], "when": {"$gte": datetime.now(timezone.utc).isoformat()}}, {"title": 1, "when": 1, "_id": 0}).sort("when", 1).limit(1).to_list(1)
        nxt_ev = nxt_ev_docs[0] if nxt_ev_docs else None
        group_stats.append({
            "id": g["id"],
            "name": g.get("name"),
            "members": member_n,
            "new_members_7d": new_member_n,
            "messages_7d": msg_n,
            "active": is_active,
            "next_event": nxt_ev,
        })
    group_stats.sort(key=lambda x: -x["messages_7d"])

    # Events
    events_created = await db.events.count_documents({"created_at": {"$gte": start_iso}})
    rsvps_total = await db.event_rsvps.count_documents({"created_at": {"$gte": start_iso}})

    # % active users in a group
    fourteen_ago = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()
    active_uids: set = set()
    async for lk in db.likes.find({"created_at": {"$gte": fourteen_ago}}, {"from_user": 1, "_id": 0}):
        if lk.get("from_user"):
            active_uids.add(lk["from_user"])
    in_group = 0
    if active_uids:
        member_uids: set = set()
        async for gm in db.group_members.find({"user_id": {"$in": list(active_uids)}}, {"user_id": 1, "_id": 0}):
            member_uids.add(gm["user_id"])
        in_group = len(member_uids)
    active_in_group_pct = round(in_group * 100.0 / len(active_uids), 1) if active_uids else 0.0

    return {
        "days": days,
        "groups_total": groups_total,
        "groups_active": active_groups,
        "groups_stats": group_stats,
        "events_created": events_created,
        "rsvps_total": rsvps_total,
        "active_in_group_pct": active_in_group_pct,
    }


async def build_retencion(db, days: int) -> Dict[str, Any]:
    today = today_local()
    # Cohorts: last N weeks by registration; D1/D7/D30 retention
    weeks = []
    monday_today = today - timedelta(days=today.weekday())
    d = monday_today - timedelta(days=(days // 7 - 1) * 7)
    while d <= monday_today:
        weeks.append((d, d + timedelta(days=6)))
        d += timedelta(days=7)

    cohort_rows = []
    for wstart, wend in weeks:
        s_iso, _ = day_bounds_utc(wstart)
        _, e_iso = day_bounds_utc(wend)
        reg = []
        async for u in db.users.find({"created_at": {"$gte": s_iso, "$lt": e_iso}}, {"id": 1, "created_at": 1, "_id": 0}):
            reg.append(u)
        total = len(reg)
        d1 = d7 = d30 = 0
        for u in reg:
            try:
                created = datetime.fromisoformat(u["created_at"])
                for label, delta in (("d1", 1), ("d7", 7), ("d30", 30)):
                    win_start = (created + timedelta(days=delta)).isoformat()
                    win_end = (created + timedelta(days=delta + 1)).isoformat()
                    active = await db.likes.count_documents({"from_user": u["id"], "created_at": {"$gte": win_start, "$lt": win_end}})
                    if not active:
                        active = await db.messages.count_documents({"from_user": u["id"], "created_at": {"$gte": win_start, "$lt": win_end}})
                    if active:
                        if label == "d1":
                            d1 += 1
                        elif label == "d7":
                            d7 += 1
                        elif label == "d30":
                            d30 += 1
            except Exception:
                continue
        cohort_rows.append({
            "week": day_str(wstart),
            "registered": total,
            "d1_pct": round(d1 * 100.0 / total, 1) if total else 0.0,
            "d7_pct": round(d7 * 100.0 / total, 1) if total else 0.0,
            "d30_pct": round(d30 * 100.0 / total, 1) if total else 0.0,
        })

    # Stickiness DAU/MAU
    dau_ids: set = set()
    today_start, today_end = day_bounds_utc(today)
    async for lk in db.likes.find({"created_at": {"$gte": today_start, "$lt": today_end}}, {"from_user": 1, "_id": 0}):
        if lk.get("from_user"):
            dau_ids.add(lk["from_user"])
    async for m in db.messages.find({"created_at": {"$gte": today_start, "$lt": today_end}}, {"from_user": 1, "_id": 0}):
        if m.get("from_user") and m["from_user"] != "system":
            dau_ids.add(m["from_user"])
    thirty_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    mau_ids: set = set()
    async for lk in db.likes.find({"created_at": {"$gte": thirty_ago}}, {"from_user": 1, "_id": 0}):
        if lk.get("from_user"):
            mau_ids.add(lk["from_user"])
    async for m in db.messages.find({"created_at": {"$gte": thirty_ago}}, {"from_user": 1, "_id": 0}):
        if m.get("from_user") and m["from_user"] != "system":
            mau_ids.add(m["from_user"])
    stickiness = round(len(dau_ids) * 100.0 / len(mau_ids), 1) if mau_ids else 0.0

    # Dormant vs resurrected
    fourteen_ago = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()
    active_recent_ids: set = set()
    async for lk in db.likes.find({"created_at": {"$gte": fourteen_ago}}, {"from_user": 1, "_id": 0}):
        active_recent_ids.add(lk.get("from_user"))
    async for m in db.messages.find({"created_at": {"$gte": fourteen_ago}}, {"from_user": 1, "_id": 0}):
        if m.get("from_user") != "system":
            active_recent_ids.add(m.get("from_user"))
    all_completed = await db.users.count_documents({"onboarding_complete": True, "deleted_at": {"$exists": False}})
    dormant = max(0, all_completed - len(active_recent_ids))
    # Resurrected = active last 7d but not active in 8-21d ago
    seven_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    twenty_one_ago = (datetime.now(timezone.utc) - timedelta(days=21)).isoformat()
    active_7d: set = set()
    async for lk in db.likes.find({"created_at": {"$gte": seven_ago}}, {"from_user": 1, "_id": 0}):
        active_7d.add(lk.get("from_user"))
    active_8_21: set = set()
    async for lk in db.likes.find({"created_at": {"$gte": twenty_one_ago, "$lt": seven_ago}}, {"from_user": 1, "_id": 0}):
        active_8_21.add(lk.get("from_user"))
    resurrected = len([uid for uid in active_7d if uid and uid not in active_8_21])

    return {
        "days": days,
        "cohorts": cohort_rows,
        "stickiness_pct": stickiness,
        "dormant_users": dormant,
        "resurrected_users": resurrected,
        "email": {"integrated": False, "note": "Envío de emails (Resend) pendiente de integración"},
    }


async def build_seguridad(db, days: int) -> Dict[str, Any]:
    start_iso, end_iso, day_list = iso_range(days)

    # Reports by category
    by_cat_agg = await db.reports.aggregate([
        {"$match": {"created_at": {"$gte": start_iso, "$lt": end_iso}}},
        {"$group": {"_id": "$category", "n": {"$sum": 1}}},
    ]).to_list(20)
    by_category = {r["_id"]: r["n"] for r in by_cat_agg}

    # Reports per day
    per_day: Dict[str, int] = {d: 0 for d in day_list}
    async for r in db.reports.find({"created_at": {"$gte": start_iso, "$lt": end_iso}}, {"created_at": 1, "_id": 0}):
        try:
            dt = datetime.fromisoformat(r["created_at"]).astimezone(TZ).date().isoformat()
            if dt in per_day:
                per_day[dt] += 1
        except Exception:
            pass
    reports_series = [{"date": d, "count": per_day[d]} for d in day_list]

    # Median resolution time (in hours)
    res_times: List[float] = []
    grave_res_times: List[float] = []
    grave_over_4h_open = 0
    grave_open_total = 0
    async for r in db.reports.find({"created_at": {"$gte": start_iso, "$lt": end_iso}}, {"created_at": 1, "resolved_at": 1, "category": 1, "status": 1, "_id": 0}):
        try:
            created = datetime.fromisoformat(r["created_at"])
            is_grave = r.get("category") in ("ofrece_sustancias", "mala_conducta_cita")
            if r.get("resolved_at"):
                delta_h = (datetime.fromisoformat(r["resolved_at"]) - created).total_seconds() / 3600.0
                res_times.append(delta_h)
                if is_grave:
                    grave_res_times.append(delta_h)
            elif r.get("status") == "open" and is_grave:
                grave_open_total += 1
                open_age_h = (datetime.now(timezone.utc) - created).total_seconds() / 3600.0
                if open_age_h > 4:
                    grave_over_4h_open += 1
        except Exception:
            continue

    def _median(vals: List[float]) -> Optional[float]:
        v = sorted(vals)
        if not v:
            return None
        n = len(v)
        return round(v[n // 2] if n % 2 else (v[n // 2 - 1] + v[n // 2]) / 2, 1)

    grave_under_4h_pct = None
    if grave_res_times:
        under = len([x for x in grave_res_times if x < 4])
        grave_under_4h_pct = round(under * 100.0 / len(grave_res_times), 1)

    # Recidivism: users with 2+ distinct reporters
    recid_agg = await db.reports.aggregate([
        {"$group": {"_id": "$target_user", "reporters": {"$addToSet": "$from_user"}}},
        {"$project": {"target_user": "$_id", "n": {"$size": "$reporters"}}},
        {"$match": {"n": {"$gte": 2}}},
        {"$sort": {"n": -1}}, {"$limit": 50},
    ]).to_list(50)
    recidivists = []
    for r in recid_agg:
        u = await db.users.find_one({"id": r["target_user"]}, {"id": 1, "alias": 1, "email": 1, "status": 1, "_id": 0})
        if u:
            recidivists.append({"id": u["id"], "alias": u.get("alias"), "email": u.get("email"), "status": u.get("status"), "reporter_count": r["n"]})

    # Blocks per day + ratio blocks/matches
    blocks = await db.blocks.count_documents({"created_at": {"$gte": start_iso, "$lt": end_iso}})
    matches_n = await db.matches.count_documents({"created_at": {"$gte": start_iso, "$lt": end_iso}})
    block_ratio = round(blocks * 100.0 / matches_n, 1) if matches_n else 0.0

    # Support-page visits per day (anonymous)
    support_docs = await db.support_page_views.find({"date": {"$in": day_list}}, {"_id": 0}).to_list(500)
    support_map = {d["date"]: d["count"] for d in support_docs}
    support_series = [{"date": d, "count": support_map.get(d, 0)} for d in day_list]

    # Bans and suspensions
    bans = await db.admin_actions.count_documents({"action": "ban", "created_at": {"$gte": start_iso}})
    suspensions = await db.admin_actions.count_documents({"action": "suspend", "created_at": {"$gte": start_iso}})

    return {
        "days": days,
        "by_category": by_category,
        "reports_series": reports_series,
        "median_resolution_h": _median(res_times),
        "grave_under_4h_pct": grave_under_4h_pct,
        "grave_open_total": grave_open_total,
        "grave_over_4h_open": grave_over_4h_open,
        "recidivists": recidivists,
        "blocks_total": blocks,
        "block_ratio_pct": block_ratio,
        "support_series": support_series,
        "bans": bans,
        "suspensions": suspensions,
    }
