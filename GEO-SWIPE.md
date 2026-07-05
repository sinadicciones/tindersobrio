# PlanSobrio v2 — Swipe + Geolocalización (Chile primero, escalable a LATAM)

**Instrucción para Emergent en 4 bloques. Pegar de a un bloque por mensaje, en orden, probando entre cada uno.**

Enfoque: la app opera **solo en Chile** por ahora, pero toda la estructura (país, coordenadas, teléfonos de ayuda, alcances) queda lista para encender Argentina, Perú, Colombia y México después **sin rehacer nada** — solo agregando datos.

## Decisiones de diseño (contexto para ti, no pegar en Emergent)

| Decisión | Elección | Por qué |
|---|---|---|
| Ubicación | GPS del navegador + reverse geocoding gratuito (BigDataCloud, sin API key) con selección manual como respaldo | Sin costos; el respaldo manual es obligatorio porque mucha gente niega el permiso |
| Privacidad | Coordenadas redondeadas a ~1 km; solo se muestra comuna/ciudad y distancia aproximada | En una app de citas con población vulnerable, la ubicación exacta jamás se expone |
| Alcance | "Cerca de mí" (radio en km) o "Todo Chile" | Reemplaza el filtro por comuna; el código soporta un tercer alcance regional que queda oculto hasta abrir más países |
| Escalabilidad | Campo país en usuarios/grupos/teléfonos de ayuda, con Chile como único país habilitado | Abrir un país nuevo = agregar sus datos y activarlo, cero cambios de código |
| Fuera de Chile | Lista de espera | Si el GPS detecta otro país, capturas el interés para el lanzamiento futuro |

---

## BLOQUE 0 — Pendientes de la ronda anterior

```
Antes de las funciones nuevas, termina estos dos pendientes:

1. LOGIN CON GOOGLE (quedó sin hacer): agrega "Continuar con Google" en /login y /registro. Flujo para usuario nuevo con Google: tras autenticarse, pedir fecha de nacimiento (validar 18+) y continuar al onboarding normal. El perfil público usa solo el alias elegido, nunca el nombre ni la foto de Google. Un usuario existente de email+contraseña que entra con Google usando el mismo correo debe quedar vinculado a su misma cuenta.

2. VIDEOS A MEDIO ELIMINAR: se ocultaron de los perfiles públicos pero sigue existiendo el endpoint POST /api/uploads/video, los campos videos en los modelos y restos en el estado del Onboarding (videos: []). Elimina todo rastro de videos del backend y del frontend.
```

---

## BLOQUE 1 — Swipe estilo Tinder

```
Agrega gesto de swipe a las tarjetas de Descubrir, usando framer-motion (ya instalado), manteniendo intacta la mecánica de match por plan:

1. GESTO: la tarjeta se puede arrastrar. Al arrastrar, rota levemente (hasta ±12°) y sigue el dedo/cursor.
   - Arrastre a la IZQUIERDA más allá del umbral (~35% del ancho): la tarjeta sale volando a la izquierda = "Pasar" (misma lógica que el botón actual).
   - Arrastre a la DERECHA más allá del umbral: la tarjeta sale a la derecha Y SE ABRE el modal "¿Qué plan harías con [alias]?" (la misma lógica del botón "Me tinca ✨"). El like solo se registra cuando el usuario elige plan o "sin plan aún" en el modal; si cierra el modal, la tarjeta vuelve y NO se gasta el cupo diario.
   - Si no supera el umbral, la tarjeta vuelve a su lugar con animación de resorte.

2. INDICADORES VISUALES durante el arrastre: al arrastrar a la derecha aparece sobre la tarjeta un sello inclinado "ME TINCA ✨" (gradiente coral-violeta) cuya opacidad crece con el arrastre; a la izquierda, un sello gris "PASO 👋". Vibración háptica sutil (navigator.vibrate(10)) al cruzar el umbral, si el dispositivo lo soporta.

3. CONVIVENCIA: los botones "Pasar" y "Me tinca ✨" se mantienen exactamente igual (accesibilidad y desktop). En desktop, las flechas ← → del teclado ejecutan pasar/like.

4. La siguiente tarjeta debe verse asomada detrás de la actual (escala 0.95, opacidad 0.6) para dar sensación de mazo.

5. El swipe no debe interferir con el scroll vertical de los prompts bajo la tarjeta ni con los puntos de cambio de foto.

Prueba en viewport 420x900 el flujo completo: swipe derecha → modal de plan → elegir plan → match.
```

---

## BLOQUE 2 — Ubicación con GPS y estructura multi-país (solo Chile activo)

