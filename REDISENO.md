# Rediseño "Blanco Editorial" — instrucción para Emergent

Rediseño visual coherente de TODA la app sobre la línea actual (oscuro + gradiente coral‑violeta), según la Variante 1 elegida.

**Referencia visual**: `mockups/rediseno-v1.html` (abrir en navegador — muestra Descubrir, Grupos, Chats y Perfil ya aplicados). Entregar ese archivo a Emergent junto con los bloques.

**Cómo usar**: pegar en Emergent de a un bloque por mensaje: Bloque 1 (sistema + Descubrir), probar, luego Bloque 2 (resto de pantallas).

---

## BLOQUE 1 — Sistema de diseño + Descubrir

```
Rediseña la interfaz según el sistema "Blanco Editorial". Tienes la referencia visual en el archivo mockups/rediseno-v1.html del repositorio (ábrelo y replica su factura). Este bloque define el sistema y lo aplica a Descubrir; el resto de pantallas viene en el bloque siguiente.

1. TOKENS DE COLOR (definir como variables CSS globales y usar SOLO estas):
   - Fondo app: #0B0C10 (con los glows radiales sutiles coral/violeta actuales en esquinas)
   - Superficie secundaria: #14161C
   - Tarjeta: #1D212B
   - Borde estándar: rgba(255,255,255,.16) — nota: es MÁS marcado que el actual
   - Borde suave (divisores): rgba(255,255,255,.09)
   - Texto principal: #FFFFFF (blanco puro, no blanco violáceo)
   - Texto secundario: #C7CBD6
   - Texto terciario/placeholder: #8E93A3
   - Acentos (solo para lo indicado): gradiente coral #FF6B5E → violeta #8B5CF6 EXCLUSIVAMENTE en: botón primario (Me tinca, Guardar, Continuar), pill/tab activo, indicador del tab activo del menú, riel de la tarjeta Sobre mí, avatares sin foto y pantalla de match. Verde menta #4ADE80 SOLO para: insignia de tiempo sin consumo, estado "Miembro"/"Voy"/"confirmado". Coral #FF6B5E suelto SOLO para: distancia en la ubicación, badge de notificaciones, y la fila "Necesito apoyo".
   - PROHIBIDO: introducir otros colores, y usar el gradiente como decoración de fondos o textos largos.

2. ICONOGRAFÍA — CERO EMOJIS EN LA INTERFAZ: reemplaza TODOS los emojis de interfaz por íconos de línea de lucide-react, tamaño coherente (20px menú, 13px chips/etiquetas), trazo 1.9px, color blanco (o currentColor). Mapa exacto:
   - Menú inferior: Descubrir=Compass · Grupos=Users · Mis planes=CalendarHeart · Chats=MessageCircle · Perfil=CircleUserRound
   - Modos: Apoyo=HeartHandshake · Amistad=Smile · Amor=Heart · Grupos=Users
   - Otros: ubicación=MapPin · tiempo sin consumo=Sprout (en menta) · Sobre mí=PencilLine · filtros=SlidersHorizontal · Necesito apoyo=LifeBuoy · editar=PencilLine · link externo=ExternalLink · evento=CalendarDays · online=Globe · unirse=Plus · enviar mensaje=Send · reportar=Flag · bloquear=Ban · cerrar sesión=LogOut · ajustes=Settings · volver=ArrowLeft · Les tincas=Sparkles
   - Actividades del catálogo: agregar campo icon a cada actividad con su ícono lucide (Coffee, Mountain, Trees, Landmark, Clapperboard, UtensilsCrossed, Dumbbell, Volleyball, Flower2, BookOpen, Palette, Dice5, Dog, Music, MountainSnow, IceCreamCone) y usarlo en la interfaz. El campo emoji se conserva en la base de datos pero deja de mostrarse en la UI.
   - EXCEPCIÓN: los emojis escritos por usuarios en mensajes, bio y frases se muestran tal cual (son contenido).

3. TIPOGRAFÍA Y ETIQUETAS:
   - Se mantiene la fuente actual. Jerarquía: títulos de pantalla 20px/900; nombres 24px/900; texto de tarjeta 14px/400 línea 1.45; metadatos 11-12px.
   - ETIQUETAS DE SECCIÓN (el sello del sistema): 10px, mayúsculas, letter-spacing .13em, peso 800, color BLANCO PURO, con su ícono de 12px a la izquierda y una regla fina (1px, rgba(255,255,255,.15)) que corre desde el texto hasta el borde derecho. Aplicar a: preguntas de perfil ("MI PLAN IDEAL SIN ALCOHOL…"), "SOBRE MÍ", y todo encabezado de sección dentro de tarjetas.

4. DESCUBRIR (aplicar ya con el sistema):
   - Pills de modo con su ícono (HeartHandshake/Smile/Heart) + texto; activa con el gradiente.
   - Tarjeta de foto: igual que ahora, pero el prompt en vidrio usa la nueva etiqueta blanca con regla, y los intereses van como chips con ícono de línea.
   - Tarjeta "Sobre mí": fondo #1D212B, borde .16, riel de gradiente a la izquierda, texto entre comillas.
   - Tarjetas de frases: fondo #1D212B, borde .16, ícono en chip cuadrado (40px, radio 13px, fondo rgba(255,255,255,.09), borde .2) con el ícono de línea blanco.
   - Botones: "Pasar" neutro con borde .16; "Me tinca" con gradiente + ícono Heart (eliminar el emoji ✨ del botón).
   - Menú inferior: íconos lucide; el activo en blanco con una barrita superior de 22px con el gradiente (ver mockup); badge de notificaciones = punto coral con borde del fondo.
   - Insignia de tiempo: ícono Sprout + texto, todo en menta (sin emoji 🌱).

5. ACCESIBILIDAD: contraste AA en todos los pares (los tokens ya lo cumplen), focus visible con outline coral en inputs y botones, y áreas táctiles mínimas de 44px.

Verifica en viewport 420x900 comparando lado a lado con mockups/rediseno-v1.html (pantalla 1). No debe quedar NINGÚN emoji en la interfaz de Descubrir.
```

