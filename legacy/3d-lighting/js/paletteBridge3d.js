const LIGHT_LAB_LIBRARY_KEY = 'kaoru.light-lab.library.v1';
const TRANSFER_KEY = 'kaoru.3d-lightlab.transfer.v1';

function clone(value) {
  if (value == null) return value;
  try { return structuredClone(value); }
  catch (_) { return JSON.parse(JSON.stringify(value)); }
}

function normalizeHex(value, fallback = '#808080') {
  const raw = String(value || '').trim().toUpperCase();
  const hex = raw.startsWith('#') ? raw : `#${raw}`;
  return /^#[0-9A-F]{6}$/.test(hex) ? hex : fallback;
}

function normalizeEntries(payload) {
  const source =
    payload?.palette?.entries ||
    payload?.payload?.palette?.entries ||
    payload?.illuminatedPalette ||
    payload?.payload?.illuminatedPalette ||
    [];

  return source
    .filter((entry) => entry && entry.hex)
    .slice(0, 16)
    .map((entry, index) => ({
      role: String(entry.role || `Color ${index + 1}`),
      group: String(entry.group || ''),
      hex: normalizeHex(entry.originalHex || entry.hex)
    }));
}

function payloadFromRecord(record) {
  if (!record) return null;
  if (record.payload?.schema === 'kaoru.light-lab.project') return record.payload;
  if (record.schema === 'kaoru.light-lab.project') return record;
  if (record.payload?.payload?.schema === 'kaoru.light-lab.project') {
    return record.payload.payload;
  }
  return record.payload || record;
}

function findEntry(entries, tests, fallbackIndex = 0) {
  const found = entries.find((entry) => {
    const text = `${entry.group} ${entry.role}`.toLowerCase();
    return tests.some((test) => test.test(text));
  });

  return found || entries[fallbackIndex] || entries[0] || {
    role: 'Base',
    group: 'base',
    hex: '#C98E78'
  };
}

function scaleLightLabLighting(sourceLighting, currentLighting) {
  if (!sourceLighting) return currentLighting;

  const sourceLights = Array.isArray(sourceLighting.lights)
    ? sourceLighting.lights.slice(0, 8)
    : [];

  const lights = sourceLights.length
    ? sourceLights.map((light, index) => ({
        id: `ll-${index}-${String(light.id || index).replace(/[^\w-]/g, '')}`,
        name: String(light.name || `Luz ${index + 1}`).slice(0, 30),
        color: normalizeHex(light.color, '#FFFFFF'),
        intensity: Math.max(0, Math.min(200, Number(light.intensity) || 0)),
        azimuth: Math.max(-180, Math.min(180, Number(light.direction) || 0)),
        elevation: Math.max(-85, Math.min(85, Number(light.elevation) || 0)),
        distance: 5.0 + index * 0.35,
        softness: Math.max(0, Math.min(100, Number(light.softness) || 0)),
        enabled: light.enabled !== false
      }))
    : currentLighting.lights;

  return {
    ...currentLighting,
    enabled: sourceLighting.enabled !== false,
    selectedLightId: lights[0]?.id || currentLighting.selectedLightId,
    ambient: {
      color: normalizeHex(
        sourceLighting.ambient?.color,
        currentLighting.ambient.color
      ),
      intensity: Number(
        sourceLighting.ambient?.intensity ??
        currentLighting.ambient.intensity
      )
    },
    shadow: {
      color: normalizeHex(
        sourceLighting.shadow?.color,
        currentLighting.shadow.color
      ),
      intensity: Number(
        sourceLighting.shadow?.intensity ??
        currentLighting.shadow.intensity
      )
    },
    bounce: {
      color: normalizeHex(
        sourceLighting.bounce?.color,
        currentLighting.bounce.color
      ),
      intensity: Number(
        sourceLighting.bounce?.intensity ??
        currentLighting.bounce.intensity
      )
    },
    rim: {
      color: normalizeHex(
        sourceLighting.rim?.color,
        currentLighting.rim.color
      ),
      intensity: Number(
        sourceLighting.rim?.intensity ??
        currentLighting.rim.intensity
      )
    },
    lights
  };
}

