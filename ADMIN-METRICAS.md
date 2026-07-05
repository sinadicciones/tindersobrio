# Panel de Métricas del Administrador — plan e instrucción para Emergent

Dashboard en `/admin` con todo lo medible de PlanSobrio, organizado según los KPI que de verdad importan en una app de conexiones + comunidad sobria.

## ⚠️ Acceso admin — hazlo así (importante)

- La contraseña `Jodorowsky100` está **quemada**: aparece en texto plano en los reportes de prueba ya subidos al repositorio. No la reutilices.
- El backend ya crea el admin desde variables de entorno (`ADMIN_EMAIL` / `ADMIN_PASSWORD`). Lo correcto:
  1. En Emergent, cambia las variables a `ADMIN_EMAIL=admin@plansobrio.com` y una `ADMIN_PASSWORD` **nueva y fuerte** (12+ caracteres, generada al azar).
  2. Nunca escribas la contraseña dentro de un prompt a Emergent ni en archivos del repo.
  3. El login es el mismo `/login` de siempre: al entrar con el email admin, redirige a `/admin` (ya funciona así).

---

## La filosofía de medición (mis recomendaciones)

**1. Una métrica norte: PLANES SOBRIOS REALIZADOS por semana.**
No descargas, no usuarios, no matches: la promesa de la app es que dos personas sobrias se junten en un plan real. Todo lo demás son palancas de esa métrica.

**2. El embudo es el mapa.** Cada usuario recorre: registro → onboarding completo → primer me tinca → primer match → primer plan confirmado → plan realizado. Dónde se cae la gente te dice qué arreglar cada semana.

**3. En una app de matching, la LIQUIDEZ manda.** Con pocos usuarios, los KPI críticos son: % de usuarios que logran ≥1 match en su primera semana, ratio de género del pool activo, y likes que quedan sin responder. Si estos tres están mal, nada más importa.

**4. En una app de recuperación, la SEGURIDAD es un KPI, no un reporte.** Tiempo de resolución de reportes graves y reincidencia de reportados van en el dashboard principal, no escondidos.

**5. Privacidad ante todo (línea roja).** El panel muestra SOLO agregados: jamás mensajes, jamás sustancia/etapa individual, jamás lista de quién usó "Necesito apoyo" (solo conteos diarios anónimos). Nada de SDKs externos de analytics: todo se calcula de la propia base de datos.

### Benchmarks para la beta (los objetivos que ya definimos)

| KPI | Meta beta |
|---|---|
| Onboarding completado | ≥ 70% de registros |
| ≥1 match en la primera semana | ≥ 40% |
| Match → plan confirmado | ≥ 25% |
| Plan confirmado → realizado | ≥ 50% |
| Retención semana 4 | ≥ 30% |
| Ratio género del pool activo | entre 40/60 y 60/40 |
| Reportes graves resueltos < 4 h | 100% |

---

## BLOQUE 1 para Emergent — Infraestructura de métricas + Resumen y Embudo

```
Construye el sistema de métricas del panel /admin. IMPORTANTE - PRIVACIDAD: todas las métricas son AGREGADOS calculados de la base de datos propia; el panel nunca muestra contenido de mensajes, ni datos de consumo individuales (sustancia/etapa), ni identifica quién usó la página "Necesito apoyo". No integrar ningún servicio externo de analytics.

1. SNAPSHOT DIARIO: crea una colección metrics_daily y un job (cron diario a las 03:00 America/Santiago) que calcula y guarda una foto del día anterior con: usuarios totales, registros nuevos, onboardings completados, DAU (usuarios con actividad: like, mensaje, check de feed, RSVP), likes dados, passes, matches creados, planes propuestos, planes confirmados, planes realizados (feedback attended=true), mensajes 1-1, mensajes grupales, RSVPs, reportes creados/resueltos, bloqueos, visitas a "Necesito apoyo" (agregar un contador de evento anónimo cuando se abre esa página: colección support_page_views con solo fecha y contador, SIN user_id), usuarios nuevos por género y por comuna. Incluye un endpoint admin para recalcular un rango de fechas (backfill) desde los datos históricos existentes.

2. SECCIÓN "MÉTRICAS" EN /admin con selector de rango (7 / 30 / 90 días) y estas dos primeras pestañas:

   PESTAÑA RESUMEN (lo primero que se ve al entrar):
   - La métrica norte en grande: PLANES REALIZADOS esta semana (+ comparación con la semana anterior).
   - Fila de tarjetas: usuarios activos hoy (DAU) · activos últimos 7 días (WAU) · matches esta semana · % de likes que terminan en match · reportes abiertos (en rojo si hay alguno grave >4h).
   - Gráfico de líneas: registros vs onboardings completados por día.
   - Gráfico de líneas: matches y planes confirmados por día.
   - Alerta de liquidez visible si se cumple alguna: ratio de género del pool activo fuera de 40/60-60/40; más de 30% de likes de los últimos 7 días sin respuesta; menos de 10 usuarios activos con modo Amor. Mensaje claro de cuál regla se disparó.

   PESTAÑA EMBUDO:
   - Funnel visual con conteos y % de conversión entre pasos, para el rango elegido y filtrable por cohorte semanal de registro: Registrados → Onboarding completo → Dieron su primer me tinca → Lograron su primer match → Confirmaron su primer plan → Plan realizado.
   - Tabla de cohortes semanales: cada fila una semana de registro, columnas con esos mismos pasos en %.
   - Tiempos medianos: registro→primer like, primer like→primer match, match→plan confirmado.

3. Usa recharts (o la librería de gráficos ya disponible) con el sistema visual Blanco Editorial del panel: fondo #0B0C10, tarjetas #1D212B, líneas en coral #FF6B5E y violeta #8B5CF6, positivo en menta #4ADE80. Números grandes con tabular-nums.

4. Todos los endpoints de métricas bajo /api/admin/metrics/* protegidos con require_admin, y probados con un test de que un usuario normal recibe 403.
```

