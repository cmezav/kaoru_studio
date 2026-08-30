import { clamp, mixHex, normalizeHex } from './colorUtils.js';

export const LIGHTING_ENGINE_PHASE = 4;
export const MAX_DIRECT_LIGHTS = 8;

const LIGHT_COLORS = ['#FFF1D6', '#9CCBFF', '#FF9A76', '#C7A7FF', '#87F2D1', '#FF88C8', '#FFE56B', '#8FA2FF'];

function lightId() {
  return globalThis.crypto?.randomUUID?.() || `light-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createDirectLight(overrides = {}, index = 0) {
  return {
    id: overrides.id || lightId(),
    name: String(overrides.name || `Luz ${index + 1}`).slice(0, 28),
    enabled: overrides.enabled !== false,
    color: normalizeHex(overrides.color) || LIGHT_COLORS[index % LIGHT_COLORS.length],
    intensity: clamp(overrides.intensity ?? 62, 0, 100),
    direction: clamp(overrides.direction ?? (-35 + index * 70), -180, 180),
    elevation: clamp(overrides.elevation ?? 38, -90, 90),
    softness: clamp(overrides.softness ?? 35, 0, 100)
  };
}

export function createDefaultLighting() {
  const first = createDirectLight({ id: 'key-light', name: 'Luz principal', color: '#FFF1D6', intensity: 62, direction: -35, elevation: 38, softness: 38 });
  return {
    enabled: true,
    lights: [first],
    selectedLightId: first.id,
    ambient: { color: '#7385A8', intensity: 12 },
    shadow: { color: '#433852', intensity: 30 },
    bounce: { color: '#C77962', intensity: 10 },
    rim: { color: '#9DCCFF', intensity: 0 }
  };
}

export const LIGHTING_SCENES = [
  { id: 'neutral', name: 'Neutra', build: () => createDefaultLighting() },
  { id: 'warm', name: 'Atardecer', build: () => {
    const lighting = createDefaultLighting();
    lighting.lights[0] = createDirectLight({ id: 'warm-key', name: 'Sol cálido', color: '#FFB36B', intensity: 72, direction: -42, elevation: 24, softness: 48 });
    lighting.selectedLightId = 'warm-key'; lighting.ambient = { color: '#786B96', intensity: 18 }; lighting.shadow = { color: '#4A365E', intensity: 38 }; lighting.bounce = { color: '#E98662', intensity: 18 };
    return lighting;
  } },
  { id: 'night', name: 'Noche', build: () => {
    const lighting = createDefaultLighting();
    lighting.lights[0] = createDirectLight({ id: 'moon-key', name: 'Luz lunar', color: '#84AFFF', intensity: 48, direction: 35, elevation: 50, softness: 58 });
    lighting.selectedLightId = 'moon-key'; lighting.ambient = { color: '#263B70', intensity: 30 }; lighting.shadow = { color: '#211D45', intensity: 52 }; lighting.rim = { color: '#8EDCFF', intensity: 24 };
    return lighting;
  } },
  { id: 'dual', name: 'Dual', build: () => {
    const lighting = createDefaultLighting();
    lighting.lights = [
      createDirectLight({ id: 'dual-warm', name: 'Cálida', color: '#FF795C', intensity: 58, direction: -55, elevation: 20, softness: 30 }),
      createDirectLight({ id: 'dual-cool', name: 'Fría', color: '#5CB8FF', intensity: 52, direction: 65, elevation: 34, softness: 36 }, 1)
    ];
    lighting.selectedLightId = 'dual-warm'; lighting.ambient = { color: '#694C87', intensity: 18 }; lighting.shadow = { color: '#372849', intensity: 40 }; lighting.rim = { color: '#A6E8FF', intensity: 18 };
    return lighting;
  } }
];

export function sceneLighting(sceneId) {
  return (LIGHTING_SCENES.find((scene) => scene.id === sceneId) || LIGHTING_SCENES[0]).build();
}

export function activeLights(lighting) {
  return lighting?.enabled === false ? [] : (lighting?.lights || []).filter((light) => light.enabled && Number(light.intensity) > 0);
}

function roleStrength(entry, kind) {
  const role = `${entry.group || ''} ${entry.role || ''}`.toLowerCase();
  const isShadow = /shadow|sombra|oscura/.test(role);
  const isLight = /light|luz|highlight|brillo|especular/.test(role);
  const isBounce = /bounce|rebote|ambiente/.test(role);
  if (kind === 'direct') return isLight ? 1 : isShadow ? .22 : isBounce ? .48 : .62;
  if (kind === 'shadow') return isShadow ? 1 : isLight ? .08 : .36;
  if (kind === 'bounce') return isShadow ? .72 : isBounce ? 1 : isLight ? .2 : .42;
  if (kind === 'rim') return isLight ? .88 : isBounce ? 1 : isShadow ? .12 : .34;
  return isShadow ? .58 : isLight ? .34 : .48;
}

function applyDirectLight(hex, entry, light) {
  const direction = Math.cos((Number(light.direction) || 0) * Math.PI / 180);
  const elevation = (clamp(light.elevation, -90, 90) + 90) / 180;
  const softness = clamp(light.softness, 0, 100) / 100;
  const spatial = .82 + direction * .08 + elevation * .13;
  const amount = clamp(light.intensity, 0, 100) / 100 * roleStrength(entry, 'direct') * spatial * (.58 - softness * .12);
  return mixHex(hex, light.color, amount);
}

function applyComponent(hex, entry, component, kind, scale) {
  const color = normalizeHex(component?.color);
  if (!color || !component?.intensity) return hex;
  const amount = clamp(component.intensity, 0, 100) / 100 * roleStrength(entry, kind) * scale;
  return mixHex(hex, color, amount);
}

export function applyLightingToPalette(entries, lighting, options = {}) {
  const source = Array.isArray(entries) ? entries : [];
  if (!lighting?.enabled) return source.map((entry) => ({ ...entry, originalHex: entry.hex }));
  const onlyLightId = options.onlyLightId || null;
  const lights = activeLights(lighting).filter((light) => !onlyLightId || light.id === onlyLightId);
  return source.map((entry) => {
    let hex = entry.hex;
    if (!onlyLightId) {
      hex = applyComponent(hex, entry, lighting.ambient, 'ambient', .34);
      hex = applyComponent(hex, entry, lighting.shadow, 'shadow', .58);
    }
    lights.forEach((light) => { hex = applyDirectLight(hex, entry, light); });
    if (!onlyLightId) {
      hex = applyComponent(hex, entry, lighting.bounce, 'bounce', .42);
      hex = applyComponent(hex, entry, lighting.rim, 'rim', .46);
    }
    return { ...entry, originalHex: entry.hex, hex, lightingApplied: true };
  });
}

export function dominantLightVector(lighting) {
  const lights = activeLights(lighting);
  if (!lights.length) return { x: -.35, y: -.4, softness: .4 };
  let x = 0, y = 0, weight = 0, softness = 0;
  lights.forEach((light) => {
    const amount = Math.max(1, Number(light.intensity) || 0); const radians = Number(light.direction) * Math.PI / 180;
    x += Math.sin(radians) * amount; y -= Math.sin(Number(light.elevation) * Math.PI / 180) * amount;
    softness += clamp(light.softness, 0, 100) / 100 * amount; weight += amount;
  });
  return { x: clamp(x / weight, -1, 1), y: clamp(y / weight, -1, 1), softness: clamp(softness / weight) };
}

export function lightingSummary(lighting) {
  const count = activeLights(lighting).length;
  if (!lighting?.enabled) return 'Iluminación apagada';
  return `${count} ${count === 1 ? 'luz activa' : 'luces activas'}`;
}
