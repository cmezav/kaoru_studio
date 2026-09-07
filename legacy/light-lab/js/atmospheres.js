import { sceneLighting } from './lightingEngine.js';
import { projectorFromEffect } from '../../shared/lightPatterns.js?cache=projector-real-v1';
import { THREE_ATMOSPHERES } from '../../3d-lighting/js/atmospheres3d.js?cache=projector-real-v1';

const LIGHT_CORE_ATMOSPHERES = [
  {
    id:'day',
    name:'D\u00eda',
    description:'Claro, limpio y natural.',
    sceneId:'front-soft',
    backdrop:{top:'#82C9F4',mid:'#DDF2FF',bottom:'#F4E7BF',accent:'#FFF2B3',weather:'clear'},
    overrides:{
      ambient:{color:'#C8E1F4',intensity:20},
      shadow:{color:'#50647B',intensity:24},
      bounce:{color:'#F2C99C',intensity:18},
      rim:{color:'#ECF8FF',intensity:10},
      firstLight:{color:'#FFF0C8',intensity:78,direction:-18,elevation:42,softness:58}
    }
  },
  {
    id:'dawn',
    name:'Amanecer',
    description:'Rosado suave y luz baja.',
    sceneId:'warm',
    backdrop:{top:'#728CB5',mid:'#F3B7A5',bottom:'#FFD4A1',accent:'#FFD1B5',weather:'clear'},
    overrides:{
      ambient:{color:'#B9A7C2',intensity:18},
      shadow:{color:'#594A69',intensity:38},
      bounce:{color:'#F09A7B',intensity:24},
      rim:{color:'#FFE1C7',intensity:14},
      firstLight:{color:'#FFB28A',intensity:66,direction:-55,elevation:9,softness:62}
    }
  },
  {
    id:'morning-cool',
    name:'Ma\u00f1ana fr\u00eda',
    description:'Azul claro y luz fresca.',
    sceneId:'front-soft',
    backdrop:{top:'#7EB9D9',mid:'#CFE6EE',bottom:'#DCE3D8',accent:'#D9F2FF',weather:'clear'},
    overrides:{
      ambient:{color:'#A9D4E8',intensity:24},
      shadow:{color:'#40566D',intensity:30},
      bounce:{color:'#B9D9D2',intensity:14},
      rim:{color:'#DDF7FF',intensity:16},
      firstLight:{color:'#D6F1FF',intensity:66,direction:-28,elevation:34,softness:64}
    }
  },
  {
    id:'afternoon',
    name:'Tarde',
    description:'Luz amarilla mas lateral.',
    sceneId:'side',
    backdrop:{top:'#63B6E8',mid:'#CBE8F4',bottom:'#EBCB79',accent:'#FFE39A',weather:'clear'},
    overrides:{
      ambient:{color:'#ACC6D7',intensity:16},
      shadow:{color:'#4D5662',intensity:36},
      bounce:{color:'#E1A86A',intensity:22},
      rim:{color:'#FFEBC5',intensity:8},
      firstLight:{color:'#FFD277',intensity:86,direction:-70,elevation:24,softness:40}
    }
  },
  {
    id:'sunset',
    name:'Atardecer',
    description:'Naranja, rosa y sombras moradas.',
    sceneId:'dual',
    backdrop:{top:'#394B84',mid:'#D45F6E',bottom:'#FF9B59',accent:'#FFC36D',weather:'clear'},
    overrides:{
      ambient:{color:'#69567F',intensity:18},
      shadow:{color:'#34233F',intensity:52},
      bounce:{color:'#D66F58',intensity:24},
      rim:{color:'#FFC58D',intensity:18}
    }
  },
  {
    id:'night',
    name:'Noche',
    description:'Azul profundo y poca luz.',
    sceneId:'cool',
    backdrop:{top:'#07152C',mid:'#102B4C',bottom:'#172B3C',accent:'#9DD9FF',weather:'stars'},
    overrides:{
      ambient:{color:'#17386B',intensity:24},
      shadow:{color:'#0C1530',intensity:66},
      bounce:{color:'#315B82',intensity:8},
      rim:{color:'#A7E6FF',intensity:26},
      firstLight:{color:'#89C7FF',intensity:52,direction:42,elevation:55,softness:52}
    }
  },
  {
    id:'moon',
    name:'Luna',
    description:'Luz de luna con contorno frio.',
    sceneId:'backlight',
    backdrop:{top:'#061024',mid:'#101D39',bottom:'#111827',accent:'#D8EEFF',weather:'moon'},
    overrides:{
      ambient:{color:'#1D3156',intensity:16},
      shadow:{color:'#0A1020',intensity:72},
      bounce:{color:'#284565',intensity:6},
      rim:{color:'#D8F2FF',intensity:72},
      firstLight:{color:'#B6DBFF',intensity:30,direction:170,elevation:45,softness:42}
    }
  },
  {
    id:'cloudy',
    name:'Nublado',
    description:'Gris azulado, luz suave y plana.',
    sceneId:'front-soft',
    backdrop:{top:'#8798A8',mid:'#B8C3C9',bottom:'#AEB4AD',accent:'#D6E1E4',weather:'cloudy'},
    overrides:{
      ambient:{color:'#AAB8C3',intensity:30},
      shadow:{color:'#58636C',intensity:30},
      bounce:{color:'#AEB9B6',intensity:16},
      rim:{color:'#D8E1E4',intensity:5},
      firstLight:{color:'#D9E2E4',intensity:48,direction:-12,elevation:58,softness:88}
    }
  },
  {
    id:'rain',
    name:'Lluvia',
    description:'Frio, gris y humedo.',
    sceneId:'cool',
    backdrop:{top:'#44596B',mid:'#637787',bottom:'#4A5D62',accent:'#A7D7E8',weather:'rain'},
    overrides:{
      ambient:{color:'#607B8D',intensity:26},
      shadow:{color:'#273844',intensity:50},
      bounce:{color:'#577A83',intensity:12},
      rim:{color:'#A3D9E9',intensity:15},
      firstLight:{color:'#A8D6E6',intensity:42,direction:26,elevation:66,softness:84}
    }
  },
  {
    id:'storm',
    name:'Tormenta',
    description:'Oscuro con destellos frios.',
    sceneId:'dramatic',
    backdrop:{top:'#141D31',mid:'#263A52',bottom:'#20282E',accent:'#BFE6FF',weather:'storm'},
    overrides:{
      ambient:{color:'#344E6C',intensity:14},
      shadow:{color:'#111827',intensity:78},
      bounce:{color:'#35536C',intensity:7},
      rim:{color:'#C7E9FF',intensity:30},
      firstLight:{color:'#B9E5FF',intensity:74,direction:-48,elevation:65,softness:18}
    }
  },
  {
    id:'fog',
    name:'Niebla',
    description:'Desaturado, suave y sin contraste.',
    sceneId:'front-soft',
    backdrop:{top:'#A8B2B5',mid:'#C8CECD',bottom:'#B5B9B5',accent:'#E4E9E7',weather:'fog'},
    overrides:{
      ambient:{color:'#BEC7C7',intensity:38},
      shadow:{color:'#727B7D',intensity:20},
      bounce:{color:'#C7CBC6',intensity:20},
      rim:{color:'#E3E8E5',intensity:8},
      firstLight:{color:'#E5E8E2',intensity:38,direction:-10,elevation:52,softness:96}
    }
  },
  {
    id:'warm-room',
    name:'Interior c\u00e1lido',
    description:'Luz amarilla de habitacion.',
    sceneId:'warm',
    backdrop:{top:'#3E2D2A',mid:'#6E4A34',bottom:'#8D613C',accent:'#FFD08A',weather:'indoor'},
    overrides:{
      ambient:{color:'#755B4C',intensity:22},
      shadow:{color:'#332526',intensity:48},
      bounce:{color:'#D68C55',intensity:22},
      rim:{color:'#F1B66F',intensity:8},
      firstLight:{color:'#FFC36F',intensity:68,direction:-36,elevation:28,softness:60}
    }
  }
];

