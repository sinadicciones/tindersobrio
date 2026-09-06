import { useState, useMemo } from "react";
import { toast } from "sonner";
import { MapPin, Check, Edit2, Globe } from "lucide-react";
import { COMUNAS_RM } from "@/constants/comunas";
import { COUNTRIES } from "@/constants/countries";
import { getGpsCoords, reverseGeocode } from "@/lib/geo";

// Ciudades sugeridas por país — para autocomplete rápido. Duplicado del backend
// (core/geo_seed.py::COUNTRIES_SEED). Los usuarios pueden escribir libremente.
const CITIES_BY_COUNTRY = {
  CL: ["Santiago","Viña del Mar","Valparaíso","Concepción","La Serena","Antofagasta","Temuco","Rancagua","Talca","Puerto Montt","Valdivia","Iquique","Arica","Chillán","Osorno","Copiapó","Punta Arenas"],
  AR: ["Buenos Aires","Córdoba","Rosario","Mendoza","La Plata","Mar del Plata","San Miguel de Tucumán","Salta","Neuquén","Bariloche"],
  CO: ["Bogotá","Medellín","Cali","Barranquilla","Cartagena","Bucaramanga","Pereira","Santa Marta"],
  MX: ["Ciudad de México","Guadalajara","Monterrey","Puebla","Tijuana","León","Querétaro","Mérida","Cancún","Oaxaca"],
  PE: ["Lima","Arequipa","Trujillo","Cusco","Chiclayo","Piura"],
  ES: ["Madrid","Barcelona","Valencia","Sevilla","Zaragoza","Málaga","Bilbao","Palma"],
  US: ["Miami","Los Ángeles","Nueva York","Chicago","Houston","San Antonio","Phoenix"],
  VE: ["Caracas","Maracaibo","Valencia","Barquisimeto"],
  EC: ["Quito","Guayaquil","Cuenca"],
  GT: ["Ciudad de Guatemala","Quetzaltenango"],
  BO: ["La Paz","Santa Cruz","Cochabamba","Sucre"],
  CU: ["La Habana","Santiago de Cuba"],
  DO: ["Santo Domingo","Santiago de los Caballeros","Punta Cana"],
  HN: ["Tegucigalpa","San Pedro Sula"],
  PY: ["Asunción","Ciudad del Este"],
  SV: ["San Salvador","Santa Ana"],
  NI: ["Managua","León","Granada"],
  CR: ["San José","Alajuela","Heredia"],
  PA: ["Ciudad de Panamá","David"],
  UY: ["Montevideo","Punta del Este","Salto"],
  PR: ["San Juan","Ponce"],
  GQ: ["Malabo","Bata"],
};

/**
 * LocationPicker — multi-país. Usado por Onboarding + EditProfile.
 *
 * Flujo:
 *  1. Muestra CTA con explicación antes de pedir GPS.
 *  2. Detecta con GPS + reverse-geocode (BigDataCloud). Pantalla de confirmación.
 *  3. Alternativa: selector manual de país (22) + ciudad. Solo en CL agregamos
 *     el selector de comuna.
 *
 * `value`  → { country, city, comuna, coords: [lng,lat], source }
 */
