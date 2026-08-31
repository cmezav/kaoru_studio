import { create3dStore } from './state.js?v=6.0';
import {
  MODEL_REGISTRY,
  modelById
} from './modelRegistry.js?v=4.0';
import {
  detectWebGL,
  create3dScene
} from './scene3d.js?v=6.0';
import {
  MAX_3D_LIGHTS,
  createDefault3dLight,
  duplicate3dLight
} from './lighting3d.js?v=5.1';
import {
  listAvailableLightLabPalettes,
  readLightLabFile,
  consumeLightLabTransfer,
  applyLightLabPaletteToState
} from './paletteBridge3d.js?v=6.0';
import {
  findMainModelFile
} from './customModel.js?v=6.0';
import {
  downloadPortable3dProject,
  readPortable3dProject,
  save3dToGallery,
  consume3dGalleryLaunch
} from './storage3d.js?v=6.0';

const store = create3dStore();
window.ThreeLightingStore = store;

const byId = (id) =>
  document.getElementById(id);

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
  stateSource: byId('stateSource'),
  stateMorphs: byId('stateMorphs'),
  stateLights: byId('stateLights'),
  stateSelectedLight: byId('stateSelectedLight'),
  statePalette: byId('statePalette'),
  webglBadge: byId('webglBadge'),
  viewportOverlay:
    document.querySelector(
      '.viewport-overlay'
    ),
  viewportMessage:
    byId('viewportMessage'),
  resetCamera: byId('resetCameraBtn'),
  cameraPresets:
    byId('cameraPresetButtons'),
  gridToggle: byId('gridToggle'),
  shadowToggle: byId('shadowToggle'),
  edgeToggle: byId('edgeToggle'),
  paletteBridge:
    byId('paletteBridgeStatus'),
  toast: byId('toast'),

  lightingEnabled:
    byId('lightingEnabled'),
  showLightHelpers:
    byId('showLightHelpers'),
  addLight: byId('addLightBtn'),
  duplicateLight:
    byId('duplicateLightBtn'),
  deleteLight:
    byId('deleteLightBtn'),
  lightList: byId('lightList'),

  lightName: byId('lightName'),
  lightEnabled: byId('lightEnabled'),
  lightColor: byId('lightColor'),
  lightHex: byId('lightHex'),
  lightIntensity:
    byId('lightIntensity'),
  lightIntensityOut:
    byId('lightIntensityOut'),
  lightAzimuth:
    byId('lightAzimuth'),
  lightAzimuthOut:
    byId('lightAzimuthOut'),
  lightElevation:
    byId('lightElevation'),
  lightElevationOut:
    byId('lightElevationOut'),
  lightDistance:
    byId('lightDistance'),
  lightDistanceOut:
    byId('lightDistanceOut'),
  lightSoftness:
    byId('lightSoftness'),
  lightSoftnessOut:
    byId('lightSoftnessOut'),

  paletteSelect:
    byId('paletteLibrarySelect'),
  paletteRefresh:
    byId('refreshPaletteBtn'),
  paletteApply:
    byId('applyPaletteBtn'),
  paletteImport:
    byId('importLightLabBtn'),
  paletteImportInput:
    byId('lightLabFileInput'),
  paletteSync:
    byId('paletteSyncLighting'),
  paletteMode:
    byId('paletteMode'),
  palettePreview:
    byId('palettePreview'),

  importModel:
    byId('importModelBtn'),
  modelInput:
    byId('customModelInput'),
  customModelStatus:
    byId('customModelStatus'),

  projectName:
    byId('projectName'),
  saveGallery:
    byId('saveGalleryBtn'),
  exportProject:
    byId('exportProjectBtn'),
  importProject:
    byId('importProjectBtn'),
  importProjectInput:
    byId('projectFileInput'),
  exportPng:
    byId('exportPngBtn')
};

const environmentIds = [
  'ambient',
  'shadow',
  'bounce',
  'rim'
];

let toastTimer = 0;
let engine = null;
let modelLoadToken = 0;
let customModelFiles = [];
let paletteLibrary = [];

function normalizeHex(
  value
) {
  const raw =
    String(value || '')
      .trim()
      .toUpperCase();

  const prefixed =
    raw.startsWith('#')
      ? raw
      : `#${raw}`;

  return /^#[0-9A-F]{6}$/.test(
    prefixed
  )
    ? prefixed
    : null;
}

