/* ============================================================
   STUDIOGALLERY.JS — Galería unificada Fase 11
   Diseños y plantillas de Silueta / Text / Image Studio.
   Todo persiste localmente en IndexedDB.
   ============================================================ */
(function () {
  'use strict';

  const DB_NAME = 'silueta-studio-gallery-v1';
  const DB_VERSION = 1;
  const STORE = 'items';
  const LAUNCH_KEY = 'siluetaStudioGalleryLaunch';

  function uid(prefix = 'item') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function cloneJson(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('kind', 'kind', { unique: false });
          store.createIndex('studio', 'studio', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function requestResult(mode, action) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = action(tx.objectStore(STORE));
      let value;
      if (req) {
        req.onsuccess = () => { value = req.result; };
        req.onerror = () => reject(req.error);
      }
      tx.oncomplete = () => { db.close(); resolve(value); };
      tx.onerror = () => { const error = tx.error; db.close(); reject(error); };
      tx.onabort = () => { const error = tx.error; db.close(); reject(error); };
    });
  }

  function normalizedRecord(input, previous) {
    const now = Date.now();
    const studio = ['silhouette', 'text', 'image', 'light', '3d'].includes(input.studio) ? input.studio : previous?.studio;
    const kind = input.kind === 'template' ? 'template' : 'project';
    if (!studio) throw new Error('El proyecto no especifica un Studio válido.');
    return {
      id: input.id || previous?.id || uid(kind === 'template' ? 'tpl' : 'prj'),
      studio,
      kind,
      name: String(input.name || previous?.name || (kind === 'template' ? 'Plantilla sin nombre' : 'Diseño sin nombre')).trim(),
      schema: 'silueta-studio-gallery-record',
      version: 11,
      payload: input.payload !== undefined ? input.payload : previous?.payload,
      assets: input.assets !== undefined ? input.assets : previous?.assets || null,
      thumbnail: input.thumbnail !== undefined ? input.thumbnail : previous?.thumbnail || null,
      createdAt: previous?.createdAt || input.createdAt || now,
      updatedAt: input.updatedAt || now,
    };
  }

  async function get(id) {
    if (!id) return null;
    return requestResult('readonly', store => store.get(id));
  }

  async function save(input) {
    const previous = input.id ? await get(input.id) : null;
    const record = normalizedRecord(input, previous);
    await requestResult('readwrite', store => store.put(record));
    return record;
  }

  async function list(filters = {}) {
    const records = await requestResult('readonly', store => store.getAll()) || [];
    return records
      .filter(record => !filters.studio || record.studio === filters.studio)
      .filter(record => !filters.kind || record.kind === filters.kind)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async function remove(id) {
    await requestResult('readwrite', store => store.delete(id));
  }

  async function rename(id, name) {
    const record = await get(id);
    if (!record) throw new Error('No se encontró ese elemento en la galería.');
    record.name = String(name || '').trim() || record.name;
    record.updatedAt = Date.now();
    await requestResult('readwrite', store => store.put(record));
    return record;
  }

  async function duplicate(id) {
    const source = await get(id);
    if (!source) throw new Error('No se encontró ese elemento en la galería.');
    return save({
      studio: source.studio,
      kind: source.kind,
      name: `${source.name} — copia`,
      payload: cloneJson(source.payload),
      assets: source.assets,
      thumbnail: source.thumbnail,
    });
  }

  function setLaunchIntent(id, studio) {
    sessionStorage.setItem(LAUNCH_KEY, JSON.stringify({ id, studio, createdAt: Date.now() }));
  }

  async function consumeLaunchIntent(studio) {
    let intent = null;
    try { intent = JSON.parse(sessionStorage.getItem(LAUNCH_KEY) || 'null'); } catch (_) {}
    if (!intent || intent.studio !== studio || !intent.id) return null;
    sessionStorage.removeItem(LAUNCH_KEY);
    return get(intent.id);
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      if (!(blob instanceof Blob)) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  function dataUrlToBlob(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;
    const parts = dataUrl.split(',');
    const meta = parts[0];
    const raw = parts.slice(1).join(',');
    const mime = (meta.match(/^data:([^;]+)/) || [])[1] || 'application/octet-stream';
    const binary = meta.includes(';base64') ? atob(raw) : decodeURIComponent(raw);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  async function encodeAssets(value) {
    if (value instanceof Blob) return { __studioBlob: true, name: value.name || null, type: value.type || '', dataUrl: await blobToDataUrl(value) };
    if (Array.isArray(value)) return Promise.all(value.map(encodeAssets));
    if (value && typeof value === 'object') {
      const out = {};
      for (const [key, child] of Object.entries(value)) out[key] = await encodeAssets(child);
      return out;
    }
    return value;
  }

  function decodeAssets(value) {
    if (Array.isArray(value)) return value.map(decodeAssets);
    if (value && typeof value === 'object') {
      if (value.__studioBlob && value.dataUrl) {
        const blob = dataUrlToBlob(value.dataUrl);
        if (blob && value.name) {
          try { return new File([blob], value.name, { type: value.type || blob.type }); } catch (_) { return blob; }
        }
        return blob;
      }
      const out = {};
      for (const [key, child] of Object.entries(value)) out[key] = decodeAssets(child);
      return out;
    }
    return value;
  }

  async function toPortable(record) {
    return {
      schema: 'silueta-studio-portable-project',
      version: 11,
      exportedAt: new Date().toISOString(),
      record: {
        id: null,
        studio: record.studio,
        kind: record.kind,
        name: record.name,
        payload: record.payload,
        assets: await encodeAssets(record.assets),
        thumbnail: record.thumbnail,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
    };
  }

  async function importPortable(portable) {
    if (portable?.schema === 'text-effects-studio-project') {
      return save({ studio: 'text', kind: 'project', name: 'Proyecto de texto importado', payload: portable, thumbnail: null });
    }
    if (portable?.schema === 'silueta-studio-project') {
      return save({ studio: 'silhouette', kind: 'project', name: 'Proyecto de silueta importado', payload: portable, thumbnail: null });
    }
    if (portable?.schema === 'kaoru.light-lab.project') {
      return save({ studio: 'light', kind: 'project', name: portable.project?.name || 'Paleta Light Lab importada', payload: portable, thumbnail: null });
    }    if (portable?.schema === 'kaoru.3d-lighting.project') {
      return save({ studio: '3d', kind: 'project', name: portable.state?.project?.name || 'Proyecto 3D importado', payload: portable, thumbnail: null });
    }    const data = portable?.schema === 'silueta-studio-portable-project' ? portable.record : portable;
    if (!data || !['silhouette', 'text', 'image', 'light', '3d'].includes(data.studio)) throw new Error('El archivo no pertenece a Silueta Studio.');
    return save({
      studio: data.studio,
      kind: data.kind === 'template' ? 'template' : 'project',
      name: data.name || 'Proyecto importado',
      payload: data.payload,
      assets: decodeAssets(data.assets),
      thumbnail: data.thumbnail || null,
    });
  }

  window.StudioGallery = {
    save, list, get, remove, rename, duplicate,
    setLaunchIntent, consumeLaunchIntent,
    toPortable, importPortable,
    uid,
  };
}());
