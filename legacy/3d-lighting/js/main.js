import { create3dStore } from './state.js?v=6.0';
import {
  MODEL_REGISTRY,
  modelById
} from './modelRegistry.js?v=6.2';
import {
  detectWebGL,
  create3dScene
} from './scene3d.js?v=atmosphere-simple-v5';
import {
  MAX_3D_LIGHTS,
  createDefault3dLight,
  duplicate3dLight
} from './lighting3d.js?v=projector-quality-v1-20260906';
import {
  listAvailableLightLabPalettes,
  readLightLabFile,
  consumeLightLabTransfer,
  applyLightLabPaletteToState
} from './paletteBridge3d.js?v=6.0';
import {
  findMainModelFile
} from './customModel.js?v=6.0';
import {
  downloadPortable3dProject,
  readPortable3dProject,
  save3dToGallery,
  consume3dGalleryLaunch
} from './storage3d.js?v=6.0';
import { THREE_ATMOSPHERES, atmosphere3dById, build3dAtmosphere } from './atmospheres3d.js?cache=lighting-calibration-v3-20260907';
import { projectorFromEffect } from '../../shared/lightPatterns.js?cache=lighting-calibration-v3-20260907';
import {
  customLightingPresetById,
  deleteCustomLightingPreset,
  isFavoriteLightingPreset,
  listCustomLightingPresets,
  saveCustomLightingPreset,
  toggleFavoriteLightingPreset
} from '../../shared/lightingPresetLibrary.js?cache=preset-library-v5-20260907';
import {
  createStudioHistory
} from '../../shared/studioHistory.js?cache=lighting-history-v9-20260907';

const store = create3dStore();
const studioHistory3d =
  createStudioHistory(
    store,
    {
      limit:120,
      debounceMs:180
    }
  );
window.ThreeLightingStore = store;
window.ThreeLightingHistory = studioHistory3d;

const byId = (id) =>
  document.getElementById(id);

const elements = {
  cards: byId('modelCards'),
  baseColor: byId('baseColor'),
  baseHex: byId('baseHex'),
  canvas: byId('threeCanvas'),
  stageTitle: byId('stageTitle'),
  stateModel: byId('stateModel'),
  stateColor: byId('stateColor'),
  stateEngine: byId('stateEngine'),
  stateCamera: byId('stateCamera'),
  stateSource: byId('stateSource'),
  stateMorphs: byId('stateMorphs'),
  stateLights: byId('stateLights'),
  stateSelectedLight: byId('stateSelectedLight'),
  statePalette: byId('statePalette'),
  webglBadge: byId('webglBadge'),
  viewportOverlay:
    document.querySelector(
      '.viewport-overlay'
    ),
  viewportMessage:
    byId('viewportMessage'),
  resetCamera: byId('resetCameraBtn'),
  cameraPresets:
    byId('cameraPresetButtons'),
  gridToggle: byId('gridToggle'),
  shadowToggle: byId('shadowToggle'),
  edgeToggle: byId('edgeToggle'),
  paletteBridge:
    byId('paletteBridgeStatus'),
  toast: byId('toast'),
  atmosphereGrid: byId('atmosphereGrid'),
  creativeAtmosphereGrid: byId('creativeAtmosphereGrid'),
  creativeAtmosphereFilters: byId('creativeAtmosphereFilters3d'),
  creativeAtmosphereCount: byId('creativeAtmosphereCount3d'),
  creativeAtmosphereSearch: byId('creativeAtmosphereSearch3d'),
  creativeAtmosphereSort: byId('creativeAtmosphereSort3d'),
  compareAtmosphereA: byId('compareAtmosphereA3d'),
  compareAtmosphereB: byId('compareAtmosphereB3d'),
  compareAtmosphereCardA: byId('compareAtmosphereCardA3d'),
  compareAtmosphereCardB: byId('compareAtmosphereCardB3d'),
  applyCompareAtmosphereA: byId('applyCompareAtmosphereA3d'),
  applyCompareAtmosphereB: byId('applyCompareAtmosphereB3d'),
  customAtmosphereName: byId('customAtmosphereName3d'),
  saveCustomAtmosphere: byId('saveCustomAtmosphere3d'),
  viewportCard: document.querySelector('.viewport-card'),
  atmosphereEditorLabel: byId('atmosphereEditorLabel'),
  atmosphereBackground: byId('atmosphereBackground'),
  atmosphereBackgroundHex: byId('atmosphereBackgroundHex'),
  atmosphereFog: byId('atmosphereFog'),
  atmosphereFogHex: byId('atmosphereFogHex'),
  atmosphereFloor: byId('atmosphereFloor'),
  atmosphereFloorHex: byId('atmosphereFloorHex'),
  atmosphereEffectType: byId('atmosphereEffectType'),
  atmosphereEffectA: byId('atmosphereEffectA'),
  atmosphereEffectAHex: byId('atmosphereEffectAHex'),
  atmosphereEffectB: byId('atmosphereEffectB'),
  atmosphereEffectBHex: byId('atmosphereEffectBHex'),
  atmosphereExposure: byId('atmosphereExposure'),
  atmosphereExposureOut: byId('atmosphereExposureOut'),
  atmosphereEffectOpacity: byId('atmosphereEffectOpacity'),
  atmosphereEffectOpacityOut: byId('atmosphereEffectOpacityOut'),
  atmosphereEffectAngle: byId('atmosphereEffectAngle'),
  atmosphereEffectAngleOut: byId('atmosphereEffectAngleOut'),
  atmosphereEffectScale: byId('atmosphereEffectScale'),
  atmosphereEffectScaleOut: byId('atmosphereEffectScaleOut'),
  atmosphereProjectorLight: byId('atmosphereProjectorLight'),
  atmosphereEffectX: byId('atmosphereEffectX'),
  atmosphereEffectXOut: byId('atmosphereEffectXOut'),
  atmosphereEffectY: byId('atmosphereEffectY'),
  atmosphereEffectYOut: byId('atmosphereEffectYOut'),
  atmosphereEffectBlur: byId('atmosphereEffectBlur'),
  atmosphereEffectBlurOut: byId('atmosphereEffectBlurOut'),
  atmosphereEffectContrast: byId('atmosphereEffectContrast'),
  atmosphereEffectContrastOut: byId('atmosphereEffectContrastOut'),
  atmosphereEffectDensity: byId('atmosphereEffectDensity'),
  atmosphereEffectDensityOut: byId('atmosphereEffectDensityOut'),
  resetAtmosphere: byId('resetAtmosphereBtn'),  advancedToggle: byId('advancedToggleBtn'),

  lightingEnabled:
    byId('lightingEnabled'),
  showLightHelpers:
    byId('showLightHelpers'),
  addLight: byId('addLightBtn'),
  duplicateLight:
    byId('duplicateLightBtn'),
  deleteLight:
    byId('deleteLightBtn'),
  lightList: byId('lightList'),

  lightName: byId('lightName'),
  lightEnabled: byId('lightEnabled'),
  lightColor: byId('lightColor'),
  lightHex: byId('lightHex'),
  lightIntensity:
    byId('lightIntensity'),
  lightIntensityOut:
    byId('lightIntensityOut'),
  lightAzimuth:
    byId('lightAzimuth'),
  lightAzimuthOut:
    byId('lightAzimuthOut'),
  lightElevation:
    byId('lightElevation'),
  lightElevationOut:
    byId('lightElevationOut'),
  lightDistance:
    byId('lightDistance'),
  lightDistanceOut:
    byId('lightDistanceOut'),
  lightSoftness:
    byId('lightSoftness'),
  lightSoftnessOut:
    byId('lightSoftnessOut'),

  paletteSelect:
    byId('paletteLibrarySelect'),
  paletteRefresh:
    byId('refreshPaletteBtn'),
  paletteApply:
    byId('applyPaletteBtn'),
  paletteImport:
    byId('importLightLabBtn'),
  paletteImportInput:
    byId('lightLabFileInput'),
  paletteSync:
    byId('paletteSyncLighting'),
  paletteMode:
    byId('paletteMode'),
  palettePreview:
    byId('palettePreview'),

  importModel:
    byId('importModelBtn'),
  modelInput:
    byId('customModelInput'),
  customModelStatus:
    byId('customModelStatus'),

  projectName:
    byId('projectName'),
  saveGallery:
    byId('saveGalleryBtn'),
  exportProject:
    byId('exportProjectBtn'),
  importProject:
    byId('importProjectBtn'),
  importProjectInput:
    byId('projectFileInput'),
  exportPng:
    byId('exportPngBtn')
};

const environmentIds = [
  'ambient',
  'shadow',
  'bounce',
  'rim'
];

let toastTimer = 0;
let engine = null;
let modelLoadToken = 0;
let customModelFiles = [];
let paletteLibrary = [];
let creativeAtmosphereFilter = 'all';
let creativeAtmosphereSearch = '';
let creativeAtmosphereSort = 'original';


const KAORU_CREATIVE_ATMO_FILTERS = {
  natural: new Set([
    'sun-side',
    'golden-rim',
    'window-cross',
    'warm-blinds',
    'window-cool',
    'blinds-golden',
    'leaf-light',
    'leaf-dense',
    'sun-blast',
    'bokeh-gold'
  ]),
  dramatic: new Set([
    'yellow-stripe',
    'golden-rim',
    'violet-orange',
    'olive-crimson',
    'forest-lowkey',
    'neon-red-cyan',
    'neon-dual',
    'cyan-floor',
    'purple-gold-split',
    'flash-editorial',
    'blue-red-drama'
  ]),
  color: new Set([
    'cool-blue',
    'pink-lavender',
    'violet-orange',
    'neon-red-cyan',
    'neon-dual',
    'cyan-floor',
    'purple-gold-split',
    'iridescent',
    'rainbow',
    'rainbow-prism',
    'blue-red-drama'
  ])
};

