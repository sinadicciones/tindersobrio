import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api, { formatApiError, fileUrl } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Sparkles, ShieldAlert, Flag, PencilLine } from "lucide-react";
import Avatar from "@/components/Avatar";
import { MODES, REPORT_CATEGORIES } from "@/constants/comunas";

// Public profile viewer, opened from anywhere a user's alias/photo is clickable
// (group chat, matches, admin, etc). Reuses GET /api/profile/:id which already
// scrubs private fields via clear_public().
export default function PublicProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const [profile, setProfile] = useState(null);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    api.get(`/profile/${id}`)
      .then((r) => setProfile(r.data))
      .catch((ex) => { toast.error(formatApiError(ex.response?.data?.detail) || "Perfil no encontrado"); nav(-1); });
  }, [id, nav]);

  const block = async () => {
    if (!confirm("¿Bloquear a esta persona? Ya no se verán ni podrán escribirse.")) return;
    try { await api.post("/block", { target_user_id: id }); toast.success("Usuario bloqueado."); nav(-1); }
    catch (ex) { toast.error(formatApiError(ex.response?.data?.detail)); }
  };

  if (!profile) return <div className="p-6 text-white/60">Cargando…</div>;
  const firstPhoto = profile.photos?.[0];

  return (
    <div className="mx-auto max-w-md px-4 pt-4 pb-24">
      <button data-testid="pp-back" onClick={()=>nav(-1)} className="flex items-center gap-1 text-white/70 mb-4">
        <ArrowLeft size={18}/> Volver
      </button>

      <div className="ps-card overflow-hidden">
        {firstPhoto ? (
          <img src={fileUrl(firstPhoto)} alt={profile.alias} className="w-full aspect-[4/5] object-cover"/>
        ) : (
          <div className="w-full aspect-[4/5] flex items-center justify-center ps-gradient">
            <Avatar user={profile} size={120}/>
          </div>
        )}
        <div className="p-5">
          <div className="flex items-baseline gap-2">
            <h1 data-testid="pp-alias" className="font-display text-3xl font-black">{profile.alias}</h1>
            {profile.age && <span className="text-white/60 text-xl">, {profile.age}</span>}
          </div>
          <p className="mt-1 text-sm text-white/70 flex items-center gap-1"><MapPin size={14}/> {profile.comuna}</p>
          {profile.sober_time_badge && (
            <p className="mt-2 text-xs text-[#4ADE80] flex items-center gap-1"><Sparkles size={12}/> {profile.sober_time_badge} sin consumo</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.modes?.map((v) => {
              const m = MODES.find((x) => x.v === v);
              return m ? <span key={v} className="ps-chip" style={{ background: `${m.color}22`, borderColor: `${m.color}55`, color: m.color }}>{m.emoji} {m.l}</span> : null;
            })}
          </div>

          {profile.bio && (
            <div data-testid="pp-bio" className="relative mt-4 pl-4 pr-4 py-4 rounded-2xl overflow-hidden" style={{ background: "linear-gradient(180deg, #1B1F2A 0%, #161922 100%)" }}>
              <div className="absolute left-0 top-0 bottom-0 w-1 ps-gradient rounded-l-2xl"/>
              <p className="ps-lab"><PencilLine size={12} strokeWidth={1.9}/> Sobre mí</p>
              <p className="mt-2 text-white leading-relaxed">“{profile.bio}”</p>
            </div>
          )}

          {profile.prompts?.filter(p=>p.q&&p.a).map((p, i) => (
            <div key={i} className="mt-3 ps-card p-3 bg-white/5">
              <p className="text-xs text-white/50">{p.q}</p>
              <p className="text-sm mt-1">{p.a}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button data-testid="pp-block" onClick={block} className="ps-btn-secondary flex items-center justify-center gap-2">
          <ShieldAlert size={16}/> Bloquear
        </button>
        <button data-testid="pp-report-open" onClick={()=>setReporting(true)} className="ps-btn-secondary flex items-center justify-center gap-2">
          <Flag size={16}/> Reportar
        </button>
      </div>

      {reporting && <ReportModal targetId={id} onClose={()=>setReporting(false)}/>}
    </div>
  );
}

function ReportModal({ targetId, onClose }) {
  const [cat, setCat] = useState("");
  const [det, setDet] = useState("");
  const submit = async () => {
    try {
      await api.post("/report", { target_user_id: targetId, category: cat, details: det });
      toast.success("Gracias por cuidar la comunidad."); onClose();
    } catch (ex) { toast.error(formatApiError(ex.response?.data?.detail)); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="ps-card w-full max-w-md p-6">
        <h2 className="font-display text-2xl font-black">Reportar</h2>
        <div className="mt-4 space-y-2">
          {REPORT_CATEGORIES.map((c) => (
            <button key={c.v} data-testid={`pp-report-cat-${c.v}`} onClick={()=>setCat(c.v)}
              className={`w-full text-left px-4 py-3 rounded-2xl border ${cat===c.v ? "ps-gradient border-transparent" : "bg-white/5 border-white/10"}`}>{c.l}</button>
          ))}
          <textarea data-testid="pp-report-details" className="ps-input" rows={3} placeholder="Cuéntanos más (opcional)…" value={det} onChange={(e)=>setDet(e.target.value)}/>
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="ps-btn-secondary flex-1">Cancelar</button>
          <button data-testid="pp-report-submit" disabled={!cat} onClick={submit} className="ps-btn-primary flex-1">Enviar</button>
        </div>
      </div>
    </div>
  );
}
