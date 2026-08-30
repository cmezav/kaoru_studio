export const LIGHT_LAB_CATEGORIES = [
  {
    id: 'natural-skin', label: 'Piel natural', short: 'Natural', icon: '◒', description: 'Tonos humanos y subtonos coherentes.',
    presets: [
      { id: 'very-light-warm', name: 'Muy clara cálida', description: 'Base marfil con transiciones melocotón y sombras malva suaves.', colors: ['#4B2930','#75434A','#9A5D5E','#BD7C72','#D39A86','#E6B59D','#F1CAB1','#F8DDC8','#FFF0DF','#D68B78','#B96F68','#8D5361'] },
      { id: 'medium-olive', name: 'Media oliva', description: 'Equilibrio oliva dorado con sombra fría y rebote terroso.', colors: ['#332D25','#514638','#70604A','#8D7658','#A58C68','#BEA27A','#D4BA91','#E7CFAB','#F3DFC2','#987A55','#665849','#4D4650'] },
      { id: 'deep-cool', name: 'Oscura fría', description: 'Profundidad cacao con matices ciruela y luces neutrales.', colors: ['#1D151A','#302027','#4A2D35','#65403F','#80534B','#9B6B5D','#B68270','#CF9C86','#E4B7A2','#74434B','#54303E','#36243A'] }
    ]
  },
  {
    id: 'fantasy-skin', label: 'Piel fantástica', short: 'Fantasía', icon: '✦', description: 'Pieles mágicas, alienígenas y sobrenaturales.',
    presets: [
      { id: 'mint-witch', name: 'Verde menta', description: 'Menta luminosa con sombras azul petróleo y reflejos acuáticos.', colors: ['#102D31','#17474A','#24605B','#347A6C','#4F9680','#73B39B','#99CFB7','#BDE4D1','#E1F6E8','#5FC9BA','#397E87','#254A66'] },
      { id: 'rose-magic', name: 'Rosa mágica', description: 'Rosa frío con transiciones lilas y brillo encantado.', colors: ['#321D42','#502453','#713160','#93456E','#B75D82','#D47B9F','#E99CBC','#F7BCD5','#FFE1EF','#CC73C6','#844CA4','#493372'] },
      { id: 'spectral-grey', name: 'Gris espectral', description: 'Grises etéreos con respiración cian y oclusión violácea.', colors: ['#171A28','#252A3A','#343C4D','#495465','#627080','#7C8998','#98A7B3','#B8C8CF','#DDEBE9','#6CBAB7','#4C738A','#352F51'] }
    ]
  },
  {
    id: 'materials', label: 'Materiales', short: 'Metales', icon: '◇', description: 'Metales con bandas, reflejos y contraste.',
    presets: [
      { id: 'polished-gold', name: 'Oro pulido', description: 'Contraste alto, bandas oscuras y highlights especulares estrechos.', colors: ['#21130B','#472B10','#704714','#9A6A1B','#C4932C','#E1BB53','#F4DB83','#FFF1B0','#FFFBE2','#D9941C','#81561C','#3A2A22'] },
      { id: 'cold-silver', name: 'Plata fría', description: 'Acero luminoso con reflejo azul y cortes de alto contraste.', colors: ['#111722','#202936','#354252','#516274','#748696','#9DADB8','#C3CED5','#E1E8EC','#FAFCFD','#85B1C2','#526E84','#293449'] },
      { id: 'red-copper', name: 'Cobre rojizo', description: 'Cobre cálido con sombra borgoña y destello melocotón.', colors: ['#281410','#4B2118','#743524','#9A4B30','#BC6541','#D98558','#ECA879','#F6C6A0','#FFE1C4','#C95D32','#87402F','#512638'] }
    ]
  },
  {
    id: 'hair-stylized', label: 'Cabello / estilo', short: 'Cabello', icon: '≈', description: 'Cabello natural, fantasía, neón y armonías.',
    presets: [
      { id: 'night-violet', name: 'Violeta nocturno', description: 'Cabello oscuro violeta con reflejo magenta y rim light frío.', colors: ['#140E22','#211333','#321A49','#48235F','#613077','#7D4191','#9B5BAC','#BB79C7','#DDA0E2','#8056D5','#4B47A4','#222A66'] },
      { id: 'cyber-cyan', name: 'Cian cyberpunk', description: 'Base profunda con cian eléctrico y acentos verde neón.', colors: ['#06171C','#082A32','#0A424B','#0B5E67','#087C80','#10A09B','#2BC2B7','#64DED0','#B4F5EA','#28F2D4','#2088B6','#243C78'] },
      { id: 'warm-brown', name: 'Castaño cálido', description: 'Castaño natural con reflejos miel y sombras vino discretas.', colors: ['#21130F','#382018','#542D20','#704029','#8C5634','#AA7043','#C78C57','#DDAA72','#F0CA96','#B56C3F','#71402F','#452536'] }
    ]
  }
];

export function categoryById(id) {
  return LIGHT_LAB_CATEGORIES.find((category) => category.id === id) || LIGHT_LAB_CATEGORIES[0];
}

export function presetById(category, id) {
  return category.presets.find((preset) => preset.id === id) || category.presets[0];
}
