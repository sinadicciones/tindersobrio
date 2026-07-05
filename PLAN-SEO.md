# Plan SEO + Blog — plansobrio.com

Cómo continuamos desde hoy: primero limpieza y correcciones, luego SEO técnico, luego el blog. En ese orden.

## El orden de los pasos (tu ruta)

1. **HOY — Correcciones + limpieza**: pega en Emergent el bloque de `AUDITORIA-FASE1.md` (reseteo de beta, tests en verde, badge Beta, pie "Hecho con 💛", metadatos básicos). Al terminar: botón "Resetear beta" en /admin → base limpia sin re-siembra de demos.
2. **DESPUÉS — SEO técnico**: pega el BLOQUE SEO de este documento (favicon, meta completos, sitemap, robots, datos estructurados, prerender de páginas públicas).
3. **Manual tuyo (15 min)**: Google Search Console + los 3 backlinks fundacionales (abajo).
4. **Perfiles reales**: fundadores primero, luego olas de ~25.
5. **Semana 2-3 — Blog**: pega el BLOQUE BLOG cuando el sitio ya esté andando con gente.

---

## Contexto técnico honesto (por qué el bloque SEO es como es)

La app es una SPA de React: Google la indexa a medias y las previsualizaciones de WhatsApp/redes leen solo el HTML inicial. No necesitamos convertir la app en un sitio SSR — necesitamos que **las páginas públicas** (landing, términos, privacidad y el futuro blog) entreguen HTML real con sus metadatos. Eso es lo que pide el bloque: la app privada queda igual, lo público se sirve listo para Google.

Y una ventaja que casi nadie tiene al partir: **sinadicciones.org ya posiciona en este nicho**. Sus links hacia plansobrio.com son el empujón de autoridad que un dominio nuevo tardaría un año en conseguir.

---

## BLOQUE SEO para Emergent

```
Optimiza el SEO técnico de plansobrio.com. La app autenticada no cambia; el trabajo es sobre las páginas públicas (landing /, /terminos, /privacidad) y la infraestructura:

1. IDENTIDAD DEL SITIO (index.html + assets):
   - <html lang="es-CL">, <title>PlanSobrio — Conoce gente que vive sin alcohol ni drogas</title>
   - meta description: "Amistad, apoyo, grupos y amor — con el plan incluido. La comunidad chilena para vivir tu nueva etapa sin alcohol ni drogas. Beta gratis."
   - theme-color #0B0C10.
   - FAVICON propio: ícono del brote (sprout) en gradiente coral (#FF6B5E) a violeta (#8B5CF6) sobre fondo #0B0C10. Genera favicon.ico, iconos PNG 192 y 512, apple-touch-icon 180, y site.webmanifest (name "PlanSobrio", short_name "PlanSobrio", colores de la marca, display standalone). Elimina todo favicon/manifest de Emergent.
   - OG IMAGE: imagen estática 1200x630 en /public/og.png: fondo #0B0C10 con glow sutil del gradiente, texto "PlanSobrio" grande + "Conoce gente que vive sin alcohol ni drogas" + badge "Beta gratis · Chile".

2. METADATOS POR PÁGINA PÚBLICA (server-side o prerender, NO solo con JavaScript):
   Las rutas públicas /, /terminos y /privacidad deben responder HTML que YA contenga title, description, canonical (https://plansobrio.com/...), Open Graph (og:title, og:description, og:image, og:url, og:type, og:locale es_CL) y Twitter Card (summary_large_image). Implementación sugerida: middleware en FastAPI que sirva el index.html con los meta tags inyectados según la ruta (o prerender estático de esas 3 rutas en el build). VERIFICA con curl que el HTML crudo (sin ejecutar JS) contiene los meta correctos de cada ruta.

3. DATOS ESTRUCTURADOS (JSON-LD en la landing):
   - Organization: PlanSobrio, url, logo, sameAs [https://sinadicciones.org], description.
   - WebSite con name y url.
   - WebApplication: name PlanSobrio, applicationCategory LifestyleApplication, operatingSystem "Web", offers price 0 CLP, description.
   - FAQPage con 4 preguntas reales en la landing (agrega la sección visible de FAQ si no existe): "¿PlanSobrio es gratis?", "¿Quién puede usar PlanSobrio?", "¿Tengo que mostrar mi nombre real?", "¿PlanSobrio reemplaza un tratamiento?" — respuestas breves y honestas (no reemplaza tratamiento; deriva a SinAdicciones.org).

4. RASTREO:
   - /robots.txt: permitir /; bloquear /app, /admin, /onboarding, /api; línea Sitemap: https://plansobrio.com/sitemap.xml.
   - /sitemap.xml generado por el backend con las rutas públicas (/, /terminos, /privacidad) y preparado para agregar automáticamente los futuros posts del blog (/blog y /blog/{slug} cuando existan).
   - Las páginas privadas (/app/*, /admin, /onboarding) con meta robots noindex.

5. RENDIMIENTO BÁSICO (afecta ranking): lazy-load de imágenes en la landing, atributos width/height para evitar saltos de layout, preconnect solo a orígenes necesarios, y verificación de que la landing carga sin errores de consola. Objetivo Lighthouse mobile ≥85 en Performance y ≥95 en SEO — corre Lighthouse y reporta los números.

6. Verificación final: curl a / muestra title/OG correctos; curl a /robots.txt y /sitemap.xml responden bien; compartir https://plansobrio.com en un chat de prueba muestra imagen y texto correctos.
```

