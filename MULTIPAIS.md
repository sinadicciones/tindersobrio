# PlanSobrio v2 — Swipe + Multi-país LATAM

**Instrucción para Emergent, en 5 bloques. Pegar de a un bloque por mensaje, en orden, probando entre cada uno.**

Países v2: 🇨🇱 Chile · 🇦🇷 Argentina · 🇵🇪 Perú · 🇨🇴 Colombia · 🇲🇽 México

## Decisiones de diseño (contexto, no pegar en Emergent)

| Decisión | Elección | Por qué |
|---|---|---|
| Ubicación | Geolocalización del navegador + reverse geocoding gratuito (BigDataCloud, sin API key) con selección manual de país/ciudad como respaldo | Sin costo, sin Google Maps; el respaldo manual es obligatorio porque mucha gente niega el permiso |
| Privacidad de ubicación | Coordenadas redondeadas a 2 decimales (~1 km); solo se muestra ciudad y distancia aproximada | En una app de citas con población vulnerable, filtrar ubicación exacta es el peor incidente posible |
| Descubrimiento | Selector de alcance: "Cerca de mí" (radio km) / "Mi país" / "Toda Latinoamérica" | Resuelve la petición de hablar entre países SIN destruir la experiencia local; con pocos usuarios por país, el alcance LATAM mantiene el feed vivo |
| Amor entre países | Permitido pero con alcance "Cerca de mí" por defecto | Una cita necesita cercanía; amistad y apoyo funcionan perfecto a distancia |
| Copy | Base en español neutro + microcopy localizado por país (el botón "Me tinca" cambia por país) | Cariño local sin duplicar toda la app |
| Teléfonos de ayuda | Por país, administrables desde el admin | Los números chilenos no sirven fuera; deben ser datos, no texto fijo |
| Migración | Usuarios existentes pasan a country=CL, city=su comuna, con coordenadas del centro de su comuna | Nadie pierde su perfil ni tiene que rehacer el onboarding |

---

## BLOQUE 0 — Pendientes de la ronda anterior

```
Antes de las funciones nuevas, termina estos dos pendientes:

1. LOGIN CON GOOGLE (quedó sin hacer): agrega "Continuar con Google" en /login y /registro. Flujo para usuario nuevo con Google: tras autenticarse, pedir fecha de nacimiento (validar 18+) y continuar al onboarding normal. El perfil público usa solo el alias elegido, nunca el nombre ni la foto de Google. Un usuario existente de email+contraseña que entra con Google usando el mismo correo debe quedar vinculado a su misma cuenta.

2. VIDEOS A MEDIO ELIMINAR: se ocultaron de los perfiles públicos pero sigue existiendo el endpoint POST /api/uploads/video, los campos videos en los modelos, y restos en el estado del Onboarding (videos: []). Elimina todo rastro de videos del backend y frontend.
```

---

## BLOQUE 1 — Swipe estilo Tinder

```
Agrega gesto de swipe a las tarjetas de Descubrir, usando framer-motion (ya instalado), manteniendo intacta la mecánica de match por plan:

1. GESTO: la tarjeta se puede arrastrar. Al arrastrar, rota levemente (hasta ±12°) y sigue el dedo/cursor.
   - Arrastre a la IZQUIERDA más allá del umbral (~35% del ancho): la tarjeta sale volando a la izquierda = "Pasar" (misma lógica que el botón actual).
   - Arrastre a la DERECHA más allá del umbral: la tarjeta sale a la derecha Y SE ABRE el modal "¿Qué plan harías con [alias]?" (la misma lógica que el botón "Me tinca ✨"). El like solo se registra cuando el usuario elige plan o "sin plan aún" en el modal; si cierra el modal, la tarjeta vuelve y no se gasta el cupo.
   - Si no supera el umbral, la tarjeta vuelve a su lugar con animación de resorte.

2. INDICADORES VISUALES durante el arrastre: al arrastrar a la derecha aparece sobre la tarjeta un sello inclinado con el texto del botón de like (color del gradiente coral-violeta) cuya opacidad crece con el arrastre; a la izquierda, un sello gris "PASO 👋". Sutil vibración háptica (navigator.vibrate(10)) al cruzar el umbral, si el dispositivo lo soporta.

3. CONVIVENCIA: los botones "Pasar" y "Me tinca ✨" se mantienen exactamente igual (accesibilidad y desktop). En desktop, las flechas ← → del teclado ejecutan pasar/like.

4. La siguiente tarjeta debe verse asomada detrás de la actual (escala 0.95, opacidad 0.6) para dar sensación de mazo.

5. El swipe no debe interferir con el scroll vertical de los prompts bajo la tarjeta ni con los puntos de cambio de foto.

Prueba en viewport 420x900 el flujo completo: swipe derecha → modal de plan → elegir plan → match.
```

