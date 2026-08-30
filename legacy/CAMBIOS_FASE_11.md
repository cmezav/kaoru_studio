# Fase 11 — Galería y tema global

## Implementado

- Galería independiente en `gallery/index.html`.
- Base de datos común IndexedDB (`shared/studioGallery.js`) para Silueta Studio, Text Studio e Image Studio.
- Diseños y plantillas diferenciados.
- Miniaturas.
- Abrir / usar plantilla.
- Duplicar.
- Renombrar.
- Eliminar.
- Exportar proyectos portables JSON desde la Galería.
- Importar proyectos portables JSON desde la Galería.
- Filtros por Studio, tipo y búsqueda por nombre.
- Atajo `Alt+4` para abrir la Galería, además de `Alt+1`, `Alt+2`, `Alt+3` para los tres Studios.
- Tema claro/oscuro compartido por los tres Studios y la Galería mediante `siluetaStudioTheme`.

## Silueta Studio

- Nuevo botón **Guardar diseño** para proyectos editables completos.
- Las capas base y las imágenes de relleno se serializan junto con sus transformaciones y efectos.
- El botón preexistente **Guardar plantilla** sigue alimentando la galería clásica de plantillas de silueta y ahora además guarda una plantilla completa en la Galería general.
- Los proyectos/plantillas abiertos desde la Galería reconstruyen imágenes, capas, degradado, bordes, sombra, glow y transformaciones.

## Text Studio

- El sistema de guardado de Fase 8 ahora utiliza la Galería unificada.
- Migración automática de proyectos/plantillas guardados en la base anterior.
- Los proyectos nuevos almacenan también las fuentes importadas utilizadas (cuando existe su buffer), para que el proyecto portable sea autocontenido.
- Apertura de diseños y plantillas desde la Galería general.

## Image Studio

- Botones **Guardar diseño** y **Plantilla**.
- Guarda la imagen fuente como Blob en IndexedDB junto con todos los ajustes no destructivos.
- Al abrir desde la Galería reconstruye la imagen fuente, filtros, transformaciones, recorte, Lens Blur, Grano y opciones de exportación.
- El tema claro/oscuro queda conectado a la misma preferencia de los otros Studios.

## Nota sobre el fallo de Grano / Lens Blur

Esta fase no intenta volver a modificar el motor del problema de salto de vista de Fase 10.4. Se mantiene la implementación existente para poder avanzar la Galería sin introducir otra ronda de cambios en esos filtros.
