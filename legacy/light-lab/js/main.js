import { LIGHT_LAB_CATEGORIES, categoryById } from './presets.js';
import { createStore } from './state.js';
import { DEFAULT_PARAMS, generateDetailedPalette } from './paletteEngine.js';
import { normalizeHex, readableTextColor } from './colorUtils.js';
import { renderBasicPreview } from './renderer2d.js';
import { downloadProjectStructure } from './exportSystem.js';
import { SAMPLE_ROLES, addRecentColor, createExtractedSample, imageBlobFromFile, imageBlobFromPasteEvent, readImageFromClipboard, renderImageBlob, sampleCanvasAtPointer } from './extractionSystem.js';
import { LIGHTING_SCENES, MAX_DIRECT_LIGHTS, activeLights, applyLightingToPalette, createDirectLight, lightingSummary, sceneLighting } from './lightingEngine.js';

const VIEW_LABELS = { sphere: 'Estudio de volumen · esfera', band: 'Estudio de reflejo · banda', plane: 'Estudio tonal · plano', reference: 'Cuentagotas · imagen de referencia' };
const store = createStore();
window.LightLabStore = store;
const ADVANCED_PREVIEW_MODES = [
  ['sphere', 'Esfera'],
  ['cylinder', 'Cilindro'],
  ['plane', 'Plano'],
  ['skin', 'Piel'],
  ['metal', 'Metal'],
  ['gold', 'Oro'],
  ['silver', 'Plata'],
  ['steel', 'Acero'],
  ['head', 'Cabeza'],
  ['planes', 'Planos'],
  ['asaro', 'Cabeza de estudio'],
  ['reference', 'Imagen / Cuentagotas']
];

function setupAdvancedPreviewUI() {
  Object.assign(VIEW_LABELS, {
    cylinder: 'Estudio de volumen - cilindro',
    skin: 'Muestra organica - piel',
    metal: 'Estudio de reflejo - metal',
    gold: 'Material - oro',
    silver: 'Material - plata',
    steel: 'Material - acero',
    head: 'Cabeza simplificada',
    planes: 'Cabeza por planos',
    asaro: 'Cabeza para estudiar luz y sombra'
  });

  document.title = "Kaoru's Studio - Light Lab";
  const phaseBadge = document.querySelector('.lab-intro .eyebrow');
  if (phaseBadge) phaseBadge.textContent = 'LIGHT LAB';

  elements.previewTabs.replaceChildren(...ADVANCED_PREVIEW_MODES.map(([id, label], index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.view = id;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', String(index === 0));
    button.className = index === 0 ? 'is-active' : '';
    button.textContent = label;
    return button;
  }));

  if (!document.getElementById('lightLabPhase5Styles')) {
    const style = document.createElement('style');
    style.id = 'lightLabPhase5Styles';
    style.textContent = `
      .preview-toolbar{align-items:flex-start;gap:12px}
      .view-tabs{display:flex;flex-wrap:wrap;justify-content:flex-end;align-content:flex-start;gap:4px;max-width:min(720px,72%)}
      .view-tabs button{white-space:nowrap}
      @media(max-width:1500px){.view-tabs{max-width:66%}.view-tabs button{padding-inline:8px}}
      @media(max-width:1180px){.preview-toolbar{flex-direction:column}.view-tabs{max-width:100%;justify-content:flex-start}}
    `;
    document.head.appendChild(style);
  }
}

const byId = (id) => document.getElementById(id);
const elements = {
  categoryGrid: byId('categoryGrid'),
  basePicker: byId('baseColorPicker'), baseHex: byId('baseHexInput'), applyHex: byId('applyHexBtn'), hexError: byId('hexError'),
  lightingEnabled: byId('lightingEnabled'), lightingScenes: byId('lightingScenes'), activeLightsLabel: byId('activeLightsLabel'), addLight: byId('addLightBtn'), lightsList: byId('lightsList'), environmentControls: byId('environmentControls'),
  resetParams: byId('resetParamsBtn'), previewTitle: byId('previewTitle'), paletteName: byId('paletteName'), swatchGrid: byId('swatchGrid'),
  paletteViewTabs: byId('paletteViewTabs'), comparisonGrid: byId('comparisonGrid'),
  canvas: byId('previewCanvas'), modeLabel: byId('previewModeLabel'), previewTabs: byId('previewTabs'),
  canvasHint: byId('canvasHint'), referenceFile: byId('referenceFileInput'), pasteImage: byId('pasteImageBtn'), clearImage: byId('clearImageBtn'), imageStatus: byId('imageStatus'),
  referenceStage: byId('referenceStage'), referenceEmpty: byId('referenceEmpty'), referenceCanvas: byId('referenceCanvas'), marker: byId('eyedropperMarker'), dropOverlay: byId('dropOverlay'),
  stateCategory: byId('stateCategory'), stateBase: byId('stateBase'), stateLighting: byId('stateLighting'), stateColors: byId('stateColors'),
  editor: byId('swatchEditor'), editRole: byId('editRole'), editPicker: byId('editColorPicker'), editHex: byId('editHexInput'), editError: byId('editHexError'),
  closeEditor: byId('closeEditorBtn'), applyEdit: byId('applyEditBtn'),
  extractedCount: byId('extractedCount'), extractedEmpty: byId('extractedEmpty'), extractedColors: byId('extractedColors'), clearSamples: byId('clearSamplesBtn'),
  recentEmpty: byId('recentEmpty'), recentColors: byId('recentColors'),
  copyAll: byId('copyAllBtn'), download: byId('downloadStructureBtn'), toast: byId('toast')
};
let toastTimer = 0; let editingIndex = null; let lightsRenderSignature = '';
setupAdvancedPreviewUI();

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));
}