function kaoruCreativeAtmosphereTags(preset){
  const tags=new Set(preset?.tags||[]);
  const id=preset?.id||'';
  const type=
    preset?.scene?.effect?.type||
    preset?.backdrop?.effect?.type||
    'none';

  Object.entries(
    KAORU_CREATIVE_ATMO_FILTERS
  ).forEach(([tag,ids])=>{
    if(ids.has(id))tags.add(tag);
  });

  if([
    'stripe',
    'window',
    'leaves',
    'blinds',
    'bokeh',
    'circles',
    'sparkles',
    'underwater',
    'caustics'
  ].includes(type)){
    tags.add('pattern');
  }

  if([
    'iridescent',
    'rainbow',
    'underwater',
    'caustics',
    'sparkles',
    'bokeh',
    'circles'
  ].includes(type)){
    tags.add('fantasy');
  }

  if([
    'split',
    'neon',
    'iridescent',
    'rainbow'
  ].includes(type)){
    tags.add('color');
  }

  if([
    'glow',
    'rim',
    'window',
    'leaves',
    'blinds'
  ].includes(type)){
    tags.add('natural');
  }

  return tags;
}

function kaoruNormalizeAtmosphereSearch(value){
  return String(value||'')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .trim();
}

function kaoruCreativeAtmosphereMatches(
  preset,
  filter
){
  const tags=
    kaoruCreativeAtmosphereTags(
      preset
    );

  const id=
    String(preset?.id||'');

  const isNew=
    id.startsWith('ref-');

  const isCustom=
    id.startsWith('user-atmo-');

  const filterMatch=
    filter==='all'||
    (filter==='new'&&isNew)||
    (
      filter==='classic'&&
      !isNew&&
      !isCustom
    )||
    (
      filter==='favorite'&&
      isFavoriteLightingPreset(id)
    )||
    (
      filter==='custom'&&
      isCustom
    )||
    tags.has(filter);

  if(!filterMatch){
    return false;
  }

  const query=
    kaoruNormalizeAtmosphereSearch(
      creativeAtmosphereSearch
    );

  if(!query){
    return true;
  }

  const haystack=
    kaoruNormalizeAtmosphereSearch(
      [
        preset?.id,
        preset?.name,
        preset?.description,
        ...tags
      ].filter(Boolean).join(' ')
    );

  return haystack.includes(query);
}



function kaoruUserAtmospheres3d(){
  return listCustomLightingPresets('3d')
    .map((record)=>{
      const atmosphere=
        record.snapshot?.atmosphere||{};
      const lighting=
        record.snapshot?.lighting||{};
      const lights=
        Array.isArray(lighting.lights)
          ?lighting.lights
          :[];
      const key=lights[0]||{
        color:'#FFFFFF',
        intensity:70,
        azimuth:0,
        elevation:45,
        distance:5.4,
        softness:50
      };
      const fill=lights[1]||key;

      return{
        id:record.id,
        group:'creative',
        tags:['custom'],
        name:record.name,
        description:
          record.description||
          'Variante personalizada',
        userPreset:true,
        scene:{
          id:record.id,
          background:
            atmosphere.background||
            '#15121A',
          fog:
            atmosphere.fog||
            atmosphere.background||
            '#15121A',
          floor:
            atmosphere.floor||
            '#29242F',
          exposure:
            Number(
              atmosphere.exposure??1
            ),
          weather:
            atmosphere.weather||
            'clear',
          effect:
            structuredClone(
              atmosphere.effect||
              lighting.projector||
              {type:'none'}
            )
        },
        lighting:{
          ambient:{
            ...(lighting.ambient||{
              color:'#777777',
              intensity:20
            })
          },
          shadow:{
            ...(lighting.shadow||{
              color:'#202020',
              intensity:45
            })
          },
          bounce:{
            ...(lighting.bounce||{
              color:'#555555',
              intensity:12
            })
          },
          rim:{
            ...(lighting.rim||{
              color:'#FFFFFF',
              intensity:10
            })
          },
          key:{...key},
          fill:{...fill}
        }
      };
    });
}

function kaoruAllCreativeAtmospheres3d(){
  return[
    ...THREE_ATMOSPHERES.filter(
      preset=>preset.group==='creative'
    ),
    ...kaoruUserAtmospheres3d()
  ];
}

function kaoruRefreshCreativeAtmospheres3d(){
  elements.creativeAtmosphereGrid
    ?.replaceChildren();

  renderAtmospheres3d(
    store.getState()
  );
}

function kaoruAtmosphereEffectLabel(type){
  const labels={
    none:'',
    glow:'Glow',
    split:'Split',
    stripe:'Franja',
    window:'Ventana',
    leaves:'Follaje',
    blinds:'Persianas',
    grid:'Rejilla',
    neon:'Neón',
    rim:'Rim',
    iridescent:'Iridescente',
    rainbow:'Prisma',
    bokeh:'Bokeh',
    circles:'Círculos',
    sparkles:'Brillos',
    blacklight:'Blacklight',
    flash:'Flash',
    caustics:'Caústicas',
    underwater:'Acuático'
  };

  return labels[type]||type||'';
}

function kaoruAtmosphereDirectionLabel(
  azimuth,
  elevation
){
  const a=Number(azimuth||0);
  const e=Number(elevation||0);

  if(e>=68)return 'Cenital';
  if(e<=-28)return 'Inferior';
  if(Math.abs(a)>=138)return 'Trasera';
  if(a<=-48)return 'Izquierda';
  if(a>=48)return 'Derecha';
  return 'Frontal';
}

function kaoruAtmosphereSoftnessLabel(
  softness
){
  const value=Number(softness??50);

  if(value<=24)return 'Dura';
  if(value<=64)return 'Media';
  return 'Difusa';
}

function kaoruAtmosphereVisual3d(
  preset
){
  const key=
    preset?.lighting?.key||{};

  const fill=
    preset?.lighting?.fill||{};

  const shadow=
    preset?.lighting?.shadow||{};

  const ambient=
    preset?.lighting?.ambient||{};

  const rim=
    preset?.lighting?.rim||{};

  const effect=
    preset?.scene?.effect||{};

  const azimuth=
    Number(key.azimuth||0);

  const elevation=
    Number(key.elevation||0);

  const rad=
    azimuth*Math.PI/180;

  const elevRad=
    elevation*Math.PI/180;

  const x=
    Math.max(
      12,
      Math.min(
        88,
        50+Math.sin(rad)*34
      )
    );

  const y=
    Math.max(
      12,
      Math.min(
        88,
        53-Math.sin(elevRad)*32
      )
    );

  return{
    key:key.color||'#FFFFFF',
    fill:
      fill.color||
      ambient.color||
      '#8A8A92',
    shadow:
      shadow.color||
      '#24242B',
    base:
      preset?.scene?.background||
      '#85818A',
    rim:
      rim.color||
      key.color||
      '#FFFFFF',
    x,
    y,
    direction:
      kaoruAtmosphereDirectionLabel(
        azimuth,
        elevation
      ),
    softness:
      kaoruAtmosphereSoftnessLabel(
        key.softness
      ),
    effectLabel:
      kaoruAtmosphereEffectLabel(
        effect.type
      )
  };
}


function kaoruPresetWarmth3d(preset){
  const color=
    preset?.lighting?.key?.color||
    preset?.scene?.effect?.colorA||
    '#808080';

  const match=
    /^#([0-9a-f]{6})$/i.exec(
      String(color)
    );

  if(!match)return 0;

  const value=parseInt(match[1],16);
  const r=(value>>16)&255;
  const g=(value>>8)&255;
  const b=value&255;

  return(
    (r-b)+
    ((r+g-b*2)*.12)
  );
}

function kaoruPresetIntensity3d(preset){
  return Number(
    preset?.lighting?.key?.intensity??
    0
  );
}

function kaoruPresetSoftness3d(preset){
  return Number(
    preset?.lighting?.key?.softness??
    50
  );
}

function kaoruPresetType3d(preset){
  return(
    kaoruAtmosphereEffectLabel(
      preset?.scene?.effect?.type
    )||
    kaoruAtmosphereDirectionLabel(
      preset?.lighting?.key?.azimuth,
      preset?.lighting?.key?.elevation
    )
  );
}

function kaoruCompareText(a,b){
  return String(a||'').localeCompare(
    String(b||''),
    'es',
    {sensitivity:'base'}
  );
}

function kaoruSortCreativeAtmospheres3d(
  presets
){
  const items=[...presets];

  switch(creativeAtmosphereSort){
    case 'favorite':
      return items.sort((a,b)=>
        Number(
          isFavoriteLightingPreset(b.id)
        )-
        Number(
          isFavoriteLightingPreset(a.id)
        )||
        kaoruCompareText(
          a.name,
          b.name
        )
      );

    case 'name':
      return items.sort((a,b)=>
        kaoruCompareText(
          a.name,
          b.name
        )
      );

    case 'intensity-desc':
      return items.sort((a,b)=>
        kaoruPresetIntensity3d(b)-
        kaoruPresetIntensity3d(a)||
        kaoruCompareText(a.name,b.name)
      );

    case 'intensity-asc':
      return items.sort((a,b)=>
        kaoruPresetIntensity3d(a)-
        kaoruPresetIntensity3d(b)||
        kaoruCompareText(a.name,b.name)
      );

    case 'warm':
      return items.sort((a,b)=>
        kaoruPresetWarmth3d(b)-
        kaoruPresetWarmth3d(a)||
        kaoruCompareText(a.name,b.name)
      );

    case 'cool':
      return items.sort((a,b)=>
        kaoruPresetWarmth3d(a)-
        kaoruPresetWarmth3d(b)||
        kaoruCompareText(a.name,b.name)
      );

    case 'hard':
      return items.sort((a,b)=>
        kaoruPresetSoftness3d(a)-
        kaoruPresetSoftness3d(b)||
        kaoruCompareText(a.name,b.name)
      );

    case 'diffuse':
      return items.sort((a,b)=>
        kaoruPresetSoftness3d(b)-
        kaoruPresetSoftness3d(a)||
        kaoruCompareText(a.name,b.name)
      );

    case 'type':
      return items.sort((a,b)=>
        kaoruCompareText(
          kaoruPresetType3d(a),
          kaoruPresetType3d(b)
        )||
        kaoruCompareText(a.name,b.name)
      );

    case 'direction':
      return items.sort((a,b)=>
        kaoruCompareText(
          kaoruAtmosphereDirectionLabel(
            a?.lighting?.key?.azimuth,
            a?.lighting?.key?.elevation
          ),
          kaoruAtmosphereDirectionLabel(
            b?.lighting?.key?.azimuth,
            b?.lighting?.key?.elevation
          )
        )||
        kaoruCompareText(a.name,b.name)
      );

    default:
      return items;
  }
}


