// 22 países hispanohablantes habilitados en PlanSobrio (Bloque 1 expansión).
// Sincronizado con /app/backend/core/geo_seed.py::COUNTRIES_SEED.
export const COUNTRIES = [
  { code: "CL", name: "Chile",                   flag: "🇨🇱", timezone: "America/Santiago",             like_verb: "me tinca",   verified_helplines: true },
  { code: "AR", name: "Argentina",               flag: "🇦🇷", timezone: "America/Argentina/Buenos_Aires", like_verb: "me copa",    verified_helplines: true },
  { code: "CO", name: "Colombia",                flag: "🇨🇴", timezone: "America/Bogota",               like_verb: "me suena",   verified_helplines: true },
  { code: "MX", name: "México",                  flag: "🇲🇽", timezone: "America/Mexico_City",          like_verb: "me late",    verified_helplines: true },
  { code: "PE", name: "Perú",                    flag: "🇵🇪", timezone: "America/Lima",                 like_verb: "me provoca", verified_helplines: true },
  { code: "ES", name: "España",                  flag: "🇪🇸", timezone: "Europe/Madrid",                like_verb: "me gusta el plan", verified_helplines: false },
  { code: "US", name: "Estados Unidos",          flag: "🇺🇸", timezone: "America/New_York",             like_verb: "me gusta el plan", verified_helplines: false },
  { code: "VE", name: "Venezuela",               flag: "🇻🇪", timezone: "America/Caracas",              like_verb: "me gusta el plan", verified_helplines: false },
  { code: "EC", name: "Ecuador",                 flag: "🇪🇨", timezone: "America/Guayaquil",            like_verb: "me gusta el plan", verified_helplines: false },
  { code: "GT", name: "Guatemala",               flag: "🇬🇹", timezone: "America/Guatemala",            like_verb: "me gusta el plan", verified_helplines: false },
  { code: "BO", name: "Bolivia",                 flag: "🇧🇴", timezone: "America/La_Paz",               like_verb: "me gusta el plan", verified_helplines: false },
  { code: "CU", name: "Cuba",                    flag: "🇨🇺", timezone: "America/Havana",               like_verb: "me gusta el plan", verified_helplines: false },
  { code: "DO", name: "República Dominicana",    flag: "🇩🇴", timezone: "America/Santo_Domingo",        like_verb: "me gusta el plan", verified_helplines: false },
  { code: "HN", name: "Honduras",                flag: "🇭🇳", timezone: "America/Tegucigalpa",          like_verb: "me gusta el plan", verified_helplines: false },
  { code: "PY", name: "Paraguay",                flag: "🇵🇾", timezone: "America/Asuncion",             like_verb: "me gusta el plan", verified_helplines: false },
  { code: "SV", name: "El Salvador",             flag: "🇸🇻", timezone: "America/El_Salvador",          like_verb: "me gusta el plan", verified_helplines: false },
  { code: "NI", name: "Nicaragua",               flag: "🇳🇮", timezone: "America/Managua",              like_verb: "me gusta el plan", verified_helplines: false },
  { code: "CR", name: "Costa Rica",              flag: "🇨🇷", timezone: "America/Costa_Rica",           like_verb: "me gusta el plan", verified_helplines: false },
  { code: "PA", name: "Panamá",                  flag: "🇵🇦", timezone: "America/Panama",               like_verb: "me gusta el plan", verified_helplines: false },
  { code: "UY", name: "Uruguay",                 flag: "🇺🇾", timezone: "America/Montevideo",           like_verb: "me gusta el plan", verified_helplines: false },
  { code: "PR", name: "Puerto Rico",             flag: "🇵🇷", timezone: "America/Puerto_Rico",          like_verb: "me gusta el plan", verified_helplines: false },
  { code: "GQ", name: "Guinea Ecuatorial",       flag: "🇬🇶", timezone: "Africa/Malabo",                like_verb: "me gusta el plan", verified_helplines: false },
];

/** Localized "like" verb — the microcopy shown in the swipe deck's tinca button.
 * Chile/Argentina/México/Colombia/Perú have their own slang; the rest use neutral. */
export function likeVerbForCountry(code) {
  const c = (code || "").toUpperCase();
  return COUNTRIES.find((x) => x.code === c)?.like_verb || "me gusta el plan";
}

/** Country name lookup with graceful fallback. */
export function countryName(code) {
  const c = (code || "").toUpperCase();
  return COUNTRIES.find((x) => x.code === c)?.name || c || "tu país";
}

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code);