export default function LocationPicker({ value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualCountry, setManualCountry] = useState((value?.country || "CL").toUpperCase());
  const [manualCity, setManualCity] = useState(value?.city || (value?.country === "CL" ? "Santiago" : ""));
  const [manualComuna, setManualComuna] = useState(value?.comuna || "");

  const isCL = (code) => (code || "").toUpperCase() === "CL";
  const currentCities = useMemo(() => CITIES_BY_COUNTRY[manualCountry] || [], [manualCountry]);

  const detect = async () => {
    setBusy(true);
    try {
      const gps = await getGpsCoords({ timeoutMs: 8000 });
      const rev = await reverseGeocode(gps.lat, gps.lng).catch(() => null);
      const detected = {
        country: (rev?.country || "CL").toUpperCase(),
        city: rev?.city || rev?.comuna || null,
        // Solo Chile guarda comuna a nivel de datos
        comuna: (rev?.country || "").toUpperCase() === "CL" ? (rev?.comuna || rev?.city || null) : null,
        coords: [gps.lng, gps.lat],
        source: "gps",
      };
      setPending(detected);
    } catch (ex) {
      const denied = ex && (ex.code === 1 || /denied/i.test(ex.message || ""));
      toast.error(denied
        ? "Necesitamos el permiso de ubicación. También puedes elegirla a mano."
        : "No pudimos obtener tu ubicación. Elígela a mano.");
      setManualMode(true);
    } finally { setBusy(false); }
  };

  const confirm = () => {
    if (!pending) return;
    // Multi-país: aceptamos cualquier país habilitado. El fallback a manual queda
    // por si el GPS no devuelve una ciudad clara.
    if (!pending.city && !pending.comuna) {
      // GPS resolvió el país pero no la ciudad — abrir manual con país precargado.
      setManualCountry(pending.country || "CL");
      setPending(null);
      setManualMode(true);
      return;
    }
    onChange(pending);
    setPending(null);
  };

  const applyManual = () => {
    const country = (manualCountry || "CL").toUpperCase();
    let city = (manualCity || "").trim();
    let comuna = null;
    if (isCL(country)) {
      // En Chile priorizamos comuna (heredado). Si eligió Santiago exige comuna;
      // otra ciudad → usar la ciudad como comuna a nivel visual.
      if (manualCity === "Santiago") {
        if (!manualComuna) return;
        comuna = manualComuna;
      } else {
        comuna = manualCity;
      }
    } else {
      if (!city) return;
    }
    onChange({ country, city: city || comuna, comuna, source: "manual" });
    setManualMode(false);
  };

  // Ya elegida
  if ((value?.comuna || value?.city) && !pending && !manualMode) {
    const country = COUNTRIES.find((c) => c.code === (value.country || "").toUpperCase());
    return (
      <div className="ps-card p-4 space-y-3" data-testid="location-current">
        <p className="text-xs uppercase tracking-wider text-white/50">Mi ubicación</p>
        <p className="flex items-center gap-2 font-display text-lg" data-testid="location-display">
          <MapPin size={18} className="text-[#FF6B5E]"/>
          <span>
            {value.comuna || value.city}
            {value.city && value.comuna && value.city !== value.comuna ? `, ${value.city}` : ""}
            {country && ` · ${country.flag} ${country.name}`}
          </span>
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

  // Pantalla de confirmación de GPS
  if (pending) {
    const country = COUNTRIES.find((c) => c.code === pending.country);
    return (
      <div className="ps-card p-5 space-y-4" data-testid="location-confirm">
        <p className="text-xs uppercase tracking-wider text-white/50">Detectamos</p>
        <p className="flex items-center gap-2 font-display text-2xl font-black" data-testid="location-detected">
          <MapPin size={22} className="text-[#FF6B5E]"/>
          <span>
            {pending.comuna || pending.city || (country?.name || "Ubicación")}
            {country && ` · ${country.flag} ${country.name}`}
          </span>
        </p>
        <p className="text-sm text-white/60">¿Es correcto?</p>
        <div className="flex gap-2">
          <button type="button" data-testid="location-confirm-btn" onClick={confirm} className="ps-btn-primary flex-1 flex items-center justify-center gap-2">
            <Check size={16}/> Confirmar
          </button>
          <button type="button" data-testid="location-correct-btn" onClick={()=>{ setManualCountry(pending.country || "CL"); setPending(null); setManualMode(true); }} className="ps-btn-secondary flex-1">
            Corregir a mano
          </button>
        </div>
      </div>
    );
  }

  // Manual — selector país + ciudad
  if (manualMode) {
    const clSelected = isCL(manualCountry);
    return (
      <div className="ps-card p-5 space-y-4" data-testid="location-manual-picker">
        <p className="text-xs uppercase tracking-wider text-white/50">Elige tu ubicación</p>

        <div>
          <label className="text-sm text-white/60 mb-2 block">País</label>
          <select
            data-testid="manual-country"
            className="ps-input"
            value={manualCountry}
            onChange={(e)=>{
              setManualCountry(e.target.value);
              // Reset ciudad/comuna al cambiar de país
              const firstCity = CITIES_BY_COUNTRY[e.target.value]?.[0] || "";
              setManualCity(firstCity);
              setManualComuna("");
            }}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-white/60 mb-2 block">Ciudad</label>
          <input
            data-testid="manual-city"
            list={`cities-${manualCountry}`}
            className="ps-input"
            value={manualCity}
            onChange={(e)=>setManualCity(e.target.value)}
            placeholder={currentCities[0] || "Escribe tu ciudad"}
          />
          <datalist id={`cities-${manualCountry}`}>
            {currentCities.map((c) => <option key={c} value={c}/>)}
          </datalist>
        </div>

        {clSelected && manualCity === "Santiago" && (
          <div>
            <label className="text-sm text-white/60 mb-2 block">Comuna</label>
            <select data-testid="manual-comuna" className="ps-input" value={manualComuna} onChange={(e)=>setManualComuna(e.target.value)}>
              <option value="">Elige…</option>
              {COMUNAS_RM.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            data-testid="manual-apply"
            onClick={applyManual}
            disabled={clSelected ? (manualCity === "Santiago" && !manualComuna) : !manualCity.trim()}
            className="ps-btn-primary flex-1 disabled:opacity-50"
          >
            Usar esta
          </button>
          <button type="button" onClick={()=>setManualMode(false)} className="ps-btn-secondary flex-1">Cancelar</button>
        </div>
      </div>
    );
  }

  // CTA inicial
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
        className="w-full text-white/60 hover:text-white/90 text-sm underline decoration-white/20 flex items-center justify-center gap-1.5">
        <Globe size={14}/> Prefiero elegir país y ciudad a mano
      </button>
    </div>
  );
}