const SHARED_CREATIVE_ATMOSPHERES =
  THREE_ATMOSPHERES
    .filter(
      (preset) =>
        preset.group === 'creative'
    )
    .map((preset) => {
      const key =
        preset.lighting?.key || {};

      const fill =
        preset.lighting?.fill || {};

      const scene =
        preset.scene || {};

      const effect =
        scene.effect
          ? structuredClone(
              scene.effect
            )
          : null;

      return {
        id: preset.id,
        group: 'creative',
        name: preset.name,
        description:
          preset.description,
        sceneId: 'dual',
        backdrop: {
          top:
            scene.background ||
            '#2A2432',
          mid:
            scene.fog ||
            scene.background ||
            '#3C3348',
          bottom:
            scene.floor ||
            scene.background ||
            '#241F2A',
          accent:
            key.color ||
            '#FFFFFF',
          weather:
            scene.weather ||
            'clear',
          effect
        },
        overrides: {
          ambient: {
            ...preset.lighting
              ?.ambient
          },
          shadow: {
            ...preset.lighting
              ?.shadow
          },
          bounce: {
            ...preset.lighting
              ?.bounce
          },
          rim: {
            ...preset.lighting
              ?.rim
          },
          firstLight: {
            color:
              key.color ||
              '#FFFFFF',
            intensity:
              Math.min(
                100,
                Number(
                  key.intensity ?? 70
                )
              ),
            direction:
              Number(
                key.azimuth ?? 0
              ),
            elevation:
              Number(
                key.elevation ?? 35
              ),
            softness:
              Number(
                key.softness ?? 50
              )
          },
          secondLight: {
            color:
              fill.color ||
              '#FFFFFF',
            intensity:
              Math.min(
                100,
                Number(
                  fill.intensity ?? 25
                )
              ),
            direction:
              Number(
                fill.azimuth ?? 65
              ),
            elevation:
              Number(
                fill.elevation ?? 20
              ),
            softness:
              Number(
                fill.softness ?? 70
              )
          }
        }
      };
    });

