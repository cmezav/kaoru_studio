/* ============================================================
   LAYERSYSTEM.JS — Pila visual no destructiva de la Fase 8.
   El orden del array es de fondo a frente. Cada capa conserva
   visibilidad, opacidad y, al duplicarse, una copia independiente
   de la configuración del efecto.
   ============================================================ */

(function () {
  const FIXED = [
    ['extrude', 'Extrusión 3D', 'extrude'],
    ['shadow', 'Sombra', 'shadow'],
    ['glow', 'Glow exterior', 'glow'],
    ['fill', 'Relleno', null],
    ['innerShadow', 'Sombra interna', 'innerShadow'],
    ['innerGlow', 'Glow interior', 'innerGlow'],
    ['bevel', 'Bisel', 'bevel'],
  ];

  function uid() {
    return `ly_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value, (key, val) => key === 'image' ? undefined : val));
  }

  function snapshotFill(style) {
    const snapshot = clone({
      fillType: style.fillType,
      fillColor: style.fillColor,
      opacity: style.opacity,
      gradient: style.gradient,
      imageFill: style.imageFill,
    });
    if (style.imageFill?.images) {
      snapshot.imageFill.images.forEach((imageLayer, i) => {
        imageLayer.image = style.imageFill.images[i]?.image || null;
      });
    }
    return snapshot;
  }

  function loadFill(style, data) {
    style.fillType = data.fillType;
    style.fillColor = data.fillColor;
    style.opacity = data.opacity;
    style.gradient = data.gradient;
    style.imageFill = data.imageFill;
  }

  function initialize(block) {
    if (Array.isArray(block.layers) && block.layers.length) {
      relinkActive(block);
      syncStrokes(block);
      return block.layers;
    }
    block.layers = FIXED.map(([kind, name, styleKey]) => ({
      id: uid(), kind, name, visible: true, opacity: 1,
      data: kind === 'fill' ? snapshotFill(block.style) : block.style[styleKey],
      active: kind === 'fill' || kind === 'shadow',
    }));
    syncStrokes(block);
    block.activeLayerId = block.layers.find((l) => l.kind === 'fill').id;
    relinkActive(block);
    return block.layers;
  }

  function syncActiveFill(block) {
    const active = block.layers?.find((l) => l.kind === 'fill' && l.active);
    if (active) active.data = snapshotFill(block.style);
  }

  function syncStrokes(block) {
    if (!Array.isArray(block.layers)) return;
    const ids = new Set(block.style.strokes.map((s) => s.id));
    block.layers = block.layers.filter((l) => l.kind !== 'stroke' || ids.has(l.sourceId));
    for (const stroke of block.style.strokes) {
      if (!block.layers.some((l) => l.kind === 'stroke' && l.sourceId === stroke.id)) {
        const fillIndex = block.layers.findIndex((l) => l.kind === 'fill');
        const layer = { id: uid(), kind: 'stroke', sourceId: stroke.id, name: 'Contorno', visible: true, opacity: 1, data: stroke };
        block.layers.splice(Math.max(0, fillIndex), 0, layer);
      }
    }
  }

  function relinkActive(block) {
    if (!Array.isArray(block.layers)) return;
    for (const [, , styleKey] of FIXED) {
      if (!styleKey) continue;
      const selected = block.layers.find((l) => l.kind === styleKey && l.id === block.activeLayerId)
        || block.layers.find((l) => l.kind === styleKey && l.active)
        || block.layers.find((l) => l.kind === styleKey);
      if (selected?.data) block.style[styleKey] = selected.data;
    }
    const fill = block.layers.find((l) => l.kind === 'fill' && l.active) || block.layers.find((l) => l.kind === 'fill');
    if (fill?.data) {
      block.layers.filter((l) => l.kind === 'fill').forEach((l) => { l.active = l.id === fill.id; });
      loadFill(block.style, fill.data);
    }
  }

  function activate(block, id) {
    const layer = block.layers.find((l) => l.id === id);
    if (!layer) return null;
    syncActiveFill(block);
    block.activeLayerId = id;
    if (layer.kind === 'fill') {
      block.layers.filter((l) => l.kind === 'fill').forEach((l) => { l.active = l.id === id; });
      loadFill(block.style, layer.data);
    } else if (layer.kind !== 'stroke' && layer.data) {
      block.style[layer.kind] = layer.data;
    }
    return layer;
  }

  function duplicate(block, id) {
    syncActiveFill(block);
    const index = block.layers.findIndex((l) => l.id === id);
    if (index < 0) return null;
    const source = block.layers[index];
    if (source.kind === 'stroke') {
      const original = block.style.strokes.find((s) => s.id === source.sourceId);
      if (!original) return null;
      const copy = clone(original);
      copy.id = uid();
      block.style.strokes.push(copy);
      const layer = { ...clone(source), id: uid(), sourceId: copy.id, name: `${source.name} copia`, data: copy };
      block.layers.splice(index + 1, 0, layer);
      return layer;
    }
    const layer = { ...clone(source), id: uid(), name: `${source.name} copia`, active: false };
    if (source.kind === 'fill' && source.data?.imageFill?.images) {
      layer.data.imageFill.images.forEach((imageLayer, i) => {
        imageLayer.image = source.data.imageFill.images[i]?.image || null;
      });
    }
    block.layers.splice(index + 1, 0, layer);
    return layer;
  }

  function remove(block, id) {
    const layer = block.layers.find((l) => l.id === id);
    if (!layer) return;
    if (layer.kind === 'stroke') block.style.strokes = block.style.strokes.filter((s) => s.id !== layer.sourceId);
    block.layers = block.layers.filter((l) => l.id !== id);
    if (block.activeLayerId === id) {
      const fallback = block.layers.find((l) => l.kind === layer.kind) || block.layers.find((l) => l.kind === 'fill') || block.layers[0];
      block.activeLayerId = fallback?.id || null;
      if (fallback) activate(block, fallback.id);
    }
  }

  function move(block, id, delta) {
    const index = block.layers.findIndex((l) => l.id === id);
    const next = Math.max(0, Math.min(block.layers.length - 1, index + delta));
    if (index < 0 || index === next) return;
    const [layer] = block.layers.splice(index, 1);
    block.layers.splice(next, 0, layer);
  }

  function restoreMissing(block) {
    syncActiveFill(block);
    for (const [kind, name, styleKey] of FIXED) {
      if (block.layers.some((l) => l.kind === kind)) continue;
      const data = kind === 'fill' ? snapshotFill(block.style) : clone(block.style[styleKey]);
      block.layers.push({ id: uid(), kind, name, visible: true, opacity: 1, data, active: false });
    }
    syncStrokes(block);
    if (!block.layers.some((l) => l.kind === 'fill' && l.active)) {
      const fill = block.layers.find((l) => l.kind === 'fill');
      if (fill) {
        fill.active = true;
        block.activeLayerId = fill.id;
        loadFill(block.style, fill.data);
      }
    }
  }

  window.LayerSystem = { initialize, syncActiveFill, syncStrokes, relinkActive, activate, duplicate, remove, move, restoreMissing, snapshotFill, clone };
})();
