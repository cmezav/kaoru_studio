# Light Lab — Fase 3 completada

## Referencias de imagen

- Subida de PNG, JPG, WEBP y GIF.
- Pegado con botón o `Ctrl+V`.
- Arrastre de archivos directamente al visor.
- Validación de tipo y límite de 25 MB.
- Render limitado de forma segura a 1800 px para mantener fluidez.

## Cuentagotas

- Captura del píxel exacto desde el canvas.
- Marcador visual sobre el punto seleccionado.
- Soporte para píxeles transparentes.
- Muestras deduplicadas y hasta 60 colores por referencia.
- Clic en cada muestra para copiar su HEX.

## Roles y reutilización

- Roles: muestra, principal/base, luz, sombra, ambiente y rebote.
- Eliminación individual o limpieza completa.
- Acción “Usar como base” que regenera los 16 colores de la paleta.
- Historial de 24 colores recientes.
- Colores recientes reutilizables y copiables.
- Registro de HEX manuales, descripciones y ediciones de swatches.

## Proyecto portable

El `.lls.json` de versión 3 conserva metadatos de la imagen, una miniatura, las muestras extraídas, sus roles y los colores recientes.
