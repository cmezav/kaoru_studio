/* ============================================================
   MAIN.JS — UI glue del Text Effects Studio (Fases 1 a 9).
   No contiene lógica de parsing de fuentes ni de layout: solo
   conecta los módulos (FontLibrary, TextEngine, FillSystem,
   CurveSystem, DeformSystem, Renderer) con los controles visibles
   en pantalla.
   ============================================================ */

const els = {
  fontDrop: document.getElementById('fontDrop'),
  fontInput: document.getElementById('fontInput'),
  fontList: document.getElementById('fontList'),
  fontImportStatus: document.getElementById('fontImportStatus'),

  textArea: document.getElementById('textContent'),
  fontSelect: document.getElementById('fontSelect'),
  sizeRange: document.getElementById('sizeRange'),
  sizeValue: document.getElementById('sizeValue'),
  trackingRange: document.getElementById('trackingRange'),
  trackingValue: document.getElementById('trackingValue'),
  leadingRange: document.getElementById('leadingRange'),
  leadingValue: document.getElementById('leadingValue'),
  alignButtons: document.querySelectorAll('[data-align]'),
  caseButtons: document.querySelectorAll('[data-case]'),

  fillTabs: document.querySelectorAll('.color-fill-tab'),
  fillPanelSolid: document.getElementById('fillPanelSolid'),
  fillPanelGradient: document.getElementById('fillPanelGradient'),
  fillPanelImage: document.getElementById('fillPanelImage'),
  fillColor: document.getElementById('fillColor'),
  eyedropperSolid: document.getElementById('eyedropperSolid'),
  opacityRange: document.getElementById('opacityRange'),
  opacityValue: document.getElementById('opacityValue'),

  gradientPreview: document.getElementById('gradientPreview'),
  gradientTrack: document.getElementById('gradientTrack'),
  gradientAngle: document.getElementById('gradientAngle'),
  gradientAngleValue: document.getElementById('gradientAngleValue'),
  addStopBtn: document.getElementById('addStopBtn'),
  removeStopBtn: document.getElementById('removeStopBtn'),
  stopColor: document.getElementById('stopColor'),
  eyedropperStop: document.getElementById('eyedropperStop'),
  stopAlpha: document.getElementById('stopAlpha'),
  stopAlphaValue: document.getElementById('stopAlphaValue'),
  gradientPresets: document.getElementById('gradientPresets'),

  imageFillDrop: document.getElementById('imageFillDrop'),
  imageFillInput: document.getElementById('imageFillInput'),
  imageFillList: document.getElementById('imageFillList'),
  imageFillControls: document.getElementById('imageFillControls'),
  imgX: document.getElementById('imgX'),
  imgY: document.getElementById('imgY'),
  imgScale: document.getElementById('imgScale'),
  imgRotation: document.getElementById('imgRotation'),
  imgOpacity: document.getElementById('imgOpacity'),
  imgOpacityValue: document.getElementById('imgOpacityValue'),

  strokeList: document.getElementById('strokeList'),
  addStrokeBtn: document.getElementById('addStrokeBtn'),

  shadowEnabled: document.getElementById('shadowEnabled'),
  shadowControls: document.getElementById('shadowControls'),
  shadowX: document.getElementById('shadowX'), shadowXValue: document.getElementById('shadowXValue'),
  shadowY: document.getElementById('shadowY'), shadowYValue: document.getElementById('shadowYValue'),
  shadowBlur: document.getElementById('shadowBlur'), shadowBlurValue: document.getElementById('shadowBlurValue'),
  shadowSpread: document.getElementById('shadowSpread'), shadowSpreadValue: document.getElementById('shadowSpreadValue'),
  shadowOpacity: document.getElementById('shadowOpacity'), shadowOpacityValue: document.getElementById('shadowOpacityValue'),
  shadowFillTabs: document.querySelectorAll('[data-shadowfill]'),
  shadowSolidControls: document.getElementById('shadowSolidControls'),
  shadowGradientControls: document.getElementById('shadowGradientControls'),
  shadowColor: document.getElementById('shadowColor'),
  shadowGradTypeTabs: document.querySelectorAll('[data-gradtype]'),
  shadowGradientEditor: document.getElementById('shadowGradientEditor'),

  innerShadowEnabled: document.getElementById('innerShadowEnabled'),
  innerShadowControls: document.getElementById('innerShadowControls'),
  innerDepth: document.getElementById('innerDepth'), innerDepthValue: document.getElementById('innerDepthValue'),
  innerBlur: document.getElementById('innerBlur'), innerBlurValue: document.getElementById('innerBlurValue'),
  innerX: document.getElementById('innerX'), innerXValue: document.getElementById('innerXValue'),
  innerY: document.getElementById('innerY'), innerYValue: document.getElementById('innerYValue'),
  innerColor: document.getElementById('innerColor'),
  innerOpacity: document.getElementById('innerOpacity'),

  glowEnabled: document.getElementById('glowEnabled'),
  glowControls: document.getElementById('glowControls'),
  glowColor: document.getElementById('glowColor'),
  glowOpacity: document.getElementById('glowOpacity'),
  glowBlur: document.getElementById('glowBlur'), glowBlurValue: document.getElementById('glowBlurValue'),
  glowIntensity: document.getElementById('glowIntensity'), glowIntensityValue: document.getElementById('glowIntensityValue'),

  innerGlowEnabled: document.getElementById('innerGlowEnabled'),
  innerGlowControls: document.getElementById('innerGlowControls'),
  innerGlowColor: document.getElementById('innerGlowColor'),
  innerGlowOpacity: document.getElementById('innerGlowOpacity'),
  innerGlowBlur: document.getElementById('innerGlowBlur'), innerGlowBlurValue: document.getElementById('innerGlowBlurValue'),

  bevelEnabled: document.getElementById('bevelEnabled'),
  bevelControls: document.getElementById('bevelControls'),
  bevelAngle: document.getElementById('bevelAngle'), bevelAngleValue: document.getElementById('bevelAngleValue'),
  bevelSize: document.getElementById('bevelSize'), bevelSizeValue: document.getElementById('bevelSizeValue'),
  bevelSoftness: document.getElementById('bevelSoftness'), bevelSoftnessValue: document.getElementById('bevelSoftnessValue'),
  bevelStrength: document.getElementById('bevelStrength'), bevelStrengthValue: document.getElementById('bevelStrengthValue'),
  bevelHighlightColor: document.getElementById('bevelHighlightColor'),
  bevelShadowColor: document.getElementById('bevelShadowColor'),

  extrudeEnabled: document.getElementById('extrudeEnabled'),
  extrudeControls: document.getElementById('extrudeControls'),
  extrudeDepth: document.getElementById('extrudeDepth'), extrudeDepthValue: document.getElementById('extrudeDepthValue'),
  extrudeAngle: document.getElementById('extrudeAngle'), extrudeAngleValue: document.getElementById('extrudeAngleValue'),
  extrudeStep: document.getElementById('extrudeStep'), extrudeStepValue: document.getElementById('extrudeStepValue'),
  extrudeFillTabs: document.querySelectorAll('[data-extrudefill]'),
  extrudeSolidControls: document.getElementById('extrudeSolidControls'),
  extrudeGradientControls: document.getElementById('extrudeGradientControls'),
  extrudeColor: document.getElementById('extrudeColor'),
  extrudeColorNear: document.getElementById('extrudeColorNear'),
  extrudeColorFar: document.getElementById('extrudeColorFar'),
  extrudeEdgeEnabled: document.getElementById('extrudeEdgeEnabled'),
  extrudeEdgeColor: document.getElementById('extrudeEdgeColor'),
  extrudeEdgeOpacity: document.getElementById('extrudeEdgeOpacity'),

  rotationRange: document.getElementById('rotationRange'),
  rotationValue: document.getElementById('rotationValue'),
  rotationNumber: document.getElementById('rotationNumber'),
  generalRotationRanges: document.querySelectorAll('[data-general-rotation]'),
  generalRotationNumbers: document.querySelectorAll('[data-general-rotation-number]'),
  scaleXRange: document.getElementById('scaleXRange'),
  scaleXValue: document.getElementById('scaleXValue'),
  scaleYRange: document.getElementById('scaleYRange'),
  scaleYValue: document.getElementById('scaleYValue'),
  skewXRange: document.getElementById('skewXRange'),
  skewXValue: document.getElementById('skewXValue'),
  skewYRange: document.getElementById('skewYRange'),
  skewYValue: document.getElementById('skewYValue'),
  linkScale: document.getElementById('linkScale'),
  resetTransformBtn: document.getElementById('resetTransformBtn'),

  canvas: document.getElementById('previewCanvas'),
  emptyState: document.getElementById('emptyState'),
  exportPngBtn: document.getElementById('exportPngBtn'),
  exportSection: document.getElementById('exportSection'),
  exportFormatTabs: document.querySelectorAll('[data-export-format]'),
  exportScaleButtons: document.querySelectorAll('[data-export-scale]'),
  exportWidth: document.getElementById('exportWidth'),
  exportHeight: document.getElementById('exportHeight'),
  exportLockRatio: document.getElementById('exportLockRatio'),
  exportDpi: document.getElementById('exportDpi'),
  pdfDpiRow: document.getElementById('pdfDpiRow'),
  pdfSizeHint: document.getElementById('pdfSizeHint'),
  exportTransparent: document.getElementById('exportTransparent'),
  exportBackgroundRow: document.getElementById('exportBackgroundRow'),
  exportBackgroundColor: document.getElementById('exportBackgroundColor'),
  exportCrop: document.getElementById('exportCrop'),
  exportInfo: document.getElementById('exportInfo'),
  exportFinalBtn: document.getElementById('exportFinalBtn'),
  exportStatus: document.getElementById('exportStatus'),

  curveTabs: document.querySelectorAll('[data-curvemode]'),
  curvePanelArc: document.getElementById('curvePanelArc'),
  curvePanelCircle: document.getElementById('curvePanelCircle'),
  curvePanelCustom: document.getElementById('curvePanelCustom'),

  arcIntensity: document.getElementById('arcIntensity'), arcIntensityValue: document.getElementById('arcIntensityValue'),
  arcDirection: document.querySelectorAll('[data-arcdir]'),
  arcPosition: document.getElementById('arcPosition'), arcPositionValue: document.getElementById('arcPositionValue'),
  arcInvert: document.getElementById('arcInvert'),

  circleRadius: document.getElementById('circleRadius'), circleRadiusValue: document.getElementById('circleRadiusValue'),
  circleStartAngle: document.getElementById('circleStartAngle'), circleStartAngleValue: document.getElementById('circleStartAngleValue'),
  circleEndAngle: document.getElementById('circleEndAngle'), circleEndAngleValue: document.getElementById('circleEndAngleValue'),
  circleDirection: document.querySelectorAll('[data-circledir]'),
  circleOrientation: document.querySelectorAll('[data-circleorient]'),
  circleLetterSpacing: document.getElementById('circleLetterSpacing'), circleLetterSpacingValue: document.getElementById('circleLetterSpacingValue'),
  circleCenterX: document.getElementById('circleCenterX'), circleCenterXValue: document.getElementById('circleCenterXValue'),
  circleCenterY: document.getElementById('circleCenterY'), circleCenterYValue: document.getElementById('circleCenterYValue'),
  circlePresetFull: document.getElementById('circlePresetFull'),
  circlePresetArcTop: document.getElementById('circlePresetArcTop'),
  circlePresetArcBottom: document.getElementById('circlePresetArcBottom'),

  customCurveType: document.querySelectorAll('[data-curvetype]'),
  customEditToggle: document.getElementById('customEditToggle'),
  customPointList: document.getElementById('customPointList'),
  addCurvePointBtn: document.getElementById('addCurvePointBtn'),
  resetCurvePointsBtn: document.getElementById('resetCurvePointsBtn'),

  deformEnabled: document.getElementById('deformEnabled'),
  deformControls: document.getElementById('deformControls'),
  deformInterpTabs: document.querySelectorAll('[data-deforminterp]'),
  deformRows: document.getElementById('deformRows'), deformRowsValue: document.getElementById('deformRowsValue'),
  deformCols: document.getElementById('deformCols'), deformColsValue: document.getElementById('deformColsValue'),
  deformEditToggle: document.getElementById('deformEditToggle'),
  resetDeformBtn: document.getElementById('resetDeformBtn'),

  undoBtn: document.getElementById('undoBtn'),
  redoBtn: document.getElementById('redoBtn'),
  duplicateTextBtn: document.getElementById('duplicateTextBtn'),
  addTextBtn: document.getElementById('addTextBtn'),
  duplicateSelectedTextBtn: document.getElementById('duplicateSelectedTextBtn'),
  textLayerList: document.getElementById('textLayerList'),
  effectLayerList: document.getElementById('effectLayerList'),
  restoreLayersBtn: document.getElementById('restoreLayersBtn'),
  documentName: document.getElementById('documentName'),
  saveProjectBtn: document.getElementById('saveProjectBtn'),
  saveTemplateBtn: document.getElementById('saveTemplateBtn'),
  exportProjectBtn: document.getElementById('exportProjectBtn'),
  importProjectBtn: document.getElementById('importProjectBtn'),
  projectFileInput: document.getElementById('projectFileInput'),
  newProjectBtn: document.getElementById('newProjectBtn'),
  saveStatus: document.getElementById('saveStatus'),
  projectList: document.getElementById('projectList'),
  templateList: document.getElementById('templateList'),
};

