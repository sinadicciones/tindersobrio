import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, MoreVertical, Calendar, Send, ChevronRight } from "lucide-react";
import Avatar from "@/components/Avatar";
import { REPORT_CATEGORIES } from "@/constants/comunas";
import { Icon, iconForActivity } from "@/lib/icons";

export default function ChatDetail() {
  const { matchId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [match, setMatch] = useState(null);
  const [text, setText] = useState("");
  const [menu, setMenu] = useState(false);
  const [activities, setActivities] = useState([]);
  const [planModal, setPlanModal] = useState(false);
  const [planDefaultActId, setPlanDefaultActId] = useState("");
  const [reportModal, setReportModal] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef(null);
  const showedTip = useRef(false);
  const lastActivityRef = useRef(Date.now());

  const load = async () => {
    try {
      const m = await api.get("/matches");
      const cur = m.data.find((x) => x.id === matchId);
      setMatch(cur);
      const msgs = await api.get(`/matches/${matchId}/messages`, { params: { limit: 50 } });
      setMessages(msgs.data);
      setHasMore(msgs.data.length >= 50);
      api.post(`/matches/${matchId}/read`).catch(() => { /* ignore */ });
    } catch (ex) { toast.error(formatApiError(ex.response?.data?.detail)); }
  };

  const loadOlder = async () => {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    setLoadingOlder(true);
    try {
      const oldest = messages[0]?.created_at;
      const r = await api.get(`/matches/${matchId}/messages`, { params: { before: oldest, limit: 50 } });
      if (r.data.length === 0) setHasMore(false);
      else setMessages((prev) => [...r.data, ...prev]);
    } catch { /* ignore */ } finally { setLoadingOlder(false); }
  };

  useEffect(() => { load(); api.get("/activities").then((r)=>setActivities(r.data)); /* eslint-disable-next-line */ }, [matchId]);

  // Polling with visibility + idle backoff
  useEffect(() => {
    let timer = null;
    const tick = async () => {
      if (document.hidden) { timer = setTimeout(tick, 4000); return; }
      const idle = Date.now() - lastActivityRef.current > 60000;
      const wait = idle ? 12000 : 4000;
      try {
        const oldest = null; // full refresh keeps latest N
        const params = { limit: 50 };
        if (oldest) params.before = oldest;
        const msgs = await api.get(`/matches/${matchId}/messages`, { params });
        setMessages(msgs.data);
      } catch { /* polling ignore */ }
      timer = setTimeout(tick, wait);
    };
    timer = setTimeout(tick, 4000);
    const onVis = () => { if (!document.hidden) { lastActivityRef.current = Date.now(); } };
    document.addEventListener("visibilitychange", onVis);
    const onActivity = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener("keydown", onActivity);
    window.addEventListener("pointerdown", onActivity);
    return () => { if (timer) clearTimeout(timer); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("keydown", onActivity); window.removeEventListener("pointerdown", onActivity); };
  }, [matchId]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 99999, behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    if (match?.mode === "amor" && !showedTip.current) {
      showedTip.current = true;
      toast("Consejo: junta de día y en un lugar público para la primera vez. Cuéntale a alguien de confianza dónde estarás.", { duration: 7000 });
    }
  }, [match]);

  const send = async (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText("");
    try {
      await api.post(`/matches/${matchId}/messages`, { text: t });
      await load();
    } catch (ex) {
      setText(t);
      toast.error(formatApiError(ex.response?.data?.detail));
    }
  };

  const proposePlan = async (activity_id, when) => {
    try {
      await api.post(`/matches/${matchId}/propose-plan`, { activity_id, when });
      setPlanModal(false);
      await load();
      toast.success("Plan propuesto");
    } catch (ex) { toast.error(formatApiError(ex.response?.data?.detail)); }
  };

  const acceptPlan = async (plan_id) => {
    try { await api.post(`/plans/${plan_id}/accept`); toast.success("¡Plan confirmado!"); await load(); } catch (ex) { toast.error(formatApiError(ex.response?.data?.detail)); }
  };

  const delMatch = async () => {
    if (!confirm("¿Eliminar match? No podrás recuperarlo.")) return;
    await api.delete(`/matches/${matchId}`); nav("/app/chats");
  };
  const block = async () => {
    if (!confirm("¿Bloquear a este usuario?")) return;
    await api.post("/block", { target_user_id: match.other.id });
    toast.success("Usuario bloqueado."); nav("/app/chats");
  };

  if (!match) return <div className="p-6 text-white/60">Cargando…</div>;

  return (
    <div className="mx-auto max-w-md px-4 pt-4 flex flex-col" style={{ minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-white/5">
        <button onClick={()=>nav("/app/chats")} data-testid="chat-back"><ArrowLeft/></button>
        <Link data-testid="chat-other-avatar" to={`/app/usuario/${match.other?.id}`} className="shrink-0">
          <Avatar user={match.other} size={40}/>
        </Link>
        <Link data-testid="chat-other-alias" to={`/app/usuario/${match.other?.id}`} className="flex-1 min-w-0 hover:opacity-90">
          <p className="font-display font-bold truncate">{match.other?.alias}</p>
          <p className="text-xs text-white/50">{match.mode}</p>
        </Link>
        <div className="relative">
          <button data-testid="chat-menu" onClick={()=>setMenu((v)=>!v)} className="p-2"><MoreVertical/></button>
          {menu && (
            <div className="absolute right-0 top-10 w-48 ps-card p-1 z-30">
              <button data-testid="menu-delete" onClick={delMatch} className="w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-white/5">Eliminar match</button>
              <button data-testid="menu-block" onClick={block} className="w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-white/5">Bloquear</button>
              <button data-testid="menu-report" onClick={()=>{setMenu(false); setReportModal(true);}} className="w-full text-left px-3 py-2 rounded-xl text-sm hover:bg-white/5">Reportar</button>
            </div>
          )}
        </div>
      </div>

      {/* Sticky plan status bar */}
      {match && (() => {
        const proposals = match.proposals || {};
        const myAct = proposals[user.id];
        const otherAct = proposals[match.other?.id];
        const status = match.plan_status;
        if (status === "confirmed") {
          const a = match.confirmed_activity;
          return (
            <div data-testid="plan-status-confirmed" className="mt-2 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-sm"
              style={{ background: "rgba(74,222,128,.12)", border: "1px solid rgba(74,222,128,.42)", color: "#4ADE80" }}>
              {a && <Icon name={iconForActivity(a)} size={14} strokeWidth={1.9}/>}
              <span className="flex-1 truncate font-semibold">{a?.name || "Plan"} · confirmado</span>
            </div>
          );
        }
        const chips = [];
        if (myAct && otherAct && myAct.id !== otherAct.id) {
          chips.push({ ...myAct, label: myAct.name });
          chips.push({ ...otherAct, label: otherAct.name });
        } else if (myAct || otherAct) {
          const one = myAct || otherAct;
          chips.push({ ...one, label: one.name });
        }
        // If both agreed on same activity → preselect it in the modal.
        const agreedActId = (myAct && otherAct && myAct.id === otherAct.id) ? myAct.id : (myAct?.id || otherAct?.id || "");
        return (
          <button
            data-testid="plan-status-bar"
            onClick={()=>{ setPlanDefaultActId(agreedActId); setPlanModal(true); }}
            className="mt-2 w-full px-3 py-2.5 rounded-2xl flex items-center gap-2 text-xs text-left hover:brightness-110 transition"
            style={{ background: "rgba(139,92,246,.12)", border: "1px solid rgba(139,92,246,.4)" }}
          >
            <Calendar size={14} strokeWidth={1.9} className="text-[#8B5CF6] shrink-0"/>
            {chips.length ? (
              <div className="flex-1 flex flex-wrap gap-1.5 items-center">
                {chips.map((c, i) => (
                  <span key={i} data-testid={`plan-chip-${i}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/[.16] text-[11px] font-bold text-white">
                    <Icon name={iconForActivity(c)} size={11} strokeWidth={1.9}/> {c.label}
                  </span>
                ))}
                <span className="text-[#C7CBD6] self-center text-[11px]">{chips.length > 1 ? "¿Cuál va primero?" : "· falta la fecha"}</span>
              </div>
            ) : (
              <span className="flex-1 text-[#C7CBD6]">¿Armamos un plan? Toca para proponer</span>
            )}
            <ChevronRight size={14} strokeWidth={1.9} className="text-[#8B5CF6] shrink-0"/>
          </button>
        );
      })()}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-2 pb-nav">
        {hasMore && messages.length >= 50 && (
          <div className="flex justify-center pb-2">
            <button data-testid="load-older" disabled={loadingOlder} onClick={loadOlder} className="ps-btn-secondary text-xs px-3 py-1.5">
              {loadingOlder ? "Cargando…" : "Cargar mensajes anteriores"}
            </button>
          </div>
        )}
        {messages.map((m) => {
          if (m.kind === "system") return (
            <div key={m.id} data-testid="msg-system" className="my-2 mx-auto max-w-[90%] text-center">
              <p className="text-[12px] text-[#8E93A3] leading-relaxed">{m.text}</p>
            </div>
          );
          if (m.kind === "plan_proposal") {
            return (
              <div key={m.id} className="ps-card p-3 my-2 border border-[#8B5CF6]/30 self-start">
                <p className="text-xs text-white/60">Propuesta de plan</p>
                <p className="font-display font-bold mt-1">{m.text}</p>
                {m.from_user !== user.id && m.plan_id && (
                  <button data-testid={`accept-plan-${m.plan_id}`} onClick={()=>acceptPlan(m.plan_id)} className="ps-btn-primary mt-2 text-sm py-2 px-4">Aceptar plan</button>
                )}
              </div>
            );
          }
          const mine = m.from_user === user.id;
          const otherPhoto = match.other?.photos?.[0] ? { photos: match.other.photos, alias: match.other.alias } : { alias: match.other?.alias };
          return (
            <div key={m.id} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}>
              {!mine && (
                <Link data-testid="msg-other-avatar" to={`/app/usuario/${match.other?.id}`} className="shrink-0 mb-1">
                  <Avatar user={otherPhoto} size={28}/>
                </Link>
              )}
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm break-words ${mine ? "ps-gradient text-white" : "bg-white/5 border border-white/10"}`}>
                {m.text}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={send} className="fixed bottom-24 left-0 right-0 z-30 pointer-events-none">
        <div className="mx-auto max-w-md px-4 pointer-events-auto">
          <div className="flex items-center gap-2 bg-[#12141A]/95 backdrop-blur-xl rounded-full p-1 border border-white/10 shadow-2xl">
            <button type="button" data-testid="propose-plan-btn" onClick={()=>{ setPlanDefaultActId(""); setPlanModal(true); }} className="p-3 rounded-full bg-white/5 hover:bg-white/10"><Calendar size={18}/></button>
            <input data-testid="chat-input" value={text} onChange={(e)=>setText(e.target.value)} placeholder="Mensaje…" className="flex-1 bg-transparent outline-none px-2 py-2 text-sm"/>
            <button data-testid="chat-send" disabled={!text.trim()} className="p-3 rounded-full ps-gradient disabled:opacity-40"><Send size={16}/></button>
          </div>
        </div>
      </form>

      {planModal && <PlanModal activities={activities} defaultActivityId={planDefaultActId} onClose={()=>setPlanModal(false)} onSubmit={proposePlan}/>}
      {reportModal && <ReportModal targetId={match.other.id} onClose={()=>setReportModal(false)}/>}
    </div>
  );
}

function PlanModal({ activities, defaultActivityId = "", onClose, onSubmit }) {
  // `datetime-local` expects LOCAL time (no timezone). Using `toISOString()` (UTC)
  // as the min shifts it hours into the future for users in AR/CL, blocking any
  // near-term date selection. Compute a proper local "YYYY-MM-DDTHH:MM" instead.
  const localNowStr = () => {
    const d = new Date();
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().slice(0, 16);
  };
  const [act, setAct] = useState(defaultActivityId);
  const [when, setWhen] = useState("");
  const [minWhen, setMinWhen] = useState(localNowStr());

  // Refresh min every 60s so it doesn't drift while the modal is open.
  useEffect(() => {
    const t = setInterval(() => setMinWhen(localNowStr()), 60000);
    return () => clearInterval(t);
  }, []);

  // Quick preset dates in local timezone — huge UX win over the raw datetime picker.
  const presets = (() => {
    const now = new Date();
    const mkAt = (daysAhead, hour, minute = 0) => {
      const d = new Date(now);
      d.setDate(d.getDate() + daysAhead);
      d.setHours(hour, minute, 0, 0);
      return d;
    };
    const fmtLocal = (d) => {
      const off = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - off).toISOString().slice(0, 16);
    };
    const fmtLabel = (d) => {
      const days = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
      const isToday = d.toDateString() === now.toDateString();
      const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
      const isTomorrow = d.toDateString() === tomorrow.toDateString();
      const label = isToday ? "Hoy" : isTomorrow ? "Mañana" : `${days[d.getDay()]} ${d.getDate()}`;
      return `${label} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };
    const items = [];
    // Only offer "today X" presets whose time is still in the future
    for (const hour of [10, 15, 19]) {
      const d = mkAt(0, hour);
      if (d > new Date(now.getTime() + 30 * 60000)) items.push({ label: fmtLabel(d), value: fmtLocal(d) });
    }
    // Always offer tomorrow 10/19 and Saturday 15
    items.push({ label: fmtLabel(mkAt(1, 10)), value: fmtLocal(mkAt(1, 10)) });
    items.push({ label: fmtLabel(mkAt(1, 19)), value: fmtLocal(mkAt(1, 19)) });
    // Next Saturday at 15:00
    const daysUntilSat = (6 - now.getDay() + 7) % 7 || 7;
    items.push({ label: fmtLabel(mkAt(daysUntilSat, 15)), value: fmtLocal(mkAt(daysUntilSat, 15)) });
    return items;
  })();

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="ps-card w-full max-w-md p-6">
        <h2 className="font-display text-2xl font-black">Proponer plan</h2>
        <div className="mt-4 space-y-3">
          <select data-testid="propose-activity" className="ps-input" value={act} onChange={(e)=>setAct(e.target.value)}>
            <option value="">Elige actividad…</option>
            {activities.filter((a) => !a.is_virtual).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <div>
            <p className="text-xs text-white/60 mb-2">¿Cuándo?</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {presets.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  data-testid={`preset-${p.value}`}
                  onClick={()=>setWhen(p.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${when === p.value ? "ps-gradient border-transparent text-white" : "bg-white/5 border-white/[.16] text-[#C7CBD6] hover:bg-white/10"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input
              data-testid="propose-when"
              type="datetime-local"
              className="ps-input"
              value={when}
              onChange={(e)=>setWhen(e.target.value)}
              min={minWhen}
            />
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="ps-btn-secondary flex-1">Cancelar</button>
          <button data-testid="propose-submit" disabled={!act || !when} onClick={()=>onSubmit(act, new Date(when).toISOString())} className="ps-btn-primary flex-1">Proponer</button>
        </div>
      </div>
    </div>
  );
}

function ReportModal({ targetId, onClose }) {
  const [cat, setCat] = useState("");
  const [det, setDet] = useState("");
  const submit = async () => {
    try { await api.post("/report", { target_user_id: targetId, category: cat, details: det });
      toast.success("Gracias por cuidar la comunidad. Lo revisaremos pronto."); onClose();
    } catch (ex) { toast.error(formatApiError(ex.response?.data?.detail)); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="ps-card w-full max-w-md p-6">
        <h2 className="font-display text-2xl font-black">Reportar usuario</h2>
        <div className="mt-4 space-y-2">
          {REPORT_CATEGORIES.map((c) => (
            <button key={c.v} data-testid={`report-cat-${c.v}`} onClick={()=>setCat(c.v)} className={`w-full text-left px-4 py-3 rounded-2xl border ${cat===c.v ? "ps-gradient border-transparent" : "bg-white/5 border-white/10"}`}>{c.l}</button>
          ))}
          <textarea data-testid="report-details" className="ps-input" rows={3} placeholder="Cuéntanos más (opcional)…" value={det} onChange={(e)=>setDet(e.target.value)}/>
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="ps-btn-secondary flex-1">Cancelar</button>
          <button data-testid="report-submit" disabled={!cat} onClick={submit} className="ps-btn-primary flex-1">Enviar</button>
        </div>
      </div>
    </div>
  );
}
