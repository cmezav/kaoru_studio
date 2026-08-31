# Fix - ruta del GLB en 3D Lighting Studio Fase 3

Sintoma:
El panel mostraba "Fallback generado por codigo" aunque el GLB estaba
incluido correctamente en GitHub.

Causa:
GLTFLoader recibia una ruta relativa:
../assets/models/head_planes_reference.glb

La URL era resuelta desde el documento y podia apuntar fuera de
legacy/3d-lighting/.

Solucion:
La ruta ahora se construye desde scene3d.js:

new URL('../assets/models/head_planes_reference.glb?v=3.2', import.meta.url).href

Esto produce la ruta correcta tanto en desarrollo como en GitHub Pages.

Tambien:
- se fuerza cache v3.2
- se muestra el error real si vuelve a entrar el fallback
- se registran los metadatos CC BY 4.0 incluidos en el GLB