# Hotfix de sombreado - 3D Lighting Studio Fase 5

Problema:
En la cabeza realista aparecia una mancha rara entre el ojo y la nariz
que no se notaba antes de la Fase 5.

Causas corregidas:
- VSMShadowMap generaba artefactos visibles en zonas pequenas del rostro.
- Las luces directas tenian bias muy agresivo para esa anatomia.
- La base humana necesitaba recalculo y normalizacion de normales para
  suavizar el sombreado.

Cambios:
- VSMShadowMap -> PCFSoftShadowMap
- bias y normalBias ajustados en luces directas
- radius de sombra suave
- computeVertexNormals + normalizeNormals en la base humana
- cache bump para forzar recarga limpia

Resultado esperado:
menos artefactos en ojo, lagrimal, puente nasal y mejilla interna,
con una lectura mas limpia del volumen.