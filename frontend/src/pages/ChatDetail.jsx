import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, MoreVertical, Calendar, Send } from "lucide-react";
import Avatar from "@/components/Avatar";
import { REPORT_CATEGORIES } from "@/constants/comunas";

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
  const [reportModal, setReportModal] = useState(false);
  const scrollRef = useRef(null);
  const showedTip = useRef(false);

  const load = async () => {
    try {
      const m = await api.get("/matches");
      const cur = m.data.find((x) => x.id === matchId);
      setMatch(cur);
      const msgs = await api.get(`/matches/${matchId}/messages`);
      setMessages(msgs.data);
    } catch (ex) { toast.error(formatApiError(ex.response?.data?.detail)); }
  };
  useEffect(() => { load(); api.get("/activities").then((r)=>setActivities(r.data)); }, [matchId]);

  useEffect(() => {
    const t = setInterval(async () => {
      try { const msgs = await api.get(`/matches/${matchId}/messages`); setMessages(msgs.data); } catch { /* polling ignore */ }
    }, 4000);
    return () => clearInterval(t);
  }, [matchId]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 99999, behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    if (match?.mode === "amor" && !showedTip.current) {
      showedTip.current = true;
      toast("💛 Consejo: junta de día y en un lugar público para la primera vez. Cuéntale a alguien de confianza dónde estarás.", { duration: 7000 });
    }
  }, [match]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const t = text; setText("");
    try { await api.post(`/matches/${matchId}/messages`, { text: t }); await load(); } catch (ex) { toast.error(formatApiError(ex.response?.data?.detail)); }
  };

  const proposePlan = async (activity_id, when) => {
    try {
      await api.post(`/matches/${matchId}/propose-plan`, { activity_id, when });
      setPlanModal(false);
      await load();
      toast.success("Plan propuesto ✨");
    } catch (ex) { toast.error(formatApiError(ex.response?.data?.detail)); }
  };

  const acceptPlan = async (plan_id) => {
    try { await api.post(`/plans/${plan_id}/accept`); toast.success("¡Plan confirmado! 🎉"); await load(); } catch (ex) { toast.error(formatApiError(ex.response?.data?.detail)); }
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
        <Avatar user={match.other} size={40}/>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold">{match.other?.alias}</p>
          <p className="text-xs text-white/50">{match.mode}</p>
        </div>
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

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-2 pb-nav">
        {messages.map((m) => {
          if (m.kind === "system") return (
            <div key={m.id} className="text-center text-xs text-white/50 py-1">{m.text}</div>
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
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${mine ? "ps-gradient text-white" : "bg-white/5 border border-white/10"}`}>
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
            <button type="button" data-testid="propose-plan-btn" onClick={()=>setPlanModal(true)} className="p-3 rounded-full bg-white/5 hover:bg-white/10"><Calendar size={18}/></button>
            <input data-testid="chat-input" value={text} onChange={(e)=>setText(e.target.value)} placeholder="Mensaje…" className="flex-1 bg-transparent outline-none px-2 py-2 text-sm"/>
            <button data-testid="chat-send" disabled={!text.trim()} className="p-3 rounded-full ps-gradient disabled:opacity-40"><Send size={16}/></button>
          </div>
        </div>
      </form>

      {planModal && <PlanModal activities={activities} onClose={()=>setPlanModal(false)} onSubmit={proposePlan}/>}
      {reportModal && <ReportModal targetId={match.other.id} onClose={()=>setReportModal(false)}/>}
    </div>
  );
}

function PlanModal({ activities, onClose, onSubmit }) {
  const [act, setAct] = useState("");
  const [when, setWhen] = useState("");
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="ps-card w-full max-w-md p-6">
        <h2 className="font-display text-2xl font-black">Proponer plan</h2>
        <div className="mt-4 space-y-3">
          <select data-testid="propose-activity" className="ps-input" value={act} onChange={(e)=>setAct(e.target.value)}>
            <option value="">Elige actividad…</option>
            {activities.map((a) => <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>)}
          </select>
          <input data-testid="propose-when" type="datetime-local" className="ps-input" value={when} onChange={(e)=>setWhen(e.target.value)} min={new Date().toISOString().slice(0,16)}/>
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
            <button key={c} data-testid={`report-cat-${c}`} onClick={()=>setCat(c)} className={`w-full text-left px-4 py-3 rounded-2xl border ${cat===c ? "ps-gradient border-transparent" : "bg-white/5 border-white/10"}`}>{c}</button>
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
