export const LIGHTING3D_PHASE = 5;

export function createDefault3dLight() {
  return {
    id: 'key',
    name: 'Luz principal',
    color: '#FFFFFF',
    intensity: 100,
    distance: 3,
    elevation: 35,
    softness: 50,
    enabled: true
  };
}