function kaoruEscapeCompareHtml(value){
  return String(value??'')
    .replace(
      /[&<>"']/g,
      (char)=>({
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#39;'
      }[char])
    );
}

function kaoruComparePresetById3d(id){
  return kaoruAllCreativeAtmospheres3d()
    .find(
      preset=>preset.id===id
    )||null;
}

function kaoruFillCompareSelect3d(
  select,
  presets,
  fallbackIndex
){
  if(!select)return;

  const signature=
    presets
      .map(
        preset=>
          `${preset.id}:${preset.name}`
      )
      .join('|');

  const current=
    select.value;

  if(
    select.dataset.signature!==
    signature
  ){
    select.dataset.signature=
      signature;

    select.replaceChildren(
      ...presets.map((preset)=>{
        const option=
          document.createElement(
            'option'
          );

        option.value=preset.id;
        option.textContent=
          preset.name;

        return option;
      })
    );
  }

  if(
    current&&
    presets.some(
      preset=>preset.id===current
    )
  ){
    select.value=current;
  }else if(presets.length){
    select.value=
      presets[
        Math.min(
          fallbackIndex,
          presets.length-1
        )
      ].id;
  }
}

function kaoruRenderCompareCard3d(
  card,
  preset
){
  if(!card)return;

  if(!preset){
    card.innerHTML=
      '<p class="preset-compare-empty">Sin preset</p>';
    return;
  }

  const visual=
    kaoruAtmosphereVisual3d(
      preset
    );

  const effect=
    preset.scene?.effect||{};

  card.dataset.effect=
    effect.type||'none';

  card.style.setProperty(
    '--atmo-bg',
    preset.scene?.background||
    '#2A2432'
  );

  card.style.setProperty(
    '--atmo-floor',
    preset.scene?.floor||
    '#241F2A'
  );

  card.style.setProperty(
    '--atmo-light',
    visual.key
  );

  card.style.setProperty(
    '--atmo-effect-a',
    effect.colorA||
    visual.key
  );

  card.style.setProperty(
    '--atmo-effect-b',
    effect.colorB||
    visual.fill
  );

  card.style.setProperty(
    '--pv-key',
    visual.key
  );

  card.style.setProperty(
    '--pv-fill',
    visual.fill
  );

  card.style.setProperty(
    '--pv-shadow',
    visual.shadow
  );

  card.style.setProperty(
    '--pv-base',
    visual.base
  );

  card.style.setProperty(
    '--pv-rim',
    visual.rim
  );

  card.style.setProperty(
    '--pv-x',
    `${visual.x}%`
  );

  card.style.setProperty(
    '--pv-y',
    `${visual.y}%`
  );

  const intensity=
    Math.round(
      kaoruPresetIntensity3d(
        preset
      )
    );

  const softness=
    Math.round(
      kaoruPresetSoftness3d(
        preset
      )
    );

  card.innerHTML=`
    <span class="preset-compare-preview atmosphere-preview atmosphere-3d-preview" aria-hidden="true">
      <b class="atmo-study-orb"></b>
      <i></i>
    </span>
    <span class="preset-compare-copy">
      <strong>${kaoruEscapeCompareHtml(preset.name)}</strong>
      <small>${kaoruEscapeCompareHtml(preset.description)}</small>
      <span class="atmo-visual-meta">
        <em>${kaoruEscapeCompareHtml(visual.direction)}</em>
        <em>${kaoruEscapeCompareHtml(visual.softness)}</em>
        ${
          visual.effectLabel
            ?`<em>${kaoruEscapeCompareHtml(visual.effectLabel)}</em>`
            :''
        }
      </span>
      <dl class="preset-compare-stats">
        <div>
          <dt>Intensidad</dt>
          <dd>${intensity}%</dd>
        </div>
        <div>
          <dt>Softness</dt>
          <dd>${softness}%</dd>
        </div>
      </dl>
      <span class="preset-compare-swatches" aria-label="Colores principales">
        <i style="background:${visual.key}" title="Principal ${visual.key}"></i>
        <i style="background:${visual.fill}" title="Relleno ${visual.fill}"></i>
        <i style="background:${visual.shadow}" title="Sombra ${visual.shadow}"></i>
        <i style="background:${visual.rim}" title="Rim ${visual.rim}"></i>
      </span>
    </span>
  `;
}

function kaoruRenderComparator3d(){
  const presets=
    kaoruSortCreativeAtmospheres3d(
      kaoruAllCreativeAtmospheres3d()
    );

  kaoruFillCompareSelect3d(
    elements.compareAtmosphereA,
    presets,
    0
  );

  kaoruFillCompareSelect3d(
    elements.compareAtmosphereB,
    presets,
    1
  );

  kaoruRenderCompareCard3d(
    elements.compareAtmosphereCardA,
    kaoruComparePresetById3d(
      elements.compareAtmosphereA
        ?.value
    )
  );

  kaoruRenderCompareCard3d(
    elements.compareAtmosphereCardB,
    kaoruComparePresetById3d(
      elements.compareAtmosphereB
        ?.value
    )
  );
}

function normalizeHex(
  value
) {
  const raw =
    String(value || '')
      .trim()
      .toUpperCase();

  const prefixed =
    raw.startsWith('#')
      ? raw
      : `#${raw}`;

  return /^#[0-9A-F]{6}$/.test(
    prefixed
  )
    ? prefixed
    : null;
}

function toast(message) {
  elements.toast.textContent =
    message;

  elements.toast.classList.add(
    'is-visible'
  );

  clearTimeout(toastTimer);

  toastTimer = setTimeout(
    () =>
      elements.toast.classList.remove(
        'is-visible'
      ),
    1800
  );
}

function selectedLight(
  state = store.getState()
) {
  return (
    state.lighting.lights.find(
      (light) =>
        light.id ===
        state.lighting.selectedLightId
    ) ||
    state.lighting.lights[0] ||
    null
  );
}

function updateSelectedLight(
  patch
) {
  store.setState((state) => {
    const selectedId =
      state.lighting.selectedLightId;

    return {
      ...state,
      lighting: {
        ...state.lighting,
        lights:
          state.lighting.lights.map(
            (light) =>
              light.id === selectedId
                ? {
                    ...light,
                    ...patch
                  }
                : light
          )
      }
    };
  });
}

function updateEnvironment(
  key,
  patch
) {
  store.setState((state) => ({
    ...state,
    lighting: {
      ...state.lighting,
      [key]: {
        ...state.lighting[key],
        ...patch
      }
    }
  }));
}

function setInputValue(
  input,
  value
) {
  if (
    !input ||
    document.activeElement === input
  ) {
    return;
  }

  input.value = value;
}

function customCard(
  state
) {
  if (!state.customModel) {
    return null;
  }

  return {
    id: 'custom',
    name: 'Modelo importado',
    description:
      state.customModel.name ||
      'Modelo local',
    ready: true,
    source: 'custom-local'
  };
}

function allModelEntries(
  state
) {
  const custom = customCard(state);

  return custom
    ? [
        ...MODEL_REGISTRY,
        custom
      ]
    : MODEL_REGISTRY;
}

function renderCards(state) {
  elements.cards.replaceChildren(
    ...allModelEntries(state).map(
      (entry) => {
        const button =
          document.createElement(
            'button'
          );

        button.type = 'button';

        button.className = [
          'model-card',
          entry.id ===
          state.selectedModel
            ? 'is-active'
            : '',
          entry.ready
            ? 'is-ready'
            : ''
        ]
          .filter(Boolean)
          .join(' ');

        button.dataset.model =
          entry.id;

        button.innerHTML = `
          <strong>${entry.name}</strong>
          <small>${entry.description}</small>
          <em>${
            entry.id === 'asaro'
              ? 'PLANOS GLB'
              : entry.id === 'sphere'
                ? 'PRUEBA DE PALETA'
                : entry.id === 'cube'
                  ? 'PLANOS DUROS'
                  : entry.id === 'asaro-alt'
                    ? 'CABEZA EXTRA'
                    : entry.id === 'male-base'
                      ? 'MALLA LOCAL'
                      : entry.id === 'custom'
                        ? 'MODELO LOCAL'
                        : 'ANATOMIA CC0'
          }</em>
        `;

        return button;
      }
    )
  );
}

function sourceDescription(
  state
) {
  const info =
    engine?.getModelInfo?.();

  if (state.selectedModel === 'custom') {
    return (
      state.customModel?.name ||
      'Modelo local'
    );
  }

  if (state.selectedModel === 'cube') {
    return 'Cubo 3D nativo';
  }

  if (state.selectedModel === 'asaro-alt') {
    return 'Cabeza adicional local';
  }

  if (state.selectedModel === 'male-base') {
    return 'Malla masculina local';
  }

  if (!info) {
    return state.selectedModel === 'asaro'
      ? 'Head Planes Reference'
      : 'MakeHuman CC0';
  }

  if (info.source === 'study-sphere') {
    return 'Esfera 3D de estudio';
  }

  if (info.source === 'glb') {
    return 'Head Planes Reference';
  }

  if (info.source === 'fallback') {
    return 'Fallback por codigo';
  }

  if (
    info.source ===
    'makehuman-cc0'
  ) {
    return 'MakeHuman / MPFB2 CC0';
  }

  if (
    info.source ===
    'custom-local'
  ) {
    return (
      state.customModel?.name ||
      'Modelo local'
    );
  }

  return info.source || 'Modelo 3D';
}

function renderLightList(
  state
) {
  const selectedId =
    state.lighting.selectedLightId;

  elements.lightList.replaceChildren(
    ...state.lighting.lights.map(
      (light, index) => {
        const button =
          document.createElement(
            'button'
          );

        button.type = 'button';

        button.className =
          `light-list-item${
            light.id === selectedId
              ? ' is-active'
              : ''
          }`;

        button.dataset.lightId =
          light.id;

        button.innerHTML = `
          <i style="background:${light.color}"></i>
          <span>
            <strong>${
              light.name ||
              `Luz ${index + 1}`
            }</strong>
            <small>${
              light.enabled
                ? `${Math.round(
                    light.intensity
                  )}%`
                : 'Apagada'
            }</small>
          </span>
        `;

        return button;
      }
    )
  );

  elements.addLight.disabled =
    state.lighting.lights.length >=
    MAX_3D_LIGHTS;
}

