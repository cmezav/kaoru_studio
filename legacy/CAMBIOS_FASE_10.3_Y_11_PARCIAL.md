# Cambios — Fase 10.3 + adelanto puntual de Fase 11

## Image Studio — estabilidad y recuperación

- Se desactiva el `scroll anchoring` en los contenedores críticos para evitar que Chromium reubique la vista al terminar renders pesados.
- Antes de cada render se conserva la posición del panel lateral, del viewport del canvas y del documento; después del render se restaura.
- El canvas ya no reasigna `width`/`height` si las dimensiones no cambiaron, evitando relayouts innecesarios.
- Se añade recuperación automática local mediante IndexedDB:
  - imagen original;
  - filtros y ajustes;
  - grano;
  - Lens Blur;
  - transformaciones y recorte;
  - zoom, foco y posición de scroll;
  - opciones de exportación.
- Tras una recarga o una nueva entrada a Image Studio con una sesión pendiente, aparece la elección:
  - **Recuperar progreso**;
  - **Crear proyecto nuevo**.
- Se añade **Recarga segura**, que guarda el estado antes de recargar.

## Fase 11 — solo lo solicitado

No se implementó la galería de Fase 11. Únicamente se adelantó:

- tema claro/oscuro global compartido por los 3 Studios;
- el botón flotante de tema en Text Studio e Image Studio, siguiendo el comportamiento de Silueta Studio;
- sincronización de preferencia entre pestañas mediante `localStorage` + evento `storage`;
- navegación visible entre Silueta / Texto / Imagen;
- atajos globales:
  - `Alt + 1` → Silueta Studio;
  - `Alt + 2` → Text Studio;
  - `Alt + 3` → Image Studio.

## Archivos nuevos

- `shared/studioBridge.js`
- `shared/studioBridge.css`
- `image-studio/js/recoverySystem.js`
- `image-studio/stability.css`

## Archivos modificados

- `index.html` — solamente conexión global de tema/navegación.
- `text-studio/index.html` — solamente conexión global de tema/navegación.
- `image-studio/index.html` — estabilidad/recuperación + conexión global.
- `image-studio/js/main.js` — estabilidad del render y recuperación.
