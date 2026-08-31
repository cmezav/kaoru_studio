import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

function loadWith(loader, url) {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}

function fitObjectToView(
  THREE,
  object,
  floorY,
  targetHeight
) {
  object.updateMatrixWorld(true);

  const box =
    new THREE.Box3().setFromObject(object);

  const size =
    box.getSize(new THREE.Vector3());

  const scale =
    size.y > 0
      ? targetHeight / size.y
      : 1;

  object.scale.setScalar(scale);
  object.updateMatrixWorld(true);

  const scaled =
    new THREE.Box3().setFromObject(object);

  const center =
    scaled.getCenter(
      new THREE.Vector3()
    );

  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y +=
    floorY - scaled.min.y;

  object.updateMatrixWorld(true);
}

function createSubjectMaterial(
  THREE,
  color,
  roughness
) {
  const material =
    new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness: 0,
      side: THREE.DoubleSide
    });

  material.userData.subjectColor = true;

  return material;
}

function prepareMeshes(
  root,
  material
) {
  root.traverse((object) => {
    if (!object.isMesh) return;

    object.castShadow = true;
    object.receiveShadow = true;
    object.material = material;
  });
}

export function createCubeModel(
  THREE,
  color = '#C98E78'
) {
  const root = new THREE.Group();
  root.name = 'kaoru-study-cube';

  const material =
    createSubjectMaterial(
      THREE,
      color,
      0.76
    );

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(
      2.35,
      2.35,
      2.35
    ),
    material
  );

  mesh.castShadow = true;
  mesh.receiveShadow = true;
  root.add(mesh);

  fitObjectToView(
    THREE,
    root,
    -1.05,
    3.1
  );

  return {
    root,
    materials: [material],
    colorMaterials: [material],
    bounds:
      new THREE.Box3()
        .setFromObject(root),
    source: 'native-cube',
    morphCount: 0,
    setEdgesVisible() {}
  };
}

export async function createExternalSubject(
  THREE,
  config,
  color = '#C98E78'
) {
  let source = null;

  if (config.format === 'glb') {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(
      MeshoptDecoder
    );

    const gltf =
      await loadWith(
        loader,
        config.url
      );

    source =
      gltf.scene ||
      gltf.scenes?.[0];
  } else if (
    config.format === 'obj'
  ) {
    source =
      await loadWith(
        new OBJLoader(),
        config.url
      );
  } else if (
    config.format === 'fbx'
  ) {
    source =
      await loadWith(
        new FBXLoader(),
        config.url
      );
  } else {
    throw new Error(
      'Formato de modelo extra no soportado.'
    );
  }

  if (!source) {
    throw new Error(
      'El modelo extra no contiene una malla utilizable.'
    );
  }

  const root = new THREE.Group();
  root.name =
    config.name ||
    'kaoru-extra-model';

  root.add(source);

  const material =
    createSubjectMaterial(
      THREE,
      color,
      Number(
        config.roughness || 0.84
      )
    );

  prepareMeshes(
    source,
    material
  );

  fitObjectToView(
    THREE,
    source,
    Number(config.floorY),
    Number(config.targetHeight)
  );

  return {
    root,
    materials: [material],
    colorMaterials: [material],
    bounds:
      new THREE.Box3()
        .setFromObject(root),
    source: config.source,
    morphCount: 0,
    setEdgesVisible() {}
  };
}