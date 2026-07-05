# Ajustes v2 — Coherencia de ubicación, privacidad y "Sobre mí"

Basado en la revisión del código con Google Auth, geolocalización y swipe ya implementados.
**Pegar en Emergent de a un bloque por mensaje, en orden.**

Resumen de lo encontrado:
- ✅ Google Auth bien hecho (intercambio server-side, vincula cuentas por email, pide fecha de nacimiento en onboarding, respeta baneos/suspensiones).
- ✅ Swipe funcionando y testeado.
- ⚠️ La comuna sigue siendo el campo principal y el GPS se pide en silencio al enviar el onboarding (sin contexto ni confirmación) → Bloque A.
- 🔴 Bug: al guardar cualquier edición de perfil, las coordenadas GPS se reemplazan por el centro de la comuna → Bloque A.
- 🔴 Privacidad: coordenadas guardadas con precisión de ~11 metros y distancia mostrada con precisión de 100 m ("a 3 km") → Bloque B.
- ➕ No existe descripción libre del usuario → Bloque C.

---

## BLOQUE A — Ubicación coherente (elimina la comuna redundante)

```
Corrige la experiencia de ubicación para que la geolocalización sea el camino principal y la comuna deje de ser un campo aparte:

1. ONBOARDING — PASO DE UBICACIÓN DEDICADO: elimina el selector de comuna del paso "Sobre ti" y elimina la detección silenciosa de ubicación que hoy ocurre al enviar el formulario. En su lugar, crea un paso propio "¿Dónde estás?" con dos caminos:
   a) Botón principal "📍 Usar mi ubicación", con un texto ANTES de pedir el permiso: "Usamos tu ubicación solo para mostrarte gente y planes cerca de ti. Nunca compartimos tu ubicación exacta." Al aceptar el permiso del navegador, obtiene las coordenadas GPS y llama a BigDataCloud PASANDO las coordenadas (https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=..&longitude=..&localityLanguage=es) para obtener la comuna/ciudad real — hoy se usa la variante por IP que puede devolver otra ciudad. Muestra confirmación: "Estás en Providencia, Santiago 🇨🇱 ¿Correcto?" con botones Confirmar / Corregir a mano.
   b) Link "Prefiero elegirla a mano": selector de ciudad de Chile (catálogo nacional existente) y, si elige Santiago, selector de comuna (la lista actual). Se usan las coordenadas del centro de esa ciudad/comuna.
   El campo comuna del perfil pasa a derivarse de la ubicación (es la city del location), no a pedirse por separado.

2. BUG CRÍTICO — EDICIÓN DE PERFIL PISA LAS COORDENADAS GPS: hoy PATCH /api/profile/me re-deriva location desde el centroide de la comuna cada vez que se guarda el perfil (porque el formulario siempre envía comuna), destruyendo las coordenadas GPS del usuario. Corrige: solo recalcular location cuando el usuario cambió explícitamente su ubicación, no en cada guardado.

3. EDITAR PERFIL — MISMA UI DE UBICACIÓN: reemplaza el dropdown de comuna por una sección "Mi ubicación" que muestra la ubicación actual ("📍 Providencia, Santiago") con dos acciones: "Actualizar con mi ubicación" (GPS + confirmación, igual que el onboarding) y "Elegir a mano".

4. PUERTA DE PAÍS TAMBIÉN PARA GOOGLE: hoy la verificación de país (waitlist para quien está fuera de Chile) solo ocurre en el registro con email. Agrégala también al paso de ubicación del onboarding: si el país detectado o elegido no está habilitado, mostrar la pantalla de lista de espera. Así los usuarios que entran con Google pasan por el mismo filtro.

5. LOGIN DE CUENTAS GOOGLE: si alguien intenta entrar con email+contraseña en una cuenta que solo tiene Google, el error debe decir "Esta cuenta ingresa con Google. Usa el botón Continuar con Google", en vez del genérico "correo o contraseña incorrectos".

Corre los tests y agrega un test que verifique que editar el alias NO cambia las coordenadas de location.
```

---

## BLOQUE B — Privacidad de ubicación (crítico para una app de citas)

