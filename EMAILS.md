# PlanSobrio — Emails con Resend: instrucción para Emergent

Sistema de correos para que el usuario **sienta movimiento sin sentirse atosigado**, adaptado al estado actual de la app (Google Auth, lista de espera, ubicación, grupos, planes).

**Cómo usar:** pegar en Emergent **de a un bloque por mensaje**, en orden (1 → 2 → 3), probando entre cada uno.

**Antes de pegar el Bloque 1 (manual, tú, en Resend):**
1. Verificar el dominio y configurar **SPF, DKIM y DMARC**.
2. Crear la API key y agregarla como variable de entorno `RESEND_API_KEY` en Emergent.
3. Remitente recomendado: `PlanSobrio <hola@plansobrio.com>` (ideal: dominio de envío `send.plansobrio.com`), con Reply-To real que alguien revise.
4. **No dispares a los 3.000 el día 1**: el dominio es nuevo; caliéntalo con las cohortes de la beta (75/semana).

---

## BLOQUE 1 — Infraestructura + transaccionales + bienvenida

```
Integra Resend (API key en la variable de entorno RESEND_API_KEY) para enviar emails desde "PlanSobrio <hola@plansobrio.com>". Construye primero la infraestructura y los correos básicos:

INFRAESTRUCTURA (obligatoria antes de cualquier correo):
1. Colección email_log: user_id, tipo, clave_idempotencia, resend_id, estado, enviado_en. Antes de cada envío se verifica la clave de idempotencia (usuario + tipo + evento) para nunca enviar el mismo correo dos veces aunque un proceso se reintente.
2. Colección email_preferences por usuario, editable desde Perfil > Ajustes con 3 switches: "Matches y mensajes", "Resumen semanal", "Recordatorios de planes". Todo ON por defecto al crear la cuenta.
3. REGLAS GLOBALES aplicadas en una única función de envío central (send_email) que TODOS los correos deben usar:
   - Máximo 1 correo de interacción por usuario por día (los transaccionales de contraseña no cuentan para el tope).
   - Horario de silencio 22:00–08:00 hora de Chile (America/Santiago): los correos de interacción y resumen no se envían en ese rango; quedan encolados y salen a las 08:00.
   - Nunca incluir en ningún correo: nombre real, sustancia, etapa de recuperación, contenido de mensajes ni ubicación. Solo el alias.
   - Si el usuario está baneado, suspendido o dado de baja de ese tipo de correo, no se envía.
4. Webhook de Resend (endpoint /api/webhooks/resend): ante evento bounced (rebote duro) o complained (queja de spam), marcar el email del usuario como no-enviable (email_deliverable: false) y excluirlo de todo envío futuro no transaccional.
5. Baja con un clic SIN iniciar sesión: cada correo no transaccional incluye al pie un link "No quiero recibir estos correos" con un token firmado (ej: /api/email/unsubscribe?token=...) que desactiva ese tipo de correo, y un link "Gestionar mis correos" que lleva a Ajustes. Incluir header List-Unsubscribe.
6. Plantilla HTML base responsive: fondo oscuro #0E0F13, tarjeta #1A1C22, botón con gradiente coral (#FF6B5E) a violeta (#8B5CF6), logo texto "PlanSobrio", español de Chile cálido. Todos los correos usan esta plantilla.

CORREOS DE ESTE BLOQUE:
A. RESTABLECER CONTRASEÑA (transaccional, siempre activo):
   - Endpoint "olvidé mi contraseña" en /login que pide el email y envía link con token de 1 hora para definir una nueva.
   - Si la cuenta es solo-Google (sin password_hash), el correo dice en cambio: "Tu cuenta ingresa con Google. Usa el botón Continuar con Google — no necesitas contraseña."
   - Asunto: "Restablece tu contraseña de PlanSobrio"
   - Por seguridad, la respuesta de la API es la misma exista o no la cuenta.
B. BIENVENIDA (al completar el registro, tanto email como Google):
   - Asunto: "Bienvenide a PlanSobrio 💛"
   - Cuerpo breve: "Aquí nadie tiene que explicar por qué no toma. Conoce gente, arma planes sin alcohol y avanza a tu ritmo." + botón "Completa tu perfil" (o "Descubrir gente" si ya completó el onboarding) + recordatorio de que existe el botón Necesito apoyo.
C. CONFIRMACIÓN DE LISTA DE ESPERA (al registrarse en /waitlist desde otro país):
   - Asunto: "Te avisaremos cuando PlanSobrio llegue a tu país 🌎"
   - Cuerpo: gracias + "por ahora estamos en Chile" + link a sinadicciones.org como recurso mientras tanto.

Prueba: registro con email → llega bienvenida; registro con Google → llega bienvenida; olvidé contraseña con cuenta normal → llega link que funciona y expira; con cuenta solo-Google → llega la variante Google; waitlist → llega confirmación. Verifica que la clave de idempotencia impide duplicados.
```

