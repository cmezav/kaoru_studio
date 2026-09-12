import { adjustHex, clamp, mixHex, normalizeHex, normalizeWords, temperatureShift } from './colorUtils.js';
import { LIGHT_LAB_CATEGORIES, categoryById, undertoneById, variantById } from './presets.js';

export const DEFAULT_PARAMS = { warmth: 0, saturation: 0, contrast: 0, shadowDepth: 0, lightStrength: 0, specular: 0, softness: 0 };

const entry = (role, hex, group) => ({ role, hex: normalizeHex(hex) || '#000000', group });
const amount = (value, scale) => (Number(value) || 0) / 100 * scale;

export function baseForSelection(categoryId, variantId, undertoneId) {
  const category = categoryById(categoryId); const variant = variantById(category, variantId);
  const undertone = undertoneById(category, undertoneId);
  if (categoryId === 'hair-stylized') return variant.baseHex;
  return undertone ? mixHex(variant.baseHex, undertone.mix, undertone.strength) : variant.baseHex;
}

const HAIR_TEXTURE_DEFAULT = '1b';

function hairTextureProfile(id) {
  const key = String(id || HAIR_TEXTURE_DEFAULT).toLowerCase();
  const profiles = {
    '1a': { family:'straight', gloss:'ribbon', softness: 34, specular: 20, light: 16, depth: -10, contrast: -8, saturation: 0 },
    '1b': { family:'straight', gloss:'sheet', softness: 22, specular: 12, light: 10, depth: -4, contrast: -2, saturation: 0 },
    '1c': { family:'straight', gloss:'broad', softness: 12, specular: 4, light: 8, depth: 6, contrast: 5, saturation: -2 },
    '2a': { family:'wavy', gloss:'soft-wave', softness: 18, specular: 10, light: 10, depth: 2, contrast: 4, saturation: 0 },
    '2b': { family:'wavy', gloss:'wave-band', softness: 14, specular: 8, light: 8, depth: 10, contrast: 10, saturation: 2 },
    '2c': { family:'wavy', gloss:'deep-wave', softness: 10, specular: 6, light: 9, depth: 14, contrast: 14, saturation: 2 },
    '3a': { family:'curly', gloss:'curl-cluster', softness: 10, specular: 8, light: 10, depth: 12, contrast: 12, saturation: 3 },
    '3b': { family:'curly', gloss:'ringlet', softness: 8, specular: 6, light: 10, depth: 16, contrast: 16, saturation: 3 },
    '3c': { family:'curly', gloss:'tight-ringlet', softness: 6, specular: 5, light: 11, depth: 20, contrast: 18, saturation: 4 },
    '4a': { family:'coily', gloss:'coil', softness: 8, specular: 5, light: 8, depth: 18, contrast: 18, saturation: 3 },
    '4b': { family:'coily', gloss:'zigzag', softness: 6, specular: 4, light: 8, depth: 20, contrast: 20, saturation: 2 },
    '4c': { family:'coily', gloss:'dense-z', softness: 5, specular: 4, light: 7, depth: 24, contrast: 22, saturation: 1 }
  };
  return profiles[key] || profiles[HAIR_TEXTURE_DEFAULT];
}

function hairRoleNames(id) {
  const family = hairTextureProfile(id).family;
  if (family === 'straight') {
    return {
      secondary: 'Reflejo secundario',
      mid: 'Banda de luz',
      soft: 'Brillo suave',
      medium: 'Brillo corrido',
      strong: 'Brillo principal',
      rim: 'Rim light largo'
    };
  }
  if (family === 'wavy') {
    return {
      secondary: 'Reflejo por ondas',
      mid: 'Cresta iluminada',
      soft: 'Luz entre ondas',
      medium: 'Brillo por bandas',
      strong: 'Brillo de onda',
      rim: 'Rim light ondulado'
    };
  }
  if (family === 'curly') {
    return {
      secondary: 'Reflejo por bucles',
      mid: 'Luz en bucles',
      soft: 'Curva iluminada',
      medium: 'Brillo fragmentado',
      strong: 'Brillo de rizo',
      rim: 'Rim light por rizos'
    };
  }
  return {
    secondary: 'Reflejo por coils',
    mid: 'Luz puntual',
    soft: 'Superficie iluminada',
    medium: 'Brillo compacto',
    strong: 'Brillo puntual',
    rim: 'Rim light compacto'
  };
}
function preparedBase(baseHex, params) {
  const saturated = adjustHex(baseHex, { s: amount(params.saturation, 28) });
  return temperatureShift(saturated, params.warmth * .55);
}

