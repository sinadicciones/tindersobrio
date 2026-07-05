# PlanSobrio — Emails con Resend v2: instrucción para Emergent

Sistema de correos adaptado al código actual (Les tincas, planes con estado, métricas diarias) + **correos internos al equipo** (nuevos usuarios y resumen diario de estadísticas).

**Remitente**: `PlanSobrio <hola@plansobrio.com>` · **Pie de TODOS los correos**: "Hecho con 💛 en [SinAdicciones.org](https://sinadicciones.org)" + link de desuscripción (en los de usuarios).

**Cómo usar:** pegar en Emergent de a un bloque por mensaje, en orden (1 → 2 → 3).

**Antes del Bloque 1 (manual, tú, en Resend):**
1. Verificar el dominio plansobrio.com con **SPF, DKIM y DMARC**.
2. API key → variable de entorno `RESEND_API_KEY` en Emergent.
3. Configurar un **Reply-To real** que alguien revise (ej: contacto@sinadicciones.org).
4. Dominio nuevo = warm-up: los envíos crecen con las cohortes de la beta, no dispares masivos el día 1.

---

## BLOQUE 1 — Infraestructura + plantilla + transaccionales

```
Integra Resend (API key en RESEND_API_KEY) enviando desde "PlanSobrio <hola@plansobrio.com>". Construye primero la infraestructura:

1. PLANTILLA BASE HTML responsive con el sistema Blanco Editorial: fondo #0B0C10, tarjeta #1D212B, texto blanco, botón con gradiente coral (#FF6B5E) a violeta (#8B5CF6), logo texto "PlanSobrio". PIE OBLIGATORIO en todos los correos: "Hecho con 💛 en SinAdicciones.org" (link a https://sinadicciones.org) y, en los correos a usuarios, debajo: link "No quiero recibir estos correos" (baja de ese tipo con token firmado, sin iniciar sesión) + link "Gestionar mis correos" (a Ajustes) + header List-Unsubscribe. Los correos internos al equipo (bloque 3) llevan en el pie "Configura estos reportes en /admin" en vez de desuscripción.

2. INFRAESTRUCTURA:
   - Colección email_log (user_id o destino, tipo, clave_idempotencia, resend_id, estado, enviado_en). Idempotencia por (destino + tipo + evento): nunca el mismo correo dos veces.
   - Colección email_preferences por usuario, editable en Perfil > Ajustes, 3 switches ON por defecto: "Matches y mensajes", "Resumen semanal", "Recordatorios de planes".
   - Función central send_email que TODOS los envíos usan, con las reglas: máximo 1 correo de interacción por usuario/día (transaccionales e internos no cuentan); silencio 22:00–08:00 America/Santiago (interacción y resúmenes se encolan a las 08:00); nunca incluir nombre real, sustancia, etapa, contenido de mensajes ni ubicación — solo alias; no enviar a baneados, suspendidos ni dados de baja de ese tipo.
   - Webhook /api/webhooks/resend: rebote duro o queja de spam → email_deliverable=false, excluido de todo envío no transaccional. Contadores visibles en /admin (sección Emails).

3. CORREOS DE ESTE BLOQUE:
   A. RESTABLECER CONTRASEÑA: link con token de 1 hora desde "olvidé mi contraseña" en /login. Si la cuenta es solo-Google, la variante dice "Tu cuenta ingresa con Google — no necesitas contraseña". Misma respuesta de API exista o no la cuenta.
   B. BIENVENIDA (registro por email o Google): asunto "Bienvenide a PlanSobrio 💛"; cuerpo breve con el concepto ("Aquí nadie tiene que explicar por qué no toma") + botón "Completa tu perfil" + mención del botón Necesito apoyo.
   C. LISTA DE ESPERA (registro desde país no habilitado): asunto "Te avisaremos cuando PlanSobrio llegue a tu país 🌎" + link a sinadicciones.org.

Prueba: bienvenida por ambas vías de registro, restablecer con cuenta normal y solo-Google, waitlist, idempotencia (reintentar no duplica), y que el pie con 💛 SinAdicciones.org + desuscripción aparece en todos.
```

---

## BLOQUE 2 — Correos de interacción a usuarios

