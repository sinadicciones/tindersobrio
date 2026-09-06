"""RM commune centroids + country/city catalog + helplines seed.

22 países hispanohablantes habilitados. Solo 5 tienen helplines verificadas
(CL, AR, CO, MX, PE). Los 16 restantes se siembran sin helplines — el frontend
muestra un fallback seguro hasta que Nelson/equipo verifique cada país.
"""

# Approximate centroids [lng, lat] for Región Metropolitana comunas (rounded ~1km).
RM_CENTROIDS = {
    "Cerrillos": [-70.72, -33.50],
    "Cerro Navia": [-70.72, -33.42],
    "Conchalí": [-70.68, -33.38],
    "El Bosque": [-70.68, -33.56],
    "Estación Central": [-70.69, -33.46],
    "Huechuraba": [-70.65, -33.36],
    "Independencia": [-70.66, -33.42],
    "La Cisterna": [-70.66, -33.53],
    "La Florida": [-70.60, -33.53],
    "La Granja": [-70.63, -33.54],
    "La Pintana": [-70.63, -33.58],
    "La Reina": [-70.55, -33.44],
    "Las Condes": [-70.55, -33.41],
    "Lo Barnechea": [-70.52, -33.35],
    "Lo Espejo": [-70.68, -33.52],
    "Lo Prado": [-70.72, -33.44],
    "Macul": [-70.60, -33.49],
    "Maipú": [-70.75, -33.51],
    "Ñuñoa": [-70.60, -33.46],
    "Pedro Aguirre Cerda": [-70.68, -33.49],
    "Peñalolén": [-70.55, -33.48],
    "Providencia": [-70.61, -33.43],
    "Pudahuel": [-70.74, -33.43],
    "Quilicura": [-70.72, -33.36],
    "Quinta Normal": [-70.70, -33.43],
    "Recoleta": [-70.65, -33.40],
    "Renca": [-70.72, -33.40],
    "San Joaquín": [-70.63, -33.49],
    "San Miguel": [-70.65, -33.50],
    "San Ramón": [-70.65, -33.54],
    "Santiago": [-70.65, -33.44],
    "Vitacura": [-70.58, -33.38],
    "Puente Alto": [-70.58, -33.61],
    "San Bernardo": [-70.71, -33.60],
}
SANTIAGO_CENTER = [-70.65, -33.44]