```
Endurece la privacidad de la ubicación:

1. PRECISIÓN DE COORDENADAS GUARDADAS: build_location_doc guarda las coordenadas GPS redondeadas a 4 decimales (~11 metros de precisión). Cámbialo a 2 decimales (~1 km) — la función round_coords ya existe y no se está usando ahí. Aplica también una migración que re-redondee a 2 decimales las coordenadas ya guardadas de todos los usuarios.

2. DISTANCIA MOSTRADA: hoy la distancia se calcula y muestra con precisión de 100 metros ("a 3 km", "a 3.1 km"), lo que permite triangular dónde vive una persona. Redondea la distancia EN EL SERVIDOR antes de responder: menos de 5 km → "5" (el frontend muestra "a ~5 km"); entre 5 y 50 km → múltiplos de 5; más de 50 km → "50+". Nunca decimales.

3. Verifica que las coordenadas siguen sin exponerse en ninguna respuesta de la API para otros usuarios (perfiles, discover, matches, grupos, admin de reportes).

Agrega tests de los tres puntos.
```

---

## BLOQUE C — "Sobre mí": descripción libre del usuario

```
Agrega una breve descripción libre al perfil ("Sobre mí"):

1. BACKEND: nuevo campo bio (texto, máximo 300 caracteres, opcional) en el onboarding y en PATCH /api/profile/me. Validaciones en el servidor: máximo 300 caracteres, y rechazar con mensaje amable si contiene links (http, www, .com) o secuencias largas de dígitos tipo teléfono — para evitar que se use para saltarse el chat y compartir contactos antes del match. Incluir bio en clear_public (es contenido público).

2. ONBOARDING: en el paso "Tus frases", agrega ARRIBA de las 3 preguntas un campo opcional "Sobre mí (opcional)" — textarea con placeholder "Cuéntale a la comunidad quién eres y qué buscas, en tus palabras…" y contador 0/300.

3. EDITAR PERFIL: el mismo textarea "Sobre mí" al inicio de la sección de textos.

4. PRESENTACIÓN EN DESCUBRIR Y PERFIL (según mockup mockups/descubrir.html): la bio aparece como PRIMERA tarjeta bajo la foto, con un tratamiento distinto a las preguntas guiadas: etiqueta "✍️ Sobre mí" en coral, un riel vertical con el gradiente coral-violeta en el borde izquierdo, el texto entre comillas, fondo con degradado sutil (#1B1F2A → #161922) y sombra suave. Si el usuario no escribió bio, la tarjeta simplemente no aparece.

5. Aprovecha de aplicar el rediseño de contraste de las tarjetas de preguntas descrito en mockups/README.md si aún no está aplicado: ícono en chip de color a la izquierda, etiqueta en color de acento (1ª coral, 2ª menta #4ADE80, 3ª violeta #8B5CF6), texto de respuesta en blanco cálido ~16px, y chips de intereses sobre la foto.

Verifica en viewport 420x900: perfil con bio larga (300), sin bio, y que el intento de guardar una bio con un link o un teléfono muestra el error amable.
```

---

## Verificación final (tú, a mano)

- [ ] El onboarding ya no pide comuna aparte: pide ubicación con GPS (con explicación previa) o a mano, y confirma "¿Estás en X?".
- [ ] La comuna detectada por GPS es la correcta (no la del proveedor de internet).
- [ ] Editar el alias u otra cosa del perfil NO mueve mi ubicación (bug corregido).
- [ ] En Editar perfil existe "Mi ubicación" con actualizar por GPS o a mano.
- [ ] Las distancias se ven como "a ~5 km", "a ~15 km" o "50+ km" — nunca "a 3.1 km".
- [ ] Puedo escribir mi "Sobre mí", se ve como primera tarjeta con las comillas y el riel de gradiente, y si no escribo nada no aparece.
- [ ] No puedo guardar una bio con un link o un número de teléfono.
- [ ] Un usuario nuevo de Google que está fuera de Chile cae en la lista de espera.
- [ ] Entrar con contraseña en una cuenta de solo-Google sugiere usar el botón de Google.
```
