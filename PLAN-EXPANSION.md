# PlanSobrio v3 — Expansión hispanohablante + SEO/GEO por país + comunidad

Plan detallado del upgrade: abrir la app a todos los países hispanohablantes, páginas SEO/GEO por país, blog, herramientas gratuitas de SinAdicciones, comunidad y grupos con reuniones online. Gratuito por ahora.

---

## Decisión de arquitectura (lo primero, porque cambia todo)

**El hallazgo clave:** el repo `vercelsinadicciones` (Next.js) YA tiene la infraestructura SEO multi-país que necesitamos — `lib/countries.ts` con los 20+ países hispanohablantes y sus líneas de ayuda nacionales (SENDA, SEDRONAR, Línea de la Vida, DEVIDA…), rutas `[country]`, `llms.txt`/`llms-full.txt` (para IA), hreflang, `herramientas/[test]`, blog y calculadora. Es una máquina SEO madura.

**Recomendación fuerte — arquitectura de dos capas:**

| Capa | Dónde vive | Qué contiene | Por qué |
|---|---|---|---|
| **Capa SEO/contenido (pública)** | Sitio Next.js (extender vercelsinadicciones o un nuevo `plansobrio` Next.js modelado en él) | Landing, páginas por país, blog, herramientas gratuitas, FAQ, schema, llms.txt | Next.js renderiza HTML real por ruta → indexable y citable por IA. Una SPA (lo que hace Emergent) **no posiciona**. |
| **Capa producto (app)** | Emergent (React SPA + FastAPI, lo ya construido) | Registro, perfiles, match, chat, grupos, comunidad | La app detrás del login no necesita SEO; necesita funcionar bien. |

**Cómo se conectan:** las páginas por país (Next.js) tienen botones "Crear cuenta gratis" → llevan a la app (Emergent) pasando el país por URL (`app.plansobrio.com/registro?pais=MX&utm_...`). El usuario aterriza con su país ya detectado.

> Por qué NO meter las 20 páginas SEO dentro de Emergent: una SPA sirve un HTML vacío que se llena con JavaScript; Google lo indexa a medias y ChatGPT/Perplexity no lo leen bien. Con 20 países en juego, eso es tirar el esfuerzo. El patrón de dos capas es exactamente lo que SinAdicciones ya usa con éxito.

**Dos caminos para la capa SEO (elige uno):**
- **A (recomendado, más rápido):** PlanSobrio como sección dentro del Next.js de SinAdicciones — reutilizas `countries.ts`, hreflang, llms.txt y el sistema de blog tal cual. Menos trabajo, autoridad de dominio compartida.
- **B:** sitio Next.js nuevo para plansobrio.com modelado en el de SinAdicciones (copias los patrones). Marca 100% independiente, más trabajo.

El resto del plan asume la arquitectura de dos capas. Los bloques marcados **[APP]** van a Emergent; los **[WEB]** van al sitio Next.js.

---

## FASE 1 — Abrir la app a todos los países [APP]

