# PlanSobrio — Plan de emails (Resend · plansobrio.com)

Estrategia de correos para el lanzamiento: que el usuario **sienta movimiento sin sentirse atosigado**, con especial cuidado por ser una comunidad de recuperación.

## Principio central

Tres cajones con reglas distintas:

1. **Instantáneos** → solo eventos 1-a-1 realmente personales (match, mensaje, plan de hoy).
2. **Resumen semanal** → junta todo lo ambiental (gente nueva, grupos, eventos). Es el motor de "ver movimiento" sin spam.
3. **Re-enganche** → muy espaciado, sin culpa, con tope.

**Reglas de oro globales:**
- Máximo **1 correo de interacción por día** por usuario (los transaccionales críticos no cuentan).
- **Horario de silencio 22:00–08:00** (hora de Chile): nada de correos de interacción/digest en ese rango; se encolan para la mañana.
- **Cero patrones oscuros**: sin rachas, sin FOMO, sin "te extrañamos" culpígeno.
- **Privacidad**: siempre alias, nunca el nombre real, nunca la sustancia ni la etapa de recuperación, **nunca el contenido del mensaje** (solo "tienes un mensaje nuevo de [alias]"). Link de baja + header List-Unsubscribe en todo lo que no sea transaccional crítico.

---

## SET DE LANZAMIENTO (lo básico para empezar)

### A. Transaccionales (siempre activos, no dependen de preferencias)

| # | Email | Cuándo se dispara | Nota |
|---|---|---|---|
| T1 | **Restablecer contraseña** | Al pedir recuperación | Link con expiración 1 h |
| T2 | **Confirma tu correo** (opcional) | Al registrarse con email | Mejora deliverability y frena cuentas falsas. Si agrega fricción en beta, se puede posponer |

### B. Ciclo de vida e interacción (el set real de lanzamiento)

| # | Email | Cuándo | Tope / regla |
|---|---|---|---|
| L1 | **Bienvenida** | Inmediato al registrarse | 1 CTA: "Completa tu perfil". Cálido, explica qué es y qué esperar |
| L2 | **Completa tu perfil** | ~24 h después si el onboarding quedó incompleto | **Una sola vez.** Si no lo completa, no insistir |
| L3 | **¡Hay plan! Nuevo match** | Instantáneo al match | Alto valor, siempre se manda (respeta silencio nocturno). "Conociste a [alias] 🎉" |
| L4 | **Alguien te escribió** | Instantáneo, PERO con retraso y agrupación | Solo si el mensaje sigue **sin leer tras ~20 min** Y no se envió otro correo de mensaje en las últimas ~3 h. Agrupa varios mensajes en uno: "Tienes 3 mensajes nuevos de [alias] y [alias]" |
| L5 | **Recordatorio de tu plan** | El día del plan/evento agendado, en la mañana | Solo si hay un plan confirmado o inscripción a evento para hoy |
| L6 | **Esta semana en PlanSobrio** (digest) | 1 vez por semana (ej. jueves 12:00) | El motor de "movimiento". Ver contenido abajo. Respeta baja individual |

### C. Re-enganche (suave, con tope)

| # | Email | Cuándo | Tope |
|---|---|---|---|
| R1 | **"¿Cómo vas? Te guardamos tu lugar"** | Tras ~14 días sin entrar | **Máximo 1.** Tono de cuidado, no de culpa. Recuerda el botón "Necesito apoyo". Si no vuelve, no volver a insistir hasta un evento relevante |

---

## Contenido del digest semanal (L6) — el corazón del "ver movimiento"

Arma el correo solo con lo que aplique a esa persona (si algo está vacío, se omite la sección):

- 👋 **Gente nueva cerca de ti**: "Se sumaron 12 personas en tu zona esta semana" + 3-4 miniaturas (alias + comuna). CTA: Descubrir.
- 👥 **Grupos para ti**: grupos nuevos o activos que calzan con sus intereses/comuna. CTA: Explorar grupos.
- 📅 **Próximos eventos**: eventos de sus grupos o de su comuna con cupos. CTA: Ver evento.
- 💛 **Un recordatorio amable**: micro-mensaje de la comunidad (ej. "Salir sin alcohol también es un plan"). Sin presión.

Si la persona tuvo actividad (matches, mensajes) esa semana, el digest **no** la repite — se enfoca en lo que no vio.

---

## Preferencias del usuario (en Ajustes)

Tres switches simples, no diez:
- **Mensajes y matches** (L3, L4) — recomendado ON.
- **Resumen semanal** (L6) — ON por defecto.
- **Recordatorios de planes y eventos** (L5) — ON por defecto.
- Re-enganche (R1) se apaga solo si el usuario da de baja el resumen.
- Los transaccionales (T1, T2) **no** se pueden apagar.

Un link de "gestionar correos" y otro de "darme de baja de todo lo no esencial" en el pie de cada correo.