function toast(message) {
  elements.toast.textContent =
    message;

  elements.toast.classList.add(
    'is-visible'
  );

  clearTimeout(toastTimer);

  toastTimer = setTimeout(
    () =>
      elements.toast.classList.remove(
        'is-visible'
      ),
    1800
  );
}

function selectedLight(
  state = store.getState()
) {
  return (
    state.lighting.lights.find(
      (light) =>
        light.id ===
        state.lighting.selectedLightId
    ) ||
    state.lighting.lights[0] ||
    null
  );
}

function updateSelectedLight(
  patch
) {
  store.setState((state) => {
    const selectedId =
      state.lighting.selectedLightId;

    return {
      ...state,
      lighting: {
        ...state.lighting,
        lights:
          state.lighting.lights.map(
            (light) =>
              light.id === selectedId
                ? {
                    ...light,
                    ...patch
                  }
                : light
          )
      }
    };
  });
}

function updateEnvironment(
  key,
  patch
) {
  store.setState((state) => ({
    ...state,
    lighting: {
      ...state.lighting,
      [key]: {
        ...state.lighting[key],
        ...patch
      }
    }
  }));
}

function setInputValue(
  input,
  value
) {
  if (
    !input ||
    document.activeElement === input
  ) {
    return;
  }

  input.value = value;
}

function customCard(
  state
) {
  if (!state.customModel) {
    return null;
  }

  return {
    id: 'custom',
    name: 'Modelo importado',
    description:
      state.customModel.name ||
      'Modelo local',
    ready: true,
    source: 'custom-local'
  };
}

function allModelEntries(
  state
) {
  const custom = customCard(state);

  return custom
    ? [
        ...MODEL_REGISTRY,
        custom
      ]
    : MODEL_REGISTRY;
}

function renderCards(state) {
  elements.cards.replaceChildren(
    ...allModelEntries(state).map(
      (entry) => {
        const button =
          document.createElement(
            'button'
          );

        button.type = 'button';

        button.className = [
          'model-card',
          entry.id ===
          state.selectedModel
            ? 'is-active'
            : '',
          entry.ready
            ? 'is-ready'
            : ''
        ]
          .filter(Boolean)
          .join(' ');

        button.dataset.model =
          entry.id;

        button.innerHTML = `
          <strong>${entry.name}</strong>
          <small>${entry.description}</small>
          <em>${
            entry.id === 'asaro'
              ? 'PLANOS GLB'
              : entry.id === 'custom'
                ? 'MODELO LOCAL'
                : 'ANATOMIA CC0'
          }</em>
        `;

        return button;
      }
    )
  );
}

function sourceDescription(
  state
) {
  const info =
    engine?.getModelInfo?.();

  if (state.selectedModel === 'custom') {
    return (
      state.customModel?.name ||
      'Modelo local'
    );
  }

  if (!info) {
    return state.selectedModel === 'asaro'
      ? 'Head Planes Reference'
      : 'MakeHuman CC0';
  }

  if (info.source === 'glb') {
    return 'Head Planes Reference';
  }

  if (info.source === 'fallback') {
    return 'Fallback por codigo';
  }

  if (
    info.source ===
    'makehuman-cc0'
  ) {
    return 'MakeHuman / MPFB2 CC0';
  }

  if (
    info.source ===
    'custom-local'
  ) {
    return (
      state.customModel?.name ||
      'Modelo local'
    );
  }

  return info.source || 'Modelo 3D';
}

function renderLightList(
  state
) {
  const selectedId =
    state.lighting.selectedLightId;

  elements.lightList.replaceChildren(
    ...state.lighting.lights.map(
      (light, index) => {
        const button =
          document.createElement(
            'button'
          );

        button.type = 'button';

        button.className =
          `light-list-item${
            light.id === selectedId
              ? ' is-active'
              : ''
          }`;

        button.dataset.lightId =
          light.id;

        button.innerHTML = `
          <i style="background:${light.color}"></i>
          <span>
            <strong>${
              light.name ||
              `Luz ${index + 1}`
            }</strong>
            <small>${
              light.enabled
                ? `${Math.round(
                    light.intensity
                  )}%`
                : 'Apagada'
            }</small>
          </span>
        `;

        return button;
      }
    )
  );

  elements.addLight.disabled =
    state.lighting.lights.length >=
    MAX_3D_LIGHTS;
}

