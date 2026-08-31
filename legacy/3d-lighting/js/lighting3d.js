import { TransformControls } from 'three/addons/controls/TransformControls.js';

export const LIGHTING3D_PHASE = 5;
export const MAX_3D_LIGHTS = 8;

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, Number(value) || 0));

function uid(prefix = 'light') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createDefault3dLight(index = 0, overrides = {}) {
  const presets = [
    {
      name: 'Luz principal',
      color: '#FFE0CC',
      intensity: 82,
      azimuth: 42,
      elevation: 48,
      distance: 5.2,
      softness: 45
    },
    {
      name: 'Relleno',
      color: '#7898FF',
      intensity: 28,
      azimuth: -58,
      elevation: 18,
      distance: 5.6,
      softness: 72
    },
    {
      name: 'Luz 3',
      color: '#FFFFFF',
      intensity: 45,
      azimuth: 125,
      elevation: 34,
      distance: 5.0,
      softness: 55
    }
  ];

  const preset = presets[index] || {
    name: `Luz ${index + 1}`,
    color: '#FFFFFF',
    intensity: 45,
    azimuth: (index * 57) % 180,
    elevation: 30,
    distance: 5,
    softness: 55
  };

  return {
    id: overrides.id || uid('light'),
    name: overrides.name || preset.name,
    color: String(overrides.color || preset.color).toUpperCase(),
    intensity: clamp(overrides.intensity ?? preset.intensity, 0, 200),
    azimuth: clamp(overrides.azimuth ?? preset.azimuth, -180, 180),
    elevation: clamp(overrides.elevation ?? preset.elevation, -85, 85),
    distance: clamp(overrides.distance ?? preset.distance, 1.5, 12),
    softness: clamp(overrides.softness ?? preset.softness, 0, 100),
    enabled: overrides.enabled !== false
  };
}

export function duplicate3dLight(light, index = 0) {
  return createDefault3dLight(index, {
    ...light,
    id: uid('light'),
    name: `${light.name || 'Luz'} copia`,
    azimuth: clamp((Number(light.azimuth) || 0) + 18, -180, 180)
  });
}

export function normalizeLightingState(lighting = {}) {
  const incoming = Array.isArray(lighting.lights) ? lighting.lights : [];
  const lights = incoming.slice(0, MAX_3D_LIGHTS).map((light, index) =>
    createDefault3dLight(index, light)
  );

  if (!lights.length) {
    lights.push(
      createDefault3dLight(0, { id: 'key' }),
      createDefault3dLight(1, { id: 'fill' })
    );
  }

  const selectedLightId = lights.some(
    (light) => light.id === lighting.selectedLightId
  )
    ? lighting.selectedLightId
    : lights[0].id;

  return {
    enabled: lighting.enabled !== false,
    showHelpers: lighting.showHelpers !== false,
    selectedLightId,
    ambient: {
      color: String(lighting.ambient?.color || '#D8DEFF').toUpperCase(),
      intensity: clamp(lighting.ambient?.intensity ?? 18, 0, 100)
    },
    shadow: {
      color: String(lighting.shadow?.color || '#3A2945').toUpperCase(),
      intensity: clamp(lighting.shadow?.intensity ?? 16, 0, 100)
    },
    bounce: {
      color: String(lighting.bounce?.color || '#7898FF').toUpperCase(),
      intensity: clamp(lighting.bounce?.intensity ?? 12, 0, 100)
    },
    rim: {
      color: String(lighting.rim?.color || '#B994FF').toUpperCase(),
      intensity: clamp(lighting.rim?.intensity ?? 14, 0, 100)
    },
    lights
  };
}

export function sphericalToPosition(THREE, config, target) {
  const azimuth = THREE.MathUtils.degToRad(Number(config.azimuth) || 0);
  const elevation = THREE.MathUtils.degToRad(Number(config.elevation) || 0);
  const distance = clamp(config.distance, 1.5, 12);

  const horizontal = Math.cos(elevation) * distance;

  return new THREE.Vector3(
    target.x + Math.sin(azimuth) * horizontal,
    target.y + Math.sin(elevation) * distance,
    target.z + Math.cos(azimuth) * horizontal
  );
}

export function positionToSpherical(THREE, position, target) {
  const delta = position.clone().sub(target);
  const distance = Math.max(1.5, delta.length());
  const elevation = THREE.MathUtils.radToDeg(
    Math.asin(clamp(delta.y / distance, -1, 1))
  );
  const azimuth = THREE.MathUtils.radToDeg(
    Math.atan2(delta.x, delta.z)
  );

  return {
    azimuth: Math.round(azimuth * 10) / 10,
    elevation: Math.round(elevation * 10) / 10,
    distance: Math.round(distance * 100) / 100
  };
}

