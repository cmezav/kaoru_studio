# Kaoru's Studio — Fase 12 / UI 2.0

Esta versión migra la **capa de aplicación** a React + TypeScript sin reescribir de golpe los motores gráficos ya implementados.

## Qué cambia

- Nuevo título y shell general: **Kaoru's Studio**.
- Navegación lateral unificada para:
  - Silueta Studio
  - Text Studio
  - Image Studio
  - Galería
- Tema claro/oscuro global compartido.
- Atajos globales Alt+1, Alt+2, Alt+3 y Alt+4.
- Los Studios dejan de mostrar barras superiores duplicadas cuando se ejecutan dentro de Kaoru's Studio.
- Capa visual común con paneles, radios, sombras, espaciado y superficies consistentes.
- `logo.png` se usa como branding global cuando está presente en la raíz del proyecto.

## Importante sobre logo.png

El ZIP de Fase 11 que se utilizó como base referenciaba `logo.png`, pero el archivo no venía incluido. Por eso Kaoru's Studio está preparado para usarlo automáticamente sin inventar un reemplazo.

Coloca tu archivo real aquí:

```text
kaoru-studio/
├── logo.png   <-- aquí
├── index.html
├── app/
├── legacy/
└── vendor/
```

Si falta, el shell muestra temporalmente una `K` como fallback. En cuanto `logo.png` exista, se usa en el shell, favicon y barras de los Studios.

## Cómo abrir

### Opción recomendada en Windows

Ejecuta:

`INICIAR_KAORU_STUDIO.bat`

Esto levanta un servidor local para que IndexedDB, fuentes, blobs y proyectos se comporten de forma consistente.

### Opción simple

También puedes abrir `index.html` directamente. Para trabajo habitual se recomienda el servidor local.

## Arquitectura

```text
Kaoru's Studio
├── index.html                 Shell general
├── app/
│   ├── src/app.tsx            Fuente React + TypeScript
│   ├── dist/app.js            Build listo para usar
│   └── dist/app.css           Diseño global
├── vendor/
│   ├── react.production.min.js
│   └── react-dom.production.min.js
└── legacy/
    ├── index.html             Motor Silueta existente
    ├── text-studio/           Motor de Texto existente
    ├── image-studio/          Motor de Imagen existente
    ├── gallery/               Galería existente
    └── shared/
        ├── studioBridge.js
        ├── studioGallery.js
        └── kaoruLegacy.css    Reskin no destructivo
```

## Estrategia de migración

Los motores existentes se mantienen intactos en lo funcional y se encapsulan dentro del nuevo shell. Esto evita perder:

- proyectos y plantillas;
- IndexedDB;
- importación de fuentes y ZIP;
- capas e historial;
- curvas/deformaciones;
- filtros y ajustes;
- exportaciones;
- nombres SIL-/TXT-/IMG-;
- recuperación de Image Studio;
- galerías existentes.

A partir de aquí cada Studio puede migrarse internamente a componentes React de forma progresiva sin tener que volver a diseñar toda la aplicación.

## Nota de runtime React

Para que este ZIP sea autocontenido y no dependa de una CDN, incluye un runtime React disponible localmente en el entorno de construcción. La UI del shell está escrita en TypeScript y el JavaScript compilado ya está incluido; no necesitas instalar nada para usar la versión entregada.


## Fase 14 — Image Studio Standalone

Image Studio ahora se abre como una aplicación independiente en `image-studio-standalone/` para evitar los problemas que aparecían al incrustarlo dentro del shell.