function renderSelectedLight(
  state
) {
  const light =
    selectedLight(state);

  const disabled = !light;

  [
    elements.lightName,
    elements.lightEnabled,
    elements.lightColor,
    elements.lightHex,
    elements.lightIntensity,
    elements.lightAzimuth,
    elements.lightElevation,
    elements.lightDistance,
    elements.lightSoftness,
    elements.duplicateLight,
    elements.deleteLight
  ].forEach((element) => {
    if (element) {
      element.disabled = disabled;
    }
  });

  if (!light) return;

  setInputValue(
    elements.lightName,
    light.name
  );

  elements.lightEnabled.checked =
    light.enabled;

  setInputValue(
    elements.lightColor,
    light.color
  );

  setInputValue(
    elements.lightHex,
    light.color
  );

  setInputValue(
    elements.lightIntensity,
    light.intensity
  );

  setInputValue(
    elements.lightAzimuth,
    light.azimuth
  );

  setInputValue(
    elements.lightElevation,
    light.elevation
  );

  setInputValue(
    elements.lightDistance,
    light.distance
  );

  setInputValue(
    elements.lightSoftness,
    light.softness
  );

  elements.lightIntensityOut.textContent =
    `${Math.round(
      light.intensity
    )}%`;

  elements.lightAzimuthOut.textContent =
    `${Math.round(
      light.azimuth
    )} deg`;

  elements.lightElevationOut.textContent =
    `${Math.round(
      light.elevation
    )} deg`;

  elements.lightDistanceOut.textContent =
    `${Number(
      light.distance
    ).toFixed(1)}`;

  elements.lightSoftnessOut.textContent =
    `${Math.round(
      light.softness
    )}%`;

  elements.deleteLight.disabled =
    state.lighting.lights.length <= 1;
}

function renderEnvironment(
  state
) {
  environmentIds.forEach((key) => {
    const config =
      state.lighting[key];

    const color =
      byId(`${key}Color`);

    const hex =
      byId(`${key}Hex`);

    const intensity =
      byId(`${key}Intensity`);

    const output =
      byId(`${key}IntensityOut`);

    setInputValue(
      color,
      config.color
    );

    setInputValue(
      hex,
      config.color
    );

    setInputValue(
      intensity,
      config.intensity
    );

    if (output) {
      output.textContent =
        `${Math.round(
          config.intensity
        )}%`;
    }
  });
}

function renderPalettePreview(
  state
) {
  const entries =
    state.material.palette || [];

  elements.palettePreview.innerHTML =
    '';

  entries.slice(0, 16).forEach(
    (entry) => {
      const swatch =
        document.createElement(
          'button'
        );

      swatch.type = 'button';
      swatch.className =
        'bridge-swatch';

      swatch.style.background =
        entry.hex;

      swatch.title =
        `${entry.role}: ${entry.hex}`;

      swatch.addEventListener(
        'click',
        async () => {
          try {
            await navigator.clipboard.writeText(
              entry.hex
            );

            toast(
              `${entry.hex} copiado`
            );
          } catch (_) {}
        }
      );

      elements.palettePreview.appendChild(
        swatch
      );
    }
  );

  if (!entries.length) {
    elements.palettePreview.innerHTML =
      '<span class="palette-none">Sin paleta aplicada</span>';
  }
}

function renderState(state) {
  const model =
    state.selectedModel === 'custom'
      ? {
          name:
            state.customModel?.name ||
            'Modelo importado'
        }
      : modelById(
          state.selectedModel
        );

  const selected =
    selectedLight(state);

  elements.stageTitle.textContent =
    model.name;

  elements.stateModel.textContent =
    model.name;

  elements.stateColor.textContent =
    state.baseColor;

  elements.stateSource.textContent =
    sourceDescription(state);

  elements.stateLights.textContent =
    `${
      state.lighting.lights.filter(
        (light) => light.enabled
      ).length
    } / ${MAX_3D_LIGHTS}`;

  elements.stateSelectedLight.textContent =
    selected?.name || 'Ninguna';

  elements.statePalette.textContent =
    state.material.sourcePalette?.name ||
    (
      state.material.paletteMode ===
      'palette-bands'
        ? 'Paleta 16 colores'
        : 'Color base'
    );

  const info =
    engine?.getModelInfo?.();

  const morphCount =
    info?.morphCount || 0;

  elements.stateMorphs.textContent =
    state.selectedModel === 'asaro'
      ? 'No aplica'
      : morphCount
        ? `${morphCount} disponibles`
        : 'Base parametrica';

  setInputValue(
    elements.baseColor,
    state.baseColor
  );

  setInputValue(
    elements.baseHex,
    state.baseColor
  );

  setInputValue(
    elements.projectName,
    state.project?.name ||
      'Proyecto 3D Lighting'
  );

  elements.gridToggle.checked =
    state.scene.gridVisible;

  elements.shadowToggle.checked =
    state.scene.shadowsEnabled;

  elements.edgeToggle.checked =
    false;

  elements.edgeToggle.disabled =
    true;

  elements.lightingEnabled.checked =
    state.lighting.enabled;

  elements.showLightHelpers.checked =
    state.lighting.showHelpers;

  elements.paletteSync.checked =
    state.material.syncLighting !==
    false;

  elements.paletteMode.value =
    state.material.paletteMode ||
    'base-only';

  elements.paletteBridge.textContent =
    state.material.sourcePalette
      ? `Aplicada: ${
          state.material.sourcePalette.name
        }`
      : '16 colores preparados para Light Lab';

  elements.customModelStatus.textContent =
    state.customModel
      ? `${state.customModel.name} - ${
          state.customModel.fileNames?.length ||
          customModelFiles.length
        } archivo(s)`
      : 'Ningun modelo local cargado';

  renderCards(state);
  renderLightList(state);
  renderSelectedLight(state);
  renderEnvironment(state);
  renderPalettePreview(state);
}