function roleLighting(entries, currentLighting) {
  if (!entries.length) return currentLighting;

  const shadow = findEntry(
    entries,
    [/sombra media/, /shadow/],
    2
  );

  const bounce = findEntry(
    entries,
    [/rebote/, /bounce/, /reflejo ambiente/],
    Math.max(0, entries.length - 2)
  );

  const highlight = findEntry(
    entries,
    [/highlight/, /brillo especular/, /luz fuerte/, /light/],
    Math.max(0, entries.length - 1)
  );

  const ambient = findEntry(
    entries,
    [/transicion fria/, /transici.n fr.a/, /ambient/],
    Math.min(4, entries.length - 1)
  );

  const nextLights = currentLighting.lights.map((light, index) => {
    if (index === 0) {
      return { ...light, color: highlight.hex };
    }

    if (index === 1) {
      return { ...light, color: bounce.hex };
    }

    return light;
  });

  return {
    ...currentLighting,
    shadow: {
      ...currentLighting.shadow,
      color: shadow.hex
    },
    bounce: {
      ...currentLighting.bounce,
      color: bounce.hex
    },
    rim: {
      ...currentLighting.rim,
      color: highlight.hex
    },
    ambient: {
      ...currentLighting.ambient,
      color: ambient.hex
    },
    lights: nextLights
  };
}

export function extractLightLabPalette(record) {
  const payload = payloadFromRecord(record);
  const entries = normalizeEntries(payload);

  if (!entries.length) {
    throw new Error('La paleta Light Lab no contiene colores compatibles.');
  }

  return {
    id: record?.id || payload?.project?.id || null,
    name:
      record?.name ||
      payload?.project?.name ||
      'Paleta Light Lab',
    payload,
    entries
  };
}

export function applyLightLabPaletteToState(
  state,
  record,
  options = {}
) {
  const palette = extractLightLabPalette(record);
  const entries = palette.entries;

  const base = findEntry(
    entries,
    [/base principal/, /base media/, /\bbase\b/],
    Math.floor(entries.length * 0.40)
  );

  let lighting = clone(state.lighting);

  if (options.syncLighting !== false) {
    const sourceLighting = palette.payload?.lighting;

    lighting = sourceLighting
      ? scaleLightLabLighting(sourceLighting, lighting)
      : roleLighting(entries, lighting);
  }

  return {
    ...state,
    baseColor: base.hex,
    material: {
      ...state.material,
      paletteMode: 'palette-bands',
      palette: clone(entries),
      syncLighting: options.syncLighting !== false,
      sourcePalette: {
        id: palette.id,
        name: palette.name,
        source: options.source || 'light-lab'
      }
    },
    lighting
  };
}

export async function listAvailableLightLabPalettes() {
  const results = [];
  const seen = new Set();

  try {
    const local = JSON.parse(
      localStorage.getItem(LIGHT_LAB_LIBRARY_KEY) || '[]'
    );

    if (Array.isArray(local)) {
      local.forEach((record) => {
        try {
          const palette = extractLightLabPalette(record);
          const key = `local:${record.id || palette.name}`;

          if (!seen.has(key)) {
            seen.add(key);
            results.push({
              source: 'Biblioteca Light Lab',
              record,
              palette
            });
          }
        } catch (_) {}
      });
    }
  } catch (_) {}

  if (window.StudioGallery?.list) {
    try {
      const gallery = await window.StudioGallery.list({
        studio: 'light'
      });

      gallery.forEach((record) => {
        try {
          const palette = extractLightLabPalette(record);
          const key = `gallery:${record.id}`;

          if (!seen.has(key)) {
            seen.add(key);
            results.push({
              source: 'Galeria',
              record,
              palette
            });
          }
        } catch (_) {}
      });
    } catch (_) {}
  }

  return results;
}

