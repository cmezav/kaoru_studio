import { create3dStore } from './state.js?v=3.0';
import { MODEL_REGISTRY, modelById } from './modelRegistry.js?v=3.0';
import { detectWebGL, create3dScene } from './scene3d.js?v=3.0';

const store = create3dStore();
window.ThreeLightingStore = store;

const byId = (id) => document.getElementById(id);

const elements = {
  cards: byId('modelCards'),
  baseColor: byId('baseColor'),
  baseHex: byId('baseHex'),
  canvas: byId('threeCanvas'),
  stageTitle: byId('stageTitle'),
  stateModel: byId('stateModel'),
  stateColor: byId('stateColor'),
  stateEngine: byId('stateEngine'),
  stateCamera: byId('stateCamera'),
  statePlanes: byId('statePlanes'),
  webglBadge: byId('webglBadge'),
  viewportOverlay: document.querySelector('.viewport-overlay'),
  viewportMessage: byId('viewportMessage'),
  resetCamera: byId('resetCameraBtn'),
  cameraPresets: byId('cameraPresetButtons'),
  gridToggle: byId('gridToggle'),
  shadowToggle: byId('shadowToggle'),
  edgeToggle: byId('edgeToggle'),
  toast: byId('toast')
};

let toastTimer = 0;
let engine = null;

function normalizeHex(value) {
  const raw = String(value || '').trim().toUpperCase();
  const prefixed = raw.startsWith('#') ? raw : `#${raw}`;
  return /^#[0-9A-F]{6}$/.test(prefixed) ? prefixed : null;
}

function toast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(
    () => elements.toast.classList.remove('is-visible'),
    1600
  );
}

function renderCards(state) {
  elements.cards.replaceChildren(
    ...MODEL_REGISTRY.map((entry) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = [
        'model-card',
        entry.id === state.selectedModel ? 'is-active' : '',
        entry.ready ? 'is-ready' : 'is-prototype'
      ].filter(Boolean).join(' ');
      button.dataset.model = entry.id;
      button.innerHTML = `
        <strong>${entry.name}</strong>
        <small>${entry.description}</small>
        <em>${entry.ready ? 'MODELO F3' : 'PROTOTIPO'}</em>
      `;
      return button;
    })
  );
}

function renderState(state) {
  const model = modelById(state.selectedModel);
  const suffix = model.ready ? '' : ' - prototipo';

  elements.stageTitle.textContent = `${model.name}${suffix}`;
  elements.stateModel.textContent = model.ready
    ? model.name
    : `${model.name} (proto)`;
  elements.stateColor.textContent = state.baseColor;
  elements.statePlanes.textContent = model.planeCount
    ? `${model.planeCount} planos faciales`
    : 'Prototipo';

  elements.baseColor.value = state.baseColor;
  if (document.activeElement !== elements.baseHex) {
    elements.baseHex.value = state.baseColor;
  }

  elements.gridToggle.checked = state.scene.gridVisible;
  elements.shadowToggle.checked = state.scene.shadowsEnabled;
  elements.edgeToggle.checked = state.scene.edgesVisible;
  elements.edgeToggle.disabled = state.selectedModel !== 'asaro';

  renderCards(state);
}

function updateEngineFromState(state) {
  if (!engine) return;

  if (engine.getCurrentModel() !== state.selectedModel) {
    engine.setModel(state.selectedModel, state.baseColor);
  }

  engine.setBaseColor(state.baseColor);
  engine.setGridVisible(state.scene.gridVisible);
  engine.setShadowsEnabled(state.scene.shadowsEnabled);
  engine.setEdgesVisible(state.scene.edgesVisible);
}

elements.cards.addEventListener('click', (event) => {
  const button = event.target.closest('[data-model]');
  if (!button) return;

  store.setState((state) => ({
    ...state,
    selectedModel: button.dataset.model
  }));
});

elements.baseColor.addEventListener('input', () => {
  const hex = normalizeHex(elements.baseColor.value);
  if (!hex) return;

  store.setState((state) => ({
    ...state,
    baseColor: hex
  }));
});