---

## BLOQUE 2 para Emergent — Pestañas de detalle: Matching, Planes, Comunidad, Retención y Seguridad

```
Agrega las pestañas de detalle a la sección Métricas de /admin (misma protección admin, mismos agregados, mismo estilo):

PESTAÑA MATCHING (liquidez):
- Likes dados por día (línea) y ratio like→match del período.
- % de usuarios activos con ≥1 match en sus primeros 7 días (el KPI de liquidez nº1), por cohorte semanal.
- Likes recibidos SIN respuesta (Les tincas pendientes): total y antigüedad mediana.
- Distribución de la atención: % del total de likes que recibe el 10% de perfiles más gustados (si supera 60%, mostrar advertencia de concentración).
- Composición del pool activo (últimos 14 días): por género, por modo activado, por rango etario y por comuna (tablas simples).
- Cupo diario: % de usuarios activos que agotan sus 20 me tinca.

PESTAÑA PLANES (el core):
- Embudo del período: matches → con plan propuesto → confirmado → realizado, con %.
- Actividades más propuestas vs más realizadas (barras) — muestra qué planes convierten.
- Tiempo mediano match→plan confirmado y plan confirmado→fecha del plan.
- Feedback post-plan agregado: % asistencia, rating promedio, % "me sentí seguro/a" (si este último baja de 95%, destacarlo en rojo).
- Distribución de distancia entre personas que concretaron plan (tramos de 5 km).

PESTAÑA COMUNIDAD:
- Grupos activos (con ≥5 mensajes o ≥1 evento en los últimos 7 días) vs totales; tabla por grupo: miembros, nuevos miembros, mensajes de la semana, próximo evento.
- Eventos: creados, RSVPs, % de cupos llenados, asistencia según feedback si existe.
- % de usuarios activos que pertenecen a ≥1 grupo (los grupos son el respaldo de la liquidez: si está bajo 40%, advertencia).

PESTAÑA RETENCIÓN:
- Curvas D1/D7/D30 por cohorte semanal de registro (tabla de retención clásica con celdas coloreadas por intensidad).
- Stickiness (DAU/MAU) del período.
- Usuarios dormidos (14+ días sin entrar) y resucitados (volvieron tras 14+ días).
- Si los emails de Resend ya están implementados: enviados/día por tipo, tasa de rebote y de quejas, y % de re-enganche que volvió tras el correo "¿Cómo vas?". Si no están implementados, deja la sub-sección con estado "pendiente de integración".

PESTAÑA SEGURIDAD (tan importante como el resto):
- Reportes por categoría y por día; tiempo mediano de resolución; % de graves (ofrece_sustancias, mala_conducta_cita) resueltos en <4 h — en rojo si no es 100%.
- Reincidencia: usuarios con 2+ reportes de distintas personas (lista con link a su ficha admin — esto sí es individual porque es moderación, no analytics).
- Bloqueos por día y ratio bloqueos/matches.
- Uso agregado de "Necesito apoyo": visitas por día (solo conteo anónimo) — con nota visible: "métrica anónima, sin identificación de usuarios".
- Baneos y suspensiones del período.

EXPORTACIÓN: botón "Exportar CSV" en cada pestaña con los datos agregados del rango visible.

Al terminar, corre todos los tests y verifica manualmente que un usuario no-admin no puede acceder a ninguna ruta /api/admin/metrics/*.
```

---

## Cómo leer el panel cada semana (tu rutina de 15 minutos)

1. **Lunes AM — Resumen**: ¿subieron los planes realizados? ¿alguna alerta de liquidez encendida?
2. **Embudo**: encuentra el paso con peor conversión de la última cohorte y conviértelo en la mejora de la semana (ej: si registro→onboarding <70%, el onboarding está largo; si match→plan <25%, el nudge de 48 h necesita ajuste).
3. **Seguridad**: reportes graves siempre en cero pendientes; revisa la lista de reincidentes.
4. **Matching**: vigila el ratio de género — si se desbalancea, tu próxima cohorte de invitados debe corregirlo (invita más del género escaso).
5. **Comunidad**: el grupo menos activo de la semana necesita un evento o un moderador más presente.

## Qué NO medir (decisiones deliberadas)

- Nada de "tiempo en la app" como éxito: en esta app, éxito es salir a un plan, no quedarse pegado mirando perfiles.
- Nada de tracking individual de "Necesito apoyo" ni de datos de consumo: agregados o nada.
- Nada de píxeles/SDKs de terceros: la promesa de privacidad es parte del producto.