# Country catalog — 22 países hispanohablantes, todos enabled=True.
# `cities` es una lista de ciudades sugeridas (autocomplete). Los usuarios pueden
# escribir libremente, pero estas dan coords para el geoNear.
COUNTRIES_SEED = [
    # === Con helplines verificadas (5) ===
    {
        "code": "CL", "name": "Chile", "flag": "🇨🇱", "enabled": True,
        "timezone": "America/Santiago", "order": 1,
        "cities": [
            {"name": "Santiago", "coords": [-70.65, -33.45]},
            {"name": "Viña del Mar", "coords": [-71.55, -33.02]},
            {"name": "Valparaíso", "coords": [-71.63, -33.05]},
            {"name": "Concepción", "coords": [-73.05, -36.83]},
            {"name": "La Serena", "coords": [-71.25, -29.90]},
            {"name": "Antofagasta", "coords": [-70.40, -23.65]},
            {"name": "Temuco", "coords": [-72.60, -38.74]},
            {"name": "Rancagua", "coords": [-70.74, -34.17]},
            {"name": "Talca", "coords": [-71.66, -35.43]},
            {"name": "Puerto Montt", "coords": [-72.94, -41.47]},
            {"name": "Valdivia", "coords": [-73.24, -39.81]},
            {"name": "Iquique", "coords": [-70.14, -20.22]},
            {"name": "Arica", "coords": [-70.30, -18.48]},
            {"name": "Chillán", "coords": [-72.10, -36.61]},
            {"name": "Osorno", "coords": [-73.14, -40.57]},
            {"name": "Copiapó", "coords": [-70.33, -27.37]},
            {"name": "Punta Arenas", "coords": [-70.91, -53.16]},
        ],
    },
    {
        "code": "AR", "name": "Argentina", "flag": "🇦🇷", "enabled": True,
        "timezone": "America/Argentina/Buenos_Aires", "order": 2,
        "cities": [
            {"name": "Buenos Aires", "coords": [-58.38, -34.61]},
            {"name": "Córdoba", "coords": [-64.19, -31.42]},
            {"name": "Rosario", "coords": [-60.65, -32.95]},
            {"name": "Mendoza", "coords": [-68.85, -32.89]},
            {"name": "La Plata", "coords": [-57.95, -34.92]},
            {"name": "Mar del Plata", "coords": [-57.55, -38.00]},
            {"name": "San Miguel de Tucumán", "coords": [-65.21, -26.83]},
            {"name": "Salta", "coords": [-65.41, -24.79]},
            {"name": "Neuquén", "coords": [-68.06, -38.95]},
            {"name": "Bariloche", "coords": [-71.30, -41.13]},
        ],
    },
    {
        "code": "CO", "name": "Colombia", "flag": "🇨🇴", "enabled": True,
        "timezone": "America/Bogota", "order": 3,
        "cities": [
            {"name": "Bogotá", "coords": [-74.08, 4.71]},
            {"name": "Medellín", "coords": [-75.57, 6.24]},
            {"name": "Cali", "coords": [-76.53, 3.45]},
            {"name": "Barranquilla", "coords": [-74.80, 10.97]},
            {"name": "Cartagena", "coords": [-75.51, 10.39]},
            {"name": "Bucaramanga", "coords": [-73.13, 7.13]},
            {"name": "Pereira", "coords": [-75.69, 4.81]},
            {"name": "Santa Marta", "coords": [-74.20, 11.24]},
        ],
    },
    {
        "code": "MX", "name": "México", "flag": "🇲🇽", "enabled": True,
        "timezone": "America/Mexico_City", "order": 4,
        "cities": [
            {"name": "Ciudad de México", "coords": [-99.13, 19.43]},
            {"name": "Guadalajara", "coords": [-103.35, 20.66]},
            {"name": "Monterrey", "coords": [-100.30, 25.68]},
            {"name": "Puebla", "coords": [-98.20, 19.04]},
            {"name": "Tijuana", "coords": [-117.03, 32.53]},
            {"name": "León", "coords": [-101.68, 21.13]},
            {"name": "Querétaro", "coords": [-100.39, 20.59]},
            {"name": "Mérida", "coords": [-89.62, 20.97]},
            {"name": "Cancún", "coords": [-86.85, 21.16]},
            {"name": "Oaxaca", "coords": [-96.72, 17.07]},
        ],
    },
    {
        "code": "PE", "name": "Perú", "flag": "🇵🇪", "enabled": True,
        "timezone": "America/Lima", "order": 5,
        "cities": [
            {"name": "Lima", "coords": [-77.03, -12.05]},
            {"name": "Arequipa", "coords": [-71.54, -16.41]},
            {"name": "Trujillo", "coords": [-79.03, -8.11]},
            {"name": "Cusco", "coords": [-71.97, -13.52]},
            {"name": "Chiclayo", "coords": [-79.84, -6.77]},
            {"name": "Piura", "coords": [-80.63, -5.19]},
        ],
    },
    # === Sin helplines verificadas (17) — se muestran pero muestran fallback ===
    {
        "code": "ES", "name": "España", "flag": "🇪🇸", "enabled": True,
        "timezone": "Europe/Madrid", "order": 6,
        "cities": [
            {"name": "Madrid", "coords": [-3.70, 40.42]},
            {"name": "Barcelona", "coords": [2.17, 41.39]},
            {"name": "Valencia", "coords": [-0.38, 39.47]},
            {"name": "Sevilla", "coords": [-5.99, 37.39]},
            {"name": "Zaragoza", "coords": [-0.88, 41.65]},
            {"name": "Málaga", "coords": [-4.42, 36.72]},
            {"name": "Bilbao", "coords": [-2.93, 43.26]},
            {"name": "Palma", "coords": [2.65, 39.57]},
        ],
    },
    {
        "code": "US", "name": "Estados Unidos", "flag": "🇺🇸", "enabled": True,
        "timezone": "America/New_York", "order": 7,
        "cities": [
            {"name": "Miami", "coords": [-80.19, 25.76]},
            {"name": "Los Ángeles", "coords": [-118.24, 34.05]},
            {"name": "Nueva York", "coords": [-74.01, 40.71]},
            {"name": "Chicago", "coords": [-87.65, 41.85]},
            {"name": "Houston", "coords": [-95.37, 29.76]},
            {"name": "San Antonio", "coords": [-98.49, 29.42]},
            {"name": "Phoenix", "coords": [-112.07, 33.45]},
        ],
    },
    {
        "code": "VE", "name": "Venezuela", "flag": "🇻🇪", "enabled": True,
        "timezone": "America/Caracas", "order": 8,
        "cities": [
            {"name": "Caracas", "coords": [-66.91, 10.48]},
            {"name": "Maracaibo", "coords": [-71.65, 10.65]},
            {"name": "Valencia", "coords": [-68.01, 10.17]},
            {"name": "Barquisimeto", "coords": [-69.35, 10.07]},
        ],
    },
    {
        "code": "EC", "name": "Ecuador", "flag": "🇪🇨", "enabled": True,
        "timezone": "America/Guayaquil", "order": 9,
        "cities": [
            {"name": "Quito", "coords": [-78.47, -0.18]},
            {"name": "Guayaquil", "coords": [-79.90, -2.19]},
            {"name": "Cuenca", "coords": [-79.00, -2.90]},
        ],
    },
    {
        "code": "GT", "name": "Guatemala", "flag": "🇬🇹", "enabled": True,
        "timezone": "America/Guatemala", "order": 10,
        "cities": [
            {"name": "Ciudad de Guatemala", "coords": [-90.51, 14.63]},
            {"name": "Quetzaltenango", "coords": [-91.52, 14.83]},
        ],
    },
    {
        "code": "BO", "name": "Bolivia", "flag": "🇧🇴", "enabled": True,
        "timezone": "America/La_Paz", "order": 11,
        "cities": [
            {"name": "La Paz", "coords": [-68.15, -16.50]},
            {"name": "Santa Cruz", "coords": [-63.18, -17.78]},
            {"name": "Cochabamba", "coords": [-66.15, -17.39]},
            {"name": "Sucre", "coords": [-65.26, -19.05]},
        ],
    },
    {
        "code": "CU", "name": "Cuba", "flag": "🇨🇺", "enabled": True,
        "timezone": "America/Havana", "order": 12,
        "cities": [
            {"name": "La Habana", "coords": [-82.36, 23.13]},
            {"name": "Santiago de Cuba", "coords": [-75.83, 20.02]},
        ],
    },
    {
        "code": "DO", "name": "República Dominicana", "flag": "🇩🇴", "enabled": True,
        "timezone": "America/Santo_Domingo", "order": 13,
        "cities": [
            {"name": "Santo Domingo", "coords": [-69.93, 18.47]},
            {"name": "Santiago de los Caballeros", "coords": [-70.70, 19.45]},
            {"name": "Punta Cana", "coords": [-68.37, 18.58]},
        ],
    },
    {
        "code": "HN", "name": "Honduras", "flag": "🇭🇳", "enabled": True,
        "timezone": "America/Tegucigalpa", "order": 14,
        "cities": [
            {"name": "Tegucigalpa", "coords": [-87.20, 14.07]},
            {"name": "San Pedro Sula", "coords": [-88.02, 15.51]},
        ],
    },
    {
        "code": "PY", "name": "Paraguay", "flag": "🇵🇾", "enabled": True,
        "timezone": "America/Asuncion", "order": 15,
        "cities": [
            {"name": "Asunción", "coords": [-57.63, -25.30]},
            {"name": "Ciudad del Este", "coords": [-54.61, -25.51]},
        ],
    },
    {
        "code": "SV", "name": "El Salvador", "flag": "🇸🇻", "enabled": True,
        "timezone": "America/El_Salvador", "order": 16,
        "cities": [
            {"name": "San Salvador", "coords": [-89.19, 13.69]},
            {"name": "Santa Ana", "coords": [-89.56, 13.99]},
        ],
    },
    {
        "code": "NI", "name": "Nicaragua", "flag": "🇳🇮", "enabled": True,
        "timezone": "America/Managua", "order": 17,
        "cities": [
            {"name": "Managua", "coords": [-86.25, 12.13]},
            {"name": "León", "coords": [-86.88, 12.44]},
            {"name": "Granada", "coords": [-85.96, 11.93]},
        ],
    },
    {
        "code": "CR", "name": "Costa Rica", "flag": "🇨🇷", "enabled": True,
        "timezone": "America/Costa_Rica", "order": 18,
        "cities": [
            {"name": "San José", "coords": [-84.09, 9.93]},
            {"name": "Alajuela", "coords": [-84.21, 10.02]},
            {"name": "Heredia", "coords": [-84.11, 10.00]},
        ],
    },
    {
        "code": "PA", "name": "Panamá", "flag": "🇵🇦", "enabled": True,
        "timezone": "America/Panama", "order": 19,
        "cities": [
            {"name": "Ciudad de Panamá", "coords": [-79.52, 8.99]},
            {"name": "David", "coords": [-82.43, 8.43]},
        ],
    },
    {
        "code": "UY", "name": "Uruguay", "flag": "🇺🇾", "enabled": True,
        "timezone": "America/Montevideo", "order": 20,
        "cities": [
            {"name": "Montevideo", "coords": [-56.19, -34.90]},
            {"name": "Punta del Este", "coords": [-54.94, -34.94]},
            {"name": "Salto", "coords": [-57.97, -31.39]},
        ],
    },
    {
        "code": "PR", "name": "Puerto Rico", "flag": "🇵🇷", "enabled": True,
        "timezone": "America/Puerto_Rico", "order": 21,
        "cities": [
            {"name": "San Juan", "coords": [-66.11, 18.47]},
            {"name": "Ponce", "coords": [-66.62, 18.01]},
        ],
    },
    {
        "code": "GQ", "name": "Guinea Ecuatorial", "flag": "🇬🇶", "enabled": True,
        "timezone": "Africa/Malabo", "order": 22,
        "cities": [
            {"name": "Malabo", "coords": [8.78, 3.75]},
            {"name": "Bata", "coords": [9.77, 1.86]},
        ],
    },
]

