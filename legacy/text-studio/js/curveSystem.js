/* ============================================================
   CURVESYSTEM.JS — Fase 6: curvatura, texto circular y curva
   personalizada.

   Responsabilidad de este módulo: dado un `layout` (el que
   produce TextEngine.layoutText) y una configuración de curva,
   calcular para cada glifo una posición (x,y) y un ángulo de
   rotación en el ESPACIO LOCAL DEL BLOQUE (el mismo espacio en
   el que renderer.js ya coloca los glifos en línea recta), y
   construir con eso un Path2D combinado.

   Este módulo NO dibuja nada por sí mismo y no conoce el canvas
   real: solo geometría. renderer.js decide cuándo usar
   `buildCurvedBlockPath` en lugar del `buildBlockPath` recto.

   Fase 7: `buildCurvedBlockPath` acepta ahora un parámetro opcional
   `deform` (ver deformSystem.js). Si está activo, además de colocar
   cada glifo sobre la curva, se le aplica también la malla de
   deformación libre — de forma que curvatura y deformación por
   puntos se pueden combinar. La malla de referencia se calcula
   siempre sobre la posición "recta" (sin curvar) de cada punto del
   glifo, para que sea consistente con la que ve/edita el usuario.

   Tres modos:
   - 'arc'    → curvatura simple tipo "arco" (como un texto que
                sonríe o frunce el ceño).
   - 'circle' → texto sobre una circunferencia completa o parcial,
                con ángulo inicial/final, dirección, radio,
                separación entre letras y orientación interior/
                exterior.
   - 'custom' → el usuario dibuja una curva con puntos de control
                (rectas o curva suave tipo Catmull-Rom) y el texto
                la sigue automáticamente.

   Para texto multilínea, cada línea adicional se desplaza a lo
   largo de la NORMAL de la curva (perpendicular a la tangente),
   generando anillos concéntricos en 'circle' y curvas paralelas
   en 'arc'/'custom'.
   ============================================================ */

function makeDefaultCurve() {
  return {
    mode: 'none', // 'none' | 'arc' | 'circle' | 'custom'
    arc: {
      intensity: 45,     // 0-100 → curvatura/intensidad, deriva el radio efectivo
      direction: 1,       // 1 = arco hacia arriba (⌢), -1 = arco hacia abajo (⌣)
      position: 0,         // desplazamiento vertical manual adicional (px)
      invert: false,        // invierte 180° la orientación de cada letra
    },
    circle: {
      radius: 220,
      startAngle: -90,     // grados; 0° = derecha, -90° = arriba
      endAngle: 270,        // junto con startAngle define el barrido disponible
      direction: 1,          // 1 = horario, -1 = antihorario
      letterSpacing: 0,       // separación extra entre letras a lo largo del arco (px)
      orientation: 'outside',  // 'outside' (letras miran hacia afuera) | 'inside' (miran al centro)
      centerX: 0,               // desplazamiento del centro respecto al centro natural del texto
      centerY: 0,
    },
    custom: {
      curveType: 'smooth', // 'linear' | 'smooth'
      points: [],            // se inicializan la primera vez que se activa este modo
    },
  };
}

/* ---------------- Utilidades geométricas ---------------- */

function deg2rad(d) { return (d * Math.PI) / 180; }
function rad2deg(r) { return (r * 180) / Math.PI; }

/** Catmull-Rom → punto interpolado entre p1 y p2 dado t en [0,1], usando p0 y p3 como vecinos. */
function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
  const y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
  return { x, y };
}

/**
 * Genera un muestreo denso {x,y} de una polilínea a partir de puntos de
 * control, en modo recto (segmentos) o suave (Catmull-Rom).
 */
function sampleControlPoints(points, curveType, segmentsPerSpan = 28) {
  if (points.length < 2) return [{ x: 0, y: 0 }, { x: 1, y: 0 }];
  if (points.length === 2 || curveType === 'linear') {
    const pts = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      for (let s = 0; s <= segmentsPerSpan; s++) {
        const t = s / segmentsPerSpan;
        pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }
    return pts;
  }
  // Suave: Catmull-Rom con puntos "fantasma" en los extremos.
  const pts = [];
  const ext = [points[0], ...points, points[points.length - 1]];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = ext[i], p1 = ext[i + 1], p2 = ext[i + 2], p3 = ext[i + 3];
    for (let s = 0; s <= segmentsPerSpan; s++) {
      const t = s / segmentsPerSpan;
      pts.push(catmullRom(p0, p1, p2, p3, t));
    }
  }
  return pts;
}

