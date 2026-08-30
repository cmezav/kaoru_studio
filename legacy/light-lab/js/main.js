import { LIGHT_LAB_CATEGORIES, categoryById, presetById, undertoneById, variantById } from './presets.js';
import { createStore } from './state.js';
import { DEFAULT_PARAMS, baseForSelection, generateDetailedPalette, interpretDescription } from './paletteEngine.js';
import { normalizeHex, readableTextColor } from './colorUtils.js';
import { renderBasicPreview } from './renderer2d.js';
import { downloadProjectStructure } from './exportSystem.js';
import { SAMPLE_ROLES, addRecentColor, createExtractedSample, imageBlobFromFile, imageBlobFromPasteEvent, readImageFromClipboard, renderImageBlob, sampleCanvasAtPointer } from './extractionSystem.js';

const VIEW_LABELS = { sphere: 'Estudio de volumen · esfera', band: 'Estudio de reflejo · banda', plane: 'Estudio tonal · plano', reference: 'Cuentagotas · imagen de referencia' };
const store = createStore();
const byId = (id) => document.getElementById(id);
const elements = {
  categoryGrid: byId('categoryGrid'), presetSelect: byId('presetSelect'), presetDescription: byId('presetDescription'),
  variantSelect: byId('variantSelect'), variantLabel: byId('variantLabel'), undertoneField: byId('undertoneField'), undertoneSelect: byId('undertoneSelect'),
  descriptionInput: byId('descriptionInput'), interpretBtn: byId('interpretBtn'), interpretationSummary: byId('interpretationSummary'),
  basePicker: byId('baseColorPicker'), baseHex: byId('baseHexInput'), applyHex: byId('applyHexBtn'), hexError: byId('hexError'),
  generate: byId('generateBtn'), previewTitle: byId('previewTitle'), paletteName: byId('paletteName'), swatchGrid: byId('swatchGrid'),
  canvas: byId('previewCanvas'), modeLabel: byId('previewModeLabel'), previewTabs: byId('previewTabs'),
  canvasHint: byId('canvasHint'), referenceFile: byId('referenceFileInput'), pasteImage: byId('pasteImageBtn'), clearImage: byId('clearImageBtn'), imageStatus: byId('imageStatus'),
  referenceStage: byId('referenceStage'), referenceEmpty: byId('referenceEmpty'), referenceCanvas: byId('referenceCanvas'), marker: byId('eyedropperMarker'), dropOverlay: byId('dropOverlay'),
  stateCategory: byId('stateCategory'), stateVariant: byId('stateVariant'), stateBase: byId('stateBase'), stateColors: byId('stateColors'),
  editor: byId('swatchEditor'), editRole: byId('editRole'), editPicker: byId('editColorPicker'), editHex: byId('editHexInput'), editError: byId('editHexError'),
  closeEditor: byId('closeEditorBtn'), applyEdit: byId('applyEditBtn'),
  extractedCount: byId('extractedCount'), extractedEmpty: byId('extractedEmpty'), extractedColors: byId('extractedColors'), clearSamples: byId('clearSamplesBtn'),
  recentEmpty: byId('recentEmpty'), recentColors: byId('recentColors'),
  copyAll: byId('copyAllBtn'), download: byId('downloadStructureBtn'), toast: byId('toast')
};
let toastTimer = 0; let editingIndex = null;

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
  return { source: 'phase-2-generator', baseHex, entries, colors: entries.map((item) => item.hex), roles: entries.map((item) => item.role) };
}

function renderCategories(state) {
  elements.categoryGrid.replaceChildren(...LIGHT_LAB_CATEGORIES.map((category) => {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.category = category.id; button.setAttribute('role','listitem');
    button.className = `category-button${state.selection.categoryId === category.id ? ' is-active' : ''}`;
    button.innerHTML = `<i>${category.icon}</i><strong>${category.label}</strong><small>${category.variants.length} variedades</small>`;
    return button;
  }));
}

