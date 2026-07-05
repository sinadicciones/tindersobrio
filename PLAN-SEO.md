# Plan SEO — plansobrio.com

**Estrategia en dos tiempos, decidida así a propósito:**

- **AHORA — SEO mínimo del home**: el home es la app en sí (registro/login), no una página de contenido. No se le mete texto SEO ni secciones extra. Solo: identidad correcta (título, descripción, favicon) y **que se comparta impecable** en WhatsApp/Instagram/redes.
- **MÁS ADELANTE — el posicionamiento de verdad**: un microsite promocional (landing de contenido + contacto + blog) será quien pelee las keywords. El home de la app nunca será la pieza SEO principal, y está bien que así sea.

---

## BLOQUE para Emergent — SEO mínimo del home (solo lo básico, sin agregar contenido visible)

```
Optimiza la identidad y compartibilidad de plansobrio.com SIN agregar contenido visible al home (el home es la app, no una página promocional). Solo metadatos, favicon e infraestructura:

1. METADATOS en frontend/public/index.html (estáticos, quedan en el HTML crudo — suficiente para el home):
   - <html lang="es-CL">
   - <title>PlanSobrio — Conoce gente que vive sin alcohol ni drogas</title>
   - meta description: "Amistad, apoyo, grupos y amor — con el plan incluido. La comunidad chilena para vivir tu nueva etapa sin alcohol ni drogas. Beta gratis."
   - theme-color #0B0C10.
   - Eliminar TODO rastro de Emergent: title actual, meta description "A product of emergent.sh", favicons y manifest de Emergent.

2. COMPARTIBILIDAD (lo más importante de este bloque):
   - og:title (el mismo title), og:description (la misma description), og:url https://plansobrio.com, og:type website, og:locale es_CL, og:site_name PlanSobrio.
   - og:image: genera una imagen estática 1200x630 en /public/og.png: fondo #0B0C10 con glow sutil del gradiente coral-violeta, "PlanSobrio" grande en blanco, la bajada "Conoce gente que vive sin alcohol ni drogas" y un badge "Beta gratis · Chile" en menta. Referenciarla con URL absoluta https://plansobrio.com/og.png + og:image:width/height.
   - Twitter Card: summary_large_image con los mismos textos e imagen.

3. FAVICON propio: ícono del brote (sprout) en gradiente coral (#FF6B5E) a violeta (#8B5CF6) sobre fondo #0B0C10. Generar favicon.ico, PNG 192 y 512, apple-touch-icon 180 y site.webmanifest (name/short_name "PlanSobrio", theme_color #0B0C10, background_color #0B0C10).

4. RASTREO básico:
   - /robots.txt: Allow /; Disallow /app, /admin, /onboarding, /api. Línea Sitemap: https://plansobrio.com/sitemap.xml.
   - /sitemap.xml mínimo servido por el backend con /, /terminos y /privacidad (preparado para sumar rutas después).
   - Meta robots noindex en las vistas privadas (/app/*, /admin, /onboarding).

5. JSON-LD mínimo en index.html (invisible, no agrega contenido): un solo script tipo Organization {name: PlanSobrio, url: https://plansobrio.com, logo, sameAs: [https://sinadicciones.org]}.

6. VERIFICACIÓN: curl -s https://plansobrio.com debe mostrar en el HTML crudo el title, la description y los og: correctos; /robots.txt y /sitemap.xml responden; y pega la URL en un chat de WhatsApp de prueba: debe verse la imagen, el título y la descripción nuevos. Nada del layout visible del home debe haber cambiado.
```

## Pasos manuales tuyos (10 minutos, una vez)

- [ ] **Google Search Console**: agregar plansobrio.com (verificación DNS) y enviar el sitemap. Aunque el home no compita por keywords, esto te da el radar: qué búsquedas te encuentran, errores de indexación, y estará listo para el microsite.
- [ ] **Backlink desde sinadicciones.org** (menú o footer + un artículo de anuncio): el dominio empieza a acumular autoridad desde ya, que el microsite heredará.
- [ ] Probar compartir https://plansobrio.com en WhatsApp e Instagram: imagen + título correctos.
- [ ] En una semana, googlear "PlanSobrio": debe salir con favicon y descripción nuevos.

---

## MÁS ADELANTE — Microsite promocional + blog (cuando la beta respire)

Esto queda documentado para su momento; **no pedirlo a Emergent todavía**:

1. **Microsite** (puede ser subruta /conoce o subdominio, a decidir): la landing promocional que ya está diseñada en `mockups/landing.html` (problema → cómo funciona → características → origen SinAdicciones → CTA), más página de contacto. Servida con HTML real por ruta (SSR/prerender) para competir por keywords.
2. **Blog administrable** en /blog: posts con HTML real, JSON-LD Article, sitemap automático, RSS y CTA de registro al pie. El bloque técnico detallado quedó listo en la versión anterior de este plan (historial de git) y se retoma cuando toque.
3. **Calendario editorial de 12 artículos** con keywords chilenas (guardado para ese momento):
   1. 20 panoramas sin alcohol en Santiago ← la joya: alta búsqueda, baja competencia
   2. Cómo hacer amigos sin carrete después de los 30
   3. Citas sin alcohol: 15 ideas para una primera cita sobria
   4. ¿Dejé de tomar y mis amigos no? Guía para sobrevivir socialmente
   5. Qué decir cuando te ofrecen un trago
   6. Apps para conocer gente sobria: comparativa honesta
   7. Primeros 90 días sin alcohol: qué esperar de tu vida social
   8. Café Sobrio: qué es y por qué está creciendo en Chile
   9. Amor en sobriedad
   10. 10 grupos y comunidades sobrias en Chile
   11. Deporte y sobriedad
   12. Historias reales de la comunidad (con consentimiento)
   - Reglas: autor real con experiencia vivida (E-E-A-T — Google trata salud con vara especial), 1 artículo bueno por semana, derivación a SinAdicciones.org en temas sensibles, interlinking entre artículos y CTA a la app.

**Expectativa realista**: el home compartible + backlink de sinadicciones.org te cubren los próximos 1-2 meses. El posicionamiento por keywords ("citas sin alcohol", "panoramas sin alcohol santiago") lo ganará el microsite/blog entre los meses 2 y 6. Tu canal de corto plazo sigue siendo la comunidad SinAdicciones y el reto de 21 días.
