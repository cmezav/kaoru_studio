import { buildExportEnvelope, LIGHT_LAB_PROJECT_SCHEMA } from './exportSystem.js';

export const STORAGE_SYSTEM_PHASE = 6;

const LIBRARY_KEY = 'kaoru.light-lab.library.v1';
const LIBRARY_SCHEMA = 'kaoru.light-lab.library-item';

function clone(value) {
  if (value == null) return value;
  try { return structuredClone(value); }
  catch (_) { return JSON.parse(JSON.stringify(value)); }
}

function uid(prefix = 'llp') {
  return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeName(value, fallback = 'Paleta Light Lab') {
  return String(value || '').trim().slice(0, 80) || fallback;
}

function readLibraryRaw() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function writeLibrary(records) {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(records));
}

function envelopeForState(state, name) {
  const next = clone(state);
  next.version = 7;
  next.project = {
    ...(next.project || {}),
    name: safeName(name || next.project?.name),
    updatedAt: new Date().toISOString()
  };
  next.ui = { ...(next.ui || {}), phase: 7 };
  return buildExportEnvelope(next);
}

function unwrapPortable(input) {
  if (!input || typeof input !== 'object') throw new Error('El archivo no contiene un proyecto valido.');

  if (input.schema === 'silueta-studio-portable-project') {
    if (input.record?.studio !== 'light') throw new Error('Ese proyecto pertenece a otro Studio.');
    return input.record.payload;
  }

  if (input.schema === 'silueta-studio-gallery-record') {
    if (input.studio !== 'light') throw new Error('Ese proyecto pertenece a otro Studio.');
    return input.payload;
  }

  if (input.schema === LIBRARY_SCHEMA && input.payload) return input.payload;
  return input;
}

export function restoreProjectState(input) {
  const payload = unwrapPortable(input);
  let state;

  if (payload?.schema === LIGHT_LAB_PROJECT_SCHEMA) {
    state = {
      version: 7,
      project: clone(payload.project) || { id: null, name: 'Proyecto Light Lab', createdAt: null, updatedAt: null },
      selection: clone(payload.selection),
      description: payload.description || '',
      interpretation: payload.interpretation || '',
      params: clone(payload.params),
      palette: clone(payload.palette),
      lighting: clone(payload.lighting),
      reference: clone(payload.reference) || { image: null, extractedColors: [], recentColors: [] },
      ui: {
        activePanel: 'category',
        phase: 7,
        selectedSwatchIndex: null,
        lastSamplePosition: null,
        paletteView: 'illuminated',
        ...(clone(payload.ui) || {})
      }
    };
  } else if (payload?.palette && payload?.lighting && payload?.selection) {
    state = clone(payload);
    state.version = 7;
    state.ui = {
      activePanel: 'category',
      phase: 7,
      selectedSwatchIndex: null,
      lastSamplePosition: null,
      paletteView: 'illuminated',
      ...(state.ui || {})
    };
  } else {
    throw new Error('El archivo no es un proyecto Light Lab compatible.');
  }

  state.project = {
    id: null,
    name: 'Proyecto Light Lab',
    createdAt: null,
    updatedAt: null,
    ...(state.project || {})
  };

  state.reference = {
    image: null,
    extractedColors: [],
    recentColors: [],
    ...(state.reference || {}),
    image: null
  };

  if (state.selection?.previewMode === 'reference') {
    state.selection.previewMode = 'sphere';
  }

  state.ui.phase = 7;
  state.ui.lastSamplePosition = null;
  return state;
}

export function listLocalPalettes() {
  return readLibraryRaw().sort((a, b) =>
    Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)) ||
    Number(b.updatedAt || 0) - Number(a.updatedAt || 0)
  );
}

export function getLocalPalette(id) {
  return readLibraryRaw().find((item) => item.id === id) || null;
}

export function saveLocalPalette(state, name, id = null) {
  const records = readLibraryRaw();
  const index = id ? records.findIndex((item) => item.id === id) : -1;
  const previous = index >= 0 ? records[index] : null;
  const now = Date.now();
  const record = {
    schema: LIBRARY_SCHEMA,
    version: 7,
    id: previous?.id || uid(),
    name: safeName(name || previous?.name || state?.project?.name),
    favorite: Boolean(previous?.favorite),
    createdAt: previous?.createdAt || now,
    updatedAt: now,
    payload: envelopeForState(state, name || previous?.name)
  };

  if (index >= 0) records[index] = record;
  else records.push(record);

  writeLibrary(records);
  return record;
}

export function renameLocalPalette(id, name) {
  const records = readLibraryRaw();
  const item = records.find((record) => record.id === id);
  if (!item) throw new Error('No se encontro esa paleta.');
  item.name = safeName(name, item.name);
  item.updatedAt = Date.now();
  if (item.payload?.project) item.payload.project.name = item.name;
  writeLibrary(records);
  return item;
}

export function duplicateLocalPalette(id) {
  const records = readLibraryRaw();
  const source = records.find((record) => record.id === id);
  if (!source) throw new Error('No se encontro esa paleta.');
  const now = Date.now();
  const copy = {
    ...clone(source),
    id: uid(),
    name: `${source.name} - copia`,
    favorite: false,
    createdAt: now,
    updatedAt: now
  };
  if (copy.payload?.project) {
    copy.payload.project.id = null;
    copy.payload.project.name = copy.name;
  }
  records.push(copy);
  writeLibrary(records);
  return copy;
}

export function toggleLocalFavorite(id) {
  const records = readLibraryRaw();
  const item = records.find((record) => record.id === id);
  if (!item) throw new Error('No se encontro esa paleta.');
  item.favorite = !item.favorite;
  item.updatedAt = Date.now();
  writeLibrary(records);
  return item;
}

export function removeLocalPalette(id) {
  const records = readLibraryRaw();
  const next = records.filter((record) => record.id !== id);
  if (next.length === records.length) throw new Error('No se encontro esa paleta.');
  writeLibrary(next);
}

export function loadLocalPalette(id) {
  const item = getLocalPalette(id);
  if (!item) throw new Error('No se encontro esa paleta.');
  return { record: item, state: restoreProjectState(item.payload) };
}

export function downloadProjectPayload(payload, name = 'Paleta Light Lab') {
  const data = JSON.stringify(payload, null, 2);
  const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safe = safeName(name).normalize('NFKD').replace(/[^\w-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'paleta-light-lab';
  anchor.href = url;
  anchor.download = `${safe}.lls.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

export async function readImportedProject(file) {
  if (!file) throw new Error('No seleccionaste un archivo.');
  const data = JSON.parse(await file.text());
  return restoreProjectState(data);
}

export async function saveToStudioGallery(state, name, thumbnail = null) {
  if (!window.StudioGallery) throw new Error('La Galeria general no esta disponible.');
  const galleryId = state?.project?.galleryId || null;
  const record = await window.StudioGallery.save({
    id: galleryId,
    studio: 'light',
    kind: 'project',
    name: safeName(name || state?.project?.name),
    payload: envelopeForState(state, name),
    thumbnail
  });
  return record;
}

export async function consumeStudioGalleryLaunch() {
  if (!window.StudioGallery?.consumeLaunchIntent) return null;
  const record = await window.StudioGallery.consumeLaunchIntent('light');
  if (!record) return null;
  const state = restoreProjectState(record.payload);
  state.project = {
    ...(state.project || {}),
    name: record.name || state.project?.name || 'Proyecto Light Lab',
    galleryId: record.id
  };
  return { record, state };
}