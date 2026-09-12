import { activeLights, dominantLightVector } from './lightingEngine.js';
import { mixHex } from './colorUtils.js';

const PROFILES = {
  '1a': { label:'1A', family:'Liso fino', length:.79, width:.25, sway:.015, flowAmp:.012, flowFreq:.55, edgeAmp:.010, edgeFreq:2.0, ribbons:11, fibers:18, frizz:1, tip:.16 },
  '1b': { label:'1B', family:'Liso con cuerpo', length:.79, width:.29, sway:.026, flowAmp:.020, flowFreq:.72, edgeAmp:.014, edgeFreq:2.2, ribbons:12, fibers:20, frizz:2, tip:.18 },
  '1c': { label:'1C', family:'Liso grueso', length:.78, width:.33, sway:.036, flowAmp:.028, flowFreq:.86, edgeAmp:.018, edgeFreq:2.4, ribbons:13, fibers:22, frizz:2, tip:.21 },
  '2a': { label:'2A', family:'Ondulado suave', length:.78, width:.34, sway:.050, flowAmp:.050, flowFreq:1.25, edgeAmp:.025, edgeFreq:3.0, ribbons:14, fibers:22, frizz:3, tip:.23 },
  '2b': { label:'2B', family:'Ondulado', length:.77, width:.37, sway:.060, flowAmp:.075, flowFreq:1.72, edgeAmp:.032, edgeFreq:3.7, ribbons:15, fibers:23, frizz:4, tip:.25 },
  '2c': { label:'2C', family:'Ondulado profundo', length:.76, width:.40, sway:.070, flowAmp:.098, flowFreq:2.16, edgeAmp:.040, edgeFreq:4.4, ribbons:16, fibers:24, frizz:5, tip:.27 },
  '3a': { label:'3A', family:'Rizo suelto', length:.75, width:.41, sway:.070, flowAmp:.120, flowFreq:2.75, edgeAmp:.052, edgeFreq:5.0, ribbons:17, fibers:24, frizz:5, tip:.30 },
  '3b': { label:'3B', family:'Rizado', length:.73, width:.43, sway:.065, flowAmp:.145, flowFreq:3.55, edgeAmp:.060, edgeFreq:6.3, ribbons:18, fibers:25, frizz:6, tip:.33 },
  '3c': { label:'3C', family:'Rizo apretado', length:.70, width:.45, sway:.055, flowAmp:.165, flowFreq:4.65, edgeAmp:.068, edgeFreq:7.8, ribbons:20, fibers:26, frizz:7, tip:.36 },
  '4a': { label:'4A', family:'Coil definido', length:.67, width:.47, sway:.040, flowAmp:.175, flowFreq:5.7, edgeAmp:.078, edgeFreq:9.0, ribbons:21, fibers:27, frizz:8, tip:.39 },
  '4b': { label:'4B', family:'Patron Z', length:.64, width:.49, sway:.030, flowAmp:.165, flowFreq:6.9, edgeAmp:.086, edgeFreq:10.5, ribbons:22, fibers:28, frizz:9, tip:.42, zigzag:true },
  '4c': { label:'4C', family:'Zigzag denso', length:.61, width:.52, sway:.022, flowAmp:.155, flowFreq:8.2, edgeAmp:.095, edgeFreq:12.5, ribbons:24, fibers:30, frizz:10, tip:.46, zigzag:true }
};

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

function profileFor(id) {
  return PROFILES[String(id || '1b').toLowerCase()] || PROFILES['1b'];
}

function hexToRgb(hex) {
  const clean = String(hex || '#777777').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return { r:119, g:119, b:119 };
  return {
    r: parseInt(full.slice(0,2),16),
    g: parseInt(full.slice(2,4),16),
    b: parseInt(full.slice(4,6),16)
  };
}

