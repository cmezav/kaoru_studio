import { adjustHex, clamp, mixHex, normalizeHex, normalizeWords, temperatureShift } from './colorUtils.js';
import { LIGHT_LAB_CATEGORIES, categoryById, undertoneById, variantById } from './presets.js';

export const DEFAULT_PARAMS = { warmth: 0, saturation: 0, contrast: 0, shadowDepth: 0, lightStrength: 0, specular: 0, softness: 0 };

const entry = (role, hex, group) => ({ role, hex: normalizeHex(hex) || '#000000', group });
const amount = (value, scale) => (Number(value) || 0) / 100 * scale;

export function baseForSelection(categoryId, variantId, undertoneId) {
  const category = categoryById(categoryId); const variant = variantById(category, variantId);
  const undertone = undertoneById(category, undertoneId);
  return undertone ? mixHex(variant.baseHex, undertone.mix, undertone.strength) : variant.baseHex;
}

function preparedBase(baseHex, params) {
  const saturated = adjustHex(baseHex, { s: amount(params.saturation, 28) });
  return temperatureShift(saturated, params.warmth * .55);
}

function organicPalette(categoryId, baseHex, params) {
  const base = preparedBase(baseHex, params); const contrast = amount(params.contrast, 9);
  const depth = amount(params.shadowDepth, 9); const light = amount(params.lightStrength, 8);
  const soft = amount(params.softness, 4); const spec = clamp(.48 + amount(params.specular, .34), .12, .9);
  const fantasy = categoryId === 'fantasy-skin'; const hair = categoryId === 'hair-stylized';
  const coolShadow = temperatureShift(adjustHex(base, { h: fantasy ? 18 : hair ? 10 : -8, s: 7 }), -42);
  const warmTone = temperatureShift(adjustHex(base, { h: -3, s: 7 }), 38);
  const circulation = fantasy ? adjustHex(base, { h: 42, s: 18, l: 3 }) : hair ? adjustHex(base, { h: -18, s: 13, l: 2 }) : mixHex(base, '#C85F68', .28);
  const ambient = fantasy ? adjustHex(base, { h: 72, s: 12, l: 8 }) : adjustHex(coolShadow, { h: 8, s: -3, l: 9 });
  const values = [
    entry('Sombra de oclusión', mixHex(adjustHex(coolShadow,{l:-31-depth-contrast}), '#140F1B', .28), 'shadow'),
    entry('Sombra profunda', adjustHex(coolShadow,{l:-23-depth-contrast,s:4}), 'shadow'),
    entry('Sombra media', adjustHex(coolShadow,{l:-15-depth*.7-contrast*.7,s:2}), 'shadow'),
    entry('Sombra suave', mixHex(adjustHex(base,{l:-10-depth*.35-contrast*.5}),coolShadow,.30), 'shadow'),
    entry('Transición fría', mixHex(base,coolShadow,.32), 'transition'),
    entry('Base secundaria', adjustHex(base,{l:-4-soft,s:-2}), 'base'),
    entry('Base principal', base, 'base'),
    entry('Transición cálida', mixHex(base,warmTone,.44), 'transition'),
    entry(hair?'Reflejo secundario':'Tono de circulación', mixHex(base,circulation,hair?.40:.34), 'transition'),
    entry('Medio tono claro', adjustHex(base,{l:7+light*.25+soft,s:-3}), 'light'),
    entry('Luz suave', temperatureShift(adjustHex(base,{l:13+light*.45+soft,s:-6}),params.warmth*.35), 'light'),
    entry('Luz media', temperatureShift(adjustHex(base,{l:20+light*.65,s:-10}),params.warmth*.42), 'light'),
    entry('Luz fuerte', adjustHex(base,{l:28+light-contrast*.2,s:-15}), 'light'),
    entry('Highlight', mixHex(adjustHex(base,{l:35+light,s:-22}),'#FFF8F2',spec), 'highlight'),
    entry('Luz de rebote', mixHex(adjustHex(base,{l:10,s:2}),ambient,.42), 'bounce'),
    entry(hair?'Brillo / Rim light':'Brillo especular', mixHex(adjustHex(ambient,{l:24,s:-8}),'#FFFFFF',spec*.7), 'highlight')
  ];
  return values;
}

