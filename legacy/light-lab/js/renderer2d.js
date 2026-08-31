import { activeLights, dominantLightVector } from './lightingEngine.js';
import { mixHex } from './colorUtils.js';

const MATERIAL_TINTS = {
  gold: '#D6A93D',
  silver: '#C9CED7',
  steel: '#778494'
};

function colorAt(colors, index, fallback = '#777777') {
  return colors[index] || colors[colors.length - 1] || fallback;
}

function hexToRgb(hex) {
  const clean = String(hex || '').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return { r: 119, g: 119, b: 119 };
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16)
  };
}

function rgba(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, width, height, r);
  else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
  }
}

function tintPalette(colors, tint, amount) {
  return colors.map((hex) => mixHex(hex, tint, amount));
}

function shadowColor(colors) { return colorAt(colors, 0, '#261D2A'); }
function midColor(colors) { return colorAt(colors, 6, '#9D7882'); }
function lightColor(colors) { return colorAt(colors, 12, '#E8C9C8'); }
function highlightColor(colors) { return colorAt(colors, 13, '#FFF2EB'); }
function rimColor(colors) { return colorAt(colors, 14, '#B8D7FF'); }
function bounceColor(colors) { return colorAt(colors, 15, '#D48E79'); }

function renderBackdrop(ctx, width, height) {
  const dark = document.documentElement.dataset.theme === 'night';
  const backdrop = ctx.createRadialGradient(width * .5, height * .38, 0, width * .5, height * .5, width * .78);
  backdrop.addColorStop(0, dark ? '#2B2733' : '#FFFFFF');
  backdrop.addColorStop(.55, dark ? '#1C1921' : '#F7F3F8');
  backdrop.addColorStop(1, dark ? '#100F13' : '#E9E5EB');
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = dark ? .16 : .28;
  ctx.strokeStyle = dark ? '#FFFFFF' : '#6B5A72';
  ctx.lineWidth = 1;
  const step = Math.max(42, Math.round(width / 18));
  for (let x = 0; x < width; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = 0; y < height; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }
  ctx.restore();
}