---

## Notas técnicas (Resend + plansobrio.com)

### Deliverability (crítico con dominio nuevo)
- Configurar en Resend **SPF, DKIM y DMARC** para plansobrio.com.
- Enviar desde un **subdominio** (ej. `send.plansobrio.com`) para no arriesgar la reputación del dominio raíz.
- **From**: `PlanSobrio <hola@plansobrio.com>`, con un **Reply-To real** que alguien revise.
- **Warm-up**: no disparar a los 3.000 el día 1. Aprovecha el lanzamiento por cohortes (75/semana) para calentar la reputación de a poco.
- Escuchar los **webhooks de Resend** (delivered, bounced, complained) y limpiar la lista: baja automática ante rebote duro o queja de spam.

### Implementación
- Tabla `email_log` (user_id, tipo, enviado_en, resend_id) para aplicar los topes y no duplicar.
- Tabla `email_preferences` por usuario (los switches de arriba).
- **Idempotencia**: usar una clave por (usuario + tipo + evento) para no mandar el mismo correo dos veces si un proceso se reintenta.
- **Cola con retraso** para L4 (el "alguien te escribió" con espera de 20 min y agrupación) y para respetar el horario de silencio.
- Plantillas HTML simples y responsive, con el estilo oscuro de la marca; alias siempre escapado; sin datos sensibles.
- Un job diario (cron) evalúa: onboarding incompleto (L2), planes de hoy (L5), inactivos de 14 días (R1). Un job semanal arma el digest (L6).

---

## BLOQUE para Emergent (pegar cuando quieras implementarlo)

```
Integra el envío de emails con Resend usando el dominio verificado plansobrio.com. Crea un sistema de correos con estas reglas y tipos:

REGLAS GLOBALES:
- Máximo 1 correo de interacción por usuario por día (los transaccionales de contraseña no cuentan).
- Horario de silencio 22:00–08:00 hora de Chile: los correos de interacción y el resumen no se envían en ese rango; se encolan para las 08:00.
- Nunca incluir en ningún correo: nombre real, sustancia, etapa de recuperación ni el contenido de los mensajes. Usar solo el alias.
- Todos los correos, salvo los de contraseña, llevan link de baja y header List-Unsubscribe.

INFRAESTRUCTURA:
- Tabla email_log (user_id, tipo, resend_id, enviado_en) para topes e idempotencia.
- Tabla email_preferences (user_id, mensajes_matches BOOL, resumen_semanal BOOL, recordatorios BOOL) editable desde Ajustes del perfil, todo ON por defecto.
- Escuchar webhooks de Resend (bounced, complained) y marcar el email como no-enviable ante rebote duro o queja.
- Plantillas HTML responsive con el estilo oscuro de la marca (gradiente coral-violeta), en español de Chile, tono cálido.

CORREOS A IMPLEMENTAR:
1. Bienvenida: inmediato al registrarse, CTA "Completa tu perfil".
2. Completa tu perfil: una sola vez, ~24 h después, solo si el onboarding quedó incompleto.
3. Nuevo match: instantáneo, "Conociste a [alias] 🎉", CTA abrir chat.
4. Alguien te escribió: se envía solo si el mensaje sigue sin leer tras 20 minutos y no se mandó otro correo de mensajes en las últimas 3 horas; agrupa varios mensajes/remitentes en un solo correo.
5. Recordatorio de plan: en la mañana del día en que el usuario tiene un plan confirmado o una inscripción a evento.
6. Resumen semanal (digest): un cron semanal (jueves 12:00) arma un correo por usuario con: gente nueva en su zona, grupos nuevos afines, próximos eventos. Omite las secciones vacías. Respeta la preferencia resumen_semanal.
7. Re-enganche: tras 14 días sin iniciar sesión, máximo una vez, tono de cuidado (no de culpa), menciona el botón Necesito apoyo.
8. Transaccionales: restablecer contraseña (link expira en 1 h) y, opcional, confirmar correo al registrarse.

Respeta las preferencias del usuario en 3, 4 (mensajes_matches), 5 (recordatorios) y 6 (resumen_semanal). Crea los jobs cron necesarios (diario para 2/5/7, semanal para 6) y usa una cola con retraso para 4 y para el horario de silencio.
```

---

## Resumen de por qué así

- **Ve movimiento** → el digest semanal le muestra que la comunidad crece, y los instantáneos de match/mensaje le dicen "esto es real y para mí".
- **No se atosiga** → tope de 1 al día, agrupación de mensajes, silencio nocturno, y todo lo ambiental comprimido en 1 correo semanal.
- **Cuida a la persona** → sin manipulación, con privacidad estricta y con la puerta de "Necesito apoyo" siempre presente.
- **Protege el dominio** → warm-up por cohortes, subdominio de envío y limpieza automática de rebotes.