```
Agrega los correos de interacción (todos vía send_email: respetan tope diario, silencio nocturno y preferencias):

A. TE DIERON ME TINCA (preferencia "Matches y mensajes") — NUEVO, conectado a Les tincas:
   - Cuando alguien recibe un me tinca sin match, correo con la propuesta si existe: asunto "A [alias] le tinca hacer un plan contigo 💛"; cuerpo: "[alias] te dio me tinca" + si propuso actividad: "Su idea: ☕ Café y conversación" + botón "Ver en Les tincas".
   - Regla anti-ruido: máximo UNO de este tipo cada 24 h por usuario; si hubo varios likes, agrupa: "A 3 personas les tinca tu perfil". Nunca se envía si ya hubo match con esa persona antes de despachar.
B. NUEVO MATCH: al crearse, a ambos. Asunto "¡Hay plan! Conociste a [alias] 🎉". Usa el estado real de propuestas: si coinciden, "Están de acuerdo: ☕ Café"; si difieren, "A ti te tinca ☕, a [alias] 🏃 — ¿cuál va primero?"; botón "Abrir chat".
C. MENSAJES SIN LEER: job cada 10 min; solo mensajes sin leer tras 20 minutos y sin otro correo de mensajes en 3 horas; agrupado ("Tienes 3 mensajes de [alias] y [alias]"); NUNCA el texto del mensaje; botón "Responder".
D. PLAN CONFIRMADO (preferencia "Recordatorios"): a ambos, con actividad, fecha y alias.
E. RECORDATORIO DE PLAN/EVENTO (preferencia "Recordatorios"): job diario 09:00 para planes o eventos DE HOY: "Hoy tienes un plan 🌱" + para planes 1-1 la sugerencia "de día y en lugar público es mejor".
F. EVENTO NUEVO EN MI GRUPO (preferencia "Recordatorios"): al crearse un evento, a los miembros del grupo, máx 1/día por el tope global.
G. RESUMEN SEMANAL (preferencia "Resumen semanal"): jueves 12:00, solo con secciones con contenido real (gente nueva en su zona respetando visibilidad de modos, grupos con movimiento, próximos eventos); si todo está vacío no se envía. 
H. RE-ENGANCHE: a los 14 días sin entrar, UNA VEZ EN LA VIDA, tono de cuidado ("Tu lugar sigue aquí, a tu ritmo") + recordatorio de Necesito apoyo. No se envía si desactivó el resumen semanal.

Prueba con dos cuentas: like sin match → correo A al destinatario con la propuesta; like recíproco → correo B a ambos con el mensaje según coincidencia de propuestas; mensajes sin leer → un correo agrupado; con el switch apagado no llega; después de las 22:00 se encola.
```

---

## BLOQUE 3 — Correos internos al equipo (admin)

```
Agrega los correos internos del equipo. Destinatarios en una colección admin_notification_recipients administrable desde /admin (sección Emails), sembrada con: esteban.scl@gmail.com y nelson@sinadicciones.org. Estos correos NO llevan link de desuscripción de usuario: llevan en el pie "Hecho con 💛 en SinAdicciones.org" y "Configura estos reportes en /admin", donde cada destinatario se puede activar/desactivar por tipo de reporte.

A. NUEVO USUARIO REGISTRADO:
   - Al completarse un onboarding, correo a los destinatarios: asunto "Nuevo usuario en PlanSobrio: [alias]"; cuerpo: alias, edad, género, comuna/ciudad, modos que busca, vía de registro (email/Google) y total de usuarios a la fecha. NUNCA incluir: email del usuario, datos de consumo, ni ubicación precisa.
   - Interruptor en /admin "Aviso por cada usuario nuevo" (ON al inicio) y modo alternativo "Resumen cada 24 h" que agrupa los del día en un solo correo (lista de alias + totales). Cuando el aviso individual supere 10 correos en un día, el sistema sugiere en /admin cambiar al modo resumen.

B. RESUMEN DIARIO DE ESTADÍSTICAS (usa la colección metrics_daily del panel de métricas):
   - Job diario a las 08:30 America/Santiago con los datos de AYER, asunto "PlanSobrio — resumen del [fecha]":
     · Usuarios: nuevos registros, onboardings completados, total acumulado, DAU.
     · Matching: me tinca dados, matches creados, likes pendientes en Les tincas.
     · Planes (la métrica norte destacada arriba): propuestos, confirmados, realizados.
     · Comunidad: mensajes 1-1 y grupales, RSVPs nuevos.
     · Seguridad: reportes nuevos y abiertos (en ROJO si hay algún grave pendiente), bloqueos, visitas a Necesito apoyo (solo el conteo anónimo).
     · Cada cifra con su comparación vs el promedio de los 7 días anteriores (↑↓).
     · Botón "Ver panel completo" → /admin.
   - Si metrics_daily aún no tiene el snapshot del día, calcularlo antes de enviar.

C. ALERTA DE SEGURIDAD (no espera al resumen): si se crea un reporte de categoría grave (ofrece_sustancias o mala_conducta_cita), correo inmediato a los destinatarios: asunto "⚠️ Reporte grave pendiente en PlanSobrio", con categoría, fecha y link directo a la cola de reportes. Máximo 1 por hora (agrupa si llegan varios).

Prueba: completar un onboarding → llega el aviso A a ambos destinatarios; forzar el resumen diario desde /admin → llega B con cifras correctas y comparaciones; crear un reporte grave → llega C; verificar que ninguno incluye emails de usuarios ni datos sensibles, y que el pie interno es el correcto.
```

---

## Reglas que no se transan (recordatorio)

- Usuarios: tope 1 interacción/día · silencio 22:00–08:00 · agrupación · solo alias · baja en un clic + List-Unsubscribe.
- Internos: sin datos sensibles ni emails de usuarios; el resumen diario es agregado; la alerta grave es la única inmediata.
- Rebote duro o queja = no se envía nunca más (no transaccional).
- Pie universal: "Hecho con 💛 en SinAdicciones.org".
