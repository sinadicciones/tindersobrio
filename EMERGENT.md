# Instrucción para Emergent — PlanSobrio v1

Este archivo contiene:
1. **La instrucción principal** (copiar y pegar completa en Emergent como primer prompt).
2. **Prompts de iteración** (para las siguientes rondas, uno por vez).
3. **Checklist de pruebas** antes de invitar usuarios reales.

Regla de uso de Emergent: pega la instrucción principal completa, deja que construya, prueba, y luego pide correcciones **de a una por mensaje**. No mezcles muchas peticiones en un mismo prompt de iteración.

---

## 1. INSTRUCCIÓN PRINCIPAL (copiar desde aquí)

```
Construye una aplicación web responsive (mobile-first) llamada "PlanSobrio".

CONCEPTO
PlanSobrio es una app chilena para conocer personas que viven sin alcohol ni drogas. Es como una app de citas, pero con cuatro intenciones de conexión en el mismo lugar: Apoyo (compañeros de proceso de recuperación), Amistad (amigos para panoramas sin alcohol), Amor (citas con intención romántica) y Grupos (actividades y comunidades). Su mecánica diferenciadora es el "match por plan": en vez de solo dar like, el usuario propone una actividad sobria concreta ("¿Harías este plan con esta persona?"), y al hacer match el chat se abre con ese plan como primer mensaje.

Todo el contenido de la interfaz debe estar en ESPAÑOL DE CHILE, con tono cálido, cercano y sin lenguaje clínico. Nunca usar las palabras "adicto" o "rehabilitación" en la interfaz pública; hablar de "vivir sin alcohol ni drogas", "tu proceso", "tu nueva etapa".

USUARIOS Y REGISTRO
- Registro con email + contraseña y también "Continuar con Google".
- Solo mayores de 18 años (pedir fecha de nacimiento y validar).
- El perfil público usa un ALIAS elegido por el usuario, nunca su nombre real ni su email.

ONBOARDING (después del registro, en pasos, con barra de progreso)
1. Alias, fecha de nacimiento, género (femenino / masculino / no binario / prefiero no decir), comuna (selector con las comunas de la Región Metropolitana de Chile + opción "Otra región").
2. "¿Qué buscas en PlanSobrio?" — multiselección: 🤝 Apoyo, 🙂 Amistad, ❤️ Amor, 👥 Grupos. Si elige Amor, pedir además: qué géneros le interesan y rango de edad.
3. "Tu relación con el alcohol y las drogas" (con nota visible: "Esto es privado. Nunca se muestra en tu perfil a menos que tú quieras"): opciones "Vivo sin alcohol ni drogas", "Estoy en proceso de dejarlo", "Prefiero no decir". Y tiempo sin consumo (opcional): "Menos de 30 días", "1 a 3 meses", "3 a 12 meses", "Más de 1 año", "Más de 5 años". Checkbox: "Mostrar mi tiempo en mi perfil como insignia".
4. "Tus planes favoritos" — elegir mínimo 3 actividades de la lista de actividades sobrias (ver catálogo abajo).
5. Foto de perfil: subir 1 a 6 fotos. Obligatoria solo si activó el modo Amor; opcional para los demás modos.
6. Tres frases de perfil, elegir 3 preguntas y responderlas (máx 150 caracteres c/u): "Mi plan ideal sin alcohol es…", "Lo que estoy construyendo en esta etapa…", "Un panorama que descubrí…", "Me hace bien cuando…", "Mi domingo perfecto…".
7. Reglas de la comunidad (aceptar para continuar): prohibido ofrecer alcohol o drogas, prohibido romantizar el consumo, respeto siempre, nada de acoso. Además el aviso: "PlanSobrio no reemplaza tratamiento profesional ni atención de urgencia."

CATÁLOGO DE ACTIVIDADES SOBRIAS (sembrar estos datos)
Actividades genéricas, cada una con emoji, nombre y categoría:
☕ Café y conversación (café) · 🥾 Caminata o trekking (aire libre) · 🌳 Paseo por un parque (aire libre) · 🏛️ Museo o centro cultural (cultura) · 🎬 Cine (cultura) · 🍽️ Almorzar o cenar rico (comida) · 🏃 Entrenar juntos (deporte) · ⚽ Pichanga o deporte grupal (deporte) · 🧘 Yoga o meditación (bienestar) · 📚 Club de lectura o librería (cultura) · 🎨 Taller creativo (cultura) · 🎲 Juegos de mesa (entretención) · 🐶 Pasear a los perros (aire libre) · 🎵 Concierto o música en vivo de día (entretención) · 🧗 Escalada o panorama aventura (deporte) · 🍦 Helado y vuelta a la manzana (café).
El administrador puede crear, editar y desactivar actividades desde el panel admin.

DESCUBRIMIENTO Y MATCH POR PLAN (pantalla principal)
- Arriba, un selector del modo activo: 🤝 Apoyo / 🙂 Amistad / ❤️ Amor (Grupos tiene su propia sección).
- Se muestran tarjetas de perfiles compatibles, de a una, con: foto (o avatar con inicial si no tiene foto), alias, edad, comuna, insignia de tiempo sin consumo (solo si el usuario la activó), sus 3 frases y sus intereses.
- REGLAS DE VISIBILIDAD ESTRICTAS:
  * En modo Amor solo aparecen personas que también activaron Amor y que son compatibles en género de interés y rango de edad de AMBOS.
  * En Amistad y Apoyo aparecen personas de cualquier género que activaron ese mismo modo.
  * NUNCA mostrar a nadie en modo Amor si no activó ese modo.
  * Nunca mostrar perfiles bloqueados, reportados por el usuario, ni ya evaluados (like o pasar).
- Orden de la cola: primero misma comuna, luego resto de la Región Metropolitana, luego otras regiones; dentro de cada grupo priorizar cantidad de intereses/actividades favoritas en común, con algo de aleatoriedad.
- Acciones en cada tarjeta: "Pasar" y "Me tinca ✨". Al tocar "Me tinca", mostrar un modal: "¿Qué plan harías con [alias]?" con 3 actividades sugeridas (priorizando las favoritas en común) + botón "Otro plan…" (abre la lista completa) + opción "Solo me interesa, sin plan aún".
- Límite: 20 "me tinca" por día por usuario (mostrar contador amable cuando se acabe: "Se acabaron tus me tinca de hoy. Vuelve mañana o revisa los grupos 👀").
- MATCH: si la otra persona también dio "me tinca" (en el mismo modo), se crea el match. Pantalla de celebración: "¡Hay plan! 🎉 A ti y a [alias] les tinca juntarse." Si alguno propuso una actividad, se muestra: "Plan propuesto: ☕ Café y conversación".
- Estado vacío del descubrimiento: "Por ahora no hay más personas en tu zona. La comunidad está creciendo 🌱 Mientras tanto, mira los grupos y eventos."

CHAT (solo entre matches)
- Lista de conversaciones con último mensaje y hora.
- Chat 1 a 1 con mensajes de texto en tiempo real (o polling cada pocos segundos). 
- Si el match tiene plan propuesto, el primer mensaje es automático del sistema: "A ambos les tinca: ☕ Café y conversación. ¿Coordinamos? 😊".
- Dentro del chat, botón "Proponer plan": elige actividad + fecha/hora → el otro puede Aceptar o Proponer otro. Los planes aceptados aparecen en una sección "Mis planes" con fecha, actividad y con quién.
- En el menú del chat: "Eliminar match", "Bloquear" y "Reportar".
- Mensaje fijo la primera vez que se abre un chat en modo Amor: "Consejo PlanSobrio: junta de día y en un lugar público para la primera vez. Cuéntale a alguien de confianza dónde estarás. 💛"

GRUPOS Y EVENTOS
- Sección "Grupos" con dos pestañas: "Mis grupos" y "Explorar".
- Cada grupo tiene: nombre, emoji, descripción, reglas, cantidad de miembros, y si es presencial (comuna) u online.
- Los usuarios pueden unirse y salir. Solo el ADMIN crea grupos en esta versión.
- Cada grupo tiene un chat grupal simple y una lista de EVENTOS: título, descripción, fecha y hora, lugar (texto libre + link opcional a Google Maps), cupos. Los miembros pueden inscribirse ("Voy") y bajarse. Mostrar lista de inscritos (alias).
- Sembrar 4 grupos: "☕ Café Sobrio Santiago" (presencial, Providencia), "🌱 Primeros 30 días" (online), "🏃 Deporte y sobriedad" (presencial, Ñuñoa), "🎬 Panoramas de fin de semana" (presencial, Santiago Centro). Cada uno con descripción y reglas amables, y 1 evento de ejemplo futuro.

SEGURIDAD
- Reportar usuario (desde perfil o chat) con categorías: "Ofrece alcohol o drogas", "Acoso o presión", "Perfil falso", "Mala conducta en una cita", "Otro" + texto libre. Confirmación: "Gracias por cuidar la comunidad. Lo revisaremos pronto."
- Bloquear: bilateral e inmediato (dejan de verse en descubrimiento, matches y grupos... en chats grupales simplemente no se destacan, pero no pueden abrir chat 1-1).
- Página "Necesito apoyo" accesible desde el menú del perfil con un ícono de corazón visible: contiene (a) un ejercicio de respiración guiada simple animado (4 segundos inhala, 4 mantén, 6 exhala, ciclos de 2 minutos), (b) sección "Mis razones": el usuario guarda frases personales de por qué vive sin consumo, y se muestran aquí, (c) teléfonos de ayuda en Chile bien visibles como botones de llamada: "Salud Responde 600 360 7777", "Prevención del suicidio *4141", "Urgencias 131", (d) link "Orientación profesional en SinAdicciones.org" que abre https://sinadicciones.org en pestaña nueva.
- PRIVACIDAD: la relación con el consumo (respuesta del onboarding paso 3) y el tiempo sin consumo son datos PRIVADOS: nunca aparecen en el perfil público salvo la insignia de tiempo si el usuario la activó. No integrar ningún SDK de analytics ni píxeles de terceros.

PANEL DE ADMINISTRACIÓN (ruta /admin, solo usuarios con rol admin)
- Dashboard: total de usuarios, usuarios nuevos por semana, matches creados, reportes abiertos.
- Reportes: lista con estado (abierto/resuelto), ver detalle, y acciones sobre el usuario reportado: advertir (queda registrado), suspender 7 días, banear permanente. Los baneados no pueden iniciar sesión (mensaje: "Tu cuenta fue suspendida por incumplir las reglas de la comunidad").
- Usuarios: buscar por alias/email, ver perfil, historial de reportes y strikes, banear/reactivar.
- Actividades: CRUD del catálogo de actividades sobrias.
- Grupos y eventos: CRUD completo.
- Crear el primer usuario admin con email contacto@basededatoschile.cl.

NAVEGACIÓN (barra inferior fija en móvil)
1. "Descubrir" (tarjetas) 2. "Grupos" 3. "Mis planes" (planes agendados próximos y pasados) 4. "Chats" 5. "Perfil" (mi perfil, editar, Necesito apoyo, ajustes, cerrar sesión, eliminar cuenta).
- Eliminar cuenta: borra el perfil y sus datos, con confirmación doble.

DISEÑO
- Estilo moderno oscuro: fondo casi negro (#0E0F13), tarjetas en gris oscuro (#1A1C22), esquinas muy redondeadas, tipografía sans-serif moderna.
- Color de acento: gradiente coral (#FF6B5E) a violeta (#8B5CF6) para botones principales, el botón "Me tinca ✨" y la pantalla de match.
- Acentos secundarios: verde menta (#4ADE80) para insignias positivas (tiempo sin consumo, "Voy" en eventos).
- Modo Amor usa detalles en coral; Amistad en amarillo cálido (#FBBF24); Apoyo en celeste (#38BDF8); Grupos en violeta.
- Sensación general: app de citas premium y moderna, NO app clínica ni de hospital. Microcopy cálido y chileno ("me tinca", "panorama", "junta").
- Debe verse perfecta en un celular (mobile-first) y bien en desktop.

DATOS DE PRUEBA
Sembrar 12 perfiles de ejemplo realistas y variados (géneros, edades 22-45, comunas de Santiago, distintos modos activos, con frases y actividades favoritas), para poder probar descubrimiento, match y chat de inmediato. Marcar estos perfiles internamente como demo para poder borrarlos después desde el admin.

NO INCLUIR EN ESTA VERSIÓN
No incluir pagos ni suscripciones, ni verificación por selfie, ni subida de videos, ni notificaciones por email, ni mapa interactivo, ni IA, ni multi-idioma. Eso vendrá después.
```