function renderGroundShadow(ctx, cx, cy, rx, ry, color = '#000000') {
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
  gradient.addColorStop(0, rgba(color, .32));
  gradient.addColorStop(.6, rgba(color, .14));
  gradient.addColorStop(1, rgba(color, 0));
  ctx.save();
  ctx.scale(1, ry / rx);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy * (rx / ry), rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderLightGuides(ctx, width, height, lighting) {
  const lights = activeLights(lighting);
  if (!lights.length) return;

  const cx = width * .5;
  const cy = height * .48;
  const orbitX = width * .38;
  const orbitY = height * .34;

  ctx.save();
  lights.slice(0, 8).forEach((light, index) => {
    const direction = Number(light.direction || 0) * Math.PI / 180;
    const elevation = Number(light.elevation || 0) * Math.PI / 180;
    const x = cx + Math.sin(direction) * orbitX;
    const y = cy - Math.sin(elevation) * orbitY - Math.cos(direction) * orbitY * .16;
    const intensity = Math.max(.18, Math.min(1, Number(light.intensity || 0) / 100));
    const selected = lighting?.selectedLightId === light.id;

    ctx.save();
    ctx.setLineDash([10, 9]);
    ctx.strokeStyle = rgba(light.color, selected ? .68 : .34);
    ctx.lineWidth = selected ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(cx, cy);
    ctx.stroke();
    ctx.restore();

    const glow = ctx.createRadialGradient(x, y, 0, x, y, 26 + 26 * intensity);
    glow.addColorStop(0, rgba(light.color, .92));
    glow.addColorStop(.22, rgba(light.color, .48));
    glow.addColorStop(1, rgba(light.color, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 28 + 26 * intensity, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = light.color;
    ctx.beginPath();
    ctx.arc(x, y, selected ? 10 : 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = selected ? 4 : 2;
    ctx.strokeStyle = selected ? '#FFFFFF' : rgba('#FFFFFF', .7);
    ctx.stroke();

    ctx.fillStyle = document.documentElement.dataset.theme === 'night' ? '#FFFFFF' : '#211D25';
    ctx.font = `${Math.round(Math.max(11, width * .012))}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(String(index + 1), x, y - 17);
  });
  ctx.restore();
}

function renderSphere(ctx, width, height, colors, lightVector) {
  const radius = Math.min(width, height) * .29;
  const cx = width * .5;
  const cy = height * .47;

  renderGroundShadow(ctx, cx, cy + radius * 1.12, radius * .88, radius * .18, shadowColor(colors));

  ctx.save();
  ctx.shadowColor = rgba(shadowColor(colors), .38);
  ctx.shadowBlur = radius * .2;
  ctx.shadowOffsetY = radius * .08;

  const highlightX = cx + lightVector.x * radius * .62;
  const highlightY = cy + lightVector.y * radius * .62;
  const gradient = ctx.createRadialGradient(
    highlightX, highlightY, radius * (.03 + lightVector.softness * .11),
    cx, cy, radius
  );
  gradient.addColorStop(0, highlightColor(colors));
  gradient.addColorStop(.16, lightColor(colors));
  gradient.addColorStop(.43, colorAt(colors, 9, midColor(colors)));
  gradient.addColorStop(.68, midColor(colors));
  gradient.addColorStop(.84, colorAt(colors, 3, shadowColor(colors)));
  gradient.addColorStop(1, shadowColor(colors));

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  const rim = ctx.createLinearGradient(cx - radius, 0, cx + radius, 0);
  rim.addColorStop(0, rgba(rimColor(colors), lightVector.x > 0 ? .12 : .7));
  rim.addColorStop(.18, 'transparent');
  rim.addColorStop(.82, 'transparent');
  rim.addColorStop(1, rgba(rimColor(colors), lightVector.x > 0 ? .7 : .12));
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * .99, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderCylinder(ctx, width, height, colors, lightVector) {
  const x = width * .27;
  const y = height * .17;
  const w = width * .46;
  const h = height * .66;
  const capH = h * .12;
  renderGroundShadow(ctx, width * .5, y + h + capH * .45, w * .54, capH * .72, shadowColor(colors));

  const leftToRight = lightVector.x >= 0;
  const body = leftToRight
    ? ctx.createLinearGradient(x, 0, x + w, 0)
    : ctx.createLinearGradient(x + w, 0, x, 0);
  body.addColorStop(0, shadowColor(colors));
  body.addColorStop(.18, colorAt(colors, 3, shadowColor(colors)));
  body.addColorStop(.43, midColor(colors));
  body.addColorStop(.62, lightColor(colors));
  body.addColorStop(.77, highlightColor(colors));
  body.addColorStop(1, colorAt(colors, 2, shadowColor(colors)));

  ctx.save();
  ctx.shadowColor = rgba(shadowColor(colors), .34);
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = body;
  ctx.fillRect(x, y + capH / 2, w, h - capH);

  const top = ctx.createRadialGradient(
    width * (.5 + lightVector.x * .08),
    y + capH * .46,
    2,
    width * .5, y + capH * .5, w * .46
  );
  top.addColorStop(0, highlightColor(colors));
  top.addColorStop(.48, lightColor(colors));
  top.addColorStop(1, colorAt(colors, 3, shadowColor(colors)));
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.ellipse(width * .5, y + capH * .5, w / 2, capH / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  const bottom = ctx.createLinearGradient(x, 0, x + w, 0);
  bottom.addColorStop(0, shadowColor(colors));
  bottom.addColorStop(.5, midColor(colors));
  bottom.addColorStop(1, colorAt(colors, 2, shadowColor(colors)));
  ctx.fillStyle = bottom;
  ctx.beginPath();
  ctx.ellipse(width * .5, y + h - capH * .5, w / 2, capH / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderPlane(ctx, width, height, colors, lightVector) {
  const x = width * .15;
  const y = height * .16;
  const w = width * .70;
  const h = height * .62;

  renderGroundShadow(ctx, width * .5, height * .78, width * .32, height * .065, shadowColor(colors));

  const startX = lightVector.x >= 0 ? x : x + w;
  const startY = lightVector.y >= 0 ? y : y + h;
  const gradient = ctx.createLinearGradient(
    startX, startY,
    x + w - (startX - x),
    y + h - (startY - y)
  );
  [0, 3, 6, 10, 13].forEach((index, i) => gradient.addColorStop(i / 4, colorAt(colors, index)));

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.transform(1, -.12, -.18, .92, 0, 0);
  ctx.shadowColor = rgba(shadowColor(colors), .34);
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 18;
  roundedRect(ctx, -w / 2, -h / 2, w, h, 24);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.globalAlpha = .2;
  ctx.strokeStyle = highlightColor(colors);
  ctx.lineWidth = 2;
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(-w / 2 + w * i / 5, -h / 2);
    ctx.lineTo(-w / 2 + w * i / 5, h / 2);
    ctx.stroke();
  }
  ctx.restore();
}

function renderSkin(ctx, width, height, colors, lightVector) {
  const x = width * .20;
  const y = height * .17;
  const w = width * .60;
  const h = height * .64;
  const cx = x + w * .5;
  const cy = y + h * .5;

  renderGroundShadow(ctx, cx, y + h + 24, w * .38, 30, shadowColor(colors));

  ctx.save();
  ctx.shadowColor = rgba(shadowColor(colors), .26);
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 16;

  const gradient = ctx.createRadialGradient(
    cx + lightVector.x * w * .22,
    cy + lightVector.y * h * .25,
    8,
    cx, cy, w * .58
  );
  gradient.addColorStop(0, highlightColor(colors));
  gradient.addColorStop(.24, lightColor(colors));
  gradient.addColorStop(.56, midColor(colors));
  gradient.addColorStop(.78, colorAt(colors, 3, shadowColor(colors)));
  gradient.addColorStop(1, shadowColor(colors));
  roundedRect(ctx, x, y, w, h, Math.min(w, h) * .20);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.shadowColor = 'transparent';

  const blush = ctx.createRadialGradient(cx - w * .16, cy + h * .04, 0, cx - w * .16, cy + h * .04, w * .18);
  blush.addColorStop(0, rgba(bounceColor(colors), .42));
  blush.addColorStop(1, rgba(bounceColor(colors), 0));
  ctx.fillStyle = blush;
  roundedRect(ctx, x, y, w, h, Math.min(w, h) * .20);
  ctx.fill();

  const cool = ctx.createRadialGradient(cx + w * .24, cy + h * .18, 0, cx + w * .24, cy + h * .18, w * .23);
  cool.addColorStop(0, rgba(rimColor(colors), .28));
  cool.addColorStop(1, rgba(rimColor(colors), 0));
  ctx.fillStyle = cool;
  roundedRect(ctx, x, y, w, h, Math.min(w, h) * .20);
  ctx.fill();

  ctx.globalAlpha = .22;
  ctx.fillStyle = highlightColor(colors);
  for (let i = 0; i < 20; i++) {
    const px = x + w * (.12 + ((i * 37) % 76) / 100);
    const py = y + h * (.14 + ((i * 53) % 70) / 100);
    ctx.beginPath();
    ctx.arc(px, py, 1.2 + (i % 3) * .4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function metalGradient(ctx, x, y, w, h, colors, lightVector) {
  const leftToRight = lightVector.x >= 0;
  const gradient = leftToRight
    ? ctx.createLinearGradient(x, y, x + w, y)
    : ctx.createLinearGradient(x + w, y, x, y);
  const sequence = [0, 2, 7, 12, 13, 5, 1, 11, 13, 6, 2, 0];
  sequence.forEach((index, i) => gradient.addColorStop(i / (sequence.length - 1), colorAt(colors, index)));
  return gradient;
}

function renderMetal(ctx, width, height, colors, lightVector, tint = null) {
  const palette = tint ? tintPalette(colors, tint, .34) : colors;
  const x = width * .14;
  const y = height * .24;
  const w = width * .72;
  const h = height * .34;

  renderGroundShadow(ctx, width * .5, y + h + 48, width * .29, 30, shadowColor(palette));

  ctx.save();
  ctx.shadowColor = rgba(shadowColor(palette), .4);
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 18;
  roundedRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = metalGradient(ctx, x, y, w, h, palette, lightVector);
  ctx.fill();

  const shine = ctx.createLinearGradient(0, y, 0, y + h);
  shine.addColorStop(0, 'rgba(255,255,255,.62)');
  shine.addColorStop(.24, 'rgba(255,255,255,.08)');
  shine.addColorStop(.72, 'rgba(0,0,0,.16)');
  shine.addColorStop(1, 'rgba(255,255,255,.24)');
  roundedRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = shine;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  const ringX = width * .5;
  const ringY = height * .69;
  const outer = Math.min(width, height) * .12;
  ctx.lineWidth = outer * .35;
  ctx.strokeStyle = metalGradient(ctx, ringX - outer, ringY, outer * 2, 1, palette, lightVector);
  ctx.beginPath();
  ctx.arc(ringX, ringY, outer, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = rgba(highlightColor(palette), .68);
  ctx.beginPath();
  ctx.arc(ringX - outer * .10, ringY - outer * .10, outer * .86, Math.PI * 1.06, Math.PI * 1.78);
  ctx.stroke();
  ctx.restore();
}

function headPath(ctx, cx, cy, scale) {
  const w = scale * .72;
  const h = scale;
  ctx.beginPath();
  ctx.moveTo(cx, cy - h * .52);
  ctx.bezierCurveTo(cx - w * .50, cy - h * .49, cx - w * .58, cy - h * .10, cx - w * .47, cy + h * .18);
  ctx.bezierCurveTo(cx - w * .38, cy + h * .40, cx - w * .18, cy + h * .54, cx, cy + h * .59);
  ctx.bezierCurveTo(cx + w * .18, cy + h * .54, cx + w * .38, cy + h * .40, cx + w * .47, cy + h * .18);
  ctx.bezierCurveTo(cx + w * .58, cy - h * .10, cx + w * .50, cy - h * .49, cx, cy - h * .52);
  ctx.closePath();
}

function renderHead(ctx, width, height, colors, lightVector) {
  const scale = Math.min(width, height) * .56;
  const cx = width * .5;
  const cy = height * .46;
  renderGroundShadow(ctx, cx, cy + scale * .72, scale * .30, scale * .08, shadowColor(colors));

  ctx.save();
  ctx.fillStyle = colorAt(colors, 4, shadowColor(colors));
  roundedRect(ctx, cx - scale * .17, cy + scale * .39, scale * .34, scale * .38, scale * .12);
  ctx.fill();

  const face = ctx.createRadialGradient(
    cx + lightVector.x * scale * .26,
    cy + lightVector.y * scale * .26,
    scale * .03,
    cx, cy, scale * .58
  );
  face.addColorStop(0, highlightColor(colors));
  face.addColorStop(.2, lightColor(colors));
  face.addColorStop(.52, midColor(colors));
  face.addColorStop(.78, colorAt(colors, 3, shadowColor(colors)));
  face.addColorStop(1, shadowColor(colors));

  ctx.shadowColor = rgba(shadowColor(colors), .32);
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 14;
  headPath(ctx, cx, cy, scale);
  ctx.fillStyle = face;
  ctx.fill();
  ctx.shadowColor = 'transparent';

  ctx.fillStyle = rgba(shadowColor(colors), .40);
  ctx.beginPath(); ctx.ellipse(cx - scale * .16, cy - scale * .05, scale * .10, scale * .045, -.10, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + scale * .16, cy - scale * .05, scale * .10, scale * .045, .10, 0, Math.PI * 2); ctx.fill();

  const nose = ctx.createLinearGradient(cx - scale * .08, 0, cx + scale * .08, 0);
  nose.addColorStop(0, colorAt(colors, 3, shadowColor(colors)));
  nose.addColorStop(.55, lightColor(colors));
  nose.addColorStop(1, midColor(colors));
  ctx.fillStyle = nose;
  ctx.beginPath();
  ctx.moveTo(cx, cy - scale * .05);
  ctx.lineTo(cx - scale * .075, cy + scale * .18);
  ctx.lineTo(cx + scale * .06, cy + scale * .20);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = rgba(colorAt(colors, 3, shadowColor(colors)), .65);
  ctx.lineWidth = Math.max(2, scale * .012);
  ctx.beginPath();
  ctx.moveTo(cx - scale * .10, cy + scale * .31);
  ctx.quadraticCurveTo(cx, cy + scale * .35, cx + scale * .10, cy + scale * .31);
  ctx.stroke();

  ctx.fillStyle = rgba(rimColor(colors), .36);
  headPath(ctx, cx + (lightVector.x >= 0 ? scale * .018 : -scale * .018), cy, scale * .99);
  ctx.globalCompositeOperation = 'screen';
  ctx.fill();
  ctx.restore();
}

function renderFacetedHead(ctx, width, height, colors, lightVector, asaro = false) {
  const scale = Math.min(width, height) * .58;
  const cx = width * .5;
  const cy = height * .46;
  const sx = scale * .46;
  const sy = scale * .55;
  const px = (x) => cx + x * sx;
  const py = (y) => cy + y * sy;

  renderGroundShadow(ctx, cx, cy + sy * 1.25, sx * .70, sy * .14, shadowColor(colors));

  const points = {
    top: [0, -1], lt: [-.62, -.77], rt: [.62, -.77],
    ltemple: [-.82, -.32], rtemple: [.82, -.32],
    lcheek: [-.72, .22], rcheek: [.72, .22],
    ljaw: [-.48, .70], rjaw: [.48, .70], chin: [0, .98],
    brow: [0, -.33], nose: [0, .25], mouth: [0, .58]
  };
  const p = (name) => [px(points[name][0]), py(points[name][1])];

  const facets = [
    [['top','lt','brow'], 12], [['top','brow','rt'], 10],
    [['lt','ltemple','brow'], 6], [['rt','brow','rtemple'], 8],
    [['ltemple','lcheek','nose','brow'], 3], [['rtemple','brow','nose','rcheek'], 7],
    [['lcheek','ljaw','mouth','nose'], 4], [['rcheek','nose','mouth','rjaw'], 9],
    [['ljaw','chin','mouth'], 1], [['rjaw','mouth','chin'], 5],
    [['brow','nose','mouth'], 11]
  ];

  ctx.save();
  ctx.shadowColor = rgba(shadowColor(colors), .32);
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 15;

  facets.forEach(([names, baseIndex], index) => {
    const sideBoost = lightVector.x > 0 ? index % 2 : (index + 1) % 2;
    const colorIndex = Math.min(colors.length - 1, Math.max(0, baseIndex + (sideBoost ? 1 : -1)));
    ctx.beginPath();
    names.forEach((name, pointIndex) => {
      const [x, y] = p(name);
      if (!pointIndex) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = colorAt(colors, colorIndex, midColor(colors));
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = rgba(highlightColor(colors), asaro ? .22 : .12);
    ctx.lineWidth = asaro ? 1.5 : 1;
    ctx.stroke();
  });

  if (asaro) {
    ctx.fillStyle = rgba(shadowColor(colors), .48);
    ctx.beginPath(); ctx.ellipse(cx - sx * .32, cy - sy * .18, sx * .20, sy * .08, -.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + sx * .32, cy - sy * .18, sx * .20, sy * .08, .12, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = rgba(highlightColor(colors), .45);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, py(-.96));
    ctx.lineTo(cx, py(.92));
    ctx.stroke();

    ctx.strokeStyle = rgba(rimColor(colors), .45);
    ctx.beginPath();
    ctx.moveTo(px(-.62), py(-.75));
    ctx.lineTo(px(-.80), py(-.30));
    ctx.lineTo(px(-.70), py(.22));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px(.62), py(-.75));
    ctx.lineTo(px(.80), py(-.30));
    ctx.lineTo(px(.70), py(.22));
    ctx.stroke();
  }
  ctx.restore();
}

function renderModeLabel(ctx, width, height, mode) {
  const labels = {
    sphere: 'ESFERA',
    cylinder: 'CILINDRO',
    plane: 'PLANO',
    skin: 'PIEL',
    metal: 'METAL',
    gold: 'ORO',
    silver: 'PLATA',
    steel: 'ACERO',
    head: 'CABEZA',
    planes: 'CABEZA POR PLANOS',
    asaro: 'ASARO 2D'
  };
  const text = labels[mode];
  if (!text) return;
  ctx.save();
  ctx.font = `600 ${Math.max(11, Math.round(width * .011))}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillStyle = document.documentElement.dataset.theme === 'night' ? 'rgba(255,255,255,.62)' : 'rgba(40,31,45,.52)';
  ctx.fillText(text, width * .025, height * .055);
  ctx.restore();
}

export function renderBasicPreview(canvas, colors, mode = 'sphere', lighting = null) {
  if (!canvas) return;
  const bounds = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(360, Math.round(bounds.width * ratio));
  const height = Math.max(260, Math.round(bounds.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  renderBackdrop(ctx, width, height);

  const lightVector = dominantLightVector(lighting);
  const safeColors = Array.isArray(colors) && colors.length ? colors : ['#777777'];

  switch (mode) {
    case 'cylinder':
      renderCylinder(ctx, width, height, safeColors, lightVector);
      break;
    case 'plane':
      renderPlane(ctx, width, height, safeColors, lightVector);
      break;
    case 'skin':
      renderSkin(ctx, width, height, safeColors, lightVector);
      break;
    case 'metal':
    case 'band':
      renderMetal(ctx, width, height, safeColors, lightVector);
      break;
    case 'gold':
      renderMetal(ctx, width, height, safeColors, lightVector, MATERIAL_TINTS.gold);
      break;
    case 'silver':
      renderMetal(ctx, width, height, safeColors, lightVector, MATERIAL_TINTS.silver);
      break;
    case 'steel':
      renderMetal(ctx, width, height, safeColors, lightVector, MATERIAL_TINTS.steel);
      break;
    case 'head':
      renderHead(ctx, width, height, safeColors, lightVector);
      break;
    case 'planes':
      renderFacetedHead(ctx, width, height, safeColors, lightVector, false);
      break;
    case 'asaro':
      renderFacetedHead(ctx, width, height, safeColors, lightVector, true);
      break;
    default:
      renderSphere(ctx, width, height, safeColors, lightVector);
      break;
  }

  renderLightGuides(ctx, width, height, lighting);
  renderModeLabel(ctx, width, height, mode);
}
