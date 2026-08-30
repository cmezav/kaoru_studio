import { LIGHT_LAB_CATEGORIES } from './presets.js';
import { DEFAULT_PARAMS, generateDetailedPalette } from './paletteEngine.js';

export const LIGHT_LAB_STATE_VERSION = 3;

export function createInitialState() {
  const category = LIGHT_LAB_CATEGORIES[0];
  const preset = category.presets[0];
  const params = { ...DEFAULT_PARAMS, ...preset.params };
  const entries = generateDetailedPalette({ categoryId: category.id, baseHex: preset.baseHex, params });
  return {
    version: LIGHT_LAB_STATE_VERSION,
    project: { id: null, name: 'Proyecto Light Lab', createdAt: null, updatedAt: null },
    selection: { categoryId: category.id, presetId: preset.id, variantId: preset.variantId, undertoneId: preset.undertoneId, previewMode: 'sphere' },
    description: '',
    interpretation: 'Piel natural · Muy clara · Cálido',
    params,
    palette: { source: 'phase-2-generator', baseHex: preset.baseHex, colors: entries.map((item) => item.hex), entries, roles: entries.map((item) => item.role) },
    lighting: { enabled: false, key: null, ambient: null, bounce: null, rim: null },
    reference: { image: null, extractedColors: [], recentColors: [] },
    ui: { activePanel: 'category', phase: 3, selectedSwatchIndex: null, lastSamplePosition: null }
  };
}

export function createStore(initialState = createInitialState()) {
  let state = structuredClone(initialState);
  const listeners = new Set();
  return {
    getState: () => state,
    setState(updater) {
      const next = typeof updater === 'function' ? updater(structuredClone(state)) : updater;
      state = structuredClone(next);
      listeners.forEach((listener) => listener(state));
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    reset() { state = createInitialState(); listeners.forEach((listener) => listener(state)); }
  };
}
