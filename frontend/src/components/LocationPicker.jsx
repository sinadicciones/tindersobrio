import { useState } from "react";
import { toast } from "sonner";
import { MapPin, Check, Edit2 } from "lucide-react";
import { COMUNAS_RM } from "@/constants/comunas";
import { getGpsCoords, reverseGeocode } from "@/lib/geo";

/**
 * LocationPicker — one component used by Onboarding + EditProfile.
 *
 * Behavior:
 *  1. Show a friendly disclaimer BEFORE asking for GPS permission.
 *  2. When the user taps "Usar mi ubicación": request GPS, reverse-geocode with
 *     the actual coords via BigDataCloud (NOT IP), then show a confirmation.
 *  3. Fallback: manual city/comuna picker (Chile catalog).
 *
 * `value`  → { country, city, comuna, coords: [lng,lat], source }
 * `onChange(value)` fires whenever a location is picked/confirmed.
 * `onOutsideChile()` optional: called when a detected/picked country isn't CL.
 */
export default function LocationPicker({ value, onChange, onOutsideChile }) {
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null); // { country, city, comuna, coords }
  const [manualMode, setManualMode] = useState(false);
  const [manualCity, setManualCity] = useState("Santiago");
  const [manualComuna, setManualComuna] = useState(value?.comuna || "");

  const detect = async () => {
    setBusy(true);
    try {
      const gps = await getGpsCoords({ timeoutMs: 8000 });
      const rev = await reverseGeocode(gps.lat, gps.lng).catch(() => null);
      const detected = {
        country: (rev?.country || "CL").toUpperCase(),
        city: rev?.city || null,
        comuna: rev?.comuna || rev?.city || null,
        coords: [gps.lng, gps.lat],
        source: "gps",
      };
      setPending(detected);
    } catch (ex) {
      const denied = ex && (ex.code === 1 || /denied/i.test(ex.message || ""));
      toast.error(denied
        ? "Necesitamos el permiso de ubicación. Puedes también elegirla a mano."
        : "No pudimos obtener tu ubicación. Elígela a mano.");
      setManualMode(true);
    } finally { setBusy(false); }
  };

  const confirm = () => {
    if (!pending) return;
    if (pending.country !== "CL" && onOutsideChile) {
      onOutsideChile(pending);
      return;
    }
    onChange(pending);
    setPending(null);
  };

  const applyManual = () => {
    if (!manualComuna) return;
    onChange({ country: "CL", city: manualCity, comuna: manualComuna, source: "manual" });
    setManualMode(false);
  };

  // Already picked
  if (value?.comuna && !pending && !manualMode) {
    return (
      <div className="ps-card p-4 space-y-3" data-testid="location-current">
        <p className="text-xs uppercase tracking-wider text-white/50">Mi ubicación</p>
        <p className="flex items-center gap-2 font-display text-lg">
          <MapPin size={18} className="text-[#FF6B5E]"/>
          {value.comuna}{value.city && value.city !== value.comuna ? `, ${value.city}` : ""}
          {value.country && value.country !== "CL" && ` · ${value.country}`}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" data-testid="location-refresh" onClick={detect}
            className="ps-btn-secondary flex-1 min-w-[140px] flex items-center justify-center gap-2 text-sm">
            <MapPin size={14}/> Actualizar con mi ubicación
          </button>
          <button type="button" data-testid="location-manual" onClick={()=>setManualMode(true)}
            className="ps-btn-secondary flex-1 min-w-[120px] flex items-center justify-center gap-2 text-sm">
            <Edit2 size={14}/> Elegir a mano
          </button>
        </div>
      </div>
    );
  }

  // Confirmation card
  if (pending) {
    return (
      <div className="ps-card p-5 space-y-4" data-testid="location-confirm">
        <p className="text-xs uppercase tracking-wider text-white/50">Detectamos</p>
        <p className="flex items-center gap-2 font-display text-2xl font-black">
          <MapPin size={22} className="text-[#FF6B5E]"/>
          {pending.comuna || pending.city || "Ubicación"}
          {pending.country && pending.country !== "CL" && ` · ${pending.country}`}
        </p>
        <p className="text-sm text-white/60">¿Es correcto?</p>
        <div className="flex gap-2">
          <button type="button" data-testid="location-confirm-btn" onClick={confirm} className="ps-btn-primary flex-1 flex items-center justify-center gap-2">
            <Check size={16}/> Confirmar
          </button>
          <button type="button" data-testid="location-correct-btn" onClick={()=>{ setPending(null); setManualMode(true); }} className="ps-btn-secondary flex-1">
            Corregir a mano
          </button>
        </div>
      </div>
    );
  }

  // Manual picker
  if (manualMode) {
    return (
      <div className="ps-card p-5 space-y-4" data-testid="location-manual-picker">
        <p className="text-xs uppercase tracking-wider text-white/50">Elige tu ubicación</p>
        <div>
          <label className="text-sm text-white/60 mb-2 block">Ciudad</label>
          <select data-testid="manual-city" className="ps-input" value={manualCity} onChange={(e)=>setManualCity(e.target.value)}>
            {["Santiago","Viña del Mar","Valparaíso","Concepción","La Serena","Antofagasta","Temuco","Rancagua","Talca","Puerto Montt","Valdivia","Iquique","Arica","Chillán","Osorno","Copiapó","Punta Arenas"].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        {manualCity === "Santiago" && (
          <div>
            <label className="text-sm text-white/60 mb-2 block">Comuna</label>
            <select data-testid="manual-comuna" className="ps-input" value={manualComuna} onChange={(e)=>setManualComuna(e.target.value)}>
              <option value="">Elige…</option>
              {COMUNAS_RM.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
        <div className="flex gap-2">
          <button type="button" data-testid="manual-apply" onClick={()=>{ if (manualCity !== "Santiago") { setManualComuna(manualCity); } applyManual(); }}
            disabled={manualCity==="Santiago" && !manualComuna}
            className="ps-btn-primary flex-1 disabled:opacity-50">Usar esta</button>
          <button type="button" onClick={()=>setManualMode(false)} className="ps-btn-secondary flex-1">Cancelar</button>
        </div>
      </div>
    );
  }

  // Initial CTA
  return (
    <div className="ps-card p-5 space-y-4" data-testid="location-initial">
      <p className="text-sm text-white/70 leading-relaxed">
        Usamos tu ubicación <span className="font-semibold text-white">solo</span> para mostrarte gente y planes cerca de ti.
        Nunca compartimos tu ubicación exacta con otras personas.
      </p>
      <button type="button" data-testid="location-gps" disabled={busy} onClick={detect}
        className="ps-btn-primary w-full flex items-center justify-center gap-2">
        <MapPin size={18}/> {busy ? "Buscando…" : "Usar mi ubicación"}
      </button>
      <button type="button" data-testid="location-prefer-manual" onClick={()=>setManualMode(true)}
        className="w-full text-white/60 hover:text-white/90 text-sm underline decoration-white/20">
        Prefiero elegirla a mano
      </button>
    </div>
  );
}
