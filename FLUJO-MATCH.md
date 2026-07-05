# Flujo de Match por Plan v2 — "Les tincas" + negociación de plan

## Diagnóstico del código actual (verificado)

**Lo que funciona:**
- ✅ Los matches se registran correctamente: like recíproco en el mismo modo → match, con validación en el servidor (compatibilidad, bloqueos, cupo diario). Testeado.
- ✅ Al hacer swipe a la derecha SÍ aparece el modal de plan ("¿Qué plan harías con…?").
- ✅ **El plan NO bloquea el match**: si tú propones "café" y la otra persona te dio me tinca con "correr" (o sin plan), el match SE PRODUCE igual. El match es por interés mutuo en el modo; la actividad es una propuesta, no una condición. Esto es correcto y debe mantenerse.

**Lo que está mal o falta:**
- 🔴 **Se pierde una de las dos propuestas**: el match guarda UNA sola actividad (la del que cerró el match; si no propuso, la del otro). Si A propuso ☕ café y B propuso 🏃 correr, el match guarda solo "correr" y el mensaje del sistema dice *"A ambos les tinca: correr"* — **lo cual es falso** y desperdicia la información más valiosa del flujo.
- 🔴 **No existe "quién me dio me tinca"**: los likes recibidos sin match no se ven en ninguna parte. Con pocos usuarios (beta), esto deja matches en potencia botados.
- 🟡 Pendiente de la ronda anterior: los emails con Resend aún no están implementados, y el propio test de Emergent (iteración 10) dejó marcado que `/api/admin/users` todavía expone las coordenadas de los usuarios en el panel admin.

## Principio de diseño

> **El match une personas; el plan es el rompehielos y el destino.**
> El plan nunca bloquea el match — lo que hace la app es ayudar a que las dos propuestas converjan en una cita concreta lo antes posible.

## El flujo propuesto, de punta a punta

```
SWIPE ➜ derecha
  └─ Modal: "¿Qué plan harías con Cata?" → elige ☕ (o "solo me interesa")
       │
       ├─ Ella NO te había dado like ──► tu like queda esperando…
       │     └─ Cata te ve en su pestaña "Les tincas 💛":
       │        "A Javi le tinca ir a un café contigo"
       │        [Armar plan ✨]  [Pasar]
       │        └─ "Armar plan" → elige actividad → MATCH instantáneo
       │
       └─ Ella YA te había dado like ──► MATCH ahora
             │
             ├─ Ambos propusieron LO MISMO (☕ + ☕)
             │    "¡Están de acuerdo! ☕ Café y conversación."
             │    → botón directo [Elegir día y hora]  ← camino rápido
             │
             ├─ Propuestas DISTINTAS (☕ + 🏃)
             │    "A ti te tinca ☕ café. A Cata le tinca 🏃 correr."
             │    → chips [☕ Café] [🏃 Correr] [Otro plan]
             │    → un toque = plan propuesto en el chat
             │
             ├─ Solo UNO propuso (☕ + nada)
             │    "A Javi le tinca: ☕ café. ¿Te sumas?"
             │    → [Me sumo ✨] [Proponer otro]
             │
             └─ NINGUNO propuso
                  → 3 chips con actividades favoritas en común
             │
             ▼
        CHAT con TARJETA DE PLAN fija arriba:
        "☕ Café · falta la fecha" → "☕ Sáb 15:00 · confirmado" → "¿Cómo estuvo?"
        (si a las 48 h no hay plan confirmado, mensaje suave del sistema:
        "¿Le ponemos fecha al café? 😊")
```

### Por qué así

