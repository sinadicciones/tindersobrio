# PlanSobrio - Product Requirements Document

**Última actualización:** 2026-02-05

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

## Implementado (v1.3 - Feb 2026 - GEOSWIPE Bloques 1 y 2)
- ✅ **GEOSWIPE Bloque 1** (swipe gesture): tarjetas de descubrimiento arrastrables con `framer-motion`, umbrales configurables, swipe→right abre modal de plan; cancelar el modal NO consume el "me tinca" y retorna la tarjeta al centro.
- ✅ **GEOSWIPE Bloque 2** (multi-país + geo estructural):
  - Nuevas colecciones `countries` y `helplines`, sembradas idempotentemente al arranque.
  - Nuevos endpoints públicos: `GET /api/geo/countries`, `GET /api/geo/helplines?country=CL`.
  - Migración de `users` y `groups`: campo `location` GeoJSON Point + `country` (código ISO). Índice `2dsphere` en `location.coords`.
  - `build_location_doc()` deriva coords desde GPS/IP → comuna/city → centroide país (fallback en cascada).
  - Backfill idempotente: demos + admin + grupos existentes obtienen `location` desde `RM_CENTROIDS` según `comuna`.
  - Onboarding y `PATCH /api/profile/me` aceptan `location` opcional y re-derivan automáticamente si cambia `comuna`.
  - **Privacidad**: `clear_public()` NUNCA expone `coords`; solo `country`, `city`, `comuna`.
  - `NecesitoApoyo` UI lee helplines desde la API con fallback a constantes.

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