export const LIGHT_ATMOSPHERES = [
  ...LIGHT_CORE_ATMOSPHERES,
  ...SHARED_CREATIVE_ATMOSPHERES
];

export function coreAtmospheres(){
  return LIGHT_ATMOSPHERES.filter(
    (preset) =>
      preset.group !== 'creative'
  );
}

export function creativeAtmospheres(){
  return LIGHT_ATMOSPHERES.filter(
    (preset) =>
      preset.group === 'creative'
  );
}

export function atmosphereById(id){
  return LIGHT_ATMOSPHERES.find(item=>item.id===id)||LIGHT_ATMOSPHERES[0];
}

export function buildAtmosphereLighting(id){
  const preset=atmosphereById(id);
  const lighting=sceneLighting(preset.sceneId);
  const overrides=preset.overrides||{};

  for(const key of ['ambient','shadow','bounce','rim']){
    if(overrides[key]){
      lighting[key]={
        ...lighting[key],
        ...overrides[key]
      };
    }
  }

  if(overrides.firstLight&&lighting.lights?.length){
    lighting.lights[0]={
      ...lighting.lights[0],
      ...overrides.firstLight
    };
  }

  if(
    overrides.secondLight &&
    lighting.lights?.[1]
  ){
    lighting.lights[1]={
      ...lighting.lights[1],
      ...overrides.secondLight
    };
  }

  lighting.sceneId=`atmosphere-${preset.id}`;
  lighting.atmosphere={
    id:preset.id,
    group:preset.group||'core',
    name:preset.name,
    description:preset.description,
    backdrop:
      structuredClone(
        preset.backdrop
      )
  };

  lighting.projector=
    projectorFromEffect(
      preset.backdrop?.effect||{}
    );

  if(
    lighting.projector.enabled &&
    lighting.lights?.[0]
  ){
    lighting.projector.lightId=
      lighting.lights[0].id;
  }

  return lighting;
}
