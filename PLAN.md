# PlanSobrio — Dating y Conexiones Sobrias

**Plan de producto y desarrollo — v1.0**

> Conoce personas que viven sin alcohol ni drogas. Amistad, apoyo, grupos y amor — con el plan incluido.

Este documento es la guía completa para programar la app. Está ordenado de lo estratégico a lo técnico: primero el producto, luego las pantallas, el modelo de datos, la arquitectura y el roadmap de construcción.

---

## 1. Concepto

### 1.1 El problema (validado por experiencia directa)

Al salir de tratamiento o dejar el consumo, la pregunta es: **"¿ahora con quién salgo?"**

- En Tinder/Bumble la mayoría toma; los planes default son de noche, con alcohol y factores de riesgo.
- Decir "no tomo / no consumo" es incómodo y a veces expone.
- El círculo social anterior gira en torno al consumo; hay que reconstruir desde cero: amigos, pareja, panoramas.

### 1.2 La solución

Una app donde **todos ya viven (o quieren vivir) sin alcohol ni drogas**, por lo que:

1. **La declaración ya está hecha** — nadie tiene que explicar que no toma.
2. **El match viene con plan incluido** — al hacer match se elige un "plan sobrio" (café, caminata, museo, deporte) desde un catálogo curado. La app no solo conecta: diseña la salida segura.
3. **Cuatro intenciones en el mismo pool** — apoyo, amistad, grupos y amor. Esto multiplica la liquidez (crítico con pocos usuarios) y refleja la necesidad real post-tratamiento.

### 1.3 Posicionamiento

- **No** se comunica como "app para adictos": es *"la app chilena para conocer gente que vive sin alcohol ni drogas"*.
- Marca hermana de **SinAdicciones** (sinadicciones.org): el contenido, los planes sobrios y la derivación profesional viven en la web; la app es el matching.
- Frase guía: *"SinAdicciones ayuda a salir del consumo. PlanSobrio ayuda a construir la vida que viene después."*

### 1.4 Ventajas competitivas

| Ventaja | Detalle |
|---|---|
| Embudo propio | +3.000 suscriptores del reto 21 días sin drogas, en crecimiento; cada cohorte alimenta la app |
| Marca con confianza | SinAdicciones ya tiene autoridad en el nicho en Chile |
| Mecánica única | Match por plan (ninguna app de dating lo hace) |
| Sin competencia local | Loosid/Sober Sidekick no operan en español ni con contexto chileno |
| Contenido externo | Catálogo de planes y artículos viven en sinadicciones.org (SEO + cero costo de app) |

---

## 2. Los 4 modos de conexión

Cada usuario declara qué busca (puede elegir varios). El descubrimiento y el matching respetan estas intenciones. **Regla de oro: nunca se muestra intención romántica a quien no la activó.**

### 2.1 🤝 Apoyo

Compañeros de proceso ("accountability partners").

- Perfil enfocado en etapa del proceso, no en fotos.
- Match por: etapa similar o complementaria (alguien con más tiempo puede acompañar), horarios, comuna.
- Interacción: chat + check-in mutuo opcional ("¿cómo va tu semana?").
- Sugerencias de la app: llamadas cortas, caminatas, acompañar a reuniones.
- **Sin componente romántico. Sin fotos obligatorias.**

### 2.2 🙂 Amistad

Amigos para planes sin alcohol.

- Match por: intereses, comuna, disponibilidad, tipo de plan favorito.
- Descubrimiento estilo tarjetas, pero el "like" es **"¿harías este plan con esta persona?"**.
- Permite matches del mismo género o cualquier género (es amistad).

### 2.3 ❤️ Amor

Citas con intención romántica — el "Tinder sobrio".

