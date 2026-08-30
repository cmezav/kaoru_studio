# Fase 10.4 — Estabilidad de Image Studio

Esta corrección modifica únicamente Image Studio. Silueta Studio y Text Studio se mantienen sin cambios.

## Qué se corrigió

- El autosave ya no toma como válida una posición de scroll que haya sido causada por el salto del navegador.
- Se conserva la última posición estable del panel de controles y del viewport del lienzo.
- Durante los renders de Grano y Lens Blur se activa un guard de vista que restaura la posición si Chromium intenta reanclar el panel.
- El guard continúa durante el repintado posterior al cálculo, no solo durante la ejecución JavaScript.
- La recuperación identifica la última sección usada. Las sesiones antiguas de la 10.3 sin ese dato infieren Grano/Lens Blur a partir del estado del proyecto.
- Se eliminó `contain: strict` del canvas y se reemplazó por contención de pintura, evitando size-containment sobre el canvas.
- Se desactiva scroll anchoring en toda la interfaz interna de Image Studio.
- Los filtros pesados usan una resolución interna reducida únicamente para la previsualización (máximo 640 px en el lado mayor), manteniendo estable la caja visible de hasta 900 px.
- La exportación NO usa esa reducción: continúa renderizándose desde la imagen fuente a la resolución seleccionada.
- El render ya no reescribe el tamaño CSS del canvas cuando el valor no cambió.

## Recuperación

El formato de sesión pasa a versión 2 pero sigue leyendo las sesiones anteriores almacenadas en la misma base IndexedDB.
