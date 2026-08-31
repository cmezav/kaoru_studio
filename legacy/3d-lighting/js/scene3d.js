import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { createAsaroHead } from './asaroHead.js?v=3.1';
import { createHumanModel } from './humanModel.js?v=4.0';
import { createLightingRig } from './lighting3d.js?v=5.0';

export const SCENE3D_PHASE = 5;

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

function fitObjectToView(THREE, object, floorY = -1.05, targetHeight = 3.2) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());

  const scale = size.y > 0 ? targetHeight / size.y : 1;
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
    throw new Error('El GLB no contiene una escena utilizable.');
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

export async function create3dScene(canvas, options = {}) {
  if (!canvas) throw new Error('No se encontro el canvas 3D.');

  const THREE = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x15121a);
  scene.fog = new THREE.Fog(0x15121a, 12, 30);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 100);
  camera.position.set(4.3, 2.8, 6.5);

  const controls = new OrbitControls(camera, canvas);
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

  const grid = new THREE.GridHelper(22, 44, 0x746586, 0x3d3546);
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
  let loadVersion = 0;
  let disposed = false;

  function clearSubject() {
    subjectRoot.traverse((object) => {
      if (object.geometry) object.geometry.dispose?.();
    });

    while (subjectRoot.children.length) {
      subjectRoot.remove(subjectRoot.children[0]);
    }

    subjectMaterials.forEach((material) => material.dispose?.());
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

    (asset.materials || []).forEach((material) => {
      subjectMaterials.push(material);
    });

    subjectRoot.add(asset.root);
  }

  function setBaseColor(color) {
    subjectMaterials.forEach((material) => {
      if (material.userData?.subjectColor) {
        material.color.set(color);
      }
    });
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

  function humanFrame(kind, preset = 'three-quarter') {
    const box = currentBounds || new THREE.Box3().setFromObject(subjectRoot);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const height = Math.max(size.y, 1);

    let targetY = center.y;
    let distance = Math.max(height * 0.95, 4.8);
    let rise = height * 0.06;

    if (kind === 'realistic-head') {
      targetY = box.max.y - height * 0.105;
      distance = Math.max(height * 0.33, 1.9);
      rise = height * 0.015;
    } else if (kind === 'bust') {
      targetY = box.max.y - height * 0.235;
      distance = Math.max(height * 0.52, 2.8);
      rise = height * 0.035;
    }

    if (preset === 'front') {
      return {
        position: [0, targetY + rise, distance],
        target: [0, targetY, 0]
      };
    }

    if (preset === 'side') {
      return {
        position: [distance, targetY + rise, 0.08],
        target: [0, targetY, 0]
      };
    }

    if (preset === 'back') {
      return {
        position: [0, targetY + rise, -distance],
        target: [0, targetY, 0]
      };
    }

    return {
      position: [distance * 0.66, targetY + rise * 2.1, distance * 0.88],
      target: [0, targetY, 0]
    };
  }

  function asaroFrame(preset = 'three-quarter') {
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

    return presets[preset] || presets['three-quarter'];
  }

  function setCameraPreset(name = 'three-quarter') {
    const frame = currentModel === 'asaro'
      ? asaroFrame(name)
      : humanFrame(currentModel, name);

    camera.position.set(...frame.position);
    controls.target.set(...frame.target);
    controls.update();

    lightingRig.setTarget(frame.target);
  }

  async function setModel(kind, color = '#C98E78') {
    const version = ++loadVersion;
    clearSubject();
    currentModel = kind;

    if (kind === 'asaro') {
      try {
        const asaro = await createAsaroFromGlb(THREE, color);

        if (disposed || version !== loadVersion) return;

        registerAsset(asaro);
        currentLoadError = null;
      } catch (error) {
        console.warn('No se pudo cargar el GLB de planos. Usando fallback.', error);

        const fallback = createAsaroHead(THREE, { color });

        if (disposed || version !== loadVersion) return;

        registerAsset({
          ...fallback,
          bounds: new THREE.Box3().setFromObject(fallback.root),
          source: 'fallback',
          morphCount: 0
        });

        currentLoadError = String(
          error?.message || error || 'GLB load error'
        );
      }
    } else {
      try {
        const human = await createHumanModel(THREE, { color });

        if (disposed || version !== loadVersion) return;

        registerAsset(human);
        currentLoadError = null;
      } catch (error) {
        console.error('No se pudo cargar la base humana CC0.', error);
        currentSource = 'human-load-error';
        currentLoadError = String(
          error?.message || error || 'Human GLB load error'
        );
        throw error;
      }
    }

    setShadowsEnabled(options.shadowsEnabled !== false);
    setEdgesVisible(false);
    setCameraPreset(options.cameraPreset || 'three-quarter');
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

  function pickLight(clientX, clientY, rect) {
    return lightingRig.pickLight(clientX, clientY, rect);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  }

  function applyTheme(theme) {
    const night = theme === 'night';

    scene.background.set(night ? 0x100e14 : 0x25212b);
    scene.fog.color.set(night ? 0x100e14 : 0x25212b);
    floorMaterial.color.set(night ? 0x26212c : 0x413b48);
    grid.material.opacity = night ? 0.30 : 0.38;
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  renderer.setAnimationLoop(() => {
    if (disposed) return;

    controls.update();
    renderer.render(scene, camera);
  });

  await setModel(
    options.model || 'asaro',
    options.color || '#C98E78'
  );

  setGridVisible(options.gridVisible !== false);
  setShadowsEnabled(options.shadowsEnabled !== false);
  applyLightingState(options.lighting || {});
  setSelectedLight(options.lighting?.selectedLightId);
  setLightHelpersVisible(options.lighting?.showHelpers !== false);
  setCameraPreset(options.cameraPreset || 'three-quarter');
  applyTheme(document.documentElement.dataset.theme || 'day');
  resize();

  return {
    THREE,
    renderer,
    scene,
    camera,
    controls,
    setModel,
    setBaseColor,
    setGridVisible,
    setEdgesVisible,
    setShadowsEnabled,
    setCameraPreset,
    applyLightingState,
    setSelectedLight,
    setLightHelpersVisible,
    setLightTransformCallback,
    pickLight,
    resize,
    applyTheme,
    getCurrentModel: () => currentModel,
    getModelInfo: () => ({
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