function renderSelectedLight(
  state
) {
  const light =
    selectedLight(state);

  const disabled = !light;

  [
    elements.lightName,
    elements.lightEnabled,
    elements.lightColor,
    elements.lightHex,
    elements.lightIntensity,
    elements.lightAzimuth,
    elements.lightElevation,
    elements.lightDistance,
    elements.lightSoftness,
    elements.duplicateLight,
    elements.deleteLight
  ].forEach((element) => {
    if (element) {
      element.disabled = disabled;
    }
  });

  if (!light) return;

  setInputValue(
    elements.lightName,
    light.name
  );

  elements.lightEnabled.checked =
    light.enabled;

  setInputValue(
    elements.lightColor,
    light.color
  );

  setInputValue(
    elements.lightHex,
    light.color
  );

  setInputValue(
    elements.lightIntensity,
    light.intensity
  );

  setInputValue(
    elements.lightAzimuth,
    light.azimuth
  );

  setInputValue(
    elements.lightElevation,
    light.elevation
  );

  setInputValue(
    elements.lightDistance,
    light.distance
  );

  setInputValue(
    elements.lightSoftness,
    light.softness
  );

  elements.lightIntensityOut.textContent =
    `${Math.round(
      light.intensity
    )}%`;

  elements.lightAzimuthOut.textContent =
    `${Math.round(
      light.azimuth
    )} deg`;

  elements.lightElevationOut.textContent =
    `${Math.round(
      light.elevation
    )} deg`;

  elements.lightDistanceOut.textContent =
    `${Number(
      light.distance
    ).toFixed(1)}`;

  elements.lightSoftnessOut.textContent =
    `${Math.round(
      light.softness
    )}%`;

  elements.deleteLight.disabled =
    state.lighting.lights.length <= 1;
}

function renderEnvironment(
  state
) {
  environmentIds.forEach((key) => {
    const config =
      state.lighting[key];

    const color =
      byId(`${key}Color`);

    const hex =
      byId(`${key}Hex`);

    const intensity =
      byId(`${key}Intensity`);

    const output =
      byId(`${key}IntensityOut`);

    setInputValue(
      color,
      config.color
    );

    setInputValue(
      hex,
      config.color
    );

    setInputValue(
      intensity,
      config.intensity
    );

    if (output) {
      output.textContent =
        `${Math.round(
          config.intensity
        )}%`;
    }
  });
}

function renderPalettePreview(
  state
) {
  const entries =
    state.material.palette || [];

  elements.palettePreview.innerHTML =
    '';

  entries.slice(0, 16).forEach(
    (entry) => {
      const swatch =
        document.createElement(
          'button'
        );

      swatch.type = 'button';
      swatch.className =
        'bridge-swatch';

      swatch.style.background =
        entry.hex;

      swatch.title =
        `${entry.role}: ${entry.hex}`;

      swatch.addEventListener(
        'click',
        async () => {
          try {
            await navigator.clipboard.writeText(
              entry.hex
            );

            toast(
              `${entry.hex} copiado`
            );
          } catch (_) {}
        }
      );

      elements.palettePreview.appendChild(
        swatch
      );
    }
  );

  if (!entries.length) {
    elements.palettePreview.innerHTML =
      '<span class="palette-none">Sin paleta aplicada</span>';
  }
}

/* === KAORU CREATIVE ATMOSPHERES EDITABLE V1 === */

function kaoruPopulateAtmosphereGrid(
  container,
  presets
){
  if(
    !container||
    container.childElementCount
  ){
    return;
  }

  container.replaceChildren(
    ...presets.map(
      (preset)=>{
        const button=
          document.createElement(
            'button'
          );

        const effect=
          preset.scene?.effect||{};

        button.type='button';
        button.className=
          'atmosphere-3d-card';

        button.dataset.atmosphere=
          preset.id;

        button.title=
          `${preset.name} — ${preset.description}`;

        button.dataset.effect=
          effect.type||'none';

        button.style.setProperty(
          '--atmo-bg',
          preset.scene.background
        );

        button.style.setProperty(
          '--atmo-floor',
          preset.scene.floor
        );

        button.style.setProperty(
          '--atmo-light',
          preset.lighting.key.color
        );

        button.style.setProperty(
          '--atmo-effect-a',
          effect.colorA||'#FFFFFF'
        );

        button.style.setProperty(
          '--atmo-effect-b',
          effect.colorB||'#7C3AED'
        );

        const visual=
          kaoruAtmosphereVisual3d(
            preset
          );

        button.style.setProperty(
          '--pv-key',
          visual.key
        );

        button.style.setProperty(
          '--pv-fill',
          visual.fill
        );

        button.style.setProperty(
          '--pv-shadow',
          visual.shadow
        );

        button.style.setProperty(
          '--pv-base',
          visual.base
        );

        button.style.setProperty(
          '--pv-rim',
          visual.rim
        );

        button.style.setProperty(
          '--pv-x',
          `${visual.x}%`
        );

        button.style.setProperty(
          '--pv-y',
          `${visual.y}%`
        );

        const favorite=
          isFavoriteLightingPreset(
            preset.id
          );

        button.innerHTML=`
          <span class="atmosphere-3d-preview" aria-hidden="true">
            <b class="atmo-study-orb"></b>
            <i></i>
          </span>
          <span class="atmo-card-copy">
            <strong>${preset.name}</strong>
            <small>${preset.description}</small>
            <span class="atmo-visual-meta">
              <em>${visual.direction}</em>
              <em>${visual.softness}</em>
              ${
                visual.effectLabel
                  ?`<em>${visual.effectLabel}</em>`
                  :''
              }
            </span>
            <span class="atmo-card-actions">
              <span
                class="atmo-favorite-toggle"
                data-favorite-toggle="${preset.id}"
                role="button"
                tabindex="0"
                title="${favorite?'Quitar de favoritos':'Agregar a favoritos'}"
                aria-label="${favorite?'Quitar de favoritos':'Agregar a favoritos'}"
              >${favorite?'★':'☆'}</span>
              ${
                preset.userPreset
                  ?`<span
                      class="atmo-delete-user"
                      data-user-preset-delete="${preset.id}"
                      role="button"
                      tabindex="0"
                      title="Eliminar preset personal"
                      aria-label="Eliminar preset personal"
                    >×</span>`
                  :''
              }
            </span>
          </span>
        `;

        return button;
      }
    )
  );
}

function kaoruAtmosphereHex(
  value,
  fallback
){
  return(
    normalizeHex(value)||
    fallback
  );
}