---

## 2. PROMPTS DE ITERACIÓN (pedir de a uno, después de probar la base)

**Iteración A — Correcciones de la base**
> Prueba tú mismo el flujo completo (registro → onboarding → descubrir → me tinca con plan → match → chat → proponer plan → grupos → evento → reportar → admin) y corrige todo error que encuentres. Verifica en pantalla de celular.

**Iteración B — Reglas de visibilidad**
> Verifica con los perfiles demo que las reglas de visibilidad se cumplen exactamente: (1) nadie aparece en modo Amor si no activó Amor, (2) en Amor se respetan género de interés y rango de edad de ambos lados, (3) los bloqueados desaparecen por completo, (4) los perfiles ya evaluados no se repiten. Escribe tests para estas 4 reglas.

**Iteración C — Pulido de textos**
> Revisa todos los textos de la interfaz: español de Chile, cálido, sin lenguaje clínico. Mensajes de error amables. Estados vacíos con ilustración o emoji y siempre una acción sugerida.

**Iteración D — Notificaciones dentro de la app**
> Agrega un indicador de notificaciones (campanita) con: nuevos matches, nuevos mensajes, recordatorio de plan agendado (mismo día), y nuevo evento en mis grupos.

**Iteración E — Invitaciones beta**
> Agrega un sistema de códigos de invitación: el registro pide un código válido. El admin genera lotes de códigos de un solo uso desde el panel y puede exportarlos como CSV (para enviarlos por email a los suscriptores).