function materialPalette(baseHex, params) {
  const base = preparedBase(baseHex, params); const contrast = 12 + amount(params.contrast, 16);
  const depth = 9 + amount(params.shadowDepth, 10); const light = amount(params.lightStrength, 8);
  const spec = clamp(.62 + amount(params.specular, .32), .18, .96); const cool = temperatureShift(base,-48); const warm = temperatureShift(base,48);
  return [
    entry('Banda oscura extrema',mixHex(adjustHex(base,{l:-34-depth-contrast}), '#07090E', .36),'shadow'),
    entry('Sombra profunda',adjustHex(cool,{l:-27-depth-contrast,s:4}),'shadow'),
    entry('Sombra suave',adjustHex(base,{l:-17-depth*.5-contrast*.5}),'shadow'),
    entry('Banda oscura',mixHex(adjustHex(base,{l:-12-contrast}),cool,.34),'shadow'),
    entry('Transición metálica fría',mixHex(base,cool,.52),'transition'),
    entry('Base secundaria',adjustHex(base,{l:-5,s:-3}),'base'),
    entry('Base media',base,'base'),
    entry('Transición metálica cálida',mixHex(base,warm,.52),'transition'),
    entry('Reflejo ambiente',adjustHex(cool,{l:15+light*.3,s:-7}),'bounce'),
    entry('Banda brillante',mixHex(adjustHex(base,{l:19+light,s:-10}),'#FFFFFF',spec*.33),'light'),
    entry('Luz media',adjustHex(warm,{l:24+light,s:-12}),'light'),
    entry('Luz fuerte',mixHex(adjustHex(base,{l:31+light,s:-18}),'#FFFFFF',spec*.48),'light'),
    entry('Highlight especular',mixHex(base,'#FFFDF4',spec),'highlight'),
    entry('Highlight extremo',mixHex(adjustHex(base,{l:42,s:-35}),'#FFFFFF',clamp(spec+.12)),'highlight'),
    entry('Rebote de color',mixHex(adjustHex(base,{h:26,l:12}),warm,.42),'bounce'),
    entry('Reflejo opuesto',mixHex(adjustHex(base,{h:150,l:18}),cool,.45),'bounce')
  ];
}

export function generateDetailedPalette({ categoryId, baseHex, params = {} }) {
  const safeBase = normalizeHex(baseHex) || '#B7775E'; const settings = { ...DEFAULT_PARAMS, ...params };
  return categoryId === 'materials' ? materialPalette(safeBase, settings) : organicPalette(categoryId, safeBase, settings);
}

const PHRASE_RULES = {
  'natural-skin': [
    ['muy oscura','very-dark'],['morena clara','tan-light'],['media clara','medium-light'],['muy clara','very-light'],
    ['oscura','dark'],['morena','tan'],['media','medium'],['clara','light']
  ],
  'fantasy-skin': [['bioluminiscente','bioluminescent'],['verde oliva oscuro','witch-green'],['verde oliva','witch-green'],['verde bruja','witch-green'],['verde menta','mint'],['azul hielo','ice-blue'],['azul grisacea','blue-grey'],['violeta grisacea','dark-purple'],['gris espectral','cold-grey'],['gris frio','cold-grey'],['rojo demoniaco','demon-red'],['morada oscura','dark-purple'],['morado oscuro','dark-purple'],['morado claro','lilac'],['rosa magica','magic-pink'],['rosa palido','magic-pink'],['piel muerta','dead-cold'],['turquesa','turquoise'],['lavanda','lavender'],['cian','cyan'],['lila','lilac']],
  materials: [['oro rosa','rose-gold'],['oro suave','soft-gold'],['acero oscuro','dark-steel'],['acero frio','cold-steel'],['cobre rojizo','red-copper'],['metal iridiscente','iridescent'],['metal fantastico','fantasy-metal'],['plata','silver'],['bronce','bronze'],['cobre','copper'],['acero','steel'],['oro','gold']],
  'hair-stylized': [['castano calido','warm-brown'],['negro frio','cold-black'],['rubio dorado','golden-blonde'],['pelirrojo cobre','copper-red'],['violeta nocturno','night-violet'],['cian cyberpunk','cyber-cyan'],['rosa neon','neon-pink'],['azul magico','magic-blue'],['lila pastel','pastel-lilac'],['holografico','holographic']]
};

