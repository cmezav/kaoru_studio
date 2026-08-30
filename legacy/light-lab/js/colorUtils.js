export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

export function normalizeHex(value) {
  const raw = String(value || '').trim().toUpperCase();
  const prefixed = raw.startsWith('#') ? raw : `#${raw}`;
  if (/^#[0-9A-F]{3}$/.test(prefixed)) {
    return `#${prefixed[1]}${prefixed[1]}${prefixed[2]}${prefixed[2]}${prefixed[3]}${prefixed[3]}`;
  }
  return /^#[0-9A-F]{6}$/.test(prefixed) ? prefixed : null;
}

export function isValidHex(value) { return normalizeHex(value) !== null; }

export function hexToRgb(value) {
  const hex = normalizeHex(value);
  if (!hex) return null;
  return { r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) };
}

export function rgbToHex(r, g, b) {
  const part = (value) => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const delta = max - min;
    s = l > .5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === r) h = (g - b) / delta + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

export function hslToRgb(h, s, l) {
  h = ((Number(h) % 360) + 360) % 360; s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1)); const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g] = [c, x]; else if (h < 120) [r, g] = [x, c];
  else if (h < 180) [g, b] = [c, x]; else if (h < 240) [g, b] = [x, c];
  else if (h < 300) [r, b] = [x, c]; else [r, b] = [c, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

export function hslToHex(h, s, l) { const rgb = hslToRgb(h, s, l); return rgbToHex(rgb.r, rgb.g, rgb.b); }
export function hexToHsl(value) { const rgb = hexToRgb(value); return rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null; }

export function adjustHex(value, changes = {}) {
  const hsl = hexToHsl(value) || { h: 0, s: 0, l: 50 };
  return hslToHex(hsl.h + (changes.h || 0), hsl.s + (changes.s || 0), hsl.l + (changes.l || 0));
}

export function mixHex(first, second, amount = .5) {
  const a = hexToRgb(first), b = hexToRgb(second); const t = clamp(amount);
  if (!a || !b) return normalizeHex(first) || normalizeHex(second) || '#000000';
  return rgbToHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
}

export function temperatureShift(value, amount = 0) {
  const strength = clamp(Math.abs(amount) / 100, 0, .62);
  return amount >= 0 ? mixHex(value, '#E0783F', strength) : mixHex(value, '#536FC4', strength);
}

export function readableTextColor(value) {
  const rgb = hexToRgb(value) || { r: 255, g: 255, b: 255 };
  const linear = [rgb.r, rgb.g, rgb.b].map((v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722 > .39 ? '#18151D' : '#FFFFFF';
}

export function normalizeWords(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