function rgba(hex, alpha = 1) {
  const { r,g,b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function colorAt(colors, index, fallback = '#777777') {
  return colors?.[index] || colors?.[colors.length - 1] || fallback;
}

function tri(value) {
  const wrapped = ((value % 1) + 1) % 1;
  return 1 - 4 * Math.abs(wrapped - .5);
}

function geometryFor(width, height, profile) {
  const minSide = Math.min(width, height);
  const hairHeight = height * profile.length;
  return {
    cx: width * .5,
    top: height * .105,
    bottom: height * .105 + hairHeight,
    massWidth: minSide * profile.width,
    minSide
  };
}

function centerX(profile, geometry, t) {
  const longSway = Math.sin((t * 1.13 + .08) * Math.PI) * geometry.massWidth * profile.sway;
  const flow = Math.sin((t * profile.flowFreq + .16) * Math.PI * 2) * geometry.massWidth * profile.flowAmp * .26;
  return geometry.cx + longSway + flow;
}

function halfWidth(profile, geometry, t) {
  const bell = Math.pow(Math.sin(Math.PI * clamp(t)), .62);
  const root = .18 + bell * .82;
  const tipT = clamp((t - .72) / .28);
  const taper = 1 - tipT * (1 - profile.tip);
  const edgeUnit = profile.zigzag
    ? tri(t * profile.edgeFreq)
    : Math.sin((t * profile.edgeFreq + .13) * Math.PI * 2);
  const ripple = edgeUnit * profile.edgeAmp;
  return geometry.massWidth * Math.max(.11, root * taper + ripple);
}

function edgePoint(profile, geometry, t, side) {
  return {
    x: centerX(profile, geometry, t) + side * halfWidth(profile, geometry, t),
    y: geometry.top + (geometry.bottom - geometry.top) * t
  };
}

function buildSilhouettePath(ctx, profile, geometry) {
  const steps = profile.flowFreq >= 5 ? 100 : 76;
  ctx.beginPath();
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const p = edgePoint(profile, geometry, t, -1);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  for (let i = steps; i >= 0; i -= 1) {
    const t = i / steps;
    const p = edgePoint(profile, geometry, t, 1);
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
}

function flowPoint(profile, geometry, t, offset = 0, phase = 0) {
  const baseCenter = centerX(profile, geometry, t);
  const hw = halfWidth(profile, geometry, t);
  const waveUnit = profile.zigzag
    ? tri(t * profile.flowFreq + phase)
    : Math.sin((t * profile.flowFreq + phase) * Math.PI * 2);
  const localWave = waveUnit * geometry.massWidth * profile.flowAmp * (.32 + Math.abs(offset) * .12);
  return {
    x: baseCenter + offset * hw * .78 + localWave,
    y: geometry.top + (geometry.bottom - geometry.top) * t
  };
}

function traceFlow(ctx, profile, geometry, offset, phase, start = .02, end = .985) {
  const steps = Math.max(44, Math.round(54 + profile.flowFreq * 7));
  ctx.beginPath();
  for (let i = 0; i <= steps; i += 1) {
    const t = start + (end - start) * (i / steps);
    const p = flowPoint(profile, geometry, t, offset, phase);
    if (!i) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
}

function createMask(width, height, profile, geometry) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  buildSilhouettePath(ctx, profile, geometry);
  ctx.fill();
  return canvas;
}

function drawBaseColorLayer(ctx, width, height, colors, profile, geometry, lightVector) {
  const shadow = colorAt(colors, 2, '#2F2831');
  const mid = colorAt(colors, 7, colorAt(colors, 6, '#777777'));
  const light = colorAt(colors, 11, mid);
  const highlight = colorAt(colors, 14, colorAt(colors, 13, '#FFFFFF'));
  const side = lightVector?.x >= 0 ? 1 : -1;
  const x0 = geometry.cx - geometry.massWidth * side;
  const x1 = geometry.cx + geometry.massWidth * side;
  const gradient = ctx.createLinearGradient(x0, geometry.top, x1, geometry.bottom * .93);
  gradient.addColorStop(0, shadow);
  gradient.addColorStop(.34, mixHex(shadow, mid, .54));
  gradient.addColorStop(.58, mid);
  gradient.addColorStop(.82, mixHex(mid, light, .62));
  gradient.addColorStop(.95, mixHex(light, highlight, .42));
  gradient.addColorStop(1, light);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function clipToSilhouette(ctx, profile, geometry) {
  buildSilhouettePath(ctx, profile, geometry);
  ctx.clip();
}

function drawVolume(ctx, width, height, colors, profile, geometry, lightVector) {
  const side = lightVector?.x >= 0 ? 1 : -1;
  ctx.save();
  clipToSilhouette(ctx, profile, geometry);

  const root = ctx.createRadialGradient(
    geometry.cx,
    geometry.top + (geometry.bottom - geometry.top) * .05,
    0,
    geometry.cx,
    geometry.top + (geometry.bottom - geometry.top) * .10,
    geometry.massWidth * 1.05
  );
  root.addColorStop(0, rgba(colorAt(colors, 1, '#19151B'), .72));
  root.addColorStop(.55, rgba(colorAt(colors, 3, '#302A32'), .32));
  root.addColorStop(1, rgba(colorAt(colors, 3, '#302A32'), 0));
  ctx.fillStyle = root;
  ctx.fillRect(0, 0, width, height);

  const shadeX = geometry.cx - side * geometry.massWidth * .74;
  const shade = ctx.createRadialGradient(
    shadeX,
    geometry.top + (geometry.bottom - geometry.top) * .48,
    0,
    shadeX,
    geometry.top + (geometry.bottom - geometry.top) * .48,
    geometry.massWidth * 1.5
  );
  shade.addColorStop(0, rgba(colorAt(colors, 1, '#1B1720'), .44));
  shade.addColorStop(.6, rgba(colorAt(colors, 3, '#302A32'), .14));
  shade.addColorStop(1, rgba(colorAt(colors, 3, '#302A32'), 0));
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawRibbons(ctx, colors, profile, geometry, lightVector) {
  const side = lightVector?.x >= 0 ? 1 : -1;
  const count = profile.ribbons;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < count; i += 1) {
    const unit = count <= 1 ? .5 : i / (count - 1);
    const offset = unit * 1.72 - .86;
    const lit = (offset * side + 1) * .5;
    const colorIndex = lit < .25 ? 3 : lit < .52 ? 6 : lit < .78 ? 9 : 11;
    traceFlow(ctx, profile, geometry, offset, .13 + i * .071);
    ctx.strokeStyle = rgba(colorAt(colors, colorIndex, colorAt(colors, 7)), .30 + (1 - Math.abs(offset)) * .18);
    ctx.lineWidth = Math.max(3.5, geometry.minSide * (.009 + (1 - Math.abs(offset)) * .004));
    ctx.stroke();
  }
  ctx.restore();
}

function drawFibers(ctx, colors, profile, geometry, lightVector) {
  const side = lightVector?.x >= 0 ? 1 : -1;
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < profile.fibers; i += 1) {
    const offset = -0.91 + (i / Math.max(1, profile.fibers - 1)) * 1.82;
    const lit = (offset * side + 1) * .5;
    const idx = lit < .33 ? 4 : lit < .66 ? 8 : 12;
    const start = .04 + (i % 5) * .006;
    const end = .93 + (i % 4) * .012;
    traceFlow(ctx, profile, geometry, offset, .31 + i * .113, start, Math.min(.99, end));
    ctx.strokeStyle = rgba(colorAt(colors, idx, '#BBBBBB'), .14 + (i % 4) * .035);
    ctx.lineWidth = Math.max(.65, geometry.minSide * (.00115 + (i % 3) * .0003));
    ctx.stroke();
  }
  ctx.restore();
}

function drawHighlights(ctx, colors, profile, geometry, lightVector) {
  const side = lightVector?.x >= 0 ? 1 : -1;
  const bands = profile.flowFreq < 1 ? 3 : profile.flowFreq < 3 ? 4 : profile.flowFreq < 6 ? 5 : 6;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.lineCap = 'round';
  ctx.shadowColor = rgba(colorAt(colors, 14, '#FFFFFF'), .26);
  ctx.shadowBlur = Math.max(4, geometry.minSide * .018);
  for (let i = 0; i < bands; i += 1) {
    const offset = side * (.22 + i * (.52 / Math.max(1, bands - 1)));
    const start = .13 + (i % 3) * .08;
    const segment = profile.flowFreq < 1 ? .50 : profile.flowFreq < 3 ? .32 : profile.flowFreq < 6 ? .20 : .13;
    const end = Math.min(.90, start + segment);
    traceFlow(ctx, profile, geometry, offset, 1.7 + i * .23, start, end);
    ctx.strokeStyle = rgba(
      i % 2 ? colorAt(colors, 12, '#FFFFFF') : colorAt(colors, 14, '#FFFFFF'),
      .28 + (i % 3) * .08
    );
    ctx.lineWidth = Math.max(2.4, geometry.minSide * (.006 + (i % 2) * .002));
    ctx.stroke();
  }
  ctx.restore();
}

function drawActiveLights(ctx, width, height, profile, geometry, lighting) {
  const lights = activeLights(lighting || {}).slice(0, 6);
  if (!lights.length) return;
  ctx.save();
  clipToSilhouette(ctx, profile, geometry);
  ctx.globalCompositeOperation = 'screen';
  lights.forEach((light) => {
    const direction = Number(light.direction || 0) * Math.PI / 180;
    const elevation = Number(light.elevation || 0) * Math.PI / 180;
    const intensity = clamp(Number(light.intensity || 0) / 100);
    const softness = clamp(Number(light.softness || 0) / 100);
    const lightX = geometry.cx + Math.sin(direction) * geometry.massWidth * .78;
    const lightY = geometry.top + (geometry.bottom - geometry.top) * (.35 - Math.sin(elevation) * .22);
    const radius = geometry.massWidth * (.58 + softness * .72 + intensity * .24);
    const glow = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, radius);
    glow.addColorStop(0, rgba(light.color || '#FFFFFF', .10 + intensity * .34));
    glow.addColorStop(.28, rgba(light.color || '#FFFFFF', .07 + intensity * .22));
    glow.addColorStop(.68, rgba(light.color || '#FFFFFF', .04 + intensity * .08));
    glow.addColorStop(1, rgba(light.color || '#FFFFFF', 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  });
  ctx.restore();
}

function drawRim(ctx, colors, profile, geometry, lightVector, lighting) {
  const lights = activeLights(lighting || {});
  const side = lightVector?.x >= 0 ? 1 : -1;
  const edgeColor = lights[0]?.color || colorAt(colors, 15, '#FFFFFF');
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = rgba(mixHex(edgeColor, colorAt(colors, 15, '#FFFFFF'), .42), .44);
  ctx.lineWidth = Math.max(1.5, geometry.minSide * .0038);
  ctx.lineJoin = 'round';
  const steps = 84;
  ctx.beginPath();
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const p = edgePoint(profile, geometry, t, side);
    if (!i) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawFlyaways(ctx, colors, profile, geometry) {
  ctx.save();
  ctx.lineCap = 'round';
  const count = profile.frizz;
  for (let i = 0; i < count; i += 1) {
    const side = i % 2 ? 1 : -1;
    const t = .16 + ((i * 17) % 62) / 100;
    const p = edgePoint(profile, geometry, t, side);
    const len = geometry.massWidth * (.14 + (i % 4) * .045);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.quadraticCurveTo(
      p.x + side * len * .75,
      p.y - len * .26,
      p.x + side * len,
      p.y + len * .05
    );
    ctx.strokeStyle = rgba(colorAt(colors, 10 + (i % 3), '#CCCCCC'), .24);
    ctx.lineWidth = Math.max(.7, geometry.minSide * .0014);
    ctx.stroke();
  }
  ctx.restore();
}

function label(ctx, x, y, target, text, color, align = 'left') {
  const night = document.documentElement.dataset.theme === 'night';
  const fontSize = Math.max(11, Math.min(14, ctx.canvas.width * .011));
  ctx.save();
  ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
  const px = 9;
  const h = fontSize + 12;
  const w = ctx.measureText(text).width + px * 2;
  const bx = align === 'right' ? x - w : x;
  ctx.strokeStyle = rgba(color, .66);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(target.x, target.y);
  ctx.lineTo(align === 'right' ? bx + w : bx, y + h * .5);
  ctx.stroke();
  ctx.fillStyle = night ? 'rgba(13,12,17,.91)' : 'rgba(255,255,255,.94)';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(bx, y, w, h, 10);
  else ctx.rect(bx, y, w, h);
  ctx.fill();
  ctx.strokeStyle = rgba(color, .58);
  ctx.stroke();
  ctx.fillStyle = night ? '#FFFFFF' : '#211D25';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + px, y + h * .5 + .5);
  ctx.restore();
}

function drawStudyMap(ctx, width, height, colors, profile, geometry, lightVector) {
  const side = lightVector?.x >= 0 ? 1 : -1;
  const shadowSide = -side;
  ctx.save();
  clipToSilhouette(ctx, profile, geometry);
  ctx.globalCompositeOperation = 'screen';

  const zones = [
    { offset: shadowSide * .58, phase:1.1, start:.10, end:.83, color:colorAt(colors,2,'#332A36'), alpha:.28, width:.10 },
    { offset: 0, phase:.6, start:.20, end:.90, color:colorAt(colors,7,'#777777'), alpha:.20, width:.085 },
    { offset: side * .43, phase:1.7, start:.15, end:.70, color:colorAt(colors,14,'#FFFFFF'), alpha:.46, width:.058 },
    { offset: shadowSide * .22, phase:2.4, start:.58, end:.93, color:colorAt(colors,10,'#BBAA99'), alpha:.34, width:.045 },
    { offset: side * .86, phase:3.3, start:.08, end:.88, color:colorAt(colors,15,'#FFFFFF'), alpha:.46, width:.030 }
  ];

  zones.forEach((z) => {
    traceFlow(ctx, profile, geometry, z.offset, z.phase, z.start, z.end);
    ctx.strokeStyle = rgba(z.color, z.alpha);
    ctx.lineWidth = Math.max(4, geometry.massWidth * z.width);
    ctx.stroke();
  });
  ctx.restore();

  const shadow = flowPoint(profile, geometry, .30, shadowSide * .56, 1.1);
  const base = flowPoint(profile, geometry, .50, 0, .6);
  const high = flowPoint(profile, geometry, .31, side * .45, 1.7);
  const bounce = flowPoint(profile, geometry, .76, shadowSide * .22, 2.4);
  const rim = flowPoint(profile, geometry, .58, side * .86, 3.3);
  label(ctx, width*.028, height*.17, shadow, 'SOMBRA / OCLUSION', colorAt(colors,2), 'left');
  label(ctx, width*.028, height*.40, base, 'BASE / MEDIO TONO', colorAt(colors,7), 'left');
  label(ctx, width*.972, height*.19, high, 'HIGHLIGHT', colorAt(colors,14), 'right');
  label(ctx, width*.028, height*.69, bounce, 'LUZ DE REBOTE', colorAt(colors,10), 'left');
  label(ctx, width*.972, height*.57, rim, 'RIM LIGHT', colorAt(colors,15), 'right');
}

function drawHeader(ctx, width, height, profile, studyMode) {
  const night = document.documentElement.dataset.theme === 'night';
  ctx.save();
  ctx.fillStyle = night ? 'rgba(255,255,255,.88)' : 'rgba(34,28,39,.82)';
  ctx.font = `800 ${Math.max(13, Math.round(width*.015))}px Inter, system-ui, sans-serif`;
  ctx.fillText(`CABELLO ${profile.label} - ${profile.family.toUpperCase()}`, width*.028, height*.055);
  ctx.font = `500 ${Math.max(10, Math.round(width*.0105))}px Inter, system-ui, sans-serif`;
  ctx.globalAlpha = .72;
  ctx.fillText(
    studyMode === 'map'
      ? 'Mapa de estudio sobre una masa completa de cabello'
      : 'Masa completa + textura + color editable + iluminacion activa',
    width*.028,
    height*.086
  );
  ctx.restore();
}

export function renderCompleteHairAsset(ctx, width, height, colors, lighting, textureId = '1b', studyMode = 'render') {
  const profile = profileFor(textureId);
  const geometry = geometryFor(width, height, profile);
  const lightVector = dominantLightVector(lighting || {});
  const mask = createMask(width, height, profile, geometry);
  const layer = document.createElement('canvas');
  layer.width = width;
  layer.height = height;
  const lctx = layer.getContext('2d');

  lctx.drawImage(mask, 0, 0);
  lctx.globalCompositeOperation = 'source-in';
  drawBaseColorLayer(lctx, width, height, colors, profile, geometry, lightVector);
  lctx.globalCompositeOperation = 'source-over';
  drawVolume(lctx, width, height, colors, profile, geometry, lightVector);

  lctx.save();
  clipToSilhouette(lctx, profile, geometry);
  drawRibbons(lctx, colors, profile, geometry, lightVector);
  drawFibers(lctx, colors, profile, geometry, lightVector);
  drawHighlights(lctx, colors, profile, geometry, lightVector);
  lctx.restore();

  drawActiveLights(lctx, width, height, profile, geometry, lighting);
  drawRim(lctx, colors, profile, geometry, lightVector, lighting);

  ctx.save();
  ctx.shadowColor = rgba(colorAt(colors, 1, '#171419'), .32);
  ctx.shadowBlur = Math.max(12, geometry.minSide * .05);
  ctx.shadowOffsetY = geometry.minSide * .025;
  ctx.drawImage(layer, 0, 0);
  ctx.restore();

  drawFlyaways(ctx, colors, profile, geometry);

  if (studyMode === 'map') {
    drawStudyMap(ctx, width, height, colors, profile, geometry, lightVector);
  }

  drawHeader(ctx, width, height, profile, studyMode);
}
