# Emergent — Fase 3: Recursos dentro de la app

Spec de la Fase 3 + respuestas a las preguntas de scope. La app NO reconstruye las herramientas clínicas ni duplica el blog: enlaza a SinAdicciones (fuente única) y suma un contador nativo liviano.

## Decisiones (respuestas a las 4 preguntas)
1. Spec: la de este documento.
2. Herramientas — enfoque HÍBRIDO: contador de días sobrios NATIVO (opcional, privado); test de autoevaluación y biblioteca de recursos ENLAZADOS a sinadicciones.org; diario/check-in diario queda para una iteración posterior.
3. Ubicación: dentro de Perfil ("Recursos"), NO un tab nuevo en el bottom nav (ya tiene 5, un sexto rompe la UX móvil).
4. Blog: mismo contenido que el público, pero la FUENTE es el sitio Next.js (evita contenido duplicado penalizado por Google). La app espeja y al tocar abre la web. Dejar campo `visibility` en el modelo para el futuro.

## REGLA DE ARQUITECTURA (importante)
El blog SEO vive en el sitio Next.js de SinAdicciones (capa pública que posiciona). El mismo artículo NO puede quedar indexable en dos URLs (app + sitio) = contenido duplicado, penalizado. Por eso: el sitio es la única fuente; la app consume los posts por API/feed y los muestra, y al abrir un post lleva a la versión web. La app no guarda copia indexable propia.

---

## BLOQUE para Emergent — Sección Recursos

```
Agrega una sección "Recursos" dentro del Perfil (NO un tab nuevo en el bottom nav; ya son 5). Es un hub de valor y retención. Contiene:

1. CONTADOR DE DÍAS SOBRIOS (nativo, opcional, privado):
   - El usuario puede (opt-in) fijar su "fecha de inicio sin consumo". Desde ahí, la app muestra su contador de días y una racha, con hitos celebrados: 7 días, 30, 90, 180, 1 año, y luego cada año.
   - Es PRIVADO: nunca se muestra en el perfil público (la insignia voluntaria de "tiempo sin consumo" que ya existe es lo único público, y sigue siendo aparte). Sin lenguaje médico ni diagnóstico: es motivación/identidad ("Llevas 42 días construyendo tu nueva vida 🌱"), no clínico.
   - Widget glanceable: mostrar el contador arriba en la pantalla de Perfil.
   - Permite editar la fecha o desactivarlo. Si el usuario tuvo una recaída, un botón discreto "reiniciar" sin culpa ("Empezar de nuevo hoy. Cada intento cuenta.").
   - Recordatorio opcional de hito por push/email (reutiliza el sistema existente, respeta preferencias).

2. HERRAMIENTAS DE SINADICCIONES (enlazadas, NO reconstruidas):
   - Tarjetas que enlazan a las herramientas ya existentes en sinadicciones.org, con el país del usuario en la ruta: test de autoevaluación (sinadicciones.org/{pais}/herramientas/...), calculadora y demás. Abrir en pestaña nueva o vista integrada (webview). NO construir estos tests dentro de la app (son herramientas clínicas; se mantienen en su fuente).
   - Tarjeta "Biblioteca de recursos" que enlaza al contenido/guías de sinadicciones.org del país del usuario.
   - Acceso directo a "Necesito apoyo" y a orientación profesional de SinAdicciones.

3. BLOG (espejo, no copia):
   - Consumir los posts publicados del blog desde el sitio público (API/feed del Next.js) y mostrarlos aquí como tarjetas (imagen, título, tiempo de lectura, filtro por tag).
   - Al tocar un post, abrir la versión web del sitio público (la indexable). La app NO guarda una copia indexable propia; solo cachea para mostrar la lista. Si el feed no está disponible aún, ocultar la sección de blog con elegancia.
   - Dejar previsto un campo visibility (public/private) para posts que en el futuro sean solo para logueados; por ahora todo public.

4. ONBOARDING DE VALOR: al terminar el registro, además de Descubrir, una tarjeta "Mientras crece tu comunidad, explora estos recursos" con 2-3 enlaces (una herramienta + un artículo + unirse al grupo de su país). Reduce la decepción del feed vacío al abrir países nuevos.

Prueba: activar el contador con una fecha, ver la racha y un hito; que el contador NO aparece en el perfil público de otro usuario; que las tarjetas de herramientas llevan a sinadicciones.org con el país correcto (ej usuario de México → /mx/...); que el blog muestra los posts del sitio y al tocar abre la web.
```

## Nota sobre el diario/check-in (iteración futura)
Cuando se quiera, se agrega un check-in diario liviano (ánimo + ganas de consumir + acción del día) que alimente al contador y a "Necesito apoyo". Se deja fuera de esta fase para no retrasarla; es un buen gancho de retención para la v-siguiente.
