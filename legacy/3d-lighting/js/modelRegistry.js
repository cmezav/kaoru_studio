export const MODEL_REGISTRY = [
  {
    id: 'asaro',
    name: 'Asaro / Planos',
    description: 'Cabeza propia con planos de luz claramente delimitados.',
    phase: 3
  },
  {
    id: 'realistic-head',
    name: 'Cabeza realista',
    description: 'Volumen humano suave para iluminacion natural.',
    phase: 4
  },
  {
    id: 'bust',
    name: 'Busto',
    description: 'Cabeza, cuello, claviculas, hombros y torso superior.',
    phase: 4
  },
  {
    id: 'body',
    name: 'Cuerpo completo',
    description: 'Cuerpo humano realista para estudio de luz y color.',
    phase: 4
  }
];

export function modelById(id) {
  return MODEL_REGISTRY.find((model) => model.id === id) || MODEL_REGISTRY[0];
}