function categoryFromWords(words, fallback) {
  if (/oro|plata|acero|cobre|bronce|metal/.test(words)) return 'materials';
  if (/cabello|pelo|rubio|castano|pelirrojo|cyberpunk|holografico/.test(words)) return 'hair-stylized';
  if (/fantast|alien|demon|espectral|biolumin|piel (verde|esmeralda|menta|azul|celeste|cian|turquesa|morad|violeta|lila|lavanda|rosa|fucsia|gris|roja|coral)/.test(words)) return 'fantasy-skin';
  if (/piel|cutis|humana|morena|oscura|clara|oliva|rosada/.test(words)) return 'natural-skin';
  return fallback;
}

export function interpretDescription(description, current) {
  const words = normalizeWords(description); const categoryId = categoryFromWords(words,current.categoryId);
  const category = categoryById(categoryId); let variantId = current.variantId; let undertoneId = current.undertoneId || 'neutral';
  let matchedVariant = false;
  for (const [phrase,id] of PHRASE_RULES[categoryId] || []) { if (words.includes(phrase)) { variantId=id; matchedVariant=true; break; } }
  const undertones = [['oliva','olive'],['rosad','pink'],['dorado','golden'],['ceniza','ash'],['calid','warm'],['fri','cool'],['neutr','neutral']];
  if (categoryId === 'natural-skin') for (const [phrase,id] of undertones) { if (words.includes(phrase)) { undertoneId=id; break; } }
  const params = { ...DEFAULT_PARAMS, ...(current.params || {}) };
  const temperatureWords = words.replace(/sombras? frias?/g,'').replace(/sombras? calidas?/g,'');
  if (/muy calid|super calid/.test(temperatureWords)) params.warmth=45; else if (/calid/.test(temperatureWords)) params.warmth=Math.max(params.warmth,25);
  if (/muy fri|helad/.test(temperatureWords)) params.warmth=-45; else if (/fri/.test(temperatureWords)) params.warmth=Math.min(params.warmth,-24);
  if (/neon|electri|intens|vibrante/.test(words)) params.saturation=Math.max(params.saturation,34);
  if (/pastel|apagada|desaturad/.test(words)) params.saturation=Math.min(params.saturation,-24);
  if (/contrastad|alto contraste/.test(words)) params.contrast=Math.max(params.contrast,32);
  if (/suave|delicad/.test(words)) { params.softness=Math.max(params.softness,28); params.contrast=Math.min(params.contrast,-12); }
  if (/sombra[s]? profunda|sombra[s]? intensa|nocturn/.test(words)) params.shadowDepth=Math.max(params.shadowDepth,32);
  if (/luz fuerte|luz intensa|muy luminosa/.test(words)) params.lightStrength=Math.max(params.lightStrength,30);
  if (/pulid|brillante|especular/.test(words)) params.specular=Math.max(params.specular,38);
  if (/mate|sin brillo/.test(words)) params.specular=Math.min(params.specular,-34);
  const writtenHex = normalizeHex((String(description).match(/#?[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/) || [])[0]);
  const namedColors = [['verde esmeralda','#3F936E'],['verde oliva','#6F7848'],['verde menta','#76BFA0'],['azul marino','#344B78'],['azul grisaceo','#6B819B'],['azul cielo','#74A9D1'],['celeste','#72B5D1'],['turquesa','#36A193'],['cian','#28AAB3'],['morado','#725286'],['violeta','#7452A0'],['lavanda','#9A8AC2'],['lila','#AA83B5'],['fucsia','#BE3F88'],['rosa palido','#D8A0B7'],['rosa','#C96F98'],['rojo','#A94B4F'],['gris calido','#817873'],['gris frio','#71818D'],['gris','#7E8185'],['coral','#C96E64'],['naranja','#C57446'],['amarillo','#C5A343']];
  const namedBase = !matchedVariant && categoryId !== 'natural-skin' ? namedColors.find(([name])=>words.includes(name))?.[1] : null;
  const baseHex = writtenHex || namedBase || baseForSelection(categoryId,variantId,undertoneId);
  const variant = variantById(category,variantId); const undertone = undertoneById(category,undertoneId);
  return { categoryId, variantId: variant.id, undertoneId: undertone?.id || 'neutral', baseHex, params, summary: `${category.label} · ${variant.name}${undertone ? ` · ${undertone.name}` : ''}${writtenHex ? ` · ${writtenHex}` : namedBase ? ` · Color libre ${namedBase}` : ''}` };
}

export function categoryOptions() { return LIGHT_LAB_CATEGORIES; }
