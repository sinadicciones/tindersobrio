"""Seed initial blog posts. Idempotent — skips slugs that already exist."""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone

sys.path.insert(0, "/app/backend")
os.environ.setdefault("MONGO_URL", os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
os.environ.setdefault("DB_NAME", os.environ.get("DB_NAME", "plansobrio"))

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

POSTS = [
    {
        "slug": "planes-sin-alcohol-santiago",
        "title": "30 planes para hacer sin alcohol en Santiago (2026)",
        "keyword": "planes sin alcohol santiago",
        "meta_description": "30 panoramas sin alcohol en Santiago: cafés, cerros, cultura y aire libre. Ideas reales para pasarlo bien sin carrete, sola/o o acompañado.",
        "excerpt": "Cafés de especialidad, cerros, ferias, cultura y panoramas de día. 30 ideas concretas para disfrutar Santiago sin que el alcohol sea el centro.",
        "tags": ["panoramas", "santiago", "vida-sobria"],
        "reading_minutes": 8,
        "cta_soft_title": "¿Y con quién haces estos planes?",
        "cta_soft_text": "En PlanSobrio conoces gente que también vive sin alcohol, cerca de ti — y cada match viene con un plan sobrio incluido.",
        "content_html": """<p>Cuando decides vivir sin alcohol, aparece una pregunta incómoda: <strong>¿qué hago un sábado si el plan de siempre era ir a tomar?</strong> La buena noticia es que Santiago está lleno de panoramas donde el trago no es el protagonista. Aquí tienes 30, ordenados por tipo, para que nunca te quedes sin ideas.</p>

<h2>Panoramas de café y conversación</h2>
<p>El plan sobrio por excelencia: una buena mesa, algo rico y tiempo para conversar sin apuro.</p>
<ul>
<li>Recorrer cafeterías de especialidad en Barrio Italia y quedarse a leer.</li>
<li>Desayuno largo un domingo temprano en Providencia, antes de que se llene.</li>
<li>Once con pan amasado y té en un café de barrio.</li>
<li>Probar un mocktail o café de autor en un local con opciones sin alcohol.</li>
<li>Llevar un libro a un café tranquilo y no hacer nada más por dos horas.</li>
</ul>

[[CTA_SOFT]]

<h2>Aire libre y cerros</h2>
<p>Moverse es el mejor ansiolítico natural, y Santiago tiene cordillera a la vista.</p>
<ul>
<li>Subir el Cerro San Cristóbal caminando y bajar en funicular.</li>
<li>Caminar el Parque Bicentenario en Vitacura y ver los flamencos.</li>
<li>Andar en bici por el Parque Forestal y la Costanera.</li>
<li>Ir al Parque Metropolitano a hacer un picnic sin alcohol.</li>
<li>Trekking corto en el Cajón del Maipo un día completo.</li>
<li>Salir a correr en grupo un sábado en la mañana.</li>
</ul>

<h2>Cultura y panoramas de techo</h2>
<p>Ideales cuando el clima no acompaña o quieres algo distinto.</p>
<ul>
<li>Museo de Bellas Artes o el MAC un día de entrada liberada.</li>
<li>GAM: exposiciones, teatro y su cafetería.</li>
<li>Centro Cultural La Moneda y su cine.</li>
<li>Una función de teatro en el Barrio Lastarria.</li>
<li>Cine de autor un día de semana, cuando está vacío.</li>
<li>Recorrer librerías de viejo en el centro.</li>
</ul>

<h2>Aprender y crear</h2>
<ul>
<li>Un taller de cerámica, cocina o fotografía de una tarde.</li>
<li>Clase suelta de yoga o meditación.</li>
<li>Sumarse a un club de lectura.</li>
<li>Aprender a preparar café de especialidad en casa.</li>
<li>Un curso corto de baile (sin la fiesta).</li>
</ul>

<h2>Comer rico (que también es plan)</h2>
<ul>
<li>Recorrer el Mercado Central o La Vega y cocinar algo nuevo.</li>
<li>Ruta de heladerías artesanales en primavera.</li>
<li>Brunch de fin de semana con amigos.</li>
<li>Probar cocina de un país que no conoces.</li>
<li>Feria libre temprano y hacer el almuerzo con lo que encuentres.</li>
</ul>

<h2>Panoramas para conocer gente</h2>
<p>Reconstruir la vida social es parte del proceso. Estos planes se disfrutan aún más acompañado:</p>
<ul>
<li>Ir a un Café Sobrio o encuentro de comunidad sin alcohol.</li>
<li>Sumarte a un grupo de running o senderismo.</li>
<li>Un evento cultural gratuito y quedarse a conversar.</li>
<li>Juegos de mesa en un café especializado.</li>
</ul>

<p>La clave no es "aguantar" sin alcohol, sino <strong>descubrir que la vida entretenida no lo necesitaba</strong>. Empieza por uno esta semana.</p>""",
    },
    {
        "slug": "tragos-sin-alcohol-mocktails",
        "title": "15 tragos sin alcohol que no saben a jugo de niños",
        "keyword": "tragos sin alcohol",
        "meta_description": "15 mocktails y tragos sin alcohol para adultos: recetas fáciles, con carácter y sin resaca. Perfectos para juntas, citas y celebrar sin trago.",
        "excerpt": "Mocktails con carácter, cervezas 0.0 que valen la pena y recetas fáciles para pasarlo bien sin alcohol. Sabor de verdad, cero resaca.",
        "tags": ["mocktails", "recetas", "vida-sobria"],
        "reading_minutes": 6,
        "cta_soft_title": "Un buen trago sin alcohol se disfruta acompañado",
        "cta_soft_text": "PlanSobrio es la comunidad chilena para conocer gente que vive sin alcohol ni drogas. Amistad, grupos y algo más.",
        "content_html": """<p>Uno de los mitos más grandes de dejar el alcohol es que solo quedan las bebidas dulces o el agua. Falso. Hoy existen <strong>tragos sin alcohol para paladar adulto</strong>: amargos, cítricos, herbales, con burbujas. Aquí van 15 ideas para que nunca tengas un vaso aburrido en la mano.</p>

<h2>Los clásicos, en versión sin alcohol</h2>
<ul>
<li><strong>Mojito sin ron:</strong> menta, limón, azúcar rubia, soda y hielo. El de siempre, sin la resaca.</li>
<li><strong>Gin tonic 0.0:</strong> hoy hay ginebras sin alcohol reales; con tónica buena y un twist de pomelo, nadie nota la diferencia.</li>
<li><strong>Piña colada:</strong> piña, leche de coco y hielo. Cremosa y tropical.</li>
<li><strong>Sangría sin vino:</strong> jugo de uva tinto, frutas, canela y soda.</li>
</ul>

[[CTA_SOFT]]

<h2>Con carácter amargo (para los que no quieren dulce)</h2>
<ul>
<li><strong>Amargo cítrico:</strong> agua tónica, angostura sin alcohol y mucho hielo con naranja.</li>
<li><strong>Pomelo y romero:</strong> jugo de pomelo, soda y una rama de romero golpeada.</li>
<li><strong>Té helado ahumado:</strong> té negro fuerte, limón y un toque de miel.</li>
<li><strong>Jengibre y lima:</strong> ginger beer sin alcohol, lima exprimida y menta.</li>
</ul>

<h2>Herbales y refrescantes</h2>
<ul>
<li><strong>Pepino y menta:</strong> pepino licuado, menta, limón y soda.</li>
<li><strong>Hibisco frío:</strong> infusión de flor de hibisco, fría, con naranja.</li>
<li><strong>Albahaca y frutilla:</strong> frutillas, albahaca, limón y agua con gas.</li>
</ul>

<h2>Cervezas y espumantes 0.0 que valen la pena</h2>
<p>El mercado cambió: ya hay cervezas sin alcohol artesanales con cuerpo real, y espumantes 0.0 para brindar. Para un brindis, una copa de espumante sin alcohol cumple perfecto — <strong>lo importante del brindis nunca fue el alcohol.</strong></p>
<ul>
<li>Cerveza IPA sin alcohol, bien fría.</li>
<li>Espumante 0.0 para celebrar.</li>
<li>Kombucha, que aporta acidez y burbuja natural.</li>
</ul>

<p>Tener un buen trago sin alcohol en la mano hace una diferencia enorme en lo social: <strong>tienes algo rico, nadie te pregunta nada, y al otro día estás perfecto.</strong> Anda probando hasta encontrar tus favoritos.</p>""",
    },
    {
        "slug": "como-decir-no-tomo",
        "title": "Cómo decir \"no tomo\" sin dar explicaciones",
        "keyword": "como decir que no tomo",
        "meta_description": "Frases y estrategias para decir que no tomas sin sentirte incómodo ni dar explicaciones. Guía práctica para asados, matrimonios y la pega.",
        "excerpt": "Frases listas y estrategias para rechazar un trago con naturalidad, sin justificarte y sin que la conversación se ponga rara.",
        "tags": ["vida-sobria", "habilidades-sociales"],
        "reading_minutes": 5,
        "cta_soft_title": "Donde 'no tomo' es lo normal",
        "cta_soft_text": "En PlanSobrio nadie tiene que explicar por qué no toma. Conoce personas que están en la misma.",
        "content_html": """<p>Para mucha gente que deja de tomar, lo más difícil no es el alcohol: es <strong>el momento social en que alguien te ofrece un trago y todos te miran.</strong> La buena noticia es que no le debes una explicación a nadie. Aquí tienes frases y estrategias que funcionan de verdad.</p>

<h2>La regla de oro: menos es más</h2>
<p>Mientras menos expliques, menos preguntan. Una respuesta corta y tranquila cierra el tema al instante. El problema no es decir que no; es sonar dubitativo, porque ahí aparece el "ya, uno no más".</p>

<h2>Frases que funcionan (elige la tuya)</h2>
<ul>
<li>"Hoy ando sin, gracias." — corta y sin drama.</li>
<li>"Estoy manejando." — clásica, imbatible.</li>
<li>"Prefiero mi bebida sin alcohol, está buenísima." — desvía a lo positivo.</li>
<li>"Dejé el trago y me siento mucho mejor, la verdad." — honesta, si te da confianza.</li>
<li>"No es lo mío, pero disfruta tú." — deja claro que no juzgas a nadie.</li>
</ul>

[[CTA_SOFT]]

<h2>Ten siempre algo en la mano</h2>
<p>El truco más efectivo: <strong>llega con un vaso lleno de algo sin alcohol.</strong> Una bebida, un mocktail, un agua con gas y limón. Con un vaso en la mano, nadie te ofrece nada — el 90% de las preguntas desaparecen solas.</p>

<h2>Si insisten (porque a veces insisten)</h2>
<p>Hay quienes no captan a la primera. No te enganches ni te justifiques de más:</p>
<ul>
<li>Repite exactamente lo mismo, con una sonrisa. La repetición tranquila desarma la insistencia.</li>
<li>Cambia de tema de inmediato: "¿y cómo va la pega?".</li>
<li>Si la presión es fuerte, recuerda: quien insiste demasiado tiene un problema con SU trago, no con el tuyo.</li>
</ul>

<h2>Lo más importante</h2>
<p>Con el tiempo, esta conversación deja de existir. Tu círculo se acostumbra, y tú también. Y hay un atajo enorme: <strong>rodearte de gente donde "no tomo" es lo normal.</strong> En esos espacios nunca tienes que explicar nada — simplemente encajas.</p>""",
    },
]


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    now = datetime.now(timezone.utc).isoformat()
    inserted = 0
    for p in POSTS:
        existing = await db.blog_posts.find_one({"slug": p["slug"]})
        if existing:
            print(f"SKIP existing: {p['slug']}")
            continue
        doc = {
            "id": str(uuid.uuid4()),
            "slug": p["slug"],
            "title": p["title"],
            "meta_description": p["meta_description"],
            "excerpt": p["excerpt"],
            "content_html": p["content_html"],
            "cover_url": None,
            "cover_alt": "",
            "author_name": "Equipo PlanSobrio",
            "author_bio": "Escribimos desde SinAdicciones.org, la comunidad chilena para vivir sin alcohol ni drogas.",
            "tags": p["tags"],
            "keyword": p["keyword"],
            "status": "publicado",
            "reading_minutes": p["reading_minutes"],
            "cta_soft_title": p["cta_soft_title"],
            "cta_soft_text": p["cta_soft_text"],
            "published_at": now,
            "updated_at": now,
            "created_at": now,
        }
        await db.blog_posts.insert_one(doc)
        inserted += 1
        print(f"INSERT: {p['slug']}")
    print(f"Total inserted: {inserted}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