function renderAtmospheres3d(
  state
){
  const environmentPresets=
    THREE_ATMOSPHERES.filter(
      preset=>
        preset.group!=='creative'
    );

  const creativePresets=
    kaoruSortCreativeAtmospheres3d(
      kaoruAllCreativeAtmospheres3d()
        .filter(
          preset=>
            kaoruCreativeAtmosphereMatches(
              preset,
              creativeAtmosphereFilter
            )
        )
    );

  kaoruPopulateAtmosphereGrid(
    elements.atmosphereGrid,
    environmentPresets
  );

  kaoruPopulateAtmosphereGrid(
    elements.creativeAtmosphereGrid,
    creativePresets
  );

  kaoruRenderComparator3d();

  if(elements.creativeAtmosphereCount){
    elements.creativeAtmosphereCount
      .textContent=
        `${creativePresets.length} estilo${
          creativePresets.length===1
            ?''
            :'s'
        }`;
  }

  const atmosphere=
    state.scene?.atmosphere||{};

  const active=
    atmosphere.id||
    'custom';

  const effect=
    state.lighting?.projector||
    atmosphere.effect||{
      type:'none',
      colorA:'#FFFFFF',
      colorB:'#7C3AED',
      intensity:0,
      angle:0,
      scale:100
    };

  document.body.dataset.atmosphere=
    atmosphere.weather||
    active;

  /*
    El patron ya no es un overlay del viewport:
    se proyecta desde el SpotLight real.
  */
  document.body.dataset.atmoEffect=
    'none';

  document.body.dataset.realProjector=
    effect.type||
    'none';

  const viewportStyle=
    elements.viewportCard?.style;

  viewportStyle?.setProperty(
    '--atmo-effect-a',
    effect.colorA||'#FFFFFF'
  );

  viewportStyle?.setProperty(
    '--atmo-effect-b',
    effect.colorB||'#7C3AED'
  );

  viewportStyle?.setProperty(
    '--atmo-effect-opacity',
    String(
      Math.max(
        0,
        Math.min(
          1,
          Number(effect.opacity??effect.intensity??0)/100
        )
      )
    )
  );

  const effectAngle=
    Number(effect.angle||0);

  viewportStyle?.setProperty(
    '--atmo-effect-angle',
    `${effectAngle}deg`
  );

  viewportStyle?.setProperty(
    '--atmo-effect-angle-cross',
    `${effectAngle+90}deg`
  );

  const effectSize=
    Math.max(
      10,
      Math.round(
        Number(effect.scale||100)*
        .34
      )
    );

  viewportStyle?.setProperty(
    '--atmo-effect-size',
    `${effectSize}px`
  );

  viewportStyle?.setProperty(
    '--atmo-effect-line',
    `${Math.max(
      2,
      Math.round(effectSize*.20)
    )}px`
  );

  viewportStyle?.setProperty(
    '--atmo-effect-gap',
    `${Math.max(
      6,
      Math.round(effectSize*.48)
    )}px`
  );

  viewportStyle?.setProperty(
    '--atmo-effect-leaf-w',
    `${effectSize*4}px`
  );

  viewportStyle?.setProperty(
    '--atmo-effect-leaf-h',
    `${effectSize*3}px`
  );

  [
    elements.atmosphereGrid,
    elements.creativeAtmosphereGrid
  ].forEach(container=>{
    container
      ?.querySelectorAll(
        '[data-atmosphere]'
      )
      .forEach(button=>{
        const selected=
          button.dataset.atmosphere===
          active;

        button.classList.toggle(
          'is-active',
          selected
        );

        button.setAttribute(
          'aria-pressed',
          String(selected)
        );
      });
  });

  const preset=
    atmosphere3dById(active);

  if(elements.atmosphereEditorLabel){
    elements.atmosphereEditorLabel
      .textContent=
        `${
          preset?.id===active
            ?preset.name
            :'Personalizado'
        } · editable`;
  }

  const background=
    kaoruAtmosphereHex(
      atmosphere.background,
      '#15121A'
    );

  const fog=
    kaoruAtmosphereHex(
      atmosphere.fog,
      background
    );

  const floor=
    kaoruAtmosphereHex(
      atmosphere.floor,
      '#29242F'
    );

  const effectA=
    kaoruAtmosphereHex(
      effect.colorA,
      '#FFFFFF'
    );

  const effectB=
    kaoruAtmosphereHex(
      effect.colorB,
      '#7C3AED'
    );

  if(elements.atmosphereBackground){
    elements.atmosphereBackground.value=
      background;
    elements.atmosphereBackgroundHex.value=
      background;
    elements.atmosphereFog.value=fog;
    elements.atmosphereFogHex.value=fog;
    elements.atmosphereFloor.value=floor;
    elements.atmosphereFloorHex.value=floor;
    elements.atmosphereEffectType.value=
      effect.type||'none';
    elements.atmosphereEffectA.value=
      effectA;
    elements.atmosphereEffectAHex.value=
      effectA;
    elements.atmosphereEffectB.value=
      effectB;
    elements.atmosphereEffectBHex.value=
      effectB;

    const exposure=
      Number(
        atmosphere.exposure??1
      );

    elements.atmosphereExposure.value=
      String(exposure);

    elements.atmosphereExposureOut
      .textContent=
        exposure.toFixed(2);

    const opacity=
      Number(
        effect.opacity??
        effect.intensity??
        0
      );

    elements.atmosphereEffectOpacity.value=
      String(opacity);

    elements.atmosphereEffectOpacityOut
      .textContent=
        `${Math.round(opacity)}%`;

    const angle=
      Number(
        effect.angle??0
      );

    elements.atmosphereEffectAngle.value=
      String(angle);

    elements.atmosphereEffectAngleOut
      .textContent=
        `${Math.round(angle)} deg`;

    const scale=
      Number(
        effect.scale??100
      );

    elements.atmosphereEffectScale.value=
      String(scale);

    elements.atmosphereEffectScaleOut
      .textContent=
        `${Math.round(scale)}%`;

    const projectorLightId=
      effect.lightId||
      state.lighting?.lights?.[0]?.id||
      '';

    if(elements.atmosphereProjectorLight){
      const optionsSignature=
        (state.lighting?.lights||[])
          .map(
            light=>
              `${light.id}:${light.name}`
          )
          .join('|');

      if(
        elements.atmosphereProjectorLight
          .dataset.signature!==
        optionsSignature
      ){
        elements.atmosphereProjectorLight
          .dataset.signature=
            optionsSignature;

        elements.atmosphereProjectorLight
          .replaceChildren(
            ...(state.lighting?.lights||[])
              .map(light=>{
                const option=
                  document.createElement(
                    'option'
                  );

                option.value=light.id;
                option.textContent=
                  light.name||'Luz';

                return option;
              })
          );
      }

      if(
        document.activeElement !==
        elements.atmosphereProjectorLight
      ){
        elements.atmosphereProjectorLight.value=
          projectorLightId;
      }
    }

    [
      [elements.atmosphereEffectX,elements.atmosphereEffectXOut,Number(effect.offsetX||0),'%'],
      [elements.atmosphereEffectY,elements.atmosphereEffectYOut,Number(effect.offsetY||0),'%'],
      [elements.atmosphereEffectBlur,elements.atmosphereEffectBlurOut,Number(effect.blur??8),'%'],
      [elements.atmosphereEffectContrast,elements.atmosphereEffectContrastOut,Number(effect.contrast??70),'%'],
      [elements.atmosphereEffectDensity,elements.atmosphereEffectDensityOut,Number(effect.density??50),'%']
    ].forEach(
      ([input,output,value,suffix])=>{
        if(
          input &&
          document.activeElement !== input
        ){
          input.value=String(value);
        }

        if(output){
          output.textContent=
            `${Math.round(value)}${suffix}`;
        }
      }
    );
  }
}
function renderState(state) {
  renderAtmospheres3d(state);
  const model =
    state.selectedModel === 'custom'
      ? {
          name:
            state.customModel?.name ||
            'Modelo importado'
        }
      : modelById(
          state.selectedModel
        );

  const selected =
    selectedLight(state);

  elements.stageTitle.textContent =
    model.name;

  elements.stateModel.textContent =
    model.name;

  elements.stateColor.textContent =
    state.baseColor;

  elements.stateSource.textContent =
    sourceDescription(state);

  elements.stateLights.textContent =
    `${
      state.lighting.lights.filter(
        (light) => light.enabled
      ).length
    } / ${MAX_3D_LIGHTS}`;

  elements.stateSelectedLight.textContent =
    selected?.name || 'Ninguna';

  elements.statePalette.textContent =
    state.material.sourcePalette?.name ||
    (
      state.material.paletteMode ===
      'palette-bands'
        ? 'Paleta 16 colores'
        : 'Color base'
    );

  const info =
    engine?.getModelInfo?.();

  const morphCount =
    info?.morphCount || 0;

  elements.stateMorphs.textContent =
    state.selectedModel === 'asaro'
      ? 'No aplica'
      : morphCount
        ? `${morphCount} disponibles`
        : 'Base parametrica';

  setInputValue(
    elements.baseColor,
    state.baseColor
  );

  setInputValue(
    elements.baseHex,
    state.baseColor
  );

  setInputValue(
    elements.projectName,
    state.project?.name ||
      'Proyecto 3D Lighting'
  );

  elements.gridToggle.checked =
    state.scene.gridVisible;

  elements.shadowToggle.checked =
    state.scene.shadowsEnabled;

  elements.edgeToggle.checked =
    false;

  elements.edgeToggle.disabled =
    true;

  elements.lightingEnabled.checked =
    state.lighting.enabled;

  elements.showLightHelpers.checked =
    state.lighting.showHelpers;

  elements.paletteSync.checked =
    state.material.syncLighting !==
    false;

  elements.paletteMode.value =
    state.material.paletteMode ||
    'base-only';

  elements.paletteBridge.textContent =
    state.material.sourcePalette
      ? `Aplicada: ${
          state.material.sourcePalette.name
        }`
      : '16 colores preparados para Light Lab';

  elements.customModelStatus.textContent =
    state.customModel
      ? `${state.customModel.name} - ${
          state.customModel.fileNames?.length ||
          customModelFiles.length
        } archivo(s)`
      : 'Ningun modelo local cargado';

  renderCards(state);
  renderLightList(state);
  renderSelectedLight(state);
  renderEnvironment(state);
  renderPalettePreview(state);
}

async function setEngineModel(
  state
) {
  if (!engine) return;

  if (
    state.selectedModel === 'custom'
  ) {
    if (!customModelFiles.length) {
      toast(
        'El proyecto necesita volver a cargar su modelo local.'
      );

      return;
    }

    await engine.setCustomModel(
      customModelFiles,
      state.baseColor
    );
  } else {
    await engine.setModel(
      state.selectedModel,
      state.baseColor
    );
  }

  engine.applyMaterialState(
    state.material
  );

  engine.setCameraPreset(
    state.camera.preset
  );
}

async function updateEngineFromState(
  state
) {
  if (!engine) return;

  if (
    engine.getCurrentModel() !==
    state.selectedModel
  ) {
    const token =
      ++modelLoadToken;

    elements.viewportOverlay.classList.remove(
      'is-hidden'
    );

    elements.viewportMessage.textContent =
      'Cargando modelo 3D...';

    try {
      await setEngineModel(state);

      if (
        token !==
        modelLoadToken
      ) {
        return;
      }

      renderState(
        store.getState()
      );
    } catch (error) {
      console.error(error);

      toast(
        error.message ||
        'No se pudo cargar el modelo.'
      );
    } finally {
      if (
        token ===
        modelLoadToken
      ) {
        elements.viewportOverlay.classList.add(
          'is-hidden'
        );
      }
    }
  }

  engine.setBaseColor(
    state.baseColor
  );

  engine.applyMaterialState(
    state.material
  );

  engine.setGridVisible(
    state.scene.gridVisible
  );

  engine.setAtmosphere?.(
    state.scene?.atmosphere
  );

  engine.setShadowsEnabled(
    state.scene.shadowsEnabled
  );

  engine.applyLightingState(
    state.lighting
  );

  engine.setSelectedLight(
    state.lighting.selectedLightId
  );

  engine.setLightHelpersVisible(
    state.lighting.showHelpers
  );
}

async function refreshPaletteLibrary() {
  paletteLibrary =
    await listAvailableLightLabPalettes();

  const selected =
    elements.paletteSelect.value;

  elements.paletteSelect.innerHTML =
    '';

  const placeholder =
    document.createElement(
      'option'
    );

  placeholder.value = '';
  placeholder.textContent =
    paletteLibrary.length
      ? 'Selecciona una paleta...'
      : 'No hay paletas guardadas';

  elements.paletteSelect.appendChild(
    placeholder
  );

  paletteLibrary.forEach(
    (item, index) => {
      const option =
        document.createElement(
          'option'
        );

      option.value =
        String(index);

      option.textContent =
        `${item.palette.name} - ${item.source}`;

      elements.paletteSelect.appendChild(
        option
      );
    }
  );

  if (
    selected &&
    elements.paletteSelect.querySelector(
      `option[value="${selected}"]`
    )
  ) {
    elements.paletteSelect.value =
      selected;
  }
}

function applyPaletteRecord(
  record,
  source = 'light-lab'
) {
  const syncLighting =
    elements.paletteSync.checked;

  store.setState((state) =>
    applyLightLabPaletteToState(
      state,
      record,
      {
        syncLighting,
        source
      }
    )
  );

  toast(
    syncLighting
      ? 'Paleta y luces de Light Lab aplicadas.'
      : 'Paleta de 16 colores aplicada.'
  );
}

async function captureCleanBlob() {
  const state =
    store.getState();

  const helpers =
    state.lighting.showHelpers;

  engine.setLightHelpersVisible(
    false
  );

  await new Promise(
    (resolve) =>
      requestAnimationFrame(
        () =>
          requestAnimationFrame(
            resolve
          )
      )
  );

  const blob =
    await engine.capturePngBlob();

  engine.setLightHelpersVisible(
    helpers
  );

  return blob;
}

async function captureThumbnail() {
  const blob =
    await captureCleanBlob();

  if (!blob) return null;

  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload =
        () => resolve(reader.result);

      reader.onerror =
        () => reject(
          reader.error
        );

      reader.readAsDataURL(
        blob
      );
    }
  );
}

