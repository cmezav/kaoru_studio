const preset = (id, name, baseHex, description, variantId, undertoneId = 'neutral', params = {}) => ({ id, name, baseHex, description, variantId, undertoneId, params });

export const NATURAL_SKIN_VARIANTS = [
  { id: 'very-light', name: 'Muy clara', baseHex: '#F1C9B6' }, { id: 'light', name: 'Clara', baseHex: '#E1AD94' },
  { id: 'medium-light', name: 'Media clara', baseHex: '#CC9277' }, { id: 'medium', name: 'Media', baseHex: '#B7775E' },
  { id: 'tan-light', name: 'Morena clara', baseHex: '#9E624D' }, { id: 'tan', name: 'Morena', baseHex: '#814B3B' },
  { id: 'dark', name: 'Oscura', baseHex: '#61372F' }, { id: 'very-dark', name: 'Muy oscura', baseHex: '#3E2524' }
];

export const NATURAL_UNDERTONES = [
  { id: 'warm', name: 'Cálido', mix: '#D97845', strength: .13, warmth: 28 }, { id: 'neutral', name: 'Neutro', mix: '#B98270', strength: .04, warmth: 0 },
  { id: 'cool', name: 'Frío', mix: '#936A84', strength: .13, warmth: -25 }, { id: 'olive', name: 'Oliva', mix: '#8E8954', strength: .18, warmth: 8 },
  { id: 'pink', name: 'Rosado', mix: '#CC7181', strength: .15, warmth: -5 }, { id: 'golden', name: 'Dorado', mix: '#C68A3F', strength: .16, warmth: 32 },
  { id: 'ash', name: 'Ceniza', mix: '#77736F', strength: .14, warmth: -12 }
];

export const FANTASY_VARIANTS = [
  { id: 'mint', name: 'Verde menta', baseHex: '#73B39B' }, { id: 'witch-green', name: 'Verde bruja', baseHex: '#537A4B' },
  { id: 'ice-blue', name: 'Azul hielo', baseHex: '#75A9C3' }, { id: 'blue-grey', name: 'Azul grisáceo', baseHex: '#697E98' },
  { id: 'cyan', name: 'Cian', baseHex: '#3AA9AD' }, { id: 'turquoise', name: 'Turquesa', baseHex: '#3C9B8E' },
  { id: 'lilac', name: 'Lila', baseHex: '#A47FAE' }, { id: 'dark-purple', name: 'Morado oscuro', baseHex: '#66496F' },
  { id: 'magic-pink', name: 'Rosa mágica', baseHex: '#C87598' }, { id: 'cold-grey', name: 'Gris espectral', baseHex: '#768492' },
  { id: 'demon-red', name: 'Rojo demoníaco', baseHex: '#9A4C4D' }, { id: 'lavender', name: 'Lavanda alien', baseHex: '#9184B7' },
  { id: 'dead-cold', name: 'Piel muerta/fría', baseHex: '#7E8B88' }, { id: 'bioluminescent', name: 'Bioluminiscente', baseHex: '#33AFA5' }
];

export const MATERIAL_VARIANTS = [
  { id: 'gold', name: 'Oro', baseHex: '#C4932C' }, { id: 'soft-gold', name: 'Oro suave', baseHex: '#C2A15E' },
  { id: 'rose-gold', name: 'Oro rosa', baseHex: '#B97869' }, { id: 'silver', name: 'Plata', baseHex: '#9DADB8' },
  { id: 'steel', name: 'Acero', baseHex: '#71808D' }, { id: 'cold-steel', name: 'Acero frío', baseHex: '#596D82' },
  { id: 'dark-steel', name: 'Acero oscuro', baseHex: '#424B57' }, { id: 'bronze', name: 'Bronce', baseHex: '#8C6239' },
  { id: 'copper', name: 'Cobre', baseHex: '#B76642' }, { id: 'red-copper', name: 'Cobre rojizo', baseHex: '#A84F38' },
  { id: 'fantasy-metal', name: 'Metal fantástico', baseHex: '#7665A4' }, { id: 'iridescent', name: 'Metal iridiscente', baseHex: '#638C91' }
];

