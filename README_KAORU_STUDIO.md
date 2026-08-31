# Kaoru's Studio

Kaoru's Studio es una suite creativa de escritorio para trabajar con siluetas, tipografía, imágenes, color, iluminación, escenas 3D y composiciones multicapa.

## Studios

- **Silueta Studio** — edición y composición de siluetas PNG.
- **Text Studio** — tipografía, deformación, rellenos y efectos.
- **Image Studio** — ajustes, filtros y exportación de imágenes.
- **Light Lab** — creación de paletas, pieles, luces, sombras y materiales.
- **3D Lighting Studio** — modelos, anatomía y estudio de iluminación 3D.
- **Image Combiner Studio** — lienzos, capas, recorte, máscaras, grupos y composición.
- **Galería** — proyectos, plantillas y reapertura de trabajos editables.

## Navegación

- `Alt+1` — Silueta Studio
- `Alt+2` — Text Studio
- `Alt+3` — Image Studio
- `Alt+4` — Light Lab
- `Alt+5` — 3D Lighting Studio
- `Alt+6` — Image Combiner Studio
- `Alt+7` — Galería

## Controles precisos

Los deslizadores incluyen una entrada numérica sincronizada para escribir valores exactos sin depender únicamente del control visual.

## Ejecutar en Windows

La forma recomendada es ejecutar:

`INICIAR_KAORU_STUDIO.bat`

También puede abrirse `index.html`, aunque el servidor local ofrece un comportamiento más consistente para almacenamiento, fuentes, blobs y proyectos.

## Estructura

```text
kaoru-studio/
├── index.html
├── logo.png
├── app/
├── legacy/
│   ├── text-studio/
│   ├── image-studio/
│   ├── light-lab/
│   ├── 3d-lighting/
│   ├── image-combiner/
│   ├── gallery/
│   └── shared/
└── vendor/
```

## Proyectos

Los Studios que admiten proyectos editables pueden guardarlos en la Galería y reabrirlos posteriormente. Las exportaciones de imagen siguen disponibles de forma independiente.

## Recursos de terceros

Las licencias y atribuciones necesarias para modelos y recursos de terceros se mantienen en los documentos correspondientes del repositorio.