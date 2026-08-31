import {
  listLocalPalettes,
  saveLocalPalette,
  renameLocalPalette,
  duplicateLocalPalette,
  toggleLocalFavorite,
  removeLocalPalette,
  loadLocalPalette,
  downloadProjectPayload,
  readImportedProject,
  saveToStudioGallery,
  consumeStudioGalleryLaunch
} from './storageSystem.js';

function boot() {
  const store = window.LightLabStore;
  if (!store) {
    setTimeout(boot, 30);
    return;
  }

  let currentLocalId = null;
  let toastTimer = 0;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  function toast(message) {
    const target = document.getElementById('toast');
    if (!target) return;
    target.textContent = message;
    target.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => target.classList.remove('is-visible'), 1900);
  }

  function paletteColors(record) {
    const entries = record?.payload?.palette?.entries || [];
    return entries.slice(0, 8).map((entry) => entry.hex).filter(Boolean);
  }

  function setProjectName(value) {
    const input = document.getElementById('phase6ProjectName');
    if (input) input.value = value || 'Proyecto Light Lab';
  }

  function renderLibrary() {
    const list = document.getElementById('phase6LibraryList');
    const count = document.getElementById('phase6LibraryCount');
    if (!list || !count) return;

    const records = listLocalPalettes();
    count.textContent = `${records.length} ${records.length === 1 ? 'paleta' : 'paletas'}`;

    if (!records.length) {
      list.innerHTML = '<p class="phase6-empty">Todavia no guardaste paletas en tu biblioteca.</p>';
      return;
    }

    list.innerHTML = records.map((record) => {
      const strip = paletteColors(record).map((hex) => `<i style="--c:${hex}"></i>`).join('');
      const favorite = record.favorite ? '\u2605' : '\u2606';
      return `
        <article class="phase6-library-item${record.id === currentLocalId ? ' is-current' : ''}" data-library-id="${record.id}">
          <button class="phase6-open" type="button" data-library-action="open">
            <span class="phase6-strip">${strip}</span>
            <span class="phase6-library-copy">
              <strong>${escapeHtml(record.name)}</strong>
              <small>${new Date(record.updatedAt).toLocaleDateString('es-PE')}</small>
            </span>
          </button>
          <div class="phase6-mini-actions">
            <button type="button" data-library-action="favorite" title="Favorito">${favorite}</button>
            <button type="button" data-library-action="duplicate" title="Duplicar">\u29C9</button>
            <button type="button" data-library-action="rename" title="Renombrar">Edit</button>
            <button type="button" data-library-action="export" title="Exportar">DL</button>
            <button type="button" data-library-action="delete" title="Eliminar">X</button>
          </div>
        </article>
      `;
    }).join('');
  }

  function canvasThumbnail() {
    const canvas = document.getElementById('previewCanvas');
    if (!canvas || !canvas.width || !canvas.height) return null;
    try { return canvas.toDataURL('image/png'); }
    catch (_) { return null; }
  }

  function applyState(state, localId = null) {
    currentLocalId = localId;
    store.setState({
      ...state,
      version: 7,
      ui: { ...(state.ui || {}), phase: 7 }
    });
    setProjectName(state.project?.name);
    renderLibrary();
  }

  function saveCurrentLocal() {
    const input = document.getElementById('phase6ProjectName');
    const name = input?.value?.trim() || store.getState().project?.name || 'Paleta Light Lab';
    const record = saveLocalPalette(store.getState(), name, currentLocalId);
    currentLocalId = record.id;
    store.setState((state) => ({
      ...state,
      project: { ...(state.project || {}), name: record.name }
    }));
    setProjectName(record.name);
    renderLibrary();
    toast('Paleta guardada en la biblioteca.');
  }

  async function saveCurrentGallery() {
    const input = document.getElementById('phase6ProjectName');
    const name = input?.value?.trim() || store.getState().project?.name || 'Paleta Light Lab';
    const record = await saveToStudioGallery(store.getState(), name, canvasThumbnail());
    store.setState((state) => ({
      ...state,
      project: {
        ...(state.project || {}),
        name: record.name,
        galleryId: record.id,
        updatedAt: new Date(record.updatedAt).toISOString()
      }
    }));
    setProjectName(record.name);
    toast('Paleta guardada en la Galeria general.');
  }

  document.title = "Kaoru's Studio - Light Lab Fase 6";
  const badge = document.querySelector('.lab-intro .eyebrow');
  if (badge) badge.textContent = 'LIGHT LAB - FASE 6 DE 8';

  const panel = document.querySelector('.status-panel');
  const copyButton = document.getElementById('copyAllBtn');
  if (!panel || !copyButton || document.getElementById('phase6Library')) return;

  const section = document.createElement('section');
  section.id = 'phase6Library';
  section.className = 'phase6-library';
  section.innerHTML = `
    <div class="phase6-heading">
      <div><span class="eyebrow">BIBLIOTECA LIGHT LAB</span><h3>Paletas guardadas</h3></div>
      <span id="phase6LibraryCount">0 paletas</span>
    </div>
    <label class="phase6-name">
      <span>Nombre</span>
      <input id="phase6ProjectName" type="text" maxlength="80" value="${escapeHtml(store.getState().project?.name || 'Proyecto Light Lab')}">
    </label>
    <div class="phase6-main-actions">
      <button id="phase6SaveLocal" type="button">Guardar paleta</button>
      <button id="phase6SaveGallery" type="button">Guardar en Galeria</button>
    </div>
    <div class="phase6-import-row">
      <button id="phase6ImportButton" type="button">Importar .lls.json</button>
      <input id="phase6ImportInput" type="file" accept=".json,.lls.json,application/json" hidden>
    </div>
    <div id="phase6LibraryList" class="phase6-library-list"></div>
  `;
  panel.insertBefore(section, copyButton);

  const style = document.createElement('style');
  style.id = 'phase6LibraryStyles';
  style.textContent = `
    .phase6-library{padding:14px 0;border-top:1px solid var(--lab-line);border-bottom:1px solid var(--lab-line)}
    .phase6-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:9px}
    .phase6-heading h3{margin:3px 0 0;font-size:11px}.phase6-heading>span{color:var(--lab-muted);font-size:7px;font-weight:800}
    .phase6-name>span{display:block;margin-bottom:4px;color:var(--lab-muted);font-size:7px;font-weight:800}
    .phase6-name input{width:100%;height:30px;padding:0 8px;border:1px solid var(--lab-line);border-radius:7px;background:var(--lab-surface-2);outline:0;font-size:8px;font-weight:750}
    .phase6-name input:focus{border-color:var(--lab-accent)}
    .phase6-main-actions{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:7px}
    .phase6-main-actions button,.phase6-import-row button{min-height:29px;border:1px solid var(--lab-line);border-radius:7px;background:var(--lab-surface-2);font-size:7px;font-weight:850;cursor:pointer}
    .phase6-main-actions button:first-child{background:var(--lab-accent-soft);border-color:color-mix(in srgb,var(--lab-accent) 35%,var(--lab-line));color:var(--lab-accent)}
    .phase6-main-actions button:hover,.phase6-import-row button:hover{border-color:var(--lab-accent);color:var(--lab-accent)}
    .phase6-import-row{margin-top:5px}.phase6-import-row button{width:100%}
    .phase6-library-list{display:grid;gap:6px;max-height:260px;margin-top:10px;overflow:auto;padding-right:2px}
    .phase6-empty{margin:6px 0;color:var(--lab-muted);font-size:7.5px;line-height:1.45}
    .phase6-library-item{overflow:hidden;border:1px solid var(--lab-line);border-radius:8px;background:var(--lab-surface-2)}
    .phase6-library-item.is-current{border-color:var(--lab-accent);box-shadow:inset 0 0 0 1px var(--lab-accent)}
    .phase6-open{width:100%;display:grid;grid-template-columns:62px 1fr;gap:7px;align-items:center;padding:5px;border:0;background:transparent;text-align:left;cursor:pointer}
    .phase6-strip{height:28px;display:flex;overflow:hidden;border-radius:5px}.phase6-strip i{flex:1;background:var(--c)}
    .phase6-library-copy{min-width:0}.phase6-library-copy strong,.phase6-library-copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .phase6-library-copy strong{font-size:7.5px}.phase6-library-copy small{margin-top:2px;color:var(--lab-muted);font-size:6.5px}
    .phase6-mini-actions{display:grid;grid-template-columns:repeat(5,1fr);border-top:1px solid var(--lab-line)}
    .phase6-mini-actions button{height:23px;border:0;border-right:1px solid var(--lab-line);background:var(--lab-surface);color:var(--lab-muted);font-size:7px;cursor:pointer}
    .phase6-mini-actions button:last-child{border-right:0}.phase6-mini-actions button:hover{color:var(--lab-accent);background:var(--lab-accent-soft)}
  `;
  document.head.appendChild(style);

  document.getElementById('phase6SaveLocal').addEventListener('click', () => {
    try { saveCurrentLocal(); }
    catch (error) { console.error(error); toast(error.message || 'No se pudo guardar.'); }
  });

  document.getElementById('phase6SaveGallery').addEventListener('click', async () => {
    try { await saveCurrentGallery(); }
    catch (error) { console.error(error); toast(error.message || 'No se pudo guardar en Galeria.'); }
  });

  const importInput = document.getElementById('phase6ImportInput');
  document.getElementById('phase6ImportButton').addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    importInput.value = '';
    if (!file) return;
    try {
      const restored = await readImportedProject(file);
      applyState(restored);
      toast('Proyecto Light Lab importado.');
    } catch (error) {
      console.error(error);
      toast(error.message || 'No se pudo importar.');
    }
  });

  document.getElementById('phase6LibraryList').addEventListener('click', (event) => {
    const item = event.target.closest('[data-library-id]');
    const action = event.target.closest('[data-library-action]')?.dataset.libraryAction;
    if (!item || !action) return;
    const id = item.dataset.libraryId;

    try {
      if (action === 'open') {
        const loaded = loadLocalPalette(id);
        applyState(loaded.state, id);
        setProjectName(loaded.record.name);
        toast('Paleta abierta.');
      } else if (action === 'favorite') {
        toggleLocalFavorite(id);
        renderLibrary();
      } else if (action === 'duplicate') {
        const copy = duplicateLocalPalette(id);
        renderLibrary();
        toast(`Copia creada: ${copy.name}`);
      } else if (action === 'rename') {
        const record = listLocalPalettes().find((entry) => entry.id === id);
        const name = prompt('Nuevo nombre:', record?.name || '');
        if (!name) return;
        renameLocalPalette(id, name);
        if (currentLocalId === id) setProjectName(name.trim());
        renderLibrary();
      } else if (action === 'export') {
        const record = listLocalPalettes().find((entry) => entry.id === id);
        if (!record) return;
        downloadProjectPayload(record.payload, record.name);
        toast('Paleta exportada.');
      } else if (action === 'delete') {
        const record = listLocalPalettes().find((entry) => entry.id === id);
        if (!confirm(`Eliminar "${record?.name || 'esta paleta'}"?`)) return;
        removeLocalPalette(id);
        if (currentLocalId === id) currentLocalId = null;
        renderLibrary();
        toast('Paleta eliminada.');
      }
    } catch (error) {
      console.error(error);
      toast(error.message || 'No se pudo completar la accion.');
    }
  });

  renderLibrary();

  consumeStudioGalleryLaunch().then((launch) => {
    if (!launch) return;
    applyState(launch.state);
    setProjectName(launch.record.name);
    toast('Proyecto abierto desde la Galeria.');
  }).catch((error) => {
    console.error(error);
    toast('No se pudo abrir el proyecto de Galeria.');
  });
}

boot();