1. **"Les tincas" gratis en la beta** (aunque el plan de monetización lo reservaba para premium): con pocos usuarios, cada like sin responder es un match perdido. Mostrar al interesado **con su plan propuesto** ("le tinca ir a un café contigo") convierte likes en matches al doble de velocidad. Cuando haya masa, se puede limitar a los 3 más recientes en gratis y el resto premium — la estructura queda lista.
2. **Guardar ambas propuestas** convierte el caso "café vs correr" de un problema en el mejor rompehielos posible: la app misma pone sobre la mesa la micro-decisión ("¿cuál va primero?") que arranca la conversación.
3. **La tarjeta de plan fija en el chat** mantiene el core del producto visible: la conversación siempre tiene un norte (concretar el plan), y su estado (sin fecha → confirmado → ¿cómo estuvo?) guía el siguiente paso sin presionar.
4. **El camino rápido cuando coinciden** (mismo plan → directo a elegir fecha) premia el caso perfecto con la menor fricción posible.

---

## BLOQUE A para Emergent — Backend del nuevo flujo

```
Mejora el flujo de match por plan en el backend. El principio: el plan propuesto NUNCA condiciona el match (eso ya funciona así y se mantiene); lo que cambia es que ahora se conservan y usan las propuestas de AMBOS lados.

1. GUARDAR AMBAS PROPUESTAS: en el documento del match, reemplaza proposed_activity por proposals: un objeto {user_id: activity | null} con la actividad propuesta por cada uno en su like (o null). Migra los matches existentes (proposed_activity pasa a ser la propuesta del usuario correspondiente si se puede determinar, o de ambos como compartida).

2. MENSAJE DE SISTEMA SEGÚN EL CASO (corrige el actual, que dice "a ambos les tinca X" aunque X la haya propuesto solo uno):
   - Misma actividad ambos: "¡Están de acuerdo! ☕ Café y conversación. Solo falta el cuándo 😊"
   - Actividades distintas: "A [aliasA] le tinca ☕ Café y a [aliasB] le tinca 🏃 Correr. ¿Cuál va primero?"
   - Solo uno propuso: "A [alias] le tinca: ☕ Café y conversación. ¿Te sumas?"
   - Ninguno: "¡Se dio el match! Estos panoramas les gustan a ambos: [hasta 3 actividades favoritas en común]"
   La respuesta del endpoint /like en caso de match debe incluir proposals de ambos para que el frontend arme la pantalla de celebración correcta.

3. LIKES RECIBIDOS ("Les tincas"): nuevo endpoint GET /api/likes-received que devuelve los likes tipo "like" recibidos por el usuario que aún NO son match, ordenados por fecha (los que traen actividad propuesta primero), con: perfil público del interesado (clear_public), modo, actividad propuesta y fecha. EXCLUIR: bloqueados en cualquier dirección, baneados/suspendidos, perfiles que ya pasaste (kind pass hacia esa persona), y los likes en modo amor donde ya no hay compatibilidad. Incluye un campo seen; nuevo endpoint POST /api/likes-received/seen los marca vistos, y el contador de no-vistos se agrega a /api/notifications/counts para el badge del tab Chats.

4. RESPONDER DESDE "LES TINCAS": no requiere endpoint nuevo — el frontend llama al POST /like existente (con la actividad elegida), que ya crea el match al ser recíproco. Verifica que ese camino respeta cupo diario, bloqueos y validaciones, y agrega un test.

5. NUDGE DE PLAN A LAS 48 HORAS: job diario — para cada match activo con más de 48 h, sin plan aceptado y con al menos un mensaje de cada lado, insertar UNA sola vez un mensaje de sistema en el chat: si había propuestas, "¿Le ponemos fecha al ☕ café? 😊"; si no, "¿Arman un plan? A ambos les gusta [actividad favorita en común] 👀". Marca el match (nudge_sent) para nunca repetirlo. Sin emails ni push, solo mensaje en el chat.

6. FUGA PENDIENTE DEL ADMIN: /api/admin/users todavía devuelve location.coords de los usuarios (lo marcó tu propio test de la iteración 10). Elimina las coordenadas de TODAS las respuestas del panel admin: el admin solo necesita ciudad/comuna y país.

Corre todos los tests y agrega tests para: proposals de ambos lados, los 4 mensajes de sistema, likes-received con sus exclusiones, y el nudge que no se repite.
```

