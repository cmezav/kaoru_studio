export const THREE_STUDIO_STATE_VERSION = 7;

export function createInitial3dState() {
  return {
    version: THREE_STUDIO_STATE_VERSION,
    phase: 6,
    selectedModel: 'asaro',
    customModel: null,
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
      edgesVisible: false,
      atmosphere: {
        id: 'day',
        background: '#8CBED7',
        fog: '#8CBED7',
        floor: '#7F8274',
        exposure: 1.12,
        weather: 'clear'
      }
    },
    material: {
      paletteBridgeReady: true,
      paletteSlots: 16,
      paletteMode: 'base-only',
      palette: [],
      sourcePalette: null,
      syncLighting: true
    },
    lighting: {
      enabled: true,
      showHelpers: true,
      selectedLightId: 'key',
      projector: {
        enabled: false,
        type: 'none',
        colorA: '#FFFFFF',
        colorB: '#7C3AED',
        intensity: 0,
        angle: 0,
        scale: 100,
        blur: 8,
        offsetX: 0,
        offsetY: 0,
        contrast: 70,
        lightId: 'key'
      },
      ambient: {
        color: '#D8DEFF',
        intensity: 18
      },
      shadow: {
        color: '#3A2945',
        intensity: 16
      },
      bounce: {
        color: '#7898FF',
        intensity: 12
      },
      rim: {
        color: '#B994FF',
        intensity: 14
      },
      lights: [
        {
          id: 'key',
          name: 'Luz principal',
          color: '#FFE0CC',
          intensity: 82,
          azimuth: 42,
          elevation: 48,
          distance: 5.2,
          softness: 45,
          enabled: true
        },
        {
          id: 'fill',
          name: 'Relleno',
          color: '#7898FF',
          intensity: 28,
          azimuth: -58,
          elevation: 18,
          distance: 5.6,
          softness: 72,
          enabled: true
        }
      ]
    },
    project: {
      id: null,
      galleryId: null,
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