async function setEngineModel(
  state
) {
  if (!engine) return;

  if (
    state.selectedModel === 'custom'
  ) {
    if (!customModelFiles.length) {
      toast(
        'El proyecto necesita volver a cargar su modelo local.'
      );

      return;
    }

    await engine.setCustomModel(
      customModelFiles,
      state.baseColor
    );
  } else {
    await engine.setModel(
      state.selectedModel,
      state.baseColor
    );
  }

  engine.applyMaterialState(
    state.material
  );

  engine.setCameraPreset(
    state.camera.preset
  );
}

async function updateEngineFromState(
  state
) {
  if (!engine) return;

  if (
    engine.getCurrentModel() !==
    state.selectedModel
  ) {
    const token =
      ++modelLoadToken;

    elements.viewportOverlay.classList.remove(
      'is-hidden'
    );

    elements.viewportMessage.textContent =
      'Cargando modelo 3D...';

    try {
      await setEngineModel(state);

      if (
        token !==
        modelLoadToken
      ) {
        return;
      }

      renderState(
        store.getState()
      );
    } catch (error) {
      console.error(error);

      toast(
        error.message ||
        'No se pudo cargar el modelo.'
      );
    } finally {
      if (
        token ===
        modelLoadToken
      ) {
        elements.viewportOverlay.classList.add(
          'is-hidden'
        );
      }
    }
  }

  engine.setBaseColor(
    state.baseColor
  );

  engine.applyMaterialState(
    state.material
  );

  engine.setGridVisible(
    state.scene.gridVisible
  );

  engine.setShadowsEnabled(
    state.scene.shadowsEnabled
  );

  engine.applyLightingState(
    state.lighting
  );

  engine.setSelectedLight(
    state.lighting.selectedLightId
  );

  engine.setLightHelpersVisible(
    state.lighting.showHelpers
  );
}

async function refreshPaletteLibrary() {
  paletteLibrary =
    await listAvailableLightLabPalettes();

  const selected =
    elements.paletteSelect.value;

  elements.paletteSelect.innerHTML =
    '';

  const placeholder =
    document.createElement(
      'option'
    );

  placeholder.value = '';
  placeholder.textContent =
    paletteLibrary.length
      ? 'Selecciona una paleta...'
      : 'No hay paletas guardadas';

  elements.paletteSelect.appendChild(
    placeholder
  );

  paletteLibrary.forEach(
    (item, index) => {
      const option =
        document.createElement(
          'option'
        );

      option.value =
        String(index);

      option.textContent =
        `${item.palette.name} - ${item.source}`;

      elements.paletteSelect.appendChild(
        option
      );
    }
  );

  if (
    selected &&
    elements.paletteSelect.querySelector(
      `option[value="${selected}"]`
    )
  ) {
    elements.paletteSelect.value =
      selected;
  }
}

function applyPaletteRecord(
  record,
  source = 'light-lab'
) {
  const syncLighting =
    elements.paletteSync.checked;

  store.setState((state) =>
    applyLightLabPaletteToState(
      state,
      record,
      {
        syncLighting,
        source
      }
    )
  );

  toast(
    syncLighting
      ? 'Paleta y luces de Light Lab aplicadas.'
      : 'Paleta de 16 colores aplicada.'
  );
}

