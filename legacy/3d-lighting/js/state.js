export const THREE_STUDIO_STATE_VERSION = 1;

export function createInitial3dState() {
  return {
    version: THREE_STUDIO_STATE_VERSION,
    phase: 1,
    selectedModel: 'asaro',
    baseColor: '#C98E78',
    engine: {
      status: 'pending',
      webgl: false,
      renderer: null
    },
    camera: {
      orbitEnabled: false,
      zoomEnabled: false
    },
    lighting: {
      enabled: true,
      lights: []
    },
    project: {
      id: null,
      name: 'Proyecto 3D Lighting',
      createdAt: null,
      updatedAt: null
    }
  };
}

export function create3dStore(initial = createInitial3dState()) {
  let state = structuredClone(initial);
  const listeners = new Set();

  return {
    getState: () => state,
    setState(updater) {
      state = structuredClone(
        typeof updater === 'function'
          ? updater(structuredClone(state))
          : updater
      );
      listeners.forEach((listener) => listener(state));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}