import { LIGHT_LAB_CATEGORIES } from './presets.js';

export const LIGHT_LAB_STATE_VERSION = 1;

export function createInitialState() {
  const category = LIGHT_LAB_CATEGORIES[0];
  const preset = category.presets[0];
  return {
    version: LIGHT_LAB_STATE_VERSION,
    project: { id: null, name: 'Proyecto Light Lab', createdAt: null, updatedAt: null },
    selection: { categoryId: category.id, presetId: preset.id, previewMode: 'sphere' },
    palette: { source: 'phase-1-preset-preview', baseHex: null, colors: [...preset.colors], roles: [] },
    lighting: { enabled: false, key: null, ambient: null, bounce: null, rim: null },
    reference: { image: null, extractedColors: [] },
    ui: { activePanel: 'category', phase: 1 }
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