export const HAIR_VARIANTS = [
  { id: 'warm-brown', name: 'Castaño cálido', baseHex: '#75452F' }, { id: 'cold-black', name: 'Negro frío', baseHex: '#242331' },
  { id: 'golden-blonde', name: 'Rubio dorado', baseHex: '#B88948' }, { id: 'copper-red', name: 'Pelirrojo cobre', baseHex: '#A94E31' },
  { id: 'night-violet', name: 'Violeta nocturno', baseHex: '#613077' }, { id: 'cyber-cyan', name: 'Cian cyberpunk', baseHex: '#087C80' },
  { id: 'neon-pink', name: 'Rosa neón', baseHex: '#C43B87' }, { id: 'magic-blue', name: 'Azul mágico', baseHex: '#3F65A5' },
  { id: 'pastel-lilac', name: 'Lila pastel', baseHex: '#A98AB9' }, { id: 'holographic', name: 'Holográfico', baseHex: '#6E91AD' }
];

export const LIGHT_LAB_CATEGORIES = [
  { id: 'natural-skin', label: 'Piel natural', short: 'Natural', icon: '◒', description: 'Ocho profundidades y siete subtonos combinables.', variants: NATURAL_SKIN_VARIANTS, undertones: NATURAL_UNDERTONES, presets: [
    preset('very-light-warm','Muy clara cálida','#F1C9B6','Marfil con circulación melocotón y sombra malva.','very-light','warm',{ warmth: 25, softness: 18 }),
    preset('light-cool','Clara fría','#DDA9A2','Piel clara rosada con sombras frías suaves.','light','cool',{ warmth: -20, softness: 20 }),
    preset('medium-light-pink','Media clara rosada','#CB8D7D','Transiciones rosadas con luz neutra.','medium-light','pink',{ saturation: 8 }),
    preset('medium-olive','Media oliva','#AB8061','Equilibrio oliva dorado con sombra fría.','medium','olive',{ warmth: 6, contrast: 8 }),
    preset('tan-light-golden','Morena clara dorada','#A46A4D','Luz miel, medios cálidos y oclusión profunda.','tan-light','golden',{ warmth: 30, lightStrength: 8 }),
    preset('tan-warm','Morena cálida','#824D3D','Cacao cálido con rebote rojizo controlado.','tan','warm',{ warmth: 24, shadowDepth: 12 }),
    preset('dark-neutral','Oscura neutra','#613B34','Profundidad equilibrada y highlights suaves.','dark','neutral',{ contrast: 10, shadowDepth: 14 }),
    preset('very-dark-cool','Muy oscura fría','#3D292B','Cacao profundo con matices ciruela.','very-dark','cool',{ warmth: -18, shadowDepth: 18, lightStrength: 12 }),
    preset('deep-ash','Oscura ceniza','#5B423B','Tono profundo apagado con temperatura fría.','dark','ash',{ saturation: -18, warmth: -12 })
  ]},
  { id: 'fantasy-skin', label: 'Piel fantástica', short: 'Fantasía', icon: '✦', description: 'Catorce familias fantásticas totalmente ajustables.', variants: FANTASY_VARIANTS, undertones: [], presets: [
    preset('mint-witch','Verde menta','#73B39B','Menta luminosa con sombras petróleo.','mint','neutral',{ warmth: -8, saturation: 10 }),
    preset('ice-blue','Azul hielo','#75A9C3','Azul claro con oclusión violácea.','ice-blue','neutral',{ warmth: -28, lightStrength: 14 }),
    preset('rose-magic','Rosa mágica','#C87598','Rosa frío, lila y brillo encantado.','magic-pink','neutral',{ saturation: 18, specular: 20 }),
    preset('spectral-grey','Gris espectral','#768492','Gris etéreo con respiración cian.','cold-grey','neutral',{ saturation: -26, warmth: -20 }),
    preset('demon-red','Rojo demoníaco','#9A4C4D','Rojo orgánico oscuro con highlights incandescentes.','demon-red','neutral',{ contrast: 20, shadowDepth: 24 }),
    preset('bioluminescent','Bioluminiscente','#33AFA5','Cian vivo con emisión y rim light brillante.','bioluminescent','neutral',{ saturation: 30, specular: 36, contrast: 18 })
  ]},
  { id: 'materials', label: 'Materiales', short: 'Metales', icon: '◇', description: 'Metales con bandas oscuras, ambiente y especular.', variants: MATERIAL_VARIANTS, undertones: [], presets: [
    preset('polished-gold','Oro pulido','#C4932C','Contraste alto y highlights estrechos.','gold','neutral',{ contrast: 35, specular: 45 }),
    preset('matte-gold','Oro mate','#B7924F','Oro suave de brillo ancho y controlado.','soft-gold','neutral',{ contrast: 8, specular: -25, softness: 25 }),
    preset('rose-gold','Oro rosa','#B97869','Reflejo rosado con sombra borgoña.','rose-gold','neutral',{ warmth: 20, specular: 24 }),
    preset('cold-silver','Plata fría','#9DADB8','Plata azulada de cortes brillantes.','silver','neutral',{ warmth: -28, contrast: 30, specular: 42 }),
    preset('dark-steel','Acero oscuro','#424B57','Metal profundo con ambiente azul.','dark-steel','neutral',{ warmth: -20, shadowDepth: 28, contrast: 25 }),
    preset('red-copper','Cobre rojizo','#A84F38','Cobre cálido con destello melocotón.','red-copper','neutral',{ warmth: 32, saturation: 16, specular: 28 }),
    preset('iridescent','Metal iridiscente','#638C91','Metal frío con reflejos magenta y cian.','iridescent','neutral',{ saturation: 18, specular: 38 })
  ]},
  { id: 'hair-stylized', label: 'Cabello / estilo', short: 'Cabello', icon: '≈', description: 'Cabello natural, fantasía, neón y pastel.', variants: HAIR_VARIANTS, undertones: [], presets: [
    preset('warm-brown','Castaño cálido','#75452F','Castaño con reflejos miel y sombra vino.','warm-brown','neutral',{ warmth: 28, shadowDepth: 18 }),
    preset('night-violet','Violeta nocturno','#613077','Violeta oscuro con reflejo magenta.','night-violet','neutral',{ saturation: 16, contrast: 16 }),
    preset('cyber-cyan','Cian cyberpunk','#087C80','Cian eléctrico con acentos verde neón.','cyber-cyan','neutral',{ saturation: 34, specular: 24 }),
    preset('neon-pink','Rosa neón','#C43B87','Rosa intenso con sombra violeta.','neon-pink','neutral',{ saturation: 38, contrast: 22 }),
    preset('pastel-lilac','Lila pastel','#A98AB9','Lila suave con luces perladas.','pastel-lilac','neutral',{ saturation: -8, lightStrength: 20, softness: 28 }),
    preset('holographic','Holográfico','#6E91AD','Azules con reflejos rosa, menta y lavanda.','holographic','neutral',{ saturation: 18, specular: 35 })
  ]}
];

export function categoryById(id) { return LIGHT_LAB_CATEGORIES.find((category) => category.id === id) || LIGHT_LAB_CATEGORIES[0]; }
export function presetById(category, id) { return category.presets.find((item) => item.id === id) || category.presets[0]; }
export function variantById(category, id) { return category.variants.find((item) => item.id === id) || category.variants[0]; }
export function undertoneById(category, id) { return (category.undertones || []).find((item) => item.id === id) || (category.undertones || [])[0] || null; }
