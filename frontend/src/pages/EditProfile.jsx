import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError, fileUrl } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { GENDERS, MODES, SOBER_TIMES, PROMPTS } from "@/constants/comunas";
import { compressImage } from "@/lib/imageCompress";
import { toast } from "sonner";
import { ArrowLeft, X, Camera, Plus, PencilLine, Mail } from "lucide-react";
import LocationPicker from "@/components/LocationPicker";
import { Icon, iconForActivity } from "@/lib/icons";
import { HeartHandshake, Smile, Heart, Users as UsersIcon } from "lucide-react";

const MODE_ICON = { apoyo: HeartHandshake, amistad: Smile, amor: Heart, grupos: UsersIcon };

export default function EditProfile() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const initialLocation = user?.location ? {
    country: user.location.country || "CL",
    city: user.location.city || user.comuna,
    comuna: user.location.comuna || user.comuna,
  } : (user?.comuna ? { country: "CL", city: user.comuna, comuna: user.comuna } : null);

  const [f, setF] = useState({
    alias: user?.alias || "",
    modes: user?.modes || [],
    interested_genders: user?.interested_genders || [],
    age_min: user?.age_min || 22,
    age_max: user?.age_max || 40,
    show_sober_time: !!user?.show_sober_time,
    sober_time: user?.sober_time || "",
    relationship_with_substances: user?.relationship_with_substances || "",
    show_relationship: !!user?.show_relationship,
    favorite_activities: user?.favorite_activities || [],
    photos: user?.photos || [],
    bio: user?.bio || "",
    prompts: (user?.prompts?.length ? user.prompts : [{ q: "", a: "" }]),
    // Detail fields
    height_cm: user?.height_cm ?? "",
    has_children: user?.has_children || "",
    // Privacy switches — respect existing values, sensible defaults
    show_height: user?.show_height ?? false,
    show_children: user?.show_children ?? true,
    show_zodiac: user?.show_zodiac ?? false,
    show_modes: user?.show_modes ?? true,
  });
  const [locationDraft, setLocationDraft] = useState(initialLocation);
  const [emailPrefs, setEmailPrefs] = useState({ matches_messages: true, weekly_summary: true, plan_reminders: true });
  useEffect(() => {
    api.get("/profile/email-preferences").then((r) => setEmailPrefs(r.data)).catch(() => {});
  }, []);
  const patchEmailPref = async (key, val) => {
    setEmailPrefs((prev) => ({ ...prev, [key]: val }));
    try {
      await api.patch("/profile/email-preferences", { [key]: val });
    } catch {
      toast.error("No pudimos guardar tu preferencia");
    }
  };
  const [locationChanged, setLocationChanged] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const [acts, setActs] = useState([]);
  const fileRef = useRef(null);

  useEffect(() => { api.get("/activities").then((r)=>setActs(r.data)); }, []);

  const toggle = (arr, v) => arr.includes(v) ? arr.filter((x)=>x!==v) : [...arr, v];

  const upload = async (file) => {
    if (!file) return;
    const compressed = await compressImage(file);
    const fd = new FormData(); fd.append("file", compressed);
    try { const { data } = await api.post("/uploads/photo", fd, { headers: {"Content-Type": "multipart/form-data"} }); set("photos", [...f.photos, data.path]); }
    catch (ex) { toast.error(formatApiError(ex.response?.data?.detail)); }
  };

  const save = async () => {
    try {
      const payload = { ...f };
      // Coerce height_cm to number|null so the API accepts it
      if (payload.height_cm === "" || payload.height_cm == null) {
        delete payload.height_cm;
      } else {
        payload.height_cm = Number(payload.height_cm);
      }
      if (!payload.has_children) delete payload.has_children;
      // Literal fields on backend: empty string is not a valid value → strip it
      if (!payload.sober_time) delete payload.sober_time;
      if (!payload.relationship_with_substances) delete payload.relationship_with_substances;
      // Filter out empty prompts; server enforces 1..6 non-empty
      payload.prompts = f.prompts.filter((p) => (p.q || "").trim() && (p.a || "").trim());
      if (payload.prompts.length < 1) {
        toast.error("Deja al menos 1 frase con pregunta y respuesta");
        return;
      }
      // Only include location when the user explicitly changed it. This avoids
      // silently pushing GPS coordinates back to the comuna centroid on every save.
      if (locationChanged && locationDraft) {
        payload.location = {
          country: (locationDraft.country || "CL").toUpperCase(),
          city: locationDraft.city || locationDraft.comuna,
          comuna: locationDraft.comuna,
          coords: locationDraft.coords, // may be undefined for manual → server derives
        };
        payload.comuna = locationDraft.comuna;
      }
      await api.patch("/profile/me", payload);
      await refresh();
      toast.success("Perfil actualizado");
      nav("/app/perfil");
    } catch (ex) {
      toast.error(formatApiError(ex.response?.data?.detail));
    }
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

        <LocationPicker
          value={locationDraft}
          onChange={(loc)=>{ setLocationDraft(loc); setLocationChanged(true); }}
        />

        <div>
          <label className="text-sm text-white/60 mb-2 block">Sobre mí</label>
          <textarea
            data-testid="edit-bio"
            className="ps-input"
            maxLength={300}
            rows={3}
            placeholder="Cuéntale a la comunidad quién eres y qué buscas…"
            value={f.bio}
            onChange={(e)=>set("bio", e.target.value)}
          />
          <p className="text-xs text-white/40 text-right mt-1">{f.bio.length}/300</p>
        </div>

        <div>
          <label className="text-sm text-white/60 mb-2 block">Modos activos</label>
          <div className="grid grid-cols-2 gap-2">
            {MODES.map((m) => {
              const on = f.modes.includes(m.v);
              const I = MODE_ICON[m.v];
              return (
                <button key={m.v} data-testid={`edit-mode-${m.v}`} onClick={()=>set("modes", toggle(f.modes, m.v))}
                  className={`p-3 rounded-2xl border text-left transition ${on ? "ps-gradient border-transparent text-white" : "bg-white/5 border-white/[.16] text-[#C7CBD6]"}`}>
                  {I && <I size={18} strokeWidth={1.9}/>}
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
            {acts.filter((a) => !a.is_virtual).map((a) => {
              const on = f.favorite_activities.includes(a.id);
              return (
                <button key={a.id} onClick={()=>set("favorite_activities", toggle(f.favorite_activities, a.id))}
                  className={`p-2.5 rounded-2xl border text-left text-sm ${on ? "ps-gradient border-transparent text-white" : "bg-white/5 border-white/[.16] text-[#C7CBD6]"}`}>
                  <Icon name={iconForActivity(a)} size={18} strokeWidth={1.9}/>
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
          <label className="text-sm text-white/60 mb-2 block">Tu relación con el alcohol y las drogas</label>
          <div className="space-y-2">
            {[
              {v:"sin_consumo", l:"Vivo sin alcohol ni drogas"},
              {v:"en_proceso", l:"Estoy en proceso de dejarlo"},
              {v:"sin_problema", l:"No tengo problemas con dependencias"},
              {v:"prefiero_no_decir", l:"Prefiero no decir"},
            ].map((o) => (
              <button type="button" key={o.v} data-testid={`edit-rel-${o.v}`}
                onClick={()=>set("relationship_with_substances", o.v)}
                className={`w-full text-left px-4 py-3 rounded-2xl border transition ${f.relationship_with_substances===o.v ? "ps-gradient border-transparent" : "bg-white/5 border-white/10"}`}>
                {o.l}
              </button>
            ))}
          </div>
          {f.relationship_with_substances === "sin_problema" && (
            <label className="flex items-center gap-3 mt-3 text-sm">
              <input
                type="checkbox"
                data-testid="edit-show-relationship"
                className="w-5 h-5 accent-[#4ADE80]"
                checked={f.show_relationship}
                onChange={(e)=>set("show_relationship", e.target.checked)}
              />
              Mostrar en mi perfil
            </label>
          )}
        </div>

        {f.relationship_with_substances !== "sin_problema" && f.relationship_with_substances !== "prefiero_no_decir" && (
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
        )}

        <div>
          <label className="text-sm text-white/60 mb-2 block">Tus frases <span className="text-white/40">(1–6)</span></label>
          <div className="space-y-3">
            {f.prompts.map((p, idx) => (
              <div key={idx} className="ps-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="ps-lab"><PencilLine size={12} strokeWidth={1.9}/> Frase {idx + 1}</span>
                  {f.prompts.length > 1 && (
                    <button
                      type="button"
                      data-testid={`edit-prompt-remove-${idx}`}
                      onClick={()=>set("prompts", f.prompts.filter((_,i)=>i!==idx))}
                      className="text-white/40 hover:text-white/80 transition"
                      aria-label="Quitar frase"
                    >
                      <X size={16} strokeWidth={1.9}/>
                    </button>
                  )}
                </div>
                <select data-testid={`edit-prompt-q-${idx}`} className="ps-input" value={p.q} onChange={(e)=>{const c=[...f.prompts];c[idx]={...c[idx], q:e.target.value};set("prompts", c);}}>
                  <option value="">Pregunta…</option>
                  {PROMPTS.filter((q)=>q===p.q || !f.prompts.some((pp,i)=>i!==idx && pp.q===q)).map((q)=><option key={q} value={q}>{q}</option>)}
                </select>
                <textarea data-testid={`edit-prompt-a-${idx}`} maxLength={150} rows={2} className="ps-input" value={p.a} onChange={(e)=>{const c=[...f.prompts];c[idx]={...c[idx], a:e.target.value};set("prompts", c);}}/>
                <p className="text-xs text-white/40 text-right">{(p.a || "").length}/150</p>
              </div>
            ))}
            {f.prompts.length < 6 && (
              <button
                type="button"
                data-testid="edit-prompt-add"
                onClick={()=>set("prompts", [...f.prompts, { q: "", a: "" }])}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-white/20 text-white/70 hover:bg-white/5 transition"
              >
                <Plus size={16} strokeWidth={2}/> Agregar otra frase
              </button>
            )}
          </div>
        </div>

        <div data-testid="edit-details-section">
          <label className="text-sm text-white/60 mb-2 block">Detalles sobre ti</label>
          <div className="ps-card p-4 space-y-4">
            <div>
              <label className="text-xs text-white/60 mb-2 block">Estatura (cm)</label>
              <div className="flex items-center gap-3">
                <input
                  data-testid="edit-height"
                  type="number"
                  min={140}
                  max={210}
                  inputMode="numeric"
                  className="ps-input flex-1"
                  placeholder="ej: 170"
                  value={f.height_cm}
                  onChange={(e)=>set("height_cm", e.target.value)}
                />
                <span className="text-white/60 text-sm">cm</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-white/60 mb-2 block">Hijos</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: "si", l: "Tengo" },
                  { v: "no", l: "No tengo" },
                  { v: "prefiero_no_decir", l: "Prefiero no decir" },
                ].map((o) => (
                  <button
                    type="button"
                    key={o.v}
                    data-testid={`edit-children-${o.v}`}
                    onClick={()=>set("has_children", f.has_children === o.v ? "" : o.v)}
                    className={`px-3 py-2.5 rounded-2xl text-xs font-semibold border transition ${f.has_children === o.v ? "ps-gradient border-transparent text-white" : "bg-white/5 border-white/[.16] text-[#C7CBD6]"}`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            {user?.zodiac && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/60">Signo zodiacal</p>
                  <p className="font-display text-lg font-black text-white mt-0.5">{user.zodiac}</p>
                </div>
                <span className="text-[10px] text-white/40">Se calcula por tu fecha de nacimiento</span>
              </div>
            )}
          </div>
        </div>

        <div data-testid="edit-privacy-section">
          <label className="text-sm text-white/60 mb-2 block">Qué se muestra en mi perfil</label>
          <div className="ps-card p-4 space-y-3">
            {[
              { key: "show_height", label: "Mi estatura", test: "toggle-show-height" },
              { key: "show_children", label: "Si tengo hijos", test: "toggle-show-children" },
              { key: "show_zodiac", label: "Mi signo zodiacal", test: "toggle-show-zodiac" },
              { key: "show_modes", label: "Los modos que activé (Apoyo/Amistad/Amor)", test: "toggle-show-modes" },
            ].map((sw) => (
              <label key={sw.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-white/85">{sw.label}</span>
                <input
                  type="checkbox"
                  data-testid={sw.test}
                  className="w-5 h-5 accent-[#8B5CF6]"
                  checked={!!f[sw.key]}
                  onChange={(e)=>set(sw.key, e.target.checked)}
                />
              </label>
            ))}
          </div>
        </div>

        <button data-testid="save-profile" onClick={save} className="ps-btn-primary w-full mt-4">Guardar</button>

        <div data-testid="edit-email-prefs" className="mt-6">
          <label className="text-sm text-white/60 mb-2 block">Correos que quiero recibir</label>
          <div className="ps-card p-4 space-y-3">
            <div className="inline-flex items-center gap-2 text-white/80 text-xs">
              <Mail size={14} strokeWidth={1.9}/> Puedes activar o desactivar cada tipo cuando quieras.
            </div>
            {[
              { key: "matches_messages", label: "Matches y mensajes" },
              { key: "plan_reminders", label: "Recordatorios de planes" },
              { key: "weekly_summary", label: "Resumen semanal" },
            ].map((p) => (
              <label key={p.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-white/85">{p.label}</span>
                <input
                  type="checkbox"
                  data-testid={`toggle-email-${p.key}`}
                  className="w-5 h-5 accent-[#8B5CF6]"
                  checked={!!emailPrefs[p.key]}
                  onChange={(e)=>patchEmailPref(p.key, e.target.checked)}
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
