import { activeLights, dominantLightVector } from './lightingEngine.js';
import { mixHex } from './colorUtils.js';

const TYPE_IDS = ['1a','1b','1c','2a','2b','2c','3a','3b','3c','4a','4b','4c'];
const VIEW_IDS = ['front','side','back'];
const VIEW_INDEX = { front:0, side:1, back:2 };
const sheetCache = new Map();
let rerenderQueued = false;

function clamp(value, min = 0, max = 1){
  return Math.max(min, Math.min(max, value));
}

function normalizeType(id){
  const key = String(id || '1b').toLowerCase();
  return TYPE_IDS.includes(key) ? key : '1b';
}

function normalizeView(id){
  const key = String(id || 'front').toLowerCase();
  return VIEW_IDS.includes(key) ? key : 'front';
}

function hexToRgb(hex){
  const raw = String(hex || '#777777').replace('#','').trim();
  const full = raw.length === 3 ? raw.split('').map((part) => part + part).join('') : raw;
  if(!/^[0-9a-fA-F]{6}$/.test(full)) return { r:119, g:119, b:119 };
  return {
    r:parseInt(full.slice(0,2), 16),
    g:parseInt(full.slice(2,4), 16),
    b:parseInt(full.slice(4,6), 16)
  };
}

function rgba(hex, alpha = 1){
  const color = hexToRgb(hex);
  return `rgba(${color.r},${color.g},${color.b},${alpha})`;
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
  return `./assets/hair/${typeId}/mask-sheet-v2.png`;
}

function ensureSheet(typeId){
  const id = normalizeType(typeId);
  const cached = sheetCache.get(id);
  if(cached) return cached;

  const entry = { status:'loading', image:null };
  const image = new Image();
  image.decoding = 'async';
  image.onload = () => {
    entry.status = 'ready';
    entry.image = image;
    queueRefresh();
  };
  image.onerror = () => {
    entry.status = 'error';
    queueRefresh();
  };
  image.src = `${getSheetUrl(id)}?v=hair-masks-v9-20260913`;
  sheetCache.set(id, entry);
  return entry;
}

function getCrop(image, viewId){
  const index = VIEW_INDEX[normalizeView(viewId)];
  const third = image.width / 3;
  return { sx:third * index, sy:0, sw:third, sh:image.height };
}

function getTargetBox(width, height){
  return { x:width * 0.055, y:height * 0.12, w:width * 0.89, h:height * 0.79 };
}

function placeCrop(crop, width, height){
  const box = getTargetBox(width, height);
  const scale = Math.min(box.w / crop.sw, box.h / crop.sh);
  const w = crop.sw * scale;
  const h = crop.sh * scale;
  return {
    dx:box.x + (box.w - w) / 2,
    dy:box.y + (box.h - h) / 2,
    dw:w,
    dh:h
  };
}

