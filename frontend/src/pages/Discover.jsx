import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError, fileUrl } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { MODES, modeColor, soberLabel, COMUNAS_RM } from "@/constants/comunas";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Sparkles, X, MapPin, Heart, SlidersHorizontal } from "lucide-react";
import Avatar from "@/components/Avatar";

export default function Discover() {
  const { user } = useAuth();
  const nav = useNavigate();
  const userModes = user?.modes || [];
  const swipeModes = MODES.filter((m) => m.v !== "grupos" && userModes.includes(m.v));
  const [mode, setMode] = useState(swipeModes[0]?.v || "amistad");
  const [candidates, setCandidates] = useState([]);
  const [idx, setIdx] = useState(0);
  const [quota, setQuota] = useState({ remaining: 20 });
  const [activities, setActivities] = useState([]);
  const [planModal, setPlanModal] = useState(null); // {profile}
  const [matchModal, setMatchModal] = useState(null); // {other, activity}
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({ age_min: "", age_max: "", comuna: "" });

  useEffect(() => { api.get("/activities").then((r)=>setActivities(r.data)); }, []);

  const load = async (m) => {
    setLoading(true);
    setIdx(0);
    try {
      const params = { mode: m };
      if (filters.age_min) params.age_min = Number(filters.age_min);
      if (filters.age_max) params.age_max = Number(filters.age_max);
      if (filters.comuna) params.comuna = filters.comuna;
      const [{ data: cands }, { data: q }] = await Promise.all([
        api.get(`/discover`, { params }),
        api.get(`/discover/quota`),
      ]);
      setCandidates(cands);
      setQuota(q);
    } catch (ex) {
      toast.error(formatApiError(ex.response?.data?.detail) || ex.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { if (mode) load(mode); /* eslint-disable-next-line */ }, [mode]);

  const applyFilters = () => { setFiltersOpen(false); load(mode); };
  const clearFilters = () => { setFilters({ age_min: "", age_max: "", comuna: "" }); setFiltersOpen(false); setTimeout(() => load(mode), 50); };
  const activeFilterCount = (filters.age_min ? 1 : 0) + (filters.age_max ? 1 : 0) + (filters.comuna ? 1 : 0);

  const current = candidates[idx];

  const pass = async () => {
    if (!current) return;
    try { await api.post("/pass", { target_user_id: current.id, mode }); } catch (_e) { /* ignore */ }
    setIdx((i) => i + 1);
  };

  const openLike = () => { if (current) setPlanModal({ profile: current }); };

  const sendLike = async (activity_id, no_plan) => {
    if (!current) return;
    try {
      const { data } = await api.post("/like", { target_user_id: current.id, mode, activity_id: activity_id || null, no_plan });
      setPlanModal(null);
      setQuota((q) => ({ ...q, remaining: Math.max(0, q.remaining - 1) }));
      if (data.match) {
        setMatchModal({ other: data.other, activity: data.proposed_activity, match_id: data.match_id });
      }
      setIdx((i) => i + 1);
    } catch (ex) {
      toast.error(formatApiError(ex.response?.data?.detail) || ex.message);
      setPlanModal(null);
    }
  };

  // Suggested activities: user's favs intersected with candidate's favs
  const suggestedActivities = () => {
    if (!current || !user) return activities.slice(0, 3);
    const mine = new Set(user.favorite_activities || []);
    const theirs = new Set(current.favorite_activities || []);
    const common = activities.filter((a) => mine.has(a.id) && theirs.has(a.id));
    if (common.length >= 3) return common.slice(0, 3);
    const rest = activities.filter((a) => !common.find((c) => c.id === a.id));
    return [...common, ...rest].slice(0, 3);
  };

  if (!swipeModes.length) {
    return (
      <div className="mx-auto max-w-md px-6 pt-12">
        <h1 className="font-display text-3xl font-black">Activa un modo</h1>
        <p className="mt-3 text-white/60">En tu perfil, activa Apoyo, Amistad o Amor para empezar a descubrir gente.</p>
        <button onClick={()=>nav("/app/perfil/editar")} className="ps-btn-primary mt-6">Editar perfil</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      {/* Mode selector */}
      <div className="flex items-center justify-between mb-4 px-2">
        <h1 className="font-display text-2xl font-black">Descubrir</h1>
        <span data-testid="quota-remaining" className="text-xs text-white/50">{quota.remaining}/20 me tinca</span>
      </div>
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 items-center">
        {swipeModes.map((m) => (
          <button key={m.v} data-testid={`mode-${m.v}`} onClick={()=>setMode(m.v)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition flex-shrink-0 ${mode===m.v ? "border-transparent text-white" : "bg-white/5 border-white/10 text-white/70"}`}
            style={mode===m.v ? { background: `linear-gradient(135deg, ${m.color}, ${m.color}dd)` } : {}}>
            {m.emoji} {m.l}
          </button>
        ))}
        <button data-testid="open-filters" onClick={()=>setFiltersOpen(true)}
          className={`ml-auto flex-shrink-0 relative flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold border transition ${activeFilterCount>0 ? "border-transparent ps-gradient text-white" : "bg-white/5 border-white/10 text-white/70"}`}>
          <SlidersHorizontal size={14}/> Filtros
          {activeFilterCount > 0 && <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white/25 text-white text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>}
        </button>
      </div>

      {/* Filters modal */}
      <AnimatePresence>
        {filtersOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="ps-card w-full max-w-md p-6 relative">
              <button onClick={()=>setFiltersOpen(false)} className="absolute top-4 right-4 text-white/50"><X size={20}/></button>
              <h2 className="font-display text-2xl font-black">Filtros</h2>
              <p className="text-sm text-white/60 mt-1">Afina tu búsqueda.</p>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Rango de edad</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input data-testid="filter-age-min" type="number" min={18} max={99} placeholder="Desde" className="ps-input"
                      value={filters.age_min} onChange={(e)=>setFilters({...filters, age_min: e.target.value})}/>
                    <input data-testid="filter-age-max" type="number" min={18} max={99} placeholder="Hasta" className="ps-input"
                      value={filters.age_max} onChange={(e)=>setFilters({...filters, age_max: e.target.value})}/>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Comuna</label>
                  <select data-testid="filter-comuna" className="ps-input" value={filters.comuna} onChange={(e)=>setFilters({...filters, comuna: e.target.value})}>
                    <option value="">Cualquiera</option>
                    {COMUNAS_RM.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-6 flex gap-2">
                <button data-testid="filters-clear" onClick={clearFilters} className="ps-btn-secondary flex-1">Limpiar</button>
                <button data-testid="filters-apply" onClick={applyFilters} className="ps-btn-primary flex-1">Aplicar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="ps-card h-[65vh] flex items-center justify-center"><div className="w-10 h-10 rounded-full border-4 border-white/10 border-t-[#FF6B5E] animate-spin"/></div>
      ) : !current ? (
        <div className="ps-card p-8 text-center">
          <div className="text-6xl mb-3">🌱</div>
          <p className="font-display text-xl font-bold">Por ahora no hay más personas en tu zona.</p>
          <p className="mt-2 text-white/60 text-sm">La comunidad está creciendo. Mientras tanto, mira los grupos y eventos.</p>
          <button onClick={()=>nav("/app/grupos")} className="ps-btn-primary mt-6">Ver grupos</button>
        </div>
      ) : (
        <ProfileCard profile={current} mode={mode} onPass={pass} onLike={openLike} />
      )}

      {/* Plan Modal */}
      <AnimatePresence>
        {planModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="ps-card w-full max-w-md p-6 relative">
              <button onClick={()=>setPlanModal(null)} className="absolute top-4 right-4 text-white/50"><X size={20}/></button>
              <h2 className="font-display text-2xl font-black">¿Qué plan harías con {planModal.profile.alias}?</h2>
              <p className="mt-2 text-white/60 text-sm">Elige una actividad para proponerle o deja que ella/él/elle proponga.</p>
              <div className="mt-4 space-y-2">
                {suggestedActivities().map((a) => (
                  <button key={a.id} data-testid={`suggest-${a.id}`} onClick={()=>sendLike(a.id, false)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-left transition">
                    <span className="text-2xl">{a.emoji}</span>
                    <span className="font-semibold">{a.name}</span>
                  </button>
                ))}
                <details className="w-full">
                  <summary className="cursor-pointer px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-semibold">Otro plan…</summary>
                  <div className="mt-2 max-h-56 overflow-y-auto space-y-1">
                    {activities.map((a) => (
                      <button key={a.id} onClick={()=>sendLike(a.id, false)} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-left text-sm">
                        <span className="text-xl">{a.emoji}</span><span>{a.name}</span>
                      </button>
                    ))}
                  </div>
                </details>
                <button data-testid="like-no-plan" onClick={()=>sendLike(null, true)} className="w-full px-4 py-3 rounded-2xl text-sm text-white/70 border border-dashed border-white/20 hover:bg-white/5">
                  Solo me interesa, sin plan aún
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Match Modal */}
      <AnimatePresence>
        {matchModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative w-full max-w-md">
              <div className="absolute -inset-8 ps-gradient rounded-[40px] opacity-30 blur-3xl"/>
              <div className="ps-card p-8 text-center relative">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15, type: "spring" }}
                  className="mx-auto w-20 h-20 rounded-full ps-gradient flex items-center justify-center mb-4">
                  <Sparkles size={38}/>
                </motion.div>
                <h2 className="font-display text-4xl font-black">¡Hay plan! 🎉</h2>
                <p className="mt-2 text-white/70">A ti y a <span className="font-bold text-white">{matchModal.other?.alias}</span> les tinca juntarse.</p>
                {matchModal.activity && (
                  <div className="mt-4 ps-card p-3 border border-[#4ADE80]/30">
                    <p className="text-xs text-white/50 uppercase tracking-wider">Plan propuesto</p>
                    <p className="font-display text-xl font-bold mt-1">{matchModal.activity.emoji} {matchModal.activity.name}</p>
                  </div>
                )}
                <div className="mt-6 flex gap-3">
                  <button data-testid="match-later" onClick={()=>setMatchModal(null)} className="ps-btn-secondary flex-1">Seguir mirando</button>
                  <button data-testid="match-open-chat" onClick={()=>{const id=matchModal.match_id; setMatchModal(null); nav(`/app/chats/${id}`);}} className="ps-btn-primary flex-1">Abrir chat</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileCard({ profile, mode, onPass, onLike }) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const photo = profile.photos?.[photoIdx];
  const color = modeColor(mode);

  return (
    <motion.div key={profile.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="relative rounded-[32px] overflow-hidden bg-[#1A1C22] border border-white/5" style={{ height: "70vh", maxHeight: 720 }}>
        {/* photo */}
        <div className="absolute inset-0">
          {photo ? (
            <img src={fileUrl(photo)} alt={profile.alias} className="w-full h-full object-cover"/>
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF6B5E33, #8B5CF633)" }}>
              <div className="w-40 h-40 rounded-full ps-gradient flex items-center justify-center text-6xl font-black font-display">
                {profile.alias?.slice(0,1).toUpperCase()}
              </div>
            </div>
          )}
        </div>
        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90"/>
        {/* photo dots */}
        {profile.photos?.length > 1 && (
          <div className="absolute top-3 left-3 right-3 flex gap-1">
            {profile.photos.map((_, i) => (
              <button key={i} onClick={()=>setPhotoIdx(i)} className="flex-1 h-1 rounded-full" style={{ background: i===photoIdx ? "white" : "rgba(255,255,255,0.35)" }}/>
            ))}
          </div>
        )}
        {/* info */}
        <div className="absolute bottom-0 left-0 right-0 p-5 space-y-3">
          <div className="flex items-end gap-2 flex-wrap">
            <h2 className="font-display text-3xl font-black tracking-tight">{profile.alias}<span className="text-white/60 font-medium">, {profile.age}</span></h2>
            {profile.sober_time_badge && (
              <span className="ps-chip" style={{ background: "rgba(74,222,128,0.15)", borderColor: "rgba(74,222,128,0.4)", color: "#4ADE80" }}>
                🌱 {soberLabel(profile.sober_time_badge)}
              </span>
            )}
          </div>
          <p className="text-sm text-white/80 flex items-center gap-1"><MapPin size={14}/> {profile.comuna}</p>
          {profile.prompts?.slice(0,1).map((p, i) => (
            <div key={i} className="ps-card p-3">
              <p className="text-xs text-white/50">{p.q}</p>
              <p className="mt-1 text-sm">{p.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Prompts extra + videos (scroll below card) */}
      <div className="mt-4 space-y-3">
        {profile.prompts?.slice(1).map((p, i) => (
          <div key={i} className="ps-card p-4">
            <p className="text-xs text-white/50">{p.q}</p>
            <p className="mt-1 text-sm">{p.a}</p>
          </div>
        ))}
        {profile.videos && profile.videos.length > 0 && (
          <div className="ps-card p-3">
            <p className="text-xs text-white/50 uppercase tracking-wider mb-2">Videos</p>
            <div className="grid grid-cols-2 gap-2">
              {profile.videos.map((v, i) => (
                <video key={i} data-testid={`profile-video-${i}`} src={fileUrl(v)} controls playsInline preload="metadata"
                  className="w-full aspect-[9/16] rounded-2xl bg-black object-cover"/>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* actions */}
      <div className="flex gap-3 mt-5">
        <button data-testid="pass-btn" onClick={onPass} className="flex-1 py-4 rounded-full bg-white/5 border border-white/10 font-semibold text-white/80 hover:bg-white/10 transition">
          Pasar
        </button>
        <button data-testid="me-tinca-btn" onClick={onLike} className="ps-btn-primary flex-[1.4] py-4 flex items-center justify-center gap-2 text-base">
          <Heart size={18} fill="white"/> Me tinca ✨
        </button>
      </div>
    </motion.div>
  );
}
