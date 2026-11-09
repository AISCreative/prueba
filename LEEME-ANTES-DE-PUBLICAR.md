# Crisve Travel V2 — Renovación visual sin cambiar la marca

Se mantiene el logo y la paleta original (blanco, naranja y texto oscuro), las imágenes y los viajes existentes.

Mejoras: portada con carrusel grande, bloques más limpios, menú sin duplicados, categorías desplazables, tarjetas modernas en dos columnas en móvil, viajes antes que «Quién soy», ofertas, itinerarios y panel de edición.

## Prueba
Sube todos los archivos de la carpeta a la raíz del repositorio de pruebas. `index.html` es la web; `admin.html` es el editor de viajes, ofertas y portada; `resenas-admin.html` conserva el administrador de reseñas.

Antes de activar edición real en Firebase, validar el appId de `firebase-config.js`, el UID autorizado, las reglas de Firestore y Storage. El modo demo guarda en este mismo navegador, no modifica Firebase y no sincroniza con otros dispositivos. La web oficial y sus reseñas no se alteran por generar este paquete.
