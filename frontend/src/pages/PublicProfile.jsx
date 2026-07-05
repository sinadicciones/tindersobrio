import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api, { formatApiError, fileUrl } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Sparkles, ShieldAlert, Flag, PencilLine, HeartHandshake, Smile, Heart, Users as UsersIcon, Ruler, Baby, Star, ChevronLeft, ChevronRight } from "lucide-react";
import Avatar from "@/components/Avatar";
import { MODES, REPORT_CATEGORIES } from "@/constants/comunas";

const MODE_ICON = { apoyo: HeartHandshake, amistad: Smile, amor: Heart, grupos: UsersIcon };

// Public profile viewer, opened from anywhere a user's alias/photo is clickable
// (group chat, matches, admin, etc). Reuses GET /api/profile/:id which already
// scrubs private fields via clear_public().
export default function PublicProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const [profile, setProfile] = useState(null);
  const [reporting, setReporting] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);

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
  const photos = profile.photos || [];
  const photo = photos[photoIdx];
  const hasMultiple = photos.length > 1;

  return (
    <div className="mx-auto max-w-md px-4 pt-4 pb-24">
      <button data-testid="pp-back" onClick={()=>nav(-1)} className="flex items-center gap-1 text-white/70 mb-4">
        <ArrowLeft size={18}/> Volver
      </button>

      <div className="ps-card overflow-hidden">
        <div className="relative">
          {photo ? (
            <img
              data-testid="pp-photo"
              src={fileUrl(photo)}
              alt={`${profile.alias} · foto ${photoIdx + 1}`}
              className="w-full aspect-[4/5] object-cover select-none"
              draggable={false}
            />
          ) : (
            <div className="w-full aspect-[4/5] flex items-center justify-center ps-gradient">
              <Avatar user={profile} size={120}/>
            </div>
          )}
          {hasMultiple && (
            <>
              {/* Tap zones for prev/next — invisible left/right halves for easy phone taps */}
              <button
                data-testid="pp-photo-prev-zone"
                aria-label="Foto anterior"
                onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                className="absolute inset-y-0 left-0 w-1/2 focus:outline-none"
              />
              <button
                data-testid="pp-photo-next-zone"
                aria-label="Foto siguiente"
                onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                className="absolute inset-y-0 right-0 w-1/2 focus:outline-none"
              />
              {/* Chevron buttons for desktop */}
              <button
                data-testid="pp-photo-prev"
                onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full grid place-items-center bg-black/45 hover:bg-black/65 text-white transition"
                aria-label="Foto anterior"
              >
                <ChevronLeft size={20} strokeWidth={2}/>
              </button>
              <button
                data-testid="pp-photo-next"
                onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full grid place-items-center bg-black/45 hover:bg-black/65 text-white transition"
                aria-label="Foto siguiente"
              >
                <ChevronRight size={20} strokeWidth={2}/>
              </button>
              {/* Dot indicators at top */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1 rounded-full bg-black/40">
                {photos.map((_, i) => (
                  <span
                    key={i}
                    data-testid={`pp-photo-dot-${i}`}
                    className={`block h-1.5 rounded-full transition-all ${i === photoIdx ? "w-6 bg-white" : "w-1.5 bg-white/40"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
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
              const I = MODE_ICON[v];
              return m ? (
                <span key={v} className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/[.16] text-white">
                  {I && <I size={12} strokeWidth={1.9}/>} {m.l}
                </span>
              ) : null;
            })}
          </div>

          {profile.bio && (
            <div data-testid="pp-bio" className="relative mt-4 pl-4 pr-4 py-4 rounded-2xl overflow-hidden" style={{ background: "linear-gradient(180deg, #1B1F2A 0%, #161922 100%)" }}>
              <div className="absolute left-0 top-0 bottom-0 w-1 ps-gradient rounded-l-2xl"/>
              <p className="ps-lab"><PencilLine size={12} strokeWidth={1.9}/> Sobre mí</p>
              <p className="mt-2 text-white leading-relaxed">“{profile.bio}”</p>
            </div>
          )}

          <DetailsCard profile={profile}/>

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

// "BUSCA · DETALLES" card — renders only if the target user has at least one
// visible detail field (height, children status or zodiac). Backend `clear_public`
// already filters out fields whose visibility switch is off.
export function DetailsCard({ profile }) {
  const items = [];
  if (profile.height_cm) items.push({ icon: <Ruler size={14} strokeWidth={1.9}/>, label: "Estatura", value: `${profile.height_cm} cm` });
  if (profile.has_children) {
    const map = { si: "Tiene hijos", no: "Sin hijos" };
    if (map[profile.has_children]) items.push({ icon: <Baby size={14} strokeWidth={1.9}/>, label: "Hijos", value: map[profile.has_children] });
  }
  if (profile.zodiac) items.push({ icon: <Star size={14} strokeWidth={1.9}/>, label: "Signo", value: profile.zodiac });
  if (!items.length) return null;
  return (
    <div data-testid="pp-details" className="mt-4 ps-card p-4">
      <p className="ps-lab"><Sparkles size={12} strokeWidth={1.9}/> Busca · Detalles</p>
      <ul className="mt-3 space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-2 text-[#C7CBD6]">{it.icon}{it.label}</span>
            <span className="font-semibold text-white">{it.value}</span>
          </li>
        ))}
      </ul>
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