async function captureCleanBlob() {
  const state =
    store.getState();

  const helpers =
    state.lighting.showHelpers;

  engine.setLightHelpersVisible(
    false
  );

  await new Promise(
    (resolve) =>
      requestAnimationFrame(
        () =>
          requestAnimationFrame(
            resolve
          )
      )
  );

  const blob =
    await engine.capturePngBlob();

  engine.setLightHelpersVisible(
    helpers
  );

  return blob;
}

async function captureThumbnail() {
  const blob =
    await captureCleanBlob();

  if (!blob) return null;

  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload =
        () => resolve(reader.result);

      reader.onerror =
        () => reject(
          reader.error
        );

      reader.readAsDataURL(
        blob
      );
    }
  );
}

function downloadBlob(
  blob,
  name
) {
  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement('a');

  anchor.href = url;
  anchor.download = name;

  document.body.appendChild(
    anchor
  );

  anchor.click();
  anchor.remove();

  setTimeout(
    () =>
      URL.revokeObjectURL(url),
    1500
  );
}

async function applyLoadedProject(
  result
) {
  const files =
    result?.assets?.modelFiles;

  customModelFiles =
    Array.isArray(files)
      ? files
      : [];

  const state =
    result.state;

  if (
    state.selectedModel === 'custom' &&
    !customModelFiles.length
  ) {
    state.selectedModel = 'asaro';

    toast(
      'El proyecto no incluia el modelo local; se abrio Asaro.'
    );
  }

  store.setState(state);

  if (engine) {
    await setEngineModel(
      store.getState()
    );
  }
}

elements.cards.addEventListener(
  'click',
  (event) => {
    const button =
      event.target.closest(
        '[data-model]'
      );

    if (!button) return;

    const id =
      button.dataset.model;

    if (
      id === 'custom' &&
      !customModelFiles.length
    ) {
      elements.modelInput.click();
      return;
    }

    store.setState((state) => ({
      ...state,
      selectedModel: id
    }));
  }
);

elements.baseColor.addEventListener(
  'input',
  () => {
    const hex =
      normalizeHex(
        elements.baseColor.value
      );

    if (!hex) return;

    store.setState((state) => ({
      ...state,
      baseColor: hex
    }));
  }
);

elements.baseHex.addEventListener(
  'change',
  () => {
    const hex =
      normalizeHex(
        elements.baseHex.value
      );

    if (!hex) {
      elements.baseHex.value =
        store.getState().baseColor;

      toast('HEX invalido.');
      return;
    }

    store.setState((state) => ({
      ...state,
      baseColor: hex
    }));
  }
);

elements.lightList.addEventListener(
  'click',
  (event) => {
    const button =
      event.target.closest(
        '[data-light-id]'
      );

    if (!button) return;

    store.setState((state) => ({
      ...state,
      lighting: {
        ...state.lighting,
        selectedLightId:
          button.dataset.lightId
      }
    }));
  }
);

elements.addLight.addEventListener(
  'click',
  () => {
    store.setState((state) => {
      if (
        state.lighting.lights.length >=
        MAX_3D_LIGHTS
      ) {
        toast('Maximo 8 luces.');
        return state;
      }

      const light =
        createDefault3dLight(
          state.lighting.lights.length
        );

      return {
        ...state,
        lighting: {
          ...state.lighting,
          lights: [
            ...state.lighting.lights,
            light
          ],
          selectedLightId:
            light.id
        }
      };
    });
  }
);

elements.duplicateLight.addEventListener(
  'click',
  () => {
    store.setState((state) => {
      if (
        state.lighting.lights.length >=
        MAX_3D_LIGHTS
      ) {
        toast('Maximo 8 luces.');
        return state;
      }

      const current =
        selectedLight(state);

      if (!current) return state;

      const copy =
        duplicate3dLight(
          current,
          state.lighting.lights.length
        );

      return {
        ...state,
        lighting: {
          ...state.lighting,
          lights: [
            ...state.lighting.lights,
            copy
          ],
          selectedLightId:
            copy.id
        }
      };
    });
  }
);

elements.deleteLight.addEventListener(
  'click',
  () => {
    store.setState((state) => {
      if (
        state.lighting.lights.length <=
        1
      ) {
        return state;
      }

      const selectedId =
        state.lighting.selectedLightId;

      const lights =
        state.lighting.lights.filter(
          (light) =>
            light.id !== selectedId
        );

      return {
        ...state,
        lighting: {
          ...state.lighting,
          lights,
          selectedLightId:
            lights[0]?.id || null
        }
      };
    });
  }
);

