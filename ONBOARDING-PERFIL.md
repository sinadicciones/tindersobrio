# Onboarding liviano + perfil rico — plan e instrucción para Emergent

Cambios: 1 frase obligatoria (resto opcional con "agregar otra"), nuevos datos de perfil (estatura, signo, hijos), "qué busca" visible en el perfil, y control total del usuario sobre qué se muestra.

## Mi opinión y recomendaciones

**1. Tienes razón con las frases: 3 obligatorias es fricción pura.** El onboarding completado es tu KPI de activación (meta ≥70%) y cada campo obligatorio lo baja. Una frase obligatoria basta para que ningún perfil quede vacío; quien quiera lucirse agrega más. Regla de oro: **obligatorio solo lo que el matching necesita para funcionar; todo lo demás, opcional y editable después.**

**2. Sobre los nuevos campos, mi evaluación uno por uno:**

| Campo | Mi veredicto | Cómo |
|---|---|---|
| **Hijos** | ✅ El más valioso de los tres | Es información de compatibilidad real (en Amor es casi dealbreaker, y en Amistad conecta papás/mamás con planes compatibles). Opciones: "Tengo hijos / No tengo / Prefiero no decir". Opcional |
| **Estatura** | ✅ Ok como opcional | Es lo más pedido en apps de citas; no cuesta nada ofrecerlo. Selector 140–210 cm. Opcional y con visibilidad controlada |
| **Zodiaco** | ✅ Pero **sin preguntar nada** | Ya tenemos la fecha de nacimiento → el signo se calcula solo. Cero fricción: solo un interruptor "mostrar mi signo". Es el campo con mejor razón costo/encanto de toda la app |

**3. Dónde ponerlos: NO alargar el onboarding.** Un solo paso opcional nuevo ("Detalles sobre ti") con botón **"Saltar"** bien visible. Y el gancho para completarlo después: un **medidor de perfil completo** ("Tu perfil está al 70%") en la pestaña Perfil — Hinge y Bumble viven de ese medidor, funciona mucho mejor que obligar al inicio.

**4. "Qué busca" en el perfil: sí, y con una regla de privacidad.** Mostrar los chips (Apoyo, Amistad, Grupos, Amor) da contexto inmediato y evita malentendidos. Pero el chip **Amor solo debe verse entre usuarios que también tienen Amor activo** — la misma regla de visibilidad del descubrimiento, aplicada al perfil. Nadie debe enterarse de que buscas pareja si tú no puedes verlo a él/ella en ese modo. Y con interruptor "mostrar lo que busco" (encendido por defecto).

**5. El usuario elige qué se ve — el patrón correcto.** En Editar perfil, una sección **"Qué se muestra en mi perfil"** con interruptores individuales: estatura, signo, hijos, tiempo sin consumo (ya existe), qué busco. Un solo lugar, claro, con vista previa. Esto además refuerza la promesa de marca: aquí tú controlas tu información.

**El onboarding queda así (7 pasos, ~2 minutos):**
1. Sobre ti (alias, nacimiento, género) → 2. Ubicación (GPS) → 3. ¿Qué buscas? → 4. Tu proceso (privado) → 5. Tus panoramas (mín. 3) → 6. Fotos + **1 frase obligatoria + "agregar otra" + Sobre mí opcional** → 7. **Detalles (opcional, saltable)**: hijos, estatura, mostrar signo → Reglas.

**Referencia visual actualizada**: `mockups/rediseno-v1.html` — la tarjeta "BUSCA · DETALLES" en Descubrir y los chips con el control de visibilidad en Perfil.

---

## BLOQUE 1 para Emergent — Backend y onboarding