---

## Pasos manuales tuyos después del bloque SEO (una vez, 15 minutos)

- [ ] **Google Search Console**: agregar propiedad plansobrio.com (verificación por DNS), enviar el sitemap.
- [ ] **Los 3 backlinks fundacionales** (esto vale más que todo lo demás junto):
  1. Artículo en sinadicciones.org presentando PlanSobrio, con link (el anchor ideal: "app para conocer gente sin alcohol").
  2. Link permanente en el menú/footer de sinadicciones.org → plansobrio.com.
  3. Mención + link en el email del reto de 21 días.
- [ ] **Perfil de empresa en Instagram/redes** con el link (señal de entidad + tráfico directo).
- [ ] Buscar "PlanSobrio" en Google a la semana: debe aparecer con el favicon y la descripción nuevos.

---

## BLOQUE BLOG para Emergent (semana 2-3, cuando la beta ya respire)

```
Agrega un blog público a plansobrio.com optimizado para SEO:

1. BACKEND: colección blog_posts (id, slug, title, excerpt, content_html, cover_image, author_name, author_bio, tags, status borrador/publicado, published_at, updated_at). CRUD completo en /admin (sección "Blog") con editor de texto enriquecido simple (títulos, negrita, listas, links, imágenes subidas al storage) y campo slug editable autogenerado del título.

2. PÁGINAS PÚBLICAS SERVIDAS CON HTML REAL (igual que la landing: meta en el HTML crudo, no solo JS):
   - /blog: lista de posts publicados (tarjetas con imagen, título, extracto, fecha) con el diseño Blanco Editorial.
   - /blog/{slug}: el post con tipografía cómoda de lectura (65 caracteres por línea máx, texto 17-18px), imagen de portada, autor con mini-bio, fecha, y al final un CTA fijo: "¿Buscas gente que viva igual que tú? PlanSobrio es gratis en beta" con botón de registro.
   - Meta por post: title = título del post + " — PlanSobrio", description = excerpt, canonical, OG con la imagen de portada, y JSON-LD tipo Article (headline, image, datePublished, dateModified, author).
   - Los posts publicados se agregan automáticamente al sitemap.xml. Breadcrumbs (Inicio > Blog > Post) con JSON-LD BreadcrumbList.
   - Link "Blog" en el footer de la landing.

3. Tiempo de lectura calculado, posts relacionados por tags al final (3), y RSS básico en /blog/rss.xml.
```

## Calendario editorial — los primeros 12 artículos (uno por semana)

Elegidos por intención de búsqueda real en Chile y por embudo (atraer → confiar → registrar):

| # | Artículo (keyword objetivo) | Intención |
|---|---|---|
| 1 | **20 panoramas sin alcohol en Santiago** (panoramas sin alcohol santiago) | La joya SEO: búsqueda alta, competencia baja, es tu producto en forma de artículo |
| 2 | Cómo hacer amigos sin carrete después de los 30 (como hacer amigos sin alcohol) | Dolor central |
| 3 | Citas sin alcohol: 15 ideas para una primera cita sobria (citas sin alcohol) | Dolor + producto |
| 4 | ¿Dejé de tomar y mis amigos no? Guía para sobrevivir socialmente (deje de tomar) | Emocional, compartible |
| 5 | Qué decir cuando te ofrecen un trago (como decir que no tomo) | Práctico, compartible |
| 6 | Apps para conocer gente sobria: comparativa honesta (app citas sobrias) | Captura tu propia búsqueda de marca/categoría |
| 7 | Primeros 90 días sin alcohol: qué esperar de tu vida social | Etapa temprana del embudo |
| 8 | Café Sobrio: qué es y por qué está creciendo en Chile | Marca + evento propio |
| 9 | Amor en sobriedad: cómo es tener pareja sin alcohol de por medio | Modo Amor |
| 10 | 10 grupos y comunidades sobrias en Chile (grupos de apoyo alcohol chile) | Lista donde TÚ apareces |
| 11 | Deporte y sobriedad: por qué entrenar acompañado cambia todo | Modo grupos |
| 12 | Historias reales: "así reconstruí mi vida social sin alcohol" | E-E-A-T: experiencia real, con consentimiento |

**Reglas editoriales (no negociables):**
- Autor real con nombre y mini-bio (experiencia vivida = el factor E-E-A-T que Google premia en temas de salud, que trata con vara YMYL).
- Tono de la marca: cálido, chileno, sin moralina ni promesas médicas; disclaimer y derivación a SinAdicciones.org al final de cada post sensible.
- Cada artículo enlaza a 2-3 artículos hermanos y 1 vez a la app (CTA), y desde sinadicciones.org se enlaza al menos a los pilares (#1, #3, #6).
- Nada de contenido generado en masa: 1 artículo bueno por semana le gana a 10 mediocres, especialmente en salud.

## Expectativas realistas

- **Semanas 1-4**: Google indexa; apareces por "PlanSobrio" con favicon y descripción correctos.
- **Meses 2-3**: los artículos long-tail (#1, #5, #8) empiezan a traer visitas.
- **Meses 4-6**: con los backlinks de sinadicciones.org y constancia semanal, las keywords de categoría ("citas sin alcohol", "amigos sobrios") entran a primera página en Chile.
- El SEO es el canal barato de largo plazo; **tu canal de corto plazo sigue siendo la comunidad de SinAdicciones y el reto de 21 días**.
