# Landing de Convenios (Aliados) — plan e instrucción para Emergent

Página pública para que gimnasios, cafés, centros culturales y lugares de panorama se registren como aliados de PlanSobrio.

## Mi opinión y recomendaciones

**1. El ángulo correcto: NO les vendes publicidad, les ofreces un público difícil de alcanzar.** Un café no quiere "otro directorio". Sí quiere: *"clientes que buscan planes de día, sin alcohol, y que son fieles a los lugares que los reciben bien"*. Ese es tu pitch. La landing debe hablar del beneficio para ELLOS, no de tu app.

**2. Gratis al inicio, y que quede claro.** En la etapa beta el convenio debe ser **sin costo**: tú necesitas llenar el mapa de planes y ellos necesitan ver resultados antes de pagar. La landing dice "Súmate gratis a la red de lugares PlanSobrio". La monetización (destacados, sello premium) viene después, cuando tengas tráfico que mostrar.

**3. Pide lo mínimo en el formulario.** Cada campo extra baja el registro. Los que pediste están perfectos: nombre de contacto, empresa, email, WhatsApp, tipo de oferta (selector) y qué ofrece (texto). Yo agregaría solo **comuna** (esencial para el mapa) y haría el WhatsApp el canal principal — en Chile B2B chico se cierra por WhatsApp, no por email.

**4. Qué reciben (sé concreto en la landing):**
- Aparecer en el mapa/listado de planes de la app ante un público sobrio y local.
- Un "Score Sobrio" y el sello "Lugar PlanSobrio" (confianza para ese público).
- Posibilidad de publicar eventos sin alcohol y ofertas para la comunidad.
- Cero costo en beta.

**5. Tipos de aliado (selector del formulario):** Café / Restaurante saludable · Gimnasio o centro deportivo · Yoga, meditación o wellness · Centro cultural, museo o teatro · Taller o academia (arte, cocina, etc.) · Café/librería · Espacio para eventos · Panorama al aire libre (tour, parque, aventura) · Otro.

**6. Confianza y encaje de marca:** deja claro que es una red de lugares **sin alcohol o que reciben bien a quien no toma** — no les pides que dejen de vender alcohol, sino que ofrezcan una buena experiencia sin que el trago sea el centro. Y menciona el respaldo de SinAdicciones para dar seriedad.

**7. Qué pasa después del formulario (importante para no dejarlos colgados):** mensaje de éxito claro ("Te contactaremos por WhatsApp en 48 h"), correo automático de confirmación al aliado, y aviso interno al equipo con cada registro nuevo (reutiliza el sistema de correos internos que ya existe).

---

## BLOQUE para Emergent — Landing de Convenios + panel

