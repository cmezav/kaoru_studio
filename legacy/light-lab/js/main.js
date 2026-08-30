import { LIGHT_LAB_CATEGORIES, categoryById, presetById } from './presets.js';
import { createStore } from './state.js';
import { renderBasicPreview } from './renderer2d.js';
import { downloadPhaseOneStructure } from './exportSystem.js';

const ROLE_LABELS = ['Oclusión','Sombra profunda','Sombra media','Sombra suave','Base secundaria','Base','Luz suave','Luz media','Highlight','Rebote','Reflejo','Rim light'];
const VIEW_LABELS = { sphere: 'Estudio de volumen · esfera', band: 'Estudio de reflejo · banda', plane: 'Estudio tonal · plano' };
const store = createStore();
const elements = {
  categoryGrid: document.getElementById('categoryGrid'), presetSelect: document.getElementById('presetSelect'),
  presetDescription: document.getElementById('presetDescription'), previewTitle: document.getElementById('previewTitle'),
  paletteName: document.getElementById('paletteName'), swatchGrid: document.getElementById('swatchGrid'),
  canvas: document.getElementById('previewCanvas'), modeLabel: document.getElementById('previewModeLabel'),
  stateCategory: document.getElementById('stateCategory'), statePreset: document.getElementById('statePreset'),
  stateColors: document.getElementById('stateColors'), previewTabs: document.getElementById('previewTabs'),
  download: document.getElementById('downloadStructureBtn'), toast: document.getElementById('toast')
};
let toastTimer = 0;

function showToast(message) {
  elements.toast.textContent = message; elements.toast.classList.add('is-visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => elements.toast.classList.remove('is-visible'), 1800);
}

function renderCategories(state) {
  elements.categoryGrid.replaceChildren(...LIGHT_LAB_CATEGORIES.map((category) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = `category-button${state.selection.categoryId === category.id ? ' is-active' : ''}`;
    button.dataset.category = category.id; button.setAttribute('role', 'listitem');
    button.innerHTML = `<i>${category.icon}</i><strong>${category.label}</strong><small>${category.short}</small>`;
    return button;
  }));
}

function renderPresets(category, selectedId) {
  elements.presetSelect.replaceChildren(...category.presets.map((preset) => {
    const option = document.createElement('option'); option.value = preset.id; option.textContent = preset.name; option.selected = preset.id === selectedId; return option;
  }));
}

function renderSwatches(colors) {
  elements.swatchGrid.replaceChildren(...colors.map((hex, index) => {
    const item = document.createElement('div'); item.className = 'swatch'; item.title = 'La copia rápida se activa en la Fase 2';
    item.innerHTML = `<div class="swatch-color" style="--swatch:${hex}"></div><div class="swatch-meta"><strong>${ROLE_LABELS[index] || `Tono ${index + 1}`}</strong><span>${hex}</span></div>`;
    return item;
  }));
}

function render(state) {
  const category = categoryById(state.selection.categoryId);
  const preset = presetById(category, state.selection.presetId);
  renderCategories(state); renderPresets(category, preset.id); renderSwatches(state.palette.colors);
  elements.presetDescription.textContent = preset.description;
  elements.previewTitle.textContent = category.label; elements.paletteName.textContent = preset.name;
  elements.stateCategory.textContent = category.label; elements.statePreset.textContent = preset.name;
  elements.stateColors.textContent = `${state.palette.colors.length} colores`;
  elements.modeLabel.textContent = VIEW_LABELS[state.selection.previewMode];
  elements.previewTabs.querySelectorAll('[data-view]').forEach((button) => {
    const active = button.dataset.view === state.selection.previewMode; button.classList.toggle('is-active', active); button.setAttribute('aria-selected', String(active));
  });
  requestAnimationFrame(() => renderBasicPreview(elements.canvas, state.palette.colors, state.selection.previewMode));
}

elements.categoryGrid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-category]'); if (!button) return;
  const category = categoryById(button.dataset.category); const preset = category.presets[0];
  store.setState((state) => ({ ...state, selection: { ...state.selection, categoryId: category.id, presetId: preset.id }, palette: { ...state.palette, colors: [...preset.colors] } }));
});

elements.presetSelect.addEventListener('change', () => {
  const category = categoryById(store.getState().selection.categoryId); const preset = presetById(category, elements.presetSelect.value);
  store.setState((state) => ({ ...state, selection: { ...state.selection, presetId: preset.id }, palette: { ...state.palette, colors: [...preset.colors] } }));
});

elements.previewTabs.addEventListener('click', (event) => {
  const button = event.target.closest('[data-view]'); if (!button) return;
  store.setState((state) => ({ ...state, selection: { ...state.selection, previewMode: button.dataset.view } }));
});

elements.download.addEventListener('click', () => { downloadPhaseOneStructure(store.getState()); showToast('Estructura de proyecto descargada'); });
document.addEventListener('studio-theme-change', () => render(store.getState()));
window.addEventListener('resize', () => renderBasicPreview(elements.canvas, store.getState().palette.colors, store.getState().selection.previewMode), { passive: true });
store.subscribe(render); render(store.getState());
window.LightLab = { getState: store.getState, reset: store.reset, phase: 1 };