function organicPalette(categoryId, baseHex, params) {
  const base = preparedBase(baseHex, params);
  const fantasy = categoryId === 'fantasy-skin'; const hair = categoryId === 'hair-stylized';
  const texture = hair ? hairTextureProfile(params.hairTexture || params.hairTextureId) : null;
  const names = hair ? hairRoleNames(params.hairTexture || params.hairTextureId) : null;
  const contrast = amount((params.contrast || 0) + (texture?.contrast || 0), 9);
  const depth = amount((params.shadowDepth || 0) + (texture?.depth || 0), 9);
  const light = amount((params.lightStrength || 0) + (texture?.light || 0), 8);
  const soft = amount((params.softness || 0) + (texture?.softness || 0), 4);
  const spec = clamp(.48 + amount((params.specular || 0) + (texture?.specular || 0), .34), .12, .9);
  const coolShadow = temperatureShift(adjustHex(base, { h: fantasy ? 18 : hair ? 10 : -8, s: 7 }), -42);
  const warmTone = temperatureShift(adjustHex(base, { h: -3, s: 7 }), 38);
  const circulation = fantasy ? adjustHex(base, { h: 42, s: 18, l: 3 }) : hair ? adjustHex(base, { h: -18, s: 13, l: 2 }) : mixHex(base, '#C85F68', .28);
  const ambient = fantasy ? adjustHex(base, { h: 72, s: 12, l: 8 }) : adjustHex(coolShadow, { h: 8, s: -3, l: 9 });
  const values = [
    entry('Sombra de oclusiÃ³n', mixHex(adjustHex(coolShadow,{l:-31-depth-contrast}), '#140F1B', .28), 'shadow'),
    entry('Sombra profunda', adjustHex(coolShadow,{l:-23-depth-contrast,s:4}), 'shadow'),
    entry('Sombra media', adjustHex(coolShadow,{l:-15-depth*.7-contrast*.7,s:2}), 'shadow'),
    entry('Sombra suave', mixHex(adjustHex(base,{l:-10-depth*.35-contrast*.5}),coolShadow,.30), 'shadow'),
    entry('TransiciÃ³n frÃ­a', mixHex(base,coolShadow,.32), 'transition'),
    entry('Base secundaria', adjustHex(base,{l:-4-soft,s:-2}), 'base'),
    entry('Base principal', base, 'base'),
    entry('TransiciÃ³n cÃ¡lida', mixHex(base,warmTone,.44), 'transition'),
    entry(hair?'Reflejo secundario':'Tono de circulaciÃ³n', mixHex(base,circulation,hair?.40:.34), 'transition'),
    entry(hair?(names?.mid || 'Medio tono claro'):'Medio tono claro', adjustHex(base,{l:7+light*.25+soft,s:-3}), 'light'),
    entry(hair?(names?.soft || 'Luz suave'):'Luz suave', temperatureShift(adjustHex(base,{l:13+light*.45+soft,s:-6}),params.warmth*.35), 'light'),
    entry(hair?(names?.medium || 'Luz media'):'Luz media', temperatureShift(adjustHex(base,{l:20+light*.65,s:-10}),params.warmth*.42), 'light'),
    entry(hair?(names?.strong || 'Luz fuerte'):'Luz fuerte', adjustHex(base,{l:28+light-contrast*.2,s:-15}), 'light'),
    entry('Highlight', mixHex(adjustHex(base,{l:35+light,s:-22}),'#FFF8F2',spec), 'highlight'),
    entry('Luz de rebote', mixHex(adjustHex(base,{l:10,s:2}),ambient,.42), 'bounce'),
    entry(hair?(names?.rim || 'Brillo / Rim light'):'Brillo especular', mixHex(adjustHex(ambient,{l:24,s:-8}),'#FFFFFF',spec*.7), 'highlight')
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
    entry('TransiciÃ³n metÃ¡lica frÃ­a',mixHex(base,cool,.52),'transition'),
    entry('Base secundaria',adjustHex(base,{l:-5,s:-3}),'base'),
    entry('Base media',base,'base'),
    entry('TransiciÃ³n metÃ¡lica cÃ¡lida',mixHex(base,warm,.52),'transition'),
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

export function generateDetailedPalette({ categoryId, baseHex, params = {}, hairTexture = null }) {
  const safeBase = normalizeHex(baseHex) || '#B7775E'; const settings = { ...DEFAULT_PARAMS, ...params, hairTexture: hairTexture || params.hairTexture || params.hairTextureId || null };
  return categoryId === 'materials' ? materialPalette(safeBase, settings) : organicPalette(categoryId, safeBase, settings);
}

const PHRASE_RULES = {
  'natural-skin': [
    ['muy oscura','very-dark'],['morena clara','tan-light'],['media clara','medium-light'],['muy clara','very-light'],
    ['oscura','dark'],['morena','tan'],['media','medium'],['clara','light']
  ],
  'fantasy-skin': [['bioluminiscente','bioluminescent'],['verde oliva oscuro','witch-green'],['verde oliva','witch-green'],['verde bruja','witch-green'],['verde menta','mint'],['azul hielo','ice-blue'],['azul grisacea','blue-grey'],['violeta grisacea','dark-purple'],['gris espectral','cold-grey'],['gris frio','cold-grey'],['rojo demoniaco','demon-red'],['morada oscura','dark-purple'],['morado oscuro','dark-purple'],['morado claro','lilac'],['rosa magica','magic-pink'],['rosa palido','magic-pink'],['piel muerta','dead-cold'],['turquesa','turquoise'],['lavanda','lavender'],['cian','cyan'],['lila','lilac']],
  materials: [['oro rosa','rose-gold'],['oro suave','soft-gold'],['acero oscuro','dark-steel'],['acero frio','cold-steel'],['cobre rojizo','red-copper'],['metal iridiscente','iridescent'],['metal fantastico','fantasy-metal'],['plata','silver'],['bronce','bronze'],['cobre','copper'],['acero','steel'],['oro','gold']],
  'hair-stylized': [
    ['negro azabache','jet-black'],['negro tinta','ink-black'],['negro frio','cold-black'],['negro cuervo','raven-black'],['negro azulado','blue-black'],
    ['carbon','charcoal'],['grafito','graphite'],['gris humo','smoke-grey'],['plata humo','silver-smoke'],['plata lunar','moon-silver'],
    ['blanco perla','pearl-white'],['blanco nieve','snow-white'],['platino hielo','platinum-ice'],
    ['espresso','espresso'],['chocolate oscuro','dark-chocolate'],['nogal','walnut'],['castano calido','warm-brown'],['castano neutro','neutral-brown'],
    ['castano ceniza','ash-brown'],['castano hongo','mushroom-brown'],['castano rojizo','chestnut'],['caoba','mahogany'],['auburn','auburn-brown'],
    ['cacao','cocoa'],['caramelo','caramel-brown'],
    ['rubio miel','honey-blonde'],['rubio dorado','golden-blonde'],['rubio ambar','amber-blonde'],['rubio beige','beige-blonde'],['rubio ceniza','ash-blonde'],
    ['rubio arena','sand-blonde'],['rubio crema','cream-blonde'],['rubio perlado','pearl-blonde'],['rubio fresa','strawberry-blonde'],['dorado amanecer','sunrise-gold'],
    ['pelirrojo cobre','copper-red'],['jengibre','ginger'],['naranja tostado','burnt-orange'],['rojo brasa','ember-red'],['rojo cereza','cherry-red'],
    ['carmesi','crimson'],['vino','wine-red'],['coral','coral-red'],['rosa cobre','rose-gold-hair'],['atardecer naranja','sunset-orange'],
    ['violeta nocturno','night-violet'],['purpura real','royal-purple'],['orquidea','orchid-purple'],['ciruela','plum-violet'],['amatista','amethyst'],
    ['lavanda','lavender'],['lila pastel','pastel-lilac'],['malva','mauve'],['rosa chicle','bubblegum-pink'],['rosa neon','neon-pink'],['magenta brillo','magenta-glow'],
    ['azul magico','magic-blue'],['azul cobalto','cobalt-blue'],['azul zafiro','sapphire-blue'],['celeste','sky-blue'],['azul hielo','icy-blue'],
    ['cian cyberpunk','cyber-cyan'],['aqua cian','aqua-cyan'],['teal submarino','undersea-teal'],['esmeralda','emerald-green'],['verde hojas','leaf-green'],
    ['verde salvia','sage-green'],['menta aqua','mint-aqua'],['oliva','olive-green'],['lima neon','neon-lime'],['bioluminiscente','biolum-green'],
    ['holografico','holographic'],['opalino','opal-shift'],['plata violeta','violet-silver'],['prisma arcoiris','prism-rainbow'],
    ['blacklight fucsia','blacklight-fuchsia'],['blacklight cian','blacklight-cyan'],['ventana dorada','window-gold']
  ]
};

function categoryFromWords(words, fallback) {
  if (/oro|plata|acero|cobre|bronce|metal/.test(words)) return 'materials';
  if (/cabello|pelo|mechon|rubio|castano|pelirrojo|rojo|cobre|violeta|morado|purpura|lila|rosa|magenta|azul|cian|teal|turquesa|verde|esmeralda|salvia|plata|platino|holografico|blacklight|underwater|submarino|prisma|arcoiris|cyberpunk/.test(words)) return 'hair-stylized';
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
  return { categoryId, variantId: variant.id, undertoneId: undertone?.id || 'neutral', baseHex, params, summary: `${category.label} Â· ${variant.name}${undertone ? ` Â· ${undertone.name}` : ''}${writtenHex ? ` Â· ${writtenHex}` : namedBase ? ` Â· Color libre ${namedBase}` : ''}` };
}

export function categoryOptions() { return LIGHT_LAB_CATEGORIES; }