elements.lightingEnabled.addEventListener(
  'change',
  () => {
    store.setState((state) => ({
      ...state,
      lighting: {
        ...state.lighting,
        enabled:
          elements.lightingEnabled.checked
      }
    }));
  }
);

elements.showLightHelpers.addEventListener(
  'change',
  () => {
    store.setState((state) => ({
      ...state,
      lighting: {
        ...state.lighting,
        showHelpers:
          elements.showLightHelpers.checked
      }
    }));
  }
);

elements.lightEnabled.addEventListener(
  'change',
  () => {
    updateSelectedLight({
      enabled:
        elements.lightEnabled.checked
    });
  }
);

elements.lightName.addEventListener(
  'change',
  () => {
    updateSelectedLight({
      name:
        elements.lightName.value.trim() ||
        'Luz'
    });
  }
);

elements.lightColor.addEventListener(
  'input',
  () => {
    const hex =
      normalizeHex(
        elements.lightColor.value
      );

    if (hex) {
      updateSelectedLight({
        color: hex
      });
    }
  }
);

elements.lightHex.addEventListener(
  'change',
  () => {
    const hex =
      normalizeHex(
        elements.lightHex.value
      );

    if (!hex) {
      elements.lightHex.value =
        selectedLight()?.color ||
        '#FFFFFF';

      toast('HEX invalido.');
      return;
    }

    updateSelectedLight({
      color: hex
    });
  }
);

[
  [
    'lightIntensity',
    'intensity'
  ],
  [
    'lightAzimuth',
    'azimuth'
  ],
  [
    'lightElevation',
    'elevation'
  ],
  [
    'lightDistance',
    'distance'
  ],
  [
    'lightSoftness',
    'softness'
  ]
].forEach(([id, key]) => {
  elements[id].addEventListener(
    'input',
    () => {
      updateSelectedLight({
        [key]:
          Number(
            elements[id].value
          )
      });
    }
  );
});

environmentIds.forEach((key) => {
  const color =
    byId(`${key}Color`);

  const hex =
    byId(`${key}Hex`);

  const intensity =
    byId(`${key}Intensity`);

  color.addEventListener(
    'input',
    () => {
      const value =
        normalizeHex(
          color.value
        );

      if (value) {
        updateEnvironment(
          key,
          { color: value }
        );
      }
    }
  );

  hex.addEventListener(
    'change',
    () => {
      const value =
        normalizeHex(
          hex.value
        );

      if (!value) {
        hex.value =
          store.getState()
            .lighting[key].color;

        toast('HEX invalido.');
        return;
      }

      updateEnvironment(
        key,
        { color: value }
      );
    }
  );

  intensity.addEventListener(
    'input',
    () => {
      updateEnvironment(
        key,
        {
          intensity:
            Number(
              intensity.value
            )
        }
      );
    }
  );
});

elements.gridToggle.addEventListener(
  'change',
  () => {
    store.setState((state) => ({
      ...state,
      scene: {
        ...state.scene,
        gridVisible:
          elements.gridToggle.checked
      }
    }));
  }
);

elements.shadowToggle.addEventListener(
  'change',
  () => {
    store.setState((state) => ({
      ...state,
      scene: {
        ...state.scene,
        shadowsEnabled:
          elements.shadowToggle.checked
      }
    }));
  }
);

elements.resetCamera.addEventListener(
  'click',
  () => {
    engine?.setCameraPreset(
      'three-quarter'
    );

    store.setState((state) => ({
      ...state,
      camera: {
        ...state.camera,
        preset: 'three-quarter'
      }
    }));

    toast('Camara restablecida.');
  }
);

elements.cameraPresets.addEventListener(
  'click',
  (event) => {
    const button =
      event.target.closest(
        '[data-camera-preset]'
      );

    if (
      !button ||
      !engine
    ) {
      return;
    }

    const preset =
      button.dataset.cameraPreset;

    engine.setCameraPreset(
      preset
    );

    store.setState((state) => ({
      ...state,
      camera: {
        ...state.camera,
        preset
      }
    }));
  }
);

elements.canvas.addEventListener(
  'pointerdown',
  (event) => {
    if (
      !engine ||
      event.button !== 0
    ) {
      return;
    }

    const id =
      engine.pickLight(
        event.clientX,
        event.clientY,
        elements.canvas
          .getBoundingClientRect()
      );

    if (!id) return;

    store.setState((state) => ({
      ...state,
      lighting: {
        ...state.lighting,
        selectedLightId: id
      }
    }));
  }
);

elements.paletteRefresh.addEventListener(
  'click',
  async () => {
    await refreshPaletteLibrary();
    toast('Biblioteca Light Lab actualizada.');
  }
);

