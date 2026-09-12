import { activeLights, dominantLightVector } from './lightingEngine.js';
import { mixHex } from './colorUtils.js';

const TYPE_IDS = ['1a','1b','1c','2a','2b','2c','3a','3b','3c','4a','4b','4c'];
const VIEW_IDS = ['front','side','back'];
const VIEW_INDEX = { front:0, side:1, back:2 };
const sheetCache = new Map();
let rerenderQueued = false;

function clamp(v, min = 0, max = 1){
  return Math.max(min, Math.min(max, v));
}
function lerp(a, b, t){
  return a + (b - a) * t;
}
function normalizeType(id){
  const key = String(id || '1b').toLowerCase();
  return TYPE_IDS.includes(key) ? key : '1b';
}
function normalizeView(id){
  const key = String(id || 'front').toLowerCase();
  return VIEW_IDS.includes(key) ? key : 'front';
}
function rgb(hex){
  const raw = String(hex || '#777777').replace('#','').trim();
  const full = raw.length === 3 ? raw.split('').map((c)=>c+c).join('') : raw;
  if(!/^[0-9a-fA-F]{6}$/.test(full)) return { r:119, g:119, b:119 };
  return {
    r: parseInt(full.slice(0,2), 16),
    g: parseInt(full.slice(2,4), 16),
    b: parseInt(full.slice(4,6), 16)
  };
}
function rgba(hex, alpha = 1){
  const c = rgb(hex);
  return `rgba(${c.r},${c.g},${c.b},${alpha})`;
}
function normalizeColors(colors){
  const safe = Array.isArray(colors) ? colors.slice() : [];
  return [
    safe[0] || '#4B362B',
    safe[1] || mixHex(safe[0] || '#4B362B', '#ffffff', 0.16),
    safe[2] || mixHex(safe[0] || '#4B362B', '#0b0710', 0.48),
    safe[3] || mixHex(safe[0] || '#4B362B', '#ffffff', 0.42),
    safe[4] || mixHex(safe[0] || '#4B362B', '#7dd3fc', 0.12)
  ];
}
function createCanvas(width, height){
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}
function queueRefresh(){
  if(rerenderQueued) return;
  rerenderQueued = true;
  requestAnimationFrame(() => {
    rerenderQueued = false;
    window.dispatchEvent(new CustomEvent('kaoru-hair-sheet-ready'));
  });
}
function getSheetUrl(typeId){
  return `./assets/hair/${typeId}/reference-sheet.png`;
}
function ensureSheet(typeId){
  const id = normalizeType(typeId);
  const hit = sheetCache.get(id);
  if(hit) return hit;

  const entry = { status:'loading', image:null, error:null };
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    entry.status = 'ready';
    entry.image = img;
    queueRefresh();
  };
  img.onerror = () => {
    entry.status = 'error';
    entry.error = new Error(`No se pudo cargar ${id}`);
    queueRefresh();
  };
  img.src = `${getSheetUrl(id)}?v=hair-png-mask-v8-3-20260912`;
  sheetCache.set(id, entry);
  return entry;
}
function getCrop(image, viewId){
  const view = normalizeView(viewId);
  const regions = {
    front:[0.015, 0.335],
    side: [0.335, 0.665],
    back: [0.665, 0.985]
  };
  const region = regions[view] || regions.front;
  return {
    sx:Math.round(image.width * region[0]),
    sy:Math.round(image.height * 0.105),
    sw:Math.round(image.width * (region[1] - region[0])),
    sh:Math.round(image.height * 0.455)
  };
}
function getTargetBox(width, height){
  const topPad = height * 0.14;
  const sidePad = width * 0.08;
  const w = width - sidePad * 2;
  const h = height - topPad - height * 0.12;
  return {
    x: sidePad,
    y: topPad,
    w,
    h
  };
}
function drawHeader(ctx, width, height, typeId, viewId){
  const night = document.documentElement.dataset.theme === 'night';
  ctx.save();
  ctx.fillStyle = night ? 'rgba(255,255,255,.9)' : 'rgba(28,24,33,.86)';
  ctx.font = `800 ${Math.max(13, Math.round(width * 0.016))}px Inter, system-ui, sans-serif`;
  ctx.fillText(`CABELLO ${String(typeId).toUpperCase()} · ${viewId === 'front' ? 'FRENTE' : viewId === 'side' ? 'COSTADO' : 'ATRÁS'}`, width * 0.03, height * 0.055);
  ctx.font = `500 ${Math.max(10, Math.round(width * 0.0105))}px Inter, system-ui, sans-serif`;
  ctx.globalAlpha = .78;
  ctx.fillText('Máscara PNG pintable + color editable + luz activa', width * 0.03, height * 0.085);
  ctx.restore();
}
function drawLoadingState(ctx, width, height, message){
  const night = document.documentElement.dataset.theme === 'night';
  ctx.save();
  ctx.fillStyle = night ? 'rgba(255,255,255,.05)' : 'rgba(20,20,26,.05)';
  ctx.strokeStyle = night ? 'rgba(255,255,255,.12)' : 'rgba(20,20,26,.12)';
  const box = getTargetBox(width, height);
  ctx.beginPath();
  ctx.roundRect(box.x, box.y, box.w, box.h, 24);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = night ? 'rgba(255,255,255,.74)' : 'rgba(36,33,41,.74)';
  ctx.font = `600 ${Math.max(12, Math.round(width * 0.013))}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(message, box.x + box.w / 2, box.y + box.h / 2);
  ctx.restore();
}
function placeReference(image, crop, width, height){
  const box = getTargetBox(width, height);
  const scale = Math.min(box.w / crop.sw, box.h / crop.sh);
  const w = crop.sw * scale;
  const h = crop.sh * scale;
  return {
    sx: crop.sx,
    sy: crop.sy,
    sw: crop.sw,
    sh: crop.sh,
    dx: box.x + (box.w - w) / 2,
    dy: box.y + (box.h - h) / 2,
    dw: w,
    dh: h
  };
}
function buildPlacedRef(image, crop, placement){
  const refCanvas = createCanvas(placement.dw, placement.dh);
  const refCtx = refCanvas.getContext('2d');
  refCtx.imageSmoothingEnabled = true;
  refCtx.drawImage(
    image,
    crop.sx, crop.sy, crop.sw, crop.sh,
    0, 0, placement.dw, placement.dh
  );
  return refCanvas;
}
function buildMaskCanvas(refCanvas){
  const w = refCanvas.width;
  const h = refCanvas.height;
  const sourceCtx = refCanvas.getContext('2d');
  const sourceData = sourceCtx.getImageData(0, 0, w, h);

  const rawCanvas = createCanvas(w, h);
  const rawCtx = rawCanvas.getContext('2d');
  const rawImage = rawCtx.createImageData(w, h);

  for(let i = 0; i < sourceData.data.length; i += 4){
    const r = sourceData.data[i];
    const g = sourceData.data[i + 1];
    const b = sourceData.data[i + 2];
    const sourceAlpha = sourceData.data[i + 3] / 255;
    const lum = r * 0.2126 + g * 0.7152 + b * 0.0722;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    const darkness = clamp((226 - lum) / 142, 0, 1);
    const redExcess = Math.max(0, r - g - 10);
    const neutralBrown = clamp(1 - redExcess / 72, 0.12, 1);
    const chromaWeight = clamp(1 - chroma / 175, 0.34, 1);
    const looksLikeSkin = r > g + 18 && g > b + 5 && lum > 82;

    let hair = darkness * neutralBrown * chromaWeight * sourceAlpha;
    if(looksLikeSkin) hair *= 0.055;
    if(lum > 222) hair = 0;
    hair = Math.pow(clamp((hair - 0.045) / 0.72, 0, 1), 0.72);

    rawImage.data[i] = 255;
    rawImage.data[i + 1] = 255;
    rawImage.data[i + 2] = 255;
    rawImage.data[i + 3] = Math.round(hair * 255);
  }
  rawCtx.putImageData(rawImage, 0, 0);

  const softenedCanvas = createCanvas(w, h);
  const softenedCtx = softenedCanvas.getContext('2d');
  const blur = Math.max(3, Math.round(Math.min(w, h) * 0.009));
  softenedCtx.filter = `blur(${blur}px)`;
  softenedCtx.globalAlpha = 0.82;
  softenedCtx.drawImage(rawCanvas, 0, 0);
  softenedCtx.filter = 'none';
  softenedCtx.globalAlpha = 0.72;
  softenedCtx.drawImage(rawCanvas, 0, 0);
  softenedCtx.globalAlpha = 1;

  const softened = softenedCtx.getImageData(0, 0, w, h);
  const maskCanvas = createCanvas(w, h);
  const maskCtx = maskCanvas.getContext('2d');
  const maskImage = maskCtx.createImageData(w, h);
  const lineCanvas = createCanvas(w, h);
  const lineCtx = lineCanvas.getContext('2d');
  const lineImage = lineCtx.createImageData(w, h);

  for(let i = 0; i < softened.data.length; i += 4){
    const maskAlpha = clamp((softened.data[i + 3] / 255 - 0.018) / 0.82, 0, 1);
    const r = sourceData.data[i];
    const g = sourceData.data[i + 1];
    const b = sourceData.data[i + 2];
    const lum = r * 0.2126 + g * 0.7152 + b * 0.0722;
    const strand = clamp((178 - lum) / 118, 0, 1) * maskAlpha;

    maskImage.data[i] = 255;
    maskImage.data[i + 1] = 255;
    maskImage.data[i + 2] = 255;
    maskImage.data[i + 3] = Math.round(Math.pow(maskAlpha, 0.78) * 255);

    lineImage.data[i] = 28;
    lineImage.data[i + 1] = 20;
    lineImage.data[i + 2] = 31;
    lineImage.data[i + 3] = Math.round(strand * 150);
  }
  maskCtx.putImageData(maskImage, 0, 0);
  lineCtx.putImageData(lineImage, 0, 0);
  return { maskCanvas, lineCanvas };
}
function drawTintedBase(ctx, w, h, colors, lightVector){
  const [base, mid, shadow, highlight, accent] = normalizeColors(colors);
  const grad = ctx.createLinearGradient(w * 0.1, h * 0.12, w * 0.85, h * 0.92);
  grad.addColorStop(0, mid);
  grad.addColorStop(0.36, base);
  grad.addColorStop(0.72, shadow);
  grad.addColorStop(1, mixHex(shadow, '#0c0a12', 0.32));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const dx = clamp((lightVector?.x ?? 0) * 0.5 + 0.5, 0.06, 0.94);
  const dy = clamp((lightVector?.y ?? -0.6) * 0.5 + 0.5, 0.05, 0.95);
  const glow = ctx.createRadialGradient(w * dx, h * dy, 0, w * dx, h * dy, Math.max(w, h) * 0.55);
  glow.addColorStop(0, rgba(highlight, 0.88));
  glow.addColorStop(0.28, rgba(accent, 0.18));
  glow.addColorStop(1, rgba(accent, 0));
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = 'multiply';
  const shadowGrad = ctx.createLinearGradient(w * (1 - dx), h * 0.1, w * dx, h * 0.9);
  shadowGrad.addColorStop(0, rgba(shadow, 0.12));
  shadowGrad.addColorStop(0.55, rgba(shadow, 0.26));
  shadowGrad.addColorStop(1, rgba('#08060b', 0.34));
  ctx.fillStyle = shadowGrad;
  ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.22;
  for(let i = 0; i < 18; i += 1){
    const t = i / 17;
    const x = lerp(w * 0.18, w * 0.78, t);
    const y = lerp(h * 0.06, h * 0.86, t * 0.96);
    const rx = w * (0.06 + (i % 4) * 0.006);
    const ry = h * (0.018 + (i % 3) * 0.004);
    ctx.fillStyle = rgba(highlight, 0.12 + (i % 5) * 0.02);
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, -0.66, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}
function applyMaskToPaint(maskCanvas, colors, lighting){
  const w = maskCanvas.width;
  const h = maskCanvas.height;
  const paintCanvas = createCanvas(w, h);
  const paintCtx = paintCanvas.getContext('2d');
  const lightVector = dominantLightVector(lighting || {});
  drawTintedBase(paintCtx, w, h, colors, lightVector);
  paintCtx.globalCompositeOperation = 'destination-in';
  paintCtx.drawImage(maskCanvas, 0, 0);
  paintCtx.globalCompositeOperation = 'source-over';
  return paintCanvas;
}
function drawLightPass(ctx, w, h, lighting){
  const lights = activeLights(lighting || {});
  if(!lights.length) return;
  ctx.save();
  lights.slice(0, 4).forEach((light, index) => {
    const px = clamp((light.position?.x ?? 0) * 0.5 + 0.5, 0.05, 0.95);
    const py = clamp((light.position?.y ?? -0.5) * 0.5 + 0.5, 0.04, 0.96);
    const spread = Math.max(w, h) * (0.26 + (light.softness ?? 0.4) * 0.45 + index * 0.03);
    const grad = ctx.createRadialGradient(w * px, h * py, 0, w * px, h * py, spread);
    grad.addColorStop(0, rgba(light.color || '#ffffff', 0.34 * (light.intensity ?? 1)));
    grad.addColorStop(0.28, rgba(light.color || '#ffffff', 0.14 * (light.intensity ?? 1)));
    grad.addColorStop(1, rgba(light.color || '#ffffff', 0));
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
  ctx.restore();
}
function drawLineArtOverlay(ctx, lineCanvas){
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.72;
  ctx.drawImage(lineCanvas, 0, 0);
  ctx.restore();
}
function drawStudyMap(ctx, placement){
  const night = document.documentElement.dataset.theme === 'night';
  const labels = [
    { text:'HIGHLIGHT', x:0.68, y:0.18 },
    { text:'LUZ MEDIA', x:0.60, y:0.36 },
    { text:'SOMBRA', x:0.23, y:0.50 },
    { text:'OCLUSIÓN', x:0.36, y:0.77 },
    { text:'RIM LIGHT', x:0.86, y:0.54 }
  ];
  ctx.save();
  labels.forEach((label) => {
    const x = placement.dx + placement.dw * label.x;
    const y = placement.dy + placement.dh * label.y;
    const pad = 7;
    ctx.font = '700 10px Inter, system-ui, sans-serif';
    const tw = ctx.measureText(label.text).width;
    ctx.fillStyle = night ? 'rgba(17,16,24,.84)' : 'rgba(255,255,255,.84)';
    ctx.strokeStyle = night ? 'rgba(255,255,255,.18)' : 'rgba(22,18,30,.12)';
    ctx.beginPath();
    ctx.roundRect(x - pad, y - 11, tw + pad * 2, 22, 11);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = night ? '#ffffff' : '#271d2b';
    ctx.fillText(label.text, x, y + 4);
  });
  ctx.restore();
}

export function renderCompleteHairAsset(ctx, width, height, colors, lighting, textureId = '1b', studyMode = 'render', hairView = 'front'){
  const typeId = normalizeType(textureId);
  const viewId = normalizeView(hairView);
  const entry = ensureSheet(typeId);

  drawHeader(ctx, width, height, typeId, viewId);

  if(entry.status === 'loading'){
    drawLoadingState(ctx, width, height, 'Cargando referencia PNG del cabello...');
    return;
  }
  if(entry.status === 'error' || !entry.image){
    drawLoadingState(ctx, width, height, 'No se pudo cargar la referencia PNG.');
    return;
  }

  const crop = getCrop(entry.image, viewId);
  const placement = placeReference(entry.image, crop, width, height);
  const refCanvas = buildPlacedRef(entry.image, crop, placement);
  const { maskCanvas, lineCanvas } = buildMaskCanvas(refCanvas);
  const paintCanvas = applyMaskToPaint(maskCanvas, colors, lighting);
  const litCanvas = createCanvas(maskCanvas.width, maskCanvas.height);
  const litCtx = litCanvas.getContext('2d');

  litCtx.drawImage(paintCanvas, 0, 0);
  drawLightPass(litCtx, litCanvas.width, litCanvas.height, lighting);
  litCtx.globalCompositeOperation = 'destination-in';
  litCtx.drawImage(maskCanvas, 0, 0);
  litCtx.globalCompositeOperation = 'source-over';
  drawLineArtOverlay(litCtx, lineCanvas);

  ctx.save();
  ctx.shadowColor = rgba(normalizeColors(colors)[2], 0.22);
  ctx.shadowBlur = Math.max(10, Math.round(Math.min(placement.dw, placement.dh) * 0.045));
  ctx.shadowOffsetY = Math.max(3, Math.round(placement.dh * 0.015));
  ctx.drawImage(litCanvas, placement.dx, placement.dy, placement.dw, placement.dh);
  ctx.restore();

  if(studyMode === 'map'){
    drawStudyMap(ctx, placement);
  }
}