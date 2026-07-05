"""Seed data catalogs for PlanSobrio."""

SEED_ACTIVITIES = [
    ("☕", "Café y conversación", "cafe"),
    ("🥾", "Caminata o trekking", "aire_libre"),
    ("🌳", "Paseo por un parque", "aire_libre"),
    ("🏛️", "Museo o centro cultural", "cultura"),
    ("🎬", "Cine", "cultura"),
    ("🍽️", "Almorzar o cenar rico", "comida"),
    ("🏃", "Entrenar juntos", "deporte"),
    ("⚽", "Pichanga o deporte grupal", "deporte"),
    ("🧘", "Yoga o meditación", "bienestar"),
    ("📚", "Club de lectura o librería", "cultura"),
    ("🎨", "Taller creativo", "cultura"),
    ("🎲", "Juegos de mesa", "entretencion"),
    ("🐶", "Pasear a los perros", "aire_libre"),
    ("🎵", "Concierto o música en vivo de día", "entretencion"),
    ("🧗", "Escalada o panorama aventura", "deporte"),
    ("🍦", "Helado y vuelta a la manzana", "cafe"),
]

SEED_GROUPS = [
    {"emoji": "☕", "name": "Café Sobrio Santiago", "description": "Nos juntamos en cafeterías de Santiago a conversar sin apuro. Todes bienvenides.", "rules": "Respeto siempre. Prohibido ofrecer alcohol. Puntualidad.", "is_online": False, "comuna": "Providencia"},
    {"emoji": "🌱", "name": "Primeros 30 días", "description": "Grupo online de apoyo para quienes están empezando su nueva etapa sin alcohol ni drogas.", "rules": "Confidencialidad. Sin juicios. Escucha activa.", "is_online": True, "comuna": None},
    {"emoji": "🏃", "name": "Deporte y sobriedad", "description": "Corremos, andamos en bici y hacemos panoramas activos. La endorfina es mejor.", "rules": "Cuidémonos entre todes. Sin presión, cada uno a su ritmo.", "is_online": False, "comuna": "Ñuñoa"},
    {"emoji": "🎬", "name": "Panoramas de fin de semana", "description": "Cines, exposiciones, teatro y salidas culturales en el centro.", "rules": "Buena onda. Confirmar asistencia con anticipación.", "is_online": False, "comuna": "Santiago"},
]

DEMO_PROFILES = [
    ("Cata_23", "F", "femenino", 28, "Providencia", ["amistad", "amor"], ["masculino", "femenino"], ["Café y conversación", "Museo o centro cultural", "Yoga o meditación"], "3-12m"),
    ("Javi_Sur", "M", "masculino", 31, "Ñuñoa", ["apoyo", "amistad"], [], ["Caminata o trekking", "Entrenar juntos", "Café y conversación"], ">1a"),
    ("Nico_Cerro", "NB", "no_binario", 26, "Santiago", ["amistad", "amor", "grupos"], ["femenino", "no_binario"], ["Cine", "Club de lectura o librería", "Museo o centro cultural"], "1-3m"),
    ("Fer_Cafe", "F", "femenino", 34, "Las Condes", ["amor"], ["masculino"], ["Café y conversación", "Almorzar o cenar rico", "Paseo por un parque"], ">5a"),
    ("Tomas_Trek", "M", "masculino", 29, "La Reina", ["amistad", "grupos"], [], ["Caminata o trekking", "Escalada o panorama aventura", "Yoga o meditación"], ">1a"),
    ("Vale_Yoga", "F", "femenino", 25, "Providencia", ["apoyo", "amistad"], [], ["Yoga o meditación", "Taller creativo", "Paseo por un parque"], "3-12m"),
    ("Rodri_Libros", "M", "masculino", 38, "Ñuñoa", ["amistad", "amor"], ["femenino"], ["Club de lectura o librería", "Museo o centro cultural", "Café y conversación"], ">5a"),
    ("Isi_Perri", "F", "femenino", 22, "Maipú", ["amistad"], [], ["Pasear a los perros", "Juegos de mesa", "Helado y vuelta a la manzana"], "<30d"),
    ("Beno_Deporte", "M", "masculino", 42, "Vitacura", ["apoyo", "grupos"], [], ["Pichanga o deporte grupal", "Entrenar juntos", "Caminata o trekking"], ">5a"),
    ("Anto_Museo", "F", "femenino", 27, "Santiago", ["amistad", "amor"], ["femenino", "no_binario"], ["Museo o centro cultural", "Cine", "Taller creativo"], "3-12m"),
    ("Mati_Cine", "NB", "no_binario", 33, "Providencia", ["amistad", "amor"], ["masculino", "no_binario"], ["Cine", "Concierto o música en vivo de día", "Almorzar o cenar rico"], ">1a"),
    ("Cami_Runner", "F", "femenino", 30, "Las Condes", ["amistad", "grupos"], [], ["Entrenar juntos", "Yoga o meditación", "Paseo por un parque"], ">1a"),
]

DEMO_PHOTOS = {
    "Cata_23": ["https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80&auto=format&fit=crop"],
    "Nico_Cerro": ["https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800&q=80&auto=format&fit=crop"],
    "Fer_Cafe": ["https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80&auto=format&fit=crop"],
    "Rodri_Libros": ["https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80&auto=format&fit=crop"],
    "Anto_Museo": ["https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80&auto=format&fit=crop"],
    "Mati_Cine": ["https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=80&auto=format&fit=crop"],
}

DEMO_PROMPTS = [
    ("Mi plan ideal sin alcohol es…", "Un café largo con conversa profunda, después caminar sin apuro."),
    ("Lo que estoy construyendo en esta etapa…", "Volver a habitarme con calma y sin pilotaje automático."),
    ("Un panorama que descubrí…", "Los desayunos con amigues los sábados temprano son un lujo."),
    ("Me hace bien cuando…", "Salgo a la cordillera y me acuerdo de lo grande que es todo."),
    ("Mi domingo perfecto…", "Feria, cocinar rico y una peli en la tarde."),
]