```
Abre PlanSobrio a todos los países hispanohablantes. Hoy la app filtra por Chile y manda a lista de espera a los demás; elimina ese filtro y hazla multi-país.

1. CATÁLOGO DE PAÍSES: sembrar en la colección countries los 21 países hispanohablantes con enabled=true: Chile(CL), Argentina(AR), México(MX), Colombia(CO), Perú(PE), España(ES), Venezuela(VE), Ecuador(EC), Guatemala(GT), Bolivia(BO), Cuba(CU), República Dominicana(DO), Honduras(HN), Paraguay(PY), El Salvador(SV), Nicaragua(NI), Costa Rica(CR), Panamá(PA), Uruguay(UY), Puerto Rico(PR), Estados Unidos hispano(US). Cada país con: código ISO, nombre, bandera, zona horaria principal, y sus líneas de ayuda nacionales (helplines) — usa como referencia los datos ya definidos en el repo vercelsinadicciones/apps/web/lib/countries.ts (SENDA Chile, SEDRONAR 141 Argentina, Línea de la Vida México, DEVIDA/Línea 100 Perú, Línea 192/106 Colombia, etc.). Marca cada helpline como "verificar" para revisión previa al lanzamiento por país.

2. REGISTRO CON PAÍS: en el onboarding, el paso de ubicación detecta el país por GPS/IP y lo confirma; agrega selector de país manual (los 21) como respaldo. Si llega un parámetro ?pais=XX en la URL de registro (viene de las páginas SEO), preseleccionarlo. Eliminar la pantalla de lista de espera / waitlist como bloqueo — ahora todos los países entran.

3. ALCANCE DE DESCUBRIMIENTO: agrega el tercer nivel de alcance que ya estaba previsto ("regional/toda Latinoamérica") a la interfaz, junto a "Cerca de mí" y "Mi país". Regla de intersección intacta (dos personas se ven solo si ambos alcances lo permiten). Con poca densidad al inicio, el alcance regional mantiene vivo el feed.

4. "NECESITO APOYO" POR PAÍS: la página ya lee helplines por país; verifica que muestra las del país del usuario para los 21. Mantener el link a SinAdicciones.org para todos.

5. COPY NEUTRO + LOCAL: el microcopy por país ya existe para 5 países (botón "me tinca/me copa/me late…"); extiéndelo a los 21 con su variante local donde exista, y español neutro como default. Reemplazar chilenismos del copy general por neutro cuando el usuario no es de Chile.

6. HORA DE EVENTOS: los eventos muestran su hora en la zona horaria del usuario, indicando el país de origen del evento.

Corre los tests. Verifica: registro desde ?pais=MX preselecciona México; un usuario de España ve helplines españolas en Necesito Apoyo; el alcance regional muestra perfiles de otros países.
```

---

## FASE 2 — Grupos mejorados con reuniones online [APP]

```
Mejora el módulo de Grupos para que sea el corazón de la comunidad, con reuniones online (para conversación de apoyo o encuentros tipo grupo).

1. ENLACE DE REUNIÓN EN GRUPOS Y EVENTOS: agrega a events los campos meeting_url (Zoom/Meet/Jitsi), is_online (bool) y recurrence (texto libre, ej "Cada martes 20:00"). En el detalle del evento, si es online y tiene meeting_url, mostrar botón "Unirse a la reunión" que abre el link en pestaña nueva — visible solo para inscritos y solo desde 15 min antes de la hora (antes muestra "El enlace se activa 15 min antes"). Registrar quién entró (para métricas de asistencia).

2. TIPOS DE GRUPO/REUNIÓN: agrega a groups un campo group_type: "apoyo" (círculos de conversación/apoyo entre pares), "actividad" (deporte, cultura), "pais" (comunidad nacional), "tematico" (sustancia o etapa). Los grupos de tipo "apoyo" muestran un aviso fijo: "Este es un espacio de apoyo entre pares, no reemplaza terapia ni tratamiento profesional" + link a Necesito Apoyo.

3. GRUPOS POR PAÍS: crea automáticamente un grupo "comunidad {país}" (online) para cada país habilitado, para que nadie llegue a un vacío. Al registrarse, sugerir al usuario unirse al de su país.

4. REUNIONES RECURRENTES DE APOYO: permite (desde el admin y desde moderadores de grupo) crear reuniones online recurrentes con su meeting_url. Un job diario genera la "instancia de hoy" de cada reunión recurrente para que aparezca en Mis Planes y en el grupo. Ejemplos semilla: "Círculo de apoyo online — martes 20:00", "Conversación de fin de semana — sábado 11:00".

5. MODERACIÓN DE GRUPOS: los grupos pueden tener moderador (usuario con rol). El moderador puede fijar un mensaje, crear eventos/reuniones y ocultar mensajes. Reportar dentro del grupo funciona igual que en el chat 1-1.

6. RECORDATORIO: quien está inscrito en una reunión online recibe recordatorio (push + el email de "recordatorio de plan" que ya existe) con el botón para unirse.

Prueba: crear un grupo de apoyo con reunión recurrente online, inscribirse, y que el botón "Unirse" aparece 15 min antes con el link correcto; que cada país tiene su grupo comunidad.
```

---

## FASE 3 — Herramientas gratuitas + blog dentro de la app [APP]

