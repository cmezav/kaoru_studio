const env = (color, intensity) => ({ color, intensity });
const dl = (
  color,
  intensity,
  azimuth,
  elevation,
  softness,
  distance = 5.4
) => ({
  color,
  intensity,
  azimuth,
  elevation,
  distance,
  softness
});

export const FACE_LIGHTING_ATMOSPHERES = [
  {
    id: 'ref-club-blue-magenta',
    group: 'creative',
    tags: ['color', 'dramatic'],
    name: 'Club Blue Magenta',
    description:
      'Split nocturno magenta y azul. Afila el rostro, ilumina frente, nariz y labios y hunde media cara en azul profundo.',
    scene: {
      background: '#07051D',
      fog: '#07051D',
      floor: '#070515',
      exposure: 0.84,
      weather: 'clear',
      effect: {
        type: 'split',
        colorA: '#FF1F8F',
        colorB: '#173DFF',
        opacity: 68,
        angle: -24,
        scale: 124,
        blur: 10,
        contrast: 94,
        density: 52
      }
    },
    lighting: {
      ambient: env('#101353', 18),
      shadow: env('#02020A', 82),
      bounce: env('#173DFF', 14),
      rim: env('#4FD8FF', 18),
      key: dl('#FF1F8F', 135, -26, 36, 20, 5.2),
      fill: dl('#173DFF', 115, 58, 12, 62, 5.8),
      extra: [
        {
          id: 'club-cyan-streak',
          name: 'Cyan streak accent',
          color: '#4FD8FF',
          intensity: 52,
          azimuth: 94,
          elevation: 8,
          distance: 5.6,
          softness: 18
        }
      ]
    }
  },

  {
    id: 'ref-pink-green-editorial',
    group: 'creative',
    tags: ['color', 'dramatic'],
    name: 'Pink Green Editorial',
    description:
      'Beauty editorial glossy. El magenta marca pomulos, nariz, labios y cuello; el verde talla los laterales del rostro.',
    scene: {
      background: '#25051F',
      fog: '#25051F',
      floor: '#180416',
      exposure: 0.98,
      weather: 'clear',
      effect: {
        type: 'neon',
        colorA: '#FF1EC8',
        colorB: '#72FF63',
        opacity: 64,
        angle: 18,
        scale: 118,
        blur: 9,
        contrast: 92,
        density: 54
      }
    },
    lighting: {
      ambient: env('#4A014A', 20),
      shadow: env('#130216', 62),
      bounce: env('#72FF63', 18),
      rim: env('#FF58D4', 14),
      key: dl('#FF1EC8', 155, 18, 44, 24, 5.1),
      fill: dl('#72FF63', 72, -64, 10, 32, 5.6),
      extra: [
        {
          id: 'editorial-plum-ambient',
          name: 'Plum ambient',
          color: '#4A014A',
          intensity: 32,
          azimuth: 168,
          elevation: -8,
          distance: 6,
          softness: 82
        }
      ]
    }
  },

  {
    id: 'ref-electric-blue-rim',
    group: 'creative',
    tags: ['color', 'dramatic'],
    name: 'Electric Blue Rim',
    description:
      'Perfil escultorico casi en silueta. El azul electrico dibuja nariz, labios, menton, mandibula, cuello y borde del cabello.',
    scene: {
      background: '#02040D',
      fog: '#02040D',
      floor: '#030611',
      exposure: 0.72,
      weather: 'clear',
      effect: {
        type: 'rim',
        colorA: '#1F63FF',
        colorB: '#08142F',
        opacity: 82,
        angle: -108,
        scale: 128,
        blur: 5,
        contrast: 100,
        density: 44
      }
    },
    lighting: {
      ambient: env('#07122D', 8),
      shadow: env('#000000', 92),
      bounce: env('#0A173D', 6),
      rim: env('#1F63FF', 84),
      key: dl('#1F63FF', 160, -112, 14, 26, 5.5),
      fill: dl('#0A173D', 18, 38, 8, 70, 6)
    }
  },

  {
    id: 'ref-icy-wet-portrait',
    group: 'creative',
    tags: ['color', 'natural'],
    name: 'Icy Wet Portrait',
    description:
      'Retrato frio y luminoso. La luz frontal blanco-azulada suaviza facciones y deja sombras finas del cabello sobre ojos, nariz y labios.',
    scene: {
      background: '#BBD7E6',
      fog: '#BBD7E6',
      floor: '#A8CADC',
      exposure: 1.12,
      weather: 'clear'
    },
    lighting: {
      ambient: env('#C8ECF9', 34),
      shadow: env('#35465E', 24),
      bounce: env('#89B7D9', 30),
      rim: env('#DDF7FF', 12),
      key: dl('#E8F8FF', 145, 4, 56, 42, 5),
      fill: dl('#8FD3FF', 60, 0, 82, 28, 5.4),
      extra: [
        {
          id: 'icy-blue-separator',
          name: 'Soft blue separator',
          color: '#356DFF',
          intensity: 24,
          azimuth: -46,
          elevation: 10,
          distance: 5.8,
          softness: 46
        }
      ]
    }
  }
];
