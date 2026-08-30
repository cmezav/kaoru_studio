# MEGA PROMPT — EDITOR TIPOGRÁFICO / TEXT EFFECTS STUDIO

Quiero agregar a mi aplicación actual un **apartado completamente independiente** dedicado a la creación y edición avanzada de texto, similar conceptualmente a una mezcla entre un editor tipográfico, un pequeño editor vectorial y un editor de efectos de texto.

IMPORTANTE: este módulo debe estar **separado del resto de funcionalidades de mi aplicación**. No quiero que reemplaces ni rompas las funciones existentes. Debe funcionar como una herramienta independiente dentro de la aplicación.

Quiero que el resultado sea visualmente moderno, fluido, intuitivo y profesional, pero sin sacrificar funcionalidad.

---

# 1. OBJETIVO PRINCIPAL

El usuario debe poder:

1. Importar una fuente `.ttf` desde su dispositivo.
2. Poder utilizar esa fuente inmediatamente para escribir texto.
3. Escribir una o varias líneas de texto.
4. Modificar completamente la apariencia del texto.
5. Aplicar rellenos sólidos o degradados.
6. Aplicar contornos sólidos o degradados.
7. Aplicar sombras sólidas o degradadas.
8. Aplicar sombras internas.
9. Aplicar brillo/resplandor.
10. Aplicar biselado.
11. Crear efectos 3D/extrusión.
12. Curvar texto.
13. Crear texto circular.
14. Hacer que el texto siga una curva personalizada.
15. Deformar el texto mediante puntos de control.
16. Modificar interletrado.
17. Modificar interlineado.
18. Rotar, escalar e inclinar el texto.
19. Trabajar mediante capas.
20. Deshacer y rehacer cambios.
21. Guardar diseños.
22. Guardar diseños como plantillas reutilizables.
23. Exportar en altísima calidad.
24. Poder exportar tanto raster como vector cuando sea posible.

La herramienta debe sentirse como un **Text Effects Studio**, no como un simple formulario que cambia CSS.

Además del editor tipográfico, quiero que este proyecto incluya **dos módulos gráficos independientes adicionales**: un sistema avanzado para rellenar texto con imágenes y un **Editor de Imágenes** independiente.

---

# 2. TECNOLOGÍA Y ARQUITECTURA

Si es una aplicación web, utilizar una arquitectura adecuada para edición gráfica.

Preferiblemente utilizar:

- SVG para geometría/vectorización.
- Canvas cuando sea útil para renderizado y efectos.
- Una librería capaz de interpretar fuentes `.TTF`, como `opentype.js`, u otra alternativa equivalente.
- Paths/vectorización de glifos cuando sea necesario para deformaciones avanzadas.
- CSS solamente para la interfaz, no como sustituto de un sistema gráfico completo.

La arquitectura debe estar organizada y ser mantenible.

Separar claramente:

- UI
- motor de texto
- motor de renderizado
- sistema de efectos
- sistema de gradientes
- sistema de transformaciones
- sistema de curvas/deformaciones
- sistema de capas
- sistema de historial
- sistema de guardado
- sistema de exportación

No crear un único archivo gigantesco e imposible de mantener si la aplicación necesita varios archivos.

---

# 3. IMPORTACIÓN DE FUENTES

Crear un botón:

**"Importar fuente"**

Debe permitir seleccionar:

- `.ttf`
- `.otf`
- `.woff`
- `.woff2`, si técnicamente es posible.

### Importación de paquetes ZIP de fuentes

Además de archivos individuales, el editor debe aceptar **archivos `.zip` que contengan fuentes**.

Esto es especialmente importante porque las fuentes descargadas desde sitios como Google Fonts o DaFont suelen venir dentro de archivos ZIP con una estructura de carpetas y archivos adicionales.

El sistema NO debe asumir que dentro del ZIP existe solamente un único archivo de fuente en la raíz.

Debe ser capaz de:

1. Recibir un archivo `.zip` mediante un selector de archivos.
2. Leer el contenido del ZIP de forma local en el navegador.
3. Recorrer recursivamente todas sus carpetas y subcarpetas.
4. Identificar automáticamente los archivos que realmente sean fuentes.
5. Ignorar archivos que no sean fuentes, como:
   - README;
   - archivos de licencia;
   - imágenes de muestra;
   - documentos;
   - archivos de texto;
   - archivos HTML;
   - metadatos que no sean necesarios para cargar la fuente.
6. Detectar fuentes independientemente de si están en la raíz o dentro de varias carpetas.
7. Mostrar al usuario todas las fuentes encontradas dentro del ZIP.
8. Permitir seleccionar una fuente concreta o, si resulta conveniente, importar todas las fuentes válidas encontradas.

Ejemplo de ZIP válido:

```text
mi-fuente.zip
│
├── LICENSE.txt
├── README.txt
├── preview.png
│
└── fonts
    ├── Regular.ttf
    ├── Bold.ttf
    ├── Italic.ttf
    └── BoldItalic.ttf
```

También debe funcionar con estructuras más profundas:

```text
familia.zip
└── carpeta
    └── otra-carpeta
        └── fuentes
            ├── Font-Regular.otf
            └── Font-Bold.woff2
```

No depender únicamente de la extensión del archivo. Cuando sea posible, validar que el contenido corresponda realmente a un formato de fuente compatible.

### Formatos de fuentes

Intentar soportar todos los formatos razonablemente utilizables por el navegador y por la librería de parsing elegida, incluyendo:

- `.ttf` — TrueType Font;
- `.otf` — OpenType Font;
- `.woff` — Web Open Font Format;
- `.woff2` — Web Open Font Format 2;
- `.ttc` — TrueType Collection, si la librería y el navegador permiten procesarlo;
- otros formatos compatibles si existe una implementación fiable.

Cuando un formato no pueda editarse o convertirse directamente, mostrar un mensaje claro en lugar de producir un error silencioso.

### Fuentes múltiples dentro de un ZIP

Si el ZIP contiene una familia completa, por ejemplo:

```text
Regular
Medium
SemiBold
Bold
Italic
Bold Italic
```

el sistema debe detectarlas individualmente y, cuando sea posible, reconocer que pertenecen a una misma familia.

Mostrar información útil como:

- nombre de familia;
- nombre del estilo;
- peso;
- variante;
- nombre del archivo.

Idealmente organizar la lista de fuentes así:

```text
MI FUENTE
├── Regular
├── Medium
├── SemiBold
├── Bold
├── Italic
└── Bold Italic
```

### Importación sin servidor

La extracción del ZIP debe realizarse **localmente en el dispositivo del usuario**, sin necesidad de subir las fuentes a un servidor externo.

Esto es importante tanto por privacidad como porque el editor debe poder funcionar de manera local.

