# Image Combiner Studio - Fase 5 de 6

## Proyectos
- Nombre editable.
- Guardar proyecto en Galería.
- Actualizar el mismo proyecto al volver a guardar.
- Guardar como plantilla.
- Crear composición nueva.
- Miniatura automática para Galería.

## Galería
- StudioGallery reconoce studio = combiner.
- Nuevo filtro Combiner.
- Tarjetas con badge Combiner.
- Abrir proyecto editable desde Galería.
- Duplicar / renombrar / eliminar funciona con proyectos Combiner.
- Exportar desde Galería usa extensión .cmb.json.
- Importar .cmb.json desde Galería.

## Proyecto portable
- Schema: kaoru.image-combiner.project
- Extensión: .cmb.json
- Conserva:
  lienzo,
  fondo,
  capas,
  imágenes embebidas,
  transformaciones,
  crop numérico,
  recorte visual aplicado,
  bordes,
  sombra,
  resplandor,
  filtros,
  visibilidad,
  bloqueo y orden.

## Exportación avanzada
- PNG.
- JPG.
- WEBP.
- Escala 0.5x, 1x, 2x, 3x y 4x.
- Calidad configurable para JPG / WEBP.
- JPG aplana transparencia sobre blanco.
- PNG / WEBP preservan transparencia cuando corresponde.
- Nombre CMB-<proyecto>-<ancho>x<alto>.

## Compatibilidad
- Mantiene todas las herramientas F1-F4.
- El recorte visual clásico continúa siendo no destructivo.
- El crop numérico continúa disponible.