function downloadBlob(
  blob,
  name
) {
  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement('a');

  anchor.href = url;
  anchor.download = name;

  document.body.appendChild(
    anchor
  );

  anchor.click();
  anchor.remove();

  setTimeout(
    () =>
      URL.revokeObjectURL(url),
    1500
  );
}

async function applyLoadedProject(
  result
) {
  const files =
    result?.assets?.modelFiles;

  customModelFiles =
    Array.isArray(files)
      ? files
      : [];

  const state =
    result.state;

  if (
    state.selectedModel === 'custom' &&
    !customModelFiles.length
  ) {
    state.selectedModel = 'asaro';

    toast(
      'El proyecto no incluia el modelo local; se abrio Asaro.'
    );
  }

  store.setState(state);

  if (engine) {
    await setEngineModel(
      store.getState()
    );
  }
}

elements.cards.addEventListener(
  'click',
  (event) => {
    const button =
      event.target.closest(
        '[data-model]'
      );

    if (!button) return;

    const id =
      button.dataset.model;

    if (
      id === 'custom' &&
      !customModelFiles.length
    ) {
      elements.modelInput.click();
      return;
    }

    store.setState((state) => ({
      ...state,
      selectedModel: id
    }));
  }
);

elements.baseColor.addEventListener(
  'input',
  () => {
    const hex =
      normalizeHex(
        elements.baseColor.value
      );

    if (!hex) return;

    store.setState((state) => ({
      ...state,
      baseColor: hex
    }));
  }
);

elements.baseHex.addEventListener(
  'change',
  () => {
    const hex =
      normalizeHex(
        elements.baseHex.value
      );

    if (!hex) {
      elements.baseHex.value =
        store.getState().baseColor;

      toast('HEX invalido.');
      return;
    }

    store.setState((state) => ({
      ...state,
      baseColor: hex
    }));
  }
);

elements.lightList.addEventListener(
  'click',
  (event) => {
    const button =
      event.target.closest(
        '[data-light-id]'
      );

    if (!button) return;

    store.setState((state) => ({
      ...state,
      lighting: {
        ...state.lighting,
        selectedLightId:
          button.dataset.lightId
      }
    }));
  }
);

elements.addLight.addEventListener(
  'click',
  () => {
    store.setState((state) => {
      if (
        state.lighting.lights.length >=
        MAX_3D_LIGHTS
      ) {
        toast('Maximo 8 luces.');
        return state;
      }

      const light =
        createDefault3dLight(
          state.lighting.lights.length
        );

      return {
        ...state,
        lighting: {
          ...state.lighting,
          lights: [
            ...state.lighting.lights,
            light
          ],
          selectedLightId:
            light.id
        }
      };
    });
  }
);

elements.duplicateLight.addEventListener(
  'click',
  () => {
    store.setState((state) => {
      if (
        state.lighting.lights.length >=
        MAX_3D_LIGHTS
      ) {
        toast('Maximo 8 luces.');
        return state;
      }

      const current =
        selectedLight(state);

      if (!current) return state;

      const copy =
        duplicate3dLight(
          current,
          state.lighting.lights.length
        );

      return {
        ...state,
        lighting: {
          ...state.lighting,
          lights: [
            ...state.lighting.lights,
            copy
          ],
          selectedLightId:
            copy.id
        }
      };
    });
  }
);

elements.deleteLight.addEventListener(
  'click',
  () => {
    store.setState((state) => {
      if (
        state.lighting.lights.length <=
        1
      ) {
        return state;
      }

      const selectedId =
        state.lighting.selectedLightId;

      const lights =
        state.lighting.lights.filter(
          (light) =>
            light.id !== selectedId
        );

      return {
        ...state,
        lighting: {
          ...state.lighting,
          lights,
          selectedLightId:
            lights[0]?.id || null
        }
      };
    });
  }
);

elements.lightingEnabled.addEventListener(
  'change',
  () => {
    store.setState((state) => ({
      ...state,
      lighting: {
        ...state.lighting,
        enabled:
          elements.lightingEnabled.checked
      }
    }));
  }
);

elements.showLightHelpers.addEventListener(
  'change',
  () => {
    store.setState((state) => ({
      ...state,
      lighting: {
        ...state.lighting,
        showHelpers:
          elements.showLightHelpers.checked
      }
    }));
  }
);

elements.lightEnabled.addEventListener(
  'change',
  () => {
    updateSelectedLight({
      enabled:
        elements.lightEnabled.checked
    });
  }
);

elements.lightName.addEventListener(
  'change',
  () => {
    updateSelectedLight({
      name:
        elements.lightName.value.trim() ||
        'Luz'
    });
  }
);

elements.lightColor.addEventListener(
  'input',
  () => {
    const hex =
      normalizeHex(
        elements.lightColor.value
      );

    if (hex) {
      updateSelectedLight({
        color: hex
      });
    }
  }
);

elements.lightHex.addEventListener(
  'change',
  () => {
    const hex =
      normalizeHex(
        elements.lightHex.value
      );

    if (!hex) {
      elements.lightHex.value =
        selectedLight()?.color ||
        '#FFFFFF';

      toast('HEX invalido.');
      return;
    }

    updateSelectedLight({
      color: hex
    });
  }
);

[
  [
    'lightIntensity',
    'intensity'
  ],
  [
    'lightAzimuth',
    'azimuth'
  ],
  [
    'lightElevation',
    'elevation'
  ],
  [
    'lightDistance',
    'distance'
  ],
  [
    'lightSoftness',
    'softness'
  ]
].forEach(([id, key]) => {
  elements[id].addEventListener(
    'input',
    () => {
      updateSelectedLight({
        [key]:
          Number(
            elements[id].value
          )
      });
    }
  );
});

environmentIds.forEach((key) => {
  const color =
    byId(`${key}Color`);

  const hex =
    byId(`${key}Hex`);

  const intensity =
    byId(`${key}Intensity`);

  color.addEventListener(
    'input',
    () => {
      const value =
        normalizeHex(
          color.value
        );

      if (value) {
        updateEnvironment(
          key,
          { color: value }
        );
      }
    }
  );

  hex.addEventListener(
    'change',
    () => {
      const value =
        normalizeHex(
          hex.value
        );

      if (!value) {
        hex.value =
          store.getState()
            .lighting[key].color;

        toast('HEX invalido.');
        return;
      }

      updateEnvironment(
        key,
        { color: value }
      );
    }
  );

  intensity.addEventListener(
    'input',
    () => {
      updateEnvironment(
        key,
        {
          intensity:
            Number(
              intensity.value
            )
        }
      );
    }
  );
});

elements.gridToggle.addEventListener(
  'change',
  () => {
    store.setState((state) => ({
      ...state,
      scene: {
        ...state.scene,
        gridVisible:
          elements.gridToggle.checked
      }
    }));
  }
);

elements.shadowToggle.addEventListener(
  'change',
  () => {
    store.setState((state) => ({
      ...state,
      scene: {
        ...state.scene,
        shadowsEnabled:
          elements.shadowToggle.checked
      }
    }));
  }
);

function kaoruApplyAtmospherePreset(
  id
){
  const custom=
    customLightingPresetById(
      id,
      '3d'
    );

  if(custom){
    const snapshot=
      structuredClone(
        custom.snapshot
      );

    store.setState(state=>({
      ...state,
      scene:{
        ...state.scene,
        atmosphere:{
          ...(snapshot.atmosphere||{}),
          id:custom.id,
          name:custom.name
        }
      },
      lighting:{
        ...snapshot.lighting
      }
    }));

    toast(
      `Mi preset: ${custom.name}`
    );
    return;
  }

  const result=
    build3dAtmosphere(
      id,
      store.getState().lighting
    );

  store.setState(state=>({
    ...state,
    scene:{
      ...state.scene,
      atmosphere:{
        ...result.scene
      }
    },
    lighting:{
      ...result.lighting
    }
  }));

  toast(
    `Ambiente: ${result.preset.name}`
  );
}

function kaoruAtmosphereClick(
  event
){
  const favoriteToggle=
    event.target.closest(
      '[data-favorite-toggle]'
    );

  if(favoriteToggle){
    event.preventDefault();
    event.stopPropagation();

    const active=
      toggleFavoriteLightingPreset(
        favoriteToggle.dataset
          .favoriteToggle
      );

    toast(
      active
        ?'Agregado a favoritos'
        :'Quitado de favoritos'
    );

    kaoruRefreshCreativeAtmospheres3d();
    return;
  }

  const deleteToggle=
    event.target.closest(
      '[data-user-preset-delete]'
    );

  if(deleteToggle){
    event.preventDefault();
    event.stopPropagation();

    if(
      confirm(
        '¿Eliminar este preset personal?'
      )
    ){
      deleteCustomLightingPreset(
        deleteToggle.dataset
          .userPresetDelete,
        '3d'
      );

      toast('Preset personal eliminado');
      kaoruRefreshCreativeAtmospheres3d();
    }

    return;
  }

  const button=
    event.target.closest(
      '[data-atmosphere]'
    );

  if(!button)return;

  kaoruApplyAtmospherePreset(
    button.dataset.atmosphere
  );
}

elements.atmosphereGrid?.addEventListener(
  'click',
  kaoruAtmosphereClick
);

elements.creativeAtmosphereGrid?.addEventListener(
  'click',
  kaoruAtmosphereClick
);

elements.creativeAtmosphereFilters
  ?.addEventListener(
    'click',
    (event)=>{
      const button=
        event.target.closest(
          '[data-atmo-filter]'
        );

      if(!button)return;

      creativeAtmosphereFilter=
        button.dataset.atmoFilter||
        'all';

      elements.creativeAtmosphereFilters
        .querySelectorAll(
          '[data-atmo-filter]'
        )
        .forEach((item)=>{
          item.classList.toggle(
            'is-active',
            item===button
          );
        });

      elements.creativeAtmosphereGrid
        ?.replaceChildren();

      renderAtmospheres3d(
        store.getState()
      );
    }
  );

function kaoruPatchAtmosphere(
  patch
){
  store.setState(state=>({
    ...state,
    scene:{
      ...state.scene,
      atmosphere:{
        ...(state.scene?.atmosphere||{}),
        ...patch,
        edited:true
      }
    }
  }));
}

