# SEO de Crisve Travel V2

Esta versión es para el repositorio `prueba`. `index.html` contiene `noindex, nofollow` **intencionadamente** para evitar que la V2 de pruebas compita con la web oficial en Google.

## Antes de publicar en el repositorio oficial
1. Retirar `<meta name="robots" content="noindex, nofollow">` SOLO de `index.html` (no de los paneles admin).
2. Añadir `<link rel="canonical" href="https://aiscreative.github.io/crisve-travel/">` al `<head>`.
3. Publicar `sitemap.xml` con la URL definitiva y `robots.txt` enlazando el sitemap. No publicar un sitemap que apunte a la web de pruebas.
4. Verificar la propiedad de Google Search Console y solicitar indexación.
5. Para posicionar cada viaje de forma individual, crear URLs públicas propias y páginas HTML prerenderizadas/estáticas para cada ficha: los modales JavaScript no son equivalentes a páginas de destino indexables.
6. Actualizar descripciones e imágenes reales, y comprobar rendimiento con PageSpeed Insights.
7. Confirmar que la imagen Open Graph, descripción y datos de contacto coinciden con los reales antes del lanzamiento.

## Qué se ha aplicado
Título y meta description descriptivos, un único H1 principal, metadatos Open Graph, datos estructurados `TravelAgency` limitados a datos confirmados, y `noindex` en el entorno de pruebas y administradores. El SEO no garantiza una posición en Google.
