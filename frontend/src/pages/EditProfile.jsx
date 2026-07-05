import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError, fileUrl } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { COMUNAS_RM, GENDERS, MODES, SOBER_TIMES, PROMPTS } from "@/constants/comunas";
import { compressImage } from "@/lib/imageCompress";
import { toast } from "sonner";
import { ArrowLeft, X, Camera, Video } from "lucide-react";

export default function EditProfile() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({
    alias: user?.alias || "",
    comuna: user?.comuna || "",
    modes: user?.modes || [],
    interested_genders: user?.interested_genders || [],
    age_min: user?.age_min || 22,
    age_max: user?.age_max || 40,
    show_sober_time: !!user?.show_sober_time,
    sober_time: user?.sober_time || "",
    favorite_activities: user?.favorite_activities || [],
    photos: user?.photos || [],
    videos: user?.videos || [],
    prompts: user?.prompts || [{q:"",a:""},{q:"",a:""},{q:"",a:""}],
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const [acts, setActs] = useState([]);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const fileRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => { api.get("/activities").then((r)=>setActs(r.data)); }, []);

  const toggle = (arr, v) => arr.includes(v) ? arr.filter((x)=>x!==v) : [...arr, v];

  const upload = async (file) => {
    if (!file) return;
    const compressed = await compressImage(file);
    const fd = new FormData(); fd.append("file", compressed);
    try { const { data } = await api.post("/uploads/photo", fd, { headers: {"Content-Type": "multipart/form-data"} }); set("photos", [...f.photos, data.path]); }
    catch (ex) { toast.error(formatApiError(ex.response?.data?.detail)); }
  };

  const uploadVideo = async (file) => {
    if (!file) return;
    setUploadingVideo(true);
    const fd = new FormData(); fd.append("file", file);
    try {
      const { data } = await api.post("/uploads/video", fd, { headers: {"Content-Type": "multipart/form-data"} });
      set("videos", [...f.videos, data.path]);
      toast.success("Video subido");
    } catch (ex) { toast.error(formatApiError(ex.response?.data?.detail)); }
    finally { setUploadingVideo(false); }
  };

  const save = async () => {
    try { await api.patch("/profile/me", f); await refresh(); toast.success("Perfil actualizado"); nav("/app/perfil"); }
    catch (ex) { toast.error(formatApiError(ex.response?.data?.detail)); }
  };

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <button onClick={()=>nav(-1)} className="flex items-center gap-1 text-white/70 mb-3"><ArrowLeft size={18}/> Volver</button>
      <h1 className="font-display text-3xl font-black">Editar perfil</h1>

      <div className="mt-5 space-y-5">
        <div>
          <label className="text-sm text-white/60 mb-2 block">Alias</label>
          <input data-testid="edit-alias" className="ps-input" value={f.alias} onChange={(e)=>set("alias", e.target.value)}/>
        </div>
        <div>
          <label className="text-sm text-white/60 mb-2 block">Comuna</label>
          <select className="ps-input" value={f.comuna} onChange={(e)=>set("comuna", e.target.value)}>
            {COMUNAS_RM.map((c)=><option key={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm text-white/60 mb-2 block">Modos activos</label>
          <div className="grid grid-cols-2 gap-2">
            {MODES.map((m) => {
              const on = f.modes.includes(m.v);
              return (
                <button key={m.v} data-testid={`edit-mode-${m.v}`} onClick={()=>set("modes", toggle(f.modes, m.v))}
                  className={`p-3 rounded-2xl border text-left transition ${on ? "border-transparent" : "border-white/10 bg-white/5"}`}
                  style={on ? { background: `${m.color}22`, borderColor: `${m.color}66` } : {}}>
                  <div className="text-xl">{m.emoji}</div>
                  <div className="mt-1 font-bold text-sm">{m.l}</div>
                </button>
              );
            })}
          </div>
        </div>

        {f.modes.includes("amor") && (
          <div className="ps-card p-4 space-y-3">
            <p className="text-sm font-semibold">Preferencias Amor</p>
            <div className="flex flex-wrap gap-2">
              {GENDERS.filter((g)=>g.v!=="prefiero_no_decir").map((g) => (
                <button key={g.v} onClick={()=>set("interested_genders", toggle(f.interested_genders, g.v))}
                  className={`ps-chip ${f.interested_genders.includes(g.v) ? "active" : ""}`}>{g.l}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" className="ps-input" value={f.age_min} onChange={(e)=>set("age_min", Number(e.target.value))}/>
              <input type="number" className="ps-input" value={f.age_max} onChange={(e)=>set("age_max", Number(e.target.value))}/>
            </div>
          </div>
        )}

        <div>
          <label className="text-sm text-white/60 mb-2 block">Panoramas favoritos</label>
          <div className="grid grid-cols-2 gap-2">
            {acts.map((a) => {
              const on = f.favorite_activities.includes(a.id);
              return (
                <button key={a.id} onClick={()=>set("favorite_activities", toggle(f.favorite_activities, a.id))}
                  className={`p-2.5 rounded-2xl border text-left text-sm ${on ? "ps-gradient border-transparent" : "bg-white/5 border-white/10"}`}>
                  <div className="text-lg">{a.emoji}</div>
                  <div className="font-semibold text-xs mt-1 leading-tight">{a.name}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-sm text-white/60 mb-2 block">Fotos (máx 6)</label>
          <div className="grid grid-cols-3 gap-2">
            {f.photos.map((p, i) => (
              <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-white/5">
                <img src={fileUrl(p)} className="w-full h-full object-cover" alt=""/>
                <button onClick={()=>set("photos", f.photos.filter((_,j)=>j!==i))} className="absolute top-1 right-1 bg-black/60 rounded-full p-1"><X size={14}/></button>
              </div>
            ))}
            {f.photos.length < 6 && (
              <button onClick={()=>fileRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-white/60">
                <Camera size={20}/><span className="text-xs mt-1">Subir</span>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e)=>upload(e.target.files?.[0])}/>
        </div>

        <div>
          <label className="text-sm text-white/60 mb-2 block">Videos cortos (máx 3 · &lt;30s ideal)</label>
          <div className="grid grid-cols-3 gap-2">
            {f.videos.map((v, i) => (
              <div key={i} className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-black">
                <video src={fileUrl(v)} controls playsInline preload="metadata" className="w-full h-full object-cover"/>
                <button onClick={()=>set("videos", f.videos.filter((_,j)=>j!==i))} className="absolute top-1 right-1 bg-black/70 rounded-full p-1"><X size={14}/></button>
              </div>
            ))}
            {f.videos.length < 3 && (
              <button data-testid="edit-video-upload" disabled={uploadingVideo} onClick={()=>videoRef.current?.click()} className="aspect-[9/16] rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-white/60 disabled:opacity-50">
                {uploadingVideo ? (
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white/70 rounded-full animate-spin"/>
                ) : (
                  <>
                    <Video size={20}/><span className="text-xs mt-1">Subir</span>
                  </>
                )}
              </button>
            )}
          </div>
          <input ref={videoRef} type="file" accept="video/mp4,video/quicktime,video/webm" hidden onChange={(e)=>uploadVideo(e.target.files?.[0])}/>
          <p className="text-xs text-white/40 mt-2">Formatos: mp4, mov, webm · Máx 40MB</p>
        </div>

        <div>
          <label className="text-sm text-white/60 mb-2 block">Insignia de tiempo sin consumo</label>
          <div className="grid grid-cols-2 gap-2">
            {SOBER_TIMES.map((s) => (
              <button key={s.v} onClick={()=>set("sober_time", f.sober_time===s.v ? "" : s.v)}
                className={`px-3 py-2.5 rounded-2xl text-sm font-semibold border ${f.sober_time===s.v ? "bg-[#4ADE80]/20 border-[#4ADE80]/50 text-[#4ADE80]" : "bg-white/5 border-white/10"}`}>{s.l}</button>
            ))}
          </div>
          <label className="flex items-center gap-3 mt-3 text-sm">
            <input type="checkbox" className="w-5 h-5 accent-[#4ADE80]" checked={f.show_sober_time} onChange={(e)=>set("show_sober_time", e.target.checked)}/>
            Mostrar en mi perfil
          </label>
        </div>

        <div>
          <label className="text-sm text-white/60 mb-2 block">Tus frases</label>
          <div className="space-y-3">
            {f.prompts.map((p, idx) => (
              <div key={idx} className="ps-card p-3 space-y-2">
                <select className="ps-input" value={p.q} onChange={(e)=>{const c=[...f.prompts];c[idx]={...c[idx], q:e.target.value};set("prompts", c);}}>
                  <option value="">Pregunta…</option>
                  {PROMPTS.map((q)=><option key={q} value={q}>{q}</option>)}
                </select>
                <textarea maxLength={150} rows={2} className="ps-input" value={p.a} onChange={(e)=>{const c=[...f.prompts];c[idx]={...c[idx], a:e.target.value};set("prompts", c);}}/>
              </div>
            ))}
          </div>
        </div>

        <button data-testid="save-profile" onClick={save} className="ps-btn-primary w-full mt-4">Guardar</button>
      </div>
    </div>
  );
}