Utilizar una librería apropiada para leer ZIP, por ejemplo JSZip o una alternativa equivalente, siempre que sea compatible con la arquitectura existente.

### Validación y errores

Si el ZIP:

- está corrupto;
- está protegido con contraseña;
- no contiene fuentes compatibles;
- contiene fuentes dañadas;
- contiene un formato no soportado;

mostrar mensajes claros al usuario.

Ejemplos:

```text
No se encontraron fuentes compatibles dentro de este ZIP.
```

o:

```text
Se encontraron 4 fuentes.
2 pudieron cargarse correctamente.
2 utilizan un formato no compatible.
```

### Fuentes dentro de carpetas comprimidas

La búsqueda debe ser recursiva y no depender de nombres específicos como `fonts`, `static`, `otf` o `ttf`.

El objetivo es que un ZIP proveniente de diferentes sitios pueda ser procesado aunque cada sitio utilice una estructura distinta.

### ZIP de Google Fonts y DaFont

El editor debe estar diseñado para tolerar las estructuras habituales de ZIP descargados desde repositorios de fuentes como Google Fonts y DaFont, sin depender de una estructura única.

No realizar scraping ni descargar automáticamente desde esos sitios. El usuario proporciona el ZIP manualmente y la aplicación procesa únicamente el archivo seleccionado.

### ZIP con archivos adicionales

Si un ZIP contiene:

```text
font.zip
├── fuente.ttf
├── fuente.otf
├── preview.jpg
├── specimen.pdf
├── LICENSE.txt
└── README.md
```

el editor debe detectar únicamente las fuentes compatibles y dejar los demás archivos fuera del flujo de importación.

### ZIP con varias familias

Si un único ZIP contiene varias familias, por ejemplo:

```text
pack.zip
├── Font A
│   ├── Regular.ttf
│   └── Bold.ttf
├── Font B
│   └── Regular.otf
└── Font C
    └── Italic.woff2
```

detectar todas las fuentes y permitir al usuario decidir cuáles importar.

### Seguridad

El procesamiento de ZIP debe hacerse con cuidado.

No ejecutar ningún archivo contenido dentro del ZIP.

Tratar todos los archivos extraídos como datos.

Evitar cualquier mecanismo que permita que rutas internas del ZIP escriban arbitrariamente fuera del directorio temporal de procesamiento si se utiliza un entorno con filesystem.

En una implementación completamente web, mantener los archivos en memoria/Blob/ArrayBuffer o almacenamiento controlado del navegador.

### Biblioteca de fuentes importadas

Además de permitir seleccionar una fuente al vuelo, crear una pequeña **Biblioteca de Fuentes Importadas**.

Mostrar:

```text
FUENTES IMPORTADAS

▾ Mi Fuente
   Regular
   Bold
   Italic

▾ Otra Fuente
   Regular
```

Permitir:

- utilizar una fuente;
- eliminarla de la biblioteca;
- ver sus variantes;
- volver a utilizarla en nuevos diseños.

Si se guarda persistentemente, utilizar almacenamiento apropiado del navegador como IndexedDB y tener en cuenta el tamaño de los archivos.

Después de importar una fuente:

- cargarla en la aplicación;
- mostrarla en la lista de fuentes;
- permitir utilizarla inmediatamente;
- mostrar el nombre de la fuente;
- mantenerla disponible durante la sesión;
- si es posible, permitir guardarla localmente para reutilizarla posteriormente.

IMPORTANTE:

No depender de Google Fonts ni de una conexión a Internet para utilizar una fuente que el usuario haya importado manualmente.

La fuente debe funcionar localmente.

---

# 4. ÁREA DE PREVISUALIZACIÓN

Crear un área central grande de previsualización.

El texto debe mostrarse en tiempo real.

Los cambios realizados en cualquier control deben actualizar la previsualización inmediatamente.

El usuario debe poder:

- hacer zoom;
- desplazar el lienzo;
- centrar el diseño;
- ajustar el diseño al área;
- ver transparencia mediante fondo tipo tablero;
- opcionalmente cambiar el color de fondo de previsualización.

Cuando se selecciona el texto deben aparecer controles visuales para:

- mover;
- escalar;
- rotar;
- transformar.

---

# 5. TEXTO

Controles:

- campo de texto;
- tamaño;
- fuente;
- alineación;
- interletrado;
- interlineado;
- separación entre palabras;
- escala horizontal;
- escala vertical;
- rotación;
- posición X;
- posición Y;
- inclinación horizontal;
- inclinación vertical.

Permitir texto:

- de una línea;
- de varias líneas.

Alineación:

- izquierda;
- centro;
- derecha;
- justificado si es compatible.

### Conversión de mayúsculas/minúsculas

Agregar un pequeño grupo de botones para transformar el texto ya escrito, sin que el usuario tenga que reescribirlo manualmente:

- **MAYÚSCULAS** — convierte todo el texto a mayúsculas (ej. "hola mundo" → "HOLA MUNDO");
- **minúsculas** — convierte todo el texto a minúsculas (ej. "HOLA MUNDO" → "hola mundo");
- **Primera Letra De Cada Palabra** (Title Case) — pone en mayúscula la primera letra de cada palabra y el resto en minúscula (ej. "hola mundo" → "Hola Mundo");
- **Primera letra de la oración** (Sentence case) — pone en mayúscula solo la primera letra de cada oración/línea y el resto en minúscula (ej. "hola. adiós" → "Hola. Adiós");
- **aLTERNAR mAYÚSCULAS** (Toggle/Invert case) — invierte el caso de cada letra individualmente (ej. "Hola Mundo" → "hOLA mUNDO"), útil como efecto estilístico rápido.

Consideraciones:

- Estos botones deben operar sobre el texto actual del bloque seleccionado, respetando acentos, ñ y demás caracteres especiales del español y Unicode soportado por la fuente.
- La transformación debe integrarse con el sistema de historial (undo/redo).
- No debe alterar otros atributos del texto (relleno, contorno, efectos, curvas, etc.), solo el contenido/caso de los caracteres.
- Si el usuario sigue escribiendo después de aplicar una transformación, el nuevo texto no se ve forzado a mantener ese caso (no es un "modo" permanente, es una acción puntual sobre el contenido existente), salvo que se decida ofrecer opcionalmente un modo de bloqueo de caso que se pueda activar/desactivar.

---

# 6. RELLENO

El relleno debe admitir:

### Color sólido

Selector de color.

### Degradado

Permitir:

- degradado lineal;
- degradado radial;
- y, si es viable, otros tipos de degradado.

El usuario debe poder elegir libremente los colores.

### Relleno mediante imágenes

Además de color sólido y degradados, el texto debe poder utilizar **una o múltiples imágenes como relleno**.

El usuario debe poder:

- importar una o varias imágenes desde su dispositivo;
- colocar múltiples imágenes dentro del área de relleno del texto;
- mover cada imagen independientemente;
- rotar cada imagen;
- voltear cada imagen horizontalmente;
- voltear cada imagen verticalmente;
- hacer zoom para cambiar su escala;
- modificar ancho;
- modificar alto;
- mantener o romper la proporción de aspecto cuando el usuario lo decida;
- cambiar posición X/Y;
- controlar opacidad;
- recortar o ajustar la imagen al área de las letras cuando sea necesario;
- cambiar el orden de las imágenes cuando haya varias;
- eliminar o duplicar imágenes.

Las imágenes deben quedar **enmascaradas dentro de la forma de las letras**, de manera que solamente sean visibles en el interior del texto.

Cada imagen debe ser una entidad independiente dentro del relleno para poder editarla sin alterar las demás.

El sistema debe permitir combinar imágenes con color o degradados cuando sea técnicamente viable, por ejemplo utilizando modos de mezcla o capas de relleno.

Cuando una imagen se mueva, rote, escale o voltee, el resultado debe actualizarse en tiempo real dentro de las letras.

---

# 7. SISTEMA AVANZADO DE PUNTOS DE COLOR

ESTO ES MUY IMPORTANTE.

No limitar el degradado a solamente dos colores.

Quiero un sistema de **stops/puntos de color completamente editable**.

Ejemplo:

```text
●────────●────────●────────●
ROJO     ROSA     MORADO    AZUL
0%       30%      65%       100%
```

El usuario debe poder:

- añadir puntos;
- eliminar puntos;
- seleccionar un punto;
- cambiar el color del punto;
- cambiar la posición del punto;
- arrastrarlo;
- introducir manualmente el porcentaje;
- tener tantos puntos como sea razonablemente posible.

Ejemplo:

```text
[ + Añadir color ]

0%     25%     50%     75%     100%
●-------●-------●-------●-------●
🔴      🟠      🟡      🟢      🔵
```

No asumir que todos los degradados tendrán únicamente dos colores.

---

# 8. DIRECCIÓN DEL DEGRADADO

El usuario debe poder modificar la dirección.

Para degradados lineales:

- ángulo de 0° a 360°;
- control visual para rotarlo;
- posiblemente un control de dirección directamente sobre el lienzo.

Ejemplos:

- horizontal;
- vertical;
- diagonal;
- personalizado.

Para degradados radiales:

- posición X;
- posición Y;
- radio;
- escala horizontal;
- escala vertical cuando sea viable.

---

# 9. TRANSPARENCIA EN LOS DEGRADADOS

Los puntos de degradado deberían poder controlar también:

- color;
- opacidad.

Ejemplo:

```text
●────────●────────●
ROJO     ROSA      TRANSPARENTE
100%     80%       0%
```

Esto permitirá crear efectos de desvanecimiento.

---

# 10. CONTORNO / STROKE

Agregar una sección independiente:

**CONTORNO**

Controles:

- activar/desactivar;
- grosor;
- color;
- opacidad;
- tipo de unión;
- tipo de terminación si aplica.

El contorno debe poder ser:

### Sólido

Un solo color.

### Degradado

Debe tener exactamente el mismo sistema avanzado de degradado:

- múltiples puntos;
- colores personalizados;
- posiciones;
- opacidad;
- dirección;
- ángulo;
- lineal;
- radial cuando sea técnicamente viable.

IMPORTANTE:

El degradado del contorno debe ser **independiente del degradado del relleno**.

Por ejemplo:

Relleno:

```text
amarillo → naranja
```

Contorno:

```text
rojo → rosa → morado → azul
```

Ambos deben poder configurarse por separado.

---

# 11. MÚLTIPLES CONTORNOS

Si es posible, permitir múltiples strokes.

Ejemplo:

```text
████████████████
█ CONTORNO 3    █
█ CONTORNO 2    █
█ CONTORNO 1    █
█ RELLENO       █
████████████████
```

Cada contorno debería tener:

- grosor;
- color/degradado;
- opacidad;
- orden.

Esto permitiría crear estilos tipo sticker, logo, títulos y lettering.

---

# 12. SOMBRA

Agregar una sección:

**SOMBRA**

Controles:

- activar/desactivar;
- desplazamiento X;
- desplazamiento Y;
- desenfoque;
- expansión si es posible;
- opacidad;
- color.

Pero además quiero:

### Sombra degradada

La sombra también debe admitir:

- múltiples colores;
- puntos de color;
- posiciones;
- opacidad;
- dirección;
- degradado lineal;
- degradado radial.

El degradado de la sombra debe ser independiente del texto y del contorno.

---

# 13. SOMBRA INTERNA

Agregar:

**SOMBRA INTERNA**

Controles:

- profundidad;
- X;
- Y;
- desenfoque;
- opacidad;
- color;
- degradado cuando sea viable.

Debe producir un efecto similar a una sombra que se encuentra dentro de las letras.

---

# 14. BRILLO / RESPLANDOR

Agregar:

### Glow exterior

Controles:

- color;
- opacidad;
- intensidad;
- radio/desenfoque.

### Glow interior

Si es técnicamente viable.

También permitir colores personalizados.

---

# 15. BISEL

Agregar una sección:

**BISEL**

Crear un efecto de relieve sobre las letras.

Controles:

- profundidad;
- tamaño;
- suavidad;
- intensidad;
- dirección;
- ángulo de iluminación;
- altura;
- color de iluminación;
- color de sombra;
- opacidad.

Debe intentar simular un efecto de texto elevado o tallado.

---

# 16. EFECTO 3D / EXTRUSIÓN

Agregar:

**3D / EXTRUSIÓN**

El texto debe poder aparentar profundidad.

Controles:

- profundidad;
- dirección;
- ángulo;
- distancia;
- suavidad;
- color de extrusión;
- degradado de extrusión si es posible;
- iluminación.

Ejemplo conceptual:

```text
HOLA
  HOLA
    HOLA
```

La extrusión debe poder combinarse con:

- relleno;
- contorno;
- sombra;
- bisel;
- degradados.

---

# 17. CURVATURA DEL TEXTO

Agregar una herramienta:

**CURVAR TEXTO**

Permitir modificar la curvatura del texto.

Controles:

- curvatura;
- intensidad;
- radio;
- dirección;
- posición;
- inversión.

Ejemplo:

```text
────────────
```

↓

```text
╭──────────╮
```

También permitir:

```text
╰──────────╯
```

---

# 18. TEXTO CIRCULAR

Crear una herramienta específica:

**TEXTO CIRCULAR**

Permitir que el texto siga una circunferencia.

Controles:

- radio;
- ángulo inicial;
- ángulo final;
- dirección;
- posición;
- separación entre letras;
- curvatura;
- texto interno/externo.

Debe poder hacer:

```text
       H O L A
    /           \
  M               U
  N               N
   \             /
      D O
```

Y también invertir el texto hacia el interior del círculo.

---

# 19. TEXTO SOBRE CURVA PERSONALIZADA

Esta función es especialmente importante.

Crear una herramienta:

**CURVA PERSONALIZADA**

Mostrar una línea/curva editable con puntos de control.

Los puntos deben ser visibles solamente durante la edición.

Ejemplo:

```text
●────────●
          \
           ●
            \
             ●
```

El usuario puede arrastrar los puntos.

El texto debe seguir automáticamente esa curva.

Los puntos NO deben formar parte de la exportación final.

Permitir curvas:

- rectas;
- curvas suaves;
- Bézier;
- múltiples segmentos.

---

# 20. DEFORMACIÓN DEL TEXTO MEDIANTE PUNTOS

Crear una herramienta de deformación libre.

Mostrar una cuadrícula o conjunto de puntos de control alrededor del texto.

Ejemplo:

```text
●────●────●────●
│    │    │    │
●────●────●────●
│    │    │    │
●────●────●────●
```

El usuario puede mover los puntos para deformar el texto.

Esto debe permitir:

- estirar;
- comprimir;
- curvar;
- ondular;
- inclinar;
- deformar localmente.

Los puntos solamente sirven como controles y no deben aparecer en la exportación.

---

# 20A. ROTACIÓN GENERAL DISPONIBLE DURANTE LA EDICIÓN DE CURVAS

Mientras el usuario esté trabajando dentro de cualquiera de las herramientas de curva/deformación descritas arriba (Curvatura del Texto, Texto Circular, Curva Personalizada, Deformación mediante Puntos), el panel correspondiente debe mostrar, **debajo** de sus controles específicos, la herramienta de **rotación GENERAL** del texto (la misma rotación global descrita en la sección de Transformaciones).

Esto es para que el usuario pueda rotar el bloque de texto completo sin necesidad de salir del modo de edición de curvas.

Requisitos:

- La rotación general debe convivir con la curvatura/deformación aplicada (ambas se combinan, no se sustituyen).
- Debe usar el mismo control (slider + input numérico sincronizados) que el resto de la aplicación.
- Debe reflejarse en tiempo real en la previsualización, igual que cualquier otro control.
- No debe interferir con los puntos de control de la curva (deben poder coexistir visualmente sin solaparse de forma confusa).

---

# 21. INTERLETRADO

Agregar control preciso:

**INTERLETRADO**

Permitir:

- slider;
- input numérico;
- valores negativos;
- valores positivos.

Ejemplo:

```text
HOLA
```

↓

```text
H  O  L  A
```

↓

```text
H    O    L    A
```

---

# 22. INTERLINEADO

Para textos de varias líneas:

**INTERLINEADO**

Permitir:

- slider;
- input numérico;
- valores negativos cuando sea técnicamente posible;
- valores positivos.

---

# 23. SEPARACIÓN ENTRE PALABRAS

Agregar:

**ESPACIADO ENTRE PALABRAS**

Con control independiente del interletrado.

---

# 24. TRANSFORMACIONES

Permitir:

- posición X;
- posición Y;
- rotación;
- escala;
- escala X;
- escala Y;
- inclinación X;
- inclinación Y;
- volteo horizontal;
- volteo vertical.

También mantener proporciones cuando el usuario lo desee.

---

# 25. CAPAS

Crear un sistema de capas que permita tener **varios bloques de texto independientes dentro del mismo diseño**.

Cada capa de texto debe conservar de forma independiente:

- contenido;
- fuente y tamaño;
- posición y transformación;
- relleno;
- contornos;
- sombras y glow;
- bisel y extrusión;
- curvas y deformaciones;
- visibilidad y opacidad.

El usuario debe poder seleccionar un texto desde el lienzo o desde la lista de capas, crear textos nuevos, reordenarlos, ocultarlos, duplicarlos y eliminarlos. La capa situada más arriba debe renderizarse delante de las inferiores.

Agregar el atajo obligatorio:

**Ctrl + D** → duplicar el bloque de texto seleccionado con todos sus efectos y transformaciones.

La copia debe ser un objeto independiente y aparecer ligeramente desplazada para poder distinguirla del original.

Ejemplo:

```text
CAPAS

👁 Sombra
👁 Glow
👁 Contorno 2
👁 Contorno 1
👁 Relleno
👁 Extrusión
```

Permitir:

- activar/desactivar;
- reordenar;
- duplicar;
- eliminar;
- editar;
- cambiar opacidad.

La estructura debe permitir combinar efectos sin destruir los anteriores.

---

# 26. HISTORIAL

Implementar:

**Ctrl + Z**

para deshacer.

Implementar:

**Ctrl + Shift + Z**

para rehacer.

También sería ideal agregar botones:

```text
↶ Deshacer
↷ Rehacer
```

El historial debe funcionar correctamente con:

- cambios de texto;
- cambios de fuente;
- cambios de color;
- cambios de degradado;
- movimiento;
- transformación;
- efectos;
- curvas;
- deformaciones;
- capas.

---

# 27. GUARDADO

Permitir guardar el proyecto.

El proyecto debería conservar:

- texto;
- fuente utilizada;
- configuración;
- efectos;
- degradados;
- puntos de color;
- curvas;
- deformaciones;
- capas;
- transformaciones.

Si es posible, utilizar almacenamiento local del navegador para conservar proyectos.

También permitir exportar/importar el proyecto mediante un archivo propio, por ejemplo:

`.json`

De esta manera el usuario puede respaldar su diseño y abrirlo posteriormente.

---

# 28. PLANTILLAS

Agregar un botón:

**"Guardar como plantilla"**

Las plantillas deben almacenarse permanentemente en la galería de plantillas de la aplicación.

Una plantilla debe conservar:

- texto;
- fuente, si es posible;
- efectos;
- degradados;
- curvas;
- transformaciones;
- estructura de capas.

Permitir crear una nueva composición a partir de una plantilla.

---

# 29. EXPORTACIÓN

Crear un botón:

**EXPORTAR**

Opciones:

### PNG

Permitir seleccionar resolución:

- 1x
- 2x
- 3x
- 4x
- resolución personalizada.

Idealmente permitir resoluciones muy grandes para impresión.

También permitir:

- fondo transparente;
- fondo sólido;
- recorte automático al contenido;
- margen personalizado.

---

# 30. EXPORTACIÓN VECTORIAL

Agregar:

**SVG**

Siempre que sea posible.

La exportación SVG debe conservar:

- paths;
- gradientes;
- transparencias;
- contornos;
- formas;
- transformaciones.

Cuando una fuente haya sido importada, considerar convertir los glifos a paths para evitar problemas de compatibilidad al abrir el SVG en otro dispositivo.