function renderPresets(category, state) {
  const options = category.presets.map((preset) => {
    const option = document.createElement('option'); option.value=preset.id; option.textContent=preset.name; option.selected=preset.id===state.selection.presetId; return option;
  });
  if (state.selection.presetId === 'custom') {
    const custom = document.createElement('option'); custom.value='custom'; custom.textContent='Personalizada'; custom.selected=true; options.unshift(custom);
  }
  elements.presetSelect.replaceChildren(...options);
  const preset = category.presets.find((item) => item.id === state.selection.presetId);
  elements.presetDescription.textContent = preset?.description || `Configuración personalizada: ${state.interpretation}`;
}

function renderSelectors(category, state) {
  elements.variantLabel.textContent = category.id === 'natural-skin' ? 'Profundidad de piel' : category.id === 'materials' ? 'Material' : category.id === 'hair-stylized' ? 'Tipo de cabello' : 'Tipo de piel';
  elements.variantSelect.replaceChildren(...category.variants.map((variant) => {
    const option=document.createElement('option'); option.value=variant.id; option.textContent=variant.name; option.selected=variant.id===state.selection.variantId; return option;
  }));
  const hasUndertones = category.undertones.length > 0; elements.undertoneField.hidden=!hasUndertones;
  elements.undertoneSelect.replaceChildren(...category.undertones.map((undertone) => {
    const option=document.createElement('option'); option.value=undertone.id; option.textContent=undertone.name; option.selected=undertone.id===state.selection.undertoneId; return option;
  }));
}

function renderParameters(params) {
  document.querySelectorAll('[data-param]').forEach((input) => { input.value=String(params[input.dataset.param] ?? 0); });
  document.querySelectorAll('[data-output]').forEach((output) => { const value=params[output.dataset.output] ?? 0; output.value=`${value>0?'+':''}${value}`; output.textContent=output.value; });
}