elements.baseHex.addEventListener('change', () => {
  const hex = normalizeHex(elements.baseHex.value);

  if (!hex) {
    elements.baseHex.value = store.getState().baseColor;
    toast('HEX invalido.');
    return;
  }

  store.setState((state) => ({
    ...state,
    baseColor: hex
  }));
});

elements.gridToggle.addEventListener('change', () => {
  store.setState((state) => ({
    ...state,
    scene: {
      ...state.scene,
      gridVisible: elements.gridToggle.checked
    }
  }));
});

elements.shadowToggle.addEventListener('change', () => {
  store.setState((state) => ({
    ...state,
    scene: {
      ...state.scene,
      shadowsEnabled: elements.shadowToggle.checked
    }
  }));
});

elements.edgeToggle.addEventListener('change', () => {
  store.setState((state) => ({
    ...state,
    scene: {
      ...state.scene,
      edgesVisible: elements.edgeToggle.checked
    }
  }));
});

elements.resetCamera.addEventListener('click', () => {
  engine?.setCameraPreset('three-quarter');

  store.setState((state) => ({
    ...state,
    camera: {
      ...state.camera,
      preset: 'three-quarter'
    }
  }));

  toast('Camara restablecida.');
});

elements.cameraPresets.addEventListener('click', (event) => {
  const button = event.target.closest('[data-camera-preset]');
  if (!button || !engine) return;

  const preset = button.dataset.cameraPreset;
  engine.setCameraPreset(preset);

  store.setState((state) => ({
    ...state,
    camera: {
      ...state.camera,
      preset
    }
  }));
});

document.addEventListener('studio-theme-change', (event) => {
  engine?.applyTheme(event.detail?.theme || 'day');
});

store.subscribe((state) => {
  renderState(state);
  updateEngineFromState(state);
});

async function start() {
  renderState(store.getState());

  const webgl = detectWebGL();

  if (!webgl) {
    elements.webglBadge.textContent = 'WebGL no disponible';
    elements.stateEngine.textContent = 'Sin WebGL';
    elements.stateCamera.textContent = 'No disponible';
    elements.viewportMessage.textContent = 'WebGL no esta disponible';

    store.setState((state) => ({
      ...state,
      engine: {
        ...state.engine,
        status: 'unsupported',
        webgl: false
      }
    }));

    return;
  }

  elements.webglBadge.textContent = 'Cargando Three.js...';
  elements.stateEngine.textContent = 'Cargando motor';

  try {
    const state = store.getState();

    engine = await create3dScene(elements.canvas, {
      model: state.selectedModel,
      color: state.baseColor,
      gridVisible: state.scene.gridVisible,
      shadowsEnabled: state.scene.shadowsEnabled,
      edgesVisible: state.scene.edgesVisible,
      cameraPreset: state.camera.preset
    });

    window.ThreeLightingEngine = engine;

    elements.webglBadge.textContent = 'Three.js r185 - WebGL';
    elements.stateEngine.textContent = 'Three.js + WebGL';
    elements.stateCamera.textContent = 'Orbita + zoom + pan';
    elements.viewportOverlay.classList.add('is-hidden');

    store.setState((current) => ({
      ...current,
      engine: {
        ...current.engine,
        status: 'ready',
        webgl: true,
        renderer: 'three-webgl',
        version: '0.185.1'
      }
    }));
  } catch (error) {
    console.error(error);

    elements.webglBadge.textContent = 'Error al cargar motor';
    elements.stateEngine.textContent = 'Motor no cargado';
    elements.stateCamera.textContent = 'No disponible';
    elements.viewportMessage.textContent = 'No se pudo cargar el motor 3D';

    const detail = elements.viewportOverlay?.querySelector('span');
    if (detail) {
      detail.textContent = 'Recarga la pagina. Si persiste, revisa la consola.';
    }

    store.setState((state) => ({
      ...state,
      engine: {
        ...state.engine,
        status: 'load-error',
        webgl: true
      }
    }));
  }
}

start();