```
Reemplaza el sistema de comunas por ubicación real con GPS, con estructura preparada para operar en varios países aunque por ahora solo Chile está habilitado.

1. NUEVO CAMPO DE UBICACIÓN en el usuario (reemplaza gradualmente a "comuna"):
   location: {
     country: string,          // código ISO: "CL" (único habilitado por ahora)
     city: string,             // comuna o ciudad: "Providencia", "Viña del Mar"...
     coords: { type: "Point", coordinates: [lng, lat] }   // GeoJSON, REDONDEADAS a 2 decimales (~1 km) ANTES de guardar
   }
   Redondear SIEMPRE en el servidor al recibir coordenadas. NUNCA exponer las coordenadas de otro usuario en ninguna respuesta de la API: solo city, country y distancia aproximada en km (redondeada a múltiplos de 5 si es <50 km; "50+" si es más).

2. ÍNDICE GEOESPACIAL: crea índice 2dsphere sobre location.coords, e índices sobre location.country y location.city.

3. CATÁLOGO DE PAÍSES (colección countries, administrable): código, nombre, bandera emoji, habilitado (boolean) y lista de ciudades principales con coordenadas del centro de cada una. Sembrar SOLO Chile con enabled: true y estas ciudades: Santiago (-33.45,-70.65), Viña del Mar, Valparaíso, Concepción, La Serena, Antofagasta, Temuco, Rancagua, Talca, Puerto Montt, Valdivia, Iquique, Arica, Chillán, Osorno, Copiapó, Punta Arenas (con sus coordenadas aproximadas). Toda la lógica de la app debe leer los países habilitados desde esta colección — abrir un país nuevo en el futuro debe ser solo agregar el documento, sin tocar código.

4. MIGRACIÓN AUTOMÁTICA al arrancar (una sola vez, idempotente): para cada usuario existente con comuna y sin location, setear location = { country: "CL", city: <su comuna>, coords: <centroide de esa comuna> }. Incluye una tabla de centroides aproximados de las comunas de la Región Metropolitana que ya usa la app; si la comuna no está en la tabla, usar el centro de Santiago. Mantén el campo comuna como legado de solo lectura, pero todo el código nuevo usa location.

5. TELÉFONOS DE AYUDA COMO DATOS: nueva colección helplines con campo country, administrable desde el panel admin (CRUD). Sembrar los actuales con country "CL": Salud Responde 600 360 7777, Prevención del suicidio *4141, Urgencias 131. La página "Necesito apoyo" los lee de esta colección filtrando por el país del usuario (por ahora siempre Chile). El link a SinAdicciones.org se mantiene.

6. GRUPOS: agrega country: "CL" a los 4 grupos existentes y campo country obligatorio al crear grupos desde el admin. Los eventos agregan campo timezone (por defecto "America/Santiago").

7. ADMIN: en el dashboard y en las listas de usuarios/grupos, muestra el país (por ahora todo CL) — deja el filtro por país ya implementado aunque hoy tenga una sola opción.

Corre los tests existentes y verifica que la migración no rompe los perfiles demo ni el descubrimiento actual.
```

---

## BLOQUE 3 — Onboarding con GPS + descubrimiento por distancia

