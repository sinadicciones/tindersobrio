import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import api, { formatApiError, fileUrl } from "@/lib/api";
import { GENDERS, SOBER_TIMES, MODES, PROMPTS } from "@/constants/comunas";
import { compressImage } from "@/lib/imageCompress";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Camera, X, Check, ShieldAlert, HeartHandshake, Smile, Heart, Users as UsersIcon, Plus, Sparkles as SparklesIcon, PencilLine } from "lucide-react";
import LocationPicker from "@/components/LocationPicker";
import { Icon, iconForActivity } from "@/lib/icons";

const MODE_ICON = { apoyo: HeartHandshake, amistad: Smile, amor: Heart, grupos: UsersIcon };

// Same rules as backend `validate_bio` — keep in sync so users get immediate feedback.
const BIO_URL_RE = /(?:https?:\/\/[^\s]+|\bwww\.[a-z0-9-]{2,}|\b[a-z0-9-]{3,}\.(?:com|cl|net|org|io|co|app|es|ar|mx|pe|uy|xyz|info)\b)/i;
const BIO_PHONE_RE = /(?:\+?\d[\s\-.]?){6,}/;

function validateBioClient(bio) {
  const text = (bio || "").trim();
  if (!text) return null;
  if (text.length > 300) return "Tu 'Sobre mí' no puede pasar de 300 caracteres";
  if (BIO_URL_RE.test(text)) return "Guarda los links para después del match ✨";
  if (BIO_PHONE_RE.test(text)) return "Guarda los teléfonos para después del match ✨";
  return null;
}

const STEPS = ["Sobre ti", "¿Qué buscas?", "¿Dónde estás?", "Tu proceso", "Tus panoramas", "Fotos", "Tus frases", "Detalles sobre ti", "Reglas"];