- Solo visible entre usuarios que activaron este modo y son compatibles en género/orientación y rango de edad.
- Match por plan: en vez de solo like, se propone un plan concreto del catálogo ("café en Providencia el sábado").
- La app sugiere por defecto **planes de día, en lugares públicos, sin exposición a alcohol**.
- Botón "compartir mi plan con un contacto de confianza" antes de la cita.
- Nudge (no bloqueo): si el usuario declara <30 días sin consumo, la app recomienda partir por amistad/apoyo.

### 2.4 👥 Grupos

Actividades y comunidades pequeñas.

- Grupos por comuna + interés: "Caminatas Santiago Oriente", "Café sobrio Providencia", "Fútbol sin copete", "Primeros 30 días (online)".
- Cada grupo tiene: descripción, reglas, moderador, chat grupal y **eventos** (fecha, lugar, cupos, inscripción).
- Los eventos presenciales (Café Sobrio mensual) son el motor de liquidez: donde el 1-a-1 aún no alcanza, el grupo sostiene.
- Fase 1: grupos creados solo por el equipo. Fase 2: usuarios con reputación pueden proponer grupos.

---

## 3. Mecánica central: Match por Plan

Es la feature diferenciadora. Flujo:

1. **Descubrimiento**: el usuario ve tarjetas de personas compatibles según su modo activo.
2. En cada tarjeta, en vez de solo like/pass, aparece: **"¿Harías un plan con [alias]?"** → elige entre 3 planes sugeridos (del catálogo, filtrados por comuna e intereses de ambos) o "me interesa, sin plan aún".
3. **Match**: cuando hay interés mutuo se abre el chat, con el plan propuesto como primer mensaje automático: *"A ambos les tinca: ☕ Café + conversación en Providencia. ¿Coordinamos?"*
4. **Confirmar plan**: dentro del chat pueden fijar fecha/hora del plan → queda en la agenda de ambos → recordatorio + botón "compartir con contacto de confianza".
5. **Post-plan**: al día siguiente, la app pregunta a cada uno (privado): ¿fue? ¿cómo estuvo? ¿te sentiste seguro/a? → alimenta reputación interna y el score del lugar.

El catálogo de planes se administra desde el panel y se publica también en sinadicciones.org (misma base de datos, la web enlaza a la app y viceversa).

---

## 4. Onboarding y perfil

### 4.1 Onboarding (máximo 8 pantallas, < 3 minutos)

1. **Bienvenida**: "Aquí nadie tiene que explicar por qué no toma."
2. **Registro**: email o teléfono + contraseña (o magic link). Alias público (nunca se exige nombre real en el perfil).
3. **Datos básicos**: edad (18+ obligatorio, verificación de fecha de nacimiento), género (opcional para amistad/apoyo; requerido si activa Amor), comuna/región.
4. **¿Qué buscas?** (multi-selección): Apoyo / Amistad / Grupos / Amor.
5. **Mi relación con el consumo** (privado por defecto, granularidad que el usuario elige mostrar):
   - "Vivo sin alcohol ni drogas" / "Estoy dejándolo" / "Prefiero no decir"
   - Tiempo sin consumo (rangos, opcional): <30 días, 1–3 meses, 3–12 meses, +1 año, +5 años
   - Sustancia principal: **siempre privada**, solo para recomendar grupos.
6. **Mis planes favoritos**: café, caminata/trekking, deporte, cine, museos/cultura, comida, lectura, música, espiritualidad, juegos, mascotas… (mínimo 3).
7. **Verificación de perfil**: selfie con gesto aleatorio (revisión en panel de moderación; badge "Verificado"). Se puede postergar, pero sin verificación no se puede chatear.
8. **Compromiso de comunidad**: aceptar reglas (no ofrecer sustancias, no romantizar consumo, respeto, no acoso) + aviso: "esta app no reemplaza tratamiento ni atención de urgencia" + links de ayuda.

### 4.2 Perfil público