elements.paletteApply.addEventListener(
  'click',
  () => {
    const index =
      Number(
        elements.paletteSelect.value
      );

    const item =
      paletteLibrary[index];

    if (!item) {
      toast('Selecciona una paleta.');
      return;
    }

    applyPaletteRecord(
      item.record,
      item.source
    );
  }
);

elements.paletteImport.addEventListener(
  'click',
  () => {
    elements.paletteImportInput.click();
  }
);

elements.paletteImportInput.addEventListener(
  'change',
  async (event) => {
    const file =
      event.target.files?.[0];

    event.target.value = '';

    if (!file) return;

    try {
      const record =
        await readLightLabFile(
          file
        );

      applyPaletteRecord(
        record,
        'archivo .lls'
      );
    } catch (error) {
      console.error(error);
      toast(
        error.message ||
        'No se pudo importar la paleta.'
      );
    }
  }
);

elements.paletteSync.addEventListener(
  'change',
  () => {
    store.setState((state) => ({
      ...state,
      material: {
        ...state.material,
        syncLighting:
          elements.paletteSync.checked
      }
    }));
  }
);

elements.paletteMode.addEventListener(
  'change',
  () => {
    const mode =
      elements.paletteMode.value;

    if (
      mode === 'palette-bands' &&
      !store.getState()
        .material.palette.length
    ) {
      elements.paletteMode.value =
        'base-only';

      toast(
        'Aplica primero una paleta Light Lab.'
      );

      return;
    }

    store.setState((state) => ({
      ...state,
      material: {
        ...state.material,
        paletteMode: mode
      }
    }));
  }
);

elements.importModel.addEventListener(
  'click',
  () => {
    elements.modelInput.click();
  }
);

elements.modelInput.addEventListener(
  'change',
  (event) => {
    const files =
      Array.from(
        event.target.files || []
      );

    event.target.value = '';

    if (!files.length) return;

    const main =
      findMainModelFile(files);

    if (!main) {
      toast(
        'Selecciona un GLB o GLTF.'
      );
      return;
    }

    customModelFiles = files;

    store.setState((state) => ({
      ...state,
      selectedModel: 'custom',
      customModel: {
        name: main.name,
        fileNames:
          files.map(
            (file) => file.name
          ),
        size:
          files.reduce(
            (sum, file) =>
              sum + file.size,
            0
          )
      }
    }));
  }
);

elements.projectName.addEventListener(
  'change',
  () => {
    store.setState((state) => ({
      ...state,
      project: {
        ...state.project,
        name:
          elements.projectName.value
            .trim() ||
          'Proyecto 3D Lighting'
      }
    }));
  }
);

elements.saveGallery.addEventListener(
  'click',
  async () => {
    if (!engine) return;

    try {
      const thumbnail =
        await captureThumbnail();

      const record =
        await save3dToGallery(
          store.getState(),
          thumbnail,
          customModelFiles
        );

      store.setState((state) => ({
        ...state,
        project: {
          ...state.project,
          galleryId:
            record.id,
          name:
            record.name
        }
      }));

      toast(
        'Proyecto guardado en Galeria.'
      );
    } catch (error) {
      console.error(error);

      toast(
        error.message ||
        'No se pudo guardar.'
      );
    }
  }
);

elements.exportProject.addEventListener(
  'click',
  async () => {
    try {
      await downloadPortable3dProject(
        store.getState(),
        customModelFiles
      );

      toast(
        'Proyecto .k3d.json exportado.'
      );
    } catch (error) {
      console.error(error);

      toast(
        error.message ||
        'No se pudo exportar.'
      );
    }
  }
);

elements.importProject.addEventListener(
  'click',
  () => {
    elements.importProjectInput.click();
  }
);

elements.importProjectInput.addEventListener(
  'change',
  async (event) => {
    const file =
      event.target.files?.[0];

    event.target.value = '';

    if (!file) return;

    try {
      const result =
        await readPortable3dProject(
          file
        );

      await applyLoadedProject(
        result
      );

      toast(
        'Proyecto 3D importado.'
      );
    } catch (error) {
      console.error(error);

      toast(
        error.message ||
        'No se pudo importar.'
      );
    }
  }
);

