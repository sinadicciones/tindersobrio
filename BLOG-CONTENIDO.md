# Blog PlanSobrio — 3 artículos listos + estrategia de CTA (instrucción para Emergent)

Contenido escrito y optimizado para SEO de la primera etapa. Elegí los 3 artículos que traen tráfico frío **sin depender de tener usuarios todavía** y con baja competencia en Chile:

1. **30 planes para hacer sin alcohol en Santiago** (pilar — búsqueda alta, competencia casi nula)
2. **15 tragos sin alcohol que no saben a jugo de niños** (amplio, compartible, capta "sober curious")
3. **Cómo decir "no tomo" sin dar explicaciones** (dolor social nº1, contenido evergreen)

**Cómo usar:** primero el BLOQUE A (construye el blog + el componente de CTA), luego el BLOQUE B (carga los 3 posts). Un bloque por mensaje.

---

## Estrategia de CTA (el corazón de la conversión)

Regla: los listicles atraen mucho pero convierten poco si no hay llamado a la acción. Cada artículo lleva **3 CTAs en distintos momentos**, todos reutilizando un mismo componente:

- **CTA suave (a media lectura)**: una tarjeta discreta insertada tras la primera sección. Texto contextual al artículo.
- **CTA fuerte (al final)**: bloque grande con gradiente, título + botón "Crear mi cuenta gratis" → https://plansobrio.com. Presente en TODOS los posts.
- **CTA lateral/flotante (opcional)**: en desktop, una tarjeta sticky; en móvil, nada (no molestar).

Tono de todos los CTAs: nunca "regístrate ya"; siempre conectar el contenido con el producto — *"¿y con quién haces estos planes? En PlanSobrio conoces gente que también vive sin alcohol"*.

---

## BLOQUE A para Emergent — Blog mínimo + componente CTA

```
Construye un blog público en plansobrio.com optimizado para SEO. Reutiliza el sistema visual Blanco Editorial de la app.

1. BACKEND: colección blog_posts (id, slug único, title, meta_description, excerpt, content_html, cover_alt, author_name, author_bio, tags[], keyword, status[borrador|publicado], reading_minutes, published_at, updated_at). CRUD en /admin sección "Blog" con editor enriquecido (H2/H3, negrita, listas, links, imágenes al storage), slug autogenerado editable, y previsualización.

2. PÁGINAS PÚBLICAS con HTML real (meta en el HTML crudo, no solo JS — igual que la landing):
   - /blog: grilla de posts publicados (cover, title, excerpt, fecha, tiempo de lectura).
   - /blog/{slug}: artículo con ancho de lectura cómodo (máx 68 caracteres/línea, cuerpo 18px, interlínea 1.7), H2/H3 con jerarquía, breadcrumbs (Inicio › Blog › título) con JSON-LD BreadcrumbList, autor con mini-bio al inicio, y JSON-LD tipo Article (headline, description, datePublished, dateModified, author, image).
   - Meta por post: title = "{title} — PlanSobrio", description = meta_description, canonical, OG + Twitter con la cover. Idioma es-CL.
   - Los posts publicados se agregan automáticamente a /sitemap.xml. Link "Blog" en el footer de la landing.
   - Al final de cada post: 3 "posts relacionados" por tags.

3. COMPONENTE CTA reutilizable <BlogCTA variant="soft|strong" title="" text="" />:
   - variant="strong": bloque ancho, fondo con gradiente coral(#FF6B5E)→violeta(#8B5CF6), título en blanco, párrafo, y botón blanco "Crear mi cuenta gratis" → https://plansobrio.com. Debajo, en 12px: "Gratis en beta · Solo mayores de 18".
   - variant="soft": tarjeta #1D212B con borde, ícono de brote, texto corto y link "Conocer PlanSobrio →".
   - El contenido de los posts (content_html) puede incluir un marcador [[CTA_SOFT]] que se reemplaza por el CTA suave con el texto que traiga cada post; el CTA fuerte se agrega SIEMPRE automáticamente al final de todo post.

4. El pie del blog mantiene "Hecho con 💛 desde SinAdicciones.org". Las páginas del blog son indexables (sin noindex).

Verifica con curl que /blog y /blog/{slug} devuelven title, description y JSON-LD Article en el HTML crudo.
```

---

## BLOQUE B para Emergent — Cargar los 3 artículos