- Alias, edad, comuna, badge verificado.
- Fotos: 1–6 (opcionales en modos apoyo/grupos; mínimo 1 para Amor).
- **Prompts sobrios** (elige 3):
  - "Mi plan ideal sin alcohol es…"
  - "Lo que estoy reconstruyendo…"
  - "Un panorama que descubrí en sobriedad…"
  - "Me ayuda cuando estoy ansioso/a…"
  - "Mi domingo perfecto…"
- Intereses (chips).
- Tiempo sin consumo: **solo si el usuario elige mostrarlo** (badge "+1 año", etc.).
- Modos activos visibles solo según contexto (ver regla de oro §2).

### 4.3 Privacidad por diseño (Ley 21.719 — datos sensibles)

- Sustancia, etapa, respuestas de check-in: **datos sensibles** → cifrados en reposo, nunca públicos, nunca compartidos con terceros ni SDKs de analytics/ads.
- Consentimiento expreso y separado para datos sensibles en el onboarding.
- Alias por defecto; email/teléfono desacoplados del perfil público.
- Exportación y eliminación de cuenta (borrado real, no soft-delete de datos sensibles) desde ajustes.
- Analytics solo con eventos anónimos y agregados (sin contenido de chats ni datos de consumo).

---

## 5. Funcionalidades por fase

### FASE 1 — MVP (objetivo: beta cerrada con 300 usuarios)

| # | Feature | Detalle |
|---|---|---|
| 1 | Registro + onboarding | §4.1 completo |
| 2 | Perfil con intención | 4 modos, prompts, fotos, privacidad granular |
| 3 | Verificación por selfie | Cola de revisión en panel admin |
| 4 | Descubrimiento por tarjetas | Filtros: modo, comuna/distancia, edad; algoritmo §6 |
| 5 | Match por plan | Catálogo de ~50 planes curados (Santiago) |
| 6 | Chat 1-a-1 post-match | Texto + fotos; sin audio/video en MVP |
| 7 | Grupos (solo oficiales) | 4 grupos iniciales + chat grupal + eventos con inscripción |
| 8 | Seguridad básica | Reportar, bloquear, desmatch; compartir plan con contacto de confianza |
| 9 | Botón "Necesito apoyo" | Pantalla con: respiración guiada, razones guardadas, llamar contacto de confianza, links SinAdicciones + líneas de ayuda (Salud Responde 600 360 7777, *4141) |
| 10 | Panel de administración | Moderación de reportes, verificaciones, CRUD planes/grupos/eventos, baneos |
| 11 | Notificaciones push | Match, mensaje, evento, recordatorio de plan |
| 12 | Derivación SinAdicciones | Sección "¿Necesitas más ayuda?" → orientación/centros en la web |

**Fuera del MVP a propósito**: tracker/contador de días como feature central (solo badge opcional), feed de comunidad, IA, premium, swipe ilimitado tipo casino, video, mapa interactivo (el catálogo es lista con link a Google Maps).

### FASE 2 — Apertura a los 3.000 (mes 3–5)

- Filtros avanzados (etapa de sobriedad, intereses específicos, disponibilidad horaria).
- Grupos propuestos por usuarios (con aprobación).
- Reputación interna (asistencia a planes/eventos, feedback post-plan).
- Check-in post-plan y Score Sobrio de lugares alimentado por la comunidad.
- Formulario "recomendar un lugar/plan".
- Modo Apoyo enriquecido: check-in mutuo semanal entre partners.

### FASE 3 — Monetización y escala (mes 6+)

- **Premium** ($3.990–$5.990/mes): filtros avanzados, ver quién te dio like, likes ilimitados (free: 10/día), boost semanal, descuentos en eventos y locales aliados. **El chat y el match básico nunca se cobran.**
- Locales aliados (ficha destacada, cupones "PlanSobrio").
- Regiones: Valparaíso/Viña, Concepción.
- Preparación LATAM (i18n de jerga, catálogos por ciudad).

---

## 6. Algoritmo de matching (v1, sin ML)

Score de compatibilidad entre usuario A y candidato B, calculado por modo:

### Base (todos los modos)
```
+25  modo buscado coincide (ambos quieren amistad, o A busca apoyo y B ofrece apoyo, etc.)
+20  misma comuna (+10 si comuna vecina / <15 km)
+20  intereses en común (4 pts c/u, máx 5)
+10  planes favoritos en común
+10  disponibilidad horaria compatible
+10  ambos verificados
-100 bloqueo/reporte previo entre ellos (excluir)
```

### Ajustes modo Amor
```
Filtro duro: género/orientación compatible + dentro del rango de edad de ambos
+10  etapa de sobriedad similar (o ambos +1 año)
-15  uno de los dos <30 días (se muestra, pero despriorizado + nudge)
```

### Ajustes modo Apoyo
```
+15  etapas complementarias (B lleva más tiempo que A)
+10  misma sustancia principal (solo si AMBOS la marcaron compartible; nunca se revela cuál)
```

### Reglas de fairness / liquidez
- Cola de descubrimiento: ordenar por score con ruido aleatorio (±10) para no mostrar siempre los mismos.
- Límite de 10 likes/día en free (mantiene señal de intención alta y protege liquidez).
- Perfiles nuevos reciben boost las primeras 72 h.
- Si el pool filtrado de un usuario tiene <10 candidatos → ampliar radio geográfico automáticamente y sugerir grupos/eventos ("mientras crece tu zona, este sábado hay Café Sobrio").

---

## 7. Seguridad y moderación (no negociable)

### 7.1 Prevención
- Verificación por selfie obligatoria para chatear.
- 18+ estricto.
- Sin ubicación exacta: solo comuna. Distancias aproximadas.
- Chat solo tras match mutuo; primer mensaje sugerido (reduce openers agresivos).
- Detección de palabras clave en reportes y perfiles: venta/oferta de sustancias, presión, contenido sexual no consentido.

### 7.2 Reacción
- Reportar (categorías: ofrece sustancias, acoso, perfil falso, comportamiento en cita, otro) → cola de moderación con SLA interno de 24 h; categoría "ofrece sustancias" y "comportamiento en cita" con prioridad < 4 h.
- Bloqueo inmediato bilateral (desaparecen mutuamente de descubrimiento y chats).
- Strikes: 1 advertencia → suspensión 7 días → ban permanente (con revisión humana). Oferta de sustancias = ban inmediato.
- Usuario baneado: se conserva hash de teléfono/email para impedir re-registro.

### 7.3 Riesgo vital
- Detección de lenguaje de crisis en el botón de apoyo y reportes → mostrar SIEMPRE: Salud Responde 600 360 7777, línea de prevención del suicidio *4141, urgencias 131.
- La app nunca afirma "estás bien" ni evalúa riesgo clínico. Deriva.

### 7.4 Protección del vulnerable (anti "13th stepping")
- Nudge a modo amistad/apoyo si <30 días.
- Feedback post-plan privado (¿te sentiste seguro/a?) alimenta reputación; patrones de feedback negativo → revisión humana del perfil.
- Reglas visibles en cada apertura de chat nuevo en modo Amor.

### 7.5 Roles
| Rol | Permisos |
|---|---|
| user | uso normal |
| peer_moderator | modera grupos asignados, oculta mensajes, escala reportes |
| admin | todo el panel: reportes, verificaciones, CRUD, baneos |

---

## 8. Estructura de pantallas

Navegación inferior con 5 tabs:

```
┌──────────────────────────────────────────────────┐
│  1. Descubrir   → tarjetas + match por plan      │
│  2. Grupos      → mis grupos, explorar, eventos  │
│  3. Planes      → catálogo, mis planes agendados │
│  4. Chats       → matches y conversaciones       │
│  5. Perfil      → mi perfil, ajustes, apoyo      │
└──────────────────────────────────────────────────┘
Botón flotante discreto en Perfil y Chats: "Necesito apoyo" 
```

### Mapa de pantallas (MVP)