---

## BLOQUE 2 — Modelo de datos multi-país + migración

```
Prepara el backend para operar en 5 países: Chile (CL), Argentina (AR), Perú (PE), Colombia (CO) y México (MX). En este bloque solo modelo de datos y migración; el onboarding y el descubrimiento cambian en el bloque siguiente.

1. NUEVO CAMPO DE UBICACIÓN en el usuario, reemplazando gradualmente a "comuna":
   location: {
     country: "CL" | "AR" | "PE" | "CO" | "MX",
     city: string,            // "Providencia", "Palermo", "Miraflores"...
     admin_area: string,      // región/provincia/estado, opcional
     coords: { type: "Point", coordinates: [lng, lat] }  // GeoJSON, REDONDEADAS a 2 decimales (~1 km) ANTES de guardar
   }
   NUNCA guardar coordenadas con más de 2 decimales: redondear en el servidor al recibirlas. Nunca exponer las coordenadas de otro usuario en ninguna respuesta de la API: solo city, country y distancia aproximada en km (redondeada a múltiplos de 5 si es <50 km, "50+" si es más).

2. ÍNDICE GEOESPACIAL: crea índice 2dsphere sobre location.coords, e índices sobre location.country y location.city.

3. MIGRACIÓN AUTOMÁTICA al arrancar (una sola vez, idempotente): para cada usuario existente con campo comuna y sin location, setear location = { country: "CL", city: <su comuna>, coords: <centroide de esa comuna> }. Incluye en el código una tabla de centroides aproximados (lat/lng) de las comunas de la Región Metropolitana que ya usa la app; si la comuna no está en la tabla, usar el centro de Santiago (-33.45, -70.65). Mantén el campo comuna como legado de solo lectura por compatibilidad, pero todo el código nuevo usa location.

4. GRUPOS Y EVENTOS: agrega country a los grupos ("CL" para los 4 existentes) y permite country: "LATAM" para grupos online regionales. Crea un grupo online nuevo de ejemplo: "🌎 LATAM Sobrio" (online, country LATAM, descripción de comunidad regional). Los eventos heredan el país del grupo y agregan campo timezone (IANA, ej "America/Santiago"); el frontend muestra la hora del evento en la zona horaria del usuario, indicando la diferencia si no coincide.

5. CATÁLOGO DE PAÍSES en el backend (colección o constante): código, nombre, emoji bandera, gentilicio, timezone principal, y lista de ~10 ciudades principales cada uno:
   CL: Santiago, Viña del Mar, Valparaíso, Concepción, La Serena, Antofagasta, Temuco, Rancagua, Puerto Montt, Iquique
   AR: Buenos Aires, Córdoba, Rosario, Mendoza, La Plata, Mar del Plata, Salta, Tucumán, Neuquén, Santa Fe
   PE: Lima, Arequipa, Trujillo, Cusco, Chiclayo, Piura, Iquitos, Huancayo, Tacna, Ica
   CO: Bogotá, Medellín, Cali, Barranquilla, Cartagena, Bucaramanga, Pereira, Manizales, Santa Marta, Cúcuta
   MX: Ciudad de México, Guadalajara, Monterrey, Puebla, Querétaro, Mérida, Tijuana, León, Cancún, Toluca
   Incluye coordenadas aproximadas del centro de cada ciudad (para usuarios que eligen ciudad manualmente sin dar permiso de GPS).

6. TELÉFONOS DE AYUDA POR PAÍS: nueva colección helplines administrable desde el panel admin (CRUD), sembrada con estos datos (MARCAR internamente como "por verificar"):
   CL: Salud Responde 600 360 7777 · Prevención del suicidio *4141 · Urgencias 131
   AR: Línea 141 (SEDRONAR, consumos problemáticos, 24 hs) · Ayuda al suicida 135 · Emergencias 911
   PE: Línea 113 opción 5 (salud mental MINSA) · SAMU 106 · Emergencias 105
   CO: Línea 106 (apoyo emocional) · Emergencias 123
   MX: Línea de la Vida 800 911 2000 (adicciones, 24 hs) · Emergencias 911
   La página "Necesito apoyo" muestra los teléfonos del país del usuario, con botones de llamada. El link a SinAdicciones.org se mantiene para todos.

7. ADMIN: agrega filtro por país en usuarios, reportes y grupos, y desglose por país en el dashboard (usuarios y matches por país).

Corre los tests existentes y verifica que la migración no rompe los perfiles demo actuales.
```