/** A partir de un array denso de puntos, construye una estructura con longitud acumulada y un muestreador por distancia de arco. */
function buildArcLengthSampler(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    cum.push(cum[i - 1] + Math.hypot(dx, dy));
  }
  const total = cum[cum.length - 1] || 1;

  function at(s) {
    const clamped = Math.max(0, Math.min(total, s));
    // búsqueda lineal simple (arrays pequeños, ~300-800 puntos: suficientemente rápido)
    let i = 1;
    while (i < cum.length && cum[i] < clamped) i++;
    i = Math.min(i, cum.length - 1);
    const a = pts[i - 1], b = pts[i];
    const segLen = cum[i] - cum[i - 1] || 1e-6;
    const t = (clamped - cum[i - 1]) / segLen;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    return { x, y, angle };
  }

  return { total, at, pts };
}

/* ---------------- Muestreadores por modo ---------------- */

/** Modo arco: circunferencia derivada de la intensidad, cuyo radio se ajusta para que el arco tenga longitud suficiente para el texto. */
function sampleArcMode(arcCfg, layout, lineOffset) {
  const intensity = Math.max(0, Math.min(100, arcCfg.intensity));
  const desiredLen = Math.max(layout.totalWidth * 1.2, 160);

  if (intensity <= 0.5) {
    // Prácticamente recto: devolvemos una línea horizontal muy larga.
    const pts = [{ x: -desiredLen, y: arcCfg.position }, { x: desiredLen * 2, y: arcCfg.position }];
    return buildArcLengthSampler(pts);
  }

  const sweepDeg = (intensity / 100) * 150; // 0°..150°
  const sweepRad = deg2rad(sweepDeg);
  const baseRadius = desiredLen / sweepRad;
  const dirSign = arcCfg.direction >= 0 ? 1 : -1;
  const radius = Math.max(20, baseRadius + dirSign * lineOffset);

  const cx = layout.totalWidth / 2;
  // Centro por debajo del texto (arco hacia arriba) o por encima (arco hacia abajo).
  const centerAngle = dirSign === 1 ? -90 : 90;
  const cy = arcCfg.position + (dirSign === 1 ? radius : -radius);

  const steps = 220;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angleDeg = centerAngle - sweepDeg / 2 + sweepDeg * t;
    const angleRad = deg2rad(angleDeg);
    pts.push({ x: cx + Math.cos(angleRad) * radius, y: cy + Math.sin(angleRad) * radius });
  }
  return buildArcLengthSampler(pts);
}

/** Modo círculo: texto circular completo o parcial. */
function sampleCircleMode(circleCfg, layout, lineOffset) {
  const orientSign = circleCfg.orientation === 'inside' ? -1 : 1;
  const radius = Math.max(20, circleCfg.radius + orientSign * lineOffset);
  const cx = layout.totalWidth / 2 + circleCfg.centerX;
  const cy = layout.totalHeight / 2 + circleCfg.centerY;
  const dir = circleCfg.direction >= 0 ? 1 : -1;

  let sweepDeg = circleCfg.endAngle - circleCfg.startAngle;
  if (Math.abs(sweepDeg) < 1) sweepDeg = 360;

  const steps = Math.max(60, Math.round(Math.abs(sweepDeg)));
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angleDeg = circleCfg.startAngle + dir * Math.abs(sweepDeg) * t;
    const angleRad = deg2rad(angleDeg);
    pts.push({ x: cx + Math.cos(angleRad) * radius, y: cy + Math.sin(angleRad) * radius });
  }
  return buildArcLengthSampler(pts);
}

/** Modo curva personalizada: puntos de control (recta o suave), con offset perpendicular por línea. */
function sampleCustomMode(customCfg, layout, lineOffset) {
  const base = sampleControlPoints(customCfg.points, customCfg.curveType);
  if (Math.abs(lineOffset) < 0.01) return buildArcLengthSampler(base);

  // Desplaza cada punto muestreado a lo largo de su normal local (curva paralela aproximada).
  const offset = base.map((p, i) => {
    const prev = base[Math.max(0, i - 1)];
    const next = base[Math.min(base.length - 1, i + 1)];
    const tangent = { x: next.x - prev.x, y: next.y - prev.y };
    const len = Math.hypot(tangent.x, tangent.y) || 1;
    const nx = -tangent.y / len;
    const ny = tangent.x / len;
    return { x: p.x + nx * lineOffset, y: p.y + ny * lineOffset };
  });
  return buildArcLengthSampler(offset);
}

function getSampler(mode, cfg, layout, lineOffset) {
  if (mode === 'circle') return sampleCircleMode(cfg.circle, layout, lineOffset);
  if (mode === 'custom') return sampleCustomMode(cfg.custom, layout, lineOffset);
  return sampleArcMode(cfg.arc, layout, lineOffset);
}