```
Auth
├── Splash / Welcome
├── Registro (email/teléfono)
├── Login
└── Onboarding (8 pasos, §4.1)

Descubrir
├── Feed de tarjetas (por modo activo, switch arriba: 🤝 🙂 ❤️)
├── Detalle de perfil
├── Selector de plan ("¿harías este plan con...?")
├── Pantalla de Match (celebración + plan propuesto)
└── Filtros (modo, distancia, edad)

Grupos
├── Mis grupos
├── Explorar grupos
├── Detalle de grupo (info, reglas, miembros, eventos)
├── Chat grupal
└── Detalle de evento + inscripción

Planes
├── Catálogo (lista con filtros: comuna, categoría, precio)
├── Detalle de plan/lugar (score sobrio, ideal para, mapa link)
└── Mis planes agendados (próximos, pasados, feedback)

Chats
├── Lista de matches/conversaciones
├── Chat 1-a-1 (+ proponer/confirmar plan, compartir con contacto)
└── Opciones: reportar, bloquear, desmatch

Perfil
├── Mi perfil (preview + editar)
├── Verificación
├── Contacto de confianza (CRUD)
├── Privacidad (qué muestro, datos, eliminar cuenta)
├── Necesito apoyo (respiración, razones, llamar, líneas de ayuda, SinAdicciones)
└── Ajustes (notificaciones, cuenta, reglas, legal)

Admin (web separada)
├── Cola de verificaciones
├── Cola de reportes
├── Usuarios (buscar, strikes, ban)
├── CRUD planes/lugares
├── CRUD grupos/eventos
└── Métricas básicas
```

---

## 9. Modelo de datos (PostgreSQL)