export function createLightingRig(options) {
  const {
    THREE,
    scene,
    camera,
    renderer,
    orbitControls
  } = options;

  let onTransform = typeof options.onTransform === 'function'
    ? options.onTransform
    : null;

  const root = new THREE.Group();
  root.name = 'kaoru-lighting-rig';
  scene.add(root);

  const ambient = new THREE.AmbientLight(0xd8deff, 0.25);
  scene.add(ambient);

  const shadowTint = new THREE.HemisphereLight(0x000000, 0x3a2945, 0.20);
  scene.add(shadowTint);

  const bounceTarget = new THREE.Object3D();
  const bounce = new THREE.DirectionalLight(0x7898ff, 0.35);
  bounce.position.set(-3.5, -1.0, 2.5);
  bounce.target = bounceTarget;
  scene.add(bounce, bounceTarget);

  const rimTarget = new THREE.Object3D();
  const rim = new THREE.DirectionalLight(0xb994ff, 0.42);
  rim.position.set(-3.5, 4.2, -4.6);
  rim.target = rimTarget;
  scene.add(rim, rimTarget);

  const entries = new Map();
  const markerGeometry = new THREE.SphereGeometry(0.115, 18, 12);
  const target = new THREE.Vector3(0, 0.8, 0);
  let currentState = normalizeLightingState({});
  let selectedLightId = currentState.selectedLightId;
  let showHelpers = true;
  let shadowsEnabled = true;
  let syncingTransform = false;

  const transform = new TransformControls(camera, renderer.domElement);
  transform.setMode('translate');
  transform.setSize(0.72);

  const transformHelper = typeof transform.getHelper === 'function'
    ? transform.getHelper()
    : transform;

  scene.add(transformHelper);

  transform.addEventListener('dragging-changed', (event) => {
    orbitControls.enabled = !event.value;
  });

  transform.addEventListener('objectChange', () => {
    if (syncingTransform) return;

    const selected = entries.get(selectedLightId);
    if (!selected || transform.object !== selected.marker) return;

    const patch = positionToSpherical(
      THREE,
      selected.marker.position,
      target
    );

    selected.light.position.copy(selected.marker.position);
    updateLine(selected);

    if (onTransform) {
      onTransform(selectedLightId, patch);
    }
  });

  function createEntry(config) {
    const light = new THREE.SpotLight(config.color, 1);
    light.name = `kaoru-direct-${config.id}`;
    light.angle = Math.PI * 0.34;
    light.decay = 0;
    light.castShadow = true;
    light.shadow.mapSize.set(512, 512);
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 40;
    light.shadow.bias = -0.00035;
    light.shadow.normalBias = 0.025;
    light.shadow.blurSamples = 8;

    const lightTarget = new THREE.Object3D();
    lightTarget.name = `kaoru-target-${config.id}`;
    light.target = lightTarget;

    const markerMaterial = new THREE.MeshBasicMaterial({
      color: config.color,
      depthTest: false,
      transparent: true,
      opacity: 0.96
    });

    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.name = `kaoru-light-marker-${config.id}`;
    marker.userData.lightId = config.id;
    marker.renderOrder = 20;

    const lineMaterial = new THREE.LineBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: 0.42,
      depthTest: false
    });

    const lineGeometry = new THREE.BufferGeometry();
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.name = `kaoru-light-ray-${config.id}`;
    line.renderOrder = 19;

    root.add(light, lightTarget, marker, line);

    const entry = {
      id: config.id,
      light,
      target: lightTarget,
      marker,
      markerMaterial,
      line,
      lineMaterial,
      lineGeometry
    };

    entries.set(config.id, entry);
    return entry;
  }

  function disposeEntry(entry) {
    if (transform.object === entry.marker) {
      transform.detach();
    }

    root.remove(
      entry.light,
      entry.target,
      entry.marker,
      entry.line
    );

    entry.markerMaterial.dispose();
    entry.lineMaterial.dispose();
    entry.lineGeometry.dispose();
    entry.light.dispose?.();

    entries.delete(entry.id);
  }

  function updateLine(entry) {
    entry.lineGeometry.setFromPoints([
      entry.marker.position,
      target
    ]);
  }

  function updateEntry(entry, config, index) {
    entry.light.color.set(config.color);
    entry.markerMaterial.color.set(config.color);
    entry.lineMaterial.color.set(config.color);

    entry.light.intensity = config.enabled && currentState.enabled
      ? (Number(config.intensity) || 0) * 0.065
      : 0;

    entry.light.penumbra = clamp(config.softness, 0, 100) / 100;
    entry.light.shadow.radius = 1 + clamp(config.softness, 0, 100) * 0.055;
    entry.light.castShadow = Boolean(
      shadowsEnabled &&
      currentState.enabled &&
      config.enabled &&
      index < 4
    );

    const position = sphericalToPosition(THREE, config, target);

    if (!(transform.object === entry.marker && transform.dragging)) {
      entry.marker.position.copy(position);
    }

    entry.light.position.copy(entry.marker.position);
    entry.target.position.copy(target);

    entry.marker.visible = Boolean(
      showHelpers &&
      currentState.enabled &&
      config.enabled
    );
    entry.line.visible = entry.marker.visible;

    const selected = config.id === selectedLightId;
    entry.marker.scale.setScalar(selected ? 1.42 : 1);
    entry.markerMaterial.opacity = selected ? 1 : 0.72;

    updateLine(entry);
  }

  function applyEnvironment(state) {
    const active = state.enabled;

    ambient.color.set(state.ambient.color);
    ambient.intensity = active
      ? (state.ambient.intensity / 100) * 1.35
      : 0;

    shadowTint.groundColor.set(state.shadow.color);
    shadowTint.intensity = active
      ? (state.shadow.intensity / 100) * 1.25
      : 0;

    bounce.color.set(state.bounce.color);
    bounce.intensity = active
      ? (state.bounce.intensity / 100) * 2.1
      : 0;

    rim.color.set(state.rim.color);
    rim.intensity = active
      ? (state.rim.intensity / 100) * 2.4
      : 0;

    bounceTarget.position.copy(target);
    rimTarget.position.copy(target);

    bounce.position.set(
      target.x - 3.8,
      target.y - 1.7,
      target.z + 2.6
    );

    rim.position.set(
      target.x - 3.6,
      target.y + 3.8,
      target.z - 4.6
    );
  }

  function syncTransform() {
    const entry = entries.get(selectedLightId);

    if (!entry || !showHelpers || !entry.marker.visible) {
      transform.detach();
      transformHelper.visible = false;
      return;
    }

    syncingTransform = true;
    try {
      transform.attach(entry.marker);
      transformHelper.visible = true;
    } finally {
      syncingTransform = false;
    }
  }

  function applyState(value) {
    currentState = normalizeLightingState(value);
    selectedLightId = currentState.selectedLightId;
    showHelpers = currentState.showHelpers;

    const ids = new Set(currentState.lights.map((light) => light.id));

    [...entries.values()].forEach((entry) => {
      if (!ids.has(entry.id)) disposeEntry(entry);
    });

    currentState.lights.forEach((config, index) => {
      const entry = entries.get(config.id) || createEntry(config);
      updateEntry(entry, config, index);
    });

    applyEnvironment(currentState);
    syncTransform();
  }

  function setTarget(value) {
    target.set(
      Number(value?.[0] ?? value?.x ?? 0),
      Number(value?.[1] ?? value?.y ?? 0.8),
      Number(value?.[2] ?? value?.z ?? 0)
    );

    applyState(currentState);
  }

  function setSelected(id) {
    selectedLightId = id;
    currentState = {
      ...currentState,
      selectedLightId: id
    };
    applyState(currentState);
  }

  function setShowHelpers(value) {
    showHelpers = Boolean(value);
    currentState = {
      ...currentState,
      showHelpers
    };
    applyState(currentState);
  }

  function setShadowsEnabled(value) {
    shadowsEnabled = Boolean(value);
    applyState(currentState);
  }

  function setOnTransform(callback) {
    onTransform = typeof callback === 'function' ? callback : null;
  }

  function pickLight(clientX, clientY, rect) {
    if (!showHelpers || !rect?.width || !rect?.height) return null;

    const pointer = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera);

    const markers = [...entries.values()]
      .map((entry) => entry.marker)
      .filter((marker) => marker.visible);

    const hit = raycaster.intersectObjects(markers, false)[0];
    return hit?.object?.userData?.lightId || null;
  }

  function dispose() {
    transform.detach();
    transform.dispose();
    scene.remove(transformHelper);
    scene.remove(ambient, shadowTint, bounce, bounceTarget, rim, rimTarget);

    [...entries.values()].forEach(disposeEntry);
    markerGeometry.dispose();
  }

  applyState(currentState);

  return {
    applyState,
    setTarget,
    setSelected,
    setShowHelpers,
    setShadowsEnabled,
    setOnTransform,
    pickLight,
    dispose
  };
}