function buildViewCanvas(image, crop, placement){
  const canvas = createCanvas(placement.dw, placement.dh);
  const context = canvas.getContext('2d', { willReadFrequently:true });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function getBaseColor(colors){
  const safe = Array.isArray(colors) ? colors : [];
  // The detailed Light Lab palette stores "Base principal" at index 6.
  return safe[6] || safe[0] || '#4B362B';
}

function tintGrayscaleMask(maskCanvas, colors){
  const width = maskCanvas.width;
  const height = maskCanvas.height;
  const source = maskCanvas.getContext('2d', { willReadFrequently:true }).getImageData(0, 0, width, height);
  const outputCanvas = createCanvas(width, height);
  const outputContext = outputCanvas.getContext('2d');
  const output = outputContext.createImageData(width, height);
  const base = hexToRgb(getBaseColor(colors));

  for(let index = 0; index < source.data.length; index += 4){
    const alpha = source.data[index + 3];
    if(alpha === 0) continue;

    const luminance = (
      source.data[index] * 0.2126 +
      source.data[index + 1] * 0.7152 +
      source.data[index + 2] * 0.0722
    ) / 255;

    let red;
    let green;
    let blue;
    if(luminance < 0.5){
      const factor = 0.24 + luminance * 1.52;
      red = base.r * factor;
      green = base.g * factor;
      blue = base.b * factor;
    }else{
      const highlight = clamp((luminance - 0.5) * 1.35, 0, 0.68);
      red = base.r + (255 - base.r) * highlight;
      green = base.g + (255 - base.g) * highlight;
      blue = base.b + (255 - base.b) * highlight;
    }

    output.data[index] = Math.round(clamp(red, 0, 255));
    output.data[index + 1] = Math.round(clamp(green, 0, 255));
    output.data[index + 2] = Math.round(clamp(blue, 0, 255));
    output.data[index + 3] = alpha;
  }

  outputContext.putImageData(output, 0, 0);
  return outputCanvas;
}

function applyLighting(tintedCanvas, maskCanvas, colors, lighting){
  const width = tintedCanvas.width;
  const height = tintedCanvas.height;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  const base = getBaseColor(colors);
  const vector = dominantLightVector(lighting || {});
  const lights = activeLights(lighting || {});

  context.drawImage(tintedCanvas, 0, 0);

  const keyX = clamp((vector?.x ?? 0) * 0.5 + 0.5, 0.05, 0.95);
  const keyY = clamp((vector?.y ?? -0.5) * 0.5 + 0.5, 0.04, 0.96);
  const key = context.createRadialGradient(
    width * keyX, height * keyY, 0,
    width * keyX, height * keyY, Math.max(width, height) * 0.68
  );
  key.addColorStop(0, rgba(mixHex(base, '#ffffff', 0.72), 0.28));
  key.addColorStop(0.42, rgba(base, 0.05));
  key.addColorStop(1, rgba(base, 0));
  context.globalCompositeOperation = 'screen';
  context.fillStyle = key;
  context.fillRect(0, 0, width, height);

  lights.slice(0, 4).forEach((light) => {
    const x = clamp((light.position?.x ?? 0) * 0.5 + 0.5, 0.04, 0.96);
    const y = clamp((light.position?.y ?? -0.5) * 0.5 + 0.5, 0.03, 0.97);
    const intensity = clamp(Number(light.intensity ?? 1), 0, 3);
    const radius = Math.max(width, height) * (0.32 + clamp(light.softness ?? 0.45) * 0.42);
    const glow = context.createRadialGradient(width * x, height * y, 0, width * x, height * y, radius);
    glow.addColorStop(0, rgba(light.color || '#ffffff', 0.22 * intensity));
    glow.addColorStop(0.35, rgba(light.color || '#ffffff', 0.08 * intensity));
    glow.addColorStop(1, rgba(light.color || '#ffffff', 0));
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
  });

  context.globalCompositeOperation = 'destination-in';
  context.drawImage(maskCanvas, 0, 0);
  context.globalCompositeOperation = 'source-over';
  return canvas;
}

function drawHeader(ctx, width, height, typeId, viewId){
  const night = document.documentElement.dataset.theme === 'night';
  const viewLabel = viewId === 'front' ? 'FRENTE' : viewId === 'side' ? 'COSTADO' : 'ATRAS';
  ctx.save();
  ctx.fillStyle = night ? 'rgba(255,255,255,.92)' : 'rgba(28,24,33,.88)';
  ctx.font = `800 ${Math.max(13, Math.round(width * 0.016))}px Inter, system-ui, sans-serif`;
  ctx.fillText(`CABELLO ${typeId.toUpperCase()} - ${viewLabel}`, width * 0.03, height * 0.055);
  ctx.globalAlpha = 0.76;
  ctx.font = `500 ${Math.max(10, Math.round(width * 0.0105))}px Inter, system-ui, sans-serif`;
  ctx.fillText('Mascara gris transparente + color editable + luz activa', width * 0.03, height * 0.085);
  ctx.restore();
}

function drawLoadingState(ctx, width, height, message){
  const night = document.documentElement.dataset.theme === 'night';
  const box = getTargetBox(width, height);
  ctx.save();
  ctx.fillStyle = night ? 'rgba(255,255,255,.05)' : 'rgba(20,20,26,.05)';
  ctx.strokeStyle = night ? 'rgba(255,255,255,.12)' : 'rgba(20,20,26,.12)';
  ctx.beginPath();
  if(typeof ctx.roundRect === 'function') ctx.roundRect(box.x, box.y, box.w, box.h, 24);
  else ctx.rect(box.x, box.y, box.w, box.h);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = night ? 'rgba(255,255,255,.74)' : 'rgba(36,33,41,.74)';
  ctx.font = `600 ${Math.max(12, Math.round(width * 0.013))}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(message, box.x + box.w / 2, box.y + box.h / 2);
  ctx.restore();
}

function drawStudyMap(ctx, placement){
  const night = document.documentElement.dataset.theme === 'night';
  const labels = [
    { text:'HIGHLIGHT', x:0.67, y:0.19 },
    { text:'LUZ MEDIA', x:0.61, y:0.37 },
    { text:'SOMBRA', x:0.23, y:0.51 },
    { text:'OCLUSION', x:0.36, y:0.77 },
    { text:'RIM LIGHT', x:0.84, y:0.55 }
  ];
  ctx.save();
  labels.forEach((label) => {
    const x = placement.dx + placement.dw * label.x;
    const y = placement.dy + placement.dh * label.y;
    const pad = 7;
    ctx.font = '700 10px Inter, system-ui, sans-serif';
    const width = ctx.measureText(label.text).width;
    ctx.fillStyle = night ? 'rgba(17,16,24,.84)' : 'rgba(255,255,255,.84)';
    ctx.strokeStyle = night ? 'rgba(255,255,255,.18)' : 'rgba(22,18,30,.12)';
    ctx.beginPath();
    if(typeof ctx.roundRect === 'function') ctx.roundRect(x - pad, y - 11, width + pad * 2, 22, 11);
    else ctx.rect(x - pad, y - 11, width + pad * 2, 22);
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
    drawLoadingState(ctx, width, height, 'Cargando mascara de cabello...');
    return;
  }
  if(entry.status === 'error' || !entry.image){
    drawLoadingState(ctx, width, height, 'No se pudo cargar la mascara PNG.');
    return;
  }

  const crop = getCrop(entry.image, viewId);
  const placement = placeCrop(crop, width, height);
  const maskCanvas = buildViewCanvas(entry.image, crop, placement);
  const tintedCanvas = tintGrayscaleMask(maskCanvas, colors);
  const litCanvas = applyLighting(tintedCanvas, maskCanvas, colors, lighting);

  ctx.save();
  ctx.shadowColor = rgba(mixHex(getBaseColor(colors), '#000000', 0.72), 0.28);
  ctx.shadowBlur = Math.max(8, Math.round(Math.min(placement.dw, placement.dh) * 0.035));
  ctx.shadowOffsetY = Math.max(2, Math.round(placement.dh * 0.012));
  ctx.drawImage(litCanvas, placement.dx, placement.dy, placement.dw, placement.dh);
  ctx.restore();

  if(studyMode === 'map') drawStudyMap(ctx, placement);
}
