export const ASARO_HEAD_VERSION = 1;

function geometryFromPolygon(THREE, vertices) {
  const positions = [];
  for (let i = 1; i < vertices.length - 1; i += 1) {
    positions.push(
      ...vertices[0],
      ...vertices[i],
      ...vertices[i + 1]
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.computeVertexNormals();
  return geometry;
}

function mirrorVertices(vertices) {
  return vertices
    .map(([x, y, z]) => [-x, y, z])
    .reverse();
}

export function createAsaroHead(THREE, options = {}) {
  const color = options.color || '#C98E78';

  const root = new THREE.Group();
  root.name = 'kaoru-asaro-original';

  const faceRoot = new THREE.Group();
  faceRoot.name = 'asaro-facial-planes';
  root.add(faceRoot);

  const edgeRoot = new THREE.Group();
  edgeRoot.name = 'asaro-plane-edges';
  root.add(edgeRoot);

  const colorMaterial = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.77,
    metalness: 0.0,
    flatShading: true,
    side: THREE.DoubleSide
  });
  colorMaterial.userData.subjectColor = true;

  const skullMaterial = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.80,
    metalness: 0.0,
    flatShading: true
  });
  skullMaterial.userData.subjectColor = true;

  const edgeMaterial = new THREE.LineBasicMaterial({
    color: 0x2b2027,
    transparent: true,
    opacity: 0.42,
    depthTest: true
  });

  let planeCount = 0;

  function addPlane(name, vertices) {
    const geometry = geometryFromPolygon(THREE, vertices);
    const mesh = new THREE.Mesh(geometry, colorMaterial);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.asaroPlane = true;
    faceRoot.add(mesh);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 1),
      edgeMaterial
    );
    edges.name = `${name}-edge`;
    edgeRoot.add(edges);

    planeCount += 1;
    return mesh;
  }

  function addPair(name, rightVertices) {
    addPlane(`${name}-R`, rightVertices);
    addPlane(`${name}-L`, mirrorVertices(rightVertices));
  }

  const pairPlanes = [
    ['forehead-inner', [
      [0.00, 2.16, 0.50],
      [0.00, 1.49, 0.80],
      [0.38, 1.49, 0.76],
      [0.49, 2.08, 0.47]
    ]],
    ['forehead-outer', [
      [0.49, 2.08, 0.47],
      [0.38, 1.49, 0.76],
      [0.72, 1.44, 0.56],
      [0.75, 1.94, 0.25]
    ]],
    ['temple-upper', [
      [0.75, 1.94, 0.25],
      [0.72, 1.44, 0.56],
      [0.82, 1.22, 0.38],
      [0.82, 1.66, 0.04]
    ]],
    ['temple-lower', [
      [0.72, 1.44, 0.56],
      [0.60, 1.25, 0.84],
      [0.57, 0.93, 0.64],
      [0.82, 1.22, 0.38]
    ]],
    ['brow-inner', [
      [0.00, 1.49, 0.80],
      [0.00, 1.32, 0.96],
      [0.28, 1.29, 0.96],
      [0.38, 1.49, 0.76]
    ]],
    ['brow-outer', [
      [0.38, 1.49, 0.76],
      [0.28, 1.29, 0.96],
      [0.60, 1.25, 0.84],
      [0.72, 1.44, 0.56]
    ]],
    ['orbital-upper', [
      [0.28, 1.29, 0.96],
      [0.20, 1.10, 0.75],
      [0.54, 1.08, 0.66],
      [0.60, 1.25, 0.84]
    ]],
    ['orbital-lower', [
      [0.20, 1.10, 0.75],
      [0.28, 0.91, 0.80],
      [0.56, 0.92, 0.63],
      [0.54, 1.08, 0.66]
    ]],
    ['nose-bridge-upper', [
      [0.00, 1.32, 0.96],
      [0.00, 0.92, 1.10],
      [0.13, 0.94, 1.05],
      [0.28, 1.29, 0.96]
    ]],
    ['nose-bridge-lower', [
      [0.00, 0.92, 1.10],
      [0.00, 0.58, 1.23],
      [0.15, 0.62, 1.17],
      [0.13, 0.94, 1.05]
    ]],
    ['nose-side', [
      [0.13, 0.94, 1.05],
      [0.15, 0.62, 1.17],
      [0.34, 0.58, 1.02],
      [0.28, 0.91, 0.80]
    ]],
    ['nose-wing', [
      [0.15, 0.62, 1.17],
      [0.18, 0.42, 1.20],
      [0.34, 0.43, 1.08],
      [0.34, 0.58, 1.02]
    ]],
    ['cheek-upper', [
      [0.28, 0.91, 0.80],
      [0.34, 0.58, 1.02],
      [0.66, 0.66, 0.83],
      [0.56, 0.92, 0.63]
    ]],
    ['cheek-outer', [
      [0.56, 0.92, 0.63],
      [0.66, 0.66, 0.83],
      [0.82, 0.56, 0.48],
      [0.84, 0.92, 0.30]
    ]],
    ['cheek-middle', [
      [0.34, 0.58, 1.02],
      [0.38, 0.28, 0.92],
      [0.66, 0.25, 0.72],
      [0.66, 0.66, 0.83]
    ]],
    ['cheek-lower', [
      [0.66, 0.66, 0.83],
      [0.66, 0.25, 0.72],
      [0.70, -0.08, 0.52],
      [0.82, 0.56, 0.48]
    ]],
    ['muzzle-upper', [
      [0.18, 0.42, 1.20],
      [0.18, 0.30, 1.08],
      [0.38, 0.10, 0.91],
      [0.34, 0.43, 1.08]
    ]],
    ['philtrum', [
      [0.00, 0.28, 1.09],
      [0.00, 0.08, 1.00],
      [0.15, 0.08, 1.02],
      [0.18, 0.30, 1.08]
    ]],
    ['upper-lip', [
      [0.00, 0.08, 1.00],
      [0.00, -0.02, 1.01],
      [0.35, -0.01, 0.92],
      [0.38, 0.10, 0.91]
    ]],
    ['lower-lip', [
      [0.00, -0.02, 1.01],
      [0.00, -0.16, 0.92],
      [0.34, -0.14, 0.87],
      [0.35, -0.01, 0.92]
    ]],
    ['maxilla', [
      [0.38, 0.10, 0.91],
      [0.34, -0.14, 0.87],
      [0.70, -0.08, 0.52],
      [0.66, 0.25, 0.72]
    ]],
    ['chin', [
      [0.00, -0.16, 0.92],
      [0.00, -0.45, 0.72],
      [0.36, -0.39, 0.68],
      [0.34, -0.14, 0.87]
    ]],
    ['jaw-front', [
      [0.34, -0.14, 0.87],
      [0.36, -0.39, 0.68],
      [0.62, -0.46, 0.42],
      [0.70, -0.08, 0.52]
    ]],
    ['jaw-side', [
      [0.70, -0.08, 0.52],
      [0.62, -0.46, 0.42],
      [0.74, -0.33, 0.10],
      [0.82, 0.56, 0.48]
    ]],
    ['jaw-under', [
      [0.36, -0.39, 0.68],
      [0.49, -0.63, 0.30],
      [0.72, -0.55, 0.02],
      [0.62, -0.46, 0.42]
    ]]
  ];

  pairPlanes.forEach(([name, vertices]) => addPair(name, vertices));

  addPlane('nose-tip', [
    [-0.18, 0.42, 1.20],
    [0.00, 0.32, 1.30],
    [0.18, 0.42, 1.20],
    [0.00, 0.58, 1.23]
  ]);

  addPlane('nose-under', [
    [-0.18, 0.42, 1.20],
    [-0.22, 0.29, 1.08],
    [0.22, 0.29, 1.08],
    [0.18, 0.42, 1.20],
    [0.00, 0.32, 1.30]
  ]);

  const skullGeometry = new THREE.SphereGeometry(
    1,
    12,
    7,
    0,
    Math.PI * 2,
    0.12,
    Math.PI - 0.16
  );
  skullGeometry.scale(0.88, 1.30, 0.62);

  const skull = new THREE.Mesh(skullGeometry, skullMaterial);
  skull.name = 'asaro-cranium';
  skull.position.set(0, 0.95, -0.16);
  skull.castShadow = true;
  skull.receiveShadow = true;
  root.add(skull);

  const neckGeometry = new THREE.CylinderGeometry(
    0.46,
    0.58,
    1.12,
    10,
    1,
    false
  );
  const neck = new THREE.Mesh(neckGeometry, skullMaterial);
  neck.name = 'asaro-neck';
  neck.position.set(0, -0.89, -0.05);
  neck.scale.z = 0.78;
  neck.castShadow = true;
  neck.receiveShadow = true;
  root.add(neck);

  const creaseMaterial = new THREE.LineBasicMaterial({
    color: 0x241a20,
    transparent: true,
    opacity: 0.30
  });

  const creasePoints = [
    [-0.39, 1.28, 0.94], [0.00, 1.31, 0.97], [0.39, 1.28, 0.94],
    [-0.35, 0.08, 0.93], [0.00, 0.07, 1.01], [0.35, 0.08, 0.93]
  ];

  const creaseGeometry = new THREE.BufferGeometry().setFromPoints(
    creasePoints.map((point) => new THREE.Vector3(...point))
  );
  const crease = new THREE.Line(creaseGeometry, creaseMaterial);
  crease.name = 'asaro-feature-creases';
  edgeRoot.add(crease);

  edgeRoot.renderOrder = 3;

  root.userData.asaroModel = true;
  root.userData.planeCount = planeCount;
  root.userData.edgeRoot = edgeRoot;

  return {
    root,
    planeCount,
    edgeRoot,
    materials: [
      colorMaterial,
      skullMaterial,
      edgeMaterial,
      creaseMaterial
    ],
    colorMaterials: [
      colorMaterial,
      skullMaterial
    ],
    setEdgesVisible(visible) {
      edgeRoot.visible = Boolean(visible);
    }
  };
}