```
Crea una página pública de convenios/aliados en la ruta /convenios (también accesible como /aliados que redirige a /convenios), con el sistema visual Blanco Editorial de la app. Es una landing de captación B2B, no requiere login.

0. TEMA CLARO (fondo blanco), coherente con la landing principal: fondo #FFFFFF, secciones alternas #F6F5F9, tarjetas blancas con borde #E7E4EE y sombra suave, texto #1A1524 (secundario #5B5766), íconos de línea oscuros. Los acentos de marca se mantienen: gradiente coral #FF6B5E → violeta #8B5CF6 en botones y números de paso; el bloque "gratis" y la insignia BETA en verde #16A34A sobre fondo #EAF7EF. Ver referencia visual en mockups/convenios.html.

1. ESTRUCTURA DE LA LANDING (mobile-first, HTML real con sus meta tags para poder compartirla):
   - Header simple con el logo PlanSobrio + badge BETA.
   - Hero: título "Suma tu lugar a la red de panoramas sin alcohol" + bajada "Conecta con un público que busca planes de día, sin alcohol, y que es fiel a los lugares donde se siente bien recibido." + botón que hace scroll al formulario ("Quiero sumarme gratis").
   - Sección "Por qué sumarte" con 4 tarjetas (ícono lucide + título + texto): 
     · Público difícil de alcanzar (personas que viven sin alcohol y buscan dónde ir).
     · Apareces en el mapa de planes de la app, por comuna.
     · Sello "Lugar PlanSobrio" y Score Sobrio que genera confianza.
     · Gratis en la etapa beta.
   - Sección "Cómo funciona" en 3 pasos: 1) Te registras aquí · 2) Conversamos por WhatsApp y creamos tu ficha · 3) La comunidad te descubre y llega a tu local.
   - Nota de respaldo: "PlanSobrio es un proyecto de SinAdicciones.org, la comunidad chilena para vivir sin alcohol ni drogas."
   - FORMULARIO (ancla #registro):
     · Nombre de contacto (requerido)
     · Empresa o lugar (requerido)
     · Comuna (selector de comunas de Chile, requerido)
     · Email (requerido, validado)
     · WhatsApp (requerido, validar formato chileno +569XXXXXXXX flexible)
     · Tipo de oferta (selector requerido): Café / Restaurante saludable, Gimnasio o centro deportivo, Yoga meditación o wellness, Centro cultural museo o teatro, Taller o academia, Café o librería, Espacio para eventos, Panorama al aire libre, Otro.
     · ¿Qué puedes ofrecer a la comunidad? (textarea requerido, placeholder "Ej: 2x1 en cafés de día, clase de prueba gratis, descuento en la entrada, evento sin alcohol una vez al mes…")
     · Checkbox: "Entiendo que PlanSobrio conecta con un público que vive sin alcohol y quiero recibir a esa comunidad."
     · Botón "Enviar solicitud".
   - Pie: "Hecho con 💛 desde SinAdicciones.org".

2. BACKEND: colección partners (id, contact_name, company, comuna, email, whatsapp, offer_type, offer_text, status[nuevo|contactado|activo|descartado], created_at, notes). Endpoint público POST /api/partners (con rate-limit anti-spam y validación de campos; honeypot anti-bot). 

3. AL ENVIAR:
   - Pantalla de éxito: "¡Gracias! 🎉 Recibimos tu solicitud. Te contactaremos por WhatsApp dentro de 48 horas para crear tu ficha."
   - Correo automático de confirmación al aliado (vía Resend, remitente hola@plansobrio.com, pie con 💛 SinAdicciones.org): agradece y explica los próximos pasos.
   - Aviso interno al equipo (reutiliza admin_notification_recipients y el sistema de correos internos existente): "Nuevo aliado interesado: {empresa} ({tipo}) en {comuna}" con todos los datos.

4. PANEL ADMIN: nueva sección "Aliados" en /admin con la lista de partners (tabla filtrable por estado y comuna), detalle de cada uno, cambio de estado, campo de notas, y exportar CSV. Mostrar contador de nuevos sin contactar en el dashboard.

5. SEO/COMPARTIR: meta title "Suma tu lugar — PlanSobrio para aliados", description sobre conectar con público sobrio, OG image (puede reutilizar el estilo de la og principal con el texto "Para lugares y comercios"). La página es indexable.

Verifica: envío del formulario crea el partner, muestra el éxito, dispara los 2 correos, y aparece en /admin. Prueba validaciones (campos requeridos, email y WhatsApp) y el honeypot.
```

---

## Recomendaciones de uso (después de construirla)

1. **Primeros aliados a mano, no esperando el formulario**: identifica 10 lugares que ya calzan (cafés de especialidad, centros de yoga, un par de gimnasios) y contáctalos tú directo con el link de la landing. El formulario es para escalar, pero los primeros se cierran conversando.
2. **El gancho de entrada es "gratis + primeros en la ciudad"**: a los pioneros ofréceles el sello "Aliado Fundador" — reconocimiento que no cuesta y genera compromiso.
3. **Coordina con el mapa de planes**: cada aliado aprobado debería convertirse en un lugar del catálogo de la app (hoy los planes son actividades genéricas; los aliados le dan lugares reales con dirección). Puede ser una segunda iteración: "convertir partner activo en place del catálogo".
4. **No prometas volumen que no tienes**: en beta, sé honesto — "estamos empezando, serás de los primeros". Un aliado decepcionado habla mal; uno bien gestionado desde chico se queda para siempre.
5. **La landing sirve doble**: como página de captación Y como material para mostrar en reuniones. Compártela por WhatsApp cuando hables con un local.
