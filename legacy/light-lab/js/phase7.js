import { createHistoryController } from './historySystem.js';
import {
  copyPaletteHex,
  downloadCsv,
  downloadHexList,
  downloadPalettePng,
  downloadPortableProject
} from './exportSystem.js';

function boot() {
  const store = window.LightLabStore;
  if (!store) {
    setTimeout(boot, 30);
    return;
  }

  if (window.LightLabPhase7Ready) return;
  window.LightLabPhase7Ready = true;

  const history = createHistoryController(store, {
    limit: 120,
    debounceMs: 180
  });

  let toastTimer = 0;
  let resizeFrame = 0;

  function toast(message) {
    const target = document.getElementById('toast');
    if (!target) return;
    target.textContent = message;
    target.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => target.classList.remove('is-visible'), 1800);
  }

  function isTypingTarget(target) {
    if (!target) return false;
    if (target.isContentEditable) return true;
    const tag = target.tagName;
    if (tag === 'TEXTAREA') return true;
    if (tag !== 'INPUT') return false;
    return ['text', 'search', 'email', 'number', 'password', 'url', 'tel'].includes(target.type);
  }

  function installDesktopLayout() {
    const shell = document.querySelector('.lab-shell');
    if (!shell || document.getElementById('phase7LeftResize')) return;

    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('kaoru.light-lab.desktop-panels.v1') || 'null'); } catch (_) {}

    const left = Math.min(390, Math.max(240, Number(saved?.left) || 290));
    const right = Math.min(390, Math.max(240, Number(saved?.right) || 286));
    shell.style.setProperty('--ll-left-panel', `${left}px`);
    shell.style.setProperty('--ll-right-panel', `${right}px`);

    const leftHandle = document.createElement('div');
    leftHandle.id = 'phase7LeftResize';
    leftHandle.className = 'phase7-resize-handle phase7-resize-left';
    leftHandle.title = 'Arrastra para cambiar el ancho del panel izquierdo';

    const rightHandle = document.createElement('div');
    rightHandle.id = 'phase7RightResize';
    rightHandle.className = 'phase7-resize-handle phase7-resize-right';
    rightHandle.title = 'Arrastra para cambiar el ancho del panel derecho';

    shell.append(leftHandle, rightHandle);

    function persist() {
      const values = {
        left: parseFloat(getComputedStyle(shell).getPropertyValue('--ll-left-panel')) || 290,
        right: parseFloat(getComputedStyle(shell).getPropertyValue('--ll-right-panel')) || 286
      };
      try { localStorage.setItem('kaoru.light-lab.desktop-panels.v1', JSON.stringify(values)); } catch (_) {}
    }

    function bind(handle, side) {
      handle.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        handle.setPointerCapture(event.pointerId);
        document.documentElement.classList.add('phase7-resizing');

        const startX = event.clientX;
        const startValue = parseFloat(getComputedStyle(shell).getPropertyValue(
          side === 'left' ? '--ll-left-panel' : '--ll-right-panel'
        )) || (side === 'left' ? 290 : 286);

        const move = (moveEvent) => {
          cancelAnimationFrame(resizeFrame);
          resizeFrame = requestAnimationFrame(() => {
            const delta = moveEvent.clientX - startX;
            const value = side === 'left'
              ? startValue + delta
              : startValue - delta;
            const clamped = Math.min(390, Math.max(240, value));
            shell.style.setProperty(side === 'left' ? '--ll-left-panel' : '--ll-right-panel', `${clamped}px`);
          });
        };

        const end = () => {
          handle.removeEventListener('pointermove', move);
          handle.removeEventListener('pointerup', end);
          handle.removeEventListener('pointercancel', end);
          document.documentElement.classList.remove('phase7-resizing');
          persist();
        };

        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', end);
        handle.addEventListener('pointercancel', end);
      });
    }

    bind(leftHandle, 'left');
    bind(rightHandle, 'right');
  }

  function installHistoryBar() {
    const toolbar = document.querySelector('.preview-toolbar');
    if (!toolbar || document.getElementById('phase7HistoryBar')) return;

    const bar = document.createElement('div');
    bar.id = 'phase7HistoryBar';
    bar.className = 'phase7-history-bar';
    bar.innerHTML = `
      <button id="phase7Undo" type="button" title="Deshacer (Ctrl+Z)">Undo</button>
      <button id="phase7Redo" type="button" title="Rehacer (Ctrl+Shift+Z / Ctrl+Y)">Redo</button>
      <span id="phase7HistoryStatus">0 / 0</span>
    `;
    toolbar.prepend(bar);

    const undoButton = document.getElementById('phase7Undo');
    const redoButton = document.getElementById('phase7Redo');
    const status = document.getElementById('phase7HistoryStatus');

    undoButton.addEventListener('click', () => {
      if (history.undo()) toast('Deshacer');
    });
    redoButton.addEventListener('click', () => {
      if (history.redo()) toast('Rehacer');
    });

    history.subscribe((state) => {
      undoButton.disabled = !state.canUndo;
      redoButton.disabled = !state.canRedo;
      status.textContent = `${state.undoCount} / ${state.redoCount}`;
    });
  }

  function installExportPanel() {
    const panel = document.querySelector('.status-panel');
    const library = document.getElementById('phase6Library');
    const copyButton = document.getElementById('copyAllBtn');
    if (!panel || !copyButton || document.getElementById('phase7ExportPanel')) return;

    const section = document.createElement('section');
    section.id = 'phase7ExportPanel';
    section.className = 'phase7-export-panel';
    section.innerHTML = `
      <div class="phase7-export-heading">
        <div><span class="eyebrow">EXPORTACION</span><h3>Salida avanzada</h3></div>
        <small>Fase 7</small>
      </div>
      <div class="phase7-export-grid">
        <button type="button" data-phase7-export="palette">PNG paleta</button>
        <button type="button" data-phase7-export="preview">PNG + preview</button>
        <button type="button" data-phase7-export="hexpng">PNG + HEX</button>
        <button type="button" data-phase7-export="copy">Copiar HEX</button>
        <button type="button" data-phase7-export="txt">Lista HEX</button>
        <button type="button" data-phase7-export="csv">CSV</button>
        <button type="button" data-phase7-export="portable">Proyecto portable</button>
      </div>
      <p class="phase7-export-help">Exporta la vista de paleta activa: Original, Iluminada o Luz elegida.</p>
    `;

    if (library?.nextSibling) panel.insertBefore(section, library.nextSibling);
    else panel.insertBefore(section, copyButton);

    section.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-phase7-export]');
      if (!button) return;
      const action = button.dataset.phase7Export;
      const state = store.getState();
      const previewCanvas = document.getElementById('previewCanvas');

      try {
        history.checkpoint();

        if (action === 'palette') {
          downloadPalettePng(state, { includePreview: false, includeHex: false, includeNames: false });
          toast('PNG de paleta exportado.');
        } else if (action === 'preview') {
          downloadPalettePng(state, { includePreview: true, includeHex: true, includeNames: true, previewCanvas });
          toast('PNG con preview exportado.');
        } else if (action === 'hexpng') {
          downloadPalettePng(state, { includePreview: false, includeHex: true, includeNames: true });
          toast('PNG con HEX exportado.');
        } else if (action === 'copy') {
          await copyPaletteHex(state, { includeRoles: true });
          toast('Todos los HEX copiados.');
        } else if (action === 'txt') {
          downloadHexList(state);
          toast('Lista HEX exportada.');
        } else if (action === 'csv') {
          downloadCsv(state);
          toast('CSV exportado.');
        } else if (action === 'portable') {
          downloadPortableProject(state);
          toast('Proyecto portable exportado.');
        }
      } catch (error) {
        console.error(error);
        toast(error.message || 'No se pudo exportar.');
      }
    });
  }

  function installStyles() {
    if (document.getElementById('phase7Styles')) return;
    const style = document.createElement('style');
    style.id = 'phase7Styles';
    style.textContent = `
      .lab-shell{
        --ll-left-panel:290px;
        --ll-right-panel:286px;
        grid-template-columns:var(--ll-left-panel) 6px minmax(470px,1fr) 6px var(--ll-right-panel)!important;
        gap:6px!important;
        position:relative;
      }
      .controls-panel{grid-column:1}.preview-column{grid-column:3}.status-panel{grid-column:5}
      .phase7-resize-handle{align-self:stretch;min-height:0;border-radius:999px;cursor:col-resize;touch-action:none;position:relative;z-index:30}
      .phase7-resize-handle:before{content:'';position:absolute;inset:4px 2px;border-radius:999px;background:var(--lab-line);transition:.15s}
      .phase7-resize-handle:hover:before,.phase7-resizing .phase7-resize-handle:before{background:var(--lab-accent)}
      .phase7-resize-left{grid-column:2;grid-row:1}.phase7-resize-right{grid-column:4;grid-row:1}
      .phase7-resizing{cursor:col-resize!important;user-select:none!important}
      .phase7-history-bar{display:flex;align-items:center;gap:4px;flex:0 0 auto}
      .phase7-history-bar button{height:27px;padding:0 8px;border:1px solid var(--lab-line);border-radius:7px;background:var(--lab-surface);font-size:7px;font-weight:850;cursor:pointer}
      .phase7-history-bar button:hover:not(:disabled){border-color:var(--lab-accent);color:var(--lab-accent)}
      .phase7-history-bar button:disabled{opacity:.38;cursor:not-allowed}
      .phase7-history-bar span{min-width:34px;text-align:center;color:var(--lab-muted);font:700 6.5px/1 Consolas,monospace}
      .phase7-export-panel{padding:14px 0;border-bottom:1px solid var(--lab-line)}
      .phase7-export-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px}
      .phase7-export-heading h3{margin:3px 0 0;font-size:11px}.phase7-export-heading small{color:var(--lab-muted);font-size:7px}
      .phase7-export-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px}
      .phase7-export-grid button{min-height:29px;padding:4px 6px;border:1px solid var(--lab-line);border-radius:7px;background:var(--lab-surface-2);font-size:7px;font-weight:820;cursor:pointer}
      .phase7-export-grid button:hover{border-color:var(--lab-accent);color:var(--lab-accent);background:var(--lab-accent-soft)}
      .phase7-export-grid button:last-child{grid-column:1/-1;background:var(--lab-accent-soft);color:var(--lab-accent)}
      .phase7-export-help{margin:7px 0 0;color:var(--lab-muted);font-size:6.8px;line-height:1.4}
      @media(max-width:1450px){
        .lab-shell{--ll-left-panel:270px;--ll-right-panel:265px;grid-template-columns:var(--ll-left-panel) 5px minmax(440px,1fr) 5px var(--ll-right-panel)!important}
        .phase7-history-bar span{display:none}
      }
      @media(max-height:780px){
        .phase7-export-panel{padding:9px 0}.phase7-export-grid button{min-height:25px}.phase7-export-help{display:none}
      }
    `;
    document.head.appendChild(style);
  }

  document.title = "Kaoru's Studio - Light Lab Fase 7";
  const badge = document.querySelector('.lab-intro .eyebrow');
  if (badge) badge.textContent = 'LIGHT LAB - FASE 7 DE 8';

  installStyles();
  installDesktopLayout();
  installHistoryBar();
  installExportPanel();

  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    const command = event.ctrlKey || event.metaKey;

    if (command && key === 'z' && !isTypingTarget(event.target)) {
      event.preventDefault();
      if (event.shiftKey) {
        if (history.redo()) toast('Rehacer');
      } else if (history.undo()) {
        toast('Deshacer');
      }
      return;
    }

    if (command && key === 'y' && !isTypingTarget(event.target)) {
      event.preventDefault();
      if (history.redo()) toast('Rehacer');
    }
  }, true);

  window.LightLabHistory = history;
}

boot();