```
Rediseña la ubicación en el onboarding y el descubrimiento por cercanía:

1. NUEVO PASO DE UBICACIÓN en el onboarding (reemplaza el selector de comuna):
   Pantalla "¿Dónde estás?" con dos caminos:
   a) Botón principal "📍 Usar mi ubicación": pide permiso de geolocalización del navegador. Con las coordenadas, obtiene ciudad/comuna y país con la API gratuita de BigDataCloud (https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=..&longitude=..&localityLanguage=es — sin API key, llamada desde el frontend). Muestra confirmación: "Estás en Providencia, Santiago 🇨🇱 ¿Correcto?" con opción de corregir a mano. Redondear las coordenadas a 2 decimales ANTES de enviarlas al backend.
   b) Link secundario "Prefiero elegirla a mano": selector de ciudad del catálogo de Chile; si elige Santiago, selector adicional de comuna (lista actual). Al elegir manualmente se usan las coordenadas del centro de esa ciudad/comuna.

2. FUERA DE CHILE — LISTA DE ESPERA: si el GPS detecta un país distinto de los habilitados, mostrar pantalla amable: "Aún no llegamos a tu país 🌎 Por ahora PlanSobrio está disponible en Chile. Déjanos tu correo y te avisamos cuando lleguemos." con campo de email y país detectado → guardar en colección waitlist (email, country, fecha) visible en el panel admin. No dejar continuar el registro con país no habilitado.

3. ALCANCE DE CONEXIÓN (nuevo paso del onboarding, después de elegir modos):
   "¿Hasta dónde quieres conectar?" con dos opciones tipo tarjeta:
   - "📍 Cerca de mí" — personas a menos de X km (control deslizante 10–200 km, default 50)
   - "🇨🇱 Todo Chile" — sin límite de distancia dentro del país
   Nota: "Puedes cambiarlo cuando quieras desde los filtros". Guardar como preferencia (scope y radius_km). Implementa el enum de alcance dejando previsto un tercer valor "regional" (varios países) que NO se muestra en la interfaz por ahora.

4. EDICIÓN DE PERFIL: la misma UI de ubicación y alcance en Editar perfil, incluyendo re-detectar con GPS.

5. DESCUBRIMIENTO POR DISTANCIA: /api/discover respeta el alcance:
   - "Cerca de mí": candidatos dentro del radio usando consulta geoespacial ($geoNear sobre el índice 2dsphere), ordenados por mezcla de cercanía + actividades en común + algo de azar.
   - "Todo Chile": todos los del país, priorizando los más cercanos primero.
   REGLA DE INTERSECCIÓN: dos usuarios solo se ven si el alcance de AMBOS lo permite (si yo busco a 30 km y tú estás a 200, no nos vemos aunque tu alcance sea Todo Chile). Las reglas del modo Amor (género, edad, ambos con el modo activo) se mantienen intactas y se les suma esta.
   En los filtros de Descubrir, reemplaza el filtro de comuna por el selector de alcance + radio.

6. TARJETAS Y PERFIL: donde antes decía la comuna, mostrar "📍 Providencia · a ~10 km" (comuna/ciudad + distancia aproximada redondeada a múltiplos de 5 km; nunca menos de "a ~5 km", nunca coordenadas). En el perfil propio, mostrar la ubicación guardada.

7. ESTADO VACÍO INTELIGENTE: si no hay más candidatos en el radio, ofrecer ampliar: "No hay más personas cerca 🌱 ¿Quieres mirar en todo Chile?" → botón que amplía el alcance. Siempre elección del usuario, nunca automático.

8. USUARIOS MIGRADOS: al primer inicio de sesión tras el cambio, banner no bloqueante: "Ahora tus matches se ordenan por cercanía 📍 Confirma tu ubicación para mejorar tus recomendaciones" con botón que abre la UI de ubicación. Si lo ignora, sigue funcionando con la ubicación migrada de su comuna.

Al terminar: corre todos los tests, agrega tests de la regla de intersección de alcances y del filtro geoespacial ($geoNear con radio), y verifica manualmente que un usuario con radio 30 km no ve a un demo de Valparaíso pero con "Todo Chile" sí.
```

---

## Verificación final (tú, a mano, en un celular)

- [ ] Swipe derecha abre el modal de plan; si cierro el modal, no se gasta el cupo y la tarjeta vuelve.
- [ ] Swipe no rompe el scroll ni el cambio de fotos; botones y flechas de teclado siguen funcionando.
- [ ] Onboarding detecta mi comuna con GPS y también puedo elegir ciudad/comuna a mano.
- [ ] Con GPS fuera de Chile aparece la lista de espera (puedes probar con las herramientas de ubicación del navegador en modo desarrollador).
- [ ] Las tarjetas muestran "comuna · a ~X km" en múltiplos de 5; nunca coordenadas.
- [ ] Con radio de 30 km no veo perfiles lejanos; con "Todo Chile" sí.
- [ ] Los filtros ya no tienen comuna: tienen alcance + radio.
- [ ] "Necesito apoyo" sigue mostrando los 3 teléfonos chilenos (ahora vienen de la base de datos y son editables en el admin).
- [ ] Mi cuenta antigua sigue intacta y me aparece el banner de confirmar ubicación.
- [ ] Login con Google funciona y no queda rastro de videos.

## Para cuando decidas abrir otro país (futuro, no ahora)

Con esta estructura, abrir Argentina (o cualquiera) será solo:
1. Agregar el documento del país en la colección `countries` con sus ciudades y `enabled: true`.
2. Cargar sus teléfonos de ayuda en `helplines` (verificados).
3. Crear 1-2 grupos de ese país + revisar el copy chileno ("me tinca", "panorama").
4. Habilitar el alcance "regional" en la interfaz para que los países se conecten entre sí.
5. Invitar a la lista de espera acumulada de ese país — que ya se estará llenando sola desde ahora.
