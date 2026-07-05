# Instrucción de correcciones y optimización — PlanSobrio v1.1

Basada en la revisión del código real (backend/server.py, frontend y reportes de prueba de Emergent).

**Cómo usarla:** pega en Emergent un bloque por mensaje, en orden. Espera que termine y prueba antes de pasar al siguiente. No mezcles bloques.

**Antes de partir (manual, tú):** cambia la contraseña del admin — la actual quedó escrita en texto plano en los reportes de prueba del repositorio (`test_reports/iteration_1.json` y `test_result.md`).

---

## BLOQUE 1 — Bugs críticos de experiencia

```
Corrige estos bugs, en este orden, sin agregar funciones nuevas:

1. BUG CRÍTICO EN CELULAR: la barra de navegación inferior (BottomNav) tapa los botones "Pasar" y "Me tinca ✨" en la pantalla Descubrir. Tu propio reporte de pruebas (iteration_1) lo detectó y quedó sin corregir. Agrega el padding inferior necesario (la utilidad pb-nav ya existe en index.css) al contenedor raíz de Descubrir Y AUDITA todas las demás páginas de la app (Grupos, Detalle de grupo, Chats, Detalle de chat, Mis Planes, Perfil, Editar perfil, Necesito Apoyo) para que la barra nunca tape contenido interactivo. Verifica en un viewport de 420x900 que el flujo completo "Me tinca → modal de plan → match" se puede completar tocando los botones.

2. CONTADOR DE ME TINCA ERRÓNEO: el endpoint /api/discover/quota cuenta todos los documentos de likes del día, incluyendo los "Pasar" (kind: "pass"). Debe contar solo kind: "like", igual que la validación del límite en /api/like. Hoy el contador visible baja cuando el usuario solo pasa perfiles.

3. PERFIL DEMO INVÁLIDO: el perfil demo Fer_Cafe tiene modo Amor sin fotos, lo que rompe la regla "modo Amor requiere al menos 1 foto" y muestra una tarjeta sin imagen en el descubrimiento de Amor. Asigna una foto placeholder a todos los perfiles demo que tengan modo Amor.

4. ELIMINAR CUENTA INCOMPLETO: el endpoint DELETE /api/profile/me borra usuario, likes, matches, mensajes y razones, pero deja datos huérfanos. Debe borrar TODO lo del usuario: fotos y archivos subidos (registros en la colección files Y los objetos en el almacenamiento), membresías de grupos (group_members), sus mensajes en chats grupales (group_messages), inscripciones a eventos (event_rsvps), bloqueos (blocks) en ambas direcciones, y planes (plans) de sus matches. Verifica además que la pantalla de eliminar cuenta pide doble confirmación con advertencia clara de que es irreversible.

Al terminar, corre los tests de backend existentes y confirma que siguen pasando.
```

---

## BLOQUE 2 — Seguridad

```
Mejoras de seguridad, sin cambiar el comportamiento visible de la app:

1. VALIDACIÓN DE LIKES EN EL SERVIDOR: el endpoint POST /api/like acepta cualquier target_user_id sin validar compatibilidad. Antes de crear el like, valida en el servidor que: (a) el usuario objetivo existe, está activo y tiene el modo indicado activado; (b) si el modo es "amor", que la compatibilidad de género e interés y los rangos de edad de AMBOS se cumplen (las mismas reglas del endpoint /api/discover); (c) que no exista un bloqueo en ninguna dirección entre los dos usuarios. Si algo no se cumple, responde 403. Lo mismo para POST /api/pass: rechazar si hay bloqueo.

2. MENSAJES A USUARIOS BLOQUEADOS: al bloquear se elimina el match, pero verifica que no quede ninguna vía para enviar mensajes entre dos usuarios con bloqueo vigente: POST /api/matches/{id}/messages y propose-plan deben responder 403 si existe un bloqueo entre los participantes.

3. CORS: el backend usa allow_origins=["*"] junto con allow_credentials=True, lo que es una mala configuración. Restringe los orígenes permitidos al dominio real del frontend (usa una variable de entorno FRONTEND_URL) y elimina allow_origin_regex=".*".

4. ARCHIVOS SIN AUTENTICACIÓN: GET /api/files/{path} sirve las fotos sin exigir sesión. Exige usuario autenticado para descargar archivos de fotos de perfil.

5. LÍMITE ANTI-SPAM EN CHAT: agrega un límite razonable de mensajes por usuario (por ejemplo, máximo 60 mensajes por minuto en total) para frenar spam o acoso masivo. Al excederlo responde 429 con un mensaje amable.

6. VALIDACIÓN DE CATEGORÍAS DE REPORTE: el endpoint POST /api/report acepta cualquier string como categoría. Restringe a las categorías válidas: ofrece_sustancias, acoso, perfil_falso, mala_conducta_cita, otro. Los reportes de categoría "ofrece_sustancias" deben marcarse con prioridad alta y aparecer destacados al inicio de la lista en el panel admin.

Al terminar, corre los tests y agrega tests nuevos para los puntos 1 y 2.
```

