import {
  buildExportEnvelope
} from './exportSystem.js';

const TRANSFER_KEY =
  'kaoru.3d-lightlab.transfer.v1';

function boot() {
  const store =
    window.LightLabStore;

  if (!store) {
    setTimeout(boot, 40);
    return;
  }

  if (
    document.getElementById(
      'openPaletteIn3dBtn'
    )
  ) {
    return;
  }

  const panel =
    document.querySelector(
      '.status-panel'
    );

  const copy =
    document.getElementById(
      'copyAllBtn'
    );

  if (!panel || !copy) return;

  const button =
    document.createElement(
      'button'
    );

  button.id =
    'openPaletteIn3dBtn';

  button.type = 'button';
  button.textContent =
    'Abrir esta paleta en 3D';

  button.style.cssText = [
    'width:100%',
    'min-height:34px',
    'margin:0 0 7px',
    'border:1px solid var(--lab-accent)',
    'border-radius:8px',
    'background:var(--lab-accent-soft)',
    'color:var(--lab-accent)',
    'font-size:7px',
    'font-weight:900',
    'cursor:pointer'
  ].join(';');

  button.addEventListener(
    'click',
    () => {
      const state =
        store.getState();

      const payload =
        buildExportEnvelope(
          state
        );

      sessionStorage.setItem(
        TRANSFER_KEY,
        JSON.stringify({
          name:
            state.project?.name ||
            'Paleta Light Lab',
          payload
        })
      );

      if (
        window.parent !== window
      ) {
        window.parent.location.hash =
          '3d';
      } else {
        location.href =
          '../3d-lighting/index.html?from=light';
      }
    }
  );

  panel.insertBefore(
    button,
    copy
  );
}

boot();