```
Trae a la app las herramientas gratuitas de SinAdicciones y una sección de blog, como valor añadido y retención.

1. SECCIÓN "RECURSOS" (nueva pestaña o dentro de Perfil): un hub con:
   - Herramientas gratuitas de SinAdicciones (test de dependencia, calculadora, guías) — integradas como enlaces profundos a sinadicciones.org con el país del usuario (ej: sinadicciones.org/{pais}/herramientas/...), abriendo en vista integrada o pestaña nueva. NO reconstruir las herramientas: enlazar a las que ya existen en el sitio.
   - Contenido del blog (ver punto 2).
   - Acceso directo a "Necesito Apoyo" y a orientación profesional de SinAdicciones.
   - Grupos AA/reuniones presenciales del país (si SinAdicciones ya los lista, enlazar).

2. BLOG EN LA APP: consumir los posts del blog público (de la capa WEB) vía su API/feed y mostrarlos dentro de la app en "Recursos", con el mismo diseño. Al tocar un post abre la versión web (que es la indexable). Así el contenido SEO sirve doble: capta desde Google Y retiene dentro de la app.

3. ONBOARDING DE VALOR: al terminar el registro, además de Descubrir, mostrar una tarjeta "Mientras crece tu comunidad, explora estos recursos" con 2-3 herramientas/artículos — reduce la decepción del feed vacío al inicio en países nuevos.

Prueba: un usuario de Perú ve en Recursos las herramientas de sinadicciones.org/pe/... y los últimos posts del blog.
```

---

## FASE 4 — Páginas SEO/GEO por país [WEB]

Esta es la fase de posicionamiento. Va en la capa Next.js. Cada país tiene su set de páginas optimizadas para Google Y para IA (ChatGPT, Perplexity, AI Overviews).

### Estructura de rutas (por país)
```
/{pais}/                         → home del país (hub)
/{pais}/citas-sin-alcohol        → landing dating sobrio del país
/{pais}/conocer-gente-sobria     → amistad/comunidad del país
/{pais}/apoyo-recuperacion       → apoyo/grupos del país (enlaza a SinAdicciones)
/blog  y  /{pais}/blog           → blog (global + destacados por país)
```

```
Crea páginas SEO/GEO por país para PlanSobrio en la capa Next.js (reutiliza countries.ts, el sistema de hreflang y de blog ya existentes). Para CADA país habilitado genera estas páginas con HTML real renderizado en servidor:

1. CONTENIDO POR PÁGINA (plantilla parametrizada por país, pero con datos reales, NO texto duplicado):
   - H1 y primer párrafo que responden la intención directa (ej: "PlanSobrio es la app gratuita para conocer personas que viven sin alcohol ni drogas en {país}"). Bloque de respuesta de 40-60 palabras al inicio (óptimo para extracción por IA).
   - Sección "El problema en {país}" con 2-3 ESTADÍSTICAS REALES Y CITADAS de fuentes oficiales (OMS/OPS, y la agencia nacional: SENDA en Chile, CONADIC en México, etc.) sobre consumo de alcohol/drogas en ese país. CADA estadística con su fuente enlazada y su año. IMPORTANTE: no inventar cifras; usar datos verificables y citar la fuente. Si no hay dato fiable para un país, usar el dato regional de OPS y decirlo.
   - Sección "Cómo funciona" (match por plan, 3 pasos).
   - Sección "Planes sin alcohol en {país}" con ejemplos de ciudades principales del país.
   - Líneas de ayuda nacionales del país (de countries.ts), visibles y citables.
   - FAQ de 5-6 preguntas naturales con respuestas de 40-60 palabras: "¿PlanSobrio es gratis en {país}?", "¿Cómo conozco gente sobria en {ciudad principal}?", "¿Sirve para recuperación de adicciones?", "¿Reemplaza un tratamiento?" (respuesta honesta: no, deriva a ayuda profesional), "¿Necesito estar en recuperación para usarla?", "¿Puedo usarla solo para hacer amigos?".
   - CTA a registro con el país preseleccionado: app.plansobrio.com/registro?pais={code}&utm_source=seo&utm_content={pais}.

2. SCHEMA (JSON-LD) por página: WebApplication (offers price 0), FAQPage (con las preguntas reales), BreadcrumbList, y Organization con sameAs a sinadicciones.org y redes. En el home del país, además, un bloque de datos de la organización.

3. GEO/AEO (optimización para IA):
   - Actualizar llms.txt y llms-full.txt para incluir PlanSobrio: qué es, para qué sirve, países, que es gratis, y links a las páginas por país.
   - Respuestas autocontenidas (que funcionen fuera de contexto), tablas donde aplique, tono con autoridad, y las estadísticas citadas (la señal nº1 que aumenta las citas de IA ~40%).
   - Verificar robots.txt: permitir GPTBot, ChatGPT-User, PerplexityBot, ClaudeBot, Google-Extended, Bingbot.

4. HREFLANG: cada página por país con hreflang a las equivalentes de otros países + es y x-default (reutiliza groups-hreflang.ts como patrón). Canonical correcto por país.

5. SITEMAP: agregar todas las rutas por país y los posts del blog al sitemap.xml, con hreflang en el sitemap.

6. RENDIMIENTO: server-side render real, imágenes lazy con width/height, Lighthouse SEO ≥95 y Performance ≥85 en móvil. Verificar con curl que el HTML crudo de cada página por país trae H1, FAQ y JSON-LD.

Genera primero los 5 países prioritarios (CL, MX, CO, AR, PE) completos y deja la plantilla lista para activar el resto agregando sus datos.
```

