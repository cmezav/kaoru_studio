/* ============================================================
   DEFORMSYSTEM.JS — Fase 7: deformación del texto mediante puntos
   de control (malla libre / "free-form deformation").

   Idea general (la misma técnica que usan Illustrator "Envelope
   Distort" o Photoshop "Warp"): se define una rejilla de N×M
   puntos de control sobre el rectángulo que ocupa el texto. Por
   defecto los puntos están repartidos uniformemente (la rejilla
   "en reposo" = sin deformar). El usuario puede arrastrar CUALQUIER
   punto de la rejilla; el resto del texto se deforma en consecuencia
   mediante interpolación:

   - 'linear'  → interpolación bilineal dentro de cada celda de la
                 rejilla (esquinas rectas entre puntos, deformación
                 tipo "goma tensa").
   - 'smooth'  → interpolación bicúbica tipo Catmull-Rom (la opción
                 "Bézier" del panel): produce curvas suaves y
                 orgánicas en vez de dobleces rectos.

   Los puntos se guardan NORMALIZADOS (u,v) respecto al cuadro
   delimitador del texto (layout.totalWidth × layout.totalHeight),
   no en píxeles absolutos. Esto tiene dos ventajas:
   1) La malla se adapta automáticamente si el texto cambia de
      tamaño (nueva fuente, más texto, tamaño de letra, etc.) sin
      quedar "descuadrada" respecto al bloque.
   2) Es trivial saber cuál es la posición "en reposo" de cualquier
      punto de la superficie del texto: (u,v) = (x/w, y/h). Por eso
      basta con interpolar los puntos ACTUALES de la rejilla en ese
      (u,v) y restar la posición en reposo para obtener el
      desplazamiento que hay que aplicarle a cualquier coordenada
      del contorno de cualquier glifo.

   Este módulo es puro (sin canvas, sin DOM): solo geometría.
   renderer.js y curveSystem.js son quienes, punto a punto, piden
   `sampleDisplacement(...)` y suman el resultado a la coordenada
   final de cada comando de la ruta del glifo (ver pathUtils.js).
   main.js es quien dibuja la rejilla en el lienzo y gestiona el
   arrastre de los puntos con el ratón/dedo.
   ============================================================ */

function makeDefaultDeform() {
  return {
    enabled: false,
    rows: 3,
    cols: 3,
    interpolation: 'linear', // 'linear' | 'smooth'
    points: null, // Array<{u,v}> de longitud rows*cols, fila por fila (row-major)
  };
}

function clampIndex(i, n) {
  return Math.max(0, Math.min(n - 1, i));
}

/** Posición "en reposo" (sin deformar) del punto (i,j) de una rejilla rows×cols. */
function restUV(i, j, cols, rows) {
  return {
    u: cols > 1 ? i / (cols - 1) : 0.5,
    v: rows > 1 ? j / (rows - 1) : 0.5,
  };
}

function buildRestPoints(rows, cols) {
  const pts = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) pts.push(restUV(i, j, cols, rows));
  }
  return pts;
}

/** Se asegura de que exista una rejilla válida (la crea "en reposo" la primera vez). */
function ensureDeformDefaults(deform) {
  const needed = deform.rows * deform.cols;
  if (!deform.points || deform.points.length !== needed) {
    deform.points = buildRestPoints(deform.rows, deform.cols);
  }
}

/** Deja la rejilla actual completamente plana (sin deformación), conservando rows/cols. */
function resetDeform(deform) {
  deform.points = buildRestPoints(deform.rows, deform.cols);
}

/**
 * Cambia la densidad de la rejilla (más o menos filas/columnas),
 * intentando CONSERVAR la forma ya deformada: cada nuevo punto se
 * obtiene interpolando bilinealmente sobre la rejilla anterior en
 * su posición "en reposo" correspondiente, en vez de simplemente
 * resetear la malla a plano.
 */
function resampleGrid(deform, newRows, newCols) {
  const oldPoints = deform.points;
  const oldRows = deform.rows;
  const oldCols = deform.cols;
  const canResample = oldPoints && oldPoints.length === oldRows * oldCols && oldRows > 1 && oldCols > 1;

  const newPoints = [];
  for (let j = 0; j < newRows; j++) {
    for (let i = 0; i < newCols; i++) {
      const rest = restUV(i, j, newCols, newRows);
      if (canResample) {
        const gx = rest.u * (oldCols - 1);
        const gy = rest.v * (oldRows - 1);
        newPoints.push(bilinearAtUV(oldPoints, oldRows, oldCols, gx, gy));
      } else {
        newPoints.push(rest);
      }
    }
  }
  deform.rows = newRows;
  deform.cols = newCols;
  deform.points = newPoints;
}

