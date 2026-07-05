export const COMUNAS_RM = [
  "Cerrillos", "Cerro Navia", "Conchalí", "El Bosque", "Estación Central",
  "Huechuraba", "Independencia", "La Cisterna", "La Florida", "La Granja",
  "La Pintana", "La Reina", "Las Condes", "Lo Barnechea", "Lo Espejo",
  "Lo Prado", "Macul", "Maipú", "Ñuñoa", "Pedro Aguirre Cerda",
  "Peñalolén", "Providencia", "Pudahuel", "Quilicura", "Quinta Normal",
  "Recoleta", "Renca", "San Joaquín", "San Miguel", "San Ramón",
  "Santiago", "Vitacura", "Puente Alto", "San Bernardo", "Otra región",
];

export const PROMPTS = [
  "Mi plan ideal sin alcohol es…",
  "Lo que estoy construyendo en esta etapa…",
  "Un panorama que descubrí…",
  "Me hace bien cuando…",
  "Mi domingo perfecto…",
];

export const GENDERS = [
  { v: "femenino", l: "Femenino" },
  { v: "masculino", l: "Masculino" },
  { v: "no_binario", l: "No binario" },
  { v: "prefiero_no_decir", l: "Prefiero no decir" },
];

export const SOBER_TIMES = [
  { v: "<30d", l: "Menos de 30 días" },
  { v: "1-3m", l: "1 a 3 meses" },
  { v: "3-12m", l: "3 a 12 meses" },
  { v: ">1a", l: "Más de 1 año" },
  { v: ">5a", l: "Más de 5 años" },
];

export const MODES = [
  { v: "apoyo",   l: "Apoyo",   emoji: "🤝", icon: "HeartHandshake", color: "#38BDF8", desc: "Compañeros de proceso" },
  { v: "amistad", l: "Amistad", emoji: "🙂", icon: "Smile",          color: "#FBBF24", desc: "Amigues para panoramas" },
  { v: "amor",    l: "Amor",    emoji: "❤️", icon: "Heart",          color: "#FF6B5E", desc: "Citas con intención romántica" },
  { v: "grupos",  l: "Grupos",  emoji: "👥", icon: "Users",          color: "#8B5CF6", desc: "Actividades y comunidades" },
];

export const REPORT_CATEGORIES = [
  { v: "ofrece_sustancias", l: "Ofrece alcohol o drogas" },
  { v: "acoso", l: "Acoso o presión" },
  { v: "perfil_falso", l: "Perfil falso" },
  { v: "mala_conducta_cita", l: "Mala conducta en una cita" },
  { v: "otro", l: "Otro" },
];

export const modeColor = (mode) => {
  const m = MODES.find((x) => x.v === mode);
  return m ? m.color : "#FF6B5E";
};

export const soberLabel = (v) => SOBER_TIMES.find((s) => s.v === v)?.l || v;
