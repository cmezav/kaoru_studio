/* ============================================================
   FILLSYSTEM.JS — Sistema de relleno (Fase 2)
   Construye lo que el renderer necesita para pintar el texto:
   - solid  -> un color plano
   - gradient -> un CanvasGradient calculado sobre el bounding box
                 del bloque de texto, con N stops, ángulo y
                 transparencia individual por stop
   - image  -> no devuelve un fillStyle; el propio renderer dibuja
               las imágenes recortadas por el path del texto,
               porque cada imagen tiene su propia transformación
               (posición/escala/rotación/opacidad), no un color.
   Este módulo NO toca el DOM ni el canvas real: solo construye
   datos/gradientes a partir de un ctx ya existente que le pasa
   el renderer (necesario porque createLinearGradient es del ctx).
   ============================================================ */

function uidFill() {
  return 'g_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

/** Modelo por defecto de un relleno degradado. */
function makeDefaultGradient() {
  return {
    angle: 90, // 0 = izquierda->derecha, 90 = arriba->abajo
    stops: [
      { id: uidFill(), pos: 0, color: '#7c3aed', alpha: 1 },
      { id: uidFill(), pos: 100, color: '#ff5dc8', alpha: 1 },
    ],
    selectedId: null,
  };
}

/** Modelo por defecto del relleno con imágenes. */
function makeDefaultImageFill() {
  return { images: [], selectedId: null };
}

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Calcula los 4 puntos (x0,y0,x1,y1) de un gradiente lineal dado un
 * ángulo (en grados, convención tipo CSS: 0=abajo->arriba girando
 * en sentido horario... aquí usamos 0=izq->der, 90=arriba->abajo
 * por simplicidad y consistencia con el resto del editor) y un bbox.
 */
function angleToLineCoords(angleDeg, w, h) {
  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const cx = w / 2;
  const cy = h / 2;
  // Proyectamos sobre la diagonal para que el gradiente cubra bien todo el bbox
  const len = Math.abs(dx * w) + Math.abs(dy * h);
  const half = len / 2;
  return {
    x0: cx - dx * half,
    y0: cy - dy * half,
    x1: cx + dx * half,
    y1: cy + dy * half,
  };
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{angle:number, stops:Array}} gradientModel
 * @param {number} w  ancho del bbox del texto (espacio local, sin transformar)
 * @param {number} h  alto del bbox del texto
 */
function buildCanvasGradient(ctx, gradientModel, w, h) {
  const { x0, y0, x1, y1 } = angleToLineCoords(gradientModel.angle, w, h);
  const grad = ctx.createLinearGradient(x0, y0, x1, y1);
  const sorted = [...gradientModel.stops].sort((a, b) => a.pos - b.pos);
  for (const s of sorted) {
    grad.addColorStop(Math.min(1, Math.max(0, s.pos / 100)), rgba(s.color, s.alpha));
  }
  return grad;
}

/* ---------------- Cuentagotas (EyeDropper API nativa) ---------------- */

const isEyeDropperSupported = () => typeof window.EyeDropper === 'function';

async function pickColorFromScreen() {
  if (!isEyeDropperSupported()) {
    throw new Error('Tu navegador no soporta el cuentagotas nativo (EyeDropper). Prueba en Chrome/Edge recientes.');
  }
  const dropper = new window.EyeDropper();
  const result = await dropper.open();
  return result.sRGBHex;
}

/**
 * Gradiente radial centrado en el bbox, para sombras con degradado radial.
 */
function buildRadialGradient(ctx, gradientModel, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.max(w, h) / 2;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  const sorted = [...gradientModel.stops].sort((a, b) => a.pos - b.pos);
  for (const s of sorted) {
    grad.addColorStop(Math.min(1, Math.max(0, s.pos / 100)), rgba(s.color, s.alpha));
  }
  return grad;
}

/** Modelo por defecto de una sombra (paralela o interna, admite degradado lineal/radial). */
function makeDefaultShadow() {
  const gradient = makeDefaultGradient();
  gradient.stops[0].color = '#000000';
  gradient.stops[1].color = '#7c3aed';
  return {
    enabled: false,
    offsetX: 12,
    offsetY: 12,
    blur: 14,
    spread: 0,
    opacity: 0.55,
    fillType: 'solid', // 'solid' | 'gradient'
    color: '#000000',
    gradientType: 'linear', // 'linear' | 'radial'
    gradient,
  };
}

function makeDefaultInnerShadow() {
  return { enabled: false, depth: 1, offsetX: 6, offsetY: 6, blur: 10, opacity: 0.6, color: '#000000' };
}

function makeDefaultGlow() {
  return { enabled: false, color: '#7c3aed', opacity: 0.75, intensity: 2, blur: 24 };
}

function makeDefaultInnerGlow() {
  return { enabled: false, color: '#ffffff', opacity: 0.6, blur: 12 };
}

/* ---------------- Fase 5: bisel y extrusión/3D ---------------- */

/** Modelo por defecto del bisel: luz direccional (highlight + sombra) confinada al interior de las letras. */
function makeDefaultBevel() {
  return {
    enabled: false,
    angle: 135, // dirección de la luz, mismo convenio que el resto de ángulos del editor
    size: 6,
    softness: 4,
    strength: 0.6,
    highlightColor: '#ffffff',
    shadowColor: '#000000',
  };
}

/** Modelo por defecto de la extrusión/3D: copias apiladas del texto a lo largo de un ángulo. */
function makeDefaultExtrude() {
  return {
    enabled: false,
    depth: 30,
    angle: 45,
    step: 2, // separación en px entre capas: menor = más suave pero más lento
    colorMode: 'solid', // 'solid' | 'gradient'
    color: '#4b1fa8',
    colorNear: '#7c3aed',
    colorFar: '#1a0a3d',
    edgeEnabled: true,
    edgeColor: '#000000',
    edgeOpacity: 0.35,
  };
}

/** Mezcla lineal entre dos colores hex, útil para el degradado de profundidad de la extrusión. */
function mixHex(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r},${g},${bl})`;
}

window.FillSystem = {
  makeDefaultGradient,
  makeDefaultImageFill,
  makeDefaultShadow,
  makeDefaultInnerShadow,
  makeDefaultGlow,
  makeDefaultInnerGlow,
  makeDefaultBevel,
  makeDefaultExtrude,
  buildCanvasGradient,
  buildRadialGradient,
  angleToLineCoords,
  hexToRgb,
  rgba,
  mixHex,
  isEyeDropperSupported,
  pickColorFromScreen,
  uid: uidFill,
};