**Iteración F — Feedback post-plan**
> Al día siguiente de un plan agendado, mostrar al entrar a la app una pregunta privada a cada participante: "¿Se concretó el plan con [alias]?" (sí/no) y si fue sí: "¿Cómo estuvo?" (1-5) y "¿Te sentiste seguro/a?" (sí/no). Si responde "no me sentí seguro/a", ofrecer reportar. Guardar todo y mostrarlo en el panel admin.

---

## 3. CHECKLIST ANTES DE INVITAR USUARIOS REALES

- [ ] Registro con email y con Google funcionan; menores de 18 rechazados.
- [ ] El alias es lo único visible; el email nunca aparece en ninguna pantalla pública.
- [ ] La relación con el consumo NO aparece en el perfil público (salvo insignia opcional).
- [ ] Reglas de visibilidad del modo Amor verificadas (Iteración B).
- [ ] Bloquear y reportar funcionan y llegan al panel admin.
- [ ] Un usuario baneado no puede entrar.
- [ ] Página "Necesito apoyo" con teléfonos correctos y links funcionando.
- [ ] Eliminar cuenta borra los datos.
- [ ] Probado completo en un celular real (Android y iPhone, navegador).
- [ ] Perfiles demo eliminados desde el admin antes del lanzamiento (o justo después de la primera cohorte).
- [ ] Códigos de invitación generados para la primera cohorte de 75.
- [ ] Términos de uso y política de privacidad publicados (aunque sean v1 simples) y linkeados en el registro.

---

## Notas para el fundador

- **Dominio**: conecta un dominio propio desde Emergent (ej. plansobrio.cl o app.sinadicciones.org) antes de invitar gente — genera confianza y es tu marca.
- **Moderación**: desde el día 1 de la beta, revisa el panel de reportes al menos 2 veces al día. La categoría "Ofrece alcohol o drogas" = ban inmediato.
- **Cohortes**: invita de a ~75 personas por semana (códigos de la Iteración E) para que el descubrimiento se sienta vivo.
- **Después de la beta**: las siguientes grandes features según PLAN.md son verificación por selfie, filtros avanzados y premium — pídelas a Emergent como iteraciones nuevas, una por una.
