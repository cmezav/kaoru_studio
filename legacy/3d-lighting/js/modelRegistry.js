export const MODEL_REGISTRY = [
  {
    id: 'asaro',
    name: 'Asaro / Planos',
    description: 'Cabeza por planos GLB para estudiar cortes claros de luz y sombra.',
    phase: 3,
    ready: true,
    source: 'head-planes-reference'
  },
  {
    id: 'sphere',
    name: 'Esfera 3D',
    description: 'Esfera de estudio para probar paletas, sombras, rebotes y luces sin anatomia.',
    phase: 6,
    ready: true,
    source: 'study-sphere'
  },
  {
    id: 'realistic-head',
    name: 'Cabeza realista',
    description: 'Encuadre de cabeza sobre la base humana anatomica CC0 de MakeHuman.',
    phase: 4,
    ready: true,
    source: 'makehuman-cc0'
  },
  {
    id: 'bust',
    name: 'Busto',
    description: 'Cabeza, cuello, hombros y torso superior de la base humana CC0.',
    phase: 4,
    ready: true,
    source: 'makehuman-cc0'
  },
  {
    id: 'body',
    name: 'Cuerpo completo',
    description: 'Cuerpo humano completo y parametricamente preparado para estudio de luz.',
    phase: 4,
    ready: true,
    source: 'makehuman-cc0'
  }
];

export function modelById(id) {
  return MODEL_REGISTRY.find((model) => model.id === id) || MODEL_REGISTRY[0];
}