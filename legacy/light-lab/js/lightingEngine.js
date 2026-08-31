import { clamp, mixHex, normalizeHex } from './colorUtils.js';

export const LIGHTING_ENGINE_PHASE = 4;
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
    color: '#FFF1D6',
    intensity: 64,
    direction: 0,
    elevation: 20,
    softness: 72
  });

  return {
    sceneId: 'front-soft',
    enabled: true,
    lights: [first],
    selectedLightId: first.id,
    ambient: { color: '#B7C4D9', intensity: 18 },
    shadow: { color: '#4A4254', intensity: 22 },
    bounce: { color: '#D9A58E', intensity: 8 },
    rim: { color: '#CDE7FF', intensity: 0 }
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
    description: 'Ilumina la cara u objeto de frente sin sombras muy fuertes.',
    preview: preview('#FFF0D0', '#8796B0', '#252633', '50%', '28%'),
    build: () => createDefaultLighting()
  },
  {
    id: 'side',
    name: 'De lado',
    description: 'Un lado queda más iluminado y el otro más oscuro.',
    preview: preview('#FFE2B7', '#20263A', '#131722', '24%', '42%'),
    build: () => {
      const lighting = baseLighting('side');
      lighting.lights = [
        createDirectLight({
          id: 'side-main',
          name: 'Luz de lado',
          color: '#FFE0B2',
          intensity: 76,
          direction: -78,
          elevation: 20,
          softness: 38
        })
      ];
      lighting.selectedLightId = 'side-main';
      lighting.ambient = { color: '#71809A', intensity: 10 };
      lighting.shadow = { color: '#2C3142', intensity: 48 };
      lighting.bounce = { color: '#B57B65', intensity: 6 };
      return lighting;
    }
  },
  {
    id: 'split',
    name: 'Mitad luz / mitad sombra',
    description: 'Divide claramente la figura entre una zona iluminada y otra oscura.',
    preview: preview('#FFD9AA', '#10131B', '#090B10', '18%', '45%'),
    build: () => {
      const lighting = baseLighting('split');
      lighting.lights = [
        createDirectLight({
          id: 'split-main',
          name: 'Luz lateral fuerte',
          color: '#FFD7A6',
          intensity: 86,
          direction: -92,
          elevation: 8,
          softness: 12
        })
      ];
      lighting.selectedLightId = 'split-main';
      lighting.ambient = { color: '#536078', intensity: 3 };
      lighting.shadow = { color: '#151927', intensity: 72 };
      lighting.bounce = { color: '#A96655', intensity: 2 };
      return lighting;
    }
  },
  {
    id: 'dramatic',
    name: 'Dramática',
    description: 'Sombras profundas y una luz marcada para un aspecto intenso.',
    preview: preview('#FFC06E', '#1D1721', '#0B090E', '30%', '20%'),
    build: () => {
      const lighting = baseLighting('dramatic');
      lighting.lights = [
        createDirectLight({
          id: 'dramatic-main',
          name: 'Luz fuerte',
          color: '#FFC474',
          intensity: 90,
          direction: -48,
          elevation: 56,
          softness: 10
        })
      ];
      lighting.selectedLightId = 'dramatic-main';
      lighting.ambient = { color: '#443850', intensity: 4 };
      lighting.shadow = { color: '#211522', intensity: 76 };
      lighting.bounce = { color: '#8D4F3D', intensity: 4 };
      return lighting;
    }
  },
  {
    id: 'backlight',
    name: 'Contraluz',
    description: 'La luz viene desde atrás y destaca sobre todo el borde de la figura.',
    preview: preview('#F4F7FF', '#1A2335', '#080B12', '78%', '28%'),
    build: () => {
      const lighting = baseLighting('backlight');
      lighting.lights = [
        createDirectLight({
          id: 'back-main',
          name: 'Luz desde atrás',
          color: '#E8F4FF',
          intensity: 34,
          direction: 170,
          elevation: 30,
          softness: 34
        })
      ];
      lighting.selectedLightId = 'back-main';
      lighting.ambient = { color: '#344663', intensity: 6 };
      lighting.shadow = { color: '#161B27', intensity: 62 };
      lighting.bounce = { color: '#394C66', intensity: 2 };
      lighting.rim = { color: '#D9F1FF', intensity: 82 };
      return lighting;
    }
  },
  {
    id: 'top',
    name: 'Desde arriba',
    description: 'La parte superior recibe más luz y debajo aparecen sombras marcadas.',
    preview: preview('#FFF1D5', '#282331', '#111016', '50%', '8%'),
    build: () => {
      const lighting = baseLighting('top');
      lighting.lights = [
        createDirectLight({
          id: 'top-main',
          name: 'Luz superior',
          color: '#FFF0D1',
          intensity: 82,
          direction: 0,
          elevation: 84,
          softness: 26
        })
      ];
      lighting.selectedLightId = 'top-main';
      lighting.ambient = { color: '#777489', intensity: 8 };
      lighting.shadow = { color: '#30293A', intensity: 58 };
      lighting.bounce = { color: '#AC7660', intensity: 4 };
      return lighting;
    }
  },
  {
    id: 'bottom',
    name: 'Desde abajo',
    description: 'La luz sube desde abajo y crea un efecto extraño o inquietante.',
    preview: preview('#BDF6E0', '#292238', '#100E16', '50%', '88%'),
    build: () => {
      const lighting = baseLighting('bottom');
      lighting.lights = [
        createDirectLight({
          id: 'bottom-main',
          name: 'Luz inferior',
          color: '#B8F2DD',
          intensity: 74,
          direction: 0,
          elevation: -76,
          softness: 24
        })
      ];
      lighting.selectedLightId = 'bottom-main';
      lighting.ambient = { color: '#4B4164', intensity: 7 };
      lighting.shadow = { color: '#2B2037', intensity: 62 };
      lighting.bounce = { color: '#74C7B2', intensity: 14 };
      return lighting;
    }
  },
  {
    id: 'warm',
    name: 'Atardecer cálido',
    description: 'Naranjas y dorados como una habitación o una escena al atardecer.',
    preview: preview('#FFB15E', '#78415F', '#2B1720', '30%', '38%'),
    build: () => {
      const lighting = baseLighting('warm');
      lighting.lights = [
        createDirectLight({
          id: 'warm-main',
          name: 'Luz cálida',
          color: '#FFB36B',
          intensity: 74,
          direction: -42,
          elevation: 24,
          softness: 52
        })
      ];
      lighting.selectedLightId = 'warm-main';
      lighting.ambient = { color: '#806D91', intensity: 18 };
      lighting.shadow = { color: '#4A365E', intensity: 38 };
      lighting.bounce = { color: '#E98662', intensity: 18 };
      return lighting;
    }
  },
  {
    id: 'cool',
    name: 'Noche azul',
    description: 'Una iluminación fría y azulada para escenas nocturnas.',
    preview: preview('#83B7FF', '#1A2754', '#091127', '66%', '30%'),
    build: () => {
      const lighting = baseLighting('cool');
      lighting.lights = [
        createDirectLight({
          id: 'cool-main',
          name: 'Luz azul',
          color: '#84AFFF',
          intensity: 54,
          direction: 38,
          elevation: 46,
          softness: 58
        })
      ];
      lighting.selectedLightId = 'cool-main';
      lighting.ambient = { color: '#263B70', intensity: 30 };
      lighting.shadow = { color: '#211D45', intensity: 52 };
      lighting.bounce = { color: '#486BA1', intensity: 8 };
      lighting.rim = { color: '#8EDCFF', intensity: 22 };
      return lighting;
    }
  },
  {
    id: 'dual',
    name: 'Azul + naranja',
    description: 'Una luz fría y otra cálida desde lados distintos.',
    preview: preview('#FF855C', '#4DAFFF', '#251A2E', '22%', '42%'),
    build: () => {
      const lighting = baseLighting('dual');
      lighting.lights = [
        createDirectLight({
          id: 'dual-warm',
          name: 'Luz naranja',
          color: '#FF795C',
          intensity: 60,
          direction: -58,
          elevation: 20,
          softness: 32
        }),
        createDirectLight({
          id: 'dual-cool',
          name: 'Luz azul',
          color: '#5CB8FF',
          intensity: 55,
          direction: 66,
          elevation: 34,
          softness: 38
        }, 1)
      ];
      lighting.selectedLightId = 'dual-warm';
      lighting.ambient = { color: '#694C87', intensity: 16 };
      lighting.shadow = { color: '#372849', intensity: 42 };
      lighting.bounce = { color: '#A86470', intensity: 7 };
      lighting.rim = { color: '#A6E8FF', intensity: 14 };
      return lighting;
    }
  },
  {
    id: 'stage',
    name: 'Escenario de color',
    description: 'Varias luces de colores como en concierto, club o fotografía creativa.',
    preview: preview('#56E7FF', '#FF4FA7', '#211134', '28%', '24%'),
    build: () => {
      const lighting = baseLighting('stage');
      lighting.lights = [
        createDirectLight({
          id: 'stage-cyan',
          name: 'Luz celeste',
          color: '#55E7FF',
          intensity: 56,
          direction: -72,
          elevation: 50,
          softness: 26
        }),
        createDirectLight({
          id: 'stage-pink',
          name: 'Luz rosada',
          color: '#FF4FA7',
          intensity: 52,
          direction: 70,
          elevation: 28,
          softness: 30
        }, 1),
        createDirectLight({
          id: 'stage-purple',
          name: 'Luz morada',
          color: '#9A64FF',
          intensity: 34,
          direction: 8,
          elevation: 72,
          softness: 44
        }, 2)
      ];
      lighting.selectedLightId = 'stage-cyan';
      lighting.ambient = { color: '#362255', intensity: 20 };
      lighting.shadow = { color: '#1A1328', intensity: 48 };
      lighting.bounce = { color: '#6048A0', intensity: 8 };
      lighting.rim = { color: '#9AE9FF', intensity: 22 };
      return lighting;
    }
  },
  {
    id: 'silhouette',
    name: 'Silueta',
    description: 'La figura queda casi oscura con una luz fuerte detrás o en el borde.',
    preview: preview('#FFF1B5', '#08090D', '#020205', '84%', '28%'),
    build: () => {
      const lighting = baseLighting('silhouette');
      lighting.lights = [
        createDirectLight({
          id: 'silhouette-back',
          name: 'Luz trasera',
          color: '#FFE8A8',
          intensity: 20,
          direction: 176,
          elevation: 20,
          softness: 34
        })
      ];
      lighting.selectedLightId = 'silhouette-back';
      lighting.ambient = { color: '#1B1C25', intensity: 0 };
      lighting.shadow = { color: '#08090E', intensity: 94 };
      lighting.bounce = { color: '#222734', intensity: 0 };
      lighting.rim = { color: '#FFF0B9', intensity: 74 };
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

function roleStrength(entry, kind) {
  const role =
    `${entry.group || ''} ${entry.role || ''}`.toLowerCase();

  const isShadow =
    /shadow|sombra|oscura/.test(role);

  const isLight =
    /light|luz|highlight|brillo|especular/.test(role);

  const isBounce =
    /bounce|rebote|ambiente/.test(role);

  if (kind === 'direct')
    return isLight ? 1 : isShadow ? .22 : isBounce ? .48 : .62;

  if (kind === 'shadow')
    return isShadow ? 1 : isLight ? .08 : .36;

  if (kind === 'bounce')
    return isShadow ? .72 : isBounce ? 1 : isLight ? .2 : .42;

  if (kind === 'rim')
    return isLight ? .88 : isBounce ? 1 : isShadow ? .12 : .34;

  return isShadow ? .58 : isLight ? .34 : .48;
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
    .82 +
    direction * .08 +
    elevation * .13;

  const amount =
    clamp(light.intensity, 0, 100) /
    100 *
    roleStrength(entry, 'direct') *
    spatial *
    (.58 - softness * .12);

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

  if (!color || !component?.intensity)
    return hex;

  const amount =
    clamp(component.intensity, 0, 100) /
    100 *
    roleStrength(entry, kind) *
    scale;

  return mixHex(hex, color, amount);
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

    if (!onlyLightId) {
      hex = applyComponent(
        hex,
        entry,
        lighting.ambient,
        'ambient',
        .34
      );

      hex = applyComponent(
        hex,
        entry,
        lighting.shadow,
        'shadow',
        .58
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
        .42
      );

      hex = applyComponent(
        hex,
        entry,
        lighting.rim,
        'rim',
        .46
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