export async function readLightLabFile(file) {
  if (!file) throw new Error('No seleccionaste una paleta.');

  const data = JSON.parse(await file.text());

  if (data?.schema === 'silueta-studio-portable-project') {
    if (data.record?.studio !== 'light') {
      throw new Error('Ese archivo no pertenece a Light Lab.');
    }

    return data.record;
  }

  if (data?.schema === 'kaoru.light-lab.library-item') {
    return data;
  }

  if (data?.schema === 'kaoru.light-lab.project') {
    return {
      id: null,
      name: data.project?.name || file.name,
      payload: data
    };
  }

  if (data?.studio === 'light' && data.payload) {
    return data;
  }

  throw new Error('El archivo no es una paleta Light Lab compatible.');
}

export function consumeLightLabTransfer() {
  try {
    const data = JSON.parse(
      sessionStorage.getItem(TRANSFER_KEY) || 'null'
    );

    sessionStorage.removeItem(TRANSFER_KEY);

    if (!data?.payload) return null;

    return {
      id: null,
      name: data.name || data.payload?.project?.name || 'Paleta Light Lab',
      payload: data.payload
    };
  } catch (_) {
    return null;
  }
}

export function storeLightLabTransfer(payload, name) {
  sessionStorage.setItem(
    TRANSFER_KEY,
    JSON.stringify({
      name: name || payload?.project?.name || 'Paleta Light Lab',
      payload
    })
  );
}

function disposePalettePatch(material) {
  const texture = material.userData?.kaoruPaletteTexture;

  if (texture) texture.dispose?.();

  material.userData.kaoruPaletteTexture = null;
  material.userData.kaoruPaletteActive = false;
  material.onBeforeCompile = () => {};
  material.customProgramCacheKey = () => 'kaoru-base-material-v1';
  material.needsUpdate = true;
}

function textureForPalette(THREE, entries) {
  const source = entries.slice(0, 16);

  while (source.length < 16) {
    source.push(
      source[source.length - 1] || {
        role: 'Color',
        group: '',
        hex: '#808080'
      }
    );
  }

  const bytes = new Uint8Array(16 * 4);

  source.forEach((entry, index) => {
    const color = new THREE.Color(
      normalizeHex(entry.hex, '#808080')
    );

    bytes[index * 4] = Math.round(color.r * 255);
    bytes[index * 4 + 1] = Math.round(color.g * 255);
    bytes[index * 4 + 2] = Math.round(color.b * 255);
    bytes[index * 4 + 3] = 255;
  });

  const texture = new THREE.DataTexture(
    bytes,
    16,
    1,
    THREE.RGBAFormat,
    THREE.UnsignedByteType
  );

  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  return texture;
}

function applyPalettePatch(THREE, material, entries) {
  disposePalettePatch(material);

  const texture = textureForPalette(THREE, entries);

  material.userData.kaoruPaletteTexture = texture;
  material.userData.kaoruPaletteActive = true;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.kaoruPalette = {
      value: texture
    };

    shader.fragmentShader =
      'uniform sampler2D kaoruPalette;\n' +
      shader.fragmentShader;

    const marker = '#include <opaque_fragment>';

    if (shader.fragmentShader.includes(marker)) {
      shader.fragmentShader = shader.fragmentShader.replace(
        marker,
        `${marker}
        float kaoruLum = dot(
          gl_FragColor.rgb,
          vec3(0.2126, 0.7152, 0.0722)
        );
        kaoruLum = clamp(pow(max(kaoruLum, 0.0), 0.72), 0.0, 0.9999);
        gl_FragColor.rgb = texture2D(
          kaoruPalette,
          vec2(kaoruLum, 0.5)
        ).rgb;`
      );
    }
  };

  material.customProgramCacheKey = () =>
    `kaoru-palette-bands-v2-${entries.map((entry) => entry.hex).join('-')}`;

  material.needsUpdate = true;
}

export function applyPaletteToMaterials(
  THREE,
  materials,
  materialState
) {
  const unique = [...new Set(
    (materials || []).filter(Boolean)
  )];

  const entries = Array.isArray(materialState?.palette)
    ? materialState.palette
    : [];

  const active =
    materialState?.paletteMode === 'palette-bands' &&
    entries.length > 1;

  unique.forEach((material) => {
    if (!material?.userData?.subjectColor) return;

    if (active) {
      applyPalettePatch(THREE, material, entries);
    } else {
      disposePalettePatch(material);
    }
  });
}