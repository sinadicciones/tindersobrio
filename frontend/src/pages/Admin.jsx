import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { LogOut, Users, Flag, Activity, Home, MapPin, BarChart3, Mail } from "lucide-react";
import Metrics from "@/pages/admin/Metrics";
import EmailsAdmin from "@/pages/admin/EmailsAdmin";

const TABS = [
  { v: "metricas", l: "Métricas", icon: BarChart3 },
  { v: "dashboard", l: "Dashboard", icon: Home },
  { v: "reportes", l: "Reportes", icon: Flag },
  { v: "usuarios", l: "Usuarios", icon: Users },
  { v: "actividades", l: "Actividades", icon: Activity },
  { v: "grupos", l: "Grupos", icon: MapPin },
  { v: "emails", l: "Emails", icon: Mail },
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
            <h1 className="font-display text-3xl font-black">PlanSobrio · Admin</h1>
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
  useEffect(() => { api.get("/admin/dashboard").then((r)=>setD(r.data)); }, []);
  if (!d) return <p className="text-white/50">Cargando…</p>;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Stat label="Usuarios" value={d.total_users}/>
      <Stat label="Nuevos (7d)" value={d.new_this_week} color="#4ADE80"/>
      <Stat label="Matches" value={d.matches} color="#FF6B5E"/>
      <Stat label="Reportes abiertos" value={d.open_reports} color="#FBBF24"/>
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
  const [f, setF] = useState({ emoji:"", name:"", description:"", rules:"", is_online:false, comuna:"" });
  const load = () => api.get("/groups").then((r)=>setGs(r.data));
  useEffect(() => { load(); }, []);
  const create = async () => { await api.post("/admin/groups", f); setF({emoji:"",name:"",description:"",rules:"",is_online:false,comuna:""}); await load(); };
  const del = async (id) => { if(!confirm("¿Eliminar?")) return; await api.delete(`/admin/groups/${id}`); await load(); };
  return (
    <div className="space-y-3">
      <div className="ps-card p-4 space-y-2">
        <div className="flex gap-2">
          <input placeholder="Emoji" className="ps-input w-20" value={f.emoji} onChange={(e)=>setF({...f, emoji:e.target.value})}/>
          <input placeholder="Nombre" className="ps-input flex-1" value={f.name} onChange={(e)=>setF({...f, name:e.target.value})}/>
        </div>
        <textarea placeholder="Descripción" className="ps-input" value={f.description} onChange={(e)=>setF({...f, description:e.target.value})}/>
        <textarea placeholder="Reglas" className="ps-input" value={f.rules} onChange={(e)=>setF({...f, rules:e.target.value})}/>
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_online} onChange={(e)=>setF({...f, is_online:e.target.checked})}/> Online</label>
          <input placeholder="Comuna" className="ps-input flex-1" value={f.comuna} onChange={(e)=>setF({...f, comuna:e.target.value})}/>
        </div>
        <button onClick={create} className="ps-btn-primary">Crear grupo</button>
      </div>
      {gs.map((g) => (
        <div key={g.id} className="ps-card p-3 flex items-center gap-2">
          <span className="text-2xl">{g.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold">{g.name}</p>
            <p className="text-xs text-white/60">{g.member_count} miembros · {g.is_online ? "Online" : g.comuna}</p>
          </div>
          <button onClick={()=>del(g.id)} className="text-xs text-red-300">Eliminar</button>
        </div>
      ))}
    </div>
  );
}