---

## BLOQUE 2 — Correos de interacción (match, mensajes, planes)

```
Agrega los correos de interacción, todos a través de la función central send_email (respetan tope diario, silencio nocturno y preferencias):

A. NUEVO MATCH (preferencia "Matches y mensajes"):
   - Se envía al crearse un match, a ambos usuarios.
   - Asunto: "¡Hay plan! Conociste a [alias] 🎉"
   - Cuerpo: "A ti y a [alias] les tinca juntarse." + si hay actividad propuesta, mostrarla ("Plan propuesto: ☕ Café y conversación") + botón "Abrir chat".
B. MENSAJES SIN LEER (preferencia "Matches y mensajes") — con agrupación anti-spam:
   - NO se envía correo por cada mensaje. Un job cada 10 minutos busca mensajes que sigan SIN LEER después de 20 minutos de recibidos, de usuarios a los que no se les haya enviado un correo de mensajes en las últimas 3 horas.
   - Agrupa todo en un correo: "Tienes 3 mensajes nuevos de [alias] y [alias]".
   - Asunto: "[alias] te escribió 💬" (un remitente) o "Tienes mensajes nuevos 💬" (varios).
   - NUNCA incluir el texto de los mensajes, solo alias y cantidad. Botón "Responder".
C. PLAN CONFIRMADO (preferencia "Recordatorios de planes"):
   - Al aceptarse un plan entre dos personas: correo a ambos con actividad, fecha y alias. Asunto: "Plan confirmado: ☕ Café y conversación 🎉".
D. RECORDATORIO DE PLAN / EVENTO (preferencia "Recordatorios de planes"):
   - Job diario a las 09:00 (America/Santiago): a cada usuario con un plan aceptado o evento con inscripción PARA HOY, un correo: "Hoy tienes un plan 🌱" con actividad/evento, hora y con quién (alias) o en qué grupo. Para los planes 1 a 1, incluir la sugerencia breve: "Recuerda: de día y en lugar público es mejor."
E. INVITACIÓN A EVENTO NUEVO EN MI GRUPO (preferencia "Recordatorios de planes"):
   - Cuando el admin crea un evento en un grupo, correo a los miembros de ese grupo: "Nuevo evento en [grupo]: [título] 📅" con fecha, lugar y botón "Voy". Máximo 1 correo de este tipo por usuario por día (usa el tope global).

Prueba con dos cuentas demo: match → llegan 2 correos; enviar mensajes y no leerlos → llega UN correo agrupado pasados ~20 minutos y no se repite antes de 3 horas; confirmar un plan para hoy → llega recordatorio a las 09:00 (para probar, permite forzar el job desde un endpoint admin); crear evento → llega a los miembros del grupo. Verifica que con el switch apagado no llega, y que después de las 22:00 se encola para las 08:00.
```

---

## BLOQUE 3 — Resumen semanal + re-enganche + panel admin