---

## BLOQUE 2 — Resto de la app con el mismo sistema

```
Aplica el sistema "Blanco Editorial" (tokens, iconografía lucide y etiquetas definidos en el bloque anterior) a TODAS las demás pantallas, replicando mockups/rediseno-v1.html (pantallas 2, 3 y 4):

1. GRUPOS: tarjetas horizontales de una línea: chip de ícono 52px a la izquierda (traducir el emoji del grupo a ícono lucide: Coffee, Sprout, Footprints/Dumbbell, Clapperboard), nombre 14.5px/800, metadatos con mini-íconos (Users cantidad, MapPin comuna o Globe online). A la derecha: "Miembro" en menta si pertenece, o botón circular con Plus si no. Tabs Explorar/Mis grupos como segmented control con el activo en gradiente. Detalle de grupo, chat grupal y eventos con los mismos tokens (eventos con ícono CalendarDays, inscritos "Voy" en menta).

2. CHATS: tabs "Chats / Les tincas" (segmented control, contador en Les tincas). Filas de chat: avatar 46px (gradiente con inicial si no hay foto), alias 14px/800 blanco, último mensaje 12px en #C7CBD6 con elipsis, hora 10px, burbuja de no leídos con gradiente. Si el chat tiene plan, mostrar su estado en la fila con mini-ícono de la actividad. La barra de estado del plan dentro del chat: fondo rgba(139,92,246,.12), borde rgba(139,92,246,.4), ícono de la actividad + texto + flecha. Tarjetas de "Les tincas": avatar + alias + "Le tinca [ícono actividad] ir a X contigo" + botones [Armar plan] (gradiente) y [Pasar] (neutro). Burbujas del chat: propias con fondo del gradiente atenuado, ajenas #1D212B con borde suave; mensajes de sistema centrados en 12px #8E93A3.

3. MIS PLANES: cada plan como tarjeta con chip de ícono de la actividad, título, "con [alias]", fecha con CalendarDays, y estado en menta cuando está confirmado. Vacío: ícono CalendarHeart grande apagado + texto amable.

4. PERFIL: cabecera con avatar 64px, alias 20px/900, MapPin + comuna, insignia Sprout. Modos como chips blancos uniformes con ícono (sin color por modo). Tarjeta "Sobre mí" con riel. Menú como filas: chip de ícono + título 13.5px/800 + subtítulo 11px + flecha ChevronRight. "Necesito apoyo" es LA ÚNICA fila con acento coral (chip y borde) — jerarquía por importancia. Página Necesito apoyo: mismos tokens; los teléfonos mantienen sus colores de urgencia actuales pero con íconos Phone en vez de emojis.

5. TODO LO DEMÁS con el mismo sistema: onboarding (mismos tokens, barra de progreso con gradiente, selectores con borde .16), modal de plan y pantalla de match (el gradiente aquí SÍ puede lucirse), Editar perfil, LocationPicker, filtros, Waitlist, CuentaSuspendida, Términos/Privacidad, y estados vacíos (ícono lucide grande apagado + mensaje + acción, sin emojis gigantes). El panel /admin puede quedar funcional sin pulir, pero al menos con los tokens de fondo/tarjeta/borde para no desentonar.

6. BARRIDO FINAL DE EMOJIS: busca en todo el frontend cualquier emoji restante en JSX de interfaz (botones, títulos, etiquetas, toasts, estados vacíos) y reemplázalo por su ícono lucide o elimínalo. Los toasts usan íconos (CheckCircle2 éxito, AlertTriangle error). Excepción única: contenido escrito por usuarios.

Verifica pantalla por pantalla contra mockups/rediseno-v1.html en 420x900: Grupos (pantalla 2), Chats con Les tincas (pantalla 3), Perfil (pantalla 4). Corre los tests existentes — este cambio es solo visual, ninguna lógica debe cambiar.
```

