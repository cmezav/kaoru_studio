import { clamp, mixHex, normalizeHex } from './colorUtils.js';

export const LIGHTING_ENGINE_PHASE = 5;
export const MAX_DIRECT_LIGHTS = 8;

const LIGHT_COLORS = [
  '#FFF1D6',
  '#9CCBFF',
  '#FF9A76',
  '#C7A7FF',
  '#87F2D1',
  '#FF88C8',
  '#FFE56B',
  '#8FA2FF'
];

function lightId() {
  return globalThis.crypto?.randomUUID?.() ||
    `light-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createDirectLight(overrides = {}, index = 0) {
  return {
    id: overrides.id || lightId(),
    name: String(overrides.name || `Luz ${index + 1}`).slice(0, 28),
    enabled: overrides.enabled !== false,
    color:
      normalizeHex(overrides.color) ||
      LIGHT_COLORS[index % LIGHT_COLORS.length],
    intensity: clamp(overrides.intensity ?? 62, 0, 100),
    direction: clamp(
      overrides.direction ?? (-35 + index * 70),
      -180,
      180
    ),
    elevation: clamp(overrides.elevation ?? 38, -90, 90),
    softness: clamp(overrides.softness ?? 35, 0, 100)
  };
}

export function createDefaultLighting() {
  const first = createDirectLight({
    id: 'front-soft-main',
    name: 'Luz principal',
    color: '#FFF2D9',
    intensity: 74,
    direction: -12,
    elevation: 18,
    softness: 62
  });

  return {
    sceneId: 'front-soft',
    enabled: true,
    lights: [first],
    selectedLightId: first.id,
    ambient: { color: '#AEB8CF', intensity: 14 },
    shadow: { color: '#363144', intensity: 34 },
    bounce: { color: '#D19B83', intensity: 14 },
    rim: { color: '#D8E8FF', intensity: 8 }
  };
}

function baseLighting(sceneId) {
  const lighting = createDefaultLighting();
  lighting.sceneId = sceneId;
  return lighting;
}

function preview(
  a,
  b = '#1B1B22',
  bg = '#0C0D12',
  x = '35%',
  y = '28%'
) {
  return { a, b, bg, x, y };
}

export const LIGHTING_SCENES = [
  {
    id: 'front-soft',
    name: 'Frente suave',
    description: 'Ilumina de frente con volumen claro y sombras suaves.',
    preview: preview('#FFF0CF', '#6D7893', '#1C1F2C', '38%', '26%'),
    build: () => createDefaultLighting()
  },
  {
    id: 'side',
    name: 'De lado',
    description: 'Un lado se ilumina y el otro se oscurece bastante más.',
    preview: preview('#FFDFA9', '#172031', '#0E121A', '22%', '40%'),
    build: () => {
      const lighting = baseLighting('side');
      lighting.lights = [
        createDirectLight({
          id: 'side-main',
          name: 'Luz lateral',
          color: '#FFE1AF',
          intensity: 84,
          direction: -82,
          elevation: 18,
          softness: 28
        })
      ];
      lighting.selectedLightId = 'side-main';
      lighting.ambient = { color: '#5D6984', intensity: 8 };
      lighting.shadow = { color: '#252838', intensity: 56 };
      lighting.bounce = { color: '#BC816B', intensity: 10 };
      lighting.rim = { color: '#C9E0FF', intensity: 2 };
      return lighting;
    }
  },
  {
    id: 'split',
    name: 'Mitad luz / mitad sombra',
    description: 'Separa la figura en dos zonas muy claras: una iluminada y otra oscura.',
    preview: preview('#FFD19A', '#0F1218', '#07080B', '18%', '46%'),
    build: () => {
      const lighting = baseLighting('split');
      lighting.lights = [
        createDirectLight({
          id: 'split-main',
          name: 'Luz lateral fuerte',
          color: '#FFD7A3',
          intensity: 92,
          direction: -92,
          elevation: 6,
          softness: 6
        })
      ];
      lighting.selectedLightId = 'split-main';
      lighting.ambient = { color: '#39435A', intensity: 2 };
      lighting.shadow = { color: '#10131B', intensity: 84 };
      lighting.bounce = { color: '#87594D', intensity: 3 };
      lighting.rim = { color: '#B9D9FF', intensity: 0 };
      return lighting;
    }
  },
  {
    id: 'dramatic',
    name: 'Dramática',
    description: 'Más profundidad, sombras intensas y brillos fuertes.',
    preview: preview('#FFB45A', '#1B1220', '#08070A', '30%', '18%'),
    build: () => {
      const lighting = baseLighting('dramatic');
      lighting.lights = [
        createDirectLight({
          id: 'dramatic-main',
          name: 'Luz dramática',
          color: '#FFC26A',
          intensity: 96,
          direction: -46,
          elevation: 54,
          softness: 8
        })
      ];
      lighting.selectedLightId = 'dramatic-main';
      lighting.ambient = { color: '#362B44', intensity: 3 };
      lighting.shadow = { color: '#170E19', intensity: 88 };
      lighting.bounce = { color: '#7E4A3B', intensity: 4 };
      lighting.rim = { color: '#F6E0B8', intensity: 6 };
      return lighting;
    }
  },
  {
    id: 'backlight',
    name: 'Contraluz',
    description: 'La luz viene desde atrás y resalta el borde.',
    preview: preview('#F4F7FF', '#132136', '#080B12', '82%', '26%'),
    build: () => {
      const lighting = baseLighting('backlight');
      lighting.lights = [
        createDirectLight({
          id: 'back-main',
          name: 'Luz trasera',
          color: '#EEF7FF',
          intensity: 34,
          direction: 174,
          elevation: 30,
          softness: 30
        })
      ];
      lighting.selectedLightId = 'back-main';
      lighting.ambient = { color: '#283752', intensity: 5 };
      lighting.shadow = { color: '#101521', intensity: 70 };
      lighting.bounce = { color: '#44566E', intensity: 2 };
      lighting.rim = { color: '#DAF2FF', intensity: 88 };
      return lighting;
    }
  },
  {
    id: 'top',
    name: 'Desde arriba',
    description: 'La parte superior recibe más luz; debajo cae la sombra.',
    preview: preview('#FFF1D3', '#221D29', '#0D0C10', '50%', '10%'),
    build: () => {
      const lighting = baseLighting('top');
      lighting.lights = [
        createDirectLight({
          id: 'top-main',
          name: 'Luz superior',
          color: '#FFF1D3',
          intensity: 88,
          direction: 0,
          elevation: 84,
          softness: 18
        })
      ];
      lighting.selectedLightId = 'top-main';
      lighting.ambient = { color: '#6C6A7D', intensity: 6 };
      lighting.shadow = { color: '#2B2330', intensity: 62 };
      lighting.bounce = { color: '#B37E66', intensity: 4 };
      lighting.rim = { color: '#F8E6C4', intensity: 4 };
      return lighting;
    }
  },
  {
    id: 'bottom',
    name: 'Desde abajo',
    description: 'La luz viene desde abajo y crea un efecto raro o inquietante.',
    preview: preview('#BDF6E0', '#201B2B', '#0C0A12', '50%', '88%'),
    build: () => {
      const lighting = baseLighting('bottom');
      lighting.lights = [
        createDirectLight({
          id: 'bottom-main',
          name: 'Luz inferior',
          color: '#B8F2DD',
          intensity: 78,
          direction: 0,
          elevation: -74,
          softness: 18
        })
      ];
      lighting.selectedLightId = 'bottom-main';
      lighting.ambient = { color: '#433A58', intensity: 6 };
      lighting.shadow = { color: '#231A2F', intensity: 66 };
      lighting.bounce = { color: '#73C8B4', intensity: 18 };
      lighting.rim = { color: '#D9FFF3', intensity: 2 };
      return lighting;
    }
  },
  {
    id: 'warm',
    name: 'Atardecer cálido',
    description: 'Naranjas y dorados más intensos, como luz de tarde.',
    preview: preview('#FFAE58', '#6E3652', '#23131C', '30%', '36%'),
    build: () => {
      const lighting = baseLighting('warm');
      lighting.lights = [
        createDirectLight({
          id: 'warm-main',
          name: 'Luz cálida',
          color: '#FFB463',
          intensity: 82,
          direction: -44,
          elevation: 20,
          softness: 42
        })
      ];
      lighting.selectedLightId = 'warm-main';
      lighting.ambient = { color: '#7E6B92', intensity: 14 };
      lighting.shadow = { color: '#4C345E', intensity: 44 };
      lighting.bounce = { color: '#EE885B', intensity: 22 };
      lighting.rim = { color: '#FFD8A4', intensity: 8 };
      return lighting;
    }
  },
  {
    id: 'cool',
    name: 'Noche azul',
    description: 'Luz fría para escenas nocturnas con más contraste.',
    preview: preview('#79B2FF', '#162657', '#071022', '72%', '26%'),
    build: () => {
      const lighting = baseLighting('cool');
      lighting.lights = [
        createDirectLight({
          id: 'cool-main',
          name: 'Luz azul',
          color: '#7FAEFF',
          intensity: 60,
          direction: 36,
          elevation: 42,
          softness: 44
        })
      ];
      lighting.selectedLightId = 'cool-main';
      lighting.ambient = { color: '#223A74', intensity: 28 };
      lighting.shadow = { color: '#18173D', intensity: 58 };
      lighting.bounce = { color: '#436B9D', intensity: 8 };
      lighting.rim = { color: '#A6ECFF', intensity: 24 };
      return lighting;
    }
  },
  {
    id: 'dual',
    name: 'Azul + naranja',
    description: 'Una luz fría y otra cálida para un look mucho más cinematográfico.',
    preview: preview('#FF7A56', '#53B0FF', '#1F1527', '22%', '44%'),
    build: () => {
      const lighting = baseLighting('dual');
      lighting.lights = [
        createDirectLight({
          id: 'dual-warm',
          name: 'Luz naranja',
          color: '#FF7A58',
          intensity: 66,
          direction: -58,
          elevation: 18,
          softness: 20
        }),
        createDirectLight({
          id: 'dual-cool',
          name: 'Luz azul',
          color: '#57B7FF',
          intensity: 60,
          direction: 66,
          elevation: 30,
          softness: 28
        }, 1)
      ];
      lighting.selectedLightId = 'dual-warm';
      lighting.ambient = { color: '#5F4A7D', intensity: 14 };
      lighting.shadow = { color: '#2B213A', intensity: 52 };
      lighting.bounce = { color: '#A46870', intensity: 7 };
      lighting.rim = { color: '#AEEBFF', intensity: 16 };
      return lighting;
    }
  },
  {
    id: 'stage',
    name: 'Escenario de color',
    description: 'Luces creativas de colores como escenario, foto o concierto.',
    preview: preview('#56E7FF', '#FF4FA7', '#211134', '30%', '20%'),
    build: () => {
      const lighting = baseLighting('stage');
      lighting.lights = [
        createDirectLight({
          id: 'stage-cyan',
          name: 'Luz celeste',
          color: '#55E7FF',
          intensity: 62,
          direction: -72,
          elevation: 48,
          softness: 18
        }),
        createDirectLight({
          id: 'stage-pink',
          name: 'Luz rosada',
          color: '#FF4FA7',
          intensity: 58,
          direction: 72,
          elevation: 22,
          softness: 20
        }, 1),
        createDirectLight({
          id: 'stage-purple',
          name: 'Luz morada',
          color: '#9A64FF',
          intensity: 42,
          direction: 8,
          elevation: 70,
          softness: 34
        }, 2)
      ];
      lighting.selectedLightId = 'stage-cyan';
      lighting.ambient = { color: '#311E52', intensity: 18 };
      lighting.shadow = { color: '#160F28', intensity: 54 };
      lighting.bounce = { color: '#583F92', intensity: 9 };
      lighting.rim = { color: '#9AE9FF', intensity: 26 };
      return lighting;
    }
  },
  {
    id: 'silhouette',
    name: 'Silueta',
    description: 'Casi toda la figura queda oscura y la luz solo marca el borde.',
    preview: preview('#FFF1B5', '#06070B', '#010204', '84%', '28%'),
    build: () => {
      const lighting = baseLighting('silhouette');
      lighting.lights = [
        createDirectLight({
          id: 'silhouette-back',
          name: 'Luz trasera',
          color: '#FFE8A8',
          intensity: 16,
          direction: 176,
          elevation: 20,
          softness: 28
        })
      ];
      lighting.selectedLightId = 'silhouette-back';
      lighting.ambient = { color: '#161821', intensity: 0 };
      lighting.shadow = { color: '#05070A', intensity: 98 };
      lighting.bounce = { color: '#1F2430', intensity: 0 };
      lighting.rim = { color: '#FFF0B9', intensity: 82 };
      return lighting;
    }
  }
];

const LEGACY_SCENE_ALIASES = {
  neutral: 'front-soft',
  night: 'cool'
};

export function sceneLighting(sceneId) {
  const normalized =
    LEGACY_SCENE_ALIASES[sceneId] || sceneId;

  const scene =
    LIGHTING_SCENES.find((item) => item.id === normalized) ||
    LIGHTING_SCENES[0];

  const lighting = scene.build();
  lighting.sceneId = scene.id;
  return lighting;
}

export function activeLights(lighting) {
  return lighting?.enabled === false
    ? []
    : (lighting?.lights || []).filter(
        (light) =>
          light.enabled &&
          Number(light.intensity) > 0
      );
}

function descriptor(entry) {
  return `${entry?.name || ''} ${entry?.group || ''} ${entry?.role || ''}`.toLowerCase();
}

function toneBand(entry) {
  const text = descriptor(entry);

  if (/oclusi|occlusion/.test(text)) return -1.0;
  if (/profunda|deep/.test(text)) return -0.88;
  if (/sombra media|mid shadow/.test(text)) return -0.66;
  if (/sombra suave|soft shadow/.test(text)) return -0.48;
  if (/transicion fria|transición fría|cool transition/.test(text)) return -0.26;
  if (/base secundaria|secondary base/.test(text)) return -0.12;
  if (/base principal|main base|principal/.test(text)) return 0.0;
  if (/transicion calida|transición cálida|warm transition/.test(text)) return 0.18;
  if (/circulacion|circulación|circulation/.test(text)) return 0.24;
  if (/medio tono claro|light midtone/.test(text)) return 0.34;
  if (/luz suave|soft light/.test(text)) return 0.46;
  if (/luz media|mid light/.test(text)) return 0.62;
  if (/luz fuerte|strong light/.test(text)) return 0.76;
  if (/highlight/.test(text)) return 0.88;
  if (/rebote|bounce/.test(text)) return 0.68;
  if (/especular|specular/.test(text)) return 1.0;

  if (/shadow|sombra|oscura/.test(text)) return -0.52;
  if (/light|luz|brillo/.test(text)) return 0.56;
  return 0.0;
}

function warmthBias(entry) {
  const text = descriptor(entry);
  if (/fria|frío|frio|cool|azul/.test(text)) return -1;
  if (/calida|cálida|warm|naranja|oro|gold/.test(text)) return 1;
  return 0;
}

function primaryLightColor(lighting) {
  const lights = activeLights(lighting);
  return lights[0]?.color || '#FFF1D6';
}

function secondaryLightColor(lighting) {
  const lights = activeLights(lighting);
  return lights[1]?.color || lights[0]?.color || '#9CCBFF';
}

function roleStrength(entry, kind) {
  const band = toneBand(entry);
  const abs = Math.abs(band);
  const bright = band > 0;
  const text = descriptor(entry);

  if (kind === 'shadow') {
    if (band <= -0.75) return 1.0;
    if (band < 0) return 0.68;
    return /specular|highlight/.test(text) ? 0.02 : 0.14;
  }

  if (kind === 'direct') {
    if (band >= 0.85) return 1.0;
    if (band > 0.55) return 0.88;
    if (band > 0.2) return 0.62;
    if (band < -0.45) return 0.16;
    if (band < 0) return 0.28;
    return 0.46;
  }

  if (kind === 'bounce') {
    if (/rebote|bounce/.test(text)) return 1.0;
    if (band > 0.4) return 0.36;
    if (band < -0.45) return 0.18;
    return 0.30;
  }

  if (kind === 'rim') {
    if (bright) return 0.58 + abs * 0.2;
    return 0.18;
  }

  if (kind === 'ambient') {
    if (band <= -0.7) return 0.18;
    if (band >= 0.75) return 0.26;
    return 0.36;
  }

  return 0.32;
}

function applyDirectLight(hex, entry, light) {
  const direction =
    Math.cos(
      (Number(light.direction) || 0) *
      Math.PI / 180
    );

  const elevation =
    (clamp(light.elevation, -90, 90) + 90) / 180;

  const softness =
    clamp(light.softness, 0, 100) / 100;

  const spatial =
    0.90 +
    direction * 0.10 +
    elevation * 0.14;

  const amount =
    clamp(light.intensity, 0, 100) /
    100 *
    roleStrength(entry, 'direct') *
    spatial *
    (0.70 - softness * 0.18);

  return mixHex(hex, light.color, amount);
}

function applyComponent(
  hex,
  entry,
  component,
  kind,
  scale
) {
  const color = normalizeHex(component?.color);
  if (!color || !component?.intensity) return hex;

  const amount =
    clamp(component.intensity, 0, 100) /
    100 *
    roleStrength(entry, kind) *
    scale;

  return mixHex(hex, color, amount);
}

function applyToneStructure(hex, entry, lighting) {
  const band = toneBand(entry);
  const shadowColor = normalizeHex(lighting?.shadow?.color) || '#25222E';
  const mainLight = primaryLightColor(lighting);
  const secondLight = secondaryLightColor(lighting);
  const warmBias = warmthBias(entry);

  let out = hex;

  if (band < 0) {
    const shadowAmount =
      Math.min(0.82, Math.abs(band) * 0.58 + (lighting.shadow?.intensity || 0) / 300);
    out = mixHex(out, shadowColor, shadowAmount);

    if (band > -0.45) {
      out = mixHex(out, secondLight, 0.06);
    }
  } else if (band > 0) {
    const liftAmount = Math.min(0.78, band * 0.44);
    out = mixHex(out, mainLight, liftAmount);

    if (band > 0.6) {
      out = mixHex(out, '#FFF9F1', Math.min(0.28, (band - 0.58) * 0.36));
    }
  }

  if (warmBias > 0) {
    out = mixHex(out, normalizeHex(lighting?.bounce?.color) || '#D59B7E', 0.08);
  } else if (warmBias < 0) {
    out = mixHex(out, normalizeHex(lighting?.rim?.color) || '#BBD9FF', 0.08);
  }

  return out;
}

export function applyLightingToPalette(
  entries,
  lighting,
  options = {}
) {
  const source =
    Array.isArray(entries) ? entries : [];

  if (!lighting?.enabled) {
    return source.map((entry) => ({
      ...entry,
      originalHex: entry.hex
    }));
  }

  const onlyLightId =
    options.onlyLightId || null;

  const lights =
    activeLights(lighting).filter(
      (light) =>
        !onlyLightId ||
        light.id === onlyLightId
    );

  return source.map((entry) => {
    let hex = entry.hex;
    hex = applyToneStructure(hex, entry, lighting);

    if (!onlyLightId) {
      hex = applyComponent(
        hex,
        entry,
        lighting.ambient,
        'ambient',
        0.30
      );

      hex = applyComponent(
        hex,
        entry,
        lighting.shadow,
        'shadow',
        0.72
      );
    }

    lights.forEach((light) => {
      hex = applyDirectLight(
        hex,
        entry,
        light
      );
    });

    if (!onlyLightId) {
      hex = applyComponent(
        hex,
        entry,
        lighting.bounce,
        'bounce',
        0.54
      );

      hex = applyComponent(
        hex,
        entry,
        lighting.rim,
        'rim',
        0.56
      );
    }

    return {
      ...entry,
      originalHex: entry.hex,
      hex,
      lightingApplied: true
    };
  });
}

export function dominantLightVector(lighting) {
  const lights = activeLights(lighting);

  if (!lights.length) {
    return {
      x: -.35,
      y: -.4,
      softness: .4
    };
  }

  let x = 0;
  let y = 0;
  let weight = 0;
  let softness = 0;

  lights.forEach((light) => {
    const amount =
      Math.max(
        1,
        Number(light.intensity) || 0
      );

    const radians =
      Number(light.direction) *
      Math.PI / 180;

    x += Math.sin(radians) * amount;

    y -=
      Math.sin(
        Number(light.elevation) *
        Math.PI / 180
      ) * amount;

    softness +=
      clamp(light.softness, 0, 100) /
      100 *
      amount;

    weight += amount;
  });

  return {
    x: clamp(x / weight, -1, 1),
    y: clamp(y / weight, -1, 1),
    softness: clamp(softness / weight, 0, 1)
  };
}

export function lightingSummary(lighting) {
  if (!lighting?.enabled) {
    return 'Iluminación apagada';
  }

  const count =
    activeLights(lighting).length;

  const scene =
    LIGHTING_SCENES.find(
      (item) => item.id === lighting.sceneId
    );

  const name =
    scene?.name ||
    'Personalizada';

  return `${name} · ${count} ${
    count === 1 ? 'luz' : 'luces'
  }`;
}