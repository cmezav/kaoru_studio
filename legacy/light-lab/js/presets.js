const preset = (id, name, baseHex, description, variantId, undertoneId = 'neutral', params = {}) => ({ id, name, baseHex, description, variantId, undertoneId, params });

export const NATURAL_SKIN_VARIANTS = [
  { id: 'very-light', name: 'Muy clara', baseHex: '#F1C9B6' }, { id: 'light', name: 'Clara', baseHex: '#E1AD94' },
  { id: 'medium-light', name: 'Media clara', baseHex: '#CC9277' }, { id: 'medium', name: 'Media', baseHex: '#B7775E' },
  { id: 'tan-light', name: 'Morena clara', baseHex: '#9E624D' }, { id: 'tan', name: 'Morena', baseHex: '#814B3B' },
  { id: 'dark', name: 'Oscura', baseHex: '#61372F' }, { id: 'very-dark', name: 'Muy oscura', baseHex: '#3E2524' }
];

export const NATURAL_UNDERTONES = [
  { id: 'warm', name: 'CÃ¡lido', mix: '#D97845', strength: .13, warmth: 28 }, { id: 'neutral', name: 'Neutro', mix: '#B98270', strength: .04, warmth: 0 },
  { id: 'cool', name: 'FrÃ­o', mix: '#936A84', strength: .13, warmth: -25 }, { id: 'olive', name: 'Oliva', mix: '#8E8954', strength: .18, warmth: 8 },
  { id: 'pink', name: 'Rosado', mix: '#CC7181', strength: .15, warmth: -5 }, { id: 'golden', name: 'Dorado', mix: '#C68A3F', strength: .16, warmth: 32 },
  { id: 'ash', name: 'Ceniza', mix: '#77736F', strength: .14, warmth: -12 }
];

export const FANTASY_VARIANTS = [
  { id: 'mint', name: 'Verde menta', baseHex: '#73B39B' }, { id: 'witch-green', name: 'Verde bruja', baseHex: '#537A4B' },
  { id: 'ice-blue', name: 'Azul hielo', baseHex: '#75A9C3' }, { id: 'blue-grey', name: 'Azul grisÃ¡ceo', baseHex: '#697E98' },
  { id: 'cyan', name: 'Cian', baseHex: '#3AA9AD' }, { id: 'turquoise', name: 'Turquesa', baseHex: '#3C9B8E' },
  { id: 'lilac', name: 'Lila', baseHex: '#A47FAE' }, { id: 'dark-purple', name: 'Morado oscuro', baseHex: '#66496F' },
  { id: 'magic-pink', name: 'Rosa mÃ¡gica', baseHex: '#C87598' }, { id: 'cold-grey', name: 'Gris espectral', baseHex: '#768492' },
  { id: 'demon-red', name: 'Rojo demonÃ­aco', baseHex: '#9A4C4D' }, { id: 'lavender', name: 'Lavanda alien', baseHex: '#9184B7' },
  { id: 'dead-cold', name: 'Piel muerta/frÃ­a', baseHex: '#7E8B88' }, { id: 'bioluminescent', name: 'Bioluminiscente', baseHex: '#33AFA5' }
];

export const MATERIAL_VARIANTS = [
  { id: 'gold', name: 'Oro', baseHex: '#C4932C' }, { id: 'soft-gold', name: 'Oro suave', baseHex: '#C2A15E' },
  { id: 'rose-gold', name: 'Oro rosa', baseHex: '#B97869' }, { id: 'silver', name: 'Plata', baseHex: '#9DADB8' },
  { id: 'steel', name: 'Acero', baseHex: '#71808D' }, { id: 'cold-steel', name: 'Acero frÃ­o', baseHex: '#596D82' },
  { id: 'dark-steel', name: 'Acero oscuro', baseHex: '#424B57' }, { id: 'bronze', name: 'Bronce', baseHex: '#8C6239' },
  { id: 'copper', name: 'Cobre', baseHex: '#B76642' }, { id: 'red-copper', name: 'Cobre rojizo', baseHex: '#A84F38' },
  { id: 'fantasy-metal', name: 'Metal fantÃ¡stico', baseHex: '#7665A4' }, { id: 'iridescent', name: 'Metal iridiscente', baseHex: '#638C91' }
];

