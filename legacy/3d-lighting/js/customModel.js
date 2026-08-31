import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export const CUSTOM_MODEL_PHASE = 6;

function cleanName(value) {
  try {
    return decodeURIComponent(
      String(value || '').split(/[?#]/)[0]
    ).split('/').pop();
  } catch (_) {
    return String(value || '').split(/[?#]/)[0].split('/').pop();
  }
}

function loadGltf(loader, url) {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}

function fitObject(THREE, root, targetHeight = 5.3) {
  root.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());

  const scale = size.y > 0
    ? targetHeight / size.y
    : 1;

  root.scale.setScalar(scale);
  root.updateMatrixWorld(true);

  const scaled = new THREE.Box3().setFromObject(root);
  const center = scaled.getCenter(new THREE.Vector3());

  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y += -1.38 - scaled.min.y;
  root.updateMatrixWorld(true);
}

export function findMainModelFile(files) {
  const list = Array.from(files || []);

  return (
    list.find((file) => /\.glb$/i.test(file.name)) ||
    list.find((file) => /\.gltf$/i.test(file.name)) ||
    null
  );
}

export async function createCustomModel(
  THREE,
  files,
  options = {}
) {
  const list = Array.from(files || []);
  const main = findMainModelFile(list);

  if (!main) {
    throw new Error(
      'Selecciona un .glb o un .gltf junto con sus archivos asociados.'
    );
  }

  const manager = new THREE.LoadingManager();
  const urls = new Map();
  const objectUrls = [];

  list.forEach((file) => {
    const url = URL.createObjectURL(file);
    objectUrls.push(url);

    urls.set(file.name, url);
    urls.set(cleanName(file.name), url);
  });

  manager.setURLModifier((url) => {
    const clean = cleanName(url);
    return urls.get(url) || urls.get(clean) || url;
  });

  const loader = new GLTFLoader(manager);
  loader.setMeshoptDecoder(MeshoptDecoder);

  const mainUrl =
    urls.get(main.name) ||
    URL.createObjectURL(main);

  try {
    const gltf = await loadGltf(loader, mainUrl);
    const source = gltf.scene || gltf.scenes?.[0];

    if (!source) {
      throw new Error(
        'El modelo importado no contiene una escena utilizable.'
      );
    }

    const root = new THREE.Group();
    root.name = 'kaoru-custom-model';
    root.add(source);

    const studyMaterial = new THREE.MeshStandardMaterial({
      color: options.color || '#C98E78',
      roughness: 0.82,
      metalness: 0.0,
      side: THREE.DoubleSide
    });

    studyMaterial.userData.subjectColor = true;

    let meshCount = 0;
    let morphCount = 0;
    const morphNames = new Set();

    source.traverse((object) => {
      if (!object.isMesh) return;

      meshCount += 1;
      object.castShadow = true;
      object.receiveShadow = true;

      if (object.geometry) {
        object.geometry.computeVertexNormals?.();
        object.geometry.normalizeNormals?.();
      }

      object.material = studyMaterial;

      if (object.morphTargetDictionary) {
        Object.keys(object.morphTargetDictionary).forEach((name) => {
          morphNames.add(name);
        });
      }
    });

    morphCount = morphNames.size;

    fitObject(THREE, source, options.targetHeight || 5.3);

    return {
      root,
      materials: [studyMaterial],
      colorMaterials: [studyMaterial],
      bounds: new THREE.Box3().setFromObject(root),
      source: 'custom-local',
      morphCount,
      meshCount,
      fileName: main.name,
      setEdgesVisible() {}
    };
  } finally {
    objectUrls.forEach((url) => {
      try { URL.revokeObjectURL(url); } catch (_) {}
    });
  }
}