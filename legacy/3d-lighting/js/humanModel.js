import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export const HUMAN_MODEL_PHASE = 4;

const HUMAN_GLB_URL = new URL(
  '../assets/models/realistic_human.glb?v=4.1',
  import.meta.url
).href;

function loadGltf(loader, url) {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}

function materialKind(name) {
  const value = String(name || '').toLowerCase();

  if (/eye|iris|cornea|sclera/.test(value)) return 'eye';
  if (/tooth|teeth/.test(value)) return 'teeth';
  if (/tongue|gum|mouth/.test(value)) return 'mouth';
  if (/lash|eyelash/.test(value)) return 'lash';

  return 'skin';
}

export async function createHumanModel(THREE, options = {}) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  const gltf = await loadGltf(loader, HUMAN_GLB_URL);
  const source = gltf.scene || gltf.scenes?.[0];

  if (!source) {
    throw new Error('El GLB humano no contiene una escena utilizable.');
  }

  const root = new THREE.Group();
  root.name = 'kaoru-human-cc0';
  root.add(source);

  const skinMaterial = new THREE.MeshStandardMaterial({
    color: options.color || '#C98E78',
    roughness: 0.82,
    metalness: 0.0
  });
  skinMaterial.userData.subjectColor = true;

  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: '#ECE8E3',
    roughness: 0.28,
    metalness: 0.0
  });

  const teethMaterial = new THREE.MeshStandardMaterial({
    color: '#E8E1D7',
    roughness: 0.58,
    metalness: 0.0
  });

  const mouthMaterial = new THREE.MeshStandardMaterial({
    color: '#7E4A50',
    roughness: 0.72,
    metalness: 0.0
  });

  const lashMaterial = new THREE.MeshStandardMaterial({
    color: '#2E2428',
    roughness: 0.8,
    metalness: 0.0,
    side: THREE.DoubleSide
  });

  const colorMaterials = [skinMaterial];
  const materials = [
    skinMaterial,
    eyeMaterial,
    teethMaterial,
    mouthMaterial,
    lashMaterial
  ];

  const morphNames = new Set();
  let meshCount = 0;

  source.traverse((object) => {
    if (!object.isMesh) return;

    meshCount += 1;
    object.castShadow = true;
    object.receiveShadow = true;

    if (object.geometry) {
      object.geometry.computeVertexNormals?.();
      object.geometry.normalizeNormals?.();
    }

    const originalName = [
      object.name,
      object.material?.name,
      object.parent?.name
    ].filter(Boolean).join(' ');

    const kind = materialKind(originalName);

    if (kind === 'eye') object.material = eyeMaterial;
    else if (kind === 'teeth') object.material = teethMaterial;
    else if (kind === 'mouth') object.material = mouthMaterial;
    else if (kind === 'lash') object.material = lashMaterial;
    else object.material = skinMaterial;

    if (object.morphTargetDictionary) {
      Object.keys(object.morphTargetDictionary).forEach((name) => {
        morphNames.add(name);
      });
    }
  });

  source.updateMatrixWorld(true);

  const before = new THREE.Box3().setFromObject(source);
  const size = before.getSize(new THREE.Vector3());

  const targetHeight = 5.3;
  const scale = size.y > 0 ? targetHeight / size.y : 1;
  source.scale.setScalar(scale);
  source.updateMatrixWorld(true);

  const scaled = new THREE.Box3().setFromObject(source);
  const center = scaled.getCenter(new THREE.Vector3());

  source.position.x -= center.x;
  source.position.z -= center.z;
  source.position.y += -1.38 - scaled.min.y;
  source.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(root);
  const finalSize = bounds.getSize(new THREE.Vector3());

  root.userData.humanModel = true;
  root.userData.meshCount = meshCount;
  root.userData.morphCount = morphNames.size;
  root.userData.bounds = bounds;

  return {
    root,
    materials,
    colorMaterials,
    bounds,
    size: finalSize,
    meshCount,
    morphCount: morphNames.size,
    morphNames: [...morphNames],
    source: 'makehuman-cc0'
  };
}