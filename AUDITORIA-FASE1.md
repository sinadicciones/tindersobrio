# Auditoría completa pre-Fase 1 — PlanSobrio (plansobrio.com)

Auditoría del código al día de hoy: flujos de onboarding, match, perfiles, comunidad, emails, métricas, salud general y base de datos. Objetivo: dejar el MVP operativo y la base limpia para perfiles reales.

## ✅ Lo que está funcionando bien (verificado en código y tests)

| Área | Estado | Evidencia |
|---|---|---|
| Registro + Google + onboarding (1 frase, detalles, privacidad) | ✅ Sólido | 22 tests de onboarding pasando; medidor de completitud operativo |
| Match por plan v2 (propuestas de AMBOS lados, 4 mensajes de sistema) | ✅ Sólido | 12/12 tests; "café vs correr" se muestra correcto |
| Les tincas (likes recibidos con exclusiones y contador) | ✅ Sólido | Filtra matcheados, pasados, bloqueados y baneados |
| Nudge de plan a las 48 h (una vez por match) | ✅ Implementado | `nudge_sent` en el match |
| Rediseño Blanco Editorial + barrido de emojis | ✅ Aplicado | Escaneo regex de emojis en 7 pantallas: 0 en interfaz |
| Privacidad de ubicación | ✅ Correcta | Coordenadas a ~1 km, distancia en tramos de 5, sin fuga en admin (corregida) |
| Emails Resend (usuarios + internos) | ✅ Operativo | 22/22 tests; envíos reales con resend_id; idempotencia, tope diario, silencio 22–08, bajas y webhooks verificados en código |
| Jobs programados | ✅ Corriendo | Resumen admin 08:30 · recordatorios 09:00 · semanal jueves 12:00 · snapshot métricas 03:00 |
| Panel de métricas (7 pestañas + CSV + contador anónimo de apoyo) | ✅ Operativo | Gate 403 verificado |
| Índices de base de datos | ✅ Completos | Incluye 2dsphere para geo; consultas por agregación sin N+1 |

**Base de datos (25 colecciones, bien organizada):** users, likes, matches, messages, plans, reads, groups, group_members, group_messages, events, event_rsvps, reports, blocks, reasons, files, activities, countries, helplines, waitlist, email_log, email_preferences, admin_notification_recipients, metrics_daily, support_page_views, admin_actions.

## 🔴 Problemas encontrados (a corregir antes de la Fase 1)

1. **La limpieza de usuarios NO se sostiene sola**: el arranque del servidor re-siembra los 12 perfiles demo cada vez que detecta cero demos en la base (`if count(is_demo)==0 → sembrar`). Si borras todo hoy, al próximo reinicio vuelven los demos. Hace falta un interruptor persistente que apague la siembra.
2. **No existe herramienta de reseteo total**: `cleanup-tests` solo borra usuarios con email `test_*`. No hay forma de borrar demos + usuarios de prueba manuales + sus fotos/likes/chats de una vez.
3. **12 tests fallando** (lo reportan las propias iteraciones 16-17): no son bugs del producto — son tests desactualizados (aún envían 0 frases cuando el mínimo ahora es 1) y datos compartidos entre tests (límite de mensajes 429, contadores sucios). Pero una suite roja esconde las regresiones futuras: hay que dejarla verde.
4. **El home NO dice Beta ni el crédito a SinAdicciones**: el footer actual solo tiene Términos/Privacidad y el disclaimer.
5. **Metadatos del sitio impresentables para plansobrio.com**: el título de la pestaña dice "Emergent | Fullstack App" y la descripción "A product of emergent.sh". Cualquier anuncio o link compartido en WhatsApp mostrará eso.

---

## BLOQUE ÚNICO para Emergent — Cierre pre-Fase 1

