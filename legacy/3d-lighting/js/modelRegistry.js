export const MODEL_REGISTRY = [
  {
    id: 'asaro',
    name: 'Asaro / Planos',
    description: 'Modelo propio F3 con 52 planos faciales para estudio de luz.',
    phase: 3,
    ready: true,
    planeCount: 52
  },
  {
    id: 'realistic-head',
    name: 'Cabeza realista',
    description: 'Prototipo temporal. Modelo anatomico definitivo en Fase 4.',
    phase: 4,
    ready: false
  },
  {
    id: 'bust',
    name: 'Busto',
    description: 'Prototipo temporal. Busto anatomico definitivo en Fase 4.',
    phase: 4,
    ready: false
  },
  {
    id: 'body',
    name: 'Cuerpo completo',
    description: 'Prototipo temporal. Cuerpo humano definitivo en Fase 4.',
    phase: 4,
    ready: false
  }
];

export function modelById(id) {
  return MODEL_REGISTRY.find((model) => model.id === id) || MODEL_REGISTRY[0];
}