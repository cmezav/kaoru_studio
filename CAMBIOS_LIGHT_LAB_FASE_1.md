# Light Lab — Fase 1 completada

## Incluido

- Nuevo módulo independiente `legacy/light-lab/`.
- Integración en el shell de Kaoru’s Studio.
- Icono, botón lateral y acceso por `Alt+4`.
- Galería actualizada a `Alt+5`.
- Tema claro/oscuro global sin almacenamiento duplicado.
- Interfaz de escritorio con scroll interno por panel.
- Cuatro categorías y tres presets de referencia por categoría.
- Doce swatches de referencia por preset.
- Preview 2D básica: esfera, banda curva y plano.
- Estado inicial versionado y API `window.LightLab` de diagnóstico.
- Estructura de exportación `.lls.json` con esquema `kaoru.light-lab.project`.
- Archivos reservados para cada motor de fases posteriores.

## Publicar y abrir

Los cambios se integran en el repositorio y se publican mediante GitHub Pages. Después del `push`, abre Kaoru’s Studio desde su URL publicada y entra a Light Lab desde el botón lateral o con `Alt+4`.

## Límites intencionales de esta fase

Todavía no se habilitan el input HEX, la generación algorítmica, el cuentagotas, la iluminación avanzada, el guardado en Galería, el historial ni el 3D. Esas funciones corresponden a las fases 2 a 8 del mega prompt.