/** Interpolación bilineal de (u,v) sobre la rejilla, en coordenadas de rejilla continuas (gx,gy). */
function bilinearAtUV(points, rows, cols, gx, gy) {
  const i0 = clampIndex(Math.floor(gx), cols);
  const i1 = clampIndex(i0 + 1, cols);
  const j0 = clampIndex(Math.floor(gy), rows);
  const j1 = clampIndex(j0 + 1, rows);
  const tx = gx - Math.floor(gx);
  const ty = gy - Math.floor(gy);
  const P = (i, j) => points[j * cols + i];
  const a = P(i0, j0), b = P(i1, j0), c = P(i0, j1), d = P(i1, j1);
  const top = { u: a.u + (b.u - a.u) * tx, v: a.v + (b.v - a.v) * tx };
  const bot = { u: c.u + (d.u - c.u) * tx, v: c.v + (d.v - c.v) * tx };
  return { u: top.u + (bot.u - top.u) * ty, v: top.v + (bot.v - top.v) * ty };
}

/** Catmull-Rom 1D (mismo esquema que curveSystem.js) para un escalar dados 4 puntos y t en [0,1]. */
function catmullRom1D(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/** Interpolación bicúbica (Catmull-Rom separable) — la opción "Suave (Bézier)" del panel. */
function smoothAtUV(points, rows, cols, gx, gy) {
  const i1 = clampIndex(Math.floor(gx), cols);
  const j1 = clampIndex(Math.floor(gy), rows);
  const tx = gx - Math.floor(gx);
  const ty = gy - Math.floor(gy);
  const P = (i, j) => points[clampIndex(j, rows) * cols + clampIndex(i, cols)];

  const rowsInterp = [];
  for (let dj = -1; dj <= 2; dj++) {
    const j = j1 + dj;
    const p0 = P(i1 - 1, j), p1 = P(i1, j), p2 = P(i1 + 1, j), p3 = P(i1 + 2, j);
    rowsInterp.push({
      u: catmullRom1D(p0.u, p1.u, p2.u, p3.u, tx),
      v: catmullRom1D(p0.v, p1.v, p2.v, p3.v, tx),
    });
  }
  return {
    u: catmullRom1D(rowsInterp[0].u, rowsInterp[1].u, rowsInterp[2].u, rowsInterp[3].u, ty),
    v: catmullRom1D(rowsInterp[0].v, rowsInterp[1].v, rowsInterp[2].v, rowsInterp[3].v, ty),
  };
}

/**
 * Punto central de la API: dado un punto (x,y) EN REPOSO (es decir, la
 * posición que ese punto tendría sin ninguna deformación, en el mismo
 * espacio local que `layout`), devuelve el desplazamiento {dx,dy} que
 * hay que sumarle por culpa de la rejilla actual.
 */
function sampleDisplacement(deform, layout, x, y) {
  const w = Math.max(layout.totalWidth, 1e-6);
  const h = Math.max(layout.totalHeight, 1e-6);
  const u = Math.max(0, Math.min(1, x / w));
  const v = Math.max(0, Math.min(1, y / h));
  const gx = deform.cols > 1 ? u * (deform.cols - 1) : 0;
  const gy = deform.rows > 1 ? v * (deform.rows - 1) : 0;

  const warped = deform.interpolation === 'smooth'
    ? smoothAtUV(deform.points, deform.rows, deform.cols, gx, gy)
    : bilinearAtUV(deform.points, deform.rows, deform.cols, gx, gy);

  return { dx: warped.u * w - x, dy: warped.v * h - y };
}

/** Posición actual (en píxeles, espacio local del bloque) del punto de rejilla `idx`, dado el layout actual. */
function pointToLocal(deform, layout, idx) {
  const p = deform.points[idx];
  return { x: p.u * layout.totalWidth, y: p.v * layout.totalHeight };
}

/** Actualiza el punto de rejilla `idx` a partir de una posición en píxeles (espacio local del bloque). */
function setPointFromLocal(deform, layout, idx, x, y) {
  const w = Math.max(layout.totalWidth, 1e-6);
  const h = Math.max(layout.totalHeight, 1e-6);
  deform.points[idx] = { u: x / w, v: y / h };
}

window.DeformSystem = {
  makeDefaultDeform,
  ensureDeformDefaults,
  resetDeform,
  resampleGrid,
  sampleDisplacement,
  pointToLocal,
  setPointFromLocal,
  buildRestPoints,
};
