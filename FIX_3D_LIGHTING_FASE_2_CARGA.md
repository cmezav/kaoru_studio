# Hotfix - 3D Lighting Studio Fase 2

Problema:
El HTML de Fase 2 podia cargar correctamente mientras el navegador
reutilizaba state.js o scene3d.js de Fase 1 desde cache.

Eso provocaba que main.js no llegara a ejecutarse porque la version antigua
de scene3d.js no exportaba create3dScene.

Sintoma:
- "Comprobando WebGL..." permanente
- "Cargando motor 3D..." permanente
- tarjetas de modelos vacias

Solucion:
- versionar state.js, modelRegistry.js y scene3d.js desde main.js
- subir main.js a v2.1
- forzar nueva URL del iframe con fix=1
- subir cache del launcher
- agregar watchdog de inicio para evitar estados de carga infinitos

Este hotfix no cambia la arquitectura ni las funciones de la Fase 2.