```
Ajusta el onboarding y el modelo de perfil. Referencia visual: mockups/rediseno-v1.html (tarjeta "Busca · Detalles" en Descubrir).

1. FRASES: el paso de frases pasa de 3 obligatorias a UNA obligatoria. La primera tarjeta de pregunta es requerida; debajo, un botón "＋ Agregar otra frase" permite sumar hasta 5 más (cada una con su selector de pregunta y respuesta, y botón para quitarla). El backend valida: mínimo 1 frase completa, máximo 6.

2. NUEVOS CAMPOS DE PERFIL (todos opcionales):
   - height_cm: entero 140–210 (selector/rueda en cm, mostrar también en metros: "1,78 m").
   - has_children: "si" | "no" | "prefiero_no_decir".
   - zodiac: NO SE PREGUNTA — se calcula automáticamente en el servidor desde birthdate (Aries…Piscis) y se guarda derivado.
   - Interruptores de visibilidad, todos en el usuario: show_height (default false hasta que ingrese estatura, luego true), show_children (default true si respondió), show_zodiac (default false), show_modes (default true). show_sober_time ya existe.

3. NUEVO PASO DEL ONBOARDING "Detalles sobre ti" (después de fotos/frases, antes de reglas): pantalla con título "Detalles sobre ti" y subtítulo "Todo opcional. Puedes cambiarlo o quitarlo cuando quieras." Contiene: ¿Tienes hijos? (3 botones), Estatura (selector), y el interruptor "Mostrar mi signo zodiacal (Capricornio)" mostrando el signo ya calculado. Botón primario "Continuar" y link visible "Saltar este paso". Saltarlo no marca nada.

4. PERFIL PÚBLICO (clear_public): incluir height_cm, has_children, zodiac y modes SOLO si su interruptor correspondiente está activo. REGLA DE PRIVACIDAD DEL MODO AMOR: en la lista de modes públicos, "amor" solo se incluye si el usuario QUE MIRA también tiene amor activo y ambos son compatibles según las reglas existentes (género de interés y edad de ambos); para cualquier otro espectador, la lista pública de modos se entrega sin "amor". has_children con valor "prefiero_no_decir" nunca se expone (equivale a oculto).

5. MEDIDOR DE PERFIL COMPLETO: endpoint que calcula el % de completitud: foto +20, bio +15, 3+ frases +15 (1 frase +5), intereses 5+ +10, estatura +10, hijos +10, signo visible +5, ubicación GPS +15. Se usará en el frontend (bloque 2).

Migración: usuarios existentes conservan sus 3 frases; los nuevos campos parten vacíos y ocultos. Corre los tests y agrega tests de: mínimo 1 frase, zodiac calculado correcto en los límites de fechas, y que "amor" no aparece en el perfil público para un espectador sin amor activo.
```

---

## BLOQUE 2 para Emergent — Perfil visible, edición y visibilidad

```
Implementa la presentación y edición de los nuevos datos (sistema Blanco Editorial, referencia mockups/rediseno-v1.html):

1. TARJETA "BUSCA · DETALLES" EN DESCUBRIR Y PERFIL PÚBLICO: nueva tarjeta bajo "Sobre mí" con etiqueta "BUSCA · DETALLES" (ícono Sparkles) y chips con ícono: los modos que busca (HeartHandshake Apoyo, Smile Amistad, Users Grupos, Heart Amor — respetando la regla de visibilidad del backend), y luego los detalles activados: estatura (ícono Ruler, "1,78 m"), signo (ícono MoonStar, "Capricornio"), hijos (ícono Baby, "Tiene hijos" / "Sin hijos"). Si no hay nada que mostrar, la tarjeta no aparece. Chips blancos uniformes del sistema.

2. EDITAR PERFIL:
   - Sección "Mis frases": la primera marcada como obligatoria, las demás con botón de quitar, y "＋ Agregar otra frase" hasta 6.
   - Sección "Detalles": hijos, estatura y (solo lectura) el signo calculado.
   - NUEVA SECCIÓN "Qué se muestra en mi perfil": interruptores individuales con vista previa del chip al lado: Lo que busco (modos) · Estatura · Signo zodiacal · Hijos · Tiempo sin consumo (mover aquí el interruptor existente). Texto bajo el título: "Tú decides qué ve el resto. Los cambios aplican de inmediato."
   - Al pie de la sección, link "Ver mi perfil como lo ven otros" → abre su propio perfil público en modo vista previa.

3. MEDIDOR DE PERFIL COMPLETO: en la pestaña Perfil, bajo la cabecera, una barra fina con gradiente y el texto "Perfil al 75%" + la siguiente sugerencia concreta ("Agrega tu estatura", "Suma otra frase"). Al 100% la barra se reemplaza por un check en menta "Perfil completo". Tocar la barra lleva a Editar perfil en la sección correspondiente.

4. ONBOARDING (interfaz de los cambios del bloque anterior): paso de frases con 1 obligatoria + agregar más; paso "Detalles sobre ti" con Saltar visible; ambos con la estética del sistema (etiquetas blancas con regla, chips, botones estándar).

Prueba en 420x900: onboarding completo saltándose los detalles (debe fluir sin error), perfil con todo visible vs todo oculto (la tarjeta Busca·Detalles desaparece), un usuario sin modo Amor mirando el perfil de alguien con Amor activo (no debe ver el chip Amor), y el medidor de completitud cambiando al agregar datos.
```

---

## Resumen de la filosofía (para decidir futuros campos)

| Tipo de dato | Regla |
|---|---|
| Lo mínimo para matchear (alias, edad, género, ubicación, modos, 3 intereses, 1 frase) | Obligatorio en onboarding |
| Lo que enriquece el perfil (más frases, bio, estatura, hijos, fotos extra) | Opcional — se completa después con el medidor |
| Lo que se puede derivar (signo desde la fecha, ciudad desde el GPS) | **Nunca se pregunta**: se calcula y el usuario solo decide si se muestra |
| Lo sensible (sustancia, etapa, relación con el consumo) | Privado por defecto, jamás en el perfil salvo insignia voluntaria |
| Visibilidad | Siempre interruptor individual + "ver mi perfil como lo ven otros" |