---

## BLOQUE 3 — Onboarding con detección de ubicación

```
Rediseña el paso de ubicación del onboarding (y la edición de perfil) para multi-país:

1. NUEVO PASO DE UBICACIÓN (reemplaza el selector de comuna):
   Pantalla: "¿Dónde estás?" con dos caminos:
   a) Botón principal "📍 Usar mi ubicación": pide permiso de geolocalización del navegador. Con las coordenadas, obtiene país y ciudad usando la API gratuita de BigDataCloud (https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=..&longitude=..&localityLanguage=es — no requiere API key, llamar desde el frontend). Muestra el resultado para confirmar: "Estás en Providencia, Santiago 🇨🇱 ¿Correcto?" con opción de corregir a mano. Redondear las coordenadas a 2 decimales ANTES de enviarlas al backend.
   b) Link secundario "Prefiero elegirla a mano": selector de país (los 5, con bandera y nombre) y luego selector de ciudad (las 10 del catálogo + campo "Otra ciudad" de texto libre). Al elegir manualmente se usan las coordenadas del centro de esa ciudad.
   Si el país detectado por GPS no es uno de los 5 soportados, mensaje amable: "Aún no llegamos a tu país 🌎 Por ahora estamos en Chile, Argentina, Perú, Colombia y México" y permitir elegir manualmente uno de los 5 si el usuario igual quiere participar (online).

2. ALCANCE DE CONEXIÓN (nuevo paso del onboarding, después de elegir modos):
   "¿Hasta dónde quieres conectar?" con tres opciones tipo tarjeta:
   - "📍 Cerca de mí" — personas a menos de X km (control deslizante 10–200 km, default 50)
   - "🇨🇱 Mi país" — todo mi país
   - "🌎 Toda Latinoamérica" — sin límite de distancia
   Con nota: "Puedes cambiarlo cuando quieras desde los filtros". Guardar como preferencia del usuario (scope y radius_km).

3. EDICIÓN DE PERFIL: la misma UI de ubicación y alcance disponible en Editar perfil, incluyendo re-detectar con GPS.

4. PERFIL PÚBLICO Y TARJETAS: donde antes decía la comuna, ahora muestra "Ciudad, País" con bandera (ej: "📍 Palermo, Buenos Aires 🇦🇷") y — si ambos usuarios tienen coordenadas — la distancia aproximada: "a ~15 km" (redondeada a múltiplos de 5) o "🌎 en otro país" cuando corresponda. NUNCA mostrar coordenadas ni distancias con precisión menor a 5 km.

5. USUARIOS MIGRADOS: al primer inicio de sesión tras el cambio, un banner no bloqueante: "Ahora PlanSobrio está en 5 países 🌎 Confirma tu ubicación para mejorar tus matches" con botón que abre la UI de ubicación. Si lo ignora, sigue funcionando con la ubicación migrada de su comuna.
```

---

## BLOQUE 4 — Descubrimiento, chat y copy multi-país

