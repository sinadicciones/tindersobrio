# Mockup — Rediseño de la pantalla Descubrir

`descubrir.html` es un mockup autónomo (ábrelo en el navegador) del rediseño de la pantalla de elección de encuentro. Resuelve el problema del gris plano sin contraste de las tarjetas de texto, manteniendo la identidad de marca (fondo oscuro + gradiente coral‑violeta).

## Bloque para Emergent

```
Rediseña las tarjetas de texto (prompts) de la pantalla Descubrir para darles jerarquía y contraste, manteniendo el estilo oscuro y el gradiente coral-violeta de la marca. Cambios:

1. Cada tarjeta de prompt debajo de la foto lleva a la izquierda un ícono/emoji dentro de un chip cuadrado redondeado con color tenue, y la etiqueta de la pregunta ("Me hace bien cuando…") en un color de acento, no en gris. Rota el acento entre las tarjetas: 1ª coral, 2ª menta (#4ADE80), 3ª violeta (#8B5CF6). El texto de la respuesta va en blanco cálido, tamaño ~16px, buena interlínea.

2. Las tarjetas usan un fondo con degradado sutil (de #1B1F2A a #161922), un borde superior de 1px con luz tenue y una sombra suave, para que se separen del fondo en vez de fundirse con él.

3. Agrega en cada tarjeta de prompt un botón de corazón pequeño arriba a la derecha ("me tinca esta respuesta"): al tocarlo abre el mismo modal de plan que el botón principal, pero prellenado con contexto de que le gustó ese prompt puntual.

4. Sobre la foto, bajo el primer prompt en vidrio (glass), muestra los intereses del usuario como chips/píldoras con color.

5. Detrás de la tarjeta de foto, asoma el borde superior de la siguiente tarjeta (escala/opacidad reducida) para dar sensación de mazo y anticipar el swipe.

6. Mantén intactos: badge verde de tiempo sin consumo, ubicación con distancia aproximada, botones Pasar / Me tinca ✨ y la barra inferior. No cambies la lógica, solo la presentación.

Verifica en viewport 420x900 que todo se lee con buen contraste y que la barra inferior no tapa contenido.
```