---

## Resumen del sistema (para consulta rápida)

| Token | Valor |
|---|---|
| Fondo | `#0B0C10` |
| Tarjeta | `#1D212B` |
| Borde | `rgba(255,255,255,.16)` · suave `.09` |
| Texto | `#FFFFFF` / `#C7CBD6` / `#8E93A3` |
| Gradiente (solo acciones primarias, activo, riel bio, match) | `#FF6B5E → #8B5CF6` |
| Menta (solo estados positivos e insignia de tiempo) | `#4ADE80` |
| Coral suelto (solo distancia, badges, Necesito apoyo) | `#FF6B5E` |
| Íconos | lucide-react, línea 1.9px, blanco/currentColor |
| Etiquetas | 10px mayúscula, tracking .13em, blancas, regla fina a la derecha |
| Emojis | Solo en contenido de usuarios. Cero en interfaz |

## Checklist de verificación (tú, en el celular)

- [ ] No queda ningún emoji en menús, botones, etiquetas, toasts ni estados vacíos.
- [ ] Los íconos se ven idénticos en Android y iPhone (ya no dependen del sistema).
- [ ] El texto se lee sin esfuerzo: blanco puro sobre #1D212B, bordes visibles.
- [ ] El gradiente aparece SOLO en: Me tinca, tab/pill activo, riel de Sobre mí, avatares sin foto, match.
- [ ] "Necesito apoyo" es la única fila coral del Perfil.
- [ ] Insignia de tiempo (Sprout + menta) y estados "Miembro/Voy/confirmado" en menta.
- [ ] Grupos, Chats (con Les tincas), Mis planes y Perfil calzan con las pantallas 2–4 del mockup.
- [ ] Todo sigue funcionando igual (los tests pasan): el cambio fue solo visual.