export const HAIR_VARIANTS = [
  { id: 'jet-black', name: 'Negro azabache', baseHex: '#17161B' },
  { id: 'ink-black', name: 'Negro tinta', baseHex: '#1D1B21' },
  { id: 'cold-black', name: 'Negro frio', baseHex: '#242331' },
  { id: 'raven-black', name: 'Negro cuervo', baseHex: '#201C24' },
  { id: 'blue-black', name: 'Negro azulado', baseHex: '#1F2636' },
  { id: 'soft-black', name: 'Negro suave', baseHex: '#2A252A' },
  { id: 'charcoal', name: 'Carbon', baseHex: '#323038' },
  { id: 'graphite', name: 'Grafito', baseHex: '#44424C' },
  { id: 'smoke-grey', name: 'Gris humo', baseHex: '#62606B' },
  { id: 'silver-smoke', name: 'Plata humo', baseHex: '#878897' },
  { id: 'moon-silver', name: 'Plata lunar', baseHex: '#A8ADBA' },
  { id: 'pearl-white', name: 'Blanco perla', baseHex: '#DDD8E2' },
  { id: 'snow-white', name: 'Blanco nieve', baseHex: '#F1EDF3' },
  { id: 'platinum-ice', name: 'Platino hielo', baseHex: '#D5D8EA' },

  { id: 'espresso', name: 'Espresso', baseHex: '#41271F' },
  { id: 'dark-chocolate', name: 'Chocolate oscuro', baseHex: '#533126' },
  { id: 'walnut', name: 'Nogal', baseHex: '#644133' },
  { id: 'warm-brown', name: 'Castano calido', baseHex: '#75452F' },
  { id: 'neutral-brown', name: 'Castano neutro', baseHex: '#735349' },
  { id: 'ash-brown', name: 'Castano ceniza', baseHex: '#6F625D' },
  { id: 'mushroom-brown', name: 'Castano hongo', baseHex: '#7A726D' },
  { id: 'chestnut', name: 'Castano rojizo', baseHex: '#8A4A38' },
  { id: 'mahogany', name: 'Caoba', baseHex: '#7A3A35' },
  { id: 'auburn-brown', name: 'Auburn', baseHex: '#8B4F42' },
  { id: 'cocoa', name: 'Cacao', baseHex: '#6B473B' },
  { id: 'caramel-brown', name: 'Caramelo', baseHex: '#9E6A4F' },

  { id: 'honey-blonde', name: 'Rubio miel', baseHex: '#C29652' },
  { id: 'golden-blonde', name: 'Rubio dorado', baseHex: '#B88948' },
  { id: 'amber-blonde', name: 'Rubio ambar', baseHex: '#D2A55A' },
  { id: 'beige-blonde', name: 'Rubio beige', baseHex: '#BBA487' },
  { id: 'ash-blonde', name: 'Rubio ceniza', baseHex: '#A89E96' },
  { id: 'sand-blonde', name: 'Rubio arena', baseHex: '#C3AE7D' },
  { id: 'cream-blonde', name: 'Rubio crema', baseHex: '#D9C39C' },
  { id: 'pearl-blonde', name: 'Rubio perlado', baseHex: '#D8D0C2' },
  { id: 'strawberry-blonde', name: 'Rubio fresa', baseHex: '#C88B78' },
  { id: 'sunrise-gold', name: 'Dorado amanecer', baseHex: '#E3B056' },

  { id: 'copper-red', name: 'Pelirrojo cobre', baseHex: '#A94E31' },
  { id: 'ginger', name: 'Jengibre', baseHex: '#C06339' },
  { id: 'burnt-orange', name: 'Naranja tostado', baseHex: '#C96A31' },
  { id: 'ember-red', name: 'Rojo brasa', baseHex: '#A8412F' },
  { id: 'cherry-red', name: 'Rojo cereza', baseHex: '#8E2435' },
  { id: 'crimson', name: 'Carmesi', baseHex: '#7B1E2C' },
  { id: 'wine-red', name: 'Vino', baseHex: '#5A1D28' },
  { id: 'coral-red', name: 'Coral', baseHex: '#C95C63' },
  { id: 'rose-gold-hair', name: 'Rosa cobre', baseHex: '#B9716D' },
  { id: 'sunset-orange', name: 'Atardecer naranja', baseHex: '#D9843C' },

  { id: 'night-violet', name: 'Violeta nocturno', baseHex: '#613077' },
  { id: 'royal-purple', name: 'Purpura real', baseHex: '#69328E' },
  { id: 'orchid-purple', name: 'Orquidea', baseHex: '#7F4BB0' },
  { id: 'plum-violet', name: 'Ciruela', baseHex: '#55276C' },
  { id: 'amethyst', name: 'Amatista', baseHex: '#8B63B6' },
  { id: 'lavender', name: 'Lavanda', baseHex: '#AC8BD0' },
  { id: 'pastel-lilac', name: 'Lila pastel', baseHex: '#A98AB9' },
  { id: 'mauve', name: 'Malva', baseHex: '#95679A' },
  { id: 'rose-pink', name: 'Rosa', baseHex: '#C96E9C' },
  { id: 'bubblegum-pink', name: 'Rosa chicle', baseHex: '#E184C5' },
  { id: 'neon-pink', name: 'Rosa neon', baseHex: '#C43B87' },
  { id: 'magenta-glow', name: 'Magenta brillo', baseHex: '#A93A86' },

  { id: 'magic-blue', name: 'Azul magico', baseHex: '#3F65A5' },
  { id: 'cobalt-blue', name: 'Azul cobalto', baseHex: '#3350A6' },
  { id: 'sapphire-blue', name: 'Azul zafiro', baseHex: '#244E8A' },
  { id: 'sky-blue', name: 'Celeste', baseHex: '#6CB2D7' },
  { id: 'icy-blue', name: 'Azul hielo', baseHex: '#A7D2F0' },
  { id: 'cyber-cyan', name: 'Cian cyberpunk', baseHex: '#087C80' },
  { id: 'aqua-cyan', name: 'Aqua cian', baseHex: '#2AA8B0' },
  { id: 'undersea-teal', name: 'Teal submarino', baseHex: '#236E73' },
  { id: 'emerald-green', name: 'Esmeralda', baseHex: '#19856A' },
  { id: 'leaf-green', name: 'Verde hojas', baseHex: '#6C9B45' },
  { id: 'sage-green', name: 'Verde salvia', baseHex: '#90A77A' },
  { id: 'mint-aqua', name: 'Menta aqua', baseHex: '#72BEB1' },

  { id: 'olive-green', name: 'Oliva', baseHex: '#697048' },
  { id: 'neon-lime', name: 'Lima neon', baseHex: '#8DCB24' },
  { id: 'biolum-green', name: 'Bioluminiscente', baseHex: '#3AC690' },
  { id: 'holographic', name: 'Holografico', baseHex: '#6E91AD' },
  { id: 'opal-shift', name: 'Opalino', baseHex: '#8DB5C6' },
  { id: 'violet-silver', name: 'Plata violeta', baseHex: '#A89AC1' },
  { id: 'prism-rainbow', name: 'Prisma arcoiris', baseHex: '#8F7CC1' },
  { id: 'blacklight-fuchsia', name: 'Blacklight fucsia', baseHex: '#D145A6' },
  { id: 'blacklight-cyan', name: 'Blacklight cian', baseHex: '#39C8D7' },
  { id: 'window-gold', name: 'Ventana dorada', baseHex: '#B69762' }
];