El objetivo es que el SVG pueda ampliarse enormemente sin pixelación.

---

# 31. PDF

Si es técnicamente viable, permitir:

**PDF**

Preferentemente manteniendo el contenido vectorial cuando sea posible.

---

# 32. CALIDAD DE EXPORTACIÓN

La prioridad debe ser:

**máxima calidad posible.**

No reducir el diseño simplemente porque la previsualización utiliza un canvas pequeño.

La previsualización y el renderizado final deben poder trabajar con resoluciones diferentes.

Por ejemplo:

```text
PREVISUALIZACIÓN
1000 × 700

EXPORTACIÓN
5000 × 3500
```

El resultado final debe recalcular los efectos a la resolución de exportación.

---

# 33. TRANSPARENCIA

Permitir exportar PNG con:

**fondo transparente real**

No reemplazar la transparencia por blanco.

En la previsualización mostrar un patrón de tablero para representar transparencia.

---

# 34. SISTEMA DE DEGRADADOS REUTILIZABLE (COMPONENTE UNIVERSAL DE COLOR)

Crear **un único componente reutilizable** para color/degradado que se use en absolutamente **todas** las zonas de la aplicación donde se pueda elegir color, sin excepción:

- relleno del texto;
- contorno;
- sombra;
- sombra interna;
- glow/resplandor;
- bisel;
- 3D/extrusión;
- cualquier otro efecto compatible que se agregue en el futuro.

ESTO ES MUY IMPORTANTE: este componente NO es opcional en ninguna de esas zonas. Cada lugar donde exista color debe ofrecer exactamente el mismo conjunto completo de herramientas, sin versiones reducidas ni simplificadas.

El componente universal debe permitir SIEMPRE:

```text
Tipo:
○ Sólido
● Lineal
○ Radial

Dirección / Ángulo (lineal):
[ 135° ]  ──────●────────  (control visual de dirección)

Posición / Radio (radial):
X: [ 50% ]  Y: [ 50% ]  Radio: [ 75% ]

Puntos de degradado:

●────────●────────●
🔴       🟣       🔵
0%       50%      100%

[ + Añadir punto ]   [ 🗑 Quitar punto seleccionado ]

Color del punto seleccionado:
[ Selector de color ]   [ 🧪 Cuentagotas ]

HEX: [ #FF3366 ]  [ 📋 Copiar ]
RGB / HSL (si es viable)
Opacidad: [ 100% ]

Colores recientes:
🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪
```

Requisitos obligatorios del componente, tanto en modo sólido como en cada punto de un degradado:

1. **Selector de color** completo (rueda/cuadrado de saturación-luminosidad o equivalente).
2. **Cuentagotas** integrado, accesible desde el propio selector, que permita tomar el color de cualquier parte del lienzo/previsualización (ver sección 36A) y aplicarlo directamente a ese color o punto.
3. **Campo HEX editable** con su **botón para copiar el código HEX al portapapeles**. Esto es un requisito obligatorio y no debe faltar en ningún selector de color de la aplicación (relleno, contorno, sombra, glow, bisel, 3D, etc.).
4. **Añadir puntos** de degradado con un botón claro ("+ Añadir punto").
5. **Quitar puntos** de degradado, tanto mediante un botón/ícono dedicado como pudiendo arrastrar el punto fuera de la barra si se decide implementar ese gesto.
6. **Dirección del degradado** siempre editable: ángulo 0°–360° para lineales (con control numérico y control visual/arrastrable), y posición X/Y + radio para radiales.
7. Acceso directo al **historial de colores usados recientemente** (ver sección 34A) desde el mismo panel, para poder reutilizar un color con un solo clic.

Cada punto debe tener:

- posición (arrastrable y editable numéricamente);
- color (con HEX, selector y cuentagotas como se describe arriba);
- opacidad.

No crear una versión "simplificada" de este componente para ninguna zona de color. El contorno, la sombra, el glow, el bisel y el 3D deben tener acceso a exactamente las mismas herramientas de color que el relleno.

---

# 34A. HISTORIAL DE COLORES RECIENTES

Implementar un **historial global de colores usados recientemente**, visible y accesible desde cualquier selector de color de la aplicación (relleno, contorno, sombra, glow, bisel, 3D, y cualquier punto de degradado).

Comportamiento esperado:

- Cada vez que el usuario aplica un color (ya sea eligiéndolo manualmente, escribiendo un HEX, o usando el cuentagotas), ese color se agrega automáticamente al historial de colores recientes.
- Mostrar los colores recientes como una fila de muestras/swatches pequeñas, ordenadas de más reciente a más antigua.
- Al hacer clic sobre un color del historial, aplicarlo inmediatamente al color o punto de degradado seleccionado en ese momento.
- Evitar duplicados consecutivos: si el usuario vuelve a usar el mismo color, no debe repetirse la entrada, sino moverse al principio del historial.
- Mantener una cantidad razonable de colores recientes (por ejemplo, entre 12 y 20), descartando los más antiguos cuando se supere el límite.
- El historial debe ser **compartido entre todas las herramientas de color** del editor tipográfico (relleno, contorno, sombra, glow, bisel, 3D) y, si es razonable, también con el Editor de Imágenes.
- Persistir el historial mientras dure la sesión como mínimo; si es técnicamente sencillo, guardarlo de forma persistente en el navegador (por ejemplo `localStorage`) para que se conserve entre sesiones.
- Mostrar el HEX del color al pasar el cursor sobre una muestra del historial, si es viable.

Este historial es un requisito importante para el usuario y debe implementarse de forma real, no como un placeholder.

---

# 35. CONTROLES DIRECTAMENTE SOBRE EL LIENZO

Cuando sea posible, algunos controles deben poder manipularse directamente sobre la previsualización.

Por ejemplo:

- rotación;
- escala;
- puntos de curva;
- dirección del degradado;
- posición de sombra;
- radio circular;
- puntos de deformación.

Para imágenes utilizadas como relleno, también permitir manipulación directa mediante controles visuales:

- mover;
- escalar desde las esquinas;
- rotar;
- voltear horizontal/verticalmente;
- ajustar tamaño;
- cambiar posición.

Los controles deben permanecer fuera de la exportación final.

Esto hará que la herramienta sea mucho más intuitiva.

---

# 36. INTERFAZ

La interfaz debe estar organizada por secciones.

Por ejemplo:

```text
EDITOR TIPOGRÁFICO

FUENTE
├── Importar fuente
├── Fuente actual
└── Tamaño

TEXTO
├── Texto
├── Alineación
├── Interletrado
├── Interlineado
└── Espaciado

RELLENO
├── Sólido
├── Degradado
└── Imágenes

CONTORNO
├── Grosor
├── Sólido
└── Degradado

SOMBRA
├── Desplazamiento
├── Desenfoque
├── Sólido
└── Degradado

EFECTOS
├── Sombra interna
├── Glow
├── Bisel
└── 3D

TRANSFORMACIÓN
├── Posición
├── Escala
├── Rotación
└── Inclinación

DEFORMACIÓN
├── Curvar
├── Circular
├── Curva personalizada
└── Deformación por puntos

CAPAS

EXPORTAR
```

