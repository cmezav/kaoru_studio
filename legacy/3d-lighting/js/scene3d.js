import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { createAsaroHead } from './asaroHead.js?v=3.1';
import { createHumanModel } from './humanModel.js?v=4.1';
import { createLightingRig } from './lighting3d.js?v=5.1';
import { applyPaletteToMaterials } from './paletteBridge3d.js?v=6.0';
import { createCustomModel } from './customModel.js?v=6.0';

export const SCENE3D_PHASE = 6;

const ASARO_GLB_URL = new URL(
  '../assets/models/head_planes_reference.glb?v=3.3',
  import.meta.url
).href;

export function detectWebGL() {
  try {
    const canvas = document.createElement('canvas');

    return Boolean(
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    );
  } catch (_) {
    return false;
  }
}

function loadGltf(loader, url) {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}

function fitObjectToView(
  THREE,
  object,
  floorY = -1.05,
  targetHeight = 3.2
) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());

  const scale = size.y > 0
    ? targetHeight / size.y
    : 1;

  object.scale.setScalar(scale);
  object.updateMatrixWorld(true);

  const box2 = new THREE.Box3().setFromObject(object);
  const center2 = box2.getCenter(new THREE.Vector3());
  const min2 = box2.min.clone();

  object.position.x -= center2.x;
  object.position.z -= center2.z;
  object.position.y += floorY - min2.y;
  object.updateMatrixWorld(true);
}

async function createAsaroFromGlb(THREE, color) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  const gltf = await loadGltf(loader, ASARO_GLB_URL);
  const source = gltf.scene || gltf.scenes?.[0];

  if (!source) {
    throw new Error(
      'El GLB no contiene una escena utilizable.'
    );
  }

  const container = new THREE.Group();
  container.name = 'kaoru-asaro-glb';
  container.add(source);

  const colorMaterial = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.83,
    metalness: 0.0,
    side: THREE.DoubleSide
  });

  colorMaterial.userData.subjectColor = true;

  source.traverse((object) => {
    if (!object.isMesh) return;

    object.castShadow = true;
    object.receiveShadow = true;
    object.material = colorMaterial;
  });

  fitObjectToView(THREE, source, -1.05, 3.2);

  return {
    root: container,
    materials: [colorMaterial],
    colorMaterials: [colorMaterial],
    bounds: new THREE.Box3().setFromObject(container),
    source: 'glb',
    morphCount: 0,
    setEdgesVisible() {}
  };
}