/** Asegura que la curva personalizada tenga puntos por defecto razonables la primera vez que se activa, centrados sobre el texto actual. */
function ensureCustomDefaults(curve, layout) {
  if (curve.custom.points && curve.custom.points.length >= 2) return;
  const w = Math.max(layout.totalWidth, 120);
  const h = Math.max(layout.totalHeight, 60);
  curve.custom.points = [
    { x: w * 0.02, y: h * 0.65 },
    { x: w * 0.5, y: h * -0.15 },
    { x: w * 0.98, y: h * 0.65 },
  ];
}

/**
 * Construye el Path2D combinado de todo el bloque siguiendo la curva
 * configurada. Misma firma de retorno que Renderer.buildBlockPath.
 *
 * @param {object} [deform] Configuración de deformación libre (Fase 7,
 *   ver deformSystem.js). Si `deform.enabled` es true, se combina con
 *   la curva: cada punto del contorno de cada glifo se desplaza según
 *   la malla, usando como referencia "en reposo" la posición que ese
 *   punto tendría en el layout recto (antes de curvar).
 */
function buildCurvedBlockPath(layout, curve, deform) {
  const combined = new Path2D();
  const mode = curve.mode;
  const useDeform = !!(deform && deform.enabled && deform.points && window.DeformSystem && window.PathUtils);

  for (const line of layout.lines) {
    // lineOffset: distancia de esta línea respecto a la línea base (0 = primera línea).
    const lineOffset = line.baselineY;
    const sampler = getSampler(mode, curve, layout, lineOffset);
    const invert = mode === 'arc' ? !!curve.arc.invert : false;
    const insideOrientation = mode === 'circle' && curve.circle.orientation === 'inside';
    const letterSpacing = mode === 'circle' ? curve.circle.letterSpacing || 0 : 0;

    // Ancho total de la línea incluyendo la separación extra entre letras (solo modo círculo).
    const extraTotal = letterSpacing * Math.max(0, line.glyphs.length - 1);
    const lineLen = line.width + extraTotal;

    // Reutilizamos la alineación horizontal ya calculada por TextEngine
    // (line.offsetX, según block.align: left/center/right) para decidir en
    // qué proporción de la curva empieza esta línea — así "Alineación" del
    // panel de texto también controla dónde arranca el texto sobre la curva.
    const denom = Math.max(1, layout.totalWidth - line.width);
    const proportion = layout.totalWidth > 0 ? Math.max(0, Math.min(1, (line.offsetX || 0) / denom)) : 0.5;
    const s0 = (sampler.total - lineLen) * proportion;

    // Posición "recta" (sin curvar) de referencia para esta línea — la
    // misma que usaría Renderer.buildBlockPath — necesaria para muestrear
    // la malla de deformación en un espacio estable e independiente de la curva.
    const straightOriginX = line.offsetX || 0;
    const straightBaseY = line.baselineY + layout.ascender;

    let cursor = s0;
    for (const g of line.glyphs) {
      const mid = cursor + g.advance / 2;
      const p = sampler.at(mid);
      const rotation = p.angle + (invert ? Math.PI : 0) + (insideOrientation ? Math.PI : 0);

      const matrix = new DOMMatrix()
        .translate(p.x, p.y)
        .rotate(rad2deg(rotation))
        .translate(-g.advance / 2, 0);

      if (useDeform) {
        const restOriginX = straightOriginX + g.x;
        const mapped = g.path.commands.map((cmd) => PathUtils.mapCommand(cmd, (px, py) => {
          const curved = matrix.transformPoint(new DOMPoint(px, py));
          const restX = restOriginX + px;
          const restY = straightBaseY + py;
          const d = DeformSystem.sampleDisplacement(deform, layout, restX, restY);
          return { x: curved.x + d.dx, y: curved.y + d.dy };
        }));
        PathUtils.appendCommandsToPath2D(combined, mapped);
      } else {
        const glyphPath2D = new Path2D(g.path.toPathData(3));
        combined.addPath(glyphPath2D, matrix);
      }
      cursor += g.advance + letterSpacing;
    }
  }
  return combined;
}

/** Muestreo de la "columna vertebral" (línea 0) de la curva actual, útil para dibujar una guía visual en el editor. */
function getGuideSamples(layout, curve, count = 140) {
  const sampler = getSampler(curve.mode, curve, layout, 0);
  const pts = [];
  for (let i = 0; i <= count; i++) {
    const s = (sampler.total * i) / count;
    const p = sampler.at(s);
    pts.push({ x: p.x, y: p.y });
  }
  return pts;
}

window.CurveSystem = {
  makeDefaultCurve,
  buildCurvedBlockPath,
  ensureCustomDefaults,
  getGuideSamples,
  sampleControlPoints,
};