No mostrar todos los controles de golpe si esto hace que la interfaz sea demasiado abrumadora.

Usar paneles desplegables.

---

# 36A. CUENTAGOTAS / SELECTOR DE COLOR

Agregar una herramienta **Cuentagotas** que permita tomar colores directamente desde:

- el lienzo;
- el texto;
- imágenes utilizadas como relleno;
- el área de previsualización.

Al utilizar el cuentagotas, mostrar el color seleccionado y permitir aplicarlo al:

- relleno;
- contorno;
- sombra;
- bisel;
- glow;
- cualquier otro selector de color compatible.

Si es viable, mostrar información adicional como:

- HEX;
- RGB;
- HSL;
- alfa/opacidad.

**Permitir copiar el valor HEX del color seleccionado (obligatorio, no opcional).**

Todo color tomado con el cuentagotas debe agregarse automáticamente al **historial de colores recientes** descrito en la sección 34A, igual que cualquier otro color aplicado manualmente.

---

# 36B. GALERÍA DE DISEÑOS

Crear una **Galería de Diseños** independiente del editor.

Debe permitir guardar composiciones terminadas o proyectos en curso.

Cada diseño guardado debe conservar toda la información necesaria para continuar editándolo:

- texto;
- fuentes;
- imágenes;
- posición y transformaciones;
- rellenos;
- degradados y sus puntos;
- contornos;
- sombras;
- efectos;
- capas;
- curvas;
- deformaciones;
- configuración del proyecto.

La galería debe mostrar miniaturas de los diseños.

Permitir:

- crear un diseño nuevo;
- abrir;
- duplicar;
- renombrar;
- eliminar;
- exportar;
- guardar como plantilla.

Los diseños deben persistir localmente cuando sea posible, por ejemplo mediante IndexedDB, para que no desaparezcan al cerrar el navegador.

La galería de diseños y la galería de plantillas deben ser conceptos distintos:

- **Diseños:** proyectos editables guardados por el usuario.
- **Plantillas:** composiciones reutilizables para iniciar nuevos diseños.

---

# 36C. EDITOR DE IMÁGENES INDEPENDIENTE

Además del Editor Tipográfico, crear otro apartado completamente independiente llamado:

**EDITOR DE IMÁGENES**

Este editor debe permitir importar una imagen y realizar edición visual avanzada sin necesidad de utilizar el editor de texto.

Debe aceptar formatos habituales como:

- PNG;
- JPG/JPEG;
- WEBP;
- otros formatos compatibles con el navegador.

El editor debe tener una previsualización grande y controles no destructivos cuando sea posible.

---

# 36D. AJUSTES PRINCIPALES DE IMAGEN

Crear una sección de ajustes básicos con sliders e inputs numéricos sincronizados.

Incluir como mínimo:

- brillo;
- contraste;
- saturación;
- exposición, si es viable;
- temperatura, si es viable;
- matiz/tono;
- intensidad de color;
- opacidad;
- gamma, si es viable;
- sombras;
- luces/highlights;
- blancos;
- negros.

Cada ajuste debe tener un control de intensidad y un valor numérico visible.

Ejemplo:

```text
BRILLO
──────●────────
      +12
      [ 12 ]
```

Los sliders y sus inputs deben estar sincronizados.

---

# 36E. NITIDEZ

Agregar:

**NITIDEZ**

Con slider de intensidad.

Si es técnicamente viable, permitir controlar:

- intensidad;
- radio;
- umbral.

Evitar que valores altos produzcan resultados visualmente defectuosos cuando sea posible.

---

# 36F. DESENFOQUES Y FILTROS

Crear una sección independiente para filtros.

### Desenfoque gaussiano

Agregar:

- intensidad/radio mediante slider;
- input numérico;
- vista previa en tiempo real.

### Desenfoque general

Permitir controlar la intensidad.

### Escala de grises

Convertir la imagen a escala de grises.

Agregar slider de intensidad desde:

```text
0% = imagen original
100% = escala de grises completa
```

### Monocromático

Crear un filtro monocromático donde el usuario pueda elegir el color base.

Permitir controlar:

- color;
- intensidad.

### Sepia

Agregar filtro sepia con intensidad ajustable.

### Invertir

Permitir invertir colores.

### Desenfoque de movimiento

Si es viable, agregar:

- intensidad;
- dirección/ángulo.

### Pixelado

Si es viable, agregar:

- tamaño de píxel/intensidad.

### Viñeta

Agregar:

- intensidad;
- tamaño;
- suavidad.

### Granulado / Grano de película

Agregar un filtro de **granulado (grain)** para añadir ruido/grano visual a la imagen, similar al efecto de fotografía analógica o película.

Debe permitir controlar mediante sliders e inputs:

- intensidad/cantidad de grano;
- tamaño del grano;
- suavidad o dispersión cuando sea viable;
- opacidad del efecto;
- distribución del grano, si es técnicamente viable;
- grano monocromático o grano con variación de color, si es viable.

El filtro debe poder mezclarse con la imagen original mediante un control de intensidad, de modo que 0% deje la imagen intacta y 100% aplique el efecto configurado al máximo.

El granulado debe poder combinarse con otros ajustes y filtros sin destruir la imagen original cuando sea posible.

### Lens Blur / Bokeh de lente

Agregar un filtro independiente llamado **Lens Blur**, inspirado en el efecto de desenfoque óptico/bokeh de una lente fotográfica. PicsArt incluye actualmente un efecto `lensblur` dentro de su sistema de efectos y describe Lens Blur como uno de sus filtros de desenfoque.

IMPORTANTE: no quiero que sea simplemente un desenfoque gaussiano con otro nombre. Debe intentar recrear el aspecto de un **desenfoque de lente/bokeh**, donde las zonas desenfocadas y especialmente las zonas muy brillantes pueden generar formas luminosas características de la apertura de la lente.

El efecto debe detectar o ponderar las zonas de mayor luminosidad de la imagen y convertir los puntos/áreas brillantes desenfocados en formas de bokeh visibles, creando ese aspecto de luces desenfocadas de fotografía.

Debe incluir como mínimo los siguientes controles mediante sliders e inputs numéricos:

- **Radio:** controla el tamaño/intensidad del desenfoque de lente y el tamaño aparente de las formas bokeh.
- **Lightness / Luminosidad:** controla cuánto influyen las zonas brillantes de la imagen en la generación del bokeh y qué tan visibles/intensas son las formas luminosas.

