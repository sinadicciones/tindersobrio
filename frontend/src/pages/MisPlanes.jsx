import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { CalendarHeart, CalendarDays, CheckCircle2, Users as UsersIcon, MapPin, ExternalLink, Video } from "lucide-react";
import Avatar from "@/components/Avatar";
import { Icon, iconForActivity } from "@/lib/icons";

export default function MisPlanes() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get("/plans").then((r) => setPlans(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const now = new Date();
  const upcoming = plans.filter((p) => new Date(p.when) >= now);
  const past = plans.filter((p) => new Date(p.when) < now);

  const cancelRsvp = async (eventId) => {
    if (!window.confirm("¿Ya no vas a este evento? Se liberará tu cupo.")) return;
    try {
      await api.delete(`/events/${eventId}/rsvp`);
      toast.success("Cancelaste tu asistencia");
      load();
    } catch {
      toast.error("No se pudo cancelar");
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 pt-6 pb-24">
      <h1 className="font-display text-[20px] font-black">Mis planes</h1>
      <p className="text-[#C7CBD6] text-sm mt-1">Panoramas confirmados y eventos donde vas.</p>

      <section className="mt-5">
        <p className="ps-lab"><CalendarDays size={12} strokeWidth={1.9}/> Próximos</p>
        {!loading && upcoming.length === 0 && (
          <div className="ps-card p-6 text-center">
            <CalendarHeart size={30} strokeWidth={1.6} className="mx-auto text-[#8E93A3]"/>
            <p className="mt-3 text-[#C7CBD6] text-sm">Aún no hay planes agendados.</p>
            <p className="mt-1 text-[11px] text-[#8E93A3]">Cuando confirmes uno con tu match o te unas a un evento, aparecerá aquí.</p>
          </div>
        )}
        <div className="space-y-3">
          {upcoming.map((p) => (
            p.kind === "group_event"
              ? <EventPlanCard key={`e-${p.id}`} p={p} onCancel={cancelRsvp}/>
              : <PlanCard key={`m-${p.id}`} p={p}/>
          ))}
        </div>
      </section>

      {past.length > 0 && (
        <section className="mt-6">
          <p className="ps-lab"><CalendarDays size={12} strokeWidth={1.9}/> Pasados</p>
          <div className="space-y-3 opacity-70">
            {past.map((p) => (
              p.kind === "group_event"
                ? <EventPlanCard key={`e-${p.id}`} p={p} past/>
                : <PlanCard key={`m-${p.id}`} p={p}/>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PlanCard({ p }) {
  const iconName = iconForActivity(p.activity);
  return (
    <div data-testid={`plan-${p.id}`} className="ps-card p-4">
      <div className="flex items-center gap-3">
        <span className="ps-icn"><Icon name={iconName} size={20}/></span>
        <div className="flex-1 min-w-0">
          <p className="font-display font-black text-[15px] leading-tight text-white">{p.activity?.name}</p>
          {p.with && <p className="text-[12px] text-[#C7CBD6] mt-0.5">con <span className="text-white font-semibold">{p.with.alias}</span></p>}
        </div>
        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-1 rounded-full whitespace-nowrap" style={{ color: "#4ADE80", background: "rgba(74,222,128,.14)", border: "1px solid rgba(74,222,128,.42)" }}>
          <CheckCircle2 size={11} strokeWidth={1.9}/> Confirmado
        </span>
      </div>
      <p className="mt-3 text-[12px] text-[#C7CBD6] inline-flex items-center gap-1.5">
        <CalendarDays size={13} strokeWidth={1.9}/>
        {new Date(p.when).toLocaleString("es-CL", { dateStyle: "long", timeStyle: "short" })}
      </p>
      {p.with && (
        <div className="mt-3 pt-3 border-t border-white/[.09] flex items-center gap-2">
          <Avatar user={p.with} size={30}/>
          <span className="text-[12px] text-[#C7CBD6]">con <span className="text-white font-semibold">{p.with.alias}</span></span>
        </div>
      )}
    </div>
  );
}

function EventPlanCard({ p, onCancel, past }) {
  const ev = p.event || {};
  const g = p.group;
  const cap = ev.capacity && ev.capacity < 999 ? ev.capacity : null;
  return (
    <div data-testid={`event-plan-${ev.id}`} className="ps-card p-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl leading-none">{ev.emoji || "📅"}</span>
        <div className="flex-1 min-w-0">
          <p className="font-display font-black text-[15px] leading-tight text-white truncate">{ev.title}</p>
          {g && (
            <Link to={`/app/grupos/${g.id}`} data-testid={`event-plan-group-link-${ev.id}`} className="text-[12px] text-[#C7CBD6] mt-0.5 inline-flex items-center gap-1 hover:text-white">
              <span>{g.emoji}</span> <span className="underline underline-offset-2">{g.name}</span>
            </Link>
          )}
        </div>
        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-1 rounded-full whitespace-nowrap" style={{ color: "#7C6CFF", background: "rgba(124,108,255,.14)", border: "1px solid rgba(124,108,255,.42)" }}>
          <UsersIcon size={11} strokeWidth={1.9}/> Grupo
        </span>
      </div>

      <p className="mt-3 text-[12px] text-[#C7CBD6] inline-flex items-center gap-1.5">
        <CalendarDays size={13} strokeWidth={1.9}/>
        {new Date(p.when).toLocaleString("es-CL", { dateStyle: "long", timeStyle: "short" })}
      </p>

      {(ev.address || ev.location) && (
        <p className="mt-1.5 text-[12px] text-[#C7CBD6] inline-flex items-start gap-1.5">
          <MapPin size={13} strokeWidth={1.9} className="mt-0.5 shrink-0"/>
          <span className="min-w-0">
            {ev.address || ev.location}
            {ev.map_link && (
              <a
                href={ev.map_link}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`event-plan-map-${ev.id}`}
                className="ml-1.5 inline-flex items-center gap-0.5 text-[#4ADE80] hover:underline"
              >
                <ExternalLink size={11} strokeWidth={2}/> Maps
              </a>
            )}
          </span>
        </p>
      )}

      <div className="mt-3 pt-3 border-t border-white/[.09] flex items-center justify-between gap-2 flex-wrap">
        <span data-testid={`event-plan-attendees-${ev.id}`} className="text-[12px] text-[#C7CBD6] inline-flex items-center gap-1.5">
          <UsersIcon size={13} strokeWidth={1.9}/>
          <span className="text-white font-semibold">{ev.attendee_count || 0}</span>
          {cap ? <span>de {cap} van</span> : <span>{(ev.attendee_count || 0) === 1 ? "persona va" : "personas van"}</span>}
        </span>
        <div className="flex items-center gap-2">
          {ev.is_online && ev.meeting_url && !past && (
            <MeetingButton eid={ev.id}/>
          )}
          {!past && onCancel && (
            <button
              data-testid={`event-plan-cancel-${ev.id}`}
              onClick={() => onCancel(ev.id)}
              className="text-[11px] font-bold px-3 py-1.5 rounded-full text-red-300 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition"
            >
              Ya no voy
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// MeetingButton — encapsula la lógica de "unirse a la reunión" con gate de 15 min.
function MeetingButton({ eid }) {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const { data } = await api.get(`/events/${eid}/meeting-status`);
        if (alive) setStatus(data);
      } catch { /* ignore */ }
    };
    check();
    const t = setInterval(check, 60000);
    return () => { alive = false; clearInterval(t); };
  }, [eid]);
  const join = async () => {
    try {
      const { data } = await api.post(`/events/${eid}/join-meeting`);
      window.open(data.meeting_url, "_blank", "noopener,noreferrer");
    } catch (ex) {
      toast.error(formatApiError(ex.response?.data?.detail));
    }
  };
  if (!status) return null;
  if (status.can_join) {
    return (
      <button
        data-testid={`plan-join-meeting-${eid}`}
        onClick={join}
        className="text-[11px] font-bold px-3 py-1.5 rounded-full text-[#4ADE80] bg-[#4ADE80]/15 border border-[#4ADE80]/40 hover:bg-[#4ADE80]/25 transition inline-flex items-center gap-1.5"
      >
        <Video size={12} strokeWidth={2.4}/> Unirse
      </button>
    );
  }
  return (
    <span className="text-[10px] text-white/50 italic" data-testid={`plan-too-early-${eid}`}>
      Enlace activo 15 min antes
    </span>
  );
}
