import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Users, Calendar, MapPin, LogOut } from "lucide-react";

export default function GroupDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [group, setGroup] = useState(null);
  const [events, setEvents] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [tab, setTab] = useState("info");

  const load = async () => {
    try {
      const { data } = await api.get(`/groups/${id}`);
      setGroup(data);
      const ev = await api.get(`/groups/${id}/events`);
      setEvents(ev.data);
      if (data.is_member) {
        const m = await api.get(`/groups/${id}/messages`);
        setMessages(m.data);
      }
    } catch (ex) { toast.error(formatApiError(ex.response?.data?.detail)); }
  };
  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!group?.is_member || tab !== "chat") return;
    const t = setInterval(async () => {
      try { const m = await api.get(`/groups/${id}/messages`); setMessages(m.data); } catch { /* polling ignore */ }
    }, 4000);
    return () => clearInterval(t);
  }, [group?.is_member, tab, id]);

  const join = async () => { await api.post(`/groups/${id}/join`); await load(); toast.success("¡Te uniste!"); };
  const leave = async () => { if (!confirm("¿Salir del grupo?")) return; await api.post(`/groups/${id}/leave`); await load(); };

  const rsvp = async (eid, going) => {
    try {
      if (going) await api.delete(`/events/${eid}/rsvp`);
      else await api.post(`/events/${eid}/rsvp`);
      await load();
    } catch (ex) { toast.error(formatApiError(ex.response?.data?.detail)); }
  };

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const t = text; setText("");
    await api.post(`/groups/${id}/messages`, { text: t });
    const m = await api.get(`/groups/${id}/messages`); setMessages(m.data);
  };

  if (!group) return <div className="p-6 text-white/60">Cargando…</div>;

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <button onClick={()=>nav(-1)} data-testid="back-btn" className="flex items-center gap-1 text-white/70 mb-4"><ArrowLeft size={18}/> Volver</button>
      <div className="ps-card p-5">
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: "rgba(139,92,246,0.15)" }}>{group.emoji}</div>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-black">{group.name}</h1>
            <p className="text-sm text-white/60 mt-1 flex items-center gap-2"><Users size={14}/> {group.member_count} · {group.is_online ? "🌐 Online" : `📍 ${group.comuna || ""}`}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-white/80">{group.description}</p>
        <div className="mt-3 ps-card p-3 bg-white/5">
          <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Reglas</p>
          <p className="text-sm">{group.rules}</p>
        </div>
        <div className="mt-4 flex gap-2">
          {group.is_member ? (
            <button data-testid="leave-group" onClick={leave} className="ps-btn-secondary flex items-center gap-2"><LogOut size={16}/> Salir</button>
          ) : (
            <button data-testid="join-group" onClick={join} className="ps-btn-primary w-full">Unirme al grupo</button>
          )}
        </div>
      </div>

      {group.is_member && (
        <div className="mt-4 grid grid-cols-3 gap-1 bg-white/5 rounded-full p-1">
          <button onClick={()=>setTab("info")} className={`py-2 rounded-full text-sm font-semibold ${tab==="info" ? "ps-gradient" : "text-white/70"}`}>Info</button>
          <button data-testid="tab-events" onClick={()=>setTab("events")} className={`py-2 rounded-full text-sm font-semibold ${tab==="events" ? "ps-gradient" : "text-white/70"}`}>Eventos</button>
          <button data-testid="tab-chat" onClick={()=>setTab("chat")} className={`py-2 rounded-full text-sm font-semibold ${tab==="chat" ? "ps-gradient" : "text-white/70"}`}>Chat</button>
        </div>
      )}

      {(tab === "events" || !group.is_member) && (
        <div className="mt-4 space-y-3">
          <h2 className="font-display text-xl font-bold flex items-center gap-2"><Calendar size={18}/> Eventos</h2>
          {events.length === 0 && <p className="text-white/60 text-sm">Aún no hay eventos.</p>}
          {events.map((e) => (
            <div key={e.id} className="ps-card p-4">
              <p className="font-display font-bold">{e.title}</p>
              <p className="text-xs text-white/50 mt-1">{new Date(e.when).toLocaleString("es-CL", { dateStyle: "long", timeStyle: "short" })}</p>
              <p className="text-sm text-white/80 mt-2">{e.description}</p>
              <p className="text-xs text-white/60 mt-2 flex items-center gap-1"><MapPin size={12}/> {e.location} {e.map_link && <a href={e.map_link} target="_blank" rel="noreferrer" className="underline ml-1">Mapa</a>}</p>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-white/50">{e.attendee_count}/{e.capacity} · {e.attendees?.slice(0,3).join(", ")}{e.attendees?.length>3?"…":""}</p>
                {group.is_member && (
                  <button data-testid={`rsvp-${e.id}`} onClick={()=>rsvp(e.id, e.going)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold ${e.going ? "bg-[#4ADE80]/20 text-[#4ADE80] border border-[#4ADE80]/40" : "ps-gradient"}`}>
                    {e.going ? "Voy ✓" : "Voy"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "chat" && group.is_member && (
        <div className="mt-4">
          <div className="ps-card p-3 h-[50vh] overflow-y-auto space-y-2">
            {messages.length === 0 && <p className="text-white/40 text-sm text-center py-8">Sé la primera persona en escribir 👋</p>}
            {messages.map((m) => (
              <div key={m.id} className="text-sm">
                <span className="font-semibold text-white/70">{m.alias}: </span><span>{m.text}</span>
              </div>
            ))}
          </div>
          <form onSubmit={send} className="mt-2 flex gap-2">
            <input data-testid="group-chat-input" value={text} onChange={(e)=>setText(e.target.value)} className="ps-input flex-1" placeholder="Escribe…"/>
            <button data-testid="group-chat-send" className="ps-btn-primary px-5">Enviar</button>
          </form>
        </div>
      )}
    </div>
  );
}
