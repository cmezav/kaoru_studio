import { createInitial3dState } from './state.js?v=6.0';

export const STORAGE3D_PHASE = 6;
export const THREE_STUDIO_PROJECT_SCHEMA = 'kaoru.3d-lighting.project';
export const THREE_STUDIO_PROJECT_VERSION = 6;

function clone(value) {
  if (value == null) return value;
  try { return structuredClone(value); }
  catch (_) { return JSON.parse(JSON.stringify(value)); }
}

function safeName(value, fallback = 'Proyecto 3D Lighting') {
  return String(value || '')
    .trim()
    .slice(0, 90) || fallback;
}

function safeFileName(value) {
  return safeName(value)
    .normalize('NFKD')
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'proyecto-3d';
}

function stateForStorage(state) {
  const next = clone(state);

  next.version = 6;
  next.phase = 6;
  next.engine = {
    ...next.engine,
    status: 'saved',
    webgl: false
  };

  next.project = {
    ...(next.project || {}),
    updatedAt: new Date().toISOString()
  };

  return next;
}

export function build3dProjectPayload(state) {
  return {
    schema: THREE_STUDIO_PROJECT_SCHEMA,
    version: THREE_STUDIO_PROJECT_VERSION,
    studio: '3d',
    phase: 6,
    exportedAt: new Date().toISOString(),
    state: stateForStorage(state)
  };
}

function unwrapPayload(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('El proyecto 3D no es valido.');
  }

  if (input.schema === 'silueta-studio-portable-project') {
    if (input.record?.studio !== '3d') {
      throw new Error('Ese proyecto pertenece a otro Studio.');
    }

    return input.record.payload;
  }

  if (input.schema === 'silueta-studio-gallery-record') {
    if (input.studio !== '3d') {
      throw new Error('Ese proyecto pertenece a otro Studio.');
    }

    return input.payload;
  }

  return input;
}

export function restore3dProjectState(input) {
  const payload = unwrapPayload(input);

  if (payload?.schema !== THREE_STUDIO_PROJECT_SCHEMA) {
    throw new Error('El archivo no es un proyecto 3D compatible.');
  }

  const defaults = createInitial3dState();
  const saved = clone(payload.state || {});

  const restored = {
    ...defaults,
    ...saved,
    version: 6,
    phase: 6,
    engine: {
      ...defaults.engine,
      ...(saved.engine || {}),
      status: 'loading',
      webgl: false
    },
    camera: {
      ...defaults.camera,
      ...(saved.camera || {})
    },
    scene: {
      ...defaults.scene,
      ...(saved.scene || {})
    },
    material: {
      ...defaults.material,
      ...(saved.material || {})
    },
    lighting: {
      ...defaults.lighting,
      ...(saved.lighting || {})
    },
    project: {
      ...defaults.project,
      ...(saved.project || {})
    }
  };

  if (
    restored.selectedModel === 'custom' &&
    !restored.customModel
  ) {
    restored.selectedModel = 'asaro';
  }

  return restored;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function dataUrlToFile(dataUrl, name, type) {
  const parts = String(dataUrl || '').split(',');
  const meta = parts[0] || '';
  const raw = parts.slice(1).join(',');

  const binary = meta.includes(';base64')
    ? atob(raw)
    : decodeURIComponent(raw);

  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const blob = new Blob(
    [bytes],
    { type: type || 'application/octet-stream' }
  );

  try {
    return new File(
      [blob],
      name || 'asset.bin',
      { type: type || blob.type }
    );
  } catch (_) {
    blob.name = name || 'asset.bin';
    return blob;
  }
}

async function encodeAssets(value) {
  if (value instanceof Blob) {
    return {
      __kaoru3dFile: true,
      name: value.name || 'asset.bin',
      type: value.type || '',
      dataUrl: await blobToDataUrl(value)
    };
  }

  if (Array.isArray(value)) {
    return Promise.all(value.map(encodeAssets));
  }

  if (value && typeof value === 'object') {
    const output = {};

    for (const [key, child] of Object.entries(value)) {
      output[key] = await encodeAssets(child);
    }

    return output;
  }

  return value;
}

function decodeAssets(value) {
  if (Array.isArray(value)) {
    return value.map(decodeAssets);
  }

  if (value && typeof value === 'object') {
    if (value.__kaoru3dFile && value.dataUrl) {
      return dataUrlToFile(
        value.dataUrl,
        value.name,
        value.type
      );
    }

    const output = {};

    for (const [key, child] of Object.entries(value)) {
      output[key] = decodeAssets(child);
    }

    return output;
  }

  return value;
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function downloadPortable3dProject(
  state,
  modelFiles = []
) {
  const assets = modelFiles.length
    ? { modelFiles: Array.from(modelFiles) }
    : null;

  const portable = {
    schema: 'silueta-studio-portable-project',
    version: 11,
    exportedAt: new Date().toISOString(),
    record: {
      id: null,
      studio: '3d',
      kind: 'project',
      name: safeName(state.project?.name),
      payload: build3dProjectPayload(state),
      assets: await encodeAssets(assets),
      thumbnail: null,
      createdAt: state.project?.createdAt || Date.now(),
      updatedAt: Date.now()
    }
  };

  const blob = new Blob(
    [JSON.stringify(portable, null, 2)],
    { type: 'application/json;charset=utf-8' }
  );

  downloadBlob(
    blob,
    `${safeFileName(state.project?.name)}.k3d.json`
  );
}

export async function readPortable3dProject(file) {
  if (!file) {
    throw new Error('No seleccionaste un proyecto.');
  }

  const data = JSON.parse(await file.text());
  const state = restore3dProjectState(data);

  const encodedAssets =
    data?.schema === 'silueta-studio-portable-project'
      ? data.record?.assets
      : data.assets;

  const assets = decodeAssets(encodedAssets || null);

  return {
    state,
    assets
  };
}

export async function save3dToGallery(
  state,
  thumbnail,
  modelFiles = []
) {
  if (!window.StudioGallery) {
    throw new Error('La Galeria general no esta disponible.');
  }

  const record = await window.StudioGallery.save({
    id: state.project?.galleryId || null,
    studio: '3d',
    kind: 'project',
    name: safeName(state.project?.name),
    payload: build3dProjectPayload(state),
    assets: modelFiles.length
      ? { modelFiles: Array.from(modelFiles) }
      : null,
    thumbnail: thumbnail || null
  });

  return record;
}

export async function consume3dGalleryLaunch() {
  if (!window.StudioGallery?.consumeLaunchIntent) {
    return null;
  }

  const record = await window.StudioGallery.consumeLaunchIntent(
    '3d'
  );

  if (!record) return null;

  const state = restore3dProjectState(record.payload);

  state.project = {
    ...(state.project || {}),
    name:
      record.name ||
      state.project?.name ||
      'Proyecto 3D Lighting',
    galleryId: record.id
  };

  return {
    record,
    state,
    assets: record.assets || null
  };
}