# Helplines verificadas por país. NO agregar países sin verificar — el frontend
# muestra un mensaje seguro para los que no aparecen acá.
HELPLINES_SEED_BY_COUNTRY = {
    "CL": [
        {"name": "SENDA — Fono Drogas", "phone": "1412", "display": "1412", "color": "apoyo", "order": 1},
        {"name": "Salud Responde", "phone": "6003607777", "display": "600 360 7777", "color": "amistad", "order": 2},
        {"name": "SAMU — Urgencias", "phone": "131", "display": "131", "color": "primary", "order": 3},
        {"name": "Orientación profesional", "phone": "", "display": "sinadicciones.org", "color": "neutral", "order": 4, "url": "https://sinadicciones.org"},
    ],
    "AR": [
        {"name": "SEDRONAR — Línea 141", "phone": "141", "display": "141", "color": "apoyo", "order": 1},
        {"name": "Salud Mental Responde", "phone": "08009990091", "display": "0800 999 0091", "color": "amistad", "order": 2},
        {"name": "Orientación profesional", "phone": "", "display": "sinadicciones.org", "color": "neutral", "order": 3, "url": "https://sinadicciones.org"},
    ],
    "CO": [
        {"name": "Línea 192 — Salud", "phone": "192", "display": "192", "color": "apoyo", "order": 1},
        {"name": "Línea 106 — Salud Mental", "phone": "106", "display": "106", "color": "amistad", "order": 2},
        {"name": "Orientación profesional", "phone": "", "display": "sinadicciones.org", "color": "neutral", "order": 3, "url": "https://sinadicciones.org"},
    ],
    "MX": [
        {"name": "Línea de la Vida", "phone": "8009112000", "display": "800 911 2000", "color": "apoyo", "order": 1},
        {"name": "SAPTEL", "phone": "5552598121", "display": "55 5259 8121", "color": "amistad", "order": 2},
        {"name": "Orientación profesional", "phone": "", "display": "sinadicciones.org", "color": "neutral", "order": 3, "url": "https://sinadicciones.org"},
    ],
    "PE": [
        {"name": "Línea 100", "phone": "100", "display": "100", "color": "apoyo", "order": 1},
        {"name": "DEVIDA", "phone": "080010233", "display": "0800 10 233", "color": "amistad", "order": 2},
        {"name": "Orientación profesional", "phone": "", "display": "sinadicciones.org", "color": "neutral", "order": 3, "url": "https://sinadicciones.org"},
    ],
}

# Legacy alias so existing imports keep working.
HELPLINES_SEED_CL = HELPLINES_SEED_BY_COUNTRY["CL"]

VERIFIED_COUNTRY_CODES = set(HELPLINES_SEED_BY_COUNTRY.keys())


def _cities_index() -> dict:
    idx = {}
    for c in COUNTRIES_SEED:
        for city in c["cities"]:
            idx[(c["code"], city["name"].lower())] = city["coords"]
    return idx


_CITIES_INDEX = _cities_index()


def city_coords_for(country_code: str, city: str):
    """Return [lng, lat] for a known city or comuna in a country, or None."""
    if not country_code or not city:
        return None
    code = country_code.upper()
    if code == "CL" and city in RM_CENTROIDS:
        return RM_CENTROIDS[city]
    return _CITIES_INDEX.get((code, city.lower()))


def default_country_coords(country_code: str):
    """Country capital / launch centroid used as a last-resort fallback."""
    if not country_code:
        return None
    code = country_code.upper()
    for c in COUNTRIES_SEED:
        if c["code"] == code and c["cities"]:
            return c["cities"][0]["coords"]
    return None