```
Cierra el sistema con el correo de "movimiento" y el cuidado de inactivos:

A. RESUMEN SEMANAL "Esta semana en PlanSobrio" (preferencia "Resumen semanal"):
   - Job semanal, jueves 12:00 (America/Santiago). Un correo por usuario activo (que haya iniciado sesión en los últimos 60 días), armado SOLO con secciones que tengan contenido real para esa persona; si una sección queda vacía se omite, y si TODAS quedan vacías el correo no se envía:
     · "Gente nueva cerca de ti": cantidad de usuarios nuevos de la semana dentro de su alcance/radio, con hasta 4 tarjetas (alias, comuna/ciudad, SIN distancia exacta). Respeta las reglas de visibilidad de modos: perfiles de Amor solo si hay compatibilidad mutua.
     · "Grupos con movimiento": hasta 3 grupos de su ciudad o afines a sus actividades favoritas.
     · "Próximos eventos": hasta 3 eventos futuros de sus grupos o su zona, con fecha y cupos.
     · Cierre fijo breve: una frase amable de la comunidad, ej. "Salir sin alcohol también es un plan. Nos vemos adentro 💛".
   - Asunto rotando entre 3 variantes: "Esta semana en PlanSobrio 🌱" / "Se movió la comunidad esta semana 👀" / "[N] personas nuevas cerca de ti esta semana".
B. RE-ENGANCHE SUAVE (una sola vez, sin culpa):
   - Job diario: usuarios sin iniciar sesión hace exactamente 14 días y que nunca recibieron este correo. Asunto: "¿Cómo vas? 💛". Cuerpo breve: "Tu lugar en la comunidad sigue aquí, a tu ritmo. Sin presión." + botón "Volver a mirar" + recordatorio del botón Necesito apoyo y del link a sinadicciones.org. MÁXIMO UNA VEZ EN LA VIDA por usuario; si no vuelve, no insistir jamás.
   - Si el usuario desactivó "Resumen semanal", tampoco recibe re-enganche.
C. PANEL ADMIN DE EMAILS:
   - Nueva sección "Emails" en /admin: correos enviados por día y por tipo (últimos 30 días), tasa de rebotes y quejas (desde los webhooks), lista de usuarios no-enviables, y botones para: enviar un correo de prueba de cada plantilla al email del admin, y forzar la ejecución del digest y de los jobs (para testing).
   - En la ficha de usuario del admin, mostrar sus últimos correos enviados y sus preferencias.

Prueba: forzar el digest desde el admin → llega solo con secciones con contenido y omite las vacías; usuario con todo vacío no recibe nada; re-enganche llega una única vez; el panel muestra los envíos y el correo de prueba de cada plantilla llega correctamente.
```

---

## Calendario resumido (qué recibe un usuario típico)

| Momento | Correo | Cajón |
|---|---|---|
| Se registra | Bienvenida | Único |
| Le hacen match | "¡Hay plan! Conociste a [alias] 🎉" | Instantáneo |
| Le escriben y no lee | UN correo agrupado (20 min después, máx. cada 3 h) | Instantáneo con freno |
| Confirma un plan | "Plan confirmado 🎉" | Instantáneo |
| Día del plan/evento | "Hoy tienes un plan 🌱" (09:00) | Diario condicional |
| Evento nuevo en su grupo | "Nuevo evento en [grupo] 📅" | Máx. 1/día |
| Jueves 12:00 | "Esta semana en PlanSobrio 🌱" | Semanal |
| 14 días sin entrar | "¿Cómo vas? 💛" | Una vez en la vida |

**Peor caso de volumen**: un usuario muy activo recibe ~2 correos al día (1 interacción + a veces 1 recordatorio); uno pasivo recibe 1 a la semana (digest). Nadie recibe nada de noche.

## Reglas que NO se transan

- Tope de 1 correo de interacción/día · silencio 22:00–08:00 · agrupación de mensajes.
- Solo alias. Jamás: nombre real, sustancia, etapa, contenido de chats, ubicación.
- Baja en un clic sin login + List-Unsubscribe en todo lo no transaccional.
- Sin rachas, sin FOMO, sin culpa. El re-enganche es una sola vez, con tono de cuidado.
- Rebote duro o queja de spam = ese email no recibe nunca más correos no transaccionales.
