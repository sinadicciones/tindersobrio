import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import api, { formatApiError, fileUrl } from "@/lib/api";
import { COMUNAS_RM, GENDERS, SOBER_TIMES, MODES, PROMPTS } from "@/constants/comunas";
import { compressImage } from "@/lib/imageCompress";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Camera, X, Check, Video } from "lucide-react";

const STEPS = ["Sobre ti", "¿Qué buscas?", "Tu proceso", "Tus panoramas", "Fotos y videos", "Tus frases", "Reglas"];

export default function Onboarding() {
  const nav = useNavigate();
  const { refresh } = useAuth();
  const [step, setStep] = useState(0);
  const [activities, setActivities] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const fileRef = useRef(null);
  const videoRef = useRef(null);

  const [form, setForm] = useState({
    alias: "",
    gender: "",
    comuna: "",
    modes: [],
    interested_genders: [],
    age_min: 22, age_max: 40,
    relationship_with_substances: "",
    sober_time: "",
    show_sober_time: false,
    favorite_activities: [],
    photos: [],
    videos: [],
    prompts: [{ q: "", a: "" }, { q: "", a: "" }, { q: "", a: "" }],
    accepted_rules: false,
  });
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  useEffect(() => { api.get("/activities").then((r)=>setActivities(r.data)); }, []);

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const canNext = () => {
    if (step === 0) return form.alias.length >= 2 && form.gender && form.comuna;
    if (step === 1) return form.modes.length > 0 && (!form.modes.includes("amor") || (form.interested_genders.length && form.age_min && form.age_max));
    if (step === 2) return !!form.relationship_with_substances;
    if (step === 3) return form.favorite_activities.length >= 3;
    if (step === 4) return form.modes.includes("amor") ? form.photos.length >= 1 : true;
    if (step === 5) return form.prompts.every((p) => p.q && p.a.trim().length > 0);
    if (step === 6) return form.accepted_rules;
    return true;
  };

  const submit = async () => {
    setSaving(true);
    try {
      await api.post("/profile/onboarding", form);
      await refresh();
      toast.success("¡Listo! Bienvenide a PlanSobrio 💛");
      nav("/app/descubrir");
    } catch (ex) {
      toast.error(formatApiError(ex.response?.data?.detail) || ex.message);
    } finally { setSaving(false); }
  };

  const upload = async (file) => {
    if (!file) return;
    const compressed = await compressImage(file);
    const fd = new FormData(); fd.append("file", compressed);
    try {
      const { data } = await api.post("/uploads/photo", fd, { headers: { "Content-Type": "multipart/form-data" } });
      set("photos", [...form.photos, data.path]);
    } catch (ex) {
      toast.error(formatApiError(ex.response?.data?.detail) || "No se pudo subir la foto");
    }
  };

  const uploadVideo = async (file) => {
    if (!file) return;
    setUploadingVideo(true);
    const fd = new FormData(); fd.append("file", file);
    try {
      const { data } = await api.post("/uploads/video", fd, { headers: { "Content-Type": "multipart/form-data" } });
      set("videos", [...form.videos, data.path]);
      toast.success("Video subido");
    } catch (ex) {
      toast.error(formatApiError(ex.response?.data?.detail) || "No se pudo subir el video");
    } finally { setUploadingVideo(false); }
  };

  const toggle = (arr, v) => arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  return (
    <div className="min-h-screen bg-[#0E0F13] text-white">
      <div className="mx-auto max-w-md px-6 pt-10 pb-24">
        {/* progress */}
        <div className="flex items-center gap-1 mb-6">
          {STEPS.map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/10">
              <div className="h-full ps-gradient transition-all" style={{ width: i <= step ? "100%" : "0%" }}/>
            </div>
          ))}
        </div>
        <p className="text-xs text-white/50 mb-4">Paso {step + 1} de {STEPS.length}</p>

        <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-black tracking-tight">{STEPS[step]}</h1>

          {step === 0 && (
            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm text-white/60 mb-2 block">Tu alias público (no uses tu nombre real)</label>
                <input data-testid="ob-alias" className="ps-input" placeholder="ej: Cata_23" value={form.alias} onChange={(e)=>set("alias", e.target.value)} maxLength={24}/>
              </div>
              <div>
                <label className="text-sm text-white/60 mb-2 block">Género</label>
                <div className="grid grid-cols-2 gap-2">
                  {GENDERS.map((g) => (
                    <button type="button" key={g.v} data-testid={`ob-gender-${g.v}`}
                      className={`px-4 py-3 rounded-2xl text-sm font-semibold border transition ${form.gender===g.v ? "ps-gradient border-transparent" : "bg-white/5 border-white/10"}`}
                      onClick={()=>set("gender", g.v)}>{g.l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-white/60 mb-2 block">Comuna</label>
                <select data-testid="ob-comuna" className="ps-input" value={form.comuna} onChange={(e)=>set("comuna", e.target.value)}>
                  <option value="">Elige…</option>
                  {COMUNAS_RM.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="mt-6 space-y-4">
              <p className="text-white/60">¿Qué buscas en PlanSobrio? Puedes marcar varias.</p>
              <div className="grid grid-cols-2 gap-2">
                {MODES.map((m) => {
                  const on = form.modes.includes(m.v);
                  return (
                    <button type="button" key={m.v} data-testid={`ob-mode-${m.v}`}
                      onClick={()=>set("modes", toggle(form.modes, m.v))}
                      className={`p-4 rounded-2xl border text-left transition ${on ? "border-transparent" : "border-white/10 bg-white/5"}`}
                      style={on ? { background: `${m.color}22`, borderColor: `${m.color}66` } : {}}>
                      <div className="text-2xl">{m.emoji}</div>
                      <div className="mt-2 font-bold">{m.l}</div>
                      <div className="text-xs text-white/50 mt-1">{m.desc}</div>
                    </button>
                  );
                })}
              </div>
              {form.modes.includes("amor") && (
                <div className="ps-card p-4 space-y-3 border-[#FF6B5E]/30">
                  <p className="text-sm text-white/70 font-semibold">Para modo Amor:</p>
                  <div>
                    <label className="text-xs text-white/60 mb-2 block">Me interesan personas de género:</label>
                    <div className="flex flex-wrap gap-2">
                      {GENDERS.filter((g)=>g.v!=="prefiero_no_decir").map((g) => (
                        <button type="button" key={g.v} data-testid={`ob-int-${g.v}`}
                          onClick={()=>set("interested_genders", toggle(form.interested_genders, g.v))}
                          className={`ps-chip ${form.interested_genders.includes(g.v) ? "active" : ""}`}>{g.l}</button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-white/60 mb-2 block">Edad mínima</label>
                      <input type="number" min={18} max={99} className="ps-input" value={form.age_min} onChange={(e)=>set("age_min", Number(e.target.value))}/>
                    </div>
                    <div>
                      <label className="text-xs text-white/60 mb-2 block">Edad máxima</label>
                      <input type="number" min={18} max={99} className="ps-input" value={form.age_max} onChange={(e)=>set("age_max", Number(e.target.value))}/>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="mt-6 space-y-4">
              <div className="ps-card p-4 text-sm text-white/70">
                🔒 Esto es privado. Nunca se muestra en tu perfil a menos que tú quieras.
              </div>
              <div>
                <label className="text-sm text-white/60 mb-2 block">Tu relación con el alcohol y las drogas</label>
                <div className="space-y-2">
                  {[
                    {v:"sin_consumo", l:"Vivo sin alcohol ni drogas"},
                    {v:"en_proceso", l:"Estoy en proceso de dejarlo"},
                    {v:"prefiero_no_decir", l:"Prefiero no decir"},
                  ].map((o) => (
                    <button type="button" key={o.v} data-testid={`ob-rel-${o.v}`}
                      onClick={()=>set("relationship_with_substances", o.v)}
                      className={`w-full text-left px-4 py-3 rounded-2xl border transition ${form.relationship_with_substances===o.v ? "ps-gradient border-transparent" : "bg-white/5 border-white/10"}`}>
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-white/60 mb-2 block">Tiempo sin consumo (opcional)</label>
                <div className="grid grid-cols-2 gap-2">
                  {SOBER_TIMES.map((s) => (
                    <button type="button" key={s.v} data-testid={`ob-time-${s.v}`}
                      onClick={()=>set("sober_time", form.sober_time===s.v ? "" : s.v)}
                      className={`px-3 py-2.5 rounded-2xl text-sm font-semibold border ${form.sober_time===s.v ? "bg-[#4ADE80]/20 border-[#4ADE80]/50 text-[#4ADE80]" : "bg-white/5 border-white/10"}`}>{s.l}</button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-3 mt-2">
                <input type="checkbox" data-testid="ob-show-sober" className="w-5 h-5 accent-[#4ADE80]" checked={form.show_sober_time} onChange={(e)=>set("show_sober_time", e.target.checked)}/>
                <span className="text-sm">Mostrar mi tiempo en mi perfil como insignia</span>
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="mt-6">
              <p className="text-white/60 mb-4">Elige mínimo 3 panoramas que te gustan.</p>
              <div className="grid grid-cols-2 gap-2">
                {activities.map((a) => {
                  const on = form.favorite_activities.includes(a.id);
                  return (
                    <button type="button" key={a.id} data-testid={`ob-act-${a.id}`}
                      onClick={()=>set("favorite_activities", toggle(form.favorite_activities, a.id))}
                      className={`p-3 rounded-2xl border text-left text-sm transition ${on ? "ps-gradient border-transparent" : "bg-white/5 border-white/10"}`}>
                      <div className="text-xl mb-1">{a.emoji}</div>
                      <div className="font-semibold leading-tight">{a.name}</div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-white/50">Elegiste {form.favorite_activities.length} / mínimo 3</p>
            </div>
          )}

          {step === 4 && (
            <div className="mt-6 space-y-5">
              <div>
                <p className="text-white/60 mb-3">{form.modes.includes("amor") ? "Sube al menos 1 foto (obligatorio para modo Amor)." : "Sube 1 a 6 fotos (opcional)."} Máx 6.</p>
                <div className="grid grid-cols-3 gap-2">
                  {form.photos.map((p, i) => (
                    <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-white/5">
                      <img src={fileUrl(p)} alt="" className="w-full h-full object-cover"/>
                      <button type="button" onClick={()=>set("photos", form.photos.filter((_,j)=>j!==i))} className="absolute top-1 right-1 bg-black/60 rounded-full p-1"><X size={14}/></button>
                    </div>
                  ))}
                  {form.photos.length < 6 && (
                    <button type="button" data-testid="ob-upload" onClick={()=>fileRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-white/60 hover:bg-white/5">
                      <Camera size={22}/><span className="text-xs mt-1">Subir</span>
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e)=>upload(e.target.files?.[0])}/>
              </div>

              <div>
                <p className="text-white/60 mb-3">Videos cortos (opcional · máx 3 · &lt;30s ideal)</p>
                <div className="grid grid-cols-3 gap-2">
                  {form.videos.map((v, i) => (
                    <div key={i} className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-black">
                      <video src={fileUrl(v)} controls playsInline preload="metadata" className="w-full h-full object-cover"/>
                      <button type="button" onClick={()=>set("videos", form.videos.filter((_,j)=>j!==i))} className="absolute top-1 right-1 bg-black/70 rounded-full p-1"><X size={14}/></button>
                    </div>
                  ))}
                  {form.videos.length < 3 && (
                    <button type="button" data-testid="ob-upload-video" disabled={uploadingVideo} onClick={()=>videoRef.current?.click()} className="aspect-[9/16] rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-white/60 hover:bg-white/5 disabled:opacity-50">
                      {uploadingVideo ? (
                        <div className="w-6 h-6 border-2 border-white/20 border-t-white/70 rounded-full animate-spin"/>
                      ) : (
                        <>
                          <Video size={22}/><span className="text-xs mt-1">Video</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <input ref={videoRef} type="file" accept="video/mp4,video/quicktime,video/webm" hidden onChange={(e)=>uploadVideo(e.target.files?.[0])}/>
                <p className="text-xs text-white/40 mt-2">Formatos: mp4, mov, webm · Máx 40MB. Muestra un panorama tuyo :)</p>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="mt-6 space-y-4">
              <p className="text-white/60">Elige 3 preguntas y respóndelas (máx 150 caracteres).</p>
              {form.prompts.map((p, idx) => (
                <div key={idx} className="ps-card p-4 space-y-3">
                  <select data-testid={`ob-prompt-q-${idx}`} className="ps-input" value={p.q} onChange={(e)=>{const c=[...form.prompts];c[idx]={...c[idx], q:e.target.value};set("prompts", c);}}>
                    <option value="">Elige una pregunta…</option>
                    {PROMPTS.filter((q)=>q===p.q || !form.prompts.some((pp,i)=>i!==idx && pp.q===q)).map((q)=><option key={q} value={q}>{q}</option>)}
                  </select>
                  <textarea data-testid={`ob-prompt-a-${idx}`} maxLength={150} rows={2} className="ps-input" placeholder="Tu respuesta…" value={p.a} onChange={(e)=>{const c=[...form.prompts];c[idx]={...c[idx], a:e.target.value};set("prompts", c);}}/>
                  <p className="text-xs text-white/40 text-right">{p.a.length}/150</p>
                </div>
              ))}
            </div>
          )}

          {step === 6 && (
            <div className="mt-6 space-y-4">
              <div className="ps-card p-5 space-y-3 text-sm leading-relaxed">
                <p className="font-bold text-lg font-display">Reglas de la comunidad</p>
                <ul className="space-y-2 text-white/80">
                  <li>🚫 Prohibido ofrecer alcohol o drogas.</li>
                  <li>🚫 Prohibido romantizar el consumo.</li>
                  <li>💛 Respeto siempre. Nada de acoso.</li>
                  <li>🤝 Cuidémonos entre todes.</li>
                </ul>
                <p className="text-xs text-white/50 mt-3">PlanSobrio no reemplaza tratamiento profesional ni atención de urgencia.</p>
              </div>
              <label className="flex items-start gap-3">
                <input type="checkbox" data-testid="ob-accept" className="w-5 h-5 mt-0.5 accent-[#8B5CF6]" checked={form.accepted_rules} onChange={(e)=>set("accepted_rules", e.target.checked)}/>
                <span className="text-sm">Acepto las reglas de PlanSobrio.</span>
              </label>
            </div>
          )}
        </motion.div>

        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#0E0F13] via-[#0E0F13]/95 to-transparent pb-6 pt-4">
          <div className="mx-auto max-w-md px-6 flex gap-3">
            {step > 0 && <button onClick={back} data-testid="ob-back" className="ps-btn-secondary flex-1">Atrás</button>}
            {step < STEPS.length - 1 ? (
              <button disabled={!canNext()} onClick={next} data-testid="ob-next" className="ps-btn-primary flex-1">Continuar</button>
            ) : (
              <button disabled={!canNext() || saving} onClick={submit} data-testid="ob-finish" className="ps-btn-primary flex-1 flex items-center justify-center gap-2">
                <Check size={18}/> {saving ? "Guardando…" : "Empezar"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