```sql
-- ============ USUARIOS ============
users (
  id              uuid PK,
  phone_or_email  text UNIQUE,        -- credencial, nunca pública
  alias           text NOT NULL,
  birthdate       date NOT NULL,      -- validar 18+
  gender          text,               -- male|female|nonbinary|other|null
  orientation     text,               -- para modo amor
  comuna_id       int FK,
  bio_prompts     jsonb,              -- [{prompt_id, answer}]
  interests       text[],
  fav_plan_categories text[],
  verified        boolean DEFAULT false,
  verification_status text,           -- pending|approved|rejected
  role            text DEFAULT 'user',
  status          text DEFAULT 'active', -- active|suspended|banned
  boost_until     timestamptz,
  created_at      timestamptz
)

user_modes (                          -- modos activos e intención
  user_id uuid FK, mode text,         -- apoyo|amistad|amor|grupos
  active boolean, prefs jsonb,        -- ej amor: {age_min, age_max, genders[]}
  PRIMARY KEY (user_id, mode)
)

user_sensitive (                      -- SEPARADA, cifrada, RLS estricta
  user_id         uuid PK FK,
  recovery_stage  text,               -- consuming|lt30d|1_3m|3_12m|gt1y|gt5y
  show_stage      boolean DEFAULT false,
  substance       text,               -- NUNCA se expone en API pública
  substance_shareable boolean DEFAULT false,
  consent_sensitive_at timestamptz    -- consentimiento expreso Ley 21.719
)

user_photos (
  id uuid PK, user_id uuid FK, url text, position int, approved boolean
)

trusted_contacts (
  id uuid PK, user_id uuid FK, name text, phone text, relation text
)

-- ============ MATCHING ============
likes (
  id uuid PK,
  from_user uuid FK, to_user uuid FK,
  mode text,                          -- apoyo|amistad|amor
  proposed_plan_id uuid FK NULL,      -- match por plan
  created_at timestamptz,
  UNIQUE (from_user, to_user, mode)
)

matches (
  id uuid PK,
  user_a uuid FK, user_b uuid FK,
  mode text,
  agreed_plan_id uuid FK NULL,
  status text DEFAULT 'active',       -- active|unmatched|blocked
  created_at timestamptz
)

blocks ( blocker uuid FK, blocked uuid FK, created_at, PK(blocker, blocked) )

-- ============ CHAT ============
conversations ( id uuid PK, match_id uuid FK NULL, group_id uuid FK NULL )

messages (
  id uuid PK, conversation_id uuid FK, sender_id uuid FK,
  body text, type text DEFAULT 'text', -- text|image|plan_proposal|system
  metadata jsonb,                      -- plan_proposal: {plan_id, date}
  created_at timestamptz, hidden_by_mod boolean DEFAULT false
)

-- ============ PLANES / LUGARES ============
places (
  id uuid PK, name text, comuna_id int FK,
  category text,        -- cafe|outdoor|sport|culture|food|wellness|other
  address text, maps_url text,
  price_range int,      -- 1..3
  sober_score int,      -- 0..100, curado por admin en fase 1
  ideal_for text[],     -- primera_cita|amistad|grupo|primeros_30_dias
  alcohol_exposure text,-- none|low|medium
  active boolean, created_by uuid FK NULL
)

plan_templates (        -- "café + conversación", "caminata cerro San Cristóbal"
  id uuid PK, title text, emoji text, category text,
  place_id uuid FK NULL, description text, active boolean
)

scheduled_plans (       -- plan confirmado entre dos personas
  id uuid PK, match_id uuid FK, plan_template_id uuid FK,
  datetime timestamptz, status text,  -- proposed|confirmed|done|cancelled
  shared_with_contact boolean DEFAULT false
)

plan_feedback (
  id uuid PK, scheduled_plan_id uuid FK, user_id uuid FK,
  attended boolean, rating int, felt_safe boolean, notes text
)

-- ============ GRUPOS / EVENTOS ============
groups (
  id uuid PK, name text, description text, rules text,
  comuna_id int FK NULL, category text, is_online boolean,
  moderator_id uuid FK, official boolean DEFAULT true, active boolean
)

group_members ( group_id FK, user_id FK, role text, joined_at, PK(group_id,user_id) )

events (
  id uuid PK, group_id uuid FK, title text, description text,
  place_id uuid FK NULL, datetime timestamptz, capacity int, status text
)

event_attendees ( event_id FK, user_id FK, status text, PK(event_id,user_id) )

-- ============ SEGURIDAD ============
reports (
  id uuid PK, reporter_id uuid FK, target_user_id uuid FK,
  context text,          -- profile|chat|group|event|plan
  category text,         -- substances|harassment|fake|date_behavior|other
  detail text, evidence_message_ids uuid[],
  status text DEFAULT 'open', priority int, resolved_by uuid, resolved_at
)

strikes ( id uuid PK, user_id uuid FK, reason text, report_id uuid FK, created_at )

banned_credentials ( credential_hash text PK, banned_at timestamptz )

-- ============ CATÁLOGOS ============
comunas ( id PK, name, region, lat, lng )
```

**Reglas de acceso (RLS) críticas:**
- `user_sensitive`: solo el propio usuario (y agregados anónimos para admin).
- `messages`: solo participantes de la conversación + moderación con registro de auditoría.
- `likes` recibidos: ocultos en free (feature premium fase 3).

---

## 10. Arquitectura técnica

### Stack recomendado (equipo chico, presupuesto bajo, velocidad)

| Capa | Tecnología | Por qué |
|---|---|---|
| App móvil | **React Native + Expo** | Un código para iOS/Android, OTA updates, push fácil, contratable en Chile |
| Backend | **Supabase** (PostgreSQL + Auth + Realtime + Storage + Edge Functions) | Auth listo, RLS para privacidad, realtime para chat sin servidor propio, generoso free tier |
| Chat | Supabase Realtime (canal por conversación) | Suficiente hasta decenas de miles de usuarios |
| Push | Expo Notifications | Integración directa |
| Panel admin | **Next.js** (web) sobre la misma base Supabase | Reutiliza RLS/roles; deploy en Vercel |
| Web pública / planes | sinadicciones.org (WordPress actual) consumiendo API pública de `places`/`plan_templates`, o export periódico | El SEO vive en la web |
| Analytics | PostHog self-host o eventos propios en Postgres | Nada de Meta/Google SDK dentro de la app (datos sensibles) |
| CI/CD | GitHub Actions + EAS Build | Builds automatizados |