function showToast(message) {
  elements.toast.textContent = message; elements.toast.classList.add('is-visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => elements.toast.classList.remove('is-visible'), 1800);
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch (_) {
    const area = document.createElement('textarea'); area.value = text; area.style.position = 'fixed'; area.style.opacity = '0';
    document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove();
  }
}

function paletteFrom(state, baseHex = state.palette.baseHex, params = state.params) {
  const entries = generateDetailedPalette({ categoryId: state.selection.categoryId, baseHex, params });
  return { source: 'base-color', baseHex, entries, colors: entries.map((item) => item.hex), roles: entries.map((item) => item.role) };
}

function renderCategories(state) {
  elements.categoryGrid.replaceChildren(...LIGHT_LAB_CATEGORIES.map((category) => {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.category = category.id; button.setAttribute('role','listitem');
    button.className = `category-button${state.selection.categoryId === category.id ? ' is-active' : ''}`;
    button.innerHTML = `<i>${category.icon}</i><strong>${category.label}</strong><small>Usar este tipo</small>`;
    return button;
  }));
}

function renderParameters(params) {
  document.querySelectorAll('[data-param]').forEach((input) => { input.value=String(params[input.dataset.param] ?? 0); });
  document.querySelectorAll('[data-output]').forEach((output) => { const value=params[output.dataset.output] ?? 0; output.value=`${value>0?'+':''}${value}`; output.textContent=output.value; });
}

function directionLabel(value) {
  const angle = Number(value) || 0;
  if (angle <= -135 || angle >= 135) return 'Desde atrás';
  if (angle < -45) return 'Desde la izquierda';
  if (angle > 45) return 'Desde la derecha';
  return 'Desde el frente';
}

function elevationLabel(value) {
  const angle = Number(value) || 0;
  if (angle <= -30) return 'Desde abajo';
  if (angle >= 30) return 'Desde arriba';
  return 'A la altura';
}

function softnessLabel(value) {
  const amount = Number(value) || 0;
  if (amount < 28) return 'Marcada';
  if (amount < 68) return 'Suave';
  return 'Muy suave';
}

function formatLightControlValue(field, value) {
  const amount = Number(value) || 0;
  if (field === 'intensity') return `${Math.round(amount)}%`;
  if (field === 'direction') return directionLabel(amount);
  if (field === 'elevation') return elevationLabel(amount);
  if (field === 'softness') return softnessLabel(amount);
  return String(Math.round(amount));
}

function renderLightingControls(state) {
  const lighting = state.lighting;
  const selected =
    lighting.lights.find(
      (light) =>
        light.id === lighting.selectedLightId
    ) || lighting.lights[0];

  elements.lightingEnabled.checked =
    lighting.enabled;

  elements.activeLightsLabel.textContent =
    lightingSummary(lighting);

  elements.addLight.disabled =
    lighting.lights.length >= MAX_DIRECT_LIGHTS;

  if (!elements.lightingScenes.childElementCount) {
    elements.lightingScenes.replaceChildren(
      ...LIGHTING_SCENES.map((scene) => {
        const button = document.createElement('button');

        button.type = 'button';
        button.dataset.scene = scene.id;
        button.className = 'lighting-preset-card';

        button.style.setProperty(
          '--scene-a',
          scene.preview?.a || '#FFF1D6'
        );

        button.style.setProperty(
          '--scene-b',
          scene.preview?.b || '#232532'
        );

        button.style.setProperty(
          '--scene-bg',
          scene.preview?.bg || '#11131A'
        );

        button.style.setProperty(
          '--scene-x',
          scene.preview?.x || '35%'
        );

        button.style.setProperty(
          '--scene-y',
          scene.preview?.y || '28%'
        );

        button.innerHTML = `
          <span class="scene-preview" aria-hidden="true">
            <i></i>
          </span>
          <span class="scene-copy">
            <strong>${escapeHtml(scene.name)}</strong>
            <small>${escapeHtml(scene.description)}</small>
          </span>
        `;

        return button;
      })
    );
  }

  elements.lightingScenes
    .querySelectorAll('[data-scene]')
    .forEach((button) => {
      const active =
        button.dataset.scene === lighting.sceneId;

      button.classList.toggle(
        'is-active',
        active
      );

      button.setAttribute(
        'aria-pressed',
        String(active)
      );
    });

  const signature = `${
    lighting.sceneId || 'custom'
  }::${
    lighting.lights
      .map(
        (light) =>
          `${light.id}:${light.name}:${light.color}:${light.enabled}`
      )
      .join('|')
  }::${selected?.id || ''}`;

  if (signature !== lightsRenderSignature) {
    lightsRenderSignature = signature;

    elements.lightsList.replaceChildren(
      ...lighting.lights.map((light) => {
        const item =
          document.createElement('article');

        const isSelected =
          light.id === selected?.id;

        item.className =
          `light-item friendly-light-item${
            isSelected ? ' is-selected' : ''
          }${
            light.enabled ? '' : ' is-disabled'
          }`;

        item.dataset.lightId = light.id;

        item.innerHTML = `
          <div class="light-item-head">
            <input
              type="checkbox"
              data-light-field="enabled"
              ${light.enabled ? 'checked' : ''}
              aria-label="Activar ${escapeHtml(light.name)}"
            >

            <button
              type="button"
              data-light-action="select"
              class="light-select"
            >
              <i style="--light-color:${light.color}"></i>
              <span>
                <strong>${escapeHtml(light.name)}</strong>
                <small>${light.color} · ${Math.round(light.intensity)}%</small>
              </span>
            </button>

            <button
              type="button"
              data-light-action="duplicate"
              title="Duplicar esta luz"
              aria-label="Duplicar ${escapeHtml(light.name)}"
            >⧉</button>

            <button
              type="button"
              data-light-action="delete"
              title="Eliminar esta luz"
              aria-label="Eliminar ${escapeHtml(light.name)}"
              ${lighting.lights.length === 1 ? 'disabled' : ''}
            >×</button>
          </div>

          ${
            isSelected
              ? `
                <div class="light-editor-inline friendly-light-editor">
                  <label class="friendly-name-field">
                    <span>Nombre de la luz</span>
                    <input
                      type="text"
                      maxlength="28"
                      data-light-field="name"
                      value="${escapeHtml(light.name)}"
                    >
                  </label>

                  <label class="friendly-color-field">
                    <span>Color de esta luz</span>
                    <div class="light-color-row">
                      <input
                        type="color"
                        data-light-field="color"
                        value="${light.color}"
                        aria-label="Color de ${escapeHtml(light.name)}"
                      >
                      <input
                        type="text"
                        maxlength="7"
                        data-light-hex
                        value="${light.color}"
                        aria-label="HEX de ${escapeHtml(light.name)}"
                      >
                    </div>
                  </label>

                  <label>
                    <span>
                      Fuerza
                      <output>${formatLightControlValue('intensity', light.intensity)}</output>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      data-light-field="intensity"
                      value="${light.intensity}"
                    >
                  </label>

                  <label>
                    <span>
                      ¿Desde qué lado?
                      <output>${formatLightControlValue('direction', light.direction)}</output>
                    </span>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      data-light-field="direction"
                      value="${light.direction}"
                    >
                  </label>

                  <label>
                    <span>
                      Altura de la luz
                      <output>${formatLightControlValue('elevation', light.elevation)}</output>
                    </span>
                    <input
                      type="range"
                      min="-90"
                      max="90"
                      data-light-field="elevation"
                      value="${light.elevation}"
                    >
                  </label>

                  <label>
                    <span>
                      Suavidad
                      <output>${formatLightControlValue('softness', light.softness)}</output>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      data-light-field="softness"
                      value="${light.softness}"
                    >
                  </label>
                </div>
              `
              : ''
          }
        `;

        return item;
      })
    );
  }

  lighting.lights.forEach((light) => {
    const item =
      elements.lightsList.querySelector(
        `[data-light-id="${light.id}"]`
      );

    if (!item) return;

    const summary =
      item.querySelector('.light-select small');

    if (summary) {
      summary.textContent =
        `${light.color} · ${Math.round(light.intensity)}%`;
    }

    item
      .querySelectorAll('[data-light-field]')
      .forEach((input) => {
        const field =
          input.dataset.lightField;

        if (
          document.activeElement === input ||
          input.type === 'checkbox' ||
          field === 'name' ||
          field === 'color'
        ) {
          return;
        }

        input.value =
          String(light[field]);

        const output =
          input
            .closest('label')
            ?.querySelector('output');

        if (output) {
          const text =
            formatLightControlValue(
              field,
              light[field]
            );

          output.value = text;
          output.textContent = text;
        }
      });
  });

  elements.environmentControls
    .querySelectorAll('[data-light-component]')
    .forEach((row) => {
      const component =
        lighting[row.dataset.lightComponent];

      if (!component) return;

      const picker =
        row.querySelector(
          '[data-component-field="color"]'
        );

      const hex =
        row.querySelector(
          '[data-component-hex]'
        );

      const intensity =
        row.querySelector(
          '[data-component-field="intensity"]'
        );

      const output =
        row.querySelector(
          '[data-component-output]'
        );

      if (document.activeElement !== picker)
        picker.value = component.color;

      if (document.activeElement !== hex)
        hex.value = component.color;

      if (document.activeElement !== intensity)
        intensity.value =
          String(component.intensity);

      const text =
        `${Math.round(component.intensity)}%`;

      output.value = text;
      output.textContent = text;
    });
}
function renderSwatches(entries,{editable=false,kind='illuminated'}={}) {
  elements.swatchGrid.replaceChildren(...entries.map((color,index) => {
    const item=document.createElement('article'); item.className='swatch'; item.dataset.index=String(index); item.dataset.paletteKind=kind; item.tabIndex=0; item.setAttribute('role','button');
    item.setAttribute('aria-label',`${color.role} ${color.hex}. Clic para copiar.`); item.style.setProperty('--swatch',color.hex); item.style.setProperty('--swatch-text',readableTextColor(color.hex));
    item.innerHTML=`<div class="swatch-color"><span>Copiar</span></div><div class="swatch-meta"><div><strong>${color.role}</strong><span>${color.hex}</span></div>${editable?`<button class="edit-swatch" type="button" title="Editar ${color.role}" aria-label="Editar ${color.role}">✎</button>`:''}</div>`;
    return item;
  }));
}

function renderComparison(original,illuminated) {
  elements.comparisonGrid.replaceChildren(...original.map((entry,index)=>{
    const changed=illuminated[index];const item=document.createElement('article');item.className='comparison-item';
    item.innerHTML=`<strong>${escapeHtml(entry.role)}</strong><div><button type="button" data-copy-hex="${entry.hex}" style="--compare:${entry.hex}" title="Copiar original ${entry.hex}"><i></i><span>${entry.hex}</span></button><b>→</b><button type="button" data-copy-hex="${changed.hex}" style="--compare:${changed.hex}" title="Copiar iluminado ${changed.hex}"><i></i><span>${changed.hex}</span></button></div>`;
    return item;
  }));
}

function renderExtractedColors(samples) {
  elements.extractedCount.textContent=`${samples.length} ${samples.length===1?'muestra':'muestras'}`;
  elements.extractedEmpty.hidden=samples.length>0; elements.clearSamples.hidden=samples.length===0;
  elements.extractedColors.replaceChildren(...samples.map((sample)=>{
    const item=document.createElement('article'); item.className='extracted-item'; item.dataset.sampleId=sample.id;
    const roleOptions=SAMPLE_ROLES.map((role)=>`<option value="${role.id}"${role.id===sample.role?' selected':''}>${role.name}</option>`).join('');
    item.innerHTML=`<button class="extracted-swatch" data-sample-action="copy" type="button" style="--sample:${sample.hex};--sample-text:${readableTextColor(sample.hex)}" title="Copiar ${sample.hex}"><span>${sample.hex}</span></button><div class="extracted-data"><select data-sample-action="role" aria-label="Rol de ${sample.hex}">${roleOptions}</select><div><button data-sample-action="base" type="button">Usar como base</button><button data-sample-action="delete" type="button" aria-label="Eliminar ${sample.hex}">×</button></div></div>`;
    return item;
  }));
}

function renderRecentColors(colors) {
  elements.recentEmpty.hidden=colors.length>0;
  elements.recentColors.replaceChildren(...colors.map((color)=>{
    const item=document.createElement('div'); item.className='recent-item'; item.dataset.recentHex=color.hex;
    item.innerHTML=`<button data-recent-action="copy" type="button" style="--recent:${color.hex}" title="Copiar ${color.hex}"><span></span><b>${color.hex}</b></button><button data-recent-action="base" type="button" title="Usar ${color.hex} como base">＋</button>`;
    return item;
  }));
}

function render(state) {
  const category=categoryById(state.selection.categoryId);
  const original=state.palette.entries;const illuminated=applyLightingToPalette(original,state.lighting);const paletteView=state.ui.paletteView || 'illuminated';const selectedLight=state.lighting.lights.find((light)=>light.id===state.lighting.selectedLightId) || state.lighting.lights[0];const selectedEntries=applyLightingToPalette(original,state.lighting,{onlyLightId:selectedLight?.id});
  renderCategories(state); renderParameters(state.params); renderLightingControls(state);
  const comparing=paletteView==='compare';elements.swatchGrid.hidden=comparing;elements.comparisonGrid.hidden=!comparing;
  if(comparing)renderComparison(original,illuminated);else renderSwatches(paletteView==='original'?original:paletteView==='selected'?selectedEntries:illuminated,{editable:paletteView==='original',kind:paletteView});
  renderExtractedColors(state.reference.extractedColors); renderRecentColors(state.reference.recentColors);
  elements.previewTitle.textContent=category.label;
  elements.paletteName.textContent=paletteView==='original'?`Original · ${state.palette.baseHex}`:paletteView==='compare'?`Original vs. iluminada`:paletteView==='selected'?`Aporte · ${selectedLight?.name || 'Luz elegida'}`:`Iluminada · ${state.palette.baseHex}`;
  elements.stateCategory.textContent=category.label;
  elements.stateBase.textContent=state.palette.baseHex;elements.stateLighting.textContent=lightingSummary(state.lighting);elements.stateColors.textContent=`${state.palette.entries.length} colores`;
  elements.clearImage.hidden=!state.reference.image;
  if (document.activeElement!==elements.baseHex) elements.baseHex.value=state.palette.baseHex; elements.basePicker.value=state.palette.baseHex;
  elements.modeLabel.textContent=VIEW_LABELS[state.selection.previewMode];
  const referenceActive=state.selection.previewMode==='reference'; elements.canvas.hidden=referenceActive; elements.referenceStage.hidden=!referenceActive;
  elements.referenceEmpty.hidden=Boolean(state.reference.image); elements.referenceCanvas.hidden=!state.reference.image;
  elements.canvasHint.textContent=referenceActive?(state.reference.image?'Haz clic sobre la imagen para capturar el color':'Sube, pega o arrastra una imagen'):(paletteView==='original'?'Paleta sin iluminación':paletteView==='selected'?`Solo ${selectedLight?.name || 'luz elegida'}`:lightingSummary(state.lighting));
  elements.previewTabs.querySelectorAll('[data-view]').forEach((button)=>{const active=button.dataset.view===state.selection.previewMode;button.classList.toggle('is-active',active);button.setAttribute('aria-selected',String(active));});
  elements.paletteViewTabs.querySelectorAll('[data-palette-view]').forEach((button)=>{const active=button.dataset.paletteView===paletteView;button.classList.toggle('is-active',active);button.setAttribute('aria-selected',String(active));});
  if(!referenceActive){const previewEntries=paletteView==='original'?original:paletteView==='selected'?selectedEntries:illuminated;const previewLighting=paletteView==='selected'?{...state.lighting,lights:selectedLight?[selectedLight]:[]}:state.lighting;requestAnimationFrame(()=>renderBasicPreview(elements.canvas,previewEntries.map((entry)=>entry.hex),state.selection.previewMode,paletteView==='original'?null:previewLighting));}
}

function applyManualHex() {
  const hex=normalizeHex(elements.baseHex.value); elements.hexError.hidden=Boolean(hex); elements.baseHex.setAttribute('aria-invalid',String(!hex));
  if (!hex) return;
  store.setState((state)=>{const next={...state,selection:{...state.selection,presetId:'custom'},interpretation:`Color base ${hex}`};return {...next,palette:paletteFrom(next,hex),reference:{...state.reference,recentColors:addRecentColor(state.reference.recentColors,hex,'manual-hex')}};});
  showToast(`Base aplicada: ${hex}`);
}

function openEditor(index) {
  const color=store.getState().palette.entries[index]; if (!color) return; editingIndex=index; elements.editor.hidden=false; elements.editRole.textContent=color.role;
  elements.editPicker.value=color.hex; elements.editHex.value=color.hex; elements.editError.hidden=true; elements.editHex.focus(); elements.editHex.select();
}

function applyEditedColor() {
  const hex=normalizeHex(elements.editHex.value); elements.editError.hidden=Boolean(hex); if (!hex || editingIndex===null) return;
  store.setState((state)=>{const entries=state.palette.entries.map((item,index)=>index===editingIndex?{...item,hex}:item);return {...state,palette:{...state.palette,source:'manual-edit',entries,colors:entries.map(x=>x.hex),roles:entries.map(x=>x.role)},reference:{...state.reference,recentColors:addRecentColor(state.reference.recentColors,hex,'swatch-edit')}};});
  elements.editor.hidden=true; editingIndex=null; showToast(`Color actualizado: ${hex}`);
}

function useExtractedAsBase(hex, label='color extraído') {
  store.setState((state)=>{
    const next={...state,selection:{...state.selection,presetId:'custom'},interpretation:`Color base extraído ${hex}`};
    return {...next,palette:paletteFrom(next,hex),reference:{...state.reference,extractedColors:state.reference.extractedColors.map((sample)=>sample.hex===hex?{...sample,role:'base'}:sample),recentColors:addRecentColor(state.reference.recentColors,hex,label)}};
  });
  showToast(`${hex} usado como base · paleta regenerada`);
}

function updateDirectLight(lightId, changes) {
  store.setState((state)=>({
    ...state,
    lighting:{
      ...state.lighting,
      sceneId:'custom',
      lights:state.lighting.lights.map(
        (light)=>
          light.id===lightId
            ? {...light,...changes}
            : light
      )
    },
    reference:changes.color
      ? {
          ...state.reference,
          recentColors:addRecentColor(
            state.reference.recentColors,
            changes.color,
            'light'
          )
        }
      : state.reference
  }));
}

function updateLightingComponent(component, changes) {
  store.setState((state)=>({
    ...state,
    lighting:{
      ...state.lighting,
      sceneId:'custom',
      [component]:{
        ...state.lighting[component],
        ...changes
      }
    },
    reference:changes.color
      ? {
          ...state.reference,
          recentColors:addRecentColor(
            state.reference.recentColors,
            changes.color,
            component
          )
        }
      : state.reference
  }));
}
function applyLightHex(input) {
  const item=input.closest('[data-light-id]');const hex=normalizeHex(input.value);input.setAttribute('aria-invalid',String(!hex));
  if(hex&&item)updateDirectLight(item.dataset.lightId,{color:hex});
}

function applyComponentHex(input) {
  const row=input.closest('[data-light-component]');const hex=normalizeHex(input.value);input.setAttribute('aria-invalid',String(!hex));
  if(hex&&row)updateLightingComponent(row.dataset.lightComponent,{color:hex});
}

function applySampleRole(sample, role) {
  store.setState((state)=>{
    const reference={...state.reference,extractedColors:state.reference.extractedColors.map((item)=>item.id===sample.id?{...item,role}:item)};
    if(role==='base'){
      const next={...state,reference,selection:{...state.selection,presetId:'custom'},interpretation:`Color base extraído ${sample.hex}`};
      return {...next,palette:paletteFrom(next,sample.hex)};
    }
    if(role==='light'){
      const selectedId=state.lighting.selectedLightId || state.lighting.lights[0]?.id;
      return {...state,reference,lighting:{...state.lighting,lights:state.lighting.lights.map((light)=>light.id===selectedId?{...light,color:sample.hex}:light)}};
    }
    const component=role==='shadow'?'shadow':role==='ambient'?'ambient':role==='bounce'?'bounce':null;
    return component?{...state,reference,lighting:{...state.lighting,[component]:{...state.lighting[component],color:sample.hex}}}:{...state,reference};
  });
  return role==='sample'?'Marcada como muestra':role==='base'?'Usado como color base':role==='light'?'Aplicado a la luz seleccionada':role==='shadow'?'Aplicado al color de sombra':role==='ambient'?'Aplicado al ambiente':'Aplicado al rebote';
}

async function loadReferenceBlob(blob,name='imagen-pegada') {
  try {
    elements.imageStatus.textContent='Cargando imagen…';
    const metadata=await renderImageBlob(blob,elements.referenceCanvas,name);
    elements.marker.hidden=true;
    store.setState((state)=>({...state,selection:{...state.selection,previewMode:'reference'},reference:{...state.reference,image:metadata,extractedColors:[]},ui:{...state.ui,lastSamplePosition:null}}));
    elements.imageStatus.textContent=`${metadata.name} · ${metadata.originalWidth}×${metadata.originalHeight}px`;
    showToast('Imagen lista · haz clic para extraer colores');
  } catch (error) {
    elements.imageStatus.textContent=error.message || 'No se pudo cargar la imagen.'; showToast(elements.imageStatus.textContent);
  }
}

function clearReferenceImage() {
  elements.referenceCanvas.width=1; elements.referenceCanvas.height=1; elements.marker.hidden=true;
  store.setState((state)=>({...state,reference:{...state.reference,image:null},ui:{...state.ui,lastSamplePosition:null}}));
  elements.imageStatus.textContent='Imagen retirada. Las muestras extraídas se conservaron.';
}

function captureReferenceColor(event) {
  if(!store.getState().reference.image)return;
  try {
    const captured=sampleCanvasAtPointer(elements.referenceCanvas,event); const sample=createExtractedSample(captured.hex);
    const canvasBounds=elements.referenceCanvas.getBoundingClientRect(); const stageBounds=elements.referenceStage.getBoundingClientRect();
    elements.marker.style.left=`${((canvasBounds.left-stageBounds.left)+captured.relativeX*canvasBounds.width)/stageBounds.width*100}%`;
    elements.marker.style.top=`${((canvasBounds.top-stageBounds.top)+captured.relativeY*canvasBounds.height)/stageBounds.height*100}%`; elements.marker.style.setProperty('--marker-color',captured.hex); elements.marker.hidden=false;
    store.setState((state)=>{
      const exists=state.reference.extractedColors.some((item)=>item.hex===sample.hex);
      const extractedColors=exists?state.reference.extractedColors:[sample,...state.reference.extractedColors].slice(0,60);
      return {...state,reference:{...state.reference,extractedColors,recentColors:addRecentColor(state.reference.recentColors,sample.hex,'eyedropper')},ui:{...state.ui,lastSamplePosition:{x:captured.x,y:captured.y}}};
    });
    showToast(captured.transparent?`${captured.hex} capturado · píxel transparente`:`${captured.hex} capturado`);
  } catch(error) { showToast(error.message || 'No se pudo leer ese píxel.'); }
}

elements.categoryGrid.addEventListener('click',(event)=>{const button=event.target.closest('[data-category]');if(!button)return;store.setState((state)=>{const next={...state,selection:{...state.selection,categoryId:button.dataset.category,presetId:'custom'}};return {...next,palette:paletteFrom(next,state.palette.baseHex)};});});
elements.baseHex.addEventListener('input',()=>{const valid=Boolean(normalizeHex(elements.baseHex.value));elements.hexError.hidden=valid;elements.baseHex.setAttribute('aria-invalid',String(!valid));if(valid)elements.basePicker.value=normalizeHex(elements.baseHex.value);});
elements.baseHex.addEventListener('keydown',(event)=>{if(event.key==='Enter')applyManualHex();}); elements.applyHex.addEventListener('click',applyManualHex);
elements.basePicker.addEventListener('input',()=>{elements.baseHex.value=elements.basePicker.value.toUpperCase();applyManualHex();});
document.querySelector('.parameter-list').addEventListener('input',(event)=>{const input=event.target.closest('[data-param]');if(!input)return;store.setState((state)=>{const params={...state.params,[input.dataset.param]:Number(input.value)};const next={...state,selection:{...state.selection,presetId:'custom'},params};return {...next,palette:paletteFrom(next,state.palette.baseHex,params)};});});
elements.resetParams.addEventListener('click',()=>{store.setState((state)=>{const params={...DEFAULT_PARAMS};const next={...state,params};return {...next,palette:paletteFrom(next,state.palette.baseHex,params)};});showToast('Ajustes restablecidos');});
elements.lightingEnabled.addEventListener('change',()=>{store.setState((state)=>({...state,lighting:{...state.lighting,enabled:elements.lightingEnabled.checked}}));showToast(elements.lightingEnabled.checked?'Iluminación activada':'Iluminación apagada');});
elements.lightingScenes.addEventListener('click',(event)=>{
  const button=event.target.closest('[data-scene]');
  if(!button)return;

  const scene=LIGHTING_SCENES.find(
    (item)=>item.id===button.dataset.scene
  );

  lightsRenderSignature='';

  store.setState((state)=>({
    ...state,
    lighting:sceneLighting(button.dataset.scene),
    ui:{
      ...state.ui,
      paletteView:'illuminated'
    }
  }));

  showToast(
    `${scene?.name || 'Iluminación'} aplicada`
  );
});
elements.addLight.addEventListener('click',()=>{store.setState((state)=>{if(state.lighting.lights.length>=MAX_DIRECT_LIGHTS)return state;const light=createDirectLight({},state.lighting.lights.length);return {...state,lighting:{...state.lighting,enabled:true,lights:[...state.lighting.lights,light],selectedLightId:light.id},ui:{...state.ui,paletteView:'illuminated'}};});showToast('Nueva luz añadida');});
elements.lightsList.addEventListener('click',(event)=>{const item=event.target.closest('[data-light-id]');const action=event.target.closest('[data-light-action]')?.dataset.lightAction;if(!item||!action)return;const id=item.dataset.lightId;
  if(action==='select'){store.setState((state)=>({...state,lighting:{...state.lighting,selectedLightId:id}}));return;}
  if(action==='duplicate'){store.setState((state)=>{if(state.lighting.lights.length>=MAX_DIRECT_LIGHTS)return state;const source=state.lighting.lights.find((light)=>light.id===id);if(!source)return state;const duplicate=createDirectLight({...source,id:null,name:`${source.name} copia`},state.lighting.lights.length);const index=state.lighting.lights.findIndex((light)=>light.id===id);const lights=[...state.lighting.lights];lights.splice(index+1,0,duplicate);return {...state,lighting:{...state.lighting,lights,selectedLightId:duplicate.id}};});showToast('Luz duplicada');return;}
  if(action==='delete'){store.setState((state)=>{if(state.lighting.lights.length===1)return state;const lights=state.lighting.lights.filter((light)=>light.id!==id);return {...state,lighting:{...state.lighting,lights,selectedLightId:state.lighting.selectedLightId===id?lights[0].id:state.lighting.selectedLightId}};});showToast('Luz eliminada');}
});
elements.lightsList.addEventListener('input',(event)=>{
  const input=event.target.closest('[data-light-field]');
  const item=event.target.closest('[data-light-id]');

  if(
    !input ||
    !item ||
    input.type!=='range'
  )return;

  const value=Number(input.value);
  const output=
    input.closest('label')?.querySelector('output');

  if(output){
    const text=
      formatLightControlValue(
        input.dataset.lightField,
        value
      );

    output.value=text;
    output.textContent=text;
  }

  updateDirectLight(
    item.dataset.lightId,
    {[input.dataset.lightField]:value}
  );
});
elements.lightsList.addEventListener('change',(event)=>{const input=event.target.closest('[data-light-field]');const item=event.target.closest('[data-light-id]');if(!input||!item||input.type==='range')return;const field=input.dataset.lightField;const value=input.type==='checkbox'?input.checked:field==='color'?(normalizeHex(input.value)||input.value):input.value.trim()||'Luz';updateDirectLight(item.dataset.lightId,{[field]:value});});
elements.lightsList.addEventListener('keydown',(event)=>{const input=event.target.closest('[data-light-hex]');if(input&&event.key==='Enter'){event.preventDefault();applyLightHex(input);}});
elements.lightsList.addEventListener('focusout',(event)=>{const input=event.target.closest('[data-light-hex]');if(input)applyLightHex(input);});
elements.environmentControls.addEventListener('input',(event)=>{const input=event.target.closest('[data-component-field="intensity"]');const row=event.target.closest('[data-light-component]');if(!input||!row)return;const value=Number(input.value);const output=row.querySelector('[data-component-output]');output.value=String(Math.round(value));output.textContent=output.value;updateLightingComponent(row.dataset.lightComponent,{intensity:value});});
elements.environmentControls.addEventListener('change',(event)=>{const input=event.target.closest('[data-component-field="color"]');const row=event.target.closest('[data-light-component]');if(!input||!row)return;updateLightingComponent(row.dataset.lightComponent,{color:normalizeHex(input.value)||input.value});});
elements.environmentControls.addEventListener('keydown',(event)=>{const input=event.target.closest('[data-component-hex]');if(input&&event.key==='Enter'){event.preventDefault();applyComponentHex(input);}});
elements.environmentControls.addEventListener('focusout',(event)=>{const input=event.target.closest('[data-component-hex]');if(input)applyComponentHex(input);});
elements.paletteViewTabs.addEventListener('click',(event)=>{const button=event.target.closest('[data-palette-view]');if(!button)return;store.setState((state)=>({...state,ui:{...state.ui,paletteView:button.dataset.paletteView}}));});
elements.comparisonGrid.addEventListener('click',async(event)=>{const button=event.target.closest('[data-copy-hex]');if(!button)return;await copyText(button.dataset.copyHex);showToast(`${button.dataset.copyHex} copiado`);});
elements.previewTabs.addEventListener('click',(event)=>{const button=event.target.closest('[data-view]');if(!button)return;store.setState((state)=>({...state,selection:{...state.selection,previewMode:button.dataset.view}}));});
elements.referenceFile.addEventListener('change',()=>{const file=elements.referenceFile.files?.[0];try{if(file)loadReferenceBlob(imageBlobFromFile(file),file.name);}catch(error){elements.imageStatus.textContent=error.message;showToast(error.message);}elements.referenceFile.value='';});
elements.pasteImage.addEventListener('click',async()=>{try{const blob=await readImageFromClipboard();await loadReferenceBlob(blob,'imagen-pegada');}catch(error){elements.imageStatus.textContent=error.message;showToast(error.message);}});
elements.clearImage.addEventListener('click',clearReferenceImage);
document.addEventListener('paste',(event)=>{try{const blob=imageBlobFromPasteEvent(event);if(!blob)return;event.preventDefault();loadReferenceBlob(blob,'imagen-pegada');}catch(error){showToast(error.message);}});
['dragenter','dragover'].forEach((type)=>elements.referenceStage.addEventListener(type,(event)=>{event.preventDefault();elements.dropOverlay.hidden=false;}));
['dragleave','drop'].forEach((type)=>elements.referenceStage.addEventListener(type,(event)=>{event.preventDefault();elements.dropOverlay.hidden=true;}));
elements.referenceStage.addEventListener('drop',(event)=>{const file=[...(event.dataTransfer?.files||[])].find((item)=>item.type.startsWith('image/'));if(!file){showToast('Suelta un archivo de imagen compatible.');return;}try{loadReferenceBlob(imageBlobFromFile(file),file.name);}catch(error){elements.imageStatus.textContent=error.message;showToast(error.message);}});
elements.referenceCanvas.addEventListener('click',captureReferenceColor);
elements.swatchGrid.addEventListener('click',async(event)=>{const swatch=event.target.closest('.swatch');if(!swatch)return;const index=Number(swatch.dataset.index);if(event.target.closest('.edit-swatch')){event.stopPropagation();openEditor(index);return;}const state=store.getState();const kind=swatch.dataset.paletteKind;const entries=kind==='original'?state.palette.entries:applyLightingToPalette(state.palette.entries,state.lighting,kind==='selected'?{onlyLightId:state.lighting.selectedLightId}:{});const color=entries[index];await copyText(color.hex);swatch.classList.add('is-copied');setTimeout(()=>swatch.classList.remove('is-copied'),650);showToast(`${color.hex} copiado · ${color.role}`);});
elements.swatchGrid.addEventListener('keydown',async(event)=>{const swatch=event.target.closest('.swatch');if(!swatch||!['Enter',' '].includes(event.key))return;event.preventDefault();const state=store.getState();const kind=swatch.dataset.paletteKind;const entries=kind==='original'?state.palette.entries:applyLightingToPalette(state.palette.entries,state.lighting,kind==='selected'?{onlyLightId:state.lighting.selectedLightId}:{});const color=entries[Number(swatch.dataset.index)];await copyText(color.hex);showToast(`${color.hex} copiado`);});
elements.editHex.addEventListener('input',()=>{const valid=Boolean(normalizeHex(elements.editHex.value));elements.editError.hidden=valid;if(valid)elements.editPicker.value=normalizeHex(elements.editHex.value);});
elements.editPicker.addEventListener('input',()=>{elements.editHex.value=elements.editPicker.value.toUpperCase();}); elements.applyEdit.addEventListener('click',applyEditedColor);
elements.editHex.addEventListener('keydown',(event)=>{if(event.key==='Enter')applyEditedColor();}); elements.closeEditor.addEventListener('click',()=>{elements.editor.hidden=true;editingIndex=null;});
elements.extractedColors.addEventListener('click',async(event)=>{const item=event.target.closest('[data-sample-id]');if(!item)return;const id=item.dataset.sampleId;const sample=store.getState().reference.extractedColors.find((color)=>color.id===id);if(!sample)return;const action=event.target.closest('[data-sample-action]')?.dataset.sampleAction;if(action==='copy'){await copyText(sample.hex);showToast(`${sample.hex} copiado`);}else if(action==='base'){useExtractedAsBase(sample.hex,'extracted-base');}else if(action==='delete'){store.setState((state)=>({...state,reference:{...state.reference,extractedColors:state.reference.extractedColors.filter((color)=>color.id!==id)}}));}});
elements.extractedColors.addEventListener('change',(event)=>{const select=event.target.closest('[data-sample-action="role"]');if(!select)return;const id=event.target.closest('[data-sample-id]')?.dataset.sampleId;const sample=store.getState().reference.extractedColors.find((item)=>item.id===id);if(!sample)return;const result=applySampleRole(sample,select.value);showToast(`${select.options[select.selectedIndex].text}: ${result}`);});
elements.clearSamples.addEventListener('click',()=>{store.setState((state)=>({...state,reference:{...state.reference,extractedColors:[]}}));elements.marker.hidden=true;showToast('Muestras eliminadas');});
elements.recentColors.addEventListener('click',async(event)=>{const item=event.target.closest('[data-recent-hex]');if(!item)return;const hex=item.dataset.recentHex;const action=event.target.closest('[data-recent-action]')?.dataset.recentAction;if(action==='copy'){await copyText(hex);showToast(`${hex} copiado`);}else if(action==='base')useExtractedAsBase(hex,'recent-base');});
elements.copyAll.addEventListener('click',async()=>{const state=store.getState();const illuminated=applyLightingToPalette(state.palette.entries,state.lighting);const selected=applyLightingToPalette(state.palette.entries,state.lighting,{onlyLightId:state.lighting.selectedLightId});const view=state.ui.paletteView||'illuminated';const text=view==='compare'?[`ORIGINAL`,...state.palette.entries.map((item)=>`${item.role}: ${item.hex}`),``,`ILUMINADA`,...illuminated.map((item)=>`${item.role}: ${item.hex}`)].join('\n'):(view==='original'?state.palette.entries:view==='selected'?selected:illuminated).map((item)=>`${item.role}: ${item.hex}`).join('\n');await copyText(text);showToast(view==='compare'?'Comparación completa copiada':'Los 16 códigos HEX fueron copiados');});
elements.download.addEventListener('click',()=>{downloadProjectStructure(store.getState());showToast('Proyecto Light Lab descargado');});
document.addEventListener('studio-theme-change',()=>render(store.getState())); window.addEventListener('resize',()=>{const state=store.getState();if(state.selection.previewMode!=='reference'){const original=state.palette.entries;const selected=state.lighting.lights.find((light)=>light.id===state.lighting.selectedLightId);const entries=state.ui.paletteView==='original'?original:applyLightingToPalette(original,state.lighting,state.ui.paletteView==='selected'?{onlyLightId:selected?.id}:{});const previewLighting=state.ui.paletteView==='selected'?{...state.lighting,lights:selected?[selected]:[]}:state.lighting;renderBasicPreview(elements.canvas,entries.map((entry)=>entry.hex),state.selection.previewMode,state.ui.paletteView==='original'?null:previewLighting);}},{passive:true});
store.subscribe(render); render(store.getState()); window.LightLab={getState:store.getState,reset:store.reset,useExtractedAsBase,applyLightingToPalette,phase:4};