const ctx = els.canvas.getContext('2d');

function textBlockId() {
  return `txt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Crea un bloque de texto completamente independiente y editable. */
function makeTextBlock(options = {}) {
  return {
    id: options.id || textBlockId(),
    name: options.name || 'Texto 1',
    visible: options.visible !== false,
    opacity: options.opacity == null ? 1 : options.opacity,
    content: options.content ?? 'Text\nEffects\nStudio',
    fontId: options.fontId || null,
    fontSize: options.fontSize || 96,
    tracking: options.tracking || 0,
    leading: options.leading || 1.05,
    wordSpacing: options.wordSpacing || 0,
    align: options.align || 'left',
    style: options.style || {
      fillType: 'solid',
      fillColor: '#7c3aed',
      opacity: 1,
      gradient: FillSystem.makeDefaultGradient(),
      imageFill: FillSystem.makeDefaultImageFill(),
      strokes: [],
      shadow: FillSystem.makeDefaultShadow(),
      innerShadow: FillSystem.makeDefaultInnerShadow(),
      glow: FillSystem.makeDefaultGlow(),
      innerGlow: FillSystem.makeDefaultInnerGlow(),
      bevel: FillSystem.makeDefaultBevel(),
      extrude: FillSystem.makeDefaultExtrude(),
      curve: CurveSystem.makeDefaultCurve(),
      deform: DeformSystem.makeDefaultDeform(),
    },
    transform: options.transform || { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 },
    layout: null,
    layers: options.layers || null,
    activeLayerId: options.activeLayerId || null,
  };
}

const design = { blocks: [makeTextBlock()], activeBlockId: null };
design.activeBlockId = design.blocks[0].id;
let block = design.blocks[0];

let dragOffset = null;
let curveEditMode = false;
let draggingCurvePointIndex = null;
let deformEditMode = false;
let draggingDeformPointIndex = null;
let historyReady = false;
let currentProjectId = null;
const exportSettings = { format: 'png', width: 2700, height: 1860, lockRatio: true, dpi: 300, transparent: true, backgroundColor: '#ffffff', crop: false };

/* ---------------- Render loop ---------------- */

function recalcBlockLayout(target) {
  const entry = FontLibrary.getById(target.fontId);
  if (!entry || !entry.otFont) {
    target.layout = null;
    return;
  }
  const layout = TextEngine.layoutText(entry.otFont, target.content, {
    fontSize: target.fontSize,
    tracking: target.tracking,
    leading: target.leading,
    wordSpacing: target.wordSpacing,
  });
  TextEngine.applyHorizontalAlign(layout, target.align);
  target.layout = layout;

  // Centrar el bloque en el canvas la primera vez que hay layout válido.
  if (target.transform.x === 0 && target.transform.y === 0) {
    const index = Math.max(0, design.blocks.indexOf(target));
    target.transform.x = els.canvas.width / 2 + index * 24;
    target.transform.y = els.canvas.height / 2 + index * 24;
  }
}

function recalcLayout() { recalcBlockLayout(block); }
function recalcAllLayouts() { design.blocks.forEach(recalcBlockLayout); }

function drawActiveSelection() {
  if (!block.layout || !block.visible) return;
  ctx.save();
  Renderer.applyBlockTransform(ctx, block.layout, block.transform);
  const scale = Math.max(0.05, (Math.abs(block.transform.scaleX) + Math.abs(block.transform.scaleY)) / 2);
  ctx.strokeStyle = 'rgba(124,58,237,.7)';
  ctx.lineWidth = 1.2 / scale;
  ctx.setLineDash([5 / scale, 4 / scale]);
  ctx.strokeRect(-5, -5, block.layout.totalWidth + 10, block.layout.totalHeight + 10);
  ctx.restore();
}

function draw() {
  Renderer.clearWithCheckerboard(ctx, els.canvas.width, els.canvas.height);
  const drawable = design.blocks.filter((target) => target.visible && target.layout);
  if (drawable.length) {
    els.emptyState.classList.add('hidden');
    drawable.forEach((target) => {
      ctx.save();
      ctx.globalAlpha *= target.opacity == null ? 1 : target.opacity;
      Renderer.renderTextBlock(ctx, target);
      ctx.restore();
    });
    drawActiveSelection();
    drawCurveOverlay();
    drawDeformOverlay();
  } else {
    els.emptyState.classList.remove('hidden');
  }
  if (historyReady && !HistorySystem.isApplying) HistorySystem.schedule(serializeProjectState(), 'Editar diseño');
}

/**
 * Fase 6 — dibuja, SOLO en la vista previa (nunca en la exportación, que
 * llama a Renderer.renderTextBlock directamente sobre un canvas aparte):
 * una guía discontinua con la forma actual de la curva, y —si el modo es
 * "curva personalizada" y la edición está activa— los puntos de control
 * arrastrables.
 */
function drawCurveOverlay() {
  const curve = block.style.curve;
  if (!block.visible || !block.layout || curve.mode === 'none') return;

  ctx.save();
  Renderer.applyBlockTransform(ctx, block.layout, block.transform);
  const guide = CurveSystem.getGuideSamples(block.layout, curve);
  if (guide.length > 1) {
    ctx.beginPath();
    ctx.moveTo(guide[0].x, guide[0].y);
    for (let i = 1; i < guide.length; i++) ctx.lineTo(guide[i].x, guide[i].y);
    const avgScale = Math.max(0.05, (Math.abs(block.transform.scaleX) + Math.abs(block.transform.scaleY)) / 2);
    ctx.setLineDash([6 / avgScale, 6 / avgScale]);
    ctx.lineWidth = 1.5 / avgScale;
    ctx.strokeStyle = 'rgba(124,58,237,0.55)';
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();

  if (curve.mode === 'custom' && curveEditMode) {
    const m = Renderer.blockMatrix(block.layout, block.transform);
    const pts = curve.custom.points;

    ctx.save();
    ctx.strokeStyle = 'rgba(124,58,237,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    pts.forEach((p, i) => {
      const cp = m.transformPoint(new DOMPoint(p.x, p.y));
      if (i === 0) ctx.moveTo(cp.x, cp.y);
      else ctx.lineTo(cp.x, cp.y);
    });
    ctx.stroke();

    pts.forEach((p, i) => {
      const cp = m.transformPoint(new DOMPoint(p.x, p.y));
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = i === draggingCurvePointIndex ? '#7c3aed' : '#ffffff';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#7c3aed';
      ctx.stroke();
    });
    ctx.restore();
  }
}

/** Devuelve el índice del punto de control bajo (canvasX, canvasY), o -1 si ninguno está lo bastante cerca. */
function hitTestCurvePoint(canvasPt) {
  if (!block.layout) return -1;
  const m = Renderer.blockMatrix(block.layout, block.transform);
  const pts = block.style.curve.custom.points;
  let best = -1;
  let bestDist = 16;
  pts.forEach((p, i) => {
    const cp = m.transformPoint(new DOMPoint(p.x, p.y));
    const d = Math.hypot(cp.x - canvasPt.x, cp.y - canvasPt.y);
    if (d < bestDist) { bestDist = d; best = i; }
  });
  return best;
}

/**
 * Fase 7 — dibuja, SOLO en la vista previa (nunca en la exportación),
 * la rejilla de puntos de control de la deformación libre cuando está
 * activa Y la edición está encendida: líneas guía uniendo los puntos
 * (horizontal y vertical) más los puntos arrastrables.
 */
function drawDeformOverlay() {
  const deform = block.style.deform;
  if (!block.visible || !block.layout || !deform.enabled || !deformEditMode) return;
  DeformSystem.ensureDeformDefaults(deform);

  const m = Renderer.blockMatrix(block.layout, block.transform);
  const { rows, cols } = deform;
  const toCanvas = (idx) => {
    const local = DeformSystem.pointToLocal(deform, block.layout, idx);
    return m.transformPoint(new DOMPoint(local.x, local.y));
  };

  ctx.save();
  ctx.strokeStyle = 'rgba(255,93,200,0.5)';
  ctx.lineWidth = 1;
  for (let j = 0; j < rows; j++) {
    ctx.beginPath();
    for (let i = 0; i < cols; i++) {
      const cp = toCanvas(j * cols + i);
      if (i === 0) ctx.moveTo(cp.x, cp.y); else ctx.lineTo(cp.x, cp.y);
    }
    ctx.stroke();
  }
  for (let i = 0; i < cols; i++) {
    ctx.beginPath();
    for (let j = 0; j < rows; j++) {
      const cp = toCanvas(j * cols + i);
      if (j === 0) ctx.moveTo(cp.x, cp.y); else ctx.lineTo(cp.x, cp.y);
    }
    ctx.stroke();
  }
  for (let idx = 0; idx < rows * cols; idx++) {
    const cp = toCanvas(idx);
    ctx.beginPath();
    ctx.arc(cp.x, cp.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = idx === draggingDeformPointIndex ? '#ff5dc8' : '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ff5dc8';
    ctx.stroke();
  }
  ctx.restore();
}

/** Devuelve el índice del punto de la rejilla de deformación bajo (canvasX, canvasY), o -1. */
function hitTestDeformPoint(canvasPt) {
  if (!block.layout) return -1;
  const deform = block.style.deform;
  const m = Renderer.blockMatrix(block.layout, block.transform);
  let best = -1;
  let bestDist = 16;
  for (let idx = 0; idx < deform.rows * deform.cols; idx++) {
    const local = DeformSystem.pointToLocal(deform, block.layout, idx);
    const cp = m.transformPoint(new DOMPoint(local.x, local.y));
    const d = Math.hypot(cp.x - canvasPt.x, cp.y - canvasPt.y);
    if (d < bestDist) { bestDist = d; best = idx; }
  }
  return best;
}

function refresh() {
  if (block.layers && window.LayerSystem) {
    LayerSystem.syncActiveFill(block);
    LayerSystem.syncStrokes(block);
  }
  recalcAllLayouts();
  draw();
}

/* ---------------- Fuentes: import + lista ---------------- */

function renderFontList() {
  els.fontList.innerHTML = '';
  els.fontSelect.innerHTML = '';
  if (!FontLibrary.loaded.length) {
    els.fontList.innerHTML = '<div class="empty-hint">Aún no has importado ninguna fuente.</div>';
    return;
  }
  for (const f of FontLibrary.loaded) {
    const row = document.createElement('div');
    row.className = 'font-row' + (f.id === block.fontId ? ' active' : '');
    row.innerHTML = `
      <span class="font-row-name" style="font-family:'${f.cssFamilyName}'">${f.family} <small>${f.subfamily}</small></span>
      <button class="font-row-remove" title="Eliminar">×</button>`;
    row.querySelector('.font-row-name').onclick = () => {
      block.fontId = f.id;
      refresh();
      renderFontList();
    };
    row.querySelector('.font-row-remove').onclick = async (e) => {
      e.stopPropagation();
      await FontLibrary.remove(f.id);
      design.blocks.forEach((target) => {
        if (target.fontId === f.id) target.fontId = FontLibrary.loaded[0]?.id ?? null;
      });
      renderFontList();
      refresh();
    };
    els.fontList.appendChild(row);

    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = `${f.family} ${f.subfamily}`;
    opt.style.fontFamily = f.cssFamilyName;
    els.fontSelect.appendChild(opt);
  }
  if (block.fontId) els.fontSelect.value = block.fontId;
}

function setImportStatus(msg, isError) {
  els.fontImportStatus.textContent = msg;
  els.fontImportStatus.classList.toggle('error', !!isError);
  els.fontImportStatus.classList.remove('hidden');
}

async function handleFiles(fileList) {
  const files = Array.from(fileList);
  if (!files.length) return;
  setImportStatus('Importando…', false);

  let importedCount = 0;
  const errors = [];

  for (const file of files) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    try {
      if (ext === 'zip') {
        const result = await FontLibrary.importZip(file);
        importedCount += result.imported.length;
        result.errors.forEach((e) => errors.push(`${e.path}: ${e.message}`));
        if (result.totalFound === 0) {
          errors.push(`${file.name}: no se encontró ninguna fuente reconocible dentro del ZIP.`);
        }
      } else {
        const entry = await FontLibrary.importFile(file);
        importedCount += 1;
        if (!block.fontId) block.fontId = entry.id;
      }
    } catch (e) {
      errors.push(`${file.name}: ${e.message}`);
    }
  }

  if (!block.fontId && FontLibrary.loaded.length) block.fontId = FontLibrary.loaded[0].id;

  renderFontList();
  refresh();

  if (errors.length) {
    setImportStatus(`${importedCount} fuente(s) importada(s). ${errors.length} problema(s): ${errors.join(' | ')}`, true);
  } else {
    setImportStatus(`${importedCount} fuente(s) importada(s) correctamente.`, false);
  }
}

els.fontInput.addEventListener('change', (e) => handleFiles(e.target.files));
els.fontDrop.addEventListener('click', () => els.fontInput.click());
els.fontDrop.addEventListener('dragover', (e) => { e.preventDefault(); els.fontDrop.classList.add('drag'); });
els.fontDrop.addEventListener('dragleave', () => els.fontDrop.classList.remove('drag'));
els.fontDrop.addEventListener('drop', (e) => {
  e.preventDefault();
  els.fontDrop.classList.remove('drag');
  handleFiles(e.dataTransfer.files);
});

els.fontSelect.addEventListener('change', () => {
  block.fontId = els.fontSelect.value;
  refresh();
  renderFontList();
});

/* ---------------- Texto / tracking / leading / alineación ---------------- */

els.textArea.addEventListener('input', () => { block.content = els.textArea.value; renderTextLayerList(); refresh(); });
els.textArea.value = block.content;

function titleCase(text) {
  return text.toLocaleLowerCase('es').replace(/(^|[^\p{L}\p{N}])(\p{L})/gu, (_, prefix, letter) => prefix + letter.toLocaleUpperCase('es'));
}

function sentenceCase(text) {
  const lower = text.toLocaleLowerCase('es');
  let capitalizeNext = true;
  return Array.from(lower).map((char) => {
    if (/\p{L}/u.test(char) && capitalizeNext) {
      capitalizeNext = false;
      return char.toLocaleUpperCase('es');
    }
    if (/[.!?\n]/u.test(char)) capitalizeNext = true;
    return char;
  }).join('');
}

function toggleCase(text) {
  return Array.from(text).map((char) => {
    const upper = char.toLocaleUpperCase('es');
    const lower = char.toLocaleLowerCase('es');
    if (upper === lower) return char;
    return char === upper ? lower : upper;
  }).join('');
}

els.caseButtons.forEach((btn) => btn.addEventListener('click', () => {
  const actions = {
    upper: (v) => v.toLocaleUpperCase('es'),
    lower: (v) => v.toLocaleLowerCase('es'),
    title: titleCase,
    sentence: sentenceCase,
    toggle: toggleCase,
  };
  block.content = actions[btn.dataset.case](block.content);
  els.textArea.value = block.content;
  renderTextLayerList();
  refresh();
  if (historyReady) HistorySystem.commit(serializeProjectState(), `Texto: ${btn.textContent.trim()}`);
}));

function bindRange(rangeEl, valueEl, onChange, format = (v) => v) {
  const update = () => {
    const v = parseFloat(rangeEl.value);
    valueEl.textContent = format(v);
    onChange(v);
    refresh();
  };
  rangeEl.addEventListener('input', update);
  update();
}

bindRange(els.sizeRange, els.sizeValue, (v) => (block.fontSize = v), (v) => `${v}px`);
bindRange(els.trackingRange, els.trackingValue, (v) => (block.tracking = v), (v) => `${v}px`);
bindRange(els.leadingRange, els.leadingValue, (v) => (block.leading = v), (v) => `${v.toFixed(2)}×`);

els.alignButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    els.alignButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    block.align = btn.dataset.align;
    refresh();
  });
});

els.fillColor.addEventListener('input', () => { block.style.fillColor = els.fillColor.value; refresh(); });

bindRange(els.opacityRange, els.opacityValue, (v) => (block.style.opacity = v / 100), (v) => `${v}%`);

/* ---------------- Fase 2: tabs de relleno ---------------- */

const fillPanels = { solid: els.fillPanelSolid, gradient: els.fillPanelGradient, image: els.fillPanelImage };

els.fillTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    els.fillTabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    block.style.fillType = tab.dataset.fill;
    Object.entries(fillPanels).forEach(([key, panel]) => panel.classList.toggle('hidden', key !== tab.dataset.fill));
    refresh();
  });
});

async function runEyedropper(applyHex) {
  try {
    const hex = await FillSystem.pickColorFromScreen();
    applyHex(hex);
    refresh();
  } catch (e) {
    if (e && e.name !== 'AbortError') alert(e.message || 'No se pudo usar el cuentagotas.');
  }
}
if (!FillSystem.isEyeDropperSupported()) {
  els.eyedropperSolid.disabled = true;
  els.eyedropperSolid.title = 'No soportado en este navegador';
  els.eyedropperStop.disabled = true;
  els.eyedropperStop.title = 'No soportado en este navegador';
}
els.eyedropperSolid.addEventListener('click', () =>
  runEyedropper((hex) => { block.style.fillColor = hex; els.fillColor.value = hex; })
);

/* ---------------- Degradado: stops arrastrables + ángulo + transparencia ---------------- */

function currentStop() {
  const g = block.style.gradient;
  return g.stops.find((s) => s.id === g.selectedId) || null;
}

function renderGradientUI() {
  const g = block.style.gradient;
  if (!g.stops.some((s) => s.id === g.selectedId)) g.selectedId = g.stops[0]?.id ?? null;

  const sorted = [...g.stops].sort((a, b) => a.pos - b.pos);
  const cssStops = sorted.map((s) => `${FillSystem.rgba(s.color, s.alpha)} ${s.pos}%`).join(', ');
  els.gradientPreview.style.background = `linear-gradient(90deg, ${cssStops})`;

  els.gradientTrack.innerHTML = '';
  const line = document.createElement('div');
  line.className = 'gradient-line';
  line.style.background = `linear-gradient(90deg, ${cssStops})`;
  els.gradientTrack.appendChild(line);

  for (const s of g.stops) {
    const handle = document.createElement('div');
    handle.className = 'gradient-stop' + (s.id === g.selectedId ? ' selected' : '');
    handle.style.left = `${s.pos}%`;
    handle.style.background = FillSystem.rgba(s.color, s.alpha);
    handle.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      g.selectedId = s.id;
      renderGradientUI();
      const track = els.gradientTrack;
      const onMove = (ev) => {
        const rect = track.getBoundingClientRect();
        const pct = Math.min(100, Math.max(0, ((ev.clientX - rect.left) / rect.width) * 100));
        s.pos = Math.round(pct);
        renderGradientUI();
        refresh();
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
    els.gradientTrack.appendChild(handle);
  }

  const sel = currentStop();
  if (sel) {
    els.stopColor.value = sel.color;
    els.stopAlpha.value = Math.round(sel.alpha * 100);
    els.stopAlphaValue.textContent = `${Math.round(sel.alpha * 100)}%`;
  }
}

// Click en el track (fuera de un stop) añade un nuevo punto ahí.
els.gradientTrack.addEventListener('click', (e) => {
  if (e.target !== els.gradientTrack && e.target.parentElement !== els.gradientTrack) return;
  const rect = els.gradientTrack.getBoundingClientRect();
  const pct = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
  const g = block.style.gradient;
  const newStop = { id: FillSystem.uid(), pos: Math.round(pct), color: sel_defaultColor(), alpha: 1 };
  g.stops.push(newStop);
  g.selectedId = newStop.id;
  renderGradientUI();
  refresh();
});
function sel_defaultColor() {
  const sel = currentStop();
  return sel ? sel.color : '#ffffff';
}

els.addStopBtn.addEventListener('click', () => {
  const g = block.style.gradient;
  const newStop = { id: FillSystem.uid(), pos: 50, color: sel_defaultColor(), alpha: 1 };
  g.stops.push(newStop);
  g.selectedId = newStop.id;
  renderGradientUI();
  refresh();
});

els.removeStopBtn.addEventListener('click', () => {
  const g = block.style.gradient;
  if (g.stops.length <= 2) { alert('Un degradado necesita al menos 2 puntos.'); return; }
  g.stops = g.stops.filter((s) => s.id !== g.selectedId);
  g.selectedId = g.stops[0]?.id ?? null;
  renderGradientUI();
  refresh();
});

els.stopColor.addEventListener('input', () => {
  const s = currentStop();
  if (!s) return;
  s.color = els.stopColor.value;
  renderGradientUI();
  refresh();
});
els.eyedropperStop.addEventListener('click', () =>
  runEyedropper((hex) => {
    const s = currentStop();
    if (s) { s.color = hex; renderGradientUI(); }
  })
);
els.stopAlpha.addEventListener('input', () => {
  const s = currentStop();
  if (!s) return;
  s.alpha = parseFloat(els.stopAlpha.value) / 100;
  els.stopAlphaValue.textContent = `${els.stopAlpha.value}%`;
  renderGradientUI();
  refresh();
});
els.gradientAngle.addEventListener('input', () => {
  block.style.gradient.angle = parseFloat(els.gradientAngle.value);
  els.gradientAngleValue.textContent = `${els.gradientAngle.value}°`;
  refresh();
});

const GRADIENT_PRESETS = [
  ['#7c3aed', '#ff5dc8'],
  ['#0ea5e9', '#22c55e'],
  ['#f59e0b', '#ef4444'],
  ['#111827', '#6b7280'],
  ['#ec4899', '#f472b6', '#facc15'],
];
GRADIENT_PRESETS.forEach((colors) => {
  const btn = document.createElement('button');
  btn.className = 'gradient-preset';
  btn.style.background = `linear-gradient(90deg, ${colors.join(',')})`;
  btn.title = 'Aplicar degradado';
  btn.addEventListener('click', () => {
    const g = block.style.gradient;
    g.stops = colors.map((c, i) => ({
      id: FillSystem.uid(),
      pos: colors.length === 1 ? 0 : Math.round((i / (colors.length - 1)) * 100),
      color: c,
      alpha: 1,
    }));
    g.selectedId = g.stops[0].id;
    renderGradientUI();
    refresh();
  });
  els.gradientPresets.appendChild(btn);
});

/* ---------------- Imagen: múltiples imágenes con transform individual ---------------- */

function renderImageFillUI() {
  const imgs = block.style.imageFill.images;
  els.imageFillList.innerHTML = '';
  for (const layer of imgs) {
    const row = document.createElement('div');
    row.className = 'fill-layer-item' + (layer.id === block.style.imageFill.selectedId ? ' selected' : '');
    row.innerHTML = `
      <img class="fill-layer-thumb" src="${layer.src}">
      <span class="fill-layer-name">${layer.name}</span>
      <button class="fill-layer-remove">×</button>`;
    row.querySelector('.fill-layer-name').onclick = () => { selectImageLayer(layer.id); };
    row.querySelector('.fill-layer-thumb').onclick = () => { selectImageLayer(layer.id); };
    row.querySelector('.fill-layer-remove').onclick = (e) => {
      e.stopPropagation();
      block.style.imageFill.images = imgs.filter((l) => l.id !== layer.id);
      if (block.style.imageFill.selectedId === layer.id) block.style.imageFill.selectedId = null;
      renderImageFillUI();
      refresh();
    };
    els.imageFillList.appendChild(row);
  }
  const sel = imgs.find((l) => l.id === block.style.imageFill.selectedId);
  els.imageFillControls.classList.toggle('hidden', !sel);
  if (sel) {
    els.imgX.value = sel.x;
    els.imgY.value = sel.y;
    els.imgScale.value = sel.scale;
    els.imgRotation.value = sel.rotation;
    els.imgOpacity.value = Math.round(sel.opacity * 100);
    els.imgOpacityValue.textContent = `${Math.round(sel.opacity * 100)}%`;
  }
}

function selectImageLayer(id) {
  block.style.imageFill.selectedId = id;
  renderImageFillUI();
}

async function handleImageFillFiles(fileList) {
  for (const file of Array.from(fileList)) {
    const src = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const image = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = src;
    });
    const layer = {
      id: FillSystem.uid(),
      name: file.name,
      src,
      image,
      x: (block.layout?.totalWidth || 400) / 2,
      y: (block.layout?.totalHeight || 200) / 2,
      scale: 1,
      rotation: 0,
      opacity: 1,
    };
    block.style.imageFill.images.push(layer);
    block.style.imageFill.selectedId = layer.id;
  }
  renderImageFillUI();
  refresh();
}

els.imageFillInput.addEventListener('change', (e) => handleImageFillFiles(e.target.files));
els.imageFillDrop.addEventListener('click', () => els.imageFillInput.click());
els.imageFillDrop.addEventListener('dragover', (e) => { e.preventDefault(); els.imageFillDrop.classList.add('drag'); });
els.imageFillDrop.addEventListener('dragleave', () => els.imageFillDrop.classList.remove('drag'));
els.imageFillDrop.addEventListener('drop', (e) => {
  e.preventDefault();
  els.imageFillDrop.classList.remove('drag');
  handleImageFillFiles(e.dataTransfer.files);
});

function bindImageControl(el, prop, isPercent) {
  el.addEventListener('input', () => {
    const sel = block.style.imageFill.images.find((l) => l.id === block.style.imageFill.selectedId);
    if (!sel) return;
    sel[prop] = isPercent ? parseFloat(el.value) / 100 : parseFloat(el.value);
    if (isPercent) els.imgOpacityValue.textContent = `${el.value}%`;
    refresh();
  });
}
bindImageControl(els.imgX, 'x');
bindImageControl(els.imgY, 'y');
bindImageControl(els.imgScale, 'scale');
bindImageControl(els.imgRotation, 'rotation');
bindImageControl(els.imgOpacity, 'opacity', true);

renderGradientUI();
renderImageFillUI();

/* ---------------- Fase 3: contornos (múltiples, sólido o degradado) ---------------- */

function ensureGradientModel(model, fallbackA = '#111111', fallbackB = '#7c3aed') {
  if (!model || !Array.isArray(model.stops) || model.stops.length < 2) {
    model = FillSystem.makeDefaultGradient();
    model.stops[0].color = fallbackA;
    model.stops[1].color = fallbackB;
  }
  model.stops.forEach((stop) => {
    if (!stop.id) stop.id = FillSystem.uid();
    if (stop.alpha == null) stop.alpha = 1;
  });
  if (!model.stops.some((stop) => stop.id === model.selectedId)) model.selectedId = model.stops[0].id;
  return model;
}

/** Editor reutilizable de degradado con N puntos, color, alfa, posición y ángulo. */
function renderInlineGradientEditor(container, gradient, onChange) {
  if (!container) return;
  gradient = ensureGradientModel(gradient);
  const sorted = [...gradient.stops].sort((a, b) => a.pos - b.pos);
  const cssStops = sorted.map((stop) => `${FillSystem.rgba(stop.color, stop.alpha)} ${stop.pos}%`).join(', ');
  const selected = gradient.stops.find((stop) => stop.id === gradient.selectedId) || gradient.stops[0];
  container.innerHTML = `
    <div class="inline-gradient-preview"></div>
    <div class="inline-gradient-track"><div class="inline-gradient-line"></div></div>
    <div class="inline-gradient-controls">
      <label>Color<input class="inline-stop-color" type="color" value="${selected.color}"></label>
      <label>Opacidad<input class="inline-stop-alpha" type="range" min="0" max="100" value="${Math.round(selected.alpha * 100)}"></label>
      <label>Posición<input class="inline-stop-position" type="number" min="0" max="100" value="${Math.round(selected.pos)}"></label>
    </div>
    <div class="inline-gradient-angle"><input class="inline-angle-range" type="range" min="0" max="360" value="${gradient.angle || 0}"><input class="inline-angle-number" type="number" min="0" max="360" value="${gradient.angle || 0}"></div>
    <div class="inline-gradient-actions"><button class="mini-btn inline-add-stop">＋ Añadir punto</button><button class="mini-btn inline-remove-stop" ${gradient.stops.length <= 2 ? 'disabled' : ''}>🗑 Quitar punto</button></div>`;
  container.querySelector('.inline-gradient-preview').style.background = `linear-gradient(90deg, ${cssStops})`;
  container.querySelector('.inline-gradient-line').style.background = `linear-gradient(90deg, ${cssStops})`;
  const track = container.querySelector('.inline-gradient-track');
  const updateVisuals = () => {
    const stops = [...gradient.stops].sort((a, b) => a.pos - b.pos).map((stop) => `${FillSystem.rgba(stop.color, stop.alpha)} ${stop.pos}%`).join(', ');
    container.querySelector('.inline-gradient-preview').style.background = `linear-gradient(90deg, ${stops})`;
    container.querySelector('.inline-gradient-line').style.background = `linear-gradient(90deg, ${stops})`;
  };
  gradient.stops.forEach((stop) => {
    const handle = document.createElement('div');
    handle.className = `inline-gradient-stop${stop.id === gradient.selectedId ? ' selected' : ''}`;
    handle.style.left = `${stop.pos}%`;
    handle.style.background = FillSystem.rgba(stop.color, stop.alpha);
    handle.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      gradient.selectedId = stop.id;
      container.querySelectorAll('.inline-gradient-stop').forEach((node) => node.classList.toggle('selected', node === handle));
      container.querySelector('.inline-stop-color').value = stop.color;
      container.querySelector('.inline-stop-alpha').value = Math.round(stop.alpha * 100);
      container.querySelector('.inline-stop-position').value = Math.round(stop.pos);
      const move = (pointerEvent) => {
        const rect = track.getBoundingClientRect();
        stop.pos = Math.round(Math.max(0, Math.min(100, ((pointerEvent.clientX - rect.left) / rect.width) * 100)));
        handle.style.left = `${stop.pos}%`;
        container.querySelector('.inline-stop-position').value = stop.pos;
        updateVisuals();
        onChange();
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        renderInlineGradientEditor(container, gradient, onChange);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
    track.appendChild(handle);
  });
  track.addEventListener('click', (event) => {
    if (event.target.closest('.inline-gradient-stop')) return;
    const rect = track.getBoundingClientRect();
    const pos = Math.round(Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)));
    const stop = { id: FillSystem.uid(), pos, color: selected.color, alpha: selected.alpha };
    gradient.stops.push(stop);
    gradient.selectedId = stop.id;
    renderInlineGradientEditor(container, gradient, onChange);
    onChange();
  });
  const colorInput = container.querySelector('.inline-stop-color');
  colorInput.addEventListener('input', (event) => { selected.color = event.target.value; updateVisuals(); onChange(); });
  colorInput.addEventListener('change', () => renderInlineGradientEditor(container, gradient, onChange));
  const alphaInput = container.querySelector('.inline-stop-alpha');
  alphaInput.addEventListener('input', (event) => { selected.alpha = Number(event.target.value) / 100; updateVisuals(); onChange(); });
  alphaInput.addEventListener('change', () => renderInlineGradientEditor(container, gradient, onChange));
  const positionInput = container.querySelector('.inline-stop-position');
  positionInput.addEventListener('input', (event) => { selected.pos = Math.max(0, Math.min(100, Number(event.target.value) || 0)); updateVisuals(); onChange(); });
  positionInput.addEventListener('change', () => renderInlineGradientEditor(container, gradient, onChange));
  const angleRange = container.querySelector('.inline-angle-range');
  const angleNumber = container.querySelector('.inline-angle-number');
  const setAngle = (value, peer) => { gradient.angle = Math.max(0, Math.min(360, Number(value) || 0)); peer.value = gradient.angle; onChange(); };
  angleRange.addEventListener('input', (event) => setAngle(event.target.value, angleNumber));
  angleNumber.addEventListener('input', (event) => setAngle(event.target.value, angleRange));
  container.querySelector('.inline-add-stop').addEventListener('click', () => {
    const stop = { id: FillSystem.uid(), pos: 50, color: selected.color, alpha: selected.alpha };
    gradient.stops.push(stop); gradient.selectedId = stop.id;
    renderInlineGradientEditor(container, gradient, onChange); onChange();
  });
  container.querySelector('.inline-remove-stop').addEventListener('click', () => {
    if (gradient.stops.length <= 2) return;
    gradient.stops = gradient.stops.filter((stop) => stop.id !== gradient.selectedId);
    gradient.selectedId = gradient.stops[0].id;
    renderInlineGradientEditor(container, gradient, onChange); onChange();
  });
}

function makeStroke() {
  return {
    id: FillSystem.uid(),
    enabled: true,
    width: 6,
    opacity: 1,
    fillType: 'solid', // 'solid' | 'gradient'
    color: '#111111',
    gradientType: 'linear',
    gradient: ensureGradientModel(FillSystem.makeDefaultGradient(), '#111111', '#7c3aed'),
  };
}

function renderStrokeList() {
  els.strokeList.innerHTML = '';
  if (!block.style.strokes.length) {
    els.strokeList.innerHTML = '<div class="empty-hint">Sin contornos. Añade uno para darle borde al texto.</div>';
    return;
  }
  block.style.strokes.forEach((s, idx) => {
    s.gradient = ensureGradientModel(s.gradient, s.colorStart || '#111111', s.colorEnd || '#7c3aed');
    const item = document.createElement('div');
    item.className = 'layer-item';
    item.innerHTML = `
      <div class="layer-head">
        <label class="check-row" style="margin:0"><input type="checkbox" class="stroke-enabled" ${s.enabled ? 'checked' : ''}> <span class="layer-title">Contorno ${idx + 1}</span></label>
        <div class="layer-actions">
          <button class="icon-btn stroke-remove" title="Eliminar">🗑</button>
        </div>
      </div>
      <div class="segmented" style="margin-top:8px">
        <button class="seg stroke-tab-solid ${s.fillType === 'solid' ? 'active' : ''}">Sólido</button>
        <button class="seg stroke-tab-gradient ${s.fillType === 'gradient' ? 'active' : ''}">Degradado</button>
      </div>
      <div class="stroke-solid-controls ${s.fillType !== 'solid' ? 'hidden' : ''}" style="margin-top:8px">
        <input type="color" class="color-mini stroke-color" value="${s.color}">
      </div>
      <div class="stroke-gradient-controls ${s.fillType !== 'gradient' ? 'hidden' : ''}" style="margin-top:8px">
        <div class="inline-gradient-editor stroke-gradient-editor"></div>
      </div>
      <div class="layer-grid">
        <label>Grosor<input type="range" class="stroke-width" min="1" max="60" value="${s.width}"></label>
        <label>Opacidad<input type="range" class="stroke-opacity" min="0" max="100" value="${Math.round(s.opacity * 100)}"></label>
      </div>`;

    item.querySelector('.stroke-enabled').addEventListener('change', (e) => { s.enabled = e.target.checked; refresh(); });
    item.querySelector('.stroke-remove').addEventListener('click', () => {
      block.style.strokes = block.style.strokes.filter((x) => x.id !== s.id);
      if (block.layers) LayerSystem.syncStrokes(block);
      renderStrokeList();
      if (block.layers) renderEffectLayerList();
      refresh();
    });
    item.querySelector('.stroke-tab-solid').addEventListener('click', () => { s.fillType = 'solid'; renderStrokeList(); refresh(); });
    item.querySelector('.stroke-tab-gradient').addEventListener('click', () => { s.fillType = 'gradient'; renderStrokeList(); refresh(); });
    item.querySelector('.stroke-color').addEventListener('input', (e) => { s.color = e.target.value; refresh(); });
    item.querySelector('.stroke-width').addEventListener('input', (e) => { s.width = parseFloat(e.target.value); refresh(); });
    item.querySelector('.stroke-opacity').addEventListener('input', (e) => { s.opacity = parseFloat(e.target.value) / 100; refresh(); });

    els.strokeList.appendChild(item);
    if (s.fillType === 'gradient') renderInlineGradientEditor(item.querySelector('.stroke-gradient-editor'), s.gradient, refresh);
  });
}

els.addStrokeBtn.addEventListener('click', () => {
  block.style.strokes.push(makeStroke());
  if (block.layers) LayerSystem.syncStrokes(block);
  renderStrokeList();
  if (block.layers) renderEffectLayerList();
  refresh();
});

renderStrokeList();

/* ---------------- Fase 4: sombra, sombra interna, glow ---------------- */

function bindCheck(el, controlsEl, onChange) {
  el.addEventListener('change', () => {
    onChange(el.checked);
    if (controlsEl) controlsEl.classList.toggle('hidden', !el.checked);
    refresh();
  });
}
function bindRangeSimple(rangeEl, valueEl, onChange, format) {
  rangeEl.addEventListener('input', () => {
    const v = parseFloat(rangeEl.value);
    if (valueEl) valueEl.textContent = format(v);
    onChange(v);
    refresh();
  });
}

/* Sombra */
bindCheck(els.shadowEnabled, els.shadowControls, (v) => (block.style.shadow.enabled = v));
bindRangeSimple(els.shadowX, els.shadowXValue, (v) => (block.style.shadow.offsetX = v), (v) => `${v}px`);
bindRangeSimple(els.shadowY, els.shadowYValue, (v) => (block.style.shadow.offsetY = v), (v) => `${v}px`);
bindRangeSimple(els.shadowBlur, els.shadowBlurValue, (v) => (block.style.shadow.blur = v), (v) => `${v}px`);
bindRangeSimple(els.shadowSpread, els.shadowSpreadValue, (v) => (block.style.shadow.spread = v), (v) => `${v}px`);
bindRangeSimple(els.shadowOpacity, els.shadowOpacityValue, (v) => (block.style.shadow.opacity = v / 100), (v) => `${v}%`);
els.shadowColor.addEventListener('input', () => { block.style.shadow.color = els.shadowColor.value; refresh(); });

els.shadowFillTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    els.shadowFillTabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    block.style.shadow.fillType = tab.dataset.shadowfill;
    els.shadowSolidControls.classList.toggle('hidden', tab.dataset.shadowfill !== 'solid');
    els.shadowGradientControls.classList.toggle('hidden', tab.dataset.shadowfill !== 'gradient');
    if (tab.dataset.shadowfill === 'gradient') renderInlineGradientEditor(els.shadowGradientEditor, block.style.shadow.gradient, refresh);
    refresh();
  });
});
els.shadowGradTypeTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    els.shadowGradTypeTabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    block.style.shadow.gradientType = tab.dataset.gradtype;
    refresh();
  });
});
block.style.shadow.gradient = ensureGradientModel(block.style.shadow.gradient, '#000000', '#7c3aed');
renderInlineGradientEditor(els.shadowGradientEditor, block.style.shadow.gradient, refresh);

/* Sombra interna */
bindCheck(els.innerShadowEnabled, els.innerShadowControls, (v) => (block.style.innerShadow.enabled = v));
bindRangeSimple(els.innerDepth, els.innerDepthValue, (v) => (block.style.innerShadow.depth = v), (v) => `${v.toFixed(1)}×`);
bindRangeSimple(els.innerBlur, els.innerBlurValue, (v) => (block.style.innerShadow.blur = v), (v) => `${v}px`);
bindRangeSimple(els.innerX, els.innerXValue, (v) => (block.style.innerShadow.offsetX = v), (v) => `${v}px`);
bindRangeSimple(els.innerY, els.innerYValue, (v) => (block.style.innerShadow.offsetY = v), (v) => `${v}px`);
els.innerColor.addEventListener('input', () => { block.style.innerShadow.color = els.innerColor.value; refresh(); });
els.innerOpacity.addEventListener('input', () => { block.style.innerShadow.opacity = parseFloat(els.innerOpacity.value) / 100; refresh(); });

/* Glow exterior */
bindCheck(els.glowEnabled, els.glowControls, (v) => (block.style.glow.enabled = v));
els.glowColor.addEventListener('input', () => { block.style.glow.color = els.glowColor.value; refresh(); });
els.glowOpacity.addEventListener('input', () => { block.style.glow.opacity = parseFloat(els.glowOpacity.value) / 100; refresh(); });
bindRangeSimple(els.glowBlur, els.glowBlurValue, (v) => (block.style.glow.blur = v), (v) => `${v}px`);
bindRangeSimple(els.glowIntensity, els.glowIntensityValue, (v) => (block.style.glow.intensity = v), (v) => `${v}`);

/* Glow interior */
bindCheck(els.innerGlowEnabled, els.innerGlowControls, (v) => (block.style.innerGlow.enabled = v));
els.innerGlowColor.addEventListener('input', () => { block.style.innerGlow.color = els.innerGlowColor.value; refresh(); });
els.innerGlowOpacity.addEventListener('input', () => { block.style.innerGlow.opacity = parseFloat(els.innerGlowOpacity.value) / 100; refresh(); });
bindRangeSimple(els.innerGlowBlur, els.innerGlowBlurValue, (v) => (block.style.innerGlow.blur = v), (v) => `${v}px`);

/* ---------------- Fase 5: bisel ---------------- */

bindCheck(els.bevelEnabled, els.bevelControls, (v) => (block.style.bevel.enabled = v));
bindRangeSimple(els.bevelAngle, els.bevelAngleValue, (v) => (block.style.bevel.angle = v), (v) => `${v}°`);
bindRangeSimple(els.bevelSize, els.bevelSizeValue, (v) => (block.style.bevel.size = v), (v) => `${v}px`);
bindRangeSimple(els.bevelSoftness, els.bevelSoftnessValue, (v) => (block.style.bevel.softness = v), (v) => `${v}px`);
bindRangeSimple(els.bevelStrength, els.bevelStrengthValue, (v) => (block.style.bevel.strength = v / 100), (v) => `${v}%`);
els.bevelHighlightColor.addEventListener('input', () => { block.style.bevel.highlightColor = els.bevelHighlightColor.value; refresh(); });
els.bevelShadowColor.addEventListener('input', () => { block.style.bevel.shadowColor = els.bevelShadowColor.value; refresh(); });

/* ---------------- Fase 5: extrusión / 3D ---------------- */

bindCheck(els.extrudeEnabled, els.extrudeControls, (v) => (block.style.extrude.enabled = v));
bindRangeSimple(els.extrudeDepth, els.extrudeDepthValue, (v) => (block.style.extrude.depth = v), (v) => `${v}px`);
bindRangeSimple(els.extrudeAngle, els.extrudeAngleValue, (v) => (block.style.extrude.angle = v), (v) => `${v}°`);
bindRangeSimple(els.extrudeStep, els.extrudeStepValue, (v) => (block.style.extrude.step = v), (v) => `${v}px`);

els.extrudeFillTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    els.extrudeFillTabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    block.style.extrude.colorMode = tab.dataset.extrudefill;
    els.extrudeSolidControls.classList.toggle('hidden', tab.dataset.extrudefill !== 'solid');
    els.extrudeGradientControls.classList.toggle('hidden', tab.dataset.extrudefill !== 'gradient');
    refresh();
  });
});
els.extrudeColor.addEventListener('input', () => { block.style.extrude.color = els.extrudeColor.value; refresh(); });
els.extrudeColorNear.addEventListener('input', () => { block.style.extrude.colorNear = els.extrudeColorNear.value; refresh(); });
els.extrudeColorFar.addEventListener('input', () => { block.style.extrude.colorFar = els.extrudeColorFar.value; refresh(); });

bindCheck(els.extrudeEdgeEnabled, null, (v) => (block.style.extrude.edgeEnabled = v));
els.extrudeEdgeColor.addEventListener('input', () => { block.style.extrude.edgeColor = els.extrudeEdgeColor.value; refresh(); });
els.extrudeEdgeOpacity.addEventListener('input', () => { block.style.extrude.edgeOpacity = parseFloat(els.extrudeEdgeOpacity.value) / 100; refresh(); });

/* ---------------- Fase 6: curvatura, texto circular y curva personalizada ---------------- */

const curvePanels = { arc: els.curvePanelArc, circle: els.curvePanelCircle, custom: els.curvePanelCustom };

function setCurveMode(mode) {
  block.style.curve.mode = mode;
  els.curveTabs.forEach((t) => t.classList.toggle('active', t.dataset.curvemode === mode));
  Object.entries(curvePanels).forEach(([key, panel]) => panel.classList.toggle('hidden', key !== mode));
  if (mode === 'custom' && block.layout) {
    CurveSystem.ensureCustomDefaults(block.style.curve, block.layout);
    renderCustomPointList();
  }
  refresh();
}

els.curveTabs.forEach((tab) => {
  tab.addEventListener('click', () => setCurveMode(tab.dataset.curvemode));
});

/* Arco */
bindRange(els.arcIntensity, els.arcIntensityValue, (v) => (block.style.curve.arc.intensity = v), (v) => `${v}%`);
els.arcDirection.forEach((btn) => {
  btn.addEventListener('click', () => {
    els.arcDirection.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    block.style.curve.arc.direction = parseInt(btn.dataset.arcdir, 10);
    refresh();
  });
});
bindRange(els.arcPosition, els.arcPositionValue, (v) => (block.style.curve.arc.position = v), (v) => `${v}px`);
els.arcInvert.addEventListener('change', () => { block.style.curve.arc.invert = els.arcInvert.checked; refresh(); });

/* Círculo */
bindRange(els.circleRadius, els.circleRadiusValue, (v) => (block.style.curve.circle.radius = v), (v) => `${v}px`);
bindRange(els.circleStartAngle, els.circleStartAngleValue, (v) => (block.style.curve.circle.startAngle = v), (v) => `${v}°`);
bindRange(els.circleEndAngle, els.circleEndAngleValue, (v) => (block.style.curve.circle.endAngle = v), (v) => `${v}°`);
els.circleDirection.forEach((btn) => {
  btn.addEventListener('click', () => {
    els.circleDirection.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    block.style.curve.circle.direction = parseInt(btn.dataset.circledir, 10);
    refresh();
  });
});
els.circleOrientation.forEach((btn) => {
  btn.addEventListener('click', () => {
    els.circleOrientation.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    block.style.curve.circle.orientation = btn.dataset.circleorient;
    refresh();
  });
});
bindRange(els.circleLetterSpacing, els.circleLetterSpacingValue, (v) => (block.style.curve.circle.letterSpacing = v), (v) => `${v}px`);
bindRange(els.circleCenterX, els.circleCenterXValue, (v) => (block.style.curve.circle.centerX = v), (v) => `${v}px`);
bindRange(els.circleCenterY, els.circleCenterYValue, (v) => (block.style.curve.circle.centerY = v), (v) => `${v}px`);

function applyCirclePreset(startAngle, endAngle, orientation) {
  const c = block.style.curve.circle;
  c.startAngle = startAngle;
  c.endAngle = endAngle;
  c.orientation = orientation;
  els.circleStartAngle.value = startAngle;
  els.circleStartAngleValue.textContent = `${startAngle}°`;
  els.circleEndAngle.value = endAngle;
  els.circleEndAngleValue.textContent = `${endAngle}°`;
  els.circleOrientation.forEach((b) => b.classList.toggle('active', b.dataset.circleorient === orientation));
  refresh();
}
els.circlePresetFull.addEventListener('click', () => applyCirclePreset(-90, 270, 'outside'));
els.circlePresetArcTop.addEventListener('click', () => applyCirclePreset(-150, -30, 'outside'));
els.circlePresetArcBottom.addEventListener('click', () => applyCirclePreset(30, 150, 'inside'));

/* Curva personalizada */
els.customCurveType.forEach((btn) => {
  btn.addEventListener('click', () => {
    els.customCurveType.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    block.style.curve.custom.curveType = btn.dataset.curvetype;
    refresh();
  });
});

els.customEditToggle.addEventListener('change', () => {
  curveEditMode = els.customEditToggle.checked;
  els.canvas.style.cursor = curveEditMode ? 'crosshair' : '';
  draw();
});

function renderCustomPointList() {
  const pts = block.style.curve.custom.points;
  els.customPointList.innerHTML = '';
  pts.forEach((p, idx) => {
    const row = document.createElement('div');
    row.className = 'layer-item';
    row.innerHTML = `
      <div class="layer-head">
        <span class="layer-title">Punto ${idx + 1}</span>
        <div class="layer-actions">
          <button class="icon-btn point-remove" title="Eliminar" ${pts.length <= 2 ? 'disabled' : ''}>🗑</button>
        </div>
      </div>
      <div class="layer-grid">
        <label>X<input type="number" class="point-x" value="${Math.round(p.x)}"></label>
        <label>Y<input type="number" class="point-y" value="${Math.round(p.y)}"></label>
      </div>`;
    row.querySelector('.point-x').addEventListener('input', (e) => { p.x = parseFloat(e.target.value) || 0; draw(); });
    row.querySelector('.point-y').addEventListener('input', (e) => { p.y = parseFloat(e.target.value) || 0; draw(); });
    row.querySelector('.point-remove').addEventListener('click', () => {
      if (pts.length <= 2) return;
      block.style.curve.custom.points = pts.filter((_, i) => i !== idx);
      renderCustomPointList();
      draw();
    });
    els.customPointList.appendChild(row);
  });
}

els.addCurvePointBtn.addEventListener('click', () => {
  const pts = block.style.curve.custom.points;
  const last = pts[pts.length - 1] || { x: 0, y: 0 };
  const prev = pts[pts.length - 2] || { x: last.x - 100, y: last.y };
  pts.push({ x: last.x + (last.x - prev.x || 80), y: last.y + (last.y - prev.y) * 0.3 });
  renderCustomPointList();
  draw();
});

els.resetCurvePointsBtn.addEventListener('click', () => {
  block.style.curve.custom.points = [];
  if (block.layout) CurveSystem.ensureCustomDefaults(block.style.curve, block.layout);
  renderCustomPointList();
  draw();
});

/* ---------------- Fase 7: deformación libre mediante malla de puntos ---------------- */

els.deformEnabled.addEventListener('change', () => {
  block.style.deform.enabled = els.deformEnabled.checked;
  els.deformControls.classList.toggle('hidden', !block.style.deform.enabled);
  if (block.style.deform.enabled) DeformSystem.ensureDeformDefaults(block.style.deform);
  refresh();
});

els.deformInterpTabs.forEach((btn) => {
  btn.addEventListener('click', () => {
    els.deformInterpTabs.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    block.style.deform.interpolation = btn.dataset.deforminterp;
    refresh();
  });
});

function updateDeformGrid() {
  const rows = parseInt(els.deformRows.value, 10);
  const cols = parseInt(els.deformCols.value, 10);
  DeformSystem.resampleGrid(block.style.deform, rows, cols);
  draw();
}
els.deformRows.addEventListener('input', () => {
  els.deformRowsValue.textContent = els.deformRows.value;
  updateDeformGrid();
});
els.deformCols.addEventListener('input', () => {
  els.deformColsValue.textContent = els.deformCols.value;
  updateDeformGrid();
});

els.deformEditToggle.addEventListener('change', () => {
  deformEditMode = els.deformEditToggle.checked;
  els.canvas.style.cursor = deformEditMode ? 'crosshair' : '';
  draw();
});

els.resetDeformBtn.addEventListener('click', () => {
  DeformSystem.ensureDeformDefaults(block.style.deform);
  DeformSystem.resetDeform(block.style.deform);
  draw();
});

/* ---------------- Transformaciones ---------------- */

function setGeneralRotation(value, shouldRefresh = true) {
  const rotation = Math.max(-180, Math.min(180, Number(value) || 0));
  block.transform.rotation = rotation;
  els.rotationRange.value = rotation;
  els.rotationNumber.value = rotation;
  els.rotationValue.textContent = `${rotation}°`;
  els.generalRotationRanges.forEach((input) => { input.value = rotation; });
  els.generalRotationNumbers.forEach((input) => { input.value = rotation; });
  if (shouldRefresh) refresh();
}
els.rotationRange.addEventListener('input', () => setGeneralRotation(els.rotationRange.value));
els.rotationNumber.addEventListener('input', () => setGeneralRotation(els.rotationNumber.value));
els.generalRotationRanges.forEach((input) => input.addEventListener('input', () => setGeneralRotation(input.value)));
els.generalRotationNumbers.forEach((input) => input.addEventListener('input', () => setGeneralRotation(input.value)));
setGeneralRotation(0, false);
bindRange(els.skewXRange, els.skewXValue, (v) => (block.transform.skewX = v), (v) => `${v}°`);
bindRange(els.skewYRange, els.skewYValue, (v) => (block.transform.skewY = v), (v) => `${v}°`);

bindRange(els.scaleXRange, els.scaleXValue, (v) => {
  block.transform.scaleX = v;
  if (els.linkScale.checked) {
    block.transform.scaleY = v;
    els.scaleYRange.value = v;
    els.scaleYValue.textContent = `${v.toFixed(2)}×`;
  }
}, (v) => `${v.toFixed(2)}×`);

bindRange(els.scaleYRange, els.scaleYValue, (v) => {
  block.transform.scaleY = v;
  if (els.linkScale.checked) {
    block.transform.scaleX = v;
    els.scaleXRange.value = v;
    els.scaleXValue.textContent = `${v.toFixed(2)}×`;
  }
}, (v) => `${v.toFixed(2)}×`);

els.resetTransformBtn.addEventListener('click', () => {
  block.transform = { x: els.canvas.width / 2, y: els.canvas.height / 2, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 };
  [els.rotationRange, els.skewXRange, els.skewYRange].forEach((r) => (r.value = 0));
  setGeneralRotation(0, false);
  els.scaleXRange.value = 1;
  els.scaleYRange.value = 1;
  [els.rotationValue, els.skewXValue, els.skewYValue].forEach((v) => (v.textContent = '0°'));
  els.scaleXValue.textContent = '1.00×';
  els.scaleYValue.textContent = '1.00×';
  refresh();
});

/* Arrastrar el texto directamente sobre el lienzo (control directo sobre el canvas).
   Si el modo de curva es "personalizada" y la edición está activa, arrastrar
   sobre uno de sus puntos de control lo mueve a él en lugar de mover todo el bloque. */
function hitTestTextBlock(canvasPt) {
  for (let i = design.blocks.length - 1; i >= 0; i--) {
    const target = design.blocks[i];
    if (!target.visible || !target.layout) continue;
    try {
      const local = Renderer.blockMatrix(target.layout, target.transform).inverse().transformPoint(new DOMPoint(canvasPt.x, canvasPt.y));
      const pad = Math.max(18, target.fontSize * 0.18);
      if (local.x >= -pad && local.x <= target.layout.totalWidth + pad && local.y >= -pad && local.y <= target.layout.totalHeight + pad) return target;
    } catch (_) { /* Una transformación singular simplemente no es seleccionable. */ }
  }
  return null;
}

function selectTextBlock(id, shouldDraw = true) {
  const selected = design.blocks.find((target) => target.id === id);
  if (!selected) return;
  if (block.layers) LayerSystem.syncActiveFill(block);
  design.activeBlockId = selected.id;
  block = selected;
  LayerSystem.initialize(block);
  LayerSystem.relinkActive(block);
  syncUIFromBlock();
  renderTextLayerList();
  if (shouldDraw) draw();
}

els.canvas.addEventListener('pointerdown', (e) => {
  const rect = els.canvas.getBoundingClientRect();
  const canvasPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };

  if (block.style.curve.mode === 'custom' && curveEditMode) {
    const hitIdx = hitTestCurvePoint(canvasPt);
    if (hitIdx !== -1) {
      draggingCurvePointIndex = hitIdx;
      els.canvas.setPointerCapture(e.pointerId);
      draw();
      return;
    }
  }

  if (block.style.deform.enabled && deformEditMode) {
    const hitIdx = hitTestDeformPoint(canvasPt);
    if (hitIdx !== -1) {
      draggingDeformPointIndex = hitIdx;
      els.canvas.setPointerCapture(e.pointerId);
      draw();
      return;
    }
  }

  const hitBlock = hitTestTextBlock(canvasPt);
  if (!hitBlock) return;
  if (hitBlock.id !== block.id) selectTextBlock(hitBlock.id, false);

  dragOffset = {
    x: e.clientX - rect.left - block.transform.x,
    y: e.clientY - rect.top - block.transform.y,
  };
  els.canvas.setPointerCapture(e.pointerId);
});
els.canvas.addEventListener('pointermove', (e) => {
  const rect = els.canvas.getBoundingClientRect();

  if (draggingCurvePointIndex !== null) {
    const inv = Renderer.blockMatrix(block.layout, block.transform).inverse();
    const local = inv.transformPoint(new DOMPoint(e.clientX - rect.left, e.clientY - rect.top));
    const p = block.style.curve.custom.points[draggingCurvePointIndex];
    p.x = local.x;
    p.y = local.y;
    renderCustomPointList();
    draw();
    return;
  }

  if (draggingDeformPointIndex !== null) {
    const inv = Renderer.blockMatrix(block.layout, block.transform).inverse();
    const local = inv.transformPoint(new DOMPoint(e.clientX - rect.left, e.clientY - rect.top));
    DeformSystem.setPointFromLocal(block.style.deform, block.layout, draggingDeformPointIndex, local.x, local.y);
    draw();
    return;
  }

  if (!dragOffset) return;
  block.transform.x = e.clientX - rect.left - dragOffset.x;
  block.transform.y = e.clientY - rect.top - dragOffset.y;
  draw();
});
function finishCanvasGesture() {
  dragOffset = null;
  draggingCurvePointIndex = null;
  draggingDeformPointIndex = null;
  if (historyReady) HistorySystem.commit(serializeProjectState(), 'Transformación sobre el lienzo');
}
els.canvas.addEventListener('pointerup', finishCanvasGesture);
els.canvas.addEventListener('pointercancel', finishCanvasGesture);

/* Doble clic sobre un punto (en modo edición) lo elimina, si quedan al menos 2. */
els.canvas.addEventListener('dblclick', (e) => {
  if (block.style.curve.mode !== 'custom' || !curveEditMode) return;
  const rect = els.canvas.getBoundingClientRect();
  const idx = hitTestCurvePoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  if (idx === -1) return;
  const pts = block.style.curve.custom.points;
  if (pts.length <= 2) return;
  block.style.curve.custom.points = pts.filter((_, i) => i !== idx);
  renderCustomPointList();
  draw();
});

/* ---------------- Fase 8: serialización, capas, historial y guardado ---------------- */

function serializeProjectState() {
  design.blocks.forEach((target) => {
    if (!target.layers || !window.LayerSystem) return;
    LayerSystem.syncActiveFill(target);
    LayerSystem.syncStrokes(target);
  });
  const usedFontIds = [...new Set(design.blocks.map((target) => target.fontId).filter(Boolean))];
  const fontRefs = usedFontIds.map((id) => FontLibrary.getById(id)).filter(Boolean).map((font) => ({
    id: font.id, fileName: font.fileName, family: font.family, subfamily: font.subfamily,
  }));
  return {
    schema: 'text-effects-studio-project',
    version: 8.1,
    fontRefs,
    exportSettings: { ...exportSettings },
    activeBlockId: block.id,
    blocks: design.blocks.map(cleanTextBlock),
  };
}

function serializePersistedProjectState() {
  const state = serializeProjectState();
  const fontIds = [...new Set(design.blocks.map((target) => target.fontId).filter(Boolean))];
  state.embeddedFonts = fontIds.map((id) => FontLibrary.getById(id)).filter((font) => font?.buffer).map((font) => ({
    fileName: font.fileName, id: font.id, base64: bufferToBase64(font.buffer),
  }));
  return state;
}

async function importEmbeddedFontsFromState(state) {
  const embeddedFonts = state?.embeddedFonts || (state?.embeddedFont ? [state.embeddedFont] : []);
  for (const embedded of embeddedFonts) {
    if (embedded?.base64) await FontLibrary.importBuffer(base64ToBuffer(embedded.base64), embedded.fileName, embedded.id);
  }
  if (embeddedFonts.length) renderFontList();
}

function imageFromSrc(src) {
  return new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

async function hydrateImageFill(imageFill) {
  if (!imageFill?.images) return;
  await Promise.all(imageFill.images.map(async (layer) => { layer.image = await imageFromSrc(layer.src); }));
}

function resolveFontReference(state, target) {
  const refs = state.fontRefs || (state.fontRef ? [state.fontRef] : []);
  const ref = refs.find((item) => item.id === target.fontId) || refs.find((item) => item.fileName);
  const requestedId = target.fontId;
  const match = FontLibrary.getById(requestedId)
    || FontLibrary.loaded.find((font) => ref && font.fileName === ref.fileName && font.family === ref.family)
    || FontLibrary.loaded[0]
    || null;
  return match?.id || null;
}

async function applyProjectState(state, options = {}) {
  const rawBlocks = state?.blocks || (state?.block ? [state.block] : null);
  if (!state || state.schema !== 'text-effects-studio-project' || !rawBlocks?.length) {
    throw new Error('El archivo no es un proyecto válido de Text Effects Studio.');
  }
  design.blocks = rawBlocks.map((raw, index) => makeTextBlock({ ...JSON.parse(JSON.stringify(raw)), name: raw.name || `Texto ${index + 1}` }));
  for (const target of design.blocks) {
    target.layout = null;
    target.fontId = resolveFontReference(state, target);
    target.style.strokes.forEach((stroke) => {
      stroke.gradient = ensureGradientModel(stroke.gradient, stroke.colorStart || '#111111', stroke.colorEnd || '#7c3aed');
      stroke.gradientType ||= 'linear';
    });
    target.style.shadow.gradient = ensureGradientModel(target.style.shadow.gradient, '#000000', '#7c3aed');
    await hydrateTextBlockImages(target);
    LayerSystem.initialize(target);
    LayerSystem.relinkActive(target);
  }
  block = design.blocks.find((target) => target.id === state.activeBlockId) || design.blocks[0];
  design.activeBlockId = block.id;
  if (state.exportSettings) Object.assign(exportSettings, state.exportSettings);
  syncUIFromBlock();
  syncExportUI();
  refresh();
  if (!options.fromHistory) HistorySystem.reset(serializeProjectState(), options.label || 'Proyecto abierto');
}

function setControl(input, value, readout, formatted) {
  if (input) input.value = value;
  if (readout) readout.textContent = formatted == null ? value : formatted;
}

function syncUIFromBlock() {
  const style = block.style;
  els.textArea.value = block.content;
  setControl(els.sizeRange, block.fontSize, els.sizeValue, `${block.fontSize}px`);
  setControl(els.trackingRange, block.tracking, els.trackingValue, `${block.tracking}px`);
  setControl(els.leadingRange, block.leading, els.leadingValue, `${Number(block.leading).toFixed(2)}×`);
  els.alignButtons.forEach((button) => button.classList.toggle('active', button.dataset.align === block.align));
  renderFontList();

  els.fillTabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.fill === style.fillType));
  Object.entries(fillPanels).forEach(([key, panel]) => panel.classList.toggle('hidden', key !== style.fillType));
  els.fillColor.value = style.fillColor;
  setControl(els.opacityRange, Math.round(style.opacity * 100), els.opacityValue, `${Math.round(style.opacity * 100)}%`);
  setControl(els.gradientAngle, style.gradient.angle, els.gradientAngleValue, `${style.gradient.angle}°`);
  renderGradientUI();
  renderImageFillUI();
  renderStrokeList();

  els.shadowEnabled.checked = style.shadow.enabled;
  els.shadowControls.classList.toggle('hidden', !style.shadow.enabled);
  setControl(els.shadowX, style.shadow.offsetX, els.shadowXValue, `${style.shadow.offsetX}px`);
  setControl(els.shadowY, style.shadow.offsetY, els.shadowYValue, `${style.shadow.offsetY}px`);
  setControl(els.shadowBlur, style.shadow.blur, els.shadowBlurValue, `${style.shadow.blur}px`);
  setControl(els.shadowSpread, style.shadow.spread, els.shadowSpreadValue, `${style.shadow.spread}px`);
  setControl(els.shadowOpacity, Math.round(style.shadow.opacity * 100), els.shadowOpacityValue, `${Math.round(style.shadow.opacity * 100)}%`);
  els.shadowColor.value = style.shadow.color;
  els.shadowFillTabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.shadowfill === style.shadow.fillType));
  els.shadowSolidControls.classList.toggle('hidden', style.shadow.fillType !== 'solid');
  els.shadowGradientControls.classList.toggle('hidden', style.shadow.fillType !== 'gradient');
  els.shadowGradTypeTabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.gradtype === style.shadow.gradientType));
  style.shadow.gradient = ensureGradientModel(style.shadow.gradient, '#000000', '#7c3aed');
  renderInlineGradientEditor(els.shadowGradientEditor, style.shadow.gradient, refresh);

  const toggleEffect = (enabledEl, controlsEl, effect) => {
    enabledEl.checked = effect.enabled;
    controlsEl.classList.toggle('hidden', !effect.enabled);
  };
  toggleEffect(els.innerShadowEnabled, els.innerShadowControls, style.innerShadow);
  setControl(els.innerDepth, style.innerShadow.depth, els.innerDepthValue, `${Number(style.innerShadow.depth).toFixed(1)}×`);
  setControl(els.innerBlur, style.innerShadow.blur, els.innerBlurValue, `${style.innerShadow.blur}px`);
  setControl(els.innerX, style.innerShadow.offsetX, els.innerXValue, `${style.innerShadow.offsetX}px`);
  setControl(els.innerY, style.innerShadow.offsetY, els.innerYValue, `${style.innerShadow.offsetY}px`);
  els.innerColor.value = style.innerShadow.color;
  els.innerOpacity.value = Math.round(style.innerShadow.opacity * 100);

  toggleEffect(els.glowEnabled, els.glowControls, style.glow);
  els.glowColor.value = style.glow.color;
  els.glowOpacity.value = Math.round(style.glow.opacity * 100);
  setControl(els.glowBlur, style.glow.blur, els.glowBlurValue, `${style.glow.blur}px`);
  setControl(els.glowIntensity, style.glow.intensity, els.glowIntensityValue, `${style.glow.intensity}`);

  toggleEffect(els.innerGlowEnabled, els.innerGlowControls, style.innerGlow);
  els.innerGlowColor.value = style.innerGlow.color;
  els.innerGlowOpacity.value = Math.round(style.innerGlow.opacity * 100);
  setControl(els.innerGlowBlur, style.innerGlow.blur, els.innerGlowBlurValue, `${style.innerGlow.blur}px`);

  toggleEffect(els.bevelEnabled, els.bevelControls, style.bevel);
  setControl(els.bevelAngle, style.bevel.angle, els.bevelAngleValue, `${style.bevel.angle}°`);
  setControl(els.bevelSize, style.bevel.size, els.bevelSizeValue, `${style.bevel.size}px`);
  setControl(els.bevelSoftness, style.bevel.softness, els.bevelSoftnessValue, `${style.bevel.softness}px`);
  setControl(els.bevelStrength, Math.round(style.bevel.strength * 100), els.bevelStrengthValue, `${Math.round(style.bevel.strength * 100)}%`);
  els.bevelHighlightColor.value = style.bevel.highlightColor;
  els.bevelShadowColor.value = style.bevel.shadowColor;

  toggleEffect(els.extrudeEnabled, els.extrudeControls, style.extrude);
  setControl(els.extrudeDepth, style.extrude.depth, els.extrudeDepthValue, `${style.extrude.depth}px`);
  setControl(els.extrudeAngle, style.extrude.angle, els.extrudeAngleValue, `${style.extrude.angle}°`);
  setControl(els.extrudeStep, style.extrude.step, els.extrudeStepValue, `${style.extrude.step}px`);
  els.extrudeFillTabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.extrudefill === style.extrude.colorMode));
  els.extrudeSolidControls.classList.toggle('hidden', style.extrude.colorMode !== 'solid');
  els.extrudeGradientControls.classList.toggle('hidden', style.extrude.colorMode !== 'gradient');
  els.extrudeColor.value = style.extrude.color;
  els.extrudeColorNear.value = style.extrude.colorNear;
  els.extrudeColorFar.value = style.extrude.colorFar;
  els.extrudeEdgeEnabled.checked = style.extrude.edgeEnabled;
  els.extrudeEdgeColor.value = style.extrude.edgeColor;
  els.extrudeEdgeOpacity.value = Math.round(style.extrude.edgeOpacity * 100);

  setGeneralRotation(block.transform.rotation, false);
  setControl(els.scaleXRange, block.transform.scaleX, els.scaleXValue, `${Number(block.transform.scaleX).toFixed(2)}×`);
  setControl(els.scaleYRange, block.transform.scaleY, els.scaleYValue, `${Number(block.transform.scaleY).toFixed(2)}×`);
  setControl(els.skewXRange, block.transform.skewX, els.skewXValue, `${block.transform.skewX}°`);
  setControl(els.skewYRange, block.transform.skewY, els.skewYValue, `${block.transform.skewY}°`);

  const curve = style.curve;
  els.curveTabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.curvemode === curve.mode));
  Object.entries(curvePanels).forEach(([key, panel]) => panel.classList.toggle('hidden', key !== curve.mode));
  setControl(els.arcIntensity, curve.arc.intensity, els.arcIntensityValue, `${curve.arc.intensity}%`);
  setControl(els.arcPosition, curve.arc.position, els.arcPositionValue, `${curve.arc.position}px`);
  els.arcInvert.checked = curve.arc.invert;
  els.arcDirection.forEach((btn) => btn.classList.toggle('active', Number(btn.dataset.arcdir) === curve.arc.direction));
  setControl(els.circleRadius, curve.circle.radius, els.circleRadiusValue, `${curve.circle.radius}px`);
  setControl(els.circleStartAngle, curve.circle.startAngle, els.circleStartAngleValue, `${curve.circle.startAngle}°`);
  setControl(els.circleEndAngle, curve.circle.endAngle, els.circleEndAngleValue, `${curve.circle.endAngle}°`);
  setControl(els.circleLetterSpacing, curve.circle.letterSpacing, els.circleLetterSpacingValue, `${curve.circle.letterSpacing}px`);
  setControl(els.circleCenterX, curve.circle.centerX, els.circleCenterXValue, `${curve.circle.centerX}px`);
  setControl(els.circleCenterY, curve.circle.centerY, els.circleCenterYValue, `${curve.circle.centerY}px`);
  els.circleDirection.forEach((btn) => btn.classList.toggle('active', Number(btn.dataset.circledir) === curve.circle.direction));
  els.circleOrientation.forEach((btn) => btn.classList.toggle('active', btn.dataset.circleorient === curve.circle.orientation));
  els.customCurveType.forEach((btn) => btn.classList.toggle('active', btn.dataset.curvetype === curve.custom.curveType));
  if (curve.custom.points?.length) renderCustomPointList();

  const deform = style.deform;
  els.deformEnabled.checked = deform.enabled;
  els.deformControls.classList.toggle('hidden', !deform.enabled);
  els.deformInterpTabs.forEach((btn) => btn.classList.toggle('active', btn.dataset.deforminterp === deform.interpolation));
  setControl(els.deformRows, deform.rows, els.deformRowsValue, `${deform.rows}`);
  setControl(els.deformCols, deform.cols, els.deformColsValue, `${deform.cols}`);
  renderTextLayerList();
  renderEffectLayerList();
}

const layerPanelByKind = {
  fill: () => els.fillColor.closest('.panel-section'),
  stroke: () => els.strokeList.closest('.panel-section'),
  shadow: () => els.shadowEnabled.closest('.panel-section'),
  innerShadow: () => els.innerShadowEnabled.closest('.panel-section'),
  glow: () => els.glowEnabled.closest('.panel-section'),
  innerGlow: () => els.innerGlowEnabled.closest('.panel-section'),
  bevel: () => els.bevelEnabled.closest('.panel-section'),
  extrude: () => els.extrudeEnabled.closest('.panel-section'),
};

function cleanTextBlock(target) {
  return JSON.parse(JSON.stringify(target, (key, value) => {
    if (key === 'layout' || key === 'image' || key === 'otFont' || key === 'buffer') return undefined;
    return value;
  }));
}

async function hydrateTextBlockImages(target) {
  await hydrateImageFill(target.style?.imageFill);
  await Promise.all((target.layers || []).filter((layer) => layer.kind === 'fill').map((layer) => hydrateImageFill(layer.data?.imageFill)));
}

async function duplicateActiveText() {
  if (!block) return;
  if (block.layers) LayerSystem.syncActiveFill(block);
  const copyData = cleanTextBlock(block);
  copyData.id = textBlockId();
  copyData.name = `${block.name || 'Texto'} copia`;
  copyData.transform.x += 28;
  copyData.transform.y += 28;
  copyData.layout = null;
  const copy = makeTextBlock(copyData);
  await hydrateTextBlockImages(copy);
  LayerSystem.initialize(copy);
  LayerSystem.relinkActive(copy);
  const index = design.blocks.indexOf(block);
  design.blocks.splice(index + 1, 0, copy);
  design.activeBlockId = copy.id;
  block = copy;
  syncUIFromBlock();
  refresh();
  renderTextLayerList();
  if (historyReady) HistorySystem.commit(serializeProjectState(), 'Duplicar texto');
}

function addTextBlock() {
  const next = makeTextBlock({
    name: `Texto ${design.blocks.length + 1}`,
    content: 'Nuevo texto',
    fontId: block?.fontId || FontLibrary.loaded[0]?.id || null,
    transform: {
      x: els.canvas.width / 2 + design.blocks.length * 24,
      y: els.canvas.height / 2 + design.blocks.length * 24,
      rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0,
    },
  });
  LayerSystem.initialize(next);
  design.blocks.push(next);
  design.activeBlockId = next.id;
  block = next;
  syncUIFromBlock();
  refresh();
  renderTextLayerList();
  els.textArea.focus();
  els.textArea.select();
}

function moveTextBlock(id, delta) {
  const index = design.blocks.findIndex((target) => target.id === id);
  const next = Math.max(0, Math.min(design.blocks.length - 1, index + delta));
  if (index < 0 || index === next) return;
  const [target] = design.blocks.splice(index, 1);
  design.blocks.splice(next, 0, target);
  renderTextLayerList();
  refresh();
}

function deleteTextBlock(id) {
  if (design.blocks.length <= 1) {
    block.content = '';
    block.name = 'Texto 1';
    els.textArea.value = '';
    renderTextLayerList();
    refresh();
    return;
  }
  const index = design.blocks.findIndex((target) => target.id === id);
  design.blocks = design.blocks.filter((target) => target.id !== id);
  const fallback = design.blocks[Math.min(Math.max(0, index - 1), design.blocks.length - 1)];
  selectTextBlock(fallback.id, false);
  refresh();
}

function renderTextLayerList() {
  if (!els.textLayerList) return;
  els.textLayerList.innerHTML = '';
  [...design.blocks].reverse().forEach((target) => {
    const item = document.createElement('div');
    item.className = `text-layer${target.id === block.id ? ' active' : ''}${target.visible ? '' : ' muted'}`;
    item.innerHTML = `
      <button class="layer-visibility" title="Mostrar u ocultar">${target.visible ? '👁' : '◌'}</button>
      <div class="effect-layer-main"><div class="text-layer-name"></div><div class="text-layer-preview"></div><div class="layer-opacity-row"><input class="text-opacity" type="range" min="0" max="100" value="${Math.round((target.opacity ?? 1) * 100)}"><span>${Math.round((target.opacity ?? 1) * 100)}%</span></div></div>
      <div class="text-layer-actions-mini"><button class="text-up" title="Subir">↑</button><button class="text-down" title="Bajar">↓</button><button class="text-duplicate" title="Duplicar">⧉</button><button class="text-delete" title="Eliminar">×</button></div>`;
    item.querySelector('.text-layer-name').textContent = target.name || 'Texto';
    item.querySelector('.text-layer-preview').textContent = target.content.replace(/\n/g, ' ') || '(vacío)';
    item.addEventListener('click', (event) => {
      if (event.target.closest('button,input')) return;
      selectTextBlock(target.id);
    });
    item.querySelector('.text-layer-name').addEventListener('dblclick', (event) => {
      event.stopPropagation();
      const name = prompt('Nombre de la capa:', target.name || 'Texto');
      if (name?.trim()) { target.name = name.trim(); renderTextLayerList(); refresh(); }
    });
    item.querySelector('.layer-visibility').addEventListener('click', () => { target.visible = !target.visible; renderTextLayerList(); draw(); });
    const opacity = item.querySelector('.text-opacity');
    opacity.addEventListener('input', () => { target.opacity = Number(opacity.value) / 100; item.querySelector('.layer-opacity-row span').textContent = `${opacity.value}%`; draw(); });
    item.querySelector('.text-up').addEventListener('click', () => moveTextBlock(target.id, 1));
    item.querySelector('.text-down').addEventListener('click', () => moveTextBlock(target.id, -1));
    item.querySelector('.text-duplicate').addEventListener('click', async () => { selectTextBlock(target.id, false); await duplicateActiveText(); });
    item.querySelector('.text-delete').addEventListener('click', () => deleteTextBlock(target.id));
    els.textLayerList.appendChild(item);
  });
}

els.addTextBtn.addEventListener('click', addTextBlock);
els.duplicateSelectedTextBtn.addEventListener('click', duplicateActiveText);
els.duplicateTextBtn.addEventListener('click', duplicateActiveText);

function renderEffectLayerList() {
  if (!block.layers) return;
  els.effectLayerList.innerHTML = '';
  [...block.layers].reverse().forEach((layer) => {
    if (layer.kind === 'stroke') {
      const idx = block.style.strokes.findIndex((stroke) => stroke.id === layer.sourceId);
      layer.name = `Contorno ${Math.max(1, idx + 1)}`;
    }
    const item = document.createElement('div');
    item.className = `effect-layer${layer.id === block.activeLayerId ? ' active' : ''}${layer.visible ? '' : ' muted'}`;
    item.innerHTML = `
      <button class="layer-visibility" title="Mostrar u ocultar">${layer.visible ? '👁' : '◌'}</button>
      <div class="effect-layer-main">
        <div class="effect-layer-name"><span>${layer.name}</span><span class="layer-kind">${layer.kind}</span></div>
        <div class="layer-opacity-row"><input class="layer-opacity" type="range" min="0" max="100" value="${Math.round(layer.opacity * 100)}"><span>${Math.round(layer.opacity * 100)}%</span></div>
      </div>
      <div class="effect-layer-actions">
        <button class="layer-up" title="Subir (hacia el frente)">↑</button>
        <button class="layer-down" title="Bajar (hacia el fondo)">↓</button>
        <button class="layer-edit" title="Editar esta capa">✎</button>
        <button class="layer-duplicate" title="Duplicar">⧉</button>
        <button class="layer-remove danger" title="Eliminar">×</button>
      </div>`;
    item.querySelector('.layer-visibility').addEventListener('click', () => { layer.visible = !layer.visible; renderEffectLayerList(); refresh(); });
    const opacity = item.querySelector('.layer-opacity');
    opacity.addEventListener('input', () => {
      layer.opacity = Number(opacity.value) / 100;
      item.querySelector('.layer-opacity-row span').textContent = `${opacity.value}%`;
      draw();
    });
    item.querySelector('.layer-up').addEventListener('click', () => { LayerSystem.move(block, layer.id, 1); renderEffectLayerList(); refresh(); });
    item.querySelector('.layer-down').addEventListener('click', () => { LayerSystem.move(block, layer.id, -1); renderEffectLayerList(); refresh(); });
    item.querySelector('.layer-edit').addEventListener('click', () => {
      LayerSystem.activate(block, layer.id);
      syncUIFromBlock();
      refresh();
      layerPanelByKind[layer.kind]?.()?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    item.querySelector('.layer-duplicate').addEventListener('click', () => {
      const copy = LayerSystem.duplicate(block, layer.id);
      if (copy) LayerSystem.activate(block, copy.id);
      syncUIFromBlock();
      refresh();
    });
    item.querySelector('.layer-remove').addEventListener('click', () => {
      LayerSystem.remove(block, layer.id);
      syncUIFromBlock();
      refresh();
    });
    els.effectLayerList.appendChild(item);
  });
}

els.restoreLayersBtn.addEventListener('click', () => {
  LayerSystem.restoreMissing(block);
  renderEffectLayerList();
  refresh();
});

function setSaveStatus(message, isError = false) {
  els.saveStatus.textContent = message;
  els.saveStatus.classList.remove('hidden');
  els.saveStatus.classList.toggle('error', isError);
}

function thumbnailDataUrl() {
  try { return els.canvas.toDataURL('image/jpeg', 0.65); }
  catch (_) { return null; }
}

function formatSavedDate(timestamp) {
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(timestamp));
}

async function renderDocumentLists() {
  const [projects, templates] = await Promise.all([StorageSystem.list('project'), StorageSystem.list('template')]);
  renderDocumentList(els.projectList, projects, false);
  renderDocumentList(els.templateList, templates, true);
}

function renderDocumentList(container, records, isTemplate) {
  container.innerHTML = '';
  if (!records.length) {
    container.innerHTML = `<div class="empty-hint">Aún no hay ${isTemplate ? 'plantillas' : 'proyectos'} guardados.</div>`;
    return;
  }
  records.forEach((record) => {
    const card = document.createElement('div');
    card.className = 'document-card';
    card.innerHTML = `
      ${record.thumbnail ? `<img class="document-thumb" src="${record.thumbnail}" alt="">` : '<div class="document-thumb"></div>'}
      <div class="document-meta">
        <div class="document-name"></div><div class="document-date">${formatSavedDate(record.updatedAt)}</div>
        <div class="document-actions"><button class="doc-open">${isTemplate ? 'Usar' : 'Abrir'}</button><button class="doc-duplicate">Duplicar</button><button class="doc-rename">Renombrar</button><button class="doc-delete">Eliminar</button></div>
      </div>`;
    card.querySelector('.document-name').textContent = record.name;
    card.querySelector('.doc-open').addEventListener('click', async () => {
      await importEmbeddedFontsFromState(record.state);
      await applyProjectState(record.state, { label: isTemplate ? 'Nueva composición desde plantilla' : 'Proyecto abierto' });
      currentProjectId = isTemplate ? null : record.id;
      els.documentName.value = isTemplate ? `${record.name} — nuevo` : record.name;
      setSaveStatus(isTemplate ? 'Plantilla aplicada como una composición nueva.' : 'Proyecto abierto correctamente.');
    });
    card.querySelector('.doc-duplicate').addEventListener('click', async () => { await StorageSystem.duplicate(record.id); await renderDocumentLists(); });
    card.querySelector('.doc-rename').addEventListener('click', async () => {
      const name = prompt('Nuevo nombre:', record.name);
      if (name) { await StorageSystem.rename(record.id, name); await renderDocumentLists(); }
    });
    card.querySelector('.doc-delete').addEventListener('click', async () => {
      if (!confirm(`¿Eliminar “${record.name}”?`)) return;
      await StorageSystem.remove(record.id);
      if (currentProjectId === record.id) currentProjectId = null;
      await renderDocumentLists();
    });
    container.appendChild(card);
  });
}

els.saveProjectBtn.addEventListener('click', async () => {
  try {
    const record = await StorageSystem.save('project', { id: currentProjectId, name: els.documentName.value, state: serializePersistedProjectState(), thumbnail: thumbnailDataUrl() });
    currentProjectId = record.id;
    setSaveStatus('Proyecto guardado en este dispositivo.');
    await renderDocumentLists();
  } catch (error) { setSaveStatus(error.message || 'No se pudo guardar el proyecto.', true); }
});

els.saveTemplateBtn.addEventListener('click', async () => {
  try {
    await StorageSystem.save('template', { name: els.documentName.value, state: serializePersistedProjectState(), thumbnail: thumbnailDataUrl() });
    setSaveStatus('Plantilla guardada permanentemente en la galería.');
    await renderDocumentLists();
  } catch (error) { setSaveStatus(error.message || 'No se pudo guardar la plantilla.', true); }
});

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

els.exportProjectBtn.addEventListener('click', () => {
  const state = serializePersistedProjectState();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${(els.documentName.value || 'text-effects-project').replace(/[^\p{L}\p{N}_-]+/gu, '-')}.tes.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setSaveStatus('Archivo de proyecto exportado con todas las fuentes utilizadas incluidas.');
});

els.importProjectBtn.addEventListener('click', () => els.projectFileInput.click());
els.projectFileInput.addEventListener('change', async () => {
  const file = els.projectFileInput.files[0];
  if (!file) return;
  try {
    const state = JSON.parse(await file.text());
    await importEmbeddedFontsFromState(state);
    await applyProjectState(state, { label: 'Proyecto importado' });
    currentProjectId = null;
    els.documentName.value = file.name.replace(/\.tes\.json$|\.json$/i, '');
    setSaveStatus('Proyecto importado correctamente.');
  } catch (error) { setSaveStatus(error.message || 'No se pudo importar el proyecto.', true); }
  els.projectFileInput.value = '';
});

let initialProjectState = null;
els.newProjectBtn.addEventListener('click', async () => {
  if (!initialProjectState) return;
  await applyProjectState(initialProjectState, { label: 'Proyecto nuevo' });
  currentProjectId = null;
  els.documentName.value = 'Mi diseño';
  setSaveStatus('Se creó un proyecto nuevo.');
});

els.undoBtn.addEventListener('click', () => HistorySystem.undo());
els.redoBtn.addEventListener('click', () => HistorySystem.redo());
document.addEventListener('keydown', (event) => {
  if (!(event.ctrlKey || event.metaKey)) return;
  const key = event.key.toLocaleLowerCase();
  if (key === 'd' && !event.altKey) { event.preventDefault(); duplicateActiveText(); }
  else if (key === 'z' && event.shiftKey) { event.preventDefault(); HistorySystem.redo(); }
  else if (key === 'z') { event.preventDefault(); HistorySystem.undo(); }
  else if (key === 'y') { event.preventDefault(); HistorySystem.redo(); }
});

/* ---------------- Fase 9: exportación PNG / SVG / PDF ---------------- */

function exportOptions() {
  return {
    ...exportSettings,
    name: window.StudioNaming ? window.StudioNaming.base('TXT') : `TXT-${Date.now().toString(36).toUpperCase()}`,
    baseWidth: els.canvas.width,
    baseHeight: els.canvas.height,
  };
}

function updateExportInfo() {
  const width = Math.max(1, Number(exportSettings.width) || 1);
  const height = Math.max(1, Number(exportSettings.height) || 1);
  const megapixels = width * height / 1000000;
  els.exportInfo.textContent = `${Math.round(width)} × ${Math.round(height)} px · ${megapixels.toFixed(2)} MP`;
  const widthCm = width / exportSettings.dpi * 2.54;
  const heightCm = height / exportSettings.dpi * 2.54;
  els.pdfSizeHint.textContent = `Página final: ${widthCm.toFixed(2)} × ${heightCm.toFixed(2)} cm a ${exportSettings.dpi} DPI.`;
  els.exportFinalBtn.textContent = `Exportar ${exportSettings.format.toUpperCase()} en alta calidad`;
}

function syncExportUI() {
  els.exportFormatTabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.exportFormat === exportSettings.format));
  els.exportWidth.value = Math.round(exportSettings.width);
  els.exportHeight.value = Math.round(exportSettings.height);
  els.exportLockRatio.checked = !!exportSettings.lockRatio;
  els.exportDpi.value = String(exportSettings.dpi);
  els.pdfDpiRow.classList.toggle('hidden', exportSettings.format !== 'pdf');
  els.exportTransparent.checked = !!exportSettings.transparent;
  els.exportBackgroundColor.value = exportSettings.backgroundColor;
  els.exportBackgroundColor.disabled = exportSettings.transparent;
  els.exportCrop.checked = !!exportSettings.crop;
  const scale = exportSettings.width / els.canvas.width;
  els.exportScaleButtons.forEach((button) => button.classList.toggle('active', Math.abs(Number(button.dataset.exportScale) - scale) < 0.001));
  updateExportInfo();
}

els.exportFormatTabs.forEach((tab) => tab.addEventListener('click', () => {
  exportSettings.format = tab.dataset.exportFormat;
  syncExportUI();
}));

els.exportScaleButtons.forEach((button) => button.addEventListener('click', () => {
  const scale = Number(button.dataset.exportScale);
  exportSettings.width = els.canvas.width * scale;
  exportSettings.height = els.canvas.height * scale;
  syncExportUI();
}));

els.exportWidth.addEventListener('input', () => {
  exportSettings.width = Math.max(1, Number(els.exportWidth.value) || 1);
  if (exportSettings.lockRatio) exportSettings.height = Math.round(exportSettings.width * els.canvas.height / els.canvas.width);
  syncExportUI();
});
els.exportHeight.addEventListener('input', () => {
  exportSettings.height = Math.max(1, Number(els.exportHeight.value) || 1);
  if (exportSettings.lockRatio) exportSettings.width = Math.round(exportSettings.height * els.canvas.width / els.canvas.height);
  syncExportUI();
});
els.exportLockRatio.addEventListener('change', () => { exportSettings.lockRatio = els.exportLockRatio.checked; syncExportUI(); });
els.exportDpi.addEventListener('change', () => { exportSettings.dpi = Number(els.exportDpi.value); updateExportInfo(); });
els.exportTransparent.addEventListener('change', () => { exportSettings.transparent = els.exportTransparent.checked; syncExportUI(); });
els.exportBackgroundColor.addEventListener('input', () => { exportSettings.backgroundColor = els.exportBackgroundColor.value; });
els.exportCrop.addEventListener('change', () => { exportSettings.crop = els.exportCrop.checked; });

function setExportStatus(message, isError = false) {
  els.exportStatus.textContent = message;
  els.exportStatus.classList.remove('hidden');
  els.exportStatus.classList.toggle('error', isError);
}

els.exportFinalBtn.addEventListener('click', async () => {
  try {
    recalcAllLayouts();
    if (!design.blocks.some((target) => target.visible && target.layout)) throw new Error('No hay texto visible para exportar. Importa una fuente y crea un diseño primero.');
    els.exportFinalBtn.disabled = true;
    setExportStatus('Renderizando a resolución final…');
    let result;
    if (exportSettings.format === 'svg') {
      result = await ExportSystem.exportSvg(design, exportOptions());
      const hybrid = result.rasterBlocks ? ` ${result.vectorBlocks} texto(s) vectoriales y ${result.rasterBlocks} rasterizado(s) por usar efectos no compatibles con SVG puro.` : ` Los ${result.vectorBlocks} texto(s) se conservaron como vectores.`;
      setExportStatus(`SVG exportado a ${result.width} × ${result.height}.${hybrid}`);
    } else if (exportSettings.format === 'pdf') {
      result = await ExportSystem.exportPdf(design, exportOptions());
      setExportStatus(`PDF exportado a ${result.dpi} DPI (${(result.widthPt / 72 * 2.54).toFixed(2)} × ${(result.heightPt / 72 * 2.54).toFixed(2)} cm).`);
    } else {
      result = await ExportSystem.exportPng(design, exportOptions());
      setExportStatus(`PNG exportado a ${result.width} × ${result.height} px${exportSettings.transparent ? ' con transparencia' : ''}.`);
    }
  } catch (error) {
    setExportStatus(error.message || 'No se pudo completar la exportación.', true);
  } finally {
    els.exportFinalBtn.disabled = false;
  }
});

els.exportPngBtn.addEventListener('click', () => els.exportSection.scrollIntoView({ behavior: 'smooth', block: 'start' }));
syncExportUI();

/* ---------------- Arranque ---------------- */

(async function init() {
  await FontLibrary.init();
  renderFontList();
  if (FontLibrary.loaded.length) {
    block.fontId = FontLibrary.loaded[0].id;
    els.fontSelect.value = block.fontId;
  }
  LayerSystem.initialize(block);
  syncUIFromBlock();
  refresh();
  initialProjectState = serializeProjectState();
  HistorySystem.configure({
    initialState: initialProjectState,
    applyState: applyProjectState,
    onChange: ({ canUndo, canRedo }) => {
      els.undoBtn.disabled = !canUndo;
      els.redoBtn.disabled = !canRedo;
    },
  });
  historyReady = true;
  await renderDocumentLists();
  if (window.StudioGallery) {
    try {
      const launch = await StudioGallery.consumeLaunchIntent('text');
      if (launch?.payload) {
        await importEmbeddedFontsFromState(launch.payload);
        await applyProjectState(launch.payload, { label: launch.kind === 'template' ? 'Nueva composición desde plantilla' : 'Proyecto abierto desde galería' });
        currentProjectId = launch.kind === 'template' ? null : launch.id;
        els.documentName.value = launch.kind === 'template' ? `${launch.name} — nuevo` : launch.name;
        setSaveStatus(launch.kind === 'template' ? 'Plantilla aplicada desde la Galería.' : 'Proyecto abierto desde la Galería.');
      }
    } catch (error) { setSaveStatus(error.message || 'No se pudo abrir el proyecto desde la Galería.', true); }
  }
  window.TextStudio = { design, get block() { return block; }, serializeProjectState, applyProjectState, refresh, duplicateActiveText, addTextBlock };
  document.dispatchEvent(new CustomEvent('text-studio-ready'));
})();