### Estructura de repositorio (monorepo)

```
tindersobrio/
├── apps/
│   ├── mobile/          # Expo React Native
│   │   ├── app/         # expo-router: pantallas según §8
│   │   ├── components/
│   │   ├── features/    # discover/ match/ chat/ groups/ plans/ profile/ support/
│   │   ├── lib/         # supabase client, notifications, analytics
│   │   └── theme/
│   └── admin/           # Next.js panel
├── packages/
│   ├── db/              # migraciones SQL, tipos generados
│   └── shared/          # tipos TS compartidos, constantes (modos, categorías)
├── supabase/
│   ├── migrations/
│   └── functions/       # edge functions: matching feed, moderación, hooks
└── PLAN.md
```

### Endpoints / funciones principales (Edge Functions o RPC)

```
POST  /auth/*                    (Supabase Auth)
GET   /feed?mode=&filters=       → candidatos ordenados por score (§6), pagina 10
POST  /likes                     {to_user, mode, proposed_plan_id?}
                                 → si es recíproco crea match + conversation + system message
POST  /matches/:id/unmatch
POST  /blocks                    {blocked_id}
POST  /reports
GET   /plans?comuna=&category=
POST  /scheduled-plans           {match_id, plan_template_id, datetime}
POST  /scheduled-plans/:id/confirm | /cancel | /share-contact
POST  /plan-feedback
GET   /groups | POST /groups/:id/join
GET   /events | POST /events/:id/rsvp
POST  /verification              (sube selfie → cola admin)
GET/PUT /me, /me/modes, /me/sensitive, /me/trusted-contacts
DELETE /me                       (borrado real de datos sensibles)
```

El feed de matching se calcula server-side (edge function con SQL: filtros duros → score → ruido → excluir vistos/bloqueados) — nunca en el cliente, para no filtrar datos de otros usuarios.

---

## 11. Integración con sinadicciones.org

| Desde | Hacia | Cómo |
|---|---|---|
| Reto 21 días (día 21) | App | Email/WhatsApp automático con deep link de invitación + código de cohorte |
| sinadicciones.org/planes | App | Páginas SEO de planes sobrios generadas desde la tabla `places` (API pública read-only) con CTA "haz este plan con alguien de PlanSobrio" |
| App → "Necesito más ayuda" | sinadicciones.org | Links a orientación, test, cotización de tratamiento, directorio de centros |
| App (botón apoyo) | Líneas oficiales | Salud Responde 600 360 7777, *4141, 131 |
| Newsletter 3.000 | App | Campañas de invitación por olas (§13) |

**Regla ética**: la derivación siempre la inicia el usuario. Jamás se venden ni comparten datos de usuarios con centros de tratamiento.

---

## 12. Modelo de negocio

- **Meses 1–6: 100% gratis.** El objetivo es densidad, no ingresos.
- **Fase 3 — Premium** ($3.990–$5.990 CLP/mes vía compras in-app):
  - Likes ilimitados (free: 10/día)
  - Ver quién te dio like
  - Filtros avanzados (etapa, intereses, disponibilidad)
  - 1 boost semanal
  - Descuentos en eventos y locales aliados
  - **Nunca de pago**: matchear, chatear, grupos, botón de apoyo, seguridad.
- **B2B locales** (fase 3+): ficha destacada, sello "Lugar PlanSobrio", cupones.
- **Valor indirecto**: embudo de máxima calidad hacia servicios de SinAdicciones (orientación, programas) — siempre iniciado por el usuario.
- Marketing: posicionar como "conoce gente sin exponerte", **no** prometer prevención de recaídas ni resultados terapéuticos.

