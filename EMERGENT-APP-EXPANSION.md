# Emergent — Expansión de la app (Fase 1 + Fase 2)

Instrucción para Emergent, basada en el estado real del código. **Pegar de a un bloque por mensaje, en orden.** El SEO público (landing por países) se hace aparte en el sitio de SinAdicciones; esto es solo la app.

Contexto verificado del código actual (para que Emergent no rompa nada):
- Hoy solo el país Chile (CL) está sembrado y `enabled`. El resto va a waitlist.
- El onboarding EXIGE `location.comuna` para avanzar — eso solo existe en Chile y bloquearía a los demás países.
- Los eventos ya tienen `is_online` pero NO tienen enlace de reunión ni recurrencia. Los grupos no tienen tipo.
- El registro/onboarding NO leen parámetros `?pais=` ni UTM de la URL.

---

## BLOQUE 1 — Abrir la app a todos los países hispanohablantes

```
Abre PlanSobrio a todos los países hispanohablantes (hoy solo Chile está habilitado y el resto cae en waitlist). Cambios:

1. SEMBRAR LOS 21 PAÍSES en la colección countries, todos con enabled=true, cada uno con: código ISO, nombre, bandera emoji, zona horaria principal, orden, y sus líneas de ayuda nacionales (helplines). Usa como fuente los datos ya definidos en el repositorio vercelsinadicciones (apps/web/lib/countries.ts), que tiene los 21 con sus líneas oficiales. Países: Chile CL, Argentina AR, México MX, Colombia CO, Perú PE, España ES, Venezuela VE, Ecuador EC, Guatemala GT, Bolivia BO, Cuba CU, República Dominicana DO, Honduras HN, Paraguay PY, El Salvador SV, Nicaragua NI, Costa Rica CR, Panamá PA, Uruguay UY, Puerto Rico PR, Estados Unidos (hispano) US. Marca cada helpline con un flag "por_verificar": true para revisión antes de promocionar cada país. Chile mantiene sus datos actuales.

2. UBICACIÓN SIN DEPENDER DE "COMUNA": hoy el onboarding exige location.comuna, que solo aplica a Chile. Cámbialo para que el requisito sea location.city (o comuna en el caso de Chile). El modelo location queda: { country (requerido), city (requerido), region/estado (opcional), comuna (opcional, solo Chile), coords (opcional) }. En el paso de ubicación:
   - Detección por GPS/IP que rellena país + ciudad automáticamente.
   - Selector manual de país (los 21) y luego campo/selector de ciudad. Solo si el país es Chile, mostrar además el selector de comuna. Para el resto, ciudad basta.
   - El validador de "puedo avanzar" pasa a exigir country + city (no comuna).

3. LEER PAÍS Y UTM DE LA URL: en /registro y /login, leer los parámetros de query ?pais=XX (código ISO) y utm_source, utm_medium, utm_campaign, utm_content. Guardarlos: el pais preselecciona el país en el onboarding; los UTM se guardan en el usuario (campo acquisition: {utm_source, utm_medium, utm_campaign, utm_content, landing_pais}) para medir después qué campaña/país trae usuarios que concretan planes. Estos parámetros vienen de las landings de SinAdicciones (ej: plansobrio.com/registro?pais=MX&utm_source=sinadicciones&utm_campaign=mx).

4. QUITAR EL BLOQUEO DE WAITLIST: como ahora todos los países están habilitados, el flujo de waitlist deja de bloquear el registro. Mantén el endpoint y la colección waitlist por si en el futuro se agrega un país nuevo aún no habilitado, pero con los 21 activos nadie debería caer ahí. Si el país detectado no está en la lista (caso raro), permitir elegir manualmente uno de los 21.

5. ALCANCE "REGIONAL" EN DESCUBRIMIENTO: agrega a la interfaz de descubrimiento/filtros el tercer nivel de alcance junto a "Cerca de mí" y "Mi país": "Toda Latinoamérica" (todos los países). La regla de intersección se mantiene: dos personas se ven solo si el alcance de ambas lo permite. Con poca densidad al abrir países nuevos, este alcance mantiene el feed vivo.

6. HELPLINES Y COPY POR PAÍS: verifica que "Necesito apoyo" muestra las líneas del país del usuario para los 21. Extiende el microcopy local del botón de like a los países que tengan variante propia (México "me late", Argentina "me copa", Colombia "me suena", Perú "me provoca", Chile "me tinca") y usa español neutro ("me gusta el plan") como default para el resto. Reemplaza chilenismos del copy general por neutro cuando el usuario no es de Chile.

7. ADMIN: en el panel, el filtro por país debe listar los 21; el dashboard muestra desglose de usuarios y matches por país. Deja visible el flag "por_verificar" de las helplines para poder revisarlas.

Corre los tests y agrega tests de: onboarding de un usuario de México (sin comuna) que completa correctamente; registro con ?pais=CO&utm_source=x que preselecciona Colombia y guarda el UTM; "Necesito apoyo" mostrando líneas de España para un usuario español; alcance regional mostrando perfiles de otros países.
```

