# Kaoru's Studio â€” Fase 12 / UI 2.0

## Light Lab — Fase 4 de 8

Se agregó el nuevo Studio **Light Lab** con arquitectura independiente y un motor de generación detallada de color.

La Fase 4 añade un sistema de iluminación con hasta ocho luces directas simultáneas. Cada luz tiene color HEX, intensidad, dirección, elevación, suavidad, activación, duplicado y eliminación independientes. Ambiente, sombra, rebote y rim light también aceptan cualquier HEX e intensidad. La paleta original puede compararse con los 16 colores resultantes y cualquier muestra extraída puede alimentar el color base o los componentes de iluminación. La navegación continúa en `Alt+4` y Galería usa `Alt+5`.

### Publicación en GitHub Pages

Light Lab se publica junto con el resto de Kaoru’s Studio al subir estos archivos a la rama configurada en GitHub Pages. Se abre desde la barra lateral, con `Alt+4` o mediante `#light` en la URL publicada.

---

Esta versiÃ³n migra la **capa de aplicaciÃ³n** a React + TypeScript sin reescribir de golpe los motores grÃ¡ficos ya implementados.

## QuÃ© cambia

- Nuevo tÃ­tulo y shell general: **Kaoru's Studio**.
- NavegaciÃ³n lateral unificada para:
  - Silueta Studio
  - Text Studio
  - Image Studio
  - GalerÃ­a
- Tema claro/oscuro global compartido.
- Atajos globales Alt+1, Alt+2, Alt+3 y Alt+4.
- Los Studios dejan de mostrar barras superiores duplicadas cuando se ejecutan dentro de Kaoru's Studio.
- Capa visual comÃºn con paneles, radios, sombras, espaciado y superficies consistentes.
- `logo.png` se usa como branding global cuando estÃ¡ presente en la raÃ­z del proyecto.

## Importante sobre logo.png

El ZIP de Fase 11 que se utilizÃ³ como base referenciaba `logo.png`, pero el archivo no venÃ­a incluido. Por eso Kaoru's Studio estÃ¡ preparado para usarlo automÃ¡ticamente sin inventar un reemplazo.

Coloca tu archivo real aquÃ­:

```text
kaoru-studio/
â”œâ”€â”€ logo.png   <-- aquÃ­
â”œâ”€â”€ index.html
â”œâ”€â”€ app/
â”œâ”€â”€ legacy/
â””â”€â”€ vendor/
```

Si falta, el shell muestra temporalmente una `K` como fallback. En cuanto `logo.png` exista, se usa en el shell, favicon y barras de los Studios.

## CÃ³mo abrir

### OpciÃ³n recomendada en Windows

Ejecuta:

`INICIAR_KAORU_STUDIO.bat`

Esto levanta un servidor local para que IndexedDB, fuentes, blobs y proyectos se comporten de forma consistente.

### OpciÃ³n simple

TambiÃ©n puedes abrir `index.html` directamente. Para trabajo habitual se recomienda el servidor local.

## Arquitectura

```text
Kaoru's Studio
â”œâ”€â”€ index.html                 Shell general
â”œâ”€â”€ app/
â”‚   â”œâ”€â”€ src/app.tsx            Fuente React + TypeScript
â”‚   â”œâ”€â”€ dist/app.js            Build listo para usar
â”‚   â””â”€â”€ dist/app.css           DiseÃ±o global
â”œâ”€â”€ vendor/
â”‚   â”œâ”€â”€ react.production.min.js
â”‚   â””â”€â”€ react-dom.production.min.js
â””â”€â”€ legacy/
    â”œâ”€â”€ index.html             Motor Silueta existente
    â”œâ”€â”€ text-studio/           Motor de Texto existente
    â”œâ”€â”€ image-studio/          Motor de Imagen existente
    â”œâ”€â”€ gallery/               GalerÃ­a existente
    â””â”€â”€ shared/
        â”œâ”€â”€ studioBridge.js
        â”œâ”€â”€ studioGallery.js
        â””â”€â”€ kaoruLegacy.css    Reskin no destructivo
```

## Estrategia de migraciÃ³n

Los motores existentes se mantienen intactos en lo funcional y se encapsulan dentro del nuevo shell. Esto evita perder:

- proyectos y plantillas;
- IndexedDB;
- importaciÃ³n de fuentes y ZIP;
- capas e historial;
- curvas/deformaciones;
- filtros y ajustes;
- exportaciones;
- nombres SIL-/TXT-/IMG-;
- recuperaciÃ³n de Image Studio;
- galerÃ­as existentes.

A partir de aquÃ­ cada Studio puede migrarse internamente a componentes React de forma progresiva sin tener que volver a diseÃ±ar toda la aplicaciÃ³n.

## Nota de runtime React

Para que este ZIP sea autocontenido y no dependa de una CDN, incluye un runtime React disponible localmente en el entorno de construcciÃ³n. La UI del shell estÃ¡ escrita en TypeScript y el JavaScript compilado ya estÃ¡ incluido; no necesitas instalar nada para usar la versiÃ³n entregada.


## Fase 14 â€” Image Studio Standalone