---

## 13. Lanzamiento y crecimiento

### Beta cerrada (300 usuarios, solo Santiago)
1. Encuesta previa a los 3.000 → seleccionar 300 con mejor mix de género/edad/comuna (la liquidez de dating exige balance, no solo volumen).
2. Entrada por cohortes semanales de ~75 para que el feed se sienta vivo.
3. Primer **Café Sobrio presencial** en la semana 3 de la beta.
4. Criterio para abrir a los 3.000: ≥40% de los usuarios de la beta con ≥1 match y ≥25% con un plan agendado en 4 semanas. Si no, iterar mecánica antes de escalar.

### Apertura (3.000 + reto en curso)
- Invitación por olas de 500/semana.
- Cada cohorte que termina el reto de 21 días recibe invitación automática (día 21).
- 1 evento presencial mensual mínimo + 1 online.

### Métricas norte
| Métrica | Meta inicial |
|---|---|
| Usuarios con ≥1 match en semana 1 | ≥40% |
| Matches que agendan plan | ≥25% |
| Planes agendados que se concretan | ≥50% |
| Retención semana 4 | ≥30% |
| Reportes graves sin resolver >24 h | 0 |
| Ratio género en pool activo | entre 40/60 y 60/40 |

---

## 14. Roadmap de construcción (12 semanas)

### Sprint 0 (semana 1): fundaciones
- Monorepo, Expo + Supabase + Next.js admin esqueleto, CI.
- Migraciones: `users`, `user_modes`, `user_sensitive`, `comunas`, RLS base.
- Diseño: sistema de UI (colores, tipografía, componentes base). Tono cálido, nada clínico.

### Sprints 1–2 (semanas 2–3): identidad
- Registro/login, onboarding completo, perfil (crear/editar/preview), fotos, verificación por selfie + cola en admin.

### Sprints 3–4 (semanas 4–5): matching
- Catálogo de planes (seed: 50 lugares Santiago curados a mano), CRUD en admin.
- Feed de descubrimiento (edge function con score §6), tarjetas, like con plan, pantalla de match.

### Sprints 5–6 (semanas 6–7): chat y planes
- Conversaciones realtime, mensajes, proponer/confirmar plan, agenda, recordatorios push, compartir con contacto de confianza.

### Sprint 7 (semana 8): grupos y eventos
- 4 grupos oficiales, chat grupal, eventos con inscripción y recordatorio.

### Sprint 8 (semana 9): seguridad
- Reportar/bloquear/desmatch, strikes y baneos en admin, botón "Necesito apoyo" completo, textos legales (privacidad, términos, comunidad).

### Sprints 9–10 (semanas 10–11): pulido y beta
- Feedback post-plan, notificaciones afinadas, estados vacíos ("mientras crece tu zona → evento del sábado"), QA, TestFlight/Internal testing.

### Sprint 11 (semana 12): beta cerrada
- Onboarding de los primeros 75, monitoreo diario, canal de feedback, iteración rápida.

---

## 15. Decisiones pendientes (para resolver antes del Sprint 0)

1. **Nombre y marca**: verificar "PlanSobrio" en INAPI + dominios + App Store/Play Store.
2. **Moderación**: definir quién cubre la cola de reportes (mínimo 2 personas, horario de cobertura, protocolo escrito de crisis).
3. **Legal**: redacción de términos, política de privacidad y consentimiento de datos sensibles (idealmente revisión de abogado — Ley 21.719 vigente dic 2026).
4. **Apple/Google**: cuentas de developer (Apple $99/año, Google $25 una vez) a nombre de la organización.
5. **Encuesta a los 3.000**: lanzar ya — valida intención, recluta beta y revela el balance de género/edad del pool (dato crítico para el diseño del descubrimiento).

---

*Documento vivo: actualizar con cada decisión de producto.*