```
Adapta descubrimiento, grupos y textos al modo multi-país:

1. DESCUBRIMIENTO CON ALCANCE: el endpoint /api/discover respeta el alcance del usuario:
   - "Cerca de mí": candidatos dentro del radio elegido usando consulta geoespacial ($geoNear / $near sobre el índice 2dsphere), ordenados por una mezcla de cercanía + actividades en común + algo de azar.
   - "Mi país": candidatos del mismo location.country, priorizando primero los más cercanos.
   - "Toda Latinoamérica": todos los países, priorizando primero mismo país, luego el resto, siempre con intereses en común como criterio secundario.
   REGLA DE INTERSECCIÓN: dos usuarios solo se ven si AMBOS alcances lo permiten (si yo busco solo cerca y tú estás en otro país, no nos vemos aunque tú tengas alcance LATAM). Las reglas existentes de modo Amor (género, edad, ambos con el modo activo) se mantienen intactas y se les suma esta.
   En los filtros del descubrimiento, agrega el selector de alcance y el radio (reemplaza el filtro de comuna).

2. ESTADO VACÍO INTELIGENTE: si no hay más candidatos en el alcance actual, ofrecer ampliar: "No hay más personas cerca 🌱 ¿Quieres mirar en todo Chile?" → botón que amplía el alcance temporalmente a país, y luego "¿Y en el resto de Latinoamérica?" → LATAM. Siempre como elección del usuario, nunca automático.

3. CHAT ENTRE PAÍSES: en la lista de chats y dentro del chat, junto al alias mostrar la bandera del país cuando el match es de otro país. Si el match es de otro país y el modo es Amor, mostrar una única nota de sistema al abrir el chat: "Están a la distancia 🌎 Tómense el tiempo de conocerse; si algún día se juntan, que sea de día y en un lugar público."
   En "proponer plan" entre usuarios de distinta ciudad/país, sugerir primero actividades a distancia; agrega al catálogo 4 actividades online: 📞 Llamada de apoyo, 🎮 Jugar algo online, 🎬 Ver una peli juntos a distancia, ☕ Café virtual.

4. MICROCOPY POR PAÍS: crea un diccionario de textos localizados con base en español neutro y variantes por país, aplicado según el país del usuario:
   - Botón de like: CL "Me tinca ✨" · AR "Me copa ✨" · MX "Me late ✨" · CO "Me suena ✨" · PE "Me provoca ✨" · neutro "Me gusta el plan ✨"
   - Reemplaza chilenismos del copy general ("panorama", "junta", "carrete") por neutro cuando el usuario no es de Chile: plan, encuentro, fiesta.
   - El contador diario y los mensajes de cupo usan el verbo local correspondiente.
   Mantén TODO el resto del tono cálido actual.

5. GRUPOS POR PAÍS: en Explorar grupos, mostrar primero los del país del usuario, luego los online LATAM. Al crear grupos desde el admin, campo país obligatorio (o LATAM para online). Los 4 grupos chilenos existentes no cambian.

6. SEED MULTI-PAÍS: agrega 8 perfiles demo nuevos repartidos entre AR, PE, CO y MX (2 por país, ciudades principales, con modos variados y alcance LATAM activado) para poder probar el descubrimiento entre países de inmediato. Mantén los 12 demo chilenos.

Al terminar: corre todos los tests, agrega tests de la regla de intersección de alcances y del filtro geoespacial, y verifica manualmente: usuario CL con alcance LATAM ve a los demo AR/MX; usuario CL con alcance "cerca de mí" NO los ve.
```

---

## Verificación final (tú, a mano)

- [ ] Swipe derecha abre el modal de plan; si cierro el modal, no se gasta el cupo y la tarjeta vuelve.
- [ ] Swipe no rompe el scroll ni el cambio de fotos; botones y teclado siguen funcionando.
- [ ] Onboarding detecta mi ciudad con GPS y también puedo elegirla a mano; país no soportado muestra el mensaje correcto.
- [ ] Mi perfil muestra "Ciudad, País 🇽🇽" y distancias en múltiplos de 5 km; nunca coordenadas exactas.
- [ ] Con alcance "cerca de mí" no veo perfiles de otros países; con "LATAM" sí, y la regla funciona en ambas direcciones.
- [ ] Un chat con alguien de otro país muestra la bandera y las actividades online al proponer plan.
- [ ] "Necesito apoyo" muestra los teléfonos de MI país. ⚠️ VERIFICAR cada número telefónico manualmente antes del lanzamiento en cada país — los sembrados son referenciales.
- [ ] El botón de like dice "Me copa" para un usuario argentino y "Me late" para uno mexicano.
- [ ] Los usuarios chilenos antiguos conservan su perfil y ven el banner de confirmar ubicación.
- [ ] Login con Google funciona y no quedó ningún rastro de videos.

## Recordatorio estratégico

La arquitectura queda lista para 5 países, pero **enciende el marketing país por país**: sin masa local, un feed vacío mata la app en ese país. El alcance LATAM es justamente el puente que mantiene viva la experiencia de los primeros usuarios de cada país nuevo (conectan con toda la región mientras su ciudad crece). Métricas a vigilar por país: usuarios activos, % con ≥1 match en la primera semana, y ratio de género.