elements.exportPng.addEventListener(
  'click',
  async () => {
    if (!engine) return;

    const blob =
      await captureCleanBlob();

    if (!blob) {
      toast(
        'No se pudo generar el PNG.'
      );
      return;
    }

    const name =
      String(
        store.getState()
          .project?.name ||
        'escena-3d'
      )
        .normalize('NFKD')
        .replace(
          /[^\w-]+/g,
          '-'
        )
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') ||
      'escena-3d';

    downloadBlob(
      blob,
      `${name}.png`
    );

    toast('PNG exportado.');
  }
);

document.addEventListener(
  'studio-theme-change',
  (event) => {
    engine?.applyTheme(
      event.detail?.theme ||
      'day'
    );
  }
);

store.subscribe((state) => {
  renderState(state);
  updateEngineFromState(state);
});

async function start() {
  const galleryLaunch =
    await consume3dGalleryLaunch();

  if (galleryLaunch) {
    customModelFiles =
      Array.isArray(
        galleryLaunch.assets?.modelFiles
      )
        ? galleryLaunch.assets.modelFiles
        : [];

    let state =
      galleryLaunch.state;

    if (
      state.selectedModel === 'custom' &&
      !customModelFiles.length
    ) {
      state = {
        ...state,
        selectedModel: 'asaro'
      };
    }

    store.setState(state);
  }

  const transfer =
    consumeLightLabTransfer();

  if (transfer) {
    store.setState((state) =>
      applyLightLabPaletteToState(
        state,
        transfer,
        {
          syncLighting: true,
          source: 'Light Lab'
        }
      )
    );
  }

  renderState(
    store.getState()
  );

  await refreshPaletteLibrary();

  const webgl =
    detectWebGL();

  if (!webgl) {
    elements.webglBadge.textContent =
      'WebGL no disponible';

    elements.stateEngine.textContent =
      'Sin WebGL';

    elements.stateCamera.textContent =
      'No disponible';

    elements.viewportMessage.textContent =
      'WebGL no esta disponible';

    return;
  }

  elements.webglBadge.textContent =
    'Cargando Three.js...';

  elements.stateEngine.textContent =
    'Cargando motor';

  try {
    const state =
      store.getState();

    engine =
      await create3dScene(
        elements.canvas,
        {
          model:
            state.selectedModel ===
            'custom'
              ? null
              : state.selectedModel,
          color: state.baseColor,
          gridVisible:
            state.scene.gridVisible,
          shadowsEnabled:
            state.scene.shadowsEnabled,
          cameraPreset:
            state.camera.preset,
          lighting:
            state.lighting,
          material:
            state.material,
          onLightTransform(
            id,
            patch
          ) {
            store.setState(
              (current) => ({
                ...current,
                lighting: {
                  ...current.lighting,
                  lights:
                    current.lighting.lights.map(
                      (light) =>
                        light.id === id
                          ? {
                              ...light,
                              ...patch
                            }
                          : light
                    )
                }
              })
            );
          }
        }
      );

    window.ThreeLightingEngine =
      engine;

    if (
      state.selectedModel === 'custom' &&
      customModelFiles.length
    ) {
      await engine.setCustomModel(
        customModelFiles,
        state.baseColor
      );

      engine.applyMaterialState(
        state.material
      );

      engine.setCameraPreset(
        state.camera.preset
      );
    }

    engine.setLightTransformCallback(
      (id, patch) => {
        store.setState(
          (current) => ({
            ...current,
            lighting: {
              ...current.lighting,
              lights:
                current.lighting.lights.map(
                  (light) =>
                    light.id === id
                      ? {
                          ...light,
                          ...patch
                        }
                      : light
                )
            }
          })
        );
      }
    );

    elements.webglBadge.textContent =
      'Three.js r185 - WebGL';

    elements.stateEngine.textContent =
      'Three.js + WebGL';

    elements.stateCamera.textContent =
      'Orbita + zoom + pan';

    elements.viewportOverlay.classList.add(
      'is-hidden'
    );

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

    if (transfer) {
      toast(
        'Paleta de Light Lab recibida en 3D.'
      );
    } else if (galleryLaunch) {
      toast(
        'Proyecto abierto desde Galeria.'
      );
    }
  } catch (error) {
    console.error(error);

    elements.webglBadge.textContent =
      'Error al cargar motor';

    elements.stateEngine.textContent =
      'Motor no cargado';

    elements.stateCamera.textContent =
      'No disponible';

    elements.viewportMessage.textContent =
      'No se pudo cargar el motor 3D';

    const detail =
      elements.viewportOverlay?.querySelector(
        'span'
      );

    if (detail) {
      detail.textContent =
        error.message ||
        'Recarga la pagina y vuelve a intentar.';
    }
  }
}

start();