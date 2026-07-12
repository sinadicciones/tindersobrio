# PlanSobrio - Product Requirements Document

**Última actualización:** 2026-02-12

## v2.8 — Landing promocional `/promocion` (Feb 2026)
- ✅ **Nueva ruta pública `/promocion`** en App.js. Landing con fondo blanco y tonos de marca (coral #FF6B5E → violeta #8B5CF6, verde menta #4ADE80).
- ✅ **Secciones**: Nav con logo + CTA, Hero con headline + 2 CTAs (Únete / Compartir), 4 cards de modos (Apoyo/Amistad/Amor/Grupos), Cómo funciona en 3 pasos, "Para quién es" con 4 bullets inclusivos (recuperación / vida sana / sin dependencias / sin fiesta), bloque de compartir con gradient fuerte, CTA final, Footer con Salud Responde.
- ✅ **Compartir integrado**: WhatsApp, X, Facebook, Copiar enlace + Native Share API (`navigator.share`) para móvil. Toast confirma copia.
- ✅ **SEO**: Landing agregada a `sitemap.xml` con priority 0.9. Meta OG globales existentes aplican.
- ✅ **Accesibilidad y responsive**: mobile-first, +18 disclaimer, contacto de crisis en footer.

## v2.7 — "Chatear online" como plan de baja fricción (Feb 2026)
- ✅ **Nueva actividad virtual "Chatear online"** (💬, `is_virtual=true`, `category=virtual`, icon `MessageCircle`) sembrada idempotentemente — se autoinserta en DBs pre-existentes (producción) sin duplicar.
- ✅ **Discover — modal "Me tinca"**: la opción aparece **primera** con fondo verde-menta y badge "Sin compromiso". Otras 2 sugerencias son panoramas físicos comunes. Dropdown "Otro plan…" filtra actividades virtuales.
- ✅ **Mis Planes**: chat_online NO aparece (`/like` con virtual no crea documento en `db.plans`).
- ✅ **Mensaje de sistema virtual-friendly**: cuando ambos usuarios eligen chat_online, se muestra "¡Están de acuerdo! 💬 Chatear online. Empiecen conversando por acá 💬". Cuando solo uno propone virtual: "Cachen de qué se trata por acá 💬".
- ✅ **Onboarding / EditProfile**: el picker de "Actividades favoritas" filtra virtuales (no tiene sentido marcar chat como panorama favorito).
- ✅ **ChatDetail — Propose Plan**: el `<select>` filtra virtuales (chat online no se agenda formalmente).
- ✅ **Defense-in-depth**: `POST /matches/{mid}/propose-plan` rechaza con 400 si el activity es virtual: "Chatear online no se puede agendar como panorama. Sigan la conversa por acá."
- ✅ Testeado E2E (`iteration_25`): 5/5 backend + Playwright frontend flow completo. Regresión intacta.

## v2.6 — Sin_problema + Handler global 422 (Feb 2026)
- ✅ **Bugfix** onboarding paso Reglas: `sober_time=""` ya no rompe la validación Pydantic (defensa dual: frontend strip + backend `field_validator` que convierte `""` → `None`).
- ✅ **Nueva opción "No tengo problemas con dependencias"** (`sin_problema`) en `relationship_with_substances`. Cuando se elige, el bloque de `sober_time` se oculta (no aplica).
- ✅ **Toggle opcional `show_relationship`**: sólo aparece cuando el usuario elige `sin_problema`. Si lo activa, se muestra badge público "Sin problemas con dependencias" en Profile propio, Discover cards y PublicProfile.
- ✅ **Backend `clear_public`** expone `relationship_badge` cuando `show_relationship=true` y el valor no es `prefiero_no_decir`.
- ✅ **`ProfileUpdateIn`** admite ambos campos → usuario puede cambiar su elección desde EditProfile en cualquier momento.
- ✅ **Handler global de errores 422 Pydantic** (`_friendly_validation_exception_handler`): mapea errores técnicos a mensajes en español Chilean-friendly usando `_FIELD_LABELS`. Ejemplos: `literal_error` → "Elige una opción válida para {campo}", `missing` → "Falta completar: {campo}". Todos los endpoints ahora devuelven `{"detail":"<mensaje humano>"}`.
- ✅ Testeado E2E (`iteration_24`): 9/9 backend + Playwright frontend flow completo. Regresión `iteration_23` intacta 10/10.

## v2.5 — Grupos y Eventos + Mis Planes RSVP (Feb 2026)
- ✅ **Admin editar grupos**: PATCH `/api/admin/groups/{gid}` + modal en `Admin.jsx` con `EmojiPicker` (5 categorías curadas: sobrio/deporte/arte/naturaleza/otros).
- ✅ **Admin CRUD eventos** por grupo con `EventsPanel`: `event-when` datetime-local (sin bug UTC), `event-address` dirección exacta, `event-location` comuna, `event-map-link` Google Maps URL, presets de capacidad `event-cap-10/20/50/9999` (Sin límite = 9999).
- ✅ **Backend `EventIn`** actualizado: `address`, `map_link`, `capacity`. Email a miembros del grupo al crear evento (`event_new_in_group`).
- ✅ **RSVP con cupos**: `POST /api/events/{eid}/rsvp` valida capacidad y devuelve 400 "Cupos agotados". `DELETE /api/events/{eid}/rsvp` libera cupo.
- ✅ **`GET /api/plans` unificado**: devuelve tanto `kind:'match'` (planes 1-a-1 aceptados) como `kind:'group_event'` (eventos donde el user hizo RSVP) ordenados por `when` ascendente.
- ✅ **`MisPlanes.jsx` con `EventPlanCard`**: emoji del evento, título, link al grupo (`event-plan-group-link-{eid}`), fecha, dirección + Maps, "N de CAP van" o "N personas van", botón "Ya no voy" (`event-plan-cancel-{eid}`) que confirma, hace DELETE RSVP y libera el cupo.
- ✅ Testeado E2E (iteration_23): 10/10 backend + Playwright frontend flow completo.


## Concepto
App chilena para conocer personas que viven sin alcohol ni drogas. 4 modos de conexión en un solo lugar: Apoyo, Amistad, Amor y Grupos. Diferenciador: "match por plan" — el usuario propone una actividad sobria concreta al dar like, y el chat se abre con ese plan como primer mensaje.

## Stack
- Backend: FastAPI + MongoDB, JWT auth (Bearer token / localStorage), Emergent object storage para fotos.
- Frontend: React 19 + React Router 7, Tailwind + shadcn/ui, framer-motion, sonner toasts.
- Idioma: Español de Chile. Nunca usar "adicto" o "rehabilitación".

## Personas
- **Persona sobria** (>1 año sin consumir): busca amistades y quizás pareja compatible.
- **Persona en proceso** (primeros 30 días): busca apoyo y comunidad.
- **Curiosa** (quiere reducir consumo): busca panoramas sin alcohol.
- **Administrador (Equipo PlanSobrio)**: modera reportes, gestiona catálogos.

## Requerimientos fijos
1. Solo mayores de 18 años (validación fecha de nacimiento).
2. Perfil público con alias, nunca con nombre real ni email.
3. Modo Amor solo visible entre personas que activaron Amor y son compatibles en género + edad.
4. Modo Amor requiere al menos 1 foto.
5. 20 "Me tinca" por día por usuario.
6. Match crea chat con actividad como primer mensaje del sistema.
7. Consejo de seguridad al abrir por primera vez chat de modo Amor.
8. "Necesito apoyo" con respiración guiada, mis razones y teléfonos oficiales Chile.
9. Bloquear = bilateral. Reportar con 5 categorías.
10. Admin: contacto@sinadicciones.org (rol admin).

## Implementado (v2.4 - Feb 2026 - Pre-launch AUDITORIAFASE1 + PLANSEO)
- ✅ **Reset Beta seguro**: `POST /api/admin/reset-beta` con confirmación "RESETEAR". Borra todos los users no-admin + likes/matches/messages/plans/reports/blocks/group_members/group_messages/event_rsvps/email_preferences/email_log de usuarios. Preserva admins, grupos, eventos, actividades, países, helplines, admin_recipients, metrics_daily, support_page_views. Marca `app_settings.demo_seed_enabled=false` para desactivar re-siembra automática al arranque. Audit trail en `admin_actions`.
- ✅ **`GET /api/admin/settings`** para leer flags persistentes.
- ✅ **Zona peligrosa en /admin > Dashboard** con doble confirmación (`data-testid` reset-beta-open, -confirm-input, -execute, -cancel). Botón coral, explicación clara de qué se borra vs conserva.
- ✅ **Badge BETA menta** en Landing (`beta-badge`) y Admin (`admin-beta-badge`).
- ✅ **Crédito SinAdicciones** en Landing (`sinadicciones-credit`) y /app/perfil (`app-sinadicciones-credit`).
- ✅ **SEO metadata completa** (`/app/frontend/public/index.html`): `<html lang="es-CL">`, `<title>`, description, canonical, og:{title,description,type,url,site_name,locale,image=/og.png,image:width=1200,image:height=630,image:alt}, twitter:card=summary_large_image, JSON-LD `Organization` con sameAs SinAdicciones.
- ✅ **Assets de marca** generados en `/app/tools/gen_brand_assets.py` (favicon.ico multi-tamaño 16/32/48, favicon-192.png, favicon-512.png, apple-touch-icon.png 180, og.png 1200x630 con gradientes coral→violeta + sprout + tagline + badge "Beta gratis · Chile", site.webmanifest).
- ✅ **`robots.txt` + `sitemap.xml`** en `/app/frontend/public/` (Disallow: /app, /admin, /onboarding, /reset-password, /olvide-contrasena, /api).
- ✅ **Meta robots dinámica por ruta** en `App.js`: `noindex, nofollow` en /app/*, /admin, /onboarding, /reset-password, /olvide-contrasena; `index, follow` en resto (validado con `page.evaluate`).
- ✅ **Suite de tests**: pytest de 125 rojos → 173/180 verde (96%). Los 7 restantes son flakes de xdist parallel (pasan individualmente).
- ✅ **Testing**: `testing_agent_v3_fork` iter 18 → **0 issues nuevos**, reset-beta E2E validado + flag persiste después de restart + smoke E2E completo con 2 cuentas reales frescas creadas y borradas.
- ⚠️ **Estado del preview**: DB reseteada (0 users no-admin, demo_seed_enabled=false). Para re-habilitar los 12 demos en preview: setear `app_settings.demo_seed_enabled=true` y reiniciar backend.


- ✅ **Motor de emails privacidad-first** (`/app/backend/core/email_service.py`, ~800 líneas):
  - Resend con dominio `plansobrio.com` verificado, sender `PlanSobrio <hola@plansobrio.com>`.
  - Función central `send_email` con gates: idempotencia (SHA256 de destino+tipo+event_ref), preferencias (`email_preferences`), estado del usuario (banned/deleted/undeliverable), silencio 22:00–08:00 America/Santiago (queued → drain loop 10 min), tope 1 correo interacción/día por usuario.
  - Tokens JWT firmados para reset (1h) y unsubscribe (one-click, con header `List-Unsubscribe`).
  - Template Blanco Editorial responsive, pie universal "Hecho con 💛 en SinAdicciones.org".
  - Webhook `POST /api/webhooks/resend` marca bounces/complaints → `user.email_deliverable=false`.
- ✅ **Correos transaccionales**: welcome (email + Google), password_reset (con variante "solo Google"), waitlist confirmación.
- ✅ **Correos de interacción**: like_no_match (agrupación 24h), new_match (a ambos), plan_confirmed (a ambos), plan_reminder (09:00 CL), event_new_in_group, weekly_summary (jueves 12:00), reengage_14d (template listo).
- ✅ **Correos internos al equipo**: admin_new_user, admin_daily_summary (08:30 CL con delta vs prom 7d), admin_grave_report (throttled 1/h).
- ✅ **Scheduler async** con 3 loops en startup: queue_drain (10 min), scheduled_jobs (08:30 admin summary, 09:00 recordatorios, jueves 12:00 weekly), metrics daily snapshot (03:00).
- ✅ **Endpoints públicos**: `/auth/forgot-password` (no filtra existencia), `/auth/reset-password`, `/email/unsubscribe?token=…` (GET+POST one-click).
- ✅ **Endpoints usuario**: `GET/PATCH /profile/email-preferences` (3 categorías: matches_messages, weekly_summary, plan_reminders).
- ✅ **Endpoints admin**: CRUD `admin/email/recipients` (seed con esteban.scl@gmail.com y nelson@sinadicciones.org), `GET /admin/email/stats`, `POST /admin/email/send-daily-summary`.
- ✅ **UI**:
  - `/olvide-contrasena` y `/reset-password?token=…` con Blanco Editorial.
  - Sección "Correos que quiero recibir" en `/app/perfil/editar` con 3 toggles persistentes.
  - Nueva pestaña "Emails" en `/admin` con destinatarios, toggles por tipo, agregar/eliminar, botón "Enviar resumen diario ahora", tabla de estadísticas por tipo.
- ✅ **Testing**: `testing_agent_v3_fork` iter 17 → **0 issues nuevos**. 22/22 tests backend + 4 flujos frontend, envíos reales confirmados con `resend_id`.


- ✅ **Motor de métricas privacidad-first** (`/app/backend/core/metrics.py`):
  - Sin SDKs de terceros. Todo calculado sobre nuestra propia base de datos MongoDB.
  - Snapshot nocturno a las 03:00 America/Santiago (asyncio task) → colección `metrics_daily`.
  - Contador anónimo `POST /api/support-page/view` (guarda sólo `date` + `count`, jamás `user_id`).
  - Backfill endpoint `POST /api/admin/metrics/backfill` (rango ≤400 días).
- ✅ **7 endpoints de admin métricas** (todos protegidos con `require_admin`, 403 para no-admins):
  - `GET /api/admin/metrics/summary` — north star + KPIs + series diarias + alertas de liquidez
  - `GET /api/admin/metrics/funnel` — 6 pasos (registrados → onboarding → 1er like → 1er match → confirmado → realizado) + medianas + cohortes semanales
  - `GET /api/admin/metrics/matching` — ratio like→match, cohortes ≥1 match/7d, unresponded likes, concentración top10%, distribución de pool
  - `GET /api/admin/metrics/planes` — funnel matches→plan propuesto→confirmado→realizado, actividades top, medianas
  - `GET /api/admin/metrics/comunidad` — grupos activos, próximos eventos, % activos en grupo
  - `GET /api/admin/metrics/retencion` — D1/D7/D30 por cohorte, stickiness (DAU/MAU), dormidos, resucitados
  - `GET /api/admin/metrics/seguridad` — reportes por categoría/día, mediana resolución, graves >4h, reincidentes, bloqueos, visitas apoyo (anónimo), bans/susps
- ✅ **Frontend Métricas** (`/app/frontend/src/pages/admin/Metrics.jsx`):
  - Nueva primera tab en `/admin` con 7 sub-tabs (Resumen · Embudo · Matching · Planes · Comunidad · Retención · Seguridad).
  - Selector de rango 7/30/90 días compartido.
  - Charts con `recharts 3.6.0` (líneas y barras), paleta Blanco Editorial (coral #FF6B5E, violeta #8B5CF6, menta #4ADE80).
  - Delta badges vs semana previa, alertas visuales inline (ratio género, tinca sin respuesta, pool Amor).
  - Exportación CSV por pestaña (`downloadCsv` client-side Blob).
  - Nota de privacidad visible: "Nunca se muestran mensajes, datos de consumo individuales ni identidad de quienes visitan Necesito apoyo".
- ✅ **Instrumentación anónima**: `NecesitoApoyo.jsx` dispara `POST /api/support-page/view` en su `useEffect`.
- ✅ **Testing**: `testing_agent_v3_fork` — 0 issues encontrados (backend 403 gate, anonymous counter sin user_id, 7 endpoints con estructura correcta, validación de rango 7/30/90, backfill validado, todas las 7 tabs UI renderizando KPIs/charts/tablas/CSV correctamente + regresión completa app).


- ✅ **Bloque 1 backend** (sesión previa):
  - Onboarding acepta 1–6 frases (antes fijo en 3). Validación server-side en `POST /profile/onboarding` y `PATCH /profile/me`.
  - Nuevos campos opcionales de perfil: `height_cm` (140–210), `has_children` (si/no/prefiero_no_decir), `zodiac` (derivado de la fecha de nacimiento).
  - Switches de privacidad granular: `show_height` (default false), `show_children` (default true), `show_zodiac` (default false), `show_modes` (default true).
  - `clear_public(user, viewer)` refactorizado: filtra los campos ocultos y respeta `show_modes` (oculta el array completo si off).
  - `GET /api/profile/me/completeness` → `{percent, next_suggestion}` con score ponderado (fotos 20, bio 15, prompts 15, panoramas 10, height 10, hijos 10, zodiac 5, gps 15).
  - Migración idempotente al startup: setea defaults de switches para usuarios existentes y calcula zodiac desde birthdate.
- ✅ **Bloque 2 frontend**:
  - `Onboarding.jsx`: ahora 9 pasos. Paso 6 (Frases) permite agregar/quitar frases dinámicamente (1–6). Paso 7 nuevo "Detalles sobre ti" con inputs opcionales de altura, hijos y switches de visibilidad para altura/hijos/signo/modos.
  - `EditProfile.jsx`: sección "Detalles sobre ti" (estatura, hijos, signo derivado) + sección "Qué se muestra en mi perfil" con 4 switches. Prompts pasan a ser dinámicos con `edit-prompt-add`/`edit-prompt-remove-N`.
  - `Profile.jsx`: medidor visual "Completa tu perfil" en el tope con barra gradient + `next_suggestion` CTA a editar perfil (se oculta al 100%). Nueva tarjeta "Busca · Detalles" con iconos Lucide (Ruler/Baby/Star) filtrada por los propios switches.
  - `Discover.jsx` + `PublicProfile.jsx`: tarjeta "Busca · Detalles" bajo la bio (data-testid `discover-details` / `pp-details`), oculta si no hay datos visibles.
  - Backend `backend_test.py`: nueva clase `TestOnboardingLite` con 8 tests (bounds prompts, detail fields, privacy respect, completeness endpoint). Suite completa: 22/22 verde.


- ✅ **Sistema de diseño**: nuevos tokens (`#0B0C10` fondo, `#1D212B` card, borde `.16`), gradiente coral→violeta EXCLUSIVAMENTE en botones primarios / tab activo / barrita de menú activo / avatares sin foto / riel de "Sobre mí" / pantalla de match. Menta sólo para insignia Sprout y estados confirmados. Coral suelto sólo para distancia, badge de notificaciones y fila "Necesito apoyo".
- ✅ **Cero emojis en UI**: reemplazados en Descubrir, Grupos, Chats, Les tincas, ChatDetail (plan bar + system messages), MisPlanes, Perfil, Onboarding, EditProfile, PublicProfile, LocationPicker, NecesitoApoyo, Waitlist, CuentaSuspendida, GroupDetail. Los emojis que escriben usuarios en bio/mensajes/frases se preservan. Admin queda "mínimo funcional".
- ✅ **Icon registry** (`/app/frontend/src/lib/icons.jsx`) con `<Icon name="..."/>` y mapa `emojiToIconName` para grupos legacy.
- ✅ **Backend**: catálogo de actividades gana campo `icon` (nombre lucide). Migración idempotente hace backfill sobre las actividades existentes por nombre.
- ✅ **BottomNav**: íconos lucide, barrita superior 22×3 con gradient en tab activo, badge como punto coral con anillo del fondo.
- ✅ **Etiquetas de sección `.ps-lab`**: 10px, tracking .13em, blanco, ícono 12px + regla fina al borde. Aplicadas transversalmente.
- ✅ **Chips uniformes en Perfil**: modos como pills blancas con ícono lucide (sin colores por modo).
- ✅ **Tarjeta "Sobre mí"** con riel gradient a la izquierda (`.ps-bio-card`) en Descubrir y Perfil.
- ✅ **Mockup HTML** committeado en `/app/mockups/rediseno-v1.html` como referencia permanente.
- Cero cambios en lógica de negocio. Cero data-testid renombrados.

## Implementado (v1.6 - Feb 2026 - FLUJOMATCH v2)
- ✅ **Match ahora guarda AMBAS propuestas**: `match.proposals = {user1_id: activity_id|null, user2_id: activity_id|null}`. Migración idempotente al startup convierte matches viejos.
- ✅ **4 mensajes de sistema inteligentes** al momento del match:
  - Misma actividad → "¡Están de acuerdo! ☕ Café. Solo falta el cuándo 😊"
  - Distintas → "A Cata le tinca ☕ Café y a Rodri le tinca 🏃 Correr. ¿Cuál va primero?"
  - Solo uno → "A Cata le tinca: ☕ Café. ¿Te sumas?"
  - Ninguno → "¡Se dio el match! Panoramas que les gustan a ambos: cine, ..."
- ✅ **Nueva pestaña "Les tincas"** en Chats con:
  - `GET /api/likes-received` (excluye ya-matcheados, pasados, bloqueados, banned/suspended).
  - Cards con avatar linkeable, propuesta destacada "Le tinca X contigo" y botones **Armar plan** (abre picker inline) + **Pasar**.
  - `POST /api/likes-received/seen` limpia el badge al abrir la pestaña.
- ✅ **Contador de notificaciones**: `/api/notifications/counts` ahora expone `unseen_likes` sumado al `total`. BottomNav lo incluye en el badge de Chats.
- ✅ **Barra de estado del plan** sticky en ChatDetail: chips con emoji+nombre de cada propuesta, CTA "¿Armamos un plan?" si no hay ninguna, banner verde si `plan_status=confirmed`.
- ✅ **Mensajes de sistema estilizados** con gradiente + borde suave, distinguibles del mensaje normal (data-testid `msg-system`).
- ✅ **Job de nudge a las 48h** (inline en `/matches`): si un match no tiene plan confirmado y ambos escribieron al menos una vez, se agrega un mensaje de sistema tipo "¿Le ponemos fecha al ☕ café?" con `nudge_sent=True` (idempotente).
- ✅ **Regresión admin coord leak** confirmada arreglada.

## Implementado (v1.5 - Feb 2026 - AJUSTESV2 Bloques A/B/C)
- ✅ **Bloque A (coherencia de ubicación + Google Auth UX)**:
  - **Bug fix crítico**: `PATCH /profile/me` sólo re-deriva `location` cuando el usuario cambia explícitamente (envía `location` object o cambia `comuna` a un valor distinto). Antes cualquier `PATCH` que incluyera `comuna` pisaba las coordenadas GPS.
  - Nuevo componente `LocationPicker` reusable con GPS → confirmación → fallback manual.
  - Onboarding ahora tiene 8 pasos: paso 2 dedicado a "¿Dónde estás?". Step 0 ya no muestra dropdown de comuna.
  - EditProfile reemplaza dropdown comuna por `LocationPicker` y sólo envía `location` cuando el usuario lo cambia.
  - Waitlist gate: si el LocationPicker detecta país ≠ CL, redirige a `/waitlist`.
  - Login: si el usuario existe pero es sólo-Google (`password_hash: null`), mensaje amable "Esta cuenta ingresa con Google. Usa el botón Continuar con Google".
- ✅ **Bloque B (privacidad de ubicación)**:
  - Coords almacenadas se redondean a 2 decimales (~1km) via `round_coords`. Migración idempotente al startup.
  - `bucket_distance_km()`: distancia expuesta en múltiplos de 5, mínimo 5, máximo 50 (frontend muestra "50+"). Nunca decimales.
  - `/api/admin/users` y `/api/admin/user/{id}` proyectan `location` sin `coords` (admin nunca ve GPS crudo).
  - `reverseGeocode(lat,lng)` en `geo.js` reemplaza el enriquecimiento por IP en la rama GPS (evita mezclar la ciudad de tu VPN con tus coords reales).
- ✅ **Bloque C (Sobre mí)**:
  - Campo `bio` (máx 300 chars) con validación anti-spam: rechaza URLs (`http://`, `www.`, TLDs comunes) y secuencias telefónicas.
  - Textarea en Onboarding paso 6 y en EditProfile, con contador `X/300`.
  - Tarjeta destacada "✍️ Sobre mí" en Discover (debajo de la foto) y en el propio Profile del usuario.

## Implementado (v1.4 - Feb 2026 - Google Auth)
- ✅ **Emergent-managed Google Auth** coexistiendo con email/password:
  - `POST /api/auth/google/session` (backend) intercambia el `session_id` de Emergent Auth por el mismo JWT que usa el resto del app (Bearer + cookie).
  - Vinculación por email: si ya existe cuenta email/password con el mismo correo, se enlaza (agrega `"google"` a `auth_providers`), sin duplicar usuarios.
  - Nuevos usuarios de Google quedan con `password_hash: null`, `onboarding_complete: false`, `auth_providers: ["google"]`.
  - `<AuthCallback/>` detecta `#session_id=` en el hash SINCRÓNICAMENTE durante el render (evita race con `/auth/me`), limpia el fragmento y navega según rol/onboarding.
  - `AuthContext.refresh()` salta `/auth/me` cuando el hash trae `session_id=`.
  - Botón "Continuar con Google" en `/login` y `/registro` con `redirect_url` derivado de `window.location.origin` (sin hardcoding ni fallbacks — funciona igual en preview y en `plansobrio.com`).
  - Onboarding paso 0 muestra input `ob-birthdate` sólo cuando el usuario no tiene `birthdate` (usuarios Google). Server valida +18.

## Implementado (v1.3 - Feb 2026 - GEOSWIPE Bloques 1, 2 y 3)
- ✅ **GEOSWIPE Bloque 1** (swipe gesture): tarjetas de descubrimiento arrastrables con `framer-motion`, umbrales configurables, swipe→right abre modal de plan; cancelar el modal NO consume el "me tinca" y retorna la tarjeta al centro.
- ✅ **GEOSWIPE Bloque 2** (multi-país + geo estructural):
  - Nuevas colecciones `countries` y `helplines`, sembradas idempotentemente al arranque.
  - Nuevos endpoints públicos: `GET /api/geo/countries`, `GET /api/geo/helplines?country=CL`.
  - Migración de `users` y `groups`: campo `location` GeoJSON Point + `country` (código ISO). Índice `2dsphere` en `location.coords`.
  - `build_location_doc()` deriva coords desde GPS/IP → comuna/city → centroide país (fallback en cascada).
  - Backfill idempotente: demos + admin + grupos existentes obtienen `location` desde `RM_CENTROIDS` según `comuna`.
  - Onboarding y `PATCH /api/profile/me` aceptan `location` opcional y re-derivan automáticamente si cambia `comuna` (defaulteando a CL cuando no hay país explícito).
  - **Privacidad**: `clear_public()` NUNCA expone `coords`; solo `country`, `city`, `comuna`.
  - `NecesitoApoyo` UI lee helplines desde la API con fallback a constantes.
- ✅ **GEOSWIPE Bloque 3** (GPS + discover por distancia + waitlist):
  - `/api/discover` usa `$geoNear` cuando el usuario tiene `location.coords`, con parámetro `radius_km` (1–500).
  - `distance_km` (redondeado a 1 decimal) se expone en cada tarjeta pública; coords siguen ocultas.
  - `/app/frontend/src/lib/geo.js`: `detectLocation()` combina GPS (5s timeout) + fallback IP `bigdatacloud.net/data/reverse-geocode-client`, con cache de 24h.
  - `Discover` auto-PATCHea la ubicación SOLO si `source === 'gps'` (evita mover usuarios por proxies/VPN/IP compartida).
  - Filtro de "Distancia máxima" en modal de Filtros (chips: Sin límite / 5 / 10 / 25 / 50 / 100 km).
  - Tarjeta muestra "· a X km" junto a la comuna.
  - Nuevo endpoint público `POST /api/waitlist` con upsert por email.
  - Nueva página `/waitlist` con detección automática y formulario email/país/ciudad.
  - Register redirige a `/waitlist` si la IP resuelve fuera de Chile.

## Implementado (v1.2 - Feb 2026 - BLOQUES 1-4 de CORRECCIONES.md)
- ✅ **BLOQUE 1** (bugs críticos): quota solo cuenta likes, DELETE /profile/me borra 12 colecciones, demos con modo Amor tienen foto Unsplash, doble confirmación de eliminar cuenta.
- ✅ **BLOQUE 2** (seguridad): validación server-side de likes (compatibilidad completa Amor bidireccional), bloqueos respetados en pass/mensajes/propose-plan, CORS restringido con FRONTEND_URL, /api/files con auth (Bearer o ?auth=), rate-limit 60 msgs/min combinado, categorías de reporte enum + prioridad alta para ofrece_sustancias.
- ✅ **BLOQUE 3** (rendimiento): N+1 eliminadas en 8 endpoints con aggregations, 16 índices Mongo, paginación de mensajes (`?before=&limit=`), polling con visibility API + backoff 12s inactivo, compresión de imágenes cliente (max 1080px JPEG q0.82), split core/{storage,seed_data}.py.
- ✅ **BLOQUE 4** (compliance): videos ocultos en toda la UI (backend guarda campo por si se reactiva), pantalla amable /cuenta-suspendida con formatted Spanish date, mensajes de error unificados en chileno, páginas /terminos + /privacidad enlazadas desde Landing/Register/Perfil, botón Admin "Limpiar datos de prueba" para usuarios test_*.

## Implementado (v1.1 - Feb 2026 - iteración 2)
- ✅ **Notificaciones in-app**: endpoint `/api/notifications/counts` polling cada 15s en BottomNav, badge en Chats con conteo, toast cuando llega match/mensaje nuevo, marcado como visto al abrir /chats o un chat específico
- ✅ **Videos cortos**: subida vía Emergent object storage (mp4/mov/webm, máx 40MB), integrado en Onboarding paso 5, EditProfile y visible en Discover card + Profile page (máx 3 videos por usuario)
- ✅ **Filtros adicionales en Descubrir**: modal con rango de edad global (age_min/age_max) y comuna específica, badge con conteo de filtros activos, botón "Limpiar"

## Implementado (v1 - Feb 2026)
- ✅ Auth email/pass JWT + validación 18+
- ✅ Onboarding 7 pasos con barra de progreso (alias, género, comuna, modos, relación con consumo, actividades favoritas, fotos, prompts, reglas)
- ✅ Subida de fotos vía Emergent object storage
- ✅ Descubrir con selector Apoyo/Amistad/Amor, filtros estrictos por modo/género/edad, ordenamiento comuna → RM → otra región
- ✅ Modal "¿Qué plan harías con [alias]?" con 3 sugerencias inteligentes, otro plan, o sin plan
- ✅ Match reciproco + pantalla de celebración "¡Hay plan! 🎉" + primer mensaje del sistema con el plan propuesto
- ✅ Chat 1-a-1 con polling cada 4s, proponer plan (actividad + fecha/hora), aceptar plan
- ✅ Mis Planes (próximos y pasados)
- ✅ Grupos: 4 sembrados, unirse/salir, chat grupal, eventos con RSVP "Voy"
- ✅ Necesito apoyo: respiración guiada 4-4-6 animada con framer-motion, mis razones CRUD, 3 teléfonos oficiales (Salud Responde 600 360 7777, Suicidio *4141, Urgencias 131), link SinAdicciones.org
- ✅ Bloquear + Reportar (5 categorías)
- ✅ Panel admin (dashboard con stats, reportes con acciones warn/suspend/ban, usuarios, CRUD actividades y grupos)
- ✅ Eliminar cuenta con doble confirmación
- ✅ Datos sembrados: admin, 16 actividades, 4 grupos con evento, 12 perfiles demo (edades 22-45, comunas variadas)
- ✅ Diseño oscuro premium mobile-first (fondo #0E0F13, gradiente coral #FF6B5E → violeta #8B5CF6, verde menta #4ADE80)
- ✅ Bottom nav fija con 5 items (Descubrir, Grupos, Mis planes, Chats, Perfil)
- ✅ 100% microcopy chileno ("me tinca", "panorama", "junta")

## Backlog / Próximos pasos
### P1
- [ ] **Grupo "PlanSobrio · Feedback"**: grupo especial verificado con `POST /api/groups/{id}/posts` (thread 1 nivel) en lugar de chat/eventos estándar.
- [ ] Notificaciones push o email cuando hay match nuevo o mensaje
- [ ] Verificación de foto por selfie (anti perfiles falsos)
- [ ] CRUD de eventos desde admin (creación fue implementada, editar/eliminar en admin panel)
- [ ] Filtros extra en Descubrir: rango edad global (no solo Amor), comuna específica
- [ ] Historial de reportes/strikes visible por admin sobre cada usuario
- [ ] Mensajes con emojis reacciones

### P2
- [ ] Pagos / suscripciones premium (más me tinca al día, ver quién dio like)
- [ ] Videos cortos en perfil
- [ ] Mapa interactivo de eventos
- [ ] Multi-idioma (portugués Brasil, español general)
- [ ] IA que sugiere actividades personalizadas basadas en gustos
- [ ] Analytics privado (sin SDK terceros)

## Credenciales de prueba
Ver `/app/memory/test_credentials.md`
- Admin: contacto@sinadicciones.org / Jodorowsky100
- Demo users: demo1@plansobrio.cl … demo12@plansobrio.cl / Demo1234!