export default function Onboarding() {
  const nav = useNavigate();
  const { user, refresh } = useAuth();
  const needsBirthdate = !user?.birthdate;
  const [step, setStep] = useState(0);
  const [activities, setActivities] = useState([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    alias: "",
    gender: "",
    birthdate: "",
    location: null, // { country, city, comuna, coords, source }
    modes: [],
    interested_genders: [],
    age_min: 22, age_max: 40,
    relationship_with_substances: "",
    sober_time: "",
    show_sober_time: false,
    show_relationship: false,
    favorite_activities: [],
    photos: [],
    videos: [],
    bio: "",
    prompts: [{ q: "", a: "" }],
    // Optional detail fields — user can leave them empty
    height_cm: "",
    has_children: "",
    show_height: true,
    show_children: true,
    show_zodiac: false,
    show_modes: true,
    accepted_rules: false,
  });
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  useEffect(() => { api.get("/activities").then((r)=>setActivities(r.data)); }, []);

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const canNext = () => {
    if (step === 0) return form.alias.length >= 2 && form.gender && (!needsBirthdate || form.birthdate);
    if (step === 1) return form.modes.length > 0 && (!form.modes.includes("amor") || (form.interested_genders.length && form.age_min && form.age_max));
    if (step === 2) {
      // Multi-país: se exige país + ciudad (o comuna en CL).
      const loc = form.location;
      if (!loc || !loc.country) return false;
      const isCL = (loc.country || "").toUpperCase() === "CL";
      // En Chile aceptamos comuna o city; en otros países se exige city.
      return isCL ? !!(loc.comuna || loc.city) : !!loc.city;
    }
    if (step === 3) return !!form.relationship_with_substances;
    if (step === 4) return form.favorite_activities.length >= 3;
    if (step === 5) return form.modes.includes("amor") ? form.photos.length >= 1 : true;
    if (step === 6) {
      // Bio: block if contains obvious link/phone before letting user continue.
      if (validateBioClient(form.bio)) return false;
      // At least 1 non-empty prompt (question + answer), max 6.
      const valid = form.prompts.filter((p) => p.q && (p.a || "").trim().length > 0);
      return valid.length >= 1 && valid.length <= 6;
    }
    if (step === 7) return true; // Detail step is entirely optional
    if (step === 8) return form.accepted_rules;
    return true;
  };

  const submit = async () => {
    setSaving(true);
    try {
      const rawCountry = (form.location?.country || "CL").toUpperCase();
      const isCL = rawCountry === "CL";
      const location = form.location ? {
        country: rawCountry,
        // En CL usamos comuna como city fallback; en otros países city es primario.
        city: form.location.city || (isCL ? form.location.comuna : ""),
        comuna: isCL ? (form.location.comuna || undefined) : undefined,
        coords: form.location.coords, // undefined for manual → server derives
      } : undefined;
      const payload = {
        ...form,
        // Legacy `comuna` top-level: CL manda comuna real; otros países mandan city.
        comuna: isCL ? (form.location?.comuna || "") : (form.location?.city || ""),
        birthdate: form.birthdate || undefined,
        location,
        // Filter out empty prompts before submitting (server enforces 1..6 non-empty)
        prompts: form.prompts.filter((p) => (p.q || "").trim() && (p.a || "").trim()),
        // Coerce optional numeric field
        height_cm: form.height_cm ? Number(form.height_cm) : undefined,
        has_children: form.has_children || undefined,
        // sober_time is a Literal on the backend — "" is not valid, send undefined instead
        sober_time: form.sober_time || undefined,
      };
      delete payload.location; // don't send twice
      payload.location = location;
      await api.post("/profile/onboarding", payload);
      await refresh();
      toast.success("¡Listo! Bienvenide a PlanSobrio");
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
              {needsBirthdate && (
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Fecha de nacimiento (solo mayores de 18)</label>
                  <input
                    data-testid="ob-birthdate"
                    type="date"
                    className="ps-input"
                    value={form.birthdate}
                    onChange={(e)=>set("birthdate", e.target.value)}
                    max={new Date(Date.now()-18*365.25*86400000).toISOString().slice(0,10)}
                  />
                </div>
              )}
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
            </div>
          )}

          {step === 1 && (
            <div className="mt-6 space-y-4">
              <p className="text-white/60">¿Qué buscas en PlanSobrio? Puedes marcar varias.</p>
              <div className="grid grid-cols-2 gap-2">
                {MODES.map((m) => {
                  const on = form.modes.includes(m.v);
                  const I = MODE_ICON[m.v];
                  return (
                    <button type="button" key={m.v} data-testid={`ob-mode-${m.v}`}
                      onClick={()=>set("modes", toggle(form.modes, m.v))}
                      className={`p-4 rounded-2xl border text-left transition ${on ? "ps-gradient border-transparent text-white" : "bg-white/5 border-white/[.16] text-[#C7CBD6]"}`}>
                      {I && <I size={22} strokeWidth={1.9}/>}
                      <div className="mt-2 font-bold text-white">{m.l}</div>
                      <div className="text-xs mt-1 text-[#C7CBD6]">{m.desc}</div>
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
              <p className="text-white/60">Necesitamos saber dónde estás para mostrarte gente y planes cerca.</p>
              <LocationPicker
                value={form.location}
                onChange={(loc)=>set("location", loc)}
              />
            </div>
          )}

          {step === 3 && (
            <div className="mt-6 space-y-4">
              <div className="ps-card p-4 text-sm text-[#C7CBD6] inline-flex items-start gap-2">
                <ShieldAlert size={16} strokeWidth={1.9} className="text-[#8B5CF6] shrink-0 mt-0.5"/>
                <span>Esto es privado. Nunca se muestra en tu perfil a menos que tú quieras.</span>
              </div>
              <div>
                <label className="text-sm text-white/60 mb-2 block">Tu relación con el alcohol y las drogas</label>
                <div className="space-y-2">
                  {[
                    {v:"sin_consumo", l:"Vivo sin alcohol ni drogas"},
                    {v:"en_proceso", l:"Estoy en proceso de dejarlo"},
                    {v:"sin_problema", l:"No tengo problemas con dependencias"},
                    {v:"prefiero_no_decir", l:"Prefiero no decir"},
                  ].map((o) => (
                    <button type="button" key={o.v} data-testid={`ob-rel-${o.v}`}
                      onClick={()=>set("relationship_with_substances", o.v)}
                      className={`w-full text-left px-4 py-3 rounded-2xl border transition ${form.relationship_with_substances===o.v ? "ps-gradient border-transparent" : "bg-white/5 border-white/10"}`}>
                      {o.l}
                    </button>
                  ))}
                </div>
                {form.relationship_with_substances === "sin_problema" && (
                  <label className="flex items-center gap-3 mt-3 text-sm">
                    <input
                      type="checkbox"
                      data-testid="ob-show-relationship"
                      className="w-5 h-5 accent-[#4ADE80]"
                      checked={form.show_relationship}
                      onChange={(e)=>set("show_relationship", e.target.checked)}
                    />
                    <span>Mostrar en mi perfil como insignia</span>
                  </label>
                )}
              </div>
              {form.relationship_with_substances !== "sin_problema" && form.relationship_with_substances !== "prefiero_no_decir" && (
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Tiempo sin consumo (opcional)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SOBER_TIMES.map((s) => (
                      <button type="button" key={s.v} data-testid={`ob-time-${s.v}`}
                        onClick={()=>set("sober_time", form.sober_time===s.v ? "" : s.v)}
                        className={`px-3 py-2.5 rounded-2xl text-sm font-semibold border ${form.sober_time===s.v ? "bg-[#4ADE80]/20 border-[#4ADE80]/50 text-[#4ADE80]" : "bg-white/5 border-white/10"}`}>{s.l}</button>
                    ))}
                  </div>
                  <label className="flex items-center gap-3 mt-2">
                    <input type="checkbox" data-testid="ob-show-sober" className="w-5 h-5 accent-[#4ADE80]" checked={form.show_sober_time} onChange={(e)=>set("show_sober_time", e.target.checked)}/>
                    <span className="text-sm">Mostrar mi tiempo en mi perfil como insignia</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="mt-6">
              <p className="text-white/60 mb-4">Elige mínimo 3 panoramas que te gustan.</p>
              <div className="grid grid-cols-2 gap-2">
                {activities.filter((a) => !a.is_virtual).map((a) => {
                  const on = form.favorite_activities.includes(a.id);
                  return (
                    <button type="button" key={a.id} data-testid={`ob-act-${a.id}`}
                      onClick={()=>set("favorite_activities", toggle(form.favorite_activities, a.id))}
                      className={`p-3 rounded-2xl border text-left text-sm transition ${on ? "ps-gradient border-transparent text-white" : "bg-white/5 border-white/[.16] text-[#C7CBD6]"}`}>
                      <Icon name={iconForActivity(a)} size={20} strokeWidth={1.9}/>
                      <div className="font-semibold leading-tight mt-1 text-white">{a.name}</div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-white/50">Elegiste {form.favorite_activities.length} / mínimo 3</p>
            </div>
          )}

          {step === 5 && (
            <div className="mt-6">
              <p className="text-white/60 mb-4">{form.modes.includes("amor") ? "Sube al menos 1 foto (obligatorio para modo Amor)." : "Sube 1 a 6 fotos (opcional)."} Máx 6.</p>
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
          )}

          {step === 6 && (
            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm text-white/60 mb-2 block">Sobre mí (opcional)</label>
                <textarea
                  data-testid="ob-bio"
                  className="ps-input"
                  maxLength={300}
                  rows={3}
                  placeholder="Cuéntale a la comunidad quién eres y qué buscas, en tus palabras…"
                  value={form.bio}
                  onChange={(e)=>set("bio", e.target.value)}
                />
                <div className="flex items-start justify-between mt-1 gap-2">
                  {validateBioClient(form.bio) ? (
                    <p data-testid="bio-error" className="text-xs" style={{ color: "#FF6B5E" }}>{validateBioClient(form.bio)}</p>
                  ) : <span/>}
                  <p className="text-xs text-white/40 whitespace-nowrap">{form.bio.length}/300</p>
                </div>
              </div>
              <p className="text-white/60">Escribe entre 1 y 6 frases. Puedes agregar más cuando quieras.</p>
              {form.prompts.map((p, idx) => (
                <div key={idx} className="ps-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="ps-lab"><PencilLine size={12} strokeWidth={1.9}/> Frase {idx + 1}</span>
                    {form.prompts.length > 1 && (
                      <button
                        type="button"
                        data-testid={`ob-prompt-remove-${idx}`}
                        onClick={()=>set("prompts", form.prompts.filter((_,i)=>i!==idx))}
                        className="text-white/40 hover:text-white/80 transition"
                        aria-label="Quitar frase"
                      >
                        <X size={16} strokeWidth={1.9}/>
                      </button>
                    )}
                  </div>
                  <select data-testid={`ob-prompt-q-${idx}`} className="ps-input" value={p.q} onChange={(e)=>{const c=[...form.prompts];c[idx]={...c[idx], q:e.target.value};set("prompts", c);}}>
                    <option value="">Elige una pregunta…</option>
                    {PROMPTS.filter((q)=>q===p.q || !form.prompts.some((pp,i)=>i!==idx && pp.q===q)).map((q)=><option key={q} value={q}>{q}</option>)}
                  </select>
                  <textarea data-testid={`ob-prompt-a-${idx}`} maxLength={150} rows={2} className="ps-input" placeholder="Tu respuesta…" value={p.a} onChange={(e)=>{const c=[...form.prompts];c[idx]={...c[idx], a:e.target.value};set("prompts", c);}}/>
                  <p className="text-xs text-white/40 text-right">{p.a.length}/150</p>
                </div>
              ))}
              {form.prompts.length < 6 && (
                <button
                  type="button"
                  data-testid="ob-prompt-add"
                  onClick={()=>set("prompts", [...form.prompts, { q: "", a: "" }])}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-white/20 text-white/70 hover:bg-white/5 transition"
                >
                  <Plus size={16} strokeWidth={2}/> Agregar otra frase
                </button>
              )}
            </div>
          )}

          {step === 7 && (
            <div className="mt-6 space-y-4">
              <div className="ps-card p-4 text-sm text-[#C7CBD6] inline-flex items-start gap-2">
                <SparklesIcon size={16} strokeWidth={1.9} className="text-[#8B5CF6] shrink-0 mt-0.5"/>
                <span>Datos opcionales que ayudan a que otros conecten contigo. Puedes ocultarlos cuando quieras.</span>
              </div>
              <div>
                <label className="text-sm text-white/60 mb-2 block">Estatura (opcional)</label>
                <div className="flex items-center gap-3">
                  <input
                    data-testid="ob-height"
                    type="number"
                    min={140}
                    max={210}
                    inputMode="numeric"
                    className="ps-input flex-1"
                    placeholder="ej: 170"
                    value={form.height_cm}
                    onChange={(e)=>set("height_cm", e.target.value)}
                  />
                  <span className="text-white/60 text-sm">cm</span>
                </div>
                <label className="flex items-center gap-3 mt-3 text-sm">
                  <input
                    type="checkbox"
                    data-testid="ob-show-height"
                    className="w-5 h-5 accent-[#8B5CF6]"
                    checked={form.show_height}
                    onChange={(e)=>set("show_height", e.target.checked)}
                  />
                  Mostrar mi estatura en el perfil
                </label>
              </div>
              <div>
                <label className="text-sm text-white/60 mb-2 block">Hijos (opcional)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: "si", l: "Tengo" },
                    { v: "no", l: "No tengo" },
                    { v: "prefiero_no_decir", l: "Prefiero no decir" },
                  ].map((o) => (
                    <button
                      type="button"
                      key={o.v}
                      data-testid={`ob-children-${o.v}`}
                      onClick={()=>set("has_children", form.has_children === o.v ? "" : o.v)}
                      className={`px-3 py-2.5 rounded-2xl text-xs font-semibold border transition ${form.has_children === o.v ? "ps-gradient border-transparent text-white" : "bg-white/5 border-white/[.16] text-[#C7CBD6]"}`}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-3 mt-3 text-sm">
                  <input
                    type="checkbox"
                    data-testid="ob-show-children"
                    className="w-5 h-5 accent-[#8B5CF6]"
                    checked={form.show_children}
                    onChange={(e)=>set("show_children", e.target.checked)}
                  />
                  Mostrar en mi perfil
                </label>
              </div>
              <div>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    data-testid="ob-show-zodiac"
                    className="w-5 h-5 accent-[#8B5CF6]"
                    checked={form.show_zodiac}
                    onChange={(e)=>set("show_zodiac", e.target.checked)}
                  />
                  Mostrar mi signo zodiacal (lo calculamos por tu fecha de nacimiento)
                </label>
              </div>
              <div>
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    data-testid="ob-show-modes"
                    className="w-5 h-5 accent-[#8B5CF6]"
                    checked={form.show_modes}
                    onChange={(e)=>set("show_modes", e.target.checked)}
                  />
                  Mostrar los modos que activé (Apoyo, Amistad, Amor)
                </label>
              </div>
            </div>
          )}

          {step === 8 && (
            <div className="mt-6 space-y-4">
              <div className="ps-card p-5 space-y-3 text-sm leading-relaxed">
                <p className="font-bold text-lg font-display">Reglas de la comunidad</p>
                <ul className="space-y-2 text-[#C7CBD6]">
                  <li>· Prohibido ofrecer alcohol o drogas.</li>
                  <li>· Prohibido romantizar el consumo.</li>
                  <li>· Respeto siempre. Nada de acoso.</li>
                  <li>· Cuidémonos entre todes.</li>
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
