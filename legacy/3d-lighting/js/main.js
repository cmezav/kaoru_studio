import { create3dStore } from './state.js';
import { MODEL_REGISTRY, modelById } from './modelRegistry.js';
import { detectWebGL, drawPhaseOneViewport } from './scene3d.js';

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
  webglBadge: byId('webglBadge'),
  toast: byId('toast')
};

let toastTimer = 0;

function normalizeHex(value) {
  const raw = String(value || '').trim().toUpperCase();
  const prefixed = raw.startsWith('#') ? raw : `#${raw}`;
  return /^#[0-9A-F]{6}$/.test(prefixed) ? prefixed : null;
}

function toast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove('is-visible'), 1600);
}

function render(state) {
  const model = modelById(state.selectedModel);
  elements.stageTitle.textContent = model.name;
  elements.stateModel.textContent = model.name;
  elements.stateColor.textContent = state.baseColor;
  elements.baseColor.value = state.baseColor;
  if (document.activeElement !== elements.baseHex) elements.baseHex.value = state.baseColor;

  elements.cards.replaceChildren(...MODEL_REGISTRY.map((entry) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `model-card${entry.id === state.selectedModel ? ' is-active' : ''}`;
    button.dataset.model = entry.id;
    button.innerHTML = `<strong>${entry.name}</strong><small>${entry.description}</small>`;
    return button;
  }));

  drawPhaseOneViewport(elements.canvas, state.baseColor);
}

elements.cards.addEventListener('click', (event) => {
  const button = event.target.closest('[data-model]');
  if (!button) return;
  store.setState((state) => ({ ...state, selectedModel: button.dataset.model }));
});

elements.baseColor.addEventListener('input', () => {
  const hex = normalizeHex(elements.baseColor.value);
  if (!hex) return;
  store.setState((state) => ({ ...state, baseColor: hex }));
});

elements.baseHex.addEventListener('change', () => {
  const hex = normalizeHex(elements.baseHex.value);
  if (!hex) {
    elements.baseHex.value = store.getState().baseColor;
    toast('HEX invalido.');
    return;
  }
  store.setState((state) => ({ ...state, baseColor: hex }));
});

const webgl = detectWebGL();
store.setState((state) => ({
  ...state,
  engine: {
    ...state.engine,
    webgl,
    status: webgl ? 'ready-for-phase-2' : 'unsupported'
  }
}));

elements.webglBadge.textContent = webgl ? 'WebGL disponible' : 'WebGL no disponible';
elements.stateEngine.textContent = webgl ? 'Listo para F2' : 'WebGL no disponible';

store.subscribe(render);
render(store.getState());

window.addEventListener('resize', () => render(store.getState()));