```
Prepara la app para el lanzamiento de la beta con usuarios reales en plansobrio.com:

1. HERRAMIENTA DE RESETEO DE BETA (admin): nuevo endpoint POST /api/admin/reset-beta (solo admin) que:
   a) Elimina TODOS los usuarios excepto los de rol admin, y TODOS sus datos relacionados: likes, matches, messages, plans, reads, blocks, reasons, reports, group_members, group_messages, event_rsvps, email_log de usuarios, email_preferences, y marca sus files como eliminados. Conserva: grupos, eventos, actividades, countries, helplines, admin_notification_recipients, metrics_daily (histórico) y los admins.
   b) Setea un flag persistente en una colección app_settings: {key: "demo_seed_enabled", value: false}. El seed del arranque SOLO siembra los perfiles demo si ese flag no existe o es true — así la base queda limpia para siempre después del reseteo.
   c) Devuelve el conteo de todo lo eliminado.
   En /admin agrega el botón "Resetear beta (borrar todos los usuarios)" en una zona claramente peligrosa, con doble confirmación que exige escribir la palabra RESETEAR. Registra la acción en admin_actions.

2. BADGE DE BETA + CRÉDITO EN EL HOME:
   a) En la landing (Landing.jsx) y en el header de la app, junto al logo PlanSobrio, un badge pequeño "BETA" (borde menta #4ADE80, mayúsculas, 10px).
   b) Al final del home/landing, arriba de los links de Términos y Privacidad: "Hecho con 💛 desde SinAdicciones.org" con link a https://sinadicciones.org (abre en pestaña nueva). Mismo pie dentro de la app al final de la pestaña Perfil.

3. METADATOS DEL SITIO para plansobrio.com (frontend/public/index.html):
   - <title>PlanSobrio — Conoce gente que vive sin alcohol ni drogas</title>
   - meta description: "Amistad, apoyo, grupos y amor — con el plan incluido. La comunidad chilena para vivir tu nueva etapa sin alcohol ni drogas. Beta gratis."
   - Open Graph y Twitter Card: og:title, og:description (los mismos), og:url https://plansobrio.com, og:type website, y una og:image simple (genera una imagen estática 1200x630 con el fondo oscuro, el logo texto PlanSobrio, el gradiente coral-violeta y la bajada — guárdala en /public).
   - lang="es" en el html, theme-color #0B0C10, y favicon propio (ícono simple del brote/sprout en gradiente coral-violeta sobre fondo oscuro, formatos .ico + png 192/512 con manifest básico).

4. SUITE DE TESTS EN VERDE: corrige los 12 tests que fallan: actualiza los payloads de onboarding para incluir mínimo 1 frase (regla nueva), aísla los tests que chocan con el límite de mensajes por minuto (usuarios propios por test o reset del contador), y los de notificaciones/geo que dependen de datos sucios (fixtures limpias). Ningún test debe depender del estado dejado por otro. Al final: pytest completo 100% verde, y deja el conteo en el reporte.

5. SMOKE TEST FINAL DE PUNTA A PUNTA (después de todo lo anterior, con la base YA reseteada): crea 2 cuentas nuevas vía registro normal y verifica el ciclo completo: registro → email de bienvenida → onboarding completo con GPS manual → aparecer en Descubrir mutuamente → me tinca con plan → email de me tinca → match → chat → proponer plan con fecha → confirmar → aparece en Mis planes → email de plan confirmado → unirse a un grupo → RSVP a evento → reportar → aparece en admin → bloquear → desaparecen mutuamente. Borra esas 2 cuentas de prueba al final con la herramienta de eliminación de cuenta. Documenta cualquier falla encontrada y corrígela.
```

---

## Pasos manuales tuyos (checklist de lanzamiento)

**Configuración (antes del reseteo):**
- [ ] En Resend: dominio plansobrio.com verificado (SPF/DKIM/DMARC) y `RESEND_API_KEY` en Emergent.
- [ ] Variables `ADMIN_EMAIL=admin@plansobrio.com` y `ADMIN_PASSWORD` nueva (la vieja está quemada en el repo).
- [ ] `FRONTEND_URL=https://plansobrio.com` (para CORS y los links de los emails).
- [ ] Login con Google probado EN EL DOMINIO REAL (el redirect de Google debe aceptar plansobrio.com).
- [ ] Destinatarios internos confirmados en /admin: esteban.scl@gmail.com y nelson@sinadicciones.org.

**Limpieza (cuando Emergent termine el bloque):**
- [ ] Pulsar "Resetear beta" en /admin → base limpia y sin re-siembra de demos.
- [ ] Verificar en /admin que usuarios = solo el admin.

**Fase 1 — perfiles reales (mis recomendaciones):**
1. **Los primeros 10-15 perfiles deben ser "miembros fundadores" reales**: tú, Nelson, y gente de confianza de la comunidad SinAdicciones, con fotos y bios reales. NO crees perfiles falsos de relleno: en una comunidad de recuperación, descubrir perfiles falsos destruye la confianza — y la confianza es todo tu producto.
2. **Invita por olas chicas y balanceadas** (~20-30 personas, cuidando el ratio de género), avisándoles que son beta: pídeles explícitamente feedback por WhatsApp.
3. **Primer evento presencial agendado ANTES de invitar** (Café Sobrio): que el que entre vea que ya hay algo real en el calendario.
4. **Rutina diaria mínima mientras dure la beta**: el correo de resumen de las 08:30 + reportes graves en cero + responder los primeros feedbacks. 15 minutos al día.
5. **Respaldo de datos**: pide a Emergent (cuando quieras, como iteración aparte) una exportación/respaldo automático diario de la base — antes de que haya datos de personas reales que no puedes perder.
6. **No enciendas ads todavía**: valida primero con la comunidad propia (reto 21 días + suscriptores). Ads con feed semivacío es plata quemada.
```
