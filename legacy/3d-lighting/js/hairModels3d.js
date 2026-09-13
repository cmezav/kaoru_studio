import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

function loadWith(loader, url) {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}

function fitObjectToView(THREE, object, floorY = -1.05, targetHeight = 3.4) {
  object.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());

  if (size.y > 0) {
    object.scale.setScalar(targetHeight / size.y);
  }

  object.updateMatrixWorld(true);

  const scaled = new THREE.Box3().setFromObject(object);
  const center = scaled.getCenter(new THREE.Vector3());

  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y += floorY - scaled.min.y;
  object.updateMatrixWorld(true);
}

function recolorMaterial(THREE, sourceMaterial, color) {
  const material = sourceMaterial?.clone
    ? sourceMaterial.clone()
    : new THREE.MeshStandardMaterial();

  if (material.color?.set) {
    material.color.set(color);
  }

  if ('roughness' in material) material.roughness = Math.max(0.38, Number(material.roughness ?? 0.72));
  if ('metalness' in material) material.metalness = Math.min(0.12, Number(material.metalness ?? 0));
  material.side = THREE.DoubleSide;
  material.needsUpdate = true;
  material.userData = {
    ...(material.userData || {}),
    subjectColor: true,
    kaoruHairMaterial: true
  };

  return material;
}

function prepareHairMeshes(THREE, root, color) {
  const materials = [];

  root.traverse((object) => {
    if (!object.isMesh) return;

    object.castShadow = true;
    object.receiveShadow = true;

    if (Array.isArray(object.material)) {
      object.material = object.material.map((mat) => {
        const next = recolorMaterial(THREE, mat, color);
        materials.push(next);
        return next;
      });
    } else {
      const next = recolorMaterial(THREE, object.material, color);
      materials.push(next);
      object.material = next;
    }
  });

  return [...new Set(materials)];
}

export async function createHairModel(
  THREE,
  {
    url,
    format = 'glb',
    source = 'kaoru-hair',
    name = 'kaoru-hair',
    floorY = -1.05,
    targetHeight = 3.4
  },
  color = '#6B4436'
) {
  let loaded = null;

  if (format === 'fbx') {
    loaded = await loadWith(new FBXLoader(), url);
  } else {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);

    const gltf = await loadWith(loader, url);
    loaded = gltf.scene || gltf.scenes?.[0];
  }

  if (!loaded) {
    throw new Error('El modelo de cabello no contiene una escena utilizable.');
  }

  const root = new THREE.Group();
  root.name = name;
  root.add(loaded);

  const materials = prepareHairMeshes(THREE, loaded, color);

  fitObjectToView(
    THREE,
    loaded,
    Number(floorY),
    Number(targetHeight)
  );

  return {
    root,
    materials,
    colorMaterials: materials,
    bounds: new THREE.Box3().setFromObject(root),
    source,
    morphCount: 0,
    setEdgesVisible() {}
  };
}