---

## BLOQUE B para Emergent — Frontend del nuevo flujo

```
Implementa la interfaz del nuevo flujo de match (el backend ya expone proposals y likes-received):

1. PESTAÑA "LES TINCAS 💛" EN CHATS: la pantalla Chats pasa a tener dos pestañas: "Chats" (la actual) y "Les tincas" con badge de no-vistos (también en el ícono del tab inferior, sumado a los mensajes). Cada interesado es una tarjeta con: foto (o avatar), alias, edad, comuna/ciudad, modo en que te dio like, y — destacado con el emoji — su propuesta si la hay: "Le tinca ☕ ir a un café contigo". Dos acciones: [Armar plan ✨] (abre el modal de plan de siempre; al elegir, se envía el like y como es recíproco se produce el MATCH al instante, mostrando la pantalla de celebración) y [Pasar] (registra pass y desaparece). Al entrar a la pestaña se marcan como vistos. Estado vacío: "Cuando alguien te dé me tinca, aparecerá aquí 💛".

2. PANTALLA DE MATCH INTELIGENTE: la celebración "¡Hay plan! 🎉" muestra el caso real usando proposals:
   - Coinciden: la actividad grande al centro + botón primario [Elegir día y hora] que abre directamente el selector de fecha del plan, y secundario [Abrir chat].
   - Distintas: "A ti te tinca ☕ Café · A [alias] le tinca 🏃 Correr" con las dos como chips tocables — tocar una la propone con fecha en el chat. Botón secundario [Abrir chat].
   - Solo una o ninguna: según el mensaje de sistema correspondiente, con [Me sumo ✨] o los 3 chips de favoritas en común.

3. TARJETA DE PLAN FIJA EN EL CHAT: barra compacta bajo el encabezado del chat con el estado del plan del match:
   - Sin plan → "☕🏃 ¿Cuál va primero?" o "¿Armamos un plan?" (tocarla abre el selector de plan).
   - Plan propuesto pendiente → "☕ Café · propuesto por [alias] · [Aceptar] [Otro]".
   - Plan confirmado → "☕ Café · sáb 12 jul, 15:00 · confirmado ✓" (tocar = ver en Mis planes).
   - Pasada la fecha → "¿Cómo estuvo el café? [Bien 💛] [No se dio]" (feedback simple, privado).
   Compacta (una línea), sin tapar mensajes, siempre visible al hacer scroll.

4. Muestra los mensajes de sistema del match con estilo especial (centrados, fondo sutil con gradiente) para que se distingan de los mensajes de personas.

Prueba el flujo completo en viewport 420x900 con dos cuentas demo: A propone café → B ve a A en "Les tincas" con la propuesta → B responde con "correr" → match con los dos chips → B toca café → queda propuesto en el chat → A acepta con fecha → la tarjeta del chat muestra confirmado → simular fecha pasada → aparece el feedback.
```

---

## Qué mantener a la vista (decisiones de producto)

| Decisión | Ahora (beta) | Futuro (con masa de usuarios) |
|---|---|---|
| Ver quién te dio me tinca | **Gratis y completo** — cada like respondido es un match que la beta necesita | Gratis: los 3 más recientes; resto premium |
| Plan al hacer like | Opcional ("solo me interesa" sigue existiendo) | Igual |
| Plan y match | El plan **nunca** bloquea el match | Igual — es el core |
| Nudge de plan | 1 mensaje en el chat a las 48 h, una sola vez | Ajustar según datos de conversión like→plan |

## Recordatorios pendientes de rondas anteriores

1. **Emails con Resend**: aún no implementados — los 3 bloques de EMAILS.md siguen en cola. Sugerencia de orden: primero este flujo (Bloques A y B), después los emails, porque el correo de "nuevo match" aprovechará los nuevos mensajes inteligentes.
2. La fuga de coordenadas en el panel admin va incluida en el Bloque A (punto 6) para que no se pierda.