function kaoruPatchAtmosphereEffect(
  patch
){
  store.setState(state=>{
    const effect={
      type:'none',
      colorA:'#FFFFFF',
      colorB:'#7C3AED',
      opacity:0,
      angle:0,
      scale:100,
      blur:8,
      offsetX:0,
      offsetY:0,
      contrast:70,
      density:50,
      ...(state.scene?.atmosphere
        ?.effect||{}),
      ...(state.lighting?.projector||{}),
      ...patch
    };

    const projector=
      projectorFromEffect(
        effect
      );

    if(
      !projector.lightId
    ){
      projector.lightId=
        state.lighting
          .lights?.[0]?.id||
        'key';
    }

    return{
      ...state,
      scene:{
        ...state.scene,
        atmosphere:{
          ...(state.scene?.atmosphere||{}),
          edited:true,
          effect
        }
      },
      lighting:{
        ...state.lighting,
        projector
      }
    };
  });
}

function kaoruBindAtmosphereColor(
  colorInput,
  hexInput,
  apply
){
  colorInput?.addEventListener(
    'input',
    ()=>{
      const value=
        normalizeHex(
          colorInput.value
        );

      if(!value)return;

      hexInput.value=value;
      apply(value);
    }
  );

  hexInput?.addEventListener(
    'change',
    ()=>{
      const value=
        normalizeHex(
          hexInput.value
        );

      if(!value){
        renderAtmospheres3d(
          store.getState()
        );
        toast('HEX invalido.');
        return;
      }

      colorInput.value=value;
      hexInput.value=value;
      apply(value);
    }
  );
}

kaoruBindAtmosphereColor(
  elements.atmosphereBackground,
  elements.atmosphereBackgroundHex,
  value=>
    kaoruPatchAtmosphere({
      background:value
    })
);

kaoruBindAtmosphereColor(
  elements.atmosphereFog,
  elements.atmosphereFogHex,
  value=>
    kaoruPatchAtmosphere({
      fog:value
    })
);

kaoruBindAtmosphereColor(
  elements.atmosphereFloor,
  elements.atmosphereFloorHex,
  value=>
    kaoruPatchAtmosphere({
      floor:value
    })
);

kaoruBindAtmosphereColor(
  elements.atmosphereEffectA,
  elements.atmosphereEffectAHex,
  value=>
    kaoruPatchAtmosphereEffect({
      colorA:value
    })
);

kaoruBindAtmosphereColor(
  elements.atmosphereEffectB,
  elements.atmosphereEffectBHex,
  value=>
    kaoruPatchAtmosphereEffect({
      colorB:value
    })
);

elements.atmosphereEffectType?.addEventListener(
  'change',
  ()=>{
    kaoruPatchAtmosphereEffect({
      type:
        elements.atmosphereEffectType
          .value
    });
  }
);

elements.atmosphereExposure?.addEventListener(
  'input',
  ()=>{
    kaoruPatchAtmosphere({
      exposure:
        Number(
          elements.atmosphereExposure
            .value
        )
    });
  }
);

elements.atmosphereEffectOpacity?.addEventListener(
  'input',
  ()=>{
    kaoruPatchAtmosphereEffect({
      opacity:
        Number(
          elements.atmosphereEffectOpacity
            .value
        )
    });
  }
);

elements.atmosphereEffectAngle?.addEventListener(
  'input',
  ()=>{
    kaoruPatchAtmosphereEffect({
      angle:
        Number(
          elements.atmosphereEffectAngle
            .value
        )
    });
  }
);

elements.atmosphereEffectScale?.addEventListener(
  'input',
  ()=>{
    kaoruPatchAtmosphereEffect({
      scale:
        Number(
          elements.atmosphereEffectScale
            .value
        )
    });
  }
);

elements.atmosphereProjectorLight
  ?.addEventListener(
    'change',
    ()=>{
      kaoruPatchAtmosphereEffect({
        lightId:
          elements.atmosphereProjectorLight
            .value
      });
    }
  );

[
  [elements.atmosphereEffectX,elements.atmosphereEffectXOut,'offsetX','%'],
  [elements.atmosphereEffectY,elements.atmosphereEffectYOut,'offsetY','%'],
  [elements.atmosphereEffectBlur,elements.atmosphereEffectBlurOut,'blur','%'],
  [elements.atmosphereEffectContrast,elements.atmosphereEffectContrastOut,'contrast','%'],
  [elements.atmosphereEffectDensity,elements.atmosphereEffectDensityOut,'density','%']
].forEach(
  ([input,output,key,suffix])=>{
    input?.addEventListener(
      'input',
      ()=>{
        const value=
          Number(input.value);

        if(output){
          output.textContent=
            `${Math.round(value)}${suffix}`;
        }

        kaoruPatchAtmosphereEffect({
          [key]:value
        });
      }
    );
  }
);

elements.saveCustomAtmosphere
  ?.addEventListener(
    'click',
    ()=>{
      const state=
        store.getState();

      const currentId=
        state.scene?.atmosphere?.id||
        'day';

      const currentName=
        kaoruAllCreativeAtmospheres3d()
          .find(
            preset=>
              preset.id===currentId
          )?.name||
        atmosphere3dById(
          currentId
        )?.name||
        'Iluminación';

      const name=
        elements.customAtmosphereName
          ?.value
          .trim()||
        `${currentName} · variante`;

      const record=
        saveCustomLightingPreset({
          studio:'3d',
          name,
          description:
            `Variante personal de ${currentName}`,
          snapshot:{
            atmosphere:
              structuredClone(
                state.scene?.atmosphere||{}
              ),
            lighting:
              structuredClone(
                state.lighting
              )
          }
        });

      store.setState(current=>({
        ...current,
        scene:{
          ...current.scene,
          atmosphere:{
            ...(current.scene
              ?.atmosphere||{}),
            id:record.id,
            name:record.name,
            edited:false
          }
        }
      }));

      if(elements.customAtmosphereName){
        elements.customAtmosphereName.value='';
      }

      toast(
        `Guardado: ${record.name}`
      );

      kaoruRefreshCreativeAtmospheres3d();
    }
  );
elements.resetAtmosphere?.addEventListener(
  'click',
  ()=>{
    const id=
      store.getState()
        .scene?.atmosphere?.id||
      'day';

    kaoruApplyAtmospherePreset(id);
  }
);
elements.advancedToggle?.addEventListener(
  'click',
  () => {
    const open =
      document.body.classList.toggle(
        'three-advanced-open'
      );

    elements.advancedToggle.textContent =
      open
        ? 'Ocultar opciones'
        : 'Mas opciones';
  }
);
elements.resetCamera.addEventListener(
  'click',
  () => {
    engine?.setCameraPreset(
      'three-quarter'
    );

    store.setState((state) => ({
      ...state,
      camera: {
        ...state.camera,
        preset: 'three-quarter'
      }
    }));

    toast('Camara restablecida.');
  }
);

elements.cameraPresets.addEventListener(
  'click',
  (event) => {
    const button =
      event.target.closest(
        '[data-camera-preset]'
      );

    if (
      !button ||
      !engine
    ) {
      return;
    }

    const preset =
      button.dataset.cameraPreset;

    engine.setCameraPreset(
      preset
    );

    store.setState((state) => ({
      ...state,
      camera: {
        ...state.camera,
        preset
      }
    }));
  }
);

elements.canvas.addEventListener(
  'pointerdown',
  (event) => {
    if (
      !engine ||
      event.button !== 0
    ) {
      return;
    }

    const id =
      engine.pickLight(
        event.clientX,
        event.clientY,
        elements.canvas
          .getBoundingClientRect()
      );

    if (!id) return;

    store.setState((state) => ({
      ...state,
      lighting: {
        ...state.lighting,
        selectedLightId: id
      }
    }));
  }
);

elements.paletteRefresh.addEventListener(
  'click',
  async () => {
    await refreshPaletteLibrary();
    toast('Biblioteca Light Lab actualizada.');
  }
);

elements.paletteApply.addEventListener(
  'click',
  () => {
    const index =
      Number(
        elements.paletteSelect.value
      );

    const item =
      paletteLibrary[index];

    if (!item) {
      toast('Selecciona una paleta.');
      return;
    }

    applyPaletteRecord(
      item.record,
      item.source
    );
  }
);

elements.paletteImport.addEventListener(
  'click',
  () => {
    elements.paletteImportInput.click();
  }
);

elements.paletteImportInput.addEventListener(
  'change',
  async (event) => {
    const file =
      event.target.files?.[0];

    event.target.value = '';

    if (!file) return;

    try {
      const record =
        await readLightLabFile(
          file
        );

      applyPaletteRecord(
        record,
        'archivo .lls'
      );
    } catch (error) {
      console.error(error);
      toast(
        error.message ||
        'No se pudo importar la paleta.'
      );
    }
  }
);

elements.paletteSync.addEventListener(
  'change',
  () => {
    store.setState((state) => ({
      ...state,
      material: {
        ...state.material,
        syncLighting:
          elements.paletteSync.checked
      }
    }));
  }
);

elements.paletteMode.addEventListener(
  'change',
  () => {
    const mode =
      elements.paletteMode.value;

    if (
      mode === 'palette-bands' &&
      !store.getState()
        .material.palette.length
    ) {
      elements.paletteMode.value =
        'base-only';

      toast(
        'Aplica primero una paleta Light Lab.'
      );

      return;
    }

    store.setState((state) => ({
      ...state,
      material: {
        ...state.material,
        paletteMode: mode
      }
    }));
  }
);

elements.importModel.addEventListener(
  'click',
  () => {
    elements.modelInput.click();
  }
);

elements.modelInput.addEventListener(
  'change',
  (event) => {
    const files =
      Array.from(
        event.target.files || []
      );

    event.target.value = '';

    if (!files.length) return;

    const main =
      findMainModelFile(files);

    if (!main) {
      toast(
        'Selecciona un GLB o GLTF.'
      );
      return;
    }

    customModelFiles = files;

    store.setState((state) => ({
      ...state,
      selectedModel: 'custom',
      customModel: {
        name: main.name,
        fileNames:
          files.map(
            (file) => file.name
          ),
        size:
          files.reduce(
            (sum, file) =>
              sum + file.size,
            0
          )
      }
    }));
  }
);

elements.projectName.addEventListener(
  'change',
  () => {
    store.setState((state) => ({
      ...state,
      project: {
        ...state.project,
        name:
          elements.projectName.value
            .trim() ||
          'Proyecto 3D Lighting'
      }
    }));
  }
);