---

## BLOQUE 2 — Grupos con reuniones online y comunidad

```
Mejora el módulo de Grupos para que sea el corazón de la comunidad, con reuniones online de apoyo/conversación. La app ya tiene grupos, eventos (con is_online) e inscripciones; se amplía así:

1. ENLACE DE REUNIÓN EN EVENTOS: agrega a events los campos meeting_url (URL de Zoom/Meet/Jitsi) y recurrence (texto libre, ej "Cada martes 20:00"; vacío = evento único). En el detalle del evento, si is_online y hay meeting_url: mostrar botón "Unirse a la reunión" que abre el link en pestaña nueva, VISIBLE SOLO para inscritos y SOLO desde 15 minutos antes de la hora (antes: texto "El enlace se activa 15 minutos antes de empezar"). Registrar quién entra al link (para métrica de asistencia).

2. TIPO DE GRUPO: agrega a groups el campo group_type con valores: "apoyo" (círculos de conversación/apoyo entre pares), "actividad" (deporte, cultura, panoramas), "pais" (comunidad nacional), "tematico" (por sustancia o etapa). Los grupos de tipo "apoyo" muestran un aviso fijo arriba: "Este es un espacio de apoyo entre pares. No reemplaza terapia ni tratamiento profesional." + link a Necesito Apoyo.

3. GRUPO COMUNIDAD POR PAÍS: en el seed, crear un grupo online tipo "pais" para cada país habilitado: "Comunidad {país}" (ej "Comunidad México"), para que nadie llegue a un vacío. Al completar el onboarding, sugerir al usuario unirse al grupo de su país (banner o paso final "Únete a la comunidad de {país}").

4. REUNIONES ONLINE RECURRENTES: permite crear reuniones recurrentes con meeting_url desde el admin y desde el moderador del grupo. Un job diario genera la "instancia de hoy" de cada reunión recurrente (según su recurrence) para que aparezca en el grupo y en Mis Planes de los inscritos. Semilla de ejemplo (globales, tipo apoyo): "Círculo de apoyo online — martes 20:00 (hora Chile / se muestra en la hora local de cada usuario)" y "Conversación de fin de semana — sábado 11:00".

5. MODERADOR DE GRUPO: rol moderador por grupo (además del admin global). El moderador puede: fijar un mensaje, crear/editar eventos y reuniones del grupo, y ocultar mensajes. Reportar dentro del grupo funciona igual que en el chat 1-1.

6. RECORDATORIOS: quien está inscrito en una reunión/evento online recibe recordatorio el día del evento (reutiliza el email "recordatorio de plan" ya existente + push si está disponible) con el botón para unirse. Respeta las preferencias de email existentes.

7. ZONA HORARIA: todas las horas de eventos/reuniones se muestran en la hora local del usuario, indicando entre paréntesis la referencia (ej "20:00 tu hora"). Los recurrentes se anclan a una zona base y se convierten para cada usuario.

Prueba: crear un grupo de apoyo con una reunión recurrente online; un usuario se inscribe y el botón "Unirse" aparece solo 15 min antes con el link correcto; cada país tiene su grupo "Comunidad {país}"; el aviso de "no reemplaza tratamiento" aparece en los grupos de apoyo; un usuario de Argentina ve la hora de la reunión en su horario.
```

---

## Notas para ti

- **Orden**: Bloque 1 primero (abre países, base de todo), probar, luego Bloque 2 (comunidad/grupos).
- **Punto de conexión con la landing de SinAdicciones**: cuando armes la landing por países en el otro chat, que TODOS los CTA de registro usen `plansobrio.com/registro?pais=CÓDIGO&utm_source=sinadicciones&utm_campaign=CÓDIGO`. El Bloque 1 hace que la app lea eso y preseleccione el país + guarde el origen para tus métricas.
- **Helplines por verificar**: los datos vienen de SinAdicciones (confiables), pero antes de promocionar cada país nuevo, revisa que su línea de ayuda esté vigente — por eso quedan marcadas "por_verificar".
- **No promociones los 21 de golpe**: el acceso queda abierto técnicamente, pero enciende el marketing país por país (Chile → México → Colombia). El grupo "Comunidad {país}" + las reuniones de apoyo online evitan el feed vacío mientras crece cada país.
- **Después de estos dos bloques**: sigue la Fase 3 (Recursos: herramientas de SinAdicciones + blog embebido dentro de la app). La preparo cuando termines estos.
