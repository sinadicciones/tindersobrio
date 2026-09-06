# Datos de países y líneas de ayuda — para Emergent (expansión multi-país)

Respuestas a las preguntas de Emergent sobre la Fase 1. Extraído del repo real de SinAdicciones (`apps/web/lib/countries.ts`).

## Helplines VERIFICADAS (5 países) — usar tal cual

| País | Código | Líneas de ayuda (name · phone) |
|---|---|---|
| Chile | CL | SENDA `1412` · Salud Responde `600 360 7777` · SAMU `131` |
| Argentina | AR | SEDRONAR (Línea 141) `141` · Salud Mental Responde `0800 999 0091` |
| Colombia | CO | Línea 192 (Salud) `192` · Línea 106 (Salud Mental) `106` |
| México | MX | Línea de la Vida `800 911 2000` · SAPTEL `55 5259 8121` |
| Perú | PE | Línea 100 `100` · DEVIDA `0800 10 233` |

## Países SIN helplines verificadas (16) — sembrar código+nombre+bandera, helplines `por_verificar:true`

Bolivia BO 🇧🇴 · Costa Rica CR 🇨🇷 · Cuba CU 🇨🇺 · Ecuador EC 🇪🇨 · El Salvador SV 🇸🇻 · España ES 🇪🇸 · Estados Unidos US 🇺🇸 · Guatemala GT 🇬🇹 · Guinea Ecuatorial GQ 🇬🇶 · Honduras HN 🇭🇳 · Nicaragua NI 🇳🇮 · Panamá PA 🇵🇦 · Paraguay PY 🇵🇾 · Puerto Rico PR 🇵🇷 · República Dominicana DO 🇩🇴 · Uruguay UY 🇺🇾 · Venezuela VE 🇻🇪

**Regla de seguridad para estos 16:** mientras un país no tenga líneas verificadas, "Necesito apoyo" NO muestra un número dudoso. Muestra: *"Estamos verificando las líneas de ayuda de tu país. Si es una emergencia, marca el número de emergencias local. Aquí tienes orientación profesional:"* + link a SinAdicciones.org. Un número equivocado es peor que ninguno.

## Respuestas a las 4 preguntas de Emergent

1. **Helplines**: usar los 5 verificados de arriba tal cual; generar propuesta para los 16 restantes marcada `por_verificar:true`, con el fallback seguro de arriba en la interfaz hasta que Nelson/el equipo los confirme.
2. **Orden**: (a) Bloque 1 completo + testing → mostrar → aprobar → recién ahí Bloque 2.
3. **Zona horaria de reuniones recurrentes**: (b) quien crea la reunión elige la TZ de una lista; la app la convierte a la hora local de cada usuario. America/Santiago solo como default sugerido.
4. **Reuniones seed**: globales (visibles a los 21) pero solo 2-3, con la hora en horario local de cada usuario y una nota de que son en español, abiertas a toda Latinoamérica.

## Al abrir cada país nuevo (checklist de verificación de helpline)
Antes de promocionar un país, confirmar que su línea de ayuda esté vigente (buscar la agencia nacional oficial de drogas/salud mental) y quitarle el flag `por_verificar`.
