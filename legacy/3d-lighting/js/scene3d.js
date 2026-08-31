import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createAsaroHead } from './asaroHead.js?v=3.1';

export const SCENE3D_PHASE = 3;

const ASARO_GLB_URL = '../assets/models/head_planes_reference.glb?v=3.1';

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
  const center = box.getCenter(new THREE.Vector3());

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
  const gltf = await loadGltf(loader, ASARO_GLB_URL);

  const root = gltf.scene || gltf.scenes?.[0];
  if (!root) {
    throw new Error('El GLB no contiene una escena utilizable.');
  }

  const container = new THREE.Group();
  container.name = 'kaoru-asaro-glb';
  const edgeRoot = new THREE.Group();
  edgeRoot.name = 'asaro-plane-edges';
  container.add(root);
  container.add(edgeRoot);

  const colorMaterial = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.83,
    metalness: 0.0,
    side: THREE.DoubleSide
  });
  colorMaterial.userData.subjectColor = true;

  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0x261c22,
    transparent: true,
    opacity: 0.36,
    depthTest: true
  });

  let meshCount = 0;

  root.traverse((object) => {
    if (!object.isMesh) return;

    meshCount += 1;
    object.castShadow = true;
    object.receiveShadow = true;
    object.material = colorMaterial;

    if (object.geometry) {
      const edgeGeometry = new THREE.EdgesGeometry(object.geometry, 16);
      const lines = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      lines.name = `${object.name || 'mesh'}-edge`;
      lines.renderOrder = 4;
      object.add(lines);
    }
  });

  fitObjectToView(THREE, root, -1.05, 3.2);

  container.userData.asaroModel = true;
  container.userData.edgeRoot = edgeRoot;
  container.userData.meshCount = meshCount;

  return {
    root: container,
    planeCount: 0,
    edgeRoot,
    materials: [colorMaterial, edgeMaterial],
    colorMaterials: [colorMaterial],
    source: 'glb',
    setEdgesVisible(visible) {
      root.traverse((object) => {
        if (object.type === 'LineSegments') {
          object.visible = Boolean(visible);
        }
      });
    }
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
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x15121a);
  scene.fog = new THREE.Fog(0x15121a, 10, 24);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 100);
  camera.position.set(4.3, 2.8, 6.5);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.rotateSpeed = 0.68;
  controls.zoomSpeed = 0.82;
  controls.panSpeed = 0.65;
  controls.minDistance = 2.4;
  controls.maxDistance = 13;
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = Math.PI * 0.93;
  controls.target.set(0, 0.78, 0);

  const hemisphere = new THREE.HemisphereLight(0xd8deff, 0x302538, 1.25);
  scene.add(hemisphere);

  const key = new THREE.DirectionalLight(0xffe4d6, 4.4);
  key.position.set(4.2, 6.2, 4.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -5;
  key.shadow.camera.near = 0.1;
  key.shadow.camera.far = 24;
  key.shadow.bias = -0.00035;
  key.shadow.normalBias = 0.025;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x7898ff, 0.48);
  fill.position.set(-4, 2.5, 1);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xb994ff, 0.62);
  rim.position.set(-2.5, 4.5, -4.5);
  scene.add(rim);

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x29242f,
    roughness: 0.94,
    metalness: 0.02
  });

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 18),
    floorMaterial
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.45;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(18, 36, 0x746586, 0x3d3546);
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
  let currentAsaro = null;
  let currentPlaneCount = 0;
  let currentSource = 'prototype';
  let loadVersion = 0;
  let disposed = false;

  function subjectMaterial(color, roughness = 0.58) {
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness: 0.015
    });
    material.userData.subjectColor = true;
    subjectMaterials.push(material);
    return material;
  }

  function enableShadow(mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function clearSubject() {
    subjectRoot.traverse((object) => {
      if (object.geometry) object.geometry.dispose?.();
    });

    while (subjectRoot.children.length) {
      subjectRoot.remove(subjectRoot.children[0]);
    }

    subjectMaterials.forEach((material) => material.dispose?.());
    subjectMaterials = [];
    currentAsaro = null;
    currentPlaneCount = 0;
    currentSource = 'prototype';
  }

  function addHead(group, color, y = 1.15, scale = 1) {
    const geometry = new THREE.SphereGeometry(1.08 * scale, 48, 32);
    geometry.scale(0.79, 1.05, 0.86);

    const head = enableShadow(new THREE.Mesh(
      geometry,
      subjectMaterial(color, 0.56)
    ));
    head.position.y = y;
    group.add(head);

    const neck = enableShadow(new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.43 * scale,
        0.51 * scale,
        1.05 * scale,
        32
      ),
      subjectMaterial(color, 0.64)
    ));
    neck.position.y = y - 1.05 * scale;
    group.add(neck);

    const nose = enableShadow(new THREE.Mesh(
      new THREE.ConeGeometry(0.18 * scale, 0.48 * scale, 16),
      subjectMaterial(color, 0.62)
    ));
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, y + 0.02 * scale, 0.92 * scale);
    group.add(nose);
  }

  function cylinderBetween(group, color, radius, height, position, rotationZ = 0) {
    const mesh = enableShadow(new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 1.04, height, 20),
      subjectMaterial(color, 0.63)
    ));
    mesh.position.set(...position);
    mesh.rotation.z = rotationZ;
    group.add(mesh);
    return mesh;
  }

  function createPrototype(kind, color) {
    const group = new THREE.Group();
    group.name = `prototype-${kind}`;

    if (kind === 'realistic-head') {
      addHead(group, color, 1.05, 1.05);
    } else if (kind === 'bust') {
      addHead(group, color, 1.55, 0.86);

      const chest = enableShadow(new THREE.Mesh(
        new THREE.SphereGeometry(1.3, 36, 24),
        subjectMaterial(color, 0.66)
      ));
      chest.scale.set(1.35, 0.58, 0.72);
      chest.position.y = -0.2;
      group.add(chest);

      cylinderBetween(group, color, 0.26, 1.45, [-1.2, -0.18, 0], Math.PI * 0.44);
      cylinderBetween(group, color, 0.26, 1.45, [1.2, -0.18, 0], -Math.PI * 0.44);
    } else {
      addHead(group, color, 2.35, 0.52);

      const torso = enableShadow(new THREE.Mesh(
        new THREE.CylinderGeometry(0.72, 0.54, 2.25, 24),
        subjectMaterial(color, 0.66)
      ));
      torso.position.y = 0.65;
      torso.scale.z = 0.62;
      group.add(torso);

      cylinderBetween(group, color, 0.19, 2.0, [-0.86, 0.7, 0], Math.PI * 0.08);
      cylinderBetween(group, color, 0.19, 2.0, [0.86, 0.7, 0], -Math.PI * 0.08);
      cylinderBetween(group, color, 0.25, 2.25, [-0.38, -1.48, 0], 0);
      cylinderBetween(group, color, 0.25, 2.25, [0.38, -1.48, 0], 0);
      group.scale.setScalar(0.82);
      group.position.y = 0.3;
    }

    return group;
  }

  async function setModel(kind, color = '#C98E78') {
    const version = ++loadVersion;
    clearSubject();
    currentModel = kind;

    if (kind === 'asaro') {
      try {
        currentAsaro = await createAsaroFromGlb(THREE, color);
        currentSource = 'glb';
      } catch (error) {
        console.warn('No se pudo cargar el GLB de Asaro. Usando fallback.', error);
        currentAsaro = createAsaroHead(THREE, { color });
        currentSource = 'fallback';
      }

      if (disposed || version !== loadVersion) {
        return;
      }

      currentAsaro.materials.forEach((material) => {
        subjectMaterials.push(material);
      });
      currentPlaneCount = currentAsaro.planeCount || 0;
      currentAsaro.setEdgesVisible(options.edgesVisible !== false);
      subjectRoot.add(currentAsaro.root);
      return;
    }

    currentSource = 'prototype';
    const model = createPrototype(kind, color);
    if (disposed || version !== loadVersion) {
      return;
    }
    subjectRoot.add(model);
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
    currentAsaro?.setEdgesVisible(visible);
  }

  function setShadowsEnabled(enabled) {
    renderer.shadowMap.enabled = Boolean(enabled);
    subjectRoot.traverse((object) => {
      if (object.isMesh) object.castShadow = Boolean(enabled);
    });
  }

  const presets = {
    front: { position: [0, 0.85, 6.6], target: [0, 0.78, 0.08] },
    'three-quarter': { position: [4.4, 2.45, 6.3], target: [0, 0.78, 0.02] },
    side: { position: [6.8, 0.95, 0.10], target: [0, 0.78, 0.02] },
    back: { position: [0, 1.0, -6.8], target: [0, 0.82, -0.12] }
  };

  function setCameraPreset(name = 'three-quarter') {
    const preset = presets[name] || presets['three-quarter'];
    camera.position.set(...preset.position);
    controls.target.set(...preset.target);
    controls.update();
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

  await setModel(options.model || 'asaro', options.color || '#C98E78');
  setGridVisible(options.gridVisible !== false);
  setEdgesVisible(options.edgesVisible !== false);
  setShadowsEnabled(options.shadowsEnabled !== false);
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
    resize,
    applyTheme,
    getCurrentModel: () => currentModel,
    getModelInfo: () => ({
      id: currentModel,
      planeCount: currentPlaneCount,
      originalAsaro: currentModel === 'asaro',
      source: currentSource
    }),
    dispose() {
      disposed = true;
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      clearSubject();
      floor.geometry.dispose();
      floorMaterial.dispose();
      renderer.dispose();
    }
  };
}