export const LIGHT_LAB_CATEGORIES = [
  { id: 'natural-skin', label: 'Piel natural', short: 'Natural', icon: 'â—’', description: 'Ocho profundidades y siete subtonos combinables.', variants: NATURAL_SKIN_VARIANTS, undertones: NATURAL_UNDERTONES, presets: [
    preset('very-light-warm','Muy clara cÃ¡lida','#F1C9B6','Marfil con circulaciÃ³n melocotÃ³n y sombra malva.','very-light','warm',{ warmth: 25, softness: 18 }),
    preset('light-cool','Clara frÃ­a','#DDA9A2','Piel clara rosada con sombras frÃ­as suaves.','light','cool',{ warmth: -20, softness: 20 }),
    preset('medium-light-pink','Media clara rosada','#CB8D7D','Transiciones rosadas con luz neutra.','medium-light','pink',{ saturation: 8 }),
    preset('medium-olive','Media oliva','#AB8061','Equilibrio oliva dorado con sombra frÃ­a.','medium','olive',{ warmth: 6, contrast: 8 }),
    preset('tan-light-golden','Morena clara dorada','#A46A4D','Luz miel, medios cÃ¡lidos y oclusiÃ³n profunda.','tan-light','golden',{ warmth: 30, lightStrength: 8 }),
    preset('tan-warm','Morena cÃ¡lida','#824D3D','Cacao cÃ¡lido con rebote rojizo controlado.','tan','warm',{ warmth: 24, shadowDepth: 12 }),
    preset('dark-neutral','Oscura neutra','#613B34','Profundidad equilibrada y highlights suaves.','dark','neutral',{ contrast: 10, shadowDepth: 14 }),
    preset('very-dark-cool','Muy oscura frÃ­a','#3D292B','Cacao profundo con matices ciruela.','very-dark','cool',{ warmth: -18, shadowDepth: 18, lightStrength: 12 }),
    preset('deep-ash','Oscura ceniza','#5B423B','Tono profundo apagado con temperatura frÃ­a.','dark','ash',{ saturation: -18, warmth: -12 })
  ]},
  { id: 'fantasy-skin', label: 'Piel fantÃ¡stica', short: 'FantasÃ­a', icon: 'âœ¦', description: 'Catorce familias fantÃ¡sticas totalmente ajustables.', variants: FANTASY_VARIANTS, undertones: [], presets: [
    preset('mint-witch','Verde menta','#73B39B','Menta luminosa con sombras petrÃ³leo.','mint','neutral',{ warmth: -8, saturation: 10 }),
    preset('ice-blue','Azul hielo','#75A9C3','Azul claro con oclusiÃ³n violÃ¡cea.','ice-blue','neutral',{ warmth: -28, lightStrength: 14 }),
    preset('rose-magic','Rosa mÃ¡gica','#C87598','Rosa frÃ­o, lila y brillo encantado.','magic-pink','neutral',{ saturation: 18, specular: 20 }),
    preset('spectral-grey','Gris espectral','#768492','Gris etÃ©reo con respiraciÃ³n cian.','cold-grey','neutral',{ saturation: -26, warmth: -20 }),
    preset('demon-red','Rojo demonÃ­aco','#9A4C4D','Rojo orgÃ¡nico oscuro con highlights incandescentes.','demon-red','neutral',{ contrast: 20, shadowDepth: 24 }),
    preset('bioluminescent','Bioluminiscente','#33AFA5','Cian vivo con emisiÃ³n y rim light brillante.','bioluminescent','neutral',{ saturation: 30, specular: 36, contrast: 18 })
  ]},
  { id: 'materials', label: 'Materiales', short: 'Metales', icon: 'â—‡', description: 'Metales con bandas oscuras, ambiente y especular.', variants: MATERIAL_VARIANTS, undertones: [], presets: [
    preset('polished-gold','Oro pulido','#C4932C','Contraste alto y highlights estrechos.','gold','neutral',{ contrast: 35, specular: 45 }),
    preset('matte-gold','Oro mate','#B7924F','Oro suave de brillo ancho y controlado.','soft-gold','neutral',{ contrast: 8, specular: -25, softness: 25 }),
    preset('rose-gold','Oro rosa','#B97869','Reflejo rosado con sombra borgoÃ±a.','rose-gold','neutral',{ warmth: 20, specular: 24 }),
    preset('cold-silver','Plata frÃ­a','#9DADB8','Plata azulada de cortes brillantes.','silver','neutral',{ warmth: -28, contrast: 30, specular: 42 }),
    preset('dark-steel','Acero oscuro','#424B57','Metal profundo con ambiente azul.','dark-steel','neutral',{ warmth: -20, shadowDepth: 28, contrast: 25 }),
    preset('red-copper','Cobre rojizo','#A84F38','Cobre cÃ¡lido con destello melocotÃ³n.','red-copper','neutral',{ warmth: 32, saturation: 16, specular: 28 }),
    preset('iridescent','Metal iridiscente','#638C91','Metal frÃ­o con reflejos magenta y cian.','iridescent','neutral',{ saturation: 18, specular: 38 })
  ]},
    { id: 'hair-stylized', label: 'Cabello / estilo', short: 'Cabello', icon: '~', description: 'Biblioteca ampliada de cabello: naturales, fantasia, neon, pastel, underwater, prisma y blacklight. Usa raiz/sombra para la masa inferior, medios para la zona central y highlights para mechones, puntas y rim light.', variants: HAIR_VARIANTS, undertones: [], presets: [
    preset('jet-black-gloss','Negro brillante','#17161B','Raiz y sombra profunda en la masa principal; brillo fino en curva superior y puntas.','jet-black','neutral',{ contrast: 28, shadowDepth: 28, specular: 26 }),
    preset('blue-black-rim','Negro azulado','#1F2636','Base casi negra con recorte frio azul; util para luces laterales.','blue-black','neutral',{ warmth: -16, contrast: 24, specular: 18 }),
    preset('silver-moon','Plata lunar','#A8ADBA','Sombras lavanda-gris en la base y brillos anchos en la superficie superior.','moon-silver','neutral',{ saturation: -8, lightStrength: 18, softness: 16, specular: 24 }),
    preset('platinum-pearl','Platino perlado','#D5D8EA','Cabello claro con sombra suave fria y highlight perlado en mechones externos.','platinum-ice','neutral',{ warmth: -8, lightStrength: 22, softness: 22, specular: 26 }),
    preset('warm-brown-glow','Castano miel','#8A4A38','Sombra vino en raiz, medio tono calido en masa media y reflejo miel en curvas grandes.','chestnut','neutral',{ warmth: 24, shadowDepth: 20, specular: 12 }),
    preset('ash-brown-soft','Castano ceniza','#6F625D','Cabello apagado con transicion suave y brillo discreto solo en planos altos.','ash-brown','neutral',{ warmth: -10, saturation: -12, softness: 24 }),
    preset('caramel-sun','Caramelo solar','#9E6A4F','Color medio con luces doradas en frente, coronilla y puntas externas.','caramel-brown','neutral',{ warmth: 28, lightStrength: 18, specular: 14 }),
    preset('honey-blonde','Rubio miel','#C29652','Sombras ambar en raiz y luces crema en mechones frontales.','honey-blonde','neutral',{ warmth: 26, lightStrength: 16 }),
    preset('pearl-blonde','Rubio perlado','#D8D0C2','Cabello claro con sombra gris-lila y highlight perlado ancho.','pearl-blonde','neutral',{ warmth: -4, softness: 26, specular: 28 }),
    preset('sunrise-gold','Dorado amanecer','#E3B056','Ideal para amanecer: sombra suave tostada y brillo fuerte en el borde iluminado.','sunrise-gold','neutral',{ warmth: 36, lightStrength: 24, specular: 20 }),
    preset('copper-fire','Cobre vivo','#A94E31','Raiz rojiza profunda, medios naranja cobre y highlight melocoton en mechones curvos.','copper-red','neutral',{ warmth: 32, saturation: 12, contrast: 18 }),
    preset('cherry-wine','Rojo cereza','#8E2435','Cabello oscuro saturado con brillo controlado en zonas curvas y puntas.','cherry-red','neutral',{ saturation: 18, contrast: 22, shadowDepth: 18 }),
    preset('night-violet','Violeta nocturno','#613077','Base violeta profunda, sombra azulada y recorte magenta en bordes.','night-violet','neutral',{ saturation: 16, contrast: 18, specular: 12 }),
    preset('orchid-shine','Orquidea brillante','#7F4BB0','Luz superior suave con reflejos violetas y blancos en mechones destacados.','orchid-purple','neutral',{ saturation: 18, lightStrength: 18, specular: 20 }),
    preset('pastel-lilac','Lila pastel','#A98AB9','Sombras suaves malva, medios lavanda y brillo ancho perlado.','pastel-lilac','neutral',{ saturation: -6, softness: 30, lightStrength: 20 }),
    preset('rose-neon','Rosa neon','#C43B87','Cabello intenso con sombra violeta y highlight limpio en mechones centrales.','neon-pink','neutral',{ saturation: 38, contrast: 22, specular: 18 }),
    preset('magic-blue','Azul magico','#3F65A5','Base azul medio con sombra violeta y brillo cian en los mechones frontales.','magic-blue','neutral',{ warmth: -18, saturation: 18, specular: 16 }),
    preset('cyber-cyan','Cian cyberpunk','#087C80','Sombras teal profundas y luces electricas en zonas superiores y puntas.','cyber-cyan','neutral',{ saturation: 34, specular: 24, contrast: 20 }),
    preset('undersea-teal','Teal submarino','#236E73','Respuesta para ambientes aquaticos: sombra profunda azul-verde y rebote cian inferior.','undersea-teal','neutral',{ warmth: -20, saturation: 12, shadowDepth: 20, lightStrength: 16 }),
    preset('leaf-dappled','Verde hojas','#6C9B45','Util para follaje: base verdosa, sombra oliva y brillos moteados dorados en mechones superiores.','leaf-green','neutral',{ warmth: 12, saturation: 8, contrast: 16 }),
    preset('sage-soft','Verde salvia','#90A77A','Cabello suave y opaco con luces claras solo en planos altos.','sage-green','neutral',{ saturation: -10, softness: 28, lightStrength: 12 }),
    preset('holographic-prism','Holografico prisma','#6E91AD','Base azul suave con reflejos rosa, menta y lavanda en las tiras de brillo.','holographic','neutral',{ saturation: 20, specular: 34, contrast: 16 }),
    preset('prism-rainbow','Prisma arcoiris','#8F7CC1','Usa la base violeta y reserva los highlights para bandas irisadas en el mechon principal.','prism-rainbow','neutral',{ saturation: 26, specular: 30, lightStrength: 22 }),
    preset('blacklight-fuchsia','Blacklight fucsia','#D145A6','Cabello de alto contraste para negro puro; la luz principal vive en brillos neon.','blacklight-fuchsia','neutral',{ saturation: 42, contrast: 28, specular: 26 }),
    preset('blacklight-cyan','Blacklight cian','#39C8D7','Ideal sobre fondo oscuro: sombra minima y brillo cian intenso en bordes y curvas.','blacklight-cyan','neutral',{ saturation: 38, contrast: 24, specular: 30 }),
    preset('window-gold','Ventana dorada','#B69762','Piensa en una banda de luz: masa en sombra suave y franja de luz tibia cruzando el cabello.','window-gold','neutral',{ warmth: 24, contrast: 14, lightStrength: 20 }),
    preset('rose-gold-hair','Rosa cobre','#B9716D','Cabello rosado calido con brillos claros en mechones externos.','rose-gold-hair','neutral',{ warmth: 20, saturation: 10, specular: 18 }),
    preset('snow-white','Blanco nieve','#F1EDF3','Sombras azul-lavanda muy suaves y highlight limpio en los mechones mas expuestos.','snow-white','neutral',{ warmth: -6, lightStrength: 24, softness: 20, specular: 28 })
  ]}
];

export function categoryById(id) { return LIGHT_LAB_CATEGORIES.find((category) => category.id === id) || LIGHT_LAB_CATEGORIES[0]; }
export function presetById(category, id) { return category.presets.find((item) => item.id === id) || category.presets[0]; }
export function variantById(category, id) { return category.variants.find((item) => item.id === id) || category.variants[0]; }
export function undertoneById(category, id) { return (category.undertones || []).find((item) => item.id === id) || (category.undertones || [])[0] || null; }

