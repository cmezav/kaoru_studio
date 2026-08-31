import { applyLightingToPalette } from './lightingEngine.js';

export const LIGHT_LAB_PROJECT_SCHEMA = 'kaoru.light-lab.project';
export const LIGHT_LAB_PROJECT_VERSION = 7;

function clone(value) {
  if (value == null) return value;
  try { return structuredClone(value); }
  catch (_) { return JSON.parse(JSON.stringify(value)); }
}

function fileName(value, fallback = 'light-lab') {
  return String(value || fallback)
    .normalize('NFKD')
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90) || fallback;
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function fitText(ctx, value, maxWidth) {
  let text = String(value || '');
  if (ctx.measureText(text).width <= maxWidth) return text;
  while (text.length > 2 && ctx.measureText(`${text}\u2026`).width > maxWidth) {
    text = text.slice(0, -1);
  }
  return `${text}\u2026`;
}

export function buildExportEnvelope(state) {
  const timestamp = new Date().toISOString();
  return {
    schema: LIGHT_LAB_PROJECT_SCHEMA,
    version: LIGHT_LAB_PROJECT_VERSION,
    studio: 'light',
    phase: 7,
    exportedAt: timestamp,
    project: { ...state.project, updatedAt: timestamp },
    selection: clone(state.selection),
    description: state.description,
    interpretation: state.interpretation,
    params: clone(state.params),
    palette: clone(state.palette),
    illuminatedPalette: applyLightingToPalette(state.palette.entries, state.lighting),
    lighting: clone(state.lighting),
    reference: clone(state.reference),
    ui: clone(state.ui),
    compatibility: {
      minimumLightLabVersion: 4,
      currentLightLabVersion: 7,
      future3d: 'phase-8'
    }
  };
}

export function paletteForView(state, view = null) {
  const original = state.palette.entries || [];
  const mode = view || state.ui?.paletteView || 'illuminated';

  if (mode === 'original') return clone(original);

  if (mode === 'selected') {
    const selected = state.lighting?.lights?.find((light) => light.id === state.lighting?.selectedLightId);
    if (!selected) return applyLightingToPalette(original, state.lighting);
    return applyLightingToPalette(original, {
      ...state.lighting,
      lights: [selected]
    });
  }

  return applyLightingToPalette(original, state.lighting);
}

export function formattedHexText(entries, includeRoles = true) {
  return (entries || []).map((entry) =>
    includeRoles ? `${entry.role}: ${entry.hex}` : entry.hex
  ).join('\n');
}

export function csvText(entries) {
  const rows = [['role', 'hex']];
  (entries || []).forEach((entry) => rows.push([entry.role, entry.hex]));
  return rows.map((row) =>
    row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\r\n');
}

export async function copyPaletteHex(state, options = {}) {
  const entries = paletteForView(state, options.view);
  const text = formattedHexText(entries, options.includeRoles !== false);
  try {
    await navigator.clipboard.writeText(text);
  } catch (_) {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
  return text;
}

export function downloadCsv(state, options = {}) {
  const entries = paletteForView(state, options.view);
  const blob = new Blob([csvText(entries)], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `${fileName(state.project?.name, 'light-lab')}-palette.csv`);
}

export function downloadHexList(state, options = {}) {
  const entries = paletteForView(state, options.view);
  const blob = new Blob([formattedHexText(entries, true)], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `${fileName(state.project?.name, 'light-lab')}-hex.txt`);
}

export function downloadPortableProject(state) {
  const data = JSON.stringify(buildExportEnvelope(state), null, 2);
  const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
  downloadBlob(blob, `${fileName(state.project?.name, 'light-lab')}.lls.json`);
}

export function downloadProjectStructure(state) {
  downloadPortableProject(state);
}

export function renderPaletteExport(state, options = {}) {
  const entries = paletteForView(state, options.view);
  const includePreview = Boolean(options.includePreview);
  const includeHex = options.includeHex !== false;
  const includeNames = options.includeNames !== false;
  const previewCanvas = options.previewCanvas || null;
  const width = Math.max(1200, Number(options.width) || 1600);
  const swatchColumns = 4;
  const swatchGap = 18;
  const margin = 72;
  const headerHeight = 150;
  const previewHeight = includePreview ? 520 : 0;
  const rowHeight = 130;
  const rows = Math.ceil(entries.length / swatchColumns);
  const paletteHeight = rows * rowHeight + Math.max(0, rows - 1) * swatchGap;
  const height = headerHeight + previewHeight + paletteHeight + margin * 2 + (includePreview ? 30 : 0);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const dark = document.documentElement.dataset.theme === 'night';
  ctx.fillStyle = dark ? '#111016' : '#F5F2F7';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = dark ? '#F8F5FA' : '#211E26';
  ctx.font = '700 46px Inter, Segoe UI, sans-serif';
  ctx.fillText(state.project?.name || 'Light Lab Palette', margin, margin + 45);

  ctx.fillStyle = dark ? '#AAA3B3' : '#756D7B';
  ctx.font = '600 22px Inter, Segoe UI, sans-serif';
  const label = `${state.selection?.categoryId || 'palette'} / ${state.ui?.paletteView || 'illuminated'} / ${entries.length} colors`;
  ctx.fillText(label, margin, margin + 88);

  let y = margin + headerHeight;

  if (includePreview && previewCanvas && previewCanvas.width && previewCanvas.height) {
    const boxWidth = width - margin * 2;
    const boxHeight = previewHeight;
    const scale = Math.min(boxWidth / previewCanvas.width, boxHeight / previewCanvas.height);
    const drawWidth = previewCanvas.width * scale;
    const drawHeight = previewCanvas.height * scale;
    const x = margin + (boxWidth - drawWidth) / 2;
    const py = y + (boxHeight - drawHeight) / 2;
    ctx.fillStyle = dark ? '#1A171F' : '#FFFFFF';
    ctx.fillRect(margin, y, boxWidth, boxHeight);
    ctx.drawImage(previewCanvas, x, py, drawWidth, drawHeight);
    y += previewHeight + 30;
  }

  const available = width - margin * 2;
  const swatchWidth = (available - swatchGap * (swatchColumns - 1)) / swatchColumns;

  entries.forEach((entry, index) => {
    const col = index % swatchColumns;
    const row = Math.floor(index / swatchColumns);
    const x = margin + col * (swatchWidth + swatchGap);
    const sy = y + row * (rowHeight + swatchGap);

    ctx.fillStyle = entry.hex;
    ctx.fillRect(x, sy, swatchWidth, 76);

    ctx.fillStyle = dark ? '#1A171F' : '#FFFFFF';
    ctx.fillRect(x, sy + 76, swatchWidth, rowHeight - 76);

    if (includeNames) {
      ctx.fillStyle = dark ? '#F8F5FA' : '#211E26';
      ctx.font = '700 18px Inter, Segoe UI, sans-serif';
      ctx.fillText(fitText(ctx, entry.role, swatchWidth - 24), x + 12, sy + 101);
    }

    if (includeHex) {
      ctx.fillStyle = dark ? '#AAA3B3' : '#756D7B';
      ctx.font = '700 16px Consolas, monospace';
      ctx.fillText(entry.hex, x + 12, sy + 123);
    }
  });

  return canvas;
}

export function downloadPalettePng(state, options = {}) {
  const canvas = renderPaletteExport(state, options);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const suffix = options.includePreview ? 'palette-preview' : options.includeHex === false ? 'palette' : 'palette-hex';
    downloadBlob(blob, `${fileName(state.project?.name, 'light-lab')}-${suffix}.png`);
  }, 'image/png');
}