---

## FASE 5 — Blog con contenido citable [WEB]

```
Blog optimizado para SEO y GEO en la capa Next.js (reutiliza el sistema de blog existente si lo hay, o créalo con HTML real, JSON-LD Article, sitemap y RSS).

1. Estructura: /blog (índice), /blog/{slug} (post), y destacados por país en /{pais}/blog. Cada post: HTML real, JSON-LD Article (author, datePublished, dateModified, image), breadcrumbs, autor con mini-bio (E-E-A-T real), tiempo de lectura, 3 relacionados por tag, y el componente CTA (suave a media lectura + fuerte al final → registro con país).

2. Los 3 artículos ya escritos (ver BLOG-CONTENIDO.md) sirven de base; adaptarlos a versión neutra/multipaís. Priorizar formatos que la IA cita más: guías definitivas, comparativas, listas con datos, y artículos con estadísticas citadas.

3. Calendario multipaís: versiones por país del pilar "planes sin alcohol en {ciudad}" (Santiago, CDMX, Bogotá, Buenos Aires, Lima…), más contenido evergreen global ("cómo hacer amigos sin alcohol", "citas sin alcohol", "cómo decir que no tomo").
```

---

## Prioridades y secuencia recomendada

1. **FASE 1 [APP]** — abrir países + registro con país. Es lo que desbloquea todo y es rápido (los datos de países ya existen en el repo de SinAdicciones).
2. **FASE 2 [APP]** — grupos con reuniones online. Da valor inmediato y comunidad, que compensa la baja densidad de dating al abrir países nuevos.
3. **FASE 4 [WEB]** — páginas SEO de los 5 países prioritarios. El motor de adquisición orgánica.
4. **FASE 3 [APP]** — recursos + blog embebido. Retención.
5. **FASE 5 [WEB]** — blog completo. Largo plazo.

## Mis recomendaciones honestas

1. **No enciendas los 21 países de golpe en marketing.** Abre el acceso a todos (técnico), pero concentra la promoción país por país empezando por donde SinAdicciones ya tiene comunidad (Chile, luego México/Colombia). Un feed vacío en 21 países a la vez mata la percepción. El acceso abierto + alcance regional resuelven lo técnico; el marketing es enfocado.
2. **La comunidad y los grupos de apoyo online son tu ventaja real sobre el dating puro.** Con densidad baja al abrir países, el dating 1-a-1 no funciona solo — pero un "círculo de apoyo online los martes" funciona con 8 personas de cualquier país. Prioriza eso: es lo que retiene mientras crece la masa para citas.
3. **Las estadísticas por país deben ser reales y citadas** — es la mejor palanca de GEO (aumenta citas de IA ~40%) pero solo si son verificables. Nunca inventar cifras: usar OMS/OPS y las agencias nacionales, con fuente y año. Te puedo ayudar a compilarlas país por país cuando lleguemos a esa fase.
4. **Reutiliza la máquina de SinAdicciones, no la reconstruyas.** Su Next.js ya tiene países, hreflang, llms.txt y blog. Modelar PlanSobrio sobre eso te ahorra meses.
5. **Mantén "gratis" explícito y honesto**, y el disclaimer de que no reemplaza tratamiento en todas las páginas de apoyo — es correcto éticamente y Google premia el E-E-A-T en temas de salud (YMYL).
```