```
Crea estos 3 posts en blog_posts con status "publicado". Respeta el content_html tal cual (incluye los marcadores [[CTA_SOFT]] y la estructura de encabezados). author_name "Equipo PlanSobrio", author_bio "Escribimos desde SinAdicciones.org, la comunidad chilena para vivir sin alcohol ni drogas."

═══════════════ POST 1 ═══════════════
slug: planes-sin-alcohol-santiago
title: 30 planes para hacer sin alcohol en Santiago (2026)
keyword: planes sin alcohol santiago
meta_description: 30 panoramas sin alcohol en Santiago: cafés, cerros, cultura y aire libre. Ideas reales para pasarlo bien sin carrete, sola/o o acompañado.
excerpt: Cafés de especialidad, cerros, ferias, cultura y panoramas de día. 30 ideas concretas para disfrutar Santiago sin que el alcohol sea el centro.
tags: [panoramas, santiago, vida sobria]
reading_minutes: 8
content_html:
<p>Cuando decides vivir sin alcohol, aparece una pregunta incómoda: <strong>¿qué hago un sábado si el plan de siempre era ir a tomar?</strong> La buena noticia es que Santiago está lleno de panoramas donde el trago no es el protagonista. Aquí tienes 30, ordenados por tipo, para que nunca te quedes sin ideas.</p>

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

<p>La clave no es "aguantar" sin alcohol, sino <strong>descubrir que la vida entretenida no lo necesitaba</strong>. Empieza por uno esta semana.</p>

═══════════════ POST 2 ═══════════════
slug: tragos-sin-alcohol-mocktails
title: 15 tragos sin alcohol que no saben a jugo de niños
keyword: tragos sin alcohol
meta_description: 15 mocktails y tragos sin alcohol para adultos: recetas fáciles, con carácter y sin resaca. Perfectos para juntas, citas y celebrar sin trago.
excerpt: Mocktails con carácter, cervezas 0.0 que valen la pena y recetas fáciles para pasarlo bien sin alcohol. Sabor de verdad, cero resaca.
tags: [mocktails, recetas, vida sobria]
reading_minutes: 6
content_html:
<p>Uno de los mitos más grandes de dejar el alcohol es que solo quedan las bebidas dulces o el agua. Falso. Hoy existen <strong>tragos sin alcohol para paladar adulto</strong>: amargos, cítricos, herbales, con burbujas. Aquí van 15 ideas para que nunca tengas un vaso aburrido en la mano.</p>

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

<p>Tener un buen trago sin alcohol en la mano hace una diferencia enorme en lo social: <strong>tienes algo rico, nadie te pregunta nada, y al otro día estás perfecto.</strong> Anda probando hasta encontrar tus favoritos.</p>

═══════════════ POST 3 ═══════════════
slug: como-decir-no-tomo
title: Cómo decir "no tomo" sin dar explicaciones
keyword: como decir que no tomo
meta_description: Frases y estrategias para decir que no tomas sin sentirte incómodo ni dar explicaciones. Guía práctica para asados, matrimonios y la pega.
excerpt: Frases listas y estrategias para rechazar un trago con naturalidad, sin justificarte y sin que la conversación se ponga rara.
tags: [vida sobria, habilidades sociales]
reading_minutes: 5
content_html:
<p>Para mucha gente que deja de tomar, lo más difícil no es el alcohol: es <strong>el momento social en que alguien te ofrece un trago y todos te miran.</strong> La buena noticia es que no le debes una explicación a nadie. Aquí tienes frases y estrategias que funcionan de verdad.</p>

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
<p>Con el tiempo, esta conversación deja de existir. Tu círculo se acostumbra, y tú también. Y hay un atajo enorme: <strong>rodearte de gente donde "no tomo" es lo normal.</strong> En esos espacios nunca tienes que explicar nada — simplemente encajas.</p>
```

Textos de los CTAs a usar:

- CTA_SOFT del Post 1: title "¿Y con quién haces estos planes?" · text "En PlanSobrio conoces gente que también vive sin alcohol, cerca de ti — y cada match viene con un plan sobrio incluido."
- CTA_SOFT del Post 2: title "Un buen trago sin alcohol se disfruta acompañado" · text "PlanSobrio es la comunidad chilena para conocer gente que vive sin alcohol ni drogas. Amistad, grupos y algo más."
- CTA_SOFT del Post 3: title "Donde 'no tomo' es lo normal" · text "En PlanSobrio nadie tiene que explicar por qué no toma. Conoce personas que están en la misma."
- CTA_STRONG (todos, automático al final): title "Conoce gente que vive sin alcohol ni drogas" · text "Amistad, apoyo, grupos y amor — con el plan incluido. Gratis en beta, en Chile." · botón "Crear mi cuenta gratis"

---

## Recomendaciones de publicación

1. **No los publiques los 3 el mismo día**: uno por semana da señal a Google de sitio vivo y constante. Orden sugerido: Post 1 (el pilar) → Post 3 (el más compartible) → Post 2.
2. **Interlinking**: dentro del Post 1 enlaza "un buen trago sin alcohol" al Post 2, y "no tener que explicar" al Post 3. Google premia esa red interna.
3. **El backlink que más vale**: publica en sinadicciones.org un extracto de cada artículo con "sigue leyendo en PlanSobrio →". Autoridad heredada instantánea.
4. **Portadas**: fotos reales cálidas (café, cerro, gente latina riendo), nunca stock genérico. Con consentimiento cuando haya personas.
5. **Actualiza el Post 1 cada temporada** y cámbiale el año del título: los listicles "2026" que se mantienen frescos rankean por años.
6. Cuando tengas historias reales de la comunidad (con permiso firmado), el 4º artículo debe ser un testimonio — es el formato que más convierte y más autoridad da en temas de salud.