Agregar además un selector de **forma de apertura/bokeh**, como mínimo:

- círculo;
- octógono;
- rombo;
- triángulo.

La forma seleccionada debe modificar la geometría de las manchas de luz generadas, simulando diferentes formas de apertura de diafragma.

El usuario debe poder cambiar la forma en tiempo real y observar inmediatamente cómo cambian las luces desenfocadas.

Cuando sea técnicamente viable, agregar también controles avanzados para:

- intensidad/opacidad del bokeh;
- tamaño de las formas luminosas;
- umbral de luminosidad para decidir qué zonas generan bokeh;
- suavidad de los bordes;
- rotación de la forma de apertura;
- cantidad/densidad de puntos luminosos;
- coloración del bokeh tomando el color de la zona luminosa original;
- intensidad de color;
- posición del foco o área de enfoque;
- profundidad/rango de desenfoque;
- transición entre zonas enfocadas y desenfocadas.

Si se implementa un control de enfoque, permitir mover el punto o área de enfoque directamente sobre el lienzo.

El resultado debe intentar parecerse a un **bokeh óptico realista**, no a simples círculos superpuestos. Las zonas brillantes deben conservar una relación visual con la imagen original.

El filtro debe poder combinarse con granulado, brillo, contraste, saturación, viñeta y los demás filtros del Editor de Imágenes.

El efecto debe contar con previsualización en tiempo real y, para la exportación, recalcularse a la resolución final para evitar que el bokeh pierda calidad.

Todos los filtros deben poder activarse/desactivarse y, cuando sea posible, combinarse.

---

# 36G. FILTROS CON INTENSIDAD

IMPORTANTE:

Los filtros que conceptualmente pueden mezclarse con la imagen original deben utilizar un sistema de intensidad.

Ejemplo:

```text
ESCALA DE GRISES
Original ───────●──── Completo
               65%
```

Esto permite tener un efecto parcial en lugar de obligar al usuario a aplicar el filtro al 100%.

El mismo principio debe utilizarse para:

- monocromático;
- sepia;
- desenfoques cuando sea aplicable;
- viñeta;
- otros filtros compatibles.

---

# 36H. TRANSFORMACIONES DE IMAGEN

El Editor de Imágenes debe permitir:

- posición X/Y;
- ancho;
- alto;
- escala;
- zoom;
- rotación;
- volteo horizontal;
- volteo vertical;
- recorte;
- mantener proporción;
- ajuste al lienzo;
- ajuste de imagen al área.

El usuario debe poder manipular la imagen directamente desde el lienzo mediante controles visuales.

---

# 36I. AJUSTES AVANZADOS DE IMAGEN

Agregar, cuando sea técnicamente viable, controles adicionales para acercarse a un editor de imágenes completo:

- curvas de tono;
- niveles;
- balance de color;
- temperatura;
- tinte;
- vibrancia;
- altas luces;
- sombras;
- blancos;
- negros;
- claridad;
- dehaze/niebla;
- reducción de ruido;
- posterización;
- umbral;
- enfoque suave;
- enfoque de alta frecuencia cuando sea viable.

No es necesario implementar técnicas extremadamente complejas si perjudican demasiado el rendimiento, pero se debe priorizar la mejor implementación práctica para una aplicación web.

---

# 36J. HISTORIAL DEL EDITOR DE IMÁGENES

El Editor de Imágenes también debe utilizar:

**Ctrl + Z** → deshacer

**Ctrl + Shift + Z** → rehacer

El historial debe registrar ajustes y transformaciones de forma coherente.

Idealmente utilizar edición no destructiva: conservar la imagen original y almacenar los ajustes aplicados para poder modificarlos posteriormente.

---

# 36K. EXPORTACIÓN DEL EDITOR DE IMÁGENES

Permitir exportar la imagen editada en:

- PNG;
- JPG/JPEG;
- WEBP cuando sea compatible.

Permitir configurar:

- calidad JPEG/WEBP;
- resolución;
- escala de exportación;
- fondo cuando la imagen tenga transparencia;
- recorte al contenido.

El renderizado final debe realizarse a la resolución seleccionada, no simplemente ampliar una previsualización pequeña.

---

# 36L. GUARDADO DEL EDITOR DE IMÁGENES

Los proyectos del Editor de Imágenes deben poder guardarse en la Galería de Diseños.

El proyecto debe conservar:

- imagen original cuando sea posible;
- filtros;
- intensidad de cada filtro;
- ajustes de imagen;
- transformaciones;
- recortes;
- configuración de exportación.

Al volver a abrir el proyecto, el usuario debe poder continuar editándolo.

---

# 37. RESPONSIVIDAD

La herramienta debe funcionar correctamente en:

- PC;
- laptop;
- tablet;
- móvil cuando sea posible.

En pantallas pequeñas, adaptar la interfaz.

El lienzo debe seguir siendo utilizable.

---

# 38. RENDIMIENTO

IMPORTANTE:

La aplicación debe evitar recalcular innecesariamente todo el proyecto en cada interacción.

Optimizar:

- renderizado;
- efectos;
- degradados;
- curvas;
- fuentes;
- historial.

La previsualización debe mantenerse fluida.

Para exportaciones muy grandes, realizar el renderizado final de manera independiente de la resolución de previsualización.

---

# 39. COMPATIBILIDAD

El sistema debe manejar correctamente:

- letras con formas complejas;
- fuentes con distintos tamaños de glifo;
- caracteres especiales;
- números;
- símbolos;
- acentos;
- español;
- Unicode cuando la fuente lo soporte.

No asumir que todas las fuentes tienen las mismas métricas.

---

# 40. MANEJO DE ERRORES

Si una fuente no puede cargarse:

Mostrar un mensaje claro.

Ejemplo:

"Esta fuente no pudo cargarse. Comprueba que el archivo sea un TTF/OTF válido."

Si un efecto no es compatible con una determinada técnica de exportación:

- no romper el proyecto;
- mantener la previsualización;
- informar claramente;
- aplicar rasterización solamente al efecto problemático si es necesario.

---

# 41. DISEÑO DEL EDITOR

Quiero una interfaz profesional.

Conceptualmente:

```text
┌─────────────────────────────────────────────────────────┐
│ 🔤 EDITOR TIPOGRÁFICO                   ↶ ↷  💾 EXPORTAR│
├───────────────┬─────────────────────────┬───────────────┤
│               │                         │               │
│ HERRAMIENTAS  │                         │ PROPIEDADES   │
│               │                         │               │
│ Fuente        │                         │ Texto         │
│ Texto         │                         │ Relleno       │
│ Relleno       │       PREVISUALIZADOR   │ Contorno      │
│ Contorno      │                         │ Sombra        │
│ Sombra        │          HOLA           │ Bisel         │
│ Efectos       │                         │ 3D            │
│ Curvas        │                         │ Deformación   │
│ Capas         │                         │               │
│               │                         │               │
├───────────────┴─────────────────────────┴───────────────┤
│ Zoom: 100%                 [Centrar] [Ajustar al área]  │
└─────────────────────────────────────────────────────────┘
```