---

## BLOQUE 3 — Rendimiento y calidad de código

```
Optimización de rendimiento y mantenibilidad, sin cambiar funcionalidad:

1. ELIMINA LAS CONSULTAS N+1: los endpoints /api/matches, /api/notifications/counts, /api/groups, /api/groups/{id}, /api/groups/{id}/events y /api/plans hacen una consulta a la base de datos por cada elemento dentro de un loop (tu propio reporte de pruebas lo señaló). Reescríbelos usando agregaciones de MongoDB o consultas en lote ($in con una sola consulta y armado en memoria). El comportamiento y el formato de respuesta deben quedar idénticos.

2. ÍNDICES FALTANTES: agrega índices para las consultas frecuentes: likes (from_user + date + kind), blocks (from_user y to_user), messages (match_id + created_at), group_members (group_id + user_id), event_rsvps (event_id + user_id), reports (status + created_at), users (comuna, modes).

3. DIVIDE server.py: tiene más de 1.200 líneas en un solo archivo. Sepáralo en módulos por dominio (auth, profile, discover, matches_chat, groups_events, support, admin, seed) usando APIRouter, manteniendo exactamente las mismas rutas y respuestas. Corre todos los tests al final para confirmar que nada cambió.

4. POLLING DEL CHAT: revisa cómo se actualizan los mensajes en el chat 1 a 1 y el chat grupal. Si hay polling, que sea cada 3-5 segundos, que se detenga cuando la pestaña no está visible (document.visibilityState) y que no se acumulen timers al navegar entre chats.

5. PAGINACIÓN DE MENSAJES: /api/matches/{id}/messages carga hasta 1000 mensajes de una vez. Implementa carga de los últimos 50 con botón "ver mensajes anteriores".

6. IMÁGENES: comprime las fotos de perfil al subirlas (redimensiona a máximo 1080px de ancho, calidad ~80%) para que las tarjetas de descubrimiento carguen rápido en datos móviles.
```

---

## BLOQUE 4 — Funcionalidad pendiente y pulido

```
Completa lo que faltó de la instrucción original:

1. LOGIN CON GOOGLE: agrega "Continuar con Google" en registro e inicio de sesión. Si es un usuario nuevo, después del login con Google debe pedir fecha de nacimiento (validar 18+) y pasar por el onboarding normal. El perfil público sigue usando solo el alias elegido, nunca el nombre ni la foto de la cuenta de Google.

2. ELIMINA LOS VIDEOS: la instrucción original decía explícitamente no incluir videos y se agregaron igual. Elimina por completo: el endpoint /api/uploads/video, el campo videos del perfil y de clear_public, la subida de video en onboarding y editar perfil, y la visualización de videos en las tarjetas. Es una decisión de moderación: en esta comunidad el video es demasiado difícil de moderar en esta etapa.

3. ESTADO SUSPENDIDO VISIBLE: cuando un usuario suspendido inicia sesión, muéstrale una pantalla clara con el motivo genérico y la fecha en que vuelve su acceso, en vez de un error técnico.

4. TEXTOS DE ERROR AMABLES: revisa todos los mensajes de error del frontend: nada de errores técnicos en inglés ni "Request failed". Español de Chile, cálido y con acción sugerida.

5. PÁGINAS LEGALES: agrega páginas simples de "Términos de uso" y "Política de privacidad" (contenido placeholder marcado como BORRADOR para revisión legal) enlazadas desde el registro y desde Perfil > Ajustes. La política debe mencionar: uso de alias, datos sensibles solo con consentimiento, no se venden datos, derecho a eliminar la cuenta.

6. LIMPIEZA: elimina los usuarios de prueba creados por los tests (TEST_*) y el video de prueba adjuntado a demo1 que quedó en el perfil.
```

---

## Después de los 4 bloques — checklist de verificación (tú, a mano, en un celular)

- [ ] Puedo tocar "Me tinca" en el celular sin que la barra lo tape.
- [ ] El contador 20/día no baja al "Pasar".
- [ ] Login con Google funciona y me pide fecha de nacimiento + onboarding.
- [ ] No existe ninguna opción de video en la app.
- [ ] Al bloquear a alguien, desaparece de todos lados y no puede escribirme.
- [ ] Eliminé una cuenta de prueba y no quedó rastro (grupos, eventos, fotos).
- [ ] Un reporte "ofrece sustancias" aparece destacado primero en el admin.
- [ ] La contraseña del admin fue cambiada.
- [ ] El chat se siente fluido y no recalienta el teléfono (polling controlado).
```
