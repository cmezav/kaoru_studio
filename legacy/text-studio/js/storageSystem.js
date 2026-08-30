/* ============================================================
   STORAGESYSTEM.JS — Text Studio + Galería unificada (Fase 11)
   Conserva la API de Fase 8 y migra los documentos antiguos.
   ============================================================ */
(function () {
  'use strict';
  const LEGACY_DB = 'text_effects_studio_projects_db';
  const LEGACY_STORE = 'documents';
  const MIGRATION_KEY = 'textStudioGalleryMigrationV11';

  function openLegacyDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(LEGACY_DB, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(LEGACY_STORE)) {
          const store = db.createObjectStore(LEGACY_STORE, { keyPath: 'id' });
          store.createIndex('kind', 'kind', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function legacyAll() {
    const db = await openLegacyDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(LEGACY_STORE, 'readonly');
      const req = tx.objectStore(LEGACY_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  }

  async function migrateLegacy() {
    if (!window.StudioGallery) return;
    try { if (localStorage.getItem(MIGRATION_KEY) === 'done') return; } catch (_) {}
    try {
      const old = await legacyAll();
      const existing = await StudioGallery.list({ studio: 'text' });
      const signatures = new Set(existing.map(r => `${r.kind}|${r.name}|${r.createdAt || 0}`));
      for (const record of old) {
        const sig = `${record.kind}|${record.name}|${record.createdAt || 0}`;
        if (signatures.has(sig)) continue;
        await StudioGallery.save({
          studio: 'text', kind: record.kind === 'template' ? 'template' : 'project',
          name: record.name, payload: record.state, thumbnail: record.thumbnail,
          createdAt: record.createdAt, updatedAt: record.updatedAt,
        });
      }
      try { localStorage.setItem(MIGRATION_KEY, 'done'); } catch (_) {}
    } catch (error) { console.warn('No se pudieron migrar los proyectos antiguos de Text Studio.', error); }
  }

  const StorageSystem = {
    async save(kind, { id, name, state, thumbnail }) {
      await migrateLegacy();
      if (!window.StudioGallery) throw new Error('La galería compartida no está disponible.');
      return StudioGallery.save({ id, studio: 'text', kind, name, payload: state, thumbnail });
    },
    async list(kind) {
      await migrateLegacy();
      return (await StudioGallery.list({ studio: 'text', kind })).map(record => ({ ...record, state: record.payload }));
    },
    async get(id) {
      await migrateLegacy();
      const record = await StudioGallery.get(id);
      return record ? { ...record, state: record.payload } : null;
    },
    async remove(id) { await StudioGallery.remove(id); },
    async duplicate(id) { return StudioGallery.duplicate(id); },
    async rename(id, name) { return StudioGallery.rename(id, name); },
    migrateLegacy,
  };
  window.StorageSystem = StorageSystem;
}());
