import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api, { formatApiError, fileUrl } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Users, Calendar, MapPin, LogOut, Globe, ShieldAlert, Pin, EyeOff, Video, Clock } from "lucide-react";
import Avatar from "@/components/Avatar";
import { useAuth } from "@/contexts/AuthContext";
import { Icon, emojiToIconName } from "@/lib/icons";

export default function GroupDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
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
    let timer = null;
    const tick = async () => {
      if (document.hidden) { timer = setTimeout(tick, 6000); return; }
      try { const m = await api.get(`/groups/${id}/messages`); setMessages(m.data); } catch { /* polling ignore */ }
      timer = setTimeout(tick, 6000);
    };
    timer = setTimeout(tick, 4000);
    return () => { if (timer) clearTimeout(timer); };
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
    const t = text.trim();
    if (!t) return;
    setText("");
    try {
      await api.post(`/groups/${id}/messages`, { text: t });
      const m = await api.get(`/groups/${id}/messages`);
      setMessages(m.data);
    } catch (ex) {
      // Restore the input so the user doesn't lose their message.
      setText(t);
      toast.error(formatApiError(ex.response?.data?.detail));
    }
  };

  if (!group) return <div className="p-6 text-white/60">Cargando…</div>;

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <button onClick={()=>nav(-1)} data-testid="back-btn" className="flex items-center gap-1 text-white/70 mb-4"><ArrowLeft size={18}/> Volver</button>
      <div className="ps-card p-5">
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-2xl grid place-items-center bg-white/[.09] border border-white/[.16] shrink-0 text-2xl">
            {group.group_type === "pais" && group.emoji ? (
              <span aria-hidden="true">{group.emoji}</span>
            ) : (
              <Icon name={emojiToIconName[group.emoji] || "Users"} size={26} strokeWidth={1.9}/>
            )}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-black">{group.name}</h1>
            <p className="text-sm text-[#C7CBD6] mt-1 inline-flex items-center gap-2">
              <Users size={14} strokeWidth={1.9}/> {group.member_count} ·
              {group.is_online ? (<><Globe size={14} strokeWidth={1.9}/> Online</>) : (<><MapPin size={14} strokeWidth={1.9}/> {group.comuna || ""}</>)}
            </p>
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

      {/* Bloque 2: aviso fijo para grupos de tipo APOYO — no reemplaza terapia */}
      {group.group_type === "apoyo" && (
        <div className="mt-4 rounded-2xl border border-[#38BDF8]/40 bg-[#38BDF8]/10 p-4" data-testid="apoyo-banner">
          <div className="flex items-start gap-3">
            <ShieldAlert size={20} strokeWidth={1.9} className="text-[#38BDF8] shrink-0 mt-0.5"/>
            <div>
              <p className="text-sm text-white font-semibold">Espacio de apoyo entre pares</p>
              <p className="text-xs text-[#C7CBD6] mt-1 leading-relaxed">
                No reemplaza terapia ni tratamiento profesional. Si es una crisis,{" "}
                <Link to="/app/necesito-apoyo" className="underline text-white font-semibold">ve a Necesito Apoyo</Link>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje fijado */}
      {group.is_member && group.pinned_message && (
        <div className="mt-4 rounded-2xl border border-[#FBBF24]/40 bg-[#FBBF24]/10 p-4" data-testid="pinned-message">
          <div className="flex items-start gap-3">
            <Pin size={16} strokeWidth={1.9} className="text-[#FBBF24] shrink-0 mt-0.5"/>
            <div className="flex-1">
              <p className="text-[10px] text-[#FBBF24] font-bold uppercase tracking-wider mb-1">Fijado por moderación</p>
              <p className="text-sm text-white">{group.pinned_message.text}</p>
              <p className="text-[11px] text-white/50 mt-1">— {group.pinned_message.alias}</p>
            </div>
          </div>
        </div>
      )}

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
            <EventCard
              key={e.id}
              e={e}
              gid={id}
              onRsvp={rsvp}
              canRsvp={!!group.is_member}
              isModerator={!!group.is_moderator}
              onDeleted={load}
            />
          ))}
        </div>
      )}

      {tab === "chat" && group.is_member && (
        <div className="mt-4">
          <div data-testid="group-chat-list" className="ps-card p-3 h-[55vh] overflow-y-auto space-y-3">
            {messages.length === 0 && <p className="text-white/40 text-sm text-center py-8">Sé la primera persona en escribir</p>}
            {messages.map((m) => {
              const mine = m.from_user === user?.id;
              const senderPhoto = m.photo ? { photos: [m.photo], alias: m.alias } : { alias: m.alias };
              return (
                <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}>
                  {mine ? (
                    <Avatar user={senderPhoto} size={32}/>
                  ) : (
                    <Link data-testid={`msg-avatar-${m.from_user}`} to={`/app/usuario/${m.from_user}`} className="shrink-0">
                      <Avatar user={senderPhoto} size={32}/>
                    </Link>
                  )}
                  <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                    {!mine && (
                      <Link data-testid={`msg-alias-${m.from_user}`} to={`/app/usuario/${m.from_user}`} className="text-xs text-white/60 hover:text-white/90 mb-1">
                        {m.alias}
                      </Link>
                    )}
                    <div className={`px-4 py-2.5 rounded-2xl text-sm break-words ${mine ? "ps-gradient text-white" : "bg-white/5 border border-white/10"}`}>
                      {m.text}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <form onSubmit={send} className="mt-2 flex gap-2">
            <input data-testid="group-chat-input" value={text} onChange={(e)=>setText(e.target.value)} className="ps-input flex-1" placeholder="Escribe…" maxLength={500}/>
            <button data-testid="group-chat-send" disabled={!text.trim()} className="ps-btn-primary px-5 disabled:opacity-50">Enviar</button>
          </form>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// EventCard — muestra evento con botón "Unirse a la reunión" para eventos
// online (activo solo 15 min antes según meeting-status), acciones de moderador,
// y hora en TZ local del usuario.
// ---------------------------------------------------------------
function EventCard({ e, gid, onRsvp, canRsvp, isModerator, onDeleted }) {
  const [status, setStatus] = useState(null);
  const isOnline = e.is_online && !!e.meeting_url;

  useEffect(() => {
    if (!isOnline || !e.going) { setStatus(null); return; }
    let alive = true;
    const check = async () => {
      try {
        const { data } = await api.get(`/events/${e.id}/meeting-status`);
        if (alive) setStatus(data);
      } catch { /* ignore polling errors */ }
    };
    check();
    // Poll cada 60s para actualizar la ventana de 15 min automáticamente
    const t = setInterval(check, 60000);
    return () => { alive = false; clearInterval(t); };
  }, [e.id, isOnline, e.going]);

  const openMeeting = async () => {
    try {
      const { data } = await api.post(`/events/${e.id}/join-meeting`);
      // Abre la reunión y registra asistencia en el mismo request
      window.open(data.meeting_url, "_blank", "noopener,noreferrer");
    } catch (ex) {
      toast.error(formatApiError(ex.response?.data?.detail));
    }
  };

  const remove = async () => {
    if (!window.confirm("¿Eliminar este evento?")) return;
    try {
      await api.delete(`/groups/${gid}/events/${e.id}`);
      toast.success("Evento eliminado");
      onDeleted?.();
    } catch (ex) {
      toast.error(formatApiError(ex.response?.data?.detail));
    }
  };

  // Hora local (browser TZ) + hint "tu hora"
  const localWhen = (() => {
    try {
      const d = new Date(e.when);
      return d.toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" });
    } catch { return e.when; }
  })();

  const showJoinBtn = isOnline && e.going && status?.can_join;
  const showTooEarly = isOnline && e.going && status && !status.can_join && status.reason === "too_early";

  return (
    <div className="ps-card p-4" data-testid={`event-card-${e.id}`}>
      <div className="flex items-start gap-2">
        <span className="text-2xl leading-none">{e.emoji || (isOnline ? "💻" : "📅")}</span>
        <div className="flex-1">
          <p className="font-display font-bold">{e.title}</p>
          <p className="text-xs text-white/50 mt-1 flex items-center gap-1.5">
            <Clock size={12} strokeWidth={1.9}/> {localWhen}
            <span className="text-white/40">(tu hora)</span>
          </p>
          {e.recurrence && (
            <p className="text-[11px] text-[#8B5CF6] mt-0.5 font-semibold" data-testid={`event-recurrence-${e.id}`}>
              🔁 {e.recurrence}
            </p>
          )}
        </div>
      </div>
      <p className="text-sm text-white/80 mt-2">{e.description}</p>
      <p className="text-xs text-white/60 mt-2 flex items-center gap-1">
        {isOnline ? <Globe size={12}/> : <MapPin size={12}/>}
        {e.location}
        {e.map_link && !isOnline && <a href={e.map_link} target="_blank" rel="noreferrer" className="underline ml-1">Mapa</a>}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-white/50">
          {e.attendee_count}/{e.capacity} · {e.attendees?.slice(0,3).join(", ")}{e.attendees?.length>3?"…":""}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {showJoinBtn && (
            <button
              data-testid={`join-meeting-${e.id}`}
              onClick={openMeeting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold bg-[#4ADE80]/20 text-[#4ADE80] border border-[#4ADE80]/40 hover:bg-[#4ADE80]/30 transition"
            >
              <Video size={14} strokeWidth={2.2}/> Unirse a la reunión
            </button>
          )}
          {showTooEarly && (
            <span className="text-[11px] text-white/60 italic" data-testid={`event-too-early-${e.id}`}>
              El enlace se activa 15 min antes de empezar
            </span>
          )}
          {canRsvp && (
            <button data-testid={`rsvp-${e.id}`} onClick={()=>onRsvp(e.id, e.going)}
              className={`px-4 py-2 rounded-full text-sm font-semibold ${e.going ? "bg-[#4ADE80]/20 text-[#4ADE80] border border-[#4ADE80]/40" : "ps-gradient"}`}>
              {e.going ? "Voy ✓" : "Voy"}
            </button>
          )}
          {isModerator && (
            <button
              data-testid={`event-delete-${e.id}`}
              onClick={remove}
              title="Eliminar evento (moderador)"
              className="inline-flex items-center gap-1 px-2 py-2 rounded-full text-xs bg-white/5 border border-white/10 text-white/60 hover:text-[#FF6B5E] hover:border-[#FF6B5E]/40 transition"
            >
              <EyeOff size={13} strokeWidth={2}/>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