La distribución exacta puede adaptarse a la arquitectura actual de mi aplicación.

---

# 42. EXPERIENCIA DE USUARIO

Quiero que los controles tengan:

- sliders;
- inputs numéricos;
- selectores de color;
- botones claros;
- indicadores visuales;
- valores visibles.

Cuando un slider tenga un input numérico asociado, ambos deben estar sincronizados.

Ejemplo:

```text
Ángulo
──────●────────
     135°
[ 135 ]
```

Si cambio el slider, cambia el input.

Si cambio el input, cambia el slider.

---

# 43. NO HACER UNA IMPLEMENTACIÓN SIMPLIFICADA

NO quiero una demostración básica.

NO quiero solamente:

```javascript
ctx.fillText()
```

con unos pocos colores.

Quiero una arquitectura preparada para un **editor tipográfico avanzado**.

Las funciones deben estar realmente implementadas y conectadas entre sí.

No crear botones que simplemente digan "próximamente".

Si una función es técnicamente compleja, implementar la mejor versión funcional posible en lugar de colocar un placeholder.

---

# 44. INTEGRACIÓN CON MI APP EXISTENTE

No modificar innecesariamente otras partes de la aplicación.

Crear el editor como un módulo/apartado independiente.

Debe poder abrirse desde la aplicación y volver al resto de la aplicación sin perder los datos.

No eliminar funcionalidades existentes.

No cambiar estilos globales que puedan romper otros módulos.

Aislar los estilos y lógica del editor siempre que sea posible.

---

# 45. PRIORIDAD DE FUNCIONES

Si necesitas implementar el proyecto progresivamente, utiliza este orden:

### FASE 1
- importar fuentes individuales;
- importar ZIPs con fuentes;
- detección recursiva de fuentes dentro de ZIP;
- soporte TTF/OTF/WOFF/WOFF2 y formatos adicionales cuando sea viable;
- detección de familias y variantes;
- biblioteca local de fuentes importadas;
- texto;
- tamaño;
- interletrado;
- interlineado;
- transformaciones;
- previsualización.

### FASE 2
- relleno sólido;
- degradado;
- múltiples puntos (añadir/quitar);
- dirección del degradado (ángulo, posición/radio radial);
- selector de color con campo HEX y botón de copiar HEX;
- transparencia;
- relleno mediante imágenes;
- múltiples imágenes dentro del texto;
- transformación individual de imágenes;
- cuentagotas;
- historial de colores usados recientemente (compartido entre relleno, contorno, sombra y demás efectos).

### FASE 3
- contorno;
- contorno degradado;
- múltiples contornos.

### FASE 4
- sombra;
- sombra degradada;
- sombra interna;
- glow.

### FASE 5
- bisel;
- 3D;
- extrusión.

### FASE 6
- curvatura;
- texto circular;
- texto sobre curva.

### FASE 7
- deformación mediante puntos;
- Bézier;
- deformación libre.

### FASE 8
- capas;
- múltiples textos independientes dentro del mismo diseño;
- Ctrl + D para duplicar el texto seleccionado;
- undo/redo;
- guardado;
- plantillas;
- botones de conversión de texto: MAYÚSCULAS, minúsculas, Primera Letra De Cada Palabra, Primera letra de la oración y aLTERNAR mAYÚSCULAS (ver sección 5);
- disponibilidad de la herramienta de rotación GENERAL debajo del panel, visible mientras se editan curvas/deformaciones (ver sección 20A).

### FASE 9
- PNG de alta resolución;
- SVG;
- PDF si es viable;
- transparencia;
- renderizado final de máxima calidad.

### FASE 10 — EDITOR DE IMÁGENES
- importar imágenes;
- previsualización;
- brillo;
- contraste;
- saturación;
- nitidez;
- exposición y ajustes adicionales;
- desenfoque gaussiano;
- desenfoque general;
- escala de grises;
- monocromático;
- sepia;
- inversión;
- viñeta;
- granulado/grain con intensidad, tamaño y controles adicionales;
- Lens Blur / Bokeh con radio, Lightness/Luminosidad y formas de apertura circular, octogonal, rombo y triangular;
- otros filtros;
- intensidad individual de filtros;
- transformaciones;
- recorte;
- undo/redo;
- exportación de alta calidad.

### FASE 11 — GALERÍA
- galería de diseños;
- miniaturas;
- guardado persistente;
- abrir;
- duplicar;
- renombrar;
- eliminar;
- plantillas;
- importación/exportación de proyectos;
- modo noche (dark mode) para toda la interfaz del editor: tema oscuro completo (paneles, herramientas, previsualizador, galería), con selector para alternar entre modo claro/oscuro, respetando el aislamiento de estilos del módulo (sección 44) y sin afectar el resto de la aplicación.

---

# 46. RESULTADO FINAL ESPERADO

El resultado debe ser una herramienta donde pueda importar una fuente y hacer algo como:

```text
FUENTE:
MiFuente.ttf

TEXTO:
"HOLA MUNDO"

RELLENO:
Degradado
🔴 → 🟠 → 🟡 → 🟣

CONTORNO:
Degradado
🔵 → 🟣 → 🔴

SOMBRA:
Degradado
⚫ → transparente

BISEL:
Activado

3D:
Activado

CURVA:
Personalizada

INTERLETRADO:
+12

ROTACIÓN:
15°

ESCALA:
150%
```

Y obtener un resultado visual complejo y profesional.

---

# 47. PRINCIPIO FUNDAMENTAL

Quiero que pienses en este proyecto como un **mini editor gráfico/vectorial especializado en tipografía**, no como un simple generador de texto.

La prioridad es:

1. Control creativo.
2. Calidad visual.
3. Flexibilidad.
4. Edición no destructiva cuando sea posible.
5. Alta calidad de exportación.
6. Buena experiencia de usuario.
7. Arquitectura mantenible.
8. Compatibilidad con fuentes externas.
9. Interacción en tiempo real.
10. Capacidad de combinar múltiples efectos.

Antes de implementar, analiza la estructura de mi aplicación actual y determina dónde debe integrarse este módulo sin romper funcionalidades existentes.

Si necesitas crear nuevos archivos, hazlo de forma organizada.

Si ya existe una estructura de componentes, reutilízala cuando sea conveniente.

Al finalizar, entrega **todo el código necesario para que la herramienta funcione realmente**, no solamente ejemplos ni pseudocódigo.

También explica brevemente qué archivos fueron creados/modificados y cómo funciona cada parte importante.