function createStudySphere(
  THREE,
  color = '#C98E78'
) {
  const root = new THREE.Group();
  root.name = 'kaoru-study-sphere';

  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.78,
    metalness: 0.0,
    side: THREE.FrontSide
  });

  material.userData.subjectColor = true;

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(
      1.62,
      128,
      96
    ),
    material
  );

  sphere.name = 'kaoru-palette-study-sphere';
  sphere.position.y = 0.20;
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  root.add(sphere);
  root.updateMatrixWorld(true);

  return {
    root,
    materials: [material],
    colorMaterials: [material],
    bounds: new THREE.Box3().setFromObject(root),
    source: 'study-sphere',
    morphCount: 0,
    setEdgesVisible() {}
  };
}
export async function create3dScene(
  canvas,
  options = {}
) {
  if (!canvas) {
    throw new Error('No se encontro el canvas 3D.');
  }

  const THREE = await import('three');
  const {
    OrbitControls
  } = await import(
    'three/addons/controls/OrbitControls.js'
  );

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true
  });

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, 2)
  );
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x15121a);
  scene.fog = new THREE.Fog(0x15121a, 12, 30);

  const camera = new THREE.PerspectiveCamera(
    38,
    1,
    0.05,
    100
  );

  camera.position.set(4.3, 2.8, 6.5);

  const controls = new OrbitControls(
    camera,
    canvas
  );

  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.rotateSpeed = 0.68;
  controls.zoomSpeed = 0.82;
  controls.panSpeed = 0.65;
  controls.minDistance = 1.2;
  controls.maxDistance = 16;
  controls.minPolarAngle = 0.08;
  controls.maxPolarAngle = Math.PI * 0.95;
  controls.target.set(0, 0.78, 0);

  const lightingRig = createLightingRig({
    THREE,
    scene,
    camera,
    renderer,
    orbitControls: controls,
    onTransform: options.onLightTransform
  });

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x29242f,
    roughness: 0.94,
    metalness: 0.02
  });

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 22),
    floorMaterial
  );

  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.45;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(
    22,
    44,
    0x746586,
    0x3d3546
  );

  grid.position.y = -1.437;
  grid.material.transparent = true;
  grid.material.opacity = 0.33;
  grid.material.depthWrite = false;
  scene.add(grid);

  const subjectRoot = new THREE.Group();
  subjectRoot.name = 'subjectRoot';
  scene.add(subjectRoot);

  let subjectMaterials = [];
  let currentModel = null;
  let currentAsset = null;
  let currentSource = 'none';
  let currentLoadError = null;
  let currentMorphCount = 0;
  let currentBounds = null;
  let currentMaterialState =
    options.material || {
      paletteMode: 'base-only',
      palette: []
    };

  let loadVersion = 0;
  let disposed = false;

  function clearSubject() {
    subjectRoot.traverse((object) => {
      if (object.geometry) {
        object.geometry.dispose?.();
      }
    });

    while (subjectRoot.children.length) {
      subjectRoot.remove(
        subjectRoot.children[0]
      );
    }

    subjectMaterials.forEach((material) => {
      material.dispose?.();
    });

    subjectMaterials = [];
    currentAsset = null;
    currentSource = 'none';
    currentLoadError = null;
    currentMorphCount = 0;
    currentBounds = null;
  }

  function registerAsset(asset) {
    currentAsset = asset;
    currentSource = asset.source || 'glb';
    currentMorphCount = asset.morphCount || 0;
    currentBounds = asset.bounds || null;

    (asset.materials || []).forEach(
      (material) => {
        subjectMaterials.push(material);
      }
    );

    subjectRoot.add(asset.root);

    applyPaletteToMaterials(
      THREE,
      asset.colorMaterials ||
        subjectMaterials,
      currentMaterialState
    );
  }

  function setBaseColor(color) {
    subjectMaterials.forEach((material) => {
      if (material.userData?.subjectColor) {
        material.color.set(color);
      }
    });
  }

  function applyMaterialState(materialState) {
    currentMaterialState = {
      ...currentMaterialState,
      ...(materialState || {})
    };

    applyPaletteToMaterials(
      THREE,
      currentAsset?.colorMaterials ||
        subjectMaterials,
      currentMaterialState
    );
  }

  function setGridVisible(visible) {
    grid.visible = Boolean(visible);
  }

  function setEdgesVisible(visible) {
    currentAsset?.setEdgesVisible?.(visible);
  }

  function setShadowsEnabled(enabled) {
    renderer.shadowMap.enabled = Boolean(enabled);
    lightingRig.setShadowsEnabled(enabled);

    subjectRoot.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = Boolean(enabled);
        object.receiveShadow = true;
      }
    });
  }

  function genericFrame(
    kind,
    preset = 'three-quarter'
  ) {
    const box =
      currentBounds ||
      new THREE.Box3().setFromObject(
        subjectRoot
      );

    const size = box.getSize(
      new THREE.Vector3()
    );
    const center = box.getCenter(
      new THREE.Vector3()
    );
    const height = Math.max(size.y, 1);

    let targetY = center.y;
    let distance = Math.max(
      height * 0.95,
      4.8
    );
    let rise = height * 0.06;

    if (kind === 'realistic-head') {
      targetY =
        box.max.y -
        height * 0.105;

      distance = Math.max(
        height * 0.33,
        1.9
      );

      rise = height * 0.015;
    } else if (kind === 'bust') {
      targetY =
        box.max.y -
        height * 0.235;

      distance = Math.max(
        height * 0.52,
        2.8
      );

      rise = height * 0.035;
    }

    if (preset === 'front') {
      return {
        position: [
          center.x,
          targetY + rise,
          center.z + distance
        ],
        target: [
          center.x,
          targetY,
          center.z
        ]
      };
    }

    if (preset === 'side') {
      return {
        position: [
          center.x + distance,
          targetY + rise,
          center.z
        ],
        target: [
          center.x,
          targetY,
          center.z
        ]
      };
    }

    if (preset === 'back') {
      return {
        position: [
          center.x,
          targetY + rise,
          center.z - distance
        ],
        target: [
          center.x,
          targetY,
          center.z
        ]
      };
    }

    return {
      position: [
        center.x + distance * 0.66,
        targetY + rise * 2.1,
        center.z + distance * 0.88
      ],
      target: [
        center.x,
        targetY,
        center.z
      ]
    };
  }

  function asaroFrame(
    preset = 'three-quarter'
  ) {
    const presets = {
      front: {
        position: [0, 0.85, 6.6],
        target: [0, 0.78, 0.08]
      },
      'three-quarter': {
        position: [4.4, 2.45, 6.3],
        target: [0, 0.78, 0.02]
      },
      side: {
        position: [6.8, 0.95, 0.10],
        target: [0, 0.78, 0.02]
      },
      back: {
        position: [0, 1.0, -6.8],
        target: [0, 0.82, -0.12]
      }
    };

    return (
      presets[preset] ||
      presets['three-quarter']
    );
  }

  function setCameraPreset(
    name = 'three-quarter'
  ) {
    const frame =
      currentModel === 'asaro'
        ? asaroFrame(name)
        : genericFrame(
            currentModel,
            name
          );

    camera.position.set(
      ...frame.position
    );

    controls.target.set(
      ...frame.target
    );

    controls.update();
    lightingRig.setTarget(
      frame.target
    );
  }

  async function setModel(
    kind,
    color = '#C98E78'
  ) {
    const version = ++loadVersion;
    clearSubject();
    currentModel = kind;

    if (kind === 'sphere') {
      const sphere = createStudySphere(
        THREE,
        color
      );

      if (
        disposed ||
        version !== loadVersion
      ) {
        return;
      }

      registerAsset(sphere);
      currentLoadError = null;
    } else if (kind === 'asaro') {
      try {
        const asaro =
          await createAsaroFromGlb(
            THREE,
            color
          );

        if (
          disposed ||
          version !== loadVersion
        ) {
          return;
        }

        registerAsset(asaro);
        currentLoadError = null;
      } catch (error) {
        console.warn(
          'No se pudo cargar el GLB de planos. Usando fallback.',
          error
        );

        const fallback =
          createAsaroHead(
            THREE,
            { color }
          );

        if (
          disposed ||
          version !== loadVersion
        ) {
          return;
        }

        registerAsset({
          ...fallback,
          bounds:
            new THREE.Box3()
              .setFromObject(
                fallback.root
              ),
          source: 'fallback',
          morphCount: 0
        });

        currentLoadError = String(
          error?.message ||
          error ||
          'GLB load error'
        );
      }
    } else if (
      kind === 'realistic-head' ||
      kind === 'bust' ||
      kind === 'body'
    ) {
      const human =
        await createHumanModel(
          THREE,
          { color }
        );

      if (
        disposed ||
        version !== loadVersion
      ) {
        return;
      }

      registerAsset(human);
      currentLoadError = null;
    } else if (kind !== 'custom') {
      throw new Error(
        'Modelo 3D desconocido.'
      );
    }

    setShadowsEnabled(
      options.shadowsEnabled !== false
    );

    setEdgesVisible(false);
    setCameraPreset(
      options.cameraPreset ||
      'three-quarter'
    );
  }

  async function setCustomModel(
    files,
    color = '#C98E78'
  ) {
    const version = ++loadVersion;

    clearSubject();
    currentModel = 'custom';

    const asset =
      await createCustomModel(
        THREE,
        files,
        { color }
      );

    if (
      disposed ||
      version !== loadVersion
    ) {
      return;
    }

    registerAsset(asset);
    currentLoadError = null;

    setShadowsEnabled(
      options.shadowsEnabled !== false
    );

    setCameraPreset(
      options.cameraPreset ||
      'three-quarter'
    );
  }

  function applyLightingState(lighting) {
    lightingRig.applyState(lighting);
  }

  function setSelectedLight(id) {
    lightingRig.setSelected(id);
  }

  function setLightHelpersVisible(visible) {
    lightingRig.setShowHelpers(visible);
  }

  function setLightTransformCallback(callback) {
    lightingRig.setOnTransform(callback);
  }

  function pickLight(
    clientX,
    clientY,
    rect
  ) {
    return lightingRig.pickLight(
      clientX,
      clientY,
      rect
    );
  }

  function resize() {
    const rect =
      canvas.getBoundingClientRect();

    if (
      !rect.width ||
      !rect.height
    ) {
      return;
    }

    const pixelRatio = Math.min(
      window.devicePixelRatio || 1,
      2
    );

    renderer.setPixelRatio(
      pixelRatio
    );

    renderer.setSize(
      rect.width,
      rect.height,
      false
    );

    camera.aspect =
      rect.width /
      rect.height;

    camera.updateProjectionMatrix();
  }

  function applyTheme(theme) {
    const night = theme === 'night';

    scene.background.set(
      night
        ? 0x100e14
        : 0x25212b
    );

    scene.fog.color.set(
      night
        ? 0x100e14
        : 0x25212b
    );

    floorMaterial.color.set(
      night
        ? 0x26212c
        : 0x413b48
    );

    grid.material.opacity =
      night ? 0.30 : 0.38;
  }

  function capturePngBlob() {
    renderer.render(
      scene,
      camera
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        resolve,
        'image/png'
      );
    });
  }

  const resizeObserver =
    new ResizeObserver(resize);

  resizeObserver.observe(canvas);

  renderer.setAnimationLoop(() => {
    if (disposed) return;

    controls.update();
    renderer.render(
      scene,
      camera
    );
  });

  if (
    options.model &&
    options.model !== 'custom'
  ) {
    await setModel(
      options.model,
      options.color || '#C98E78'
    );
  } else if (!options.model) {
    await setModel(
      'asaro',
      options.color || '#C98E78'
    );
  }

  setGridVisible(
    options.gridVisible !== false
  );

  setShadowsEnabled(
    options.shadowsEnabled !== false
  );

  applyMaterialState(
    options.material || {}
  );

  applyLightingState(
    options.lighting || {}
  );

  setSelectedLight(
    options.lighting?.selectedLightId
  );

  setLightHelpersVisible(
    options.lighting?.showHelpers !== false
  );

  if (currentModel) {
    setCameraPreset(
      options.cameraPreset ||
      'three-quarter'
    );
  }

  applyTheme(
    document.documentElement.dataset.theme ||
    'day'
  );

  resize();

  return {
    THREE,
    renderer,
    scene,
    camera,
    controls,
    setModel,
    setCustomModel,
    setBaseColor,
    applyMaterialState,
    setGridVisible,
    setEdgesVisible,
    setShadowsEnabled,
    setCameraPreset,
    applyLightingState,
    setSelectedLight,
    setLightHelpersVisible,
    setLightTransformCallback,
    pickLight,
    capturePngBlob,
    resize,
    applyTheme,
    getCurrentModel:
      () => currentModel,
    getModelInfo:
      () => ({
        id: currentModel,
        source: currentSource,
        loadError: currentLoadError,
        morphCount: currentMorphCount,
        paletteSlots: 16
      }),
    dispose() {
      disposed = true;

      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      lightingRig.dispose();
      clearSubject();

      floor.geometry.dispose();
      floorMaterial.dispose();
      renderer.dispose();
    }
  };
}