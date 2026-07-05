"""RM commune centroids + country/city catalog + helplines seeds for CL."""

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

# Country catalog. Only CL enabled for launch.
COUNTRIES_SEED = [
    {
        "code": "CL", "name": "Chile", "flag": "🇨🇱", "enabled": True,
        "timezone": "America/Santiago",
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
]

HELPLINES_SEED_CL = [
    {"country": "CL", "name": "Salud Responde", "phone": "6003607777", "display": "600 360 7777", "color": "apoyo", "order": 1},
    {"country": "CL", "name": "Prevención del suicidio", "phone": "*4141", "display": "*4141", "color": "amistad", "order": 2},
    {"country": "CL", "name": "Urgencias", "phone": "131", "display": "131", "color": "primary", "order": 3},
    {"country": "CL", "name": "Orientación profesional", "phone": "", "display": "sinadicciones.org", "color": "neutral", "order": 4, "url": "https://sinadicciones.org"},
]


def city_coords_for(country_code: str, city: str):
    """Return [lng, lat] for a known city or comuna in a country, or None."""
    if country_code == "CL":
        if city in RM_CENTROIDS:
            return RM_CENTROIDS[city]
        for c in COUNTRIES_SEED[0]["cities"]:
            if c["name"] == city:
                return c["coords"]
    return None


def default_country_coords(country_code: str):
    """Country capital / launch centroid used as a last-resort fallback."""
    if country_code == "CL":
        return SANTIAGO_CENTER
    return None
