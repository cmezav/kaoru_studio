# Fix visual - limpiar GLB de cabeza por planos

Problema:
El modelo GLB cargaba correctamente, pero aparecia cubierto por miles de
lineas y marcas.

Causa:
El Studio generaba Three.EdgesGeometry sobre cada mesh del GLB.
El modelo es una escultura de alta densidad y esas lineas representaban
triangulacion interna, no divisiones artisticas de planos.

Solucion:
- no generar EdgesGeometry para el GLB importado
- mostrar el modelo solo con su geometria y la iluminacion
- aristas desactivadas por defecto
- control de aristas deshabilitado mientras se usa el GLB
- el fallback generado por codigo conserva su sistema de aristas
- cache actualizada a v3.3

Resultado esperado:
la cabeza debe verse limpia, sin rayas, y sus planos deben leerse mediante
luz y sombra.