elements.saveGallery.addEventListener(
  'click',
  async () => {
    if (!engine) return;

    try {
      const thumbnail =
        await captureThumbnail();

      const record =
        await save3dToGallery(
          store.getState(),
          thumbnail,
          customModelFiles
        );

      store.setState((state) => ({
        ...state,
        project: {
          ...state.project,
          galleryId:
            record.id,
          name:
            record.name
        }
      }));

      toast(
        'Proyecto guardado en Galeria.'
      );
    } catch (error) {
      console.error(error);

      toast(
        error.message ||
        'No se pudo guardar.'
      );
    }
  }
);

elements.exportProject.addEventListener(
  'click',
  async () => {
    try {
      await downloadPortable3dProject(
        store.getState(),
        customModelFiles
      );

      toast(
        'Proyecto .k3d.json exportado.'
      );
    } catch (error) {
      console.error(error);

      toast(
        error.message ||
        'No se pudo exportar.'
      );
    }
  }
);

elements.importProject.addEventListener(
  'click',
  () => {
    elements.importProjectInput.click();
  }
);

elements.importProjectInput.addEventListener(
  'change',
  async (event) => {
    const file =
      event.target.files?.[0];

    event.target.value = '';

    if (!file) return;

    try {
      const result =
        await readPortable3dProject(
          file
        );

      await applyLoadedProject(
        result
      );

      toast(
        'Proyecto 3D importado.'
      );
    } catch (error) {
      console.error(error);

      toast(
        error.message ||
        'No se pudo importar.'
      );
    }
  }
);

elements.exportPng.addEventListener(
  'click',
  async () => {
    if (!engine) return;

    const blob =
      await captureCleanBlob();

    if (!blob) {
      toast(
        'No se pudo generar el PNG.'
      );
      return;
    }

    const name =
      String(
        store.getState()
          .project?.name ||
        'escena-3d'
      )
        .normalize('NFKD')
        .replace(
          /[^\w-]+/g,
          '-'
        )
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') ||
      'escena-3d';

    downloadBlob(
      blob,
      `${name}.png`
    );

    toast('PNG exportado.');
  }
);

document.addEventListener(
  'studio-theme-change',
  (event) => {
    engine?.applyTheme(
      event.detail?.theme ||
      'day'
    );
  }
);

store.subscribe((state) => {
  renderState(state);
  updateEngineFromState(state);
});

async function start() {
  const galleryLaunch =
    await consume3dGalleryLaunch();

  if (galleryLaunch) {
    customModelFiles =
      Array.isArray(
        galleryLaunch.assets?.modelFiles
      )
        ? galleryLaunch.assets.modelFiles
        : [];

    let state =
      galleryLaunch.state;

    if (
      state.selectedModel === 'custom' &&
      !customModelFiles.length
    ) {
      state = {
        ...state,
        selectedModel: 'asaro'
      };
    }

    store.setState(state);
  }

  const transfer =
    consumeLightLabTransfer();

  if (transfer) {
    store.setState((state) =>
      applyLightLabPaletteToState(
        state,
        transfer,
        {
          syncLighting: true,
          source: 'Light Lab'
        }
      )
    );
  }

  renderState(
    store.getState()
  );

  await refreshPaletteLibrary();

  const webgl =
    detectWebGL();

  if (!webgl) {
    elements.webglBadge.textContent =
      'WebGL no disponible';

    elements.stateEngine.textContent =
      'Sin WebGL';

    elements.stateCamera.textContent =
      'No disponible';

    elements.viewportMessage.textContent =
      'WebGL no esta disponible';

    return;
  }

  elements.webglBadge.textContent =
    'Cargando Three.js...';

  elements.stateEngine.textContent =
    'Cargando motor';

  try {
    const state =
      store.getState();

    engine =
      await create3dScene(
        elements.canvas,
        {
          model:
            state.selectedModel ===
            'custom'
              ? null
              : state.selectedModel,
          color: state.baseColor,
          gridVisible:
            state.scene.gridVisible,
          shadowsEnabled:
            state.scene.shadowsEnabled,
          cameraPreset:
            state.camera.preset,
          lighting:
            state.lighting,
          atmosphere:
            state.scene?.atmosphere,
          material:
            state.material,
          onLightTransform(
            id,
            patch
          ) {
            store.setState(
              (current) => ({
                ...current,
                lighting: {
                  ...current.lighting,
                  lights:
                    current.lighting.lights.map(
                      (light) =>
                        light.id === id
                          ? {
                              ...light,
                              ...patch
                            }
                          : light
                    )
                }
              })
            );
          }
        }
      );

    window.ThreeLightingEngine =
      engine;

    if (
      state.selectedModel === 'custom' &&
      customModelFiles.length
    ) {
      await engine.setCustomModel(
        customModelFiles,
        state.baseColor
      );

      engine.applyMaterialState(
        state.material
      );

      engine.setCameraPreset(
        state.camera.preset
      );
    }

    engine.setLightTransformCallback(
      (id, patch) => {
        store.setState(
          (current) => ({
            ...current,
            lighting: {
              ...current.lighting,
              lights:
                current.lighting.lights.map(
                  (light) =>
                    light.id === id
                      ? {
                          ...light,
                          ...patch
                        }
                      : light
                )
            }
          })
        );
      }
    );

    elements.webglBadge.textContent =
      'Three.js r185 - WebGL';

    elements.stateEngine.textContent =
      'Three.js + WebGL';

    elements.stateCamera.textContent =
      'Orbita + zoom + pan';

    elements.viewportOverlay.classList.add(
      'is-hidden'
    );

    store.setState((current) => ({
      ...current,
      engine: {
        ...current.engine,
        status: 'ready',
        webgl: true,
        renderer: 'three-webgl',
        version: '0.185.1'
      }
    }));

    if (transfer) {
      toast(
        'Paleta de Light Lab recibida en 3D.'
      );
    } else if (galleryLaunch) {
      toast(
        'Proyecto abierto desde Galeria.'
      );
    }
  } catch (error) {
    console.error(error);

    elements.webglBadge.textContent =
      'Error al cargar motor';

    elements.stateEngine.textContent =
      'Motor no cargado';

    elements.stateCamera.textContent =
      'No disponible';

    elements.viewportMessage.textContent =
      'No se pudo cargar el motor 3D';

    const detail =
      elements.viewportOverlay?.querySelector(
        'span'
      );

    if (detail) {
      detail.textContent =
        error.message ||
        'Recarga la pagina y vuelve a intentar.';
    }
  }
}

start();

/* === KAORU PRESET SEARCH V4 === */
elements.creativeAtmosphereSearch
  ?.addEventListener(
    'input',
    (event)=>{
      creativeAtmosphereSearch=
        event.target.value||'';

      elements.creativeAtmosphereGrid
        ?.replaceChildren();

      renderAtmospheres3d(
        store.getState()
      );
    }
  );

/* === KAORU PRESET SORT V7 === */
elements.creativeAtmosphereSort
  ?.addEventListener(
    'change',
    (event)=>{
      creativeAtmosphereSort=
        event.target.value||
        'original';

      elements.creativeAtmosphereGrid
        ?.replaceChildren();

      renderAtmospheres3d(
        store.getState()
      );
    }
  );

/* === KAORU PRESET COMPARE V8 === */
[
  elements.compareAtmosphereA,
  elements.compareAtmosphereB
].forEach((select)=>{
  select?.addEventListener(
    'change',
    ()=>{
      kaoruRenderComparator3d();
    }
  );
});

elements.applyCompareAtmosphereA
  ?.addEventListener(
    'click',
    ()=>{
      const id=
        elements.compareAtmosphereA
          ?.value;

      if(id){
        kaoruApplyAtmospherePreset(id);
      }
    }
  );

elements.applyCompareAtmosphereB
  ?.addEventListener(
    'click',
    ()=>{
      const id=
        elements.compareAtmosphereB
          ?.value;

      if(id){
        kaoruApplyAtmospherePreset(id);
      }
    }
  );

/* === KAORU HISTORY LIGHTING V9 === */
const undoHistoryButton3d=
  document.getElementById(
    'undoHistory3d'
  );

const redoHistoryButton3d=
  document.getElementById(
    'redoHistory3d'
  );

function kaoruIsTextEditingTarget3d(
  target
){
  if(!target)return false;

  if(target.isContentEditable){
    return true;
  }

  if(target.tagName==='TEXTAREA'){
    return true;
  }

  if(target.tagName!=='INPUT'){
    return false;
  }

  return[
    'text',
    'search',
    'email',
    'url',
    'password',
    'number'
  ].includes(
    String(target.type||'text')
      .toLowerCase()
  );
}

studioHistory3d.subscribe(
  ({
    canUndo,
    canRedo,
    undoCount,
    redoCount
  })=>{
    if(undoHistoryButton3d){
      undoHistoryButton3d.disabled=
        !canUndo;

      undoHistoryButton3d.title=
        canUndo
          ?`Deshacer (Ctrl+Z) · ${undoCount}`
          :'Nada que deshacer';
    }

    if(redoHistoryButton3d){
      redoHistoryButton3d.disabled=
        !canRedo;

      redoHistoryButton3d.title=
        canRedo
          ?`Rehacer (Ctrl+Shift+Z) · ${redoCount}`
          :'Nada que rehacer';
    }
  }
);

undoHistoryButton3d
  ?.addEventListener(
    'click',
    ()=>{
      if(studioHistory3d.undo()){
        toast('Cambio deshecho');
      }
    }
  );

redoHistoryButton3d
  ?.addEventListener(
    'click',
    ()=>{
      if(studioHistory3d.redo()){
        toast('Cambio rehecho');
      }
    }
  );

document.addEventListener(
  'keydown',
  (event)=>{
    if(
      !(event.ctrlKey||event.metaKey)||
      event.altKey||
      event.key.toLowerCase()!=='z'||
      kaoruIsTextEditingTarget3d(
        event.target
      )
    ){
      return;
    }

    event.preventDefault();

    if(event.shiftKey){
      if(studioHistory3d.redo()){
        toast('Cambio rehecho');
      }
      return;
    }

    if(studioHistory3d.undo()){
      toast('Cambio deshecho');
    }
  }
);
/* === /KAORU HISTORY LIGHTING V9 === */
