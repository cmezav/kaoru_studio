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

function getBaseColor(colors, baseHex = null){
  if(/^#[0-9a-fA-F]{6}$/.test(String(baseHex || ''))) return baseHex;
  const safe = Array.isArray(colors) ? colors : [];
  // The detailed Light Lab palette stores "Base principal" at index 6.
  return safe[6] || safe[0] || '#4B362B';
}

function getHairPalette(colors, baseHex = null){
  const safe = Array.isArray(colors) ? colors : [];
  const base = getBaseColor(safe, baseHex);
  const fallback = [
    mixHex(base, '#050308', 0.78),
    mixHex(base, '#0b0710', 0.66),
    mixHex(base, '#17101d', 0.50),
    mixHex(base, '#281c31', 0.34),
    mixHex(base, '#6f78b8', 0.18),
    mixHex(base, '#25182d', 0.14),
    base,
    mixHex(base, '#d77b57', 0.18),
    mixHex(base, '#d89283', 0.22),
    mixHex(base, '#ffffff', 0.20),
    mixHex(base, '#ffffff', 0.34),
    mixHex(base, '#ffffff', 0.48),
    mixHex(base, '#ffffff', 0.64),
    mixHex(base, '#ffffff', 0.80),
    mixHex(base, '#ff9b72', 0.46),
    mixHex(base, '#9ecbff', 0.52)
  ];
  return fallback.map((value, index) => hexToRgb(safe[index] || value));
}

function mixRgb(a, b, amount){
  const t = clamp(amount);
  return {
    r:a.r + (b.r - a.r) * t,
    g:a.g + (b.g - a.g) * t,
    b:a.b + (b.b - a.b) * t
  };
}

function paletteColorAt(palette, position){
  const value = clamp(position, 0, palette.length - 1);
  const low = Math.floor(value);
  const high = Math.min(palette.length - 1, low + 1);
  return mixRgb(palette[low], palette[high], value - low);
}

function percent(value, fallback = 0){
  const number = Number(value);
  return clamp(Number.isFinite(number) ? number / 100 : fallback);
}

function tintGrayscaleMask(maskCanvas, colors, baseHex){
  const width = maskCanvas.width;
  const height = maskCanvas.height;
  const source = maskCanvas.getContext('2d', { willReadFrequently:true }).getImageData(0, 0, width, height);
  const outputCanvas = createCanvas(width, height);
  const outputContext = outputCanvas.getContext('2d');
  const output = outputContext.createImageData(width, height);
  const palette = getHairPalette(colors, baseHex);
  const base = hexToRgb(getBaseColor(colors, baseHex));

  for(let index = 0; index < source.data.length; index += 4){
    const alpha = source.data[index + 3];
    if(alpha === 0) continue;

    const luminance = (
      source.data[index] * 0.2126 +
      source.data[index + 1] * 0.7152 +
      source.data[index + 2] * 0.0722
    ) / 255;

    const pixel = index / 4;
    const x = (pixel % width) / Math.max(1, width - 1);
    const y = Math.floor(pixel / width) / Math.max(1, height - 1);
    const tone = clamp((luminance - 0.05) / 0.88);
    const strandVariation = Math.sin(x * 31 + y * 17) * 0.24;
    const shadow = clamp((0.52 - tone) / 0.52);
    const light = clamp((tone - 0.46) / 0.54);
    const strongHighlight = Math.pow(clamp((tone - 0.67) / 0.33), 2.25);
    const valueFactor = 0.42 + tone * 0.72;
    let color = {
      r:base.r * valueFactor,
      g:base.g * valueFactor,
      b:base.b * valueFactor
    };

    color = mixRgb(color, paletteColorAt(palette, 1.4 + tone * 2.2), shadow * 0.24);
    color = mixRgb(color, paletteColorAt(palette, 6 + light * 4), light * 0.18);
    color = mixRgb(color, paletteColorAt(palette, 10 + strongHighlight * 2), strongHighlight * 0.34);
    const coolWarm = clamp(x * 0.66 + y * 0.20 + strandVariation * 0.18);
    const transition = mixRgb(palette[4], palette[7], coolWarm);
    const transitionStrength = (1 - Math.abs(tone - 0.52) * 2) * 0.07;
    color = mixRgb(color, transition, clamp(transitionStrength, 0.01, 0.07));

    output.data[index] = Math.round(clamp(color.r, 0, 255));
    output.data[index + 1] = Math.round(clamp(color.g, 0, 255));
    output.data[index + 2] = Math.round(clamp(color.b, 0, 255));
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
  const lights = activeLights(lighting || {});
  const palette = Array.isArray(colors) ? colors : [];
  const atmosphere = lighting?.atmosphere?.backdrop;

  context.drawImage(tintedCanvas, 0, 0);

  if(lighting){
    const ambientStrength = percent(lighting.ambient?.intensity, 0.12);
    if(ambientStrength > 0){
      context.save();
      context.globalCompositeOperation = 'soft-light';
      context.globalAlpha = 0.08 + ambientStrength * 0.28;
      context.fillStyle = lighting.ambient?.color || '#AEB8CF';
      context.fillRect(0, 0, width, height);
      context.restore();
    }

    if(atmosphere){
      const environment = context.createLinearGradient(0, 0, width, height);
      environment.addColorStop(0, rgba(atmosphere.top || '#7FAED0', 0.54));
      environment.addColorStop(0.48, rgba(atmosphere.mid || '#AAB7C0', 0.34));
      environment.addColorStop(1, rgba(atmosphere.bottom || '#6E7778', 0.48));
      context.save();
      context.globalCompositeOperation = 'soft-light';
      context.globalAlpha = 0.24;
      context.fillStyle = environment;
      context.fillRect(0, 0, width, height);
      context.restore();

      const accent = context.createRadialGradient(
        width * 0.24, height * 0.20, 0,
        width * 0.24, height * 0.20, Math.max(width, height) * 0.78
      );
      accent.addColorStop(0, rgba(atmosphere.accent || '#ffffff', 0.16));
      accent.addColorStop(0.46, rgba(atmosphere.accent || '#ffffff', 0.045));
      accent.addColorStop(1, rgba(atmosphere.accent || '#ffffff', 0));
      context.save();
      context.globalCompositeOperation = 'screen';
      context.fillStyle = accent;
      context.fillRect(0, 0, width, height);
      context.restore();
    }

    const shadowStrength = percent(lighting.shadow?.intensity, 0.30);
    if(shadowStrength > 0){
      const vector = dominantLightVector(lighting || {});
      const shadow = context.createLinearGradient(
        width * clamp(0.5 + (vector?.x ?? 0) * 0.5),
        height * clamp(0.5 + (vector?.y ?? -0.4) * 0.5),
        width * clamp(0.5 - (vector?.x ?? 0) * 0.5),
        height * clamp(0.5 - (vector?.y ?? -0.4) * 0.5)
      );
      shadow.addColorStop(0, rgba(lighting.shadow?.color || palette[1] || '#211827', 0.03));
      shadow.addColorStop(0.52, rgba(lighting.shadow?.color || palette[1] || '#211827', 0.16 * shadowStrength));
      shadow.addColorStop(1, rgba(lighting.shadow?.color || palette[1] || '#211827', 0.62 * shadowStrength));
      context.save();
      context.globalCompositeOperation = 'multiply';
      context.fillStyle = shadow;
      context.fillRect(0, 0, width, height);
      context.restore();
    }
  }

  lights.slice(0, 8).forEach((light, index) => {
    const direction = Number(light.direction || 0) * Math.PI / 180;
    const elevation = Number(light.elevation || 0) * Math.PI / 180;
    const x = clamp(0.5 + Math.sin(direction) * 0.46, 0.04, 0.96);
    const y = clamp(0.52 - Math.sin(elevation) * 0.46, 0.03, 0.97);
    const intensity = percent(light.intensity, 0.55);
    const softness = percent(light.softness, 0.40);
    const radius = Math.max(width, height) * (0.25 + softness * 0.58 + index * 0.025);
    const glow = context.createRadialGradient(width * x, height * y, 0, width * x, height * y, radius);
    glow.addColorStop(0, rgba(light.color || '#ffffff', 0.06 + 0.29 * intensity));
    glow.addColorStop(0.28, rgba(light.color || '#ffffff', 0.025 + 0.15 * intensity));
    glow.addColorStop(0.64, rgba(light.color || '#ffffff', 0.025 * intensity));
    glow.addColorStop(1, rgba(light.color || '#ffffff', 0));
    context.save();
    context.globalCompositeOperation = 'screen';
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
    context.restore();
  });

  if(lighting){
    const bounceStrength = percent(lighting.bounce?.intensity, 0.10);
    if(bounceStrength > 0){
      const bounceColor = lighting.bounce?.color || palette[14] || '#D19B83';
      const bounce = context.createRadialGradient(
        width * 0.5, height * 1.02, 0,
        width * 0.5, height * 1.02, Math.max(width, height) * 0.72
      );
      bounce.addColorStop(0, rgba(bounceColor, 0.035 + bounceStrength * 0.30));
      bounce.addColorStop(0.48, rgba(bounceColor, bounceStrength * 0.11));
      bounce.addColorStop(1, rgba(bounceColor, 0));
      context.save();
      context.globalCompositeOperation = 'screen';
      context.fillStyle = bounce;
      context.fillRect(0, 0, width, height);
      context.restore();
    }

    const rimStrength = percent(lighting.rim?.intensity, 0.08);
    if(rimStrength > 0){
      const firstDirection = Number(lights[0]?.direction || 0);
      const rimFromRight = firstDirection <= 0;
      const rim = context.createLinearGradient(
        rimFromRight ? width : 0, 0,
        rimFromRight ? width * 0.54 : width * 0.46, 0
      );
      const rimColor = lighting.rim?.color || palette[15] || '#D8E8FF';
      rim.addColorStop(0, rgba(rimColor, 0.08 + rimStrength * 0.46));
      rim.addColorStop(0.34, rgba(rimColor, rimStrength * 0.15));
      rim.addColorStop(1, rgba(rimColor, 0));
      context.save();
      context.globalCompositeOperation = 'screen';
      context.fillStyle = rim;
      context.fillRect(0, 0, width, height);
      context.restore();
    }

    const effect = atmosphere?.effect || lighting.projector;
    const rawOpacity = Number(effect?.opacity || 0);
    const effectOpacity = rawOpacity > 1 ? clamp(rawOpacity / 100) : clamp(rawOpacity);
    if(effect && effect.type && effect.type !== 'none' && effectOpacity > 0){
      context.save();
      context.globalCompositeOperation = 'screen';
      context.globalAlpha = effectOpacity * 0.38;
      if(effect.type === 'split' || effect.type === 'neon' || effect.type === 'rainbow'){
        const split = context.createLinearGradient(0, 0, width, 0);
        split.addColorStop(0, effect.colorA || atmosphere?.accent || '#38BDF8');
        split.addColorStop(0.48, 'rgba(255,255,255,0)');
        split.addColorStop(0.52, 'rgba(255,255,255,0)');
        split.addColorStop(1, effect.colorB || '#F472B6');
        context.fillStyle = split;
        context.fillRect(0, 0, width, height);
      }else{
        const effectGlow = context.createRadialGradient(
          width * (0.5 + Number(effect.offsetX || 0) / 200),
          height * (0.5 + Number(effect.offsetY || 0) / 200),
          0,
          width * 0.5, height * 0.5, Math.max(width, height) * 0.68
        );
        effectGlow.addColorStop(0, effect.colorA || atmosphere?.accent || '#ffffff');
        effectGlow.addColorStop(0.58, rgba(effect.colorB || effect.colorA || '#ffffff', 0.18));
        effectGlow.addColorStop(1, 'rgba(255,255,255,0)');
        context.fillStyle = effectGlow;
        context.fillRect(0, 0, width, height);
      }
      context.restore();
    }
  }

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

export function renderCompleteHairAsset(ctx, width, height, colors, lighting, textureId = '1b', studyMode = 'render', hairView = 'front', baseHex = null){
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
  const tintedCanvas = tintGrayscaleMask(maskCanvas, colors, baseHex);
  const litCanvas = applyLighting(tintedCanvas, maskCanvas, colors, lighting);

  ctx.save();
  ctx.shadowColor = rgba(mixHex(getBaseColor(colors, baseHex), '#000000', 0.72), 0.28);
  ctx.shadowBlur = Math.max(8, Math.round(Math.min(placement.dw, placement.dh) * 0.035));
  ctx.shadowOffsetY = Math.max(2, Math.round(placement.dh * 0.012));
  ctx.drawImage(litCanvas, placement.dx, placement.dy, placement.dw, placement.dh);
  ctx.restore();

  if(studyMode === 'map') drawStudyMap(ctx, placement);
}
