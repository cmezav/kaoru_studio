export const THREE_STUDIO_STATE_VERSION = 3;

export function createInitial3dState() {
  return {
    version: THREE_STUDIO_STATE_VERSION,
    phase: 3,
    selectedModel: 'asaro',
    baseColor: '#C98E78',
    engine: {
      status: 'loading',
      webgl: false,
      renderer: 'three-webgl',
      version: '0.185.1'
    },
    camera: {
      orbitEnabled: true,
      zoomEnabled: true,
      panEnabled: true,
      preset: 'three-quarter'
    },
    scene: {
      gridVisible: true,
      shadowsEnabled: true,
      edgesVisible: true
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