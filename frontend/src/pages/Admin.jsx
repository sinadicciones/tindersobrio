import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { LogOut, Users, Flag, Activity, Home, MapPin, BarChart3, Mail, Plus, BookOpen } from "lucide-react";
import Metrics from "@/pages/admin/Metrics";
import EmailsAdmin from "@/pages/admin/EmailsAdmin";
import BlogAdmin from "@/pages/admin/BlogAdmin";
import EmojiPicker from "@/components/EmojiPicker";

const TABS = [
  { v: "metricas", l: "Métricas", icon: BarChart3 },
  { v: "dashboard", l: "Dashboard", icon: Home },
  { v: "reportes", l: "Reportes", icon: Flag },
  { v: "usuarios", l: "Usuarios", icon: Users },
  { v: "actividades", l: "Actividades", icon: Activity },
  { v: "grupos", l: "Grupos", icon: MapPin },
  { v: "emails", l: "Emails", icon: Mail },
  { v: "blog", l: "Blog", icon: BookOpen },
];

export default function Admin() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("metricas");

  if (!user || user.role !== "admin") return <div className="p-6">Solo administradores.</div>;

  return (
    <div className="min-h-screen bg-[#0E0F13] text-white">
      <div className="mx-auto max-w-4xl px-4 pt-8 pb-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-black inline-flex items-center gap-2">
              PlanSobrio · Admin
              <span
                data-testid="admin-beta-badge"
                className="inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider align-middle"
                style={{ borderColor: "#4ADE80", color: "#4ADE80" }}
              >
                Beta
              </span>
            </h1>
            <p className="text-white/60 text-sm">Hola {user.alias}</p>
          </div>
          <div className="flex gap-2">
            <Link to="/app/descubrir" className="ps-btn-secondary text-sm">Ir a la app</Link>
            <button onClick={async ()=>{await logout(); nav("/");}} className="ps-btn-secondary flex items-center gap-1 text-sm"><LogOut size={14}/> Salir</button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto mb-6 pb-1">
          {TABS.map((t) => (
            <button key={t.v} data-testid={`admin-tab-${t.v}`} onClick={()=>setTab(t.v)}
              className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 flex-shrink-0 ${tab===t.v ? "ps-gradient" : "bg-white/5 border border-white/10 text-white/70"}`}>
              <t.icon size={14}/> {t.l}
            </button>
          ))}
        </div>

        {tab === "metricas" && <Metrics/>}
        {tab === "dashboard" && <Dashboard/>}
        {tab === "reportes" && <Reports/>}
        {tab === "usuarios" && <Users2/>}
        {tab === "actividades" && <Activities/>}
        {tab === "grupos" && <GroupsAdmin/>}
        {tab === "emails" && <EmailsAdmin/>}
        {tab === "blog" && <BlogAdmin/>}
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="ps-card p-5">
      <p className="text-xs uppercase tracking-wider text-white/50">{label}</p>
      <p className="font-display text-4xl font-black mt-1" style={{ color: color || "#fff" }}>{value}</p>
    </div>
  );
}

function Dashboard() {
  const [d, setD] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  useEffect(() => { api.get("/admin/dashboard").then((r)=>setD(r.data)); }, []);

  const doReset = async () => {
    if (confirmText !== "RESETEAR") { toast.error("Debes escribir RESETEAR"); return; }
    setResetting(true);
    try {
      const r = await api.post("/admin/reset-beta", { confirmation: "RESETEAR" });
      const total = Object.values(r.data.counts || {}).reduce((a, b) => a + b, 0);
      toast.success(`Reseteo completo · ${total} documentos eliminados. Admins preservados: ${r.data.admins_preserved}`);
      setConfirmOpen(false);
      setConfirmText("");
      // Reload dashboard counts
      api.get("/admin/dashboard").then((res)=>setD(res.data));
    } catch (ex) {
      toast.error(formatApiError(ex.response?.data?.detail) || "No se pudo resetear");
    } finally { setResetting(false); }
  };

  if (!d) return <p className="text-white/50">Cargando…</p>;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Usuarios" value={d.total_users}/>
        <Stat label="Nuevos (7d)" value={d.new_this_week} color="#4ADE80"/>
        <Stat label="Matches" value={d.matches} color="#FF6B5E"/>
        <Stat label="Reportes abiertos" value={d.open_reports} color="#FBBF24"/>
      </div>

      <div data-testid="danger-zone" className="ps-card p-5" style={{ borderColor: "rgba(255,107,94,0.5)", borderStyle: "solid", borderWidth: 1, background: "rgba(255,107,94,0.05)" }}>
        <p className="ps-lab" style={{ color: "#FF6B5E" }}>Zona peligrosa · sólo para lanzar la beta</p>
        <p className="mt-2 text-sm text-white/70">
          Borra <strong>TODOS</strong> los usuarios no-admin, junto con sus likes, matches, chats, planes, reportes, fotos y preferencias.
          También apaga la re-siembra automática de los 12 perfiles demo — la base queda limpia para siempre después.
          <br />
          Se conservan: admins, grupos, eventos, actividades, países, líneas de ayuda, destinatarios de emails internos e histórico de métricas.
        </p>
        {!confirmOpen ? (
          <button
            data-testid="reset-beta-open"
            onClick={() => setConfirmOpen(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold text-white"
            style={{ background: "#FF6B5E" }}
          >
            Resetear beta (borrar todos los usuarios)
          </button>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-white/85 font-semibold">Para confirmar, escribe <span style={{ color: "#FF6B5E" }}>RESETEAR</span>:</p>
            <input
              data-testid="reset-beta-confirm-input"
              className="ps-input"
              placeholder="RESETEAR"
              value={confirmText}
              onChange={(e)=>setConfirmText(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                data-testid="reset-beta-execute"
                onClick={doReset}
                disabled={resetting || confirmText !== "RESETEAR"}
                className="px-4 py-2 rounded-2xl text-sm font-bold text-white disabled:opacity-40"
                style={{ background: "#FF6B5E" }}
              >
                {resetting ? "Reseteando…" : "Confirmar y borrar todo"}
              </button>
              <button
                data-testid="reset-beta-cancel"
                onClick={() => { setConfirmOpen(false); setConfirmText(""); }}
                className="ps-btn-secondary text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Reports() {
  const [rs, setRs] = useState([]);
  const load = () => api.get("/admin/reports").then((r)=>setRs(r.data));
  useEffect(() => { load(); }, []);
  const act = async (target_user_id, action) => {
    try { await api.post("/admin/users/action", { target_user_id, action, note: "" }); toast.success("Acción aplicada"); await load(); }
    catch (ex) { toast.error(formatApiError(ex.response?.data?.detail)); }
  };
  const resolve = async (id) => { await api.post(`/admin/reports/${id}/resolve`); await load(); };
  return (
    <div className="space-y-3">
      {rs.length === 0 && <p className="text-white/50">Sin reportes.</p>}
      {rs.map((r) => (
        <div key={r.id} className={`ps-card p-4 ${r.priority === "high" && r.status === "open" ? "border-2 border-[#FF6B5E]/60 bg-[#FF6B5E]/5" : ""}`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-bold flex items-center gap-2">
                {r.priority === "high" && r.status === "open" && <span data-testid={`priority-high-${r.id}`} className="ps-chip text-xs" style={{ background: "rgba(255,107,94,0.2)", color: "#FF6B5E", borderColor: "rgba(255,107,94,0.5)" }}>🚨 Alta prioridad</span>}
                {r.category === "ofrece_sustancias" ? "Ofrece alcohol o drogas"
                  : r.category === "acoso" ? "Acoso o presión"
                  : r.category === "perfil_falso" ? "Perfil falso"
                  : r.category === "mala_conducta_cita" ? "Mala conducta en una cita"
                  : r.category === "otro" ? "Otro" : r.category}
              </p>
              <p className="text-xs text-white/60">De <span className="text-white">{r.from_alias || "?"}</span> · Sobre <span className="text-white">{r.target_alias || r.target_email}</span></p>
            </div>
            <span className={`ps-chip ${r.status === "open" ? "text-[#FBBF24]" : "text-[#4ADE80]"}`}>{r.status}</span>
          </div>
          {r.details && <p className="text-sm text-white/80 mt-2">{r.details}</p>}
          <div className="flex flex-wrap gap-2 mt-3">
            <button data-testid={`warn-${r.target_user}`} onClick={()=>act(r.target_user, "warn")} className="ps-btn-secondary text-xs px-3 py-1.5">Advertir</button>
            <button onClick={()=>act(r.target_user, "suspend")} className="ps-btn-secondary text-xs px-3 py-1.5">Suspender 7d</button>
            <button onClick={()=>act(r.target_user, "ban")} className="text-xs px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300">Banear</button>
            {r.status === "open" && <button onClick={()=>resolve(r.id)} className="ps-btn-primary text-xs px-3 py-1.5">Marcar resuelto</button>}
          </div>
        </div>
      ))}
    </div>
  );
}

function Users2() {
  const [q, setQ] = useState("");
  const [us, setUs] = useState([]);
  const [cleaning, setCleaning] = useState(false);
  const load = () => api.get("/admin/users", { params: { q } }).then((r)=>setUs(r.data));
  useEffect(() => { load(); }, []);
  const act = async (id, action) => { await api.post("/admin/users/action", { target_user_id: id, action, note: "" }); await load(); toast.success("Aplicado"); };
  const cleanup = async () => {
    if (!confirm("¿Eliminar todos los usuarios cuyo email empiece por 'test_' o 'TEST_' junto con sus reportes, matches y mensajes? No afecta perfiles demo ni al admin.")) return;
    setCleaning(true);
    try {
      const { data } = await api.post("/admin/cleanup-tests");
      toast.success(`Limpiados ${data.deleted_users} usuarios de prueba`);
      await load();
    } catch (ex) { toast.error(ex.response?.data?.detail || "Error"); }
    finally { setCleaning(false); }
  };
  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <input className="ps-input flex-1 min-w-[200px]" placeholder="Buscar por alias o email" value={q} onChange={(e)=>setQ(e.target.value)}/>
        <button onClick={load} className="ps-btn-primary px-4">Buscar</button>
        <button data-testid="admin-cleanup-tests" disabled={cleaning} onClick={cleanup} className="text-sm px-4 py-2 rounded-full bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500/25 disabled:opacity-50">
          {cleaning ? "Limpiando…" : "Limpiar datos de prueba"}
        </button>
      </div>
      <div className="space-y-2">
        {us.map((u) => (
          <div key={u.id} className="ps-card p-3 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="font-bold">{u.alias || "(sin alias)"} <span className="text-xs text-white/50">{u.email}</span></p>
              <p className="text-xs text-white/60">{u.role} · {u.status} · strikes: {u.strikes} · reportes: {u.report_count} {u.is_demo && "· 🧪 demo"}</p>
            </div>
            <button onClick={()=>act(u.id, "ban")} className="text-xs px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300">Banear</button>
            <button onClick={()=>act(u.id, "reactivate")} className="ps-btn-secondary text-xs px-3 py-1.5">Reactivar</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Activities() {
  const [items, setItems] = useState([]);
  const [f, setF] = useState({ emoji: "", name: "", category: "" });
  const load = () => api.get("/activities").then((r)=>setItems(r.data));
  useEffect(() => { load(); }, []);
  const create = async () => { await api.post("/admin/activities", f); setF({emoji:"",name:"",category:""}); await load(); };
  const del = async (id) => { await api.delete(`/admin/activities/${id}`); await load(); };
  return (
    <div className="space-y-3">
      <div className="ps-card p-4 flex gap-2 flex-wrap">
        <input placeholder="Emoji" className="ps-input w-20" value={f.emoji} onChange={(e)=>setF({...f, emoji: e.target.value})}/>
        <input placeholder="Nombre" className="ps-input flex-1 min-w-[150px]" value={f.name} onChange={(e)=>setF({...f, name: e.target.value})}/>
        <input placeholder="Categoría" className="ps-input w-32" value={f.category} onChange={(e)=>setF({...f, category: e.target.value})}/>
        <button onClick={create} className="ps-btn-primary">Crear</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((a) => (
          <div key={a.id} className="ps-card p-3 flex items-center gap-2">
            <span className="text-xl">{a.emoji}</span>
            <span className="flex-1 text-sm">{a.name}</span>
            <button onClick={()=>del(a.id)} className="text-xs text-red-300">Eliminar</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupsAdmin() {
  const [gs, setGs] = useState([]);
  const [editing, setEditing] = useState(null); // group being edited or null
  const [showForm, setShowForm] = useState(false);
  const [eventsPanelFor, setEventsPanelFor] = useState(null); // group.id showing events panel

  const emptyGroup = { emoji: "", name: "", description: "", rules: "", is_online: false, comuna: "", group_type: "actividad", country: "" };
  const [f, setF] = useState(emptyGroup);

  const load = () => api.get("/groups").then((r)=>setGs(r.data));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setF(emptyGroup); setShowForm(true); };
  const openEdit = (g) => {
    setEditing(g.id);
    setF({
      emoji: g.emoji || "", name: g.name || "", description: g.description || "",
      rules: g.rules || "", is_online: !!g.is_online, comuna: g.comuna || "",
      group_type: g.group_type || "actividad", country: g.country || "",
    });
    setShowForm(true);
  };
  const save = async () => {
    try {
      if (editing) await api.patch(`/admin/groups/${editing}`, f);
      else await api.post("/admin/groups", f);
      setShowForm(false); setEditing(null); setF(emptyGroup);
      await load();
      toast.success(editing ? "Grupo actualizado" : "Grupo creado");
    } catch (ex) { toast.error(formatApiError(ex.response?.data?.detail) || "Error"); }
  };
  const del = async (id) => {
    if (!window.confirm("¿Eliminar este grupo? Se borran también sus mensajes y eventos.")) return;
    await api.delete(`/admin/groups/${id}`);
    await load();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="ps-lab">Grupos ({gs.length})</p>
        <button data-testid="new-group-btn" onClick={openCreate} className="ps-btn-secondary inline-flex items-center gap-1 text-xs"><Plus size={14}/> Nuevo grupo</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={()=>setShowForm(false)}>
          <div className="ps-card w-full max-w-md p-5 space-y-3" onClick={(e)=>e.stopPropagation()}>
            <h3 className="font-display text-lg font-black">{editing ? "Editar grupo" : "Nuevo grupo"}</h3>
            <div className="flex gap-2">
              <EmojiPicker value={f.emoji} onChange={(v)=>setF({...f, emoji: v})} data-testid="group-emoji-picker"/>
              <input data-testid="group-name" placeholder="Nombre del grupo" className="ps-input flex-1" value={f.name} onChange={(e)=>setF({...f, name:e.target.value})}/>
            </div>
            <textarea data-testid="group-description" placeholder="Descripción" className="ps-input" value={f.description} onChange={(e)=>setF({...f, description:e.target.value})}/>
            <textarea data-testid="group-rules" placeholder="Reglas del grupo" className="ps-input" value={f.rules} onChange={(e)=>setF({...f, rules:e.target.value})}/>
            <div className="flex gap-2 items-center">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_online} onChange={(e)=>setF({...f, is_online:e.target.checked})}/> Online</label>
              <input data-testid="group-comuna" placeholder="Comuna" className="ps-input flex-1" value={f.comuna} onChange={(e)=>setF({...f, comuna:e.target.value})}/>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-white/60 mb-1 block">Tipo</label>
                <select data-testid="group-type" className="ps-input" value={f.group_type} onChange={(e)=>setF({...f, group_type:e.target.value})}>
                  <option value="actividad">Actividad</option>
                  <option value="apoyo">Apoyo (círculo)</option>
                  <option value="pais">País (Comunidad)</option>
                  <option value="tematico">Temático</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/60 mb-1 block">País (ISO)</label>
                <input data-testid="group-country" placeholder="CL, AR, MX…" className="ps-input" maxLength={2} value={f.country} onChange={(e)=>setF({...f, country:e.target.value.toUpperCase()})}/>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>setShowForm(false)} className="ps-btn-secondary flex-1">Cancelar</button>
              <button data-testid="save-group" onClick={save} disabled={!f.name} className="ps-btn-primary flex-1">{editing ? "Guardar" : "Crear"}</button>
            </div>
          </div>
        </div>
      )}

      {gs.map((g) => (
        <div key={g.id} data-testid={`group-row-${g.id}`} className="ps-card p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{g.emoji || "🙂"}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold">{g.name}</p>
              <p className="text-xs text-white/60">{g.member_count || 0} miembros · {g.is_online ? "Online" : g.comuna || "sin comuna"}</p>
            </div>
            <button data-testid={`toggle-events-${g.id}`} onClick={()=>setEventsPanelFor(eventsPanelFor === g.id ? null : g.id)} className="text-xs text-white/80 underline">
              {eventsPanelFor === g.id ? "Ocultar eventos" : "Ver eventos"}
            </button>
            <button data-testid={`edit-group-${g.id}`} onClick={()=>openEdit(g)} className="text-xs text-white/80">Editar</button>
            <button data-testid={`delete-group-${g.id}`} onClick={()=>del(g.id)} className="text-xs text-red-300">Eliminar</button>
          </div>
          {eventsPanelFor === g.id && <EventsPanel group={g}/>}
        </div>
      ))}
    </div>
  );
}

function EventsPanel({ group }) {
  const [events, setEvents] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const empty = { emoji: "", title: "", description: "", when: "", location: "", address: "", map_link: "", capacity: 20, is_online: false, meeting_url: "", recurrence: "" };
  const [f, setF] = useState(empty);

  const load = () => api.get(`/groups/${group.id}/events`).then((r)=>setEvents(r.data));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => { setEditing(null); setF({ ...empty, location: group.comuna || (group.is_online ? "Online" : "") }); setShowForm(true); };
  const openEdit = (ev) => {
    setEditing(ev.id);
    // Convert ISO to datetime-local (local time)
    let whenLocal = ev.when || "";
    if (whenLocal) {
      const d = new Date(whenLocal);
      const off = d.getTimezoneOffset() * 60000;
      whenLocal = new Date(d.getTime() - off).toISOString().slice(0, 16);
    }
    setF({ emoji: ev.emoji || "", title: ev.title || "", description: ev.description || "", when: whenLocal,
      location: ev.location || "", address: ev.address || "", map_link: ev.map_link || "", capacity: ev.capacity || 20,
      is_online: !!ev.is_online, meeting_url: ev.meeting_url || "", recurrence: ev.recurrence || "" });
    setShowForm(true);
  };
  const save = async () => {
    try {
      const payload = { ...f, group_id: group.id, when: new Date(f.when).toISOString() };
      if (editing) await api.patch(`/admin/events/${editing}`, payload);
      else await api.post("/admin/events", payload);
      setShowForm(false); setEditing(null); setF(empty);
      await load();
      toast.success(editing ? "Evento actualizado" : "Evento creado");
    } catch (ex) { toast.error(formatApiError(ex.response?.data?.detail) || "Error"); }
  };
  const del = async (id) => { if (!window.confirm("¿Eliminar evento?")) return; await api.delete(`/admin/events/${id}`); await load(); };

  const CAP_PRESETS = [{ v: 10, l: "10" }, { v: 20, l: "20" }, { v: 50, l: "50" }, { v: 9999, l: "Sin límite" }];

  return (
    <div className="mt-2 pt-3 border-t border-white/[.08] space-y-2">
      <div className="flex justify-between items-center">
        <p className="text-[11px] uppercase tracking-wider text-white/50 font-bold">Eventos ({events.length})</p>
        <button data-testid={`new-event-${group.id}`} onClick={openCreate} className="ps-btn-secondary inline-flex items-center gap-1 text-xs"><Plus size={12}/> Nuevo evento</button>
      </div>
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={()=>setShowForm(false)}>
          <div className="ps-card w-full max-w-md p-5 space-y-3 max-h-[90vh] overflow-y-auto" onClick={(e)=>e.stopPropagation()}>
            <h3 className="font-display text-lg font-black">{editing ? "Editar evento" : "Nuevo evento"}</h3>
            <div className="flex gap-2">
              <EmojiPicker value={f.emoji} onChange={(v)=>setF({...f, emoji: v})} data-testid="event-emoji-picker"/>
              <input data-testid="event-title" placeholder="Título del evento" className="ps-input flex-1" value={f.title} onChange={(e)=>setF({...f, title:e.target.value})}/>
            </div>
            <textarea data-testid="event-description" placeholder="Descripción" rows={2} className="ps-input" value={f.description} onChange={(e)=>setF({...f, description:e.target.value})}/>
            <div>
              <label className="text-xs text-white/60 mb-1 block">Cuándo</label>
              <input data-testid="event-when" type="datetime-local" className="ps-input" value={f.when} onChange={(e)=>setF({...f, when: e.target.value})}/>
            </div>
            <div>
              <label className="text-xs text-white/60 mb-1 block">Dirección exacta</label>
              <input data-testid="event-address" placeholder="Ej: Café Wonderland, Providencia 1234" className="ps-input" value={f.address} onChange={(e)=>setF({...f, address:e.target.value})}/>
            </div>
            <div>
              <label className="text-xs text-white/60 mb-1 block">Comuna / zona</label>
              <input data-testid="event-location" placeholder="Comuna" className="ps-input" value={f.location} onChange={(e)=>setF({...f, location:e.target.value})}/>
            </div>
            <div>
              <label className="text-xs text-white/60 mb-1 block">Link Google Maps (opcional)</label>
              <input data-testid="event-map-link" type="url" placeholder="https://maps.google.com/…" className="ps-input" value={f.map_link} onChange={(e)=>setF({...f, map_link:e.target.value})}/>
            </div>
            <div>
              <label className="text-xs text-white/60 mb-1 block">Capacidad</label>
              <div className="flex gap-2">
                {CAP_PRESETS.map((c) => (
                  <button key={c.v} type="button" data-testid={`event-cap-${c.v}`} onClick={()=>setF({...f, capacity: c.v})}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${f.capacity === c.v ? "ps-gradient border-transparent text-white" : "bg-white/5 border-white/[.16] text-[#C7CBD6]"}`}>{c.l}</button>
                ))}
              </div>
            </div>
            <div className="pt-2 border-t border-white/[.08] space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" data-testid="event-is-online" checked={f.is_online} onChange={(e)=>setF({...f, is_online:e.target.checked})}/>
                Reunión online
              </label>
              {f.is_online && (
                <input
                  data-testid="event-meeting-url"
                  type="url"
                  placeholder="https://meet.jit.si/... o Zoom/Meet"
                  className="ps-input"
                  value={f.meeting_url}
                  onChange={(e)=>setF({...f, meeting_url:e.target.value})}
                />
              )}
              <input
                data-testid="event-recurrence"
                type="text"
                placeholder='Recurrencia (ej: "Cada martes 20:00")'
                className="ps-input"
                value={f.recurrence}
                onChange={(e)=>setF({...f, recurrence:e.target.value})}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={()=>setShowForm(false)} className="ps-btn-secondary flex-1">Cancelar</button>
              <button data-testid="save-event" onClick={save} disabled={!f.title || !f.when} className="ps-btn-primary flex-1">{editing ? "Guardar" : "Crear"}</button>
            </div>
          </div>
        </div>
      )}
      {events.length === 0 && <p className="text-xs text-white/50">Sin eventos aún.</p>}
      {events.map((ev) => (
        <div key={ev.id} data-testid={`event-row-${ev.id}`} className="bg-white/[.03] rounded-2xl p-2.5 flex items-center gap-2">
          <span className="text-lg">{ev.emoji || "📅"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{ev.title}</p>
            <p className="text-[11px] text-white/60 truncate">{new Date(ev.when).toLocaleString("es-CL")} · {ev.attendee_count || 0}/{ev.capacity >= 999 ? "∞" : ev.capacity} · {ev.address || ev.location}</p>
          </div>
          <button data-testid={`edit-event-${ev.id}`} onClick={()=>openEdit(ev)} className="text-[11px] text-white/80">Editar</button>
          <button data-testid={`delete-event-${ev.id}`} onClick={()=>del(ev.id)} className="text-[11px] text-red-300">Eliminar</button>
        </div>
      ))}
    </div>
  );
}