function renderSwatches(entries) {
  elements.swatchGrid.replaceChildren(...entries.map((color,index) => {
    const item=document.createElement('article'); item.className='swatch'; item.dataset.index=String(index); item.tabIndex=0; item.setAttribute('role','button');
    item.setAttribute('aria-label',`${color.role} ${color.hex}. Clic para copiar.`); item.style.setProperty('--swatch',color.hex); item.style.setProperty('--swatch-text',readableTextColor(color.hex));
    item.innerHTML=`<div class="swatch-color"><span>Copiar</span></div><div class="swatch-meta"><div><strong>${color.role}</strong><span>${color.hex}</span></div><button class="edit-swatch" type="button" title="Editar ${color.role}" aria-label="Editar ${color.role}">✎</button></div>`;
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
  const category=categoryById(state.selection.categoryId); const variant=variantById(category,state.selection.variantId); const undertone=undertoneById(category,state.selection.undertoneId);
  renderCategories(state); renderPresets(category,state); renderSelectors(category,state); renderParameters(state.params); renderSwatches(state.palette.entries);
  renderExtractedColors(state.reference.extractedColors); renderRecentColors(state.reference.recentColors);
  elements.interpretationSummary.textContent=state.interpretation; elements.previewTitle.textContent=category.label;
  elements.paletteName.textContent=state.selection.presetId==='custom' ? `${variant.name}${undertone?` · ${undertone.name}`:''}` : presetById(category,state.selection.presetId).name;
  elements.stateCategory.textContent=category.label; elements.stateVariant.textContent=`${variant.name}${undertone?` · ${undertone.name}`:''}`;
  elements.stateBase.textContent=state.palette.baseHex; elements.stateColors.textContent=`${state.palette.entries.length} colores`;
  elements.clearImage.hidden=!state.reference.image;
  if (document.activeElement!==elements.baseHex) elements.baseHex.value=state.palette.baseHex; elements.basePicker.value=state.palette.baseHex;
  if (document.activeElement!==elements.descriptionInput) elements.descriptionInput.value=state.description;
  elements.modeLabel.textContent=VIEW_LABELS[state.selection.previewMode];
  const referenceActive=state.selection.previewMode==='reference'; elements.canvas.hidden=referenceActive; elements.referenceStage.hidden=!referenceActive;
  elements.referenceEmpty.hidden=Boolean(state.reference.image); elements.referenceCanvas.hidden=!state.reference.image;
  elements.canvasHint.textContent=referenceActive?(state.reference.image?'Haz clic sobre la imagen para capturar el color':'Sube, pega o arrastra una imagen'):'Actualización en tiempo real';
  elements.previewTabs.querySelectorAll('[data-view]').forEach((button)=>{const active=button.dataset.view===state.selection.previewMode;button.classList.toggle('is-active',active);button.setAttribute('aria-selected',String(active));});
  if(!referenceActive)requestAnimationFrame(()=>renderBasicPreview(elements.canvas,state.palette.colors,state.selection.previewMode));
}

function usePreset(category,preset) {
  const params={...DEFAULT_PARAMS,...preset.params}; const selection={...store.getState().selection,categoryId:category.id,presetId:preset.id,variantId:preset.variantId,undertoneId:preset.undertoneId};
  const baseHex=preset.baseHex || baseForSelection(category.id,preset.variantId,preset.undertoneId); const entries=generateDetailedPalette({categoryId:category.id,baseHex,params});
  store.setState((state)=>({...state,selection,params,interpretation:`${category.label} · ${preset.name}`,palette:{source:'preset',baseHex,entries,colors:entries.map(x=>x.hex),roles:entries.map(x=>x.role)}}));
}

function applyManualHex() {
  const hex=normalizeHex(elements.baseHex.value); elements.hexError.hidden=Boolean(hex); elements.baseHex.setAttribute('aria-invalid',String(!hex));
  if (!hex) return;
  store.setState((state)=>{const next={...state,selection:{...state.selection,presetId:'custom'},interpretation:`${state.interpretation.split(' · HEX')[0]} · HEX ${hex}`};return {...next,palette:paletteFrom(next,hex),reference:{...state.reference,recentColors:addRecentColor(state.reference.recentColors,hex,'manual-hex')}};});
  showToast(`Base aplicada: ${hex}`);
}

function interpretAndGenerate(text) {
  const current=store.getState(); const result=interpretDescription(text,{categoryId:current.selection.categoryId,variantId:current.selection.variantId,undertoneId:current.selection.undertoneId,params:current.params});
  const next={...current,description:text,interpretation:result.summary,params:result.params,selection:{...current.selection,categoryId:result.categoryId,presetId:'custom',variantId:result.variantId,undertoneId:result.undertoneId}};
  next.palette=paletteFrom(next,result.baseHex,result.params); next.reference={...next.reference,recentColors:addRecentColor(next.reference.recentColors,result.baseHex,'description')}; store.setState(next); showToast('Descripción interpretada · 16 colores generados');
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
    const next={...state,selection:{...state.selection,presetId:'custom'},interpretation:`${state.interpretation.split(' · Base extraída')[0]} · Base extraída ${hex}`};
    return {...next,palette:paletteFrom(next,hex),reference:{...state.reference,extractedColors:state.reference.extractedColors.map((sample)=>sample.hex===hex?{...sample,role:'base'}:sample),recentColors:addRecentColor(state.reference.recentColors,hex,label)}};
  });
  showToast(`${hex} usado como base · paleta regenerada`);
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

elements.categoryGrid.addEventListener('click',(event)=>{const button=event.target.closest('[data-category]');if(!button)return;const category=categoryById(button.dataset.category);usePreset(category,category.presets[0]);});
elements.presetSelect.addEventListener('change',()=>{const category=categoryById(store.getState().selection.categoryId);if(elements.presetSelect.value!=='custom')usePreset(category,presetById(category,elements.presetSelect.value));});
elements.variantSelect.addEventListener('change',()=>{store.setState((state)=>{const selection={...state.selection,presetId:'custom',variantId:elements.variantSelect.value};const baseHex=baseForSelection(selection.categoryId,selection.variantId,selection.undertoneId);const next={...state,selection,interpretation:`${categoryById(selection.categoryId).label} · ${variantById(categoryById(selection.categoryId),selection.variantId).name}`};return {...next,palette:paletteFrom(next,baseHex)};});});
elements.undertoneSelect.addEventListener('change',()=>{store.setState((state)=>{const selection={...state.selection,presetId:'custom',undertoneId:elements.undertoneSelect.value};const baseHex=baseForSelection(selection.categoryId,selection.variantId,selection.undertoneId);const next={...state,selection,interpretation:`Piel natural · ${variantById(categoryById(selection.categoryId),selection.variantId).name} · ${undertoneById(categoryById(selection.categoryId),selection.undertoneId).name}`};return {...next,palette:paletteFrom(next,baseHex)};});});
elements.baseHex.addEventListener('input',()=>{const valid=Boolean(normalizeHex(elements.baseHex.value));elements.hexError.hidden=valid;elements.baseHex.setAttribute('aria-invalid',String(!valid));if(valid)elements.basePicker.value=normalizeHex(elements.baseHex.value);});
elements.baseHex.addEventListener('keydown',(event)=>{if(event.key==='Enter')applyManualHex();}); elements.applyHex.addEventListener('click',applyManualHex);
elements.basePicker.addEventListener('input',()=>{elements.baseHex.value=elements.basePicker.value.toUpperCase();applyManualHex();});
document.querySelector('.parameter-list').addEventListener('input',(event)=>{const input=event.target.closest('[data-param]');if(!input)return;store.setState((state)=>{const params={...state.params,[input.dataset.param]:Number(input.value)};const next={...state,selection:{...state.selection,presetId:'custom'},params};return {...next,palette:paletteFrom(next,state.palette.baseHex,params)};});});
elements.generate.addEventListener('click',()=>{const state=store.getState();store.setState({...state,palette:paletteFrom(state)});showToast('Paleta detallada regenerada');});
elements.interpretBtn.addEventListener('click',()=>interpretAndGenerate(elements.descriptionInput.value.trim()));
elements.descriptionInput.addEventListener('keydown',(event)=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();interpretAndGenerate(elements.descriptionInput.value.trim());}});
document.querySelector('.example-chips').addEventListener('click',(event)=>{const button=event.target.closest('[data-example]');if(!button)return;elements.descriptionInput.value=button.dataset.example;interpretAndGenerate(button.dataset.example);});
elements.previewTabs.addEventListener('click',(event)=>{const button=event.target.closest('[data-view]');if(!button)return;store.setState((state)=>({...state,selection:{...state.selection,previewMode:button.dataset.view}}));});
elements.referenceFile.addEventListener('change',()=>{const file=elements.referenceFile.files?.[0];try{if(file)loadReferenceBlob(imageBlobFromFile(file),file.name);}catch(error){elements.imageStatus.textContent=error.message;showToast(error.message);}elements.referenceFile.value='';});
elements.pasteImage.addEventListener('click',async()=>{try{const blob=await readImageFromClipboard();await loadReferenceBlob(blob,'imagen-pegada');}catch(error){elements.imageStatus.textContent=error.message;showToast(error.message);}});
elements.clearImage.addEventListener('click',clearReferenceImage);
document.addEventListener('paste',(event)=>{try{const blob=imageBlobFromPasteEvent(event);if(!blob)return;event.preventDefault();loadReferenceBlob(blob,'imagen-pegada');}catch(error){showToast(error.message);}});
['dragenter','dragover'].forEach((type)=>elements.referenceStage.addEventListener(type,(event)=>{event.preventDefault();elements.dropOverlay.hidden=false;}));
['dragleave','drop'].forEach((type)=>elements.referenceStage.addEventListener(type,(event)=>{event.preventDefault();elements.dropOverlay.hidden=true;}));
elements.referenceStage.addEventListener('drop',(event)=>{const file=[...(event.dataTransfer?.files||[])].find((item)=>item.type.startsWith('image/'));if(!file){showToast('Suelta un archivo de imagen compatible.');return;}try{loadReferenceBlob(imageBlobFromFile(file),file.name);}catch(error){elements.imageStatus.textContent=error.message;showToast(error.message);}});
elements.referenceCanvas.addEventListener('click',captureReferenceColor);
elements.swatchGrid.addEventListener('click',async(event)=>{const swatch=event.target.closest('.swatch');if(!swatch)return;const index=Number(swatch.dataset.index);if(event.target.closest('.edit-swatch')){event.stopPropagation();openEditor(index);return;}const color=store.getState().palette.entries[index];await copyText(color.hex);swatch.classList.add('is-copied');setTimeout(()=>swatch.classList.remove('is-copied'),650);showToast(`${color.hex} copiado · ${color.role}`);});
elements.swatchGrid.addEventListener('keydown',async(event)=>{const swatch=event.target.closest('.swatch');if(!swatch||!['Enter',' '].includes(event.key))return;event.preventDefault();const color=store.getState().palette.entries[Number(swatch.dataset.index)];await copyText(color.hex);showToast(`${color.hex} copiado`);});
elements.editHex.addEventListener('input',()=>{const valid=Boolean(normalizeHex(elements.editHex.value));elements.editError.hidden=valid;if(valid)elements.editPicker.value=normalizeHex(elements.editHex.value);});
elements.editPicker.addEventListener('input',()=>{elements.editHex.value=elements.editPicker.value.toUpperCase();}); elements.applyEdit.addEventListener('click',applyEditedColor);
elements.editHex.addEventListener('keydown',(event)=>{if(event.key==='Enter')applyEditedColor();}); elements.closeEditor.addEventListener('click',()=>{elements.editor.hidden=true;editingIndex=null;});
elements.extractedColors.addEventListener('click',async(event)=>{const item=event.target.closest('[data-sample-id]');if(!item)return;const id=item.dataset.sampleId;const sample=store.getState().reference.extractedColors.find((color)=>color.id===id);if(!sample)return;const action=event.target.closest('[data-sample-action]')?.dataset.sampleAction;if(action==='copy'){await copyText(sample.hex);showToast(`${sample.hex} copiado`);}else if(action==='base'){useExtractedAsBase(sample.hex,'extracted-base');}else if(action==='delete'){store.setState((state)=>({...state,reference:{...state.reference,extractedColors:state.reference.extractedColors.filter((color)=>color.id!==id)}}));}});
elements.extractedColors.addEventListener('change',(event)=>{const select=event.target.closest('[data-sample-action="role"]');if(!select)return;const id=event.target.closest('[data-sample-id]')?.dataset.sampleId;store.setState((state)=>({...state,reference:{...state.reference,extractedColors:state.reference.extractedColors.map((sample)=>sample.id===id?{...sample,role:select.value}:sample)}}));showToast(`Muestra marcada como ${select.options[select.selectedIndex].text}`);});
elements.clearSamples.addEventListener('click',()=>{store.setState((state)=>({...state,reference:{...state.reference,extractedColors:[]}}));elements.marker.hidden=true;showToast('Muestras eliminadas');});
elements.recentColors.addEventListener('click',async(event)=>{const item=event.target.closest('[data-recent-hex]');if(!item)return;const hex=item.dataset.recentHex;const action=event.target.closest('[data-recent-action]')?.dataset.recentAction;if(action==='copy'){await copyText(hex);showToast(`${hex} copiado`);}else if(action==='base')useExtractedAsBase(hex,'recent-base');});
elements.copyAll.addEventListener('click',async()=>{const text=store.getState().palette.entries.map((item)=>`${item.role}: ${item.hex}`).join('\n');await copyText(text);showToast('Los 16 códigos HEX fueron copiados');});
elements.download.addEventListener('click',()=>{downloadProjectStructure(store.getState());showToast('Proyecto Light Lab descargado');});
document.addEventListener('studio-theme-change',()=>render(store.getState())); window.addEventListener('resize',()=>renderBasicPreview(elements.canvas,store.getState().palette.colors,store.getState().selection.previewMode),{passive:true});
store.subscribe(render); render(store.getState()); window.LightLab={getState:store.getState,reset:store.reset,generate:interpretAndGenerate,useExtractedAsBase,phase:3};
