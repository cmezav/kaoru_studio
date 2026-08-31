(function(){
  'use strict';

  const presets = [
    {group:'Basicos',name:'Cuadrado 1080',width:1080,height:1080},
    {group:'Basicos',name:'Cuadrado 2048',width:2048,height:2048},
    {group:'Basicos',name:'HD 16:9',width:1920,height:1080},
    {group:'Basicos',name:'QHD 16:9',width:2560,height:1440},
    {group:'Basicos',name:'4K UHD',width:3840,height:2160},
    {group:'Basicos',name:'Vertical Full HD',width:1080,height:1920},
    {group:'Basicos',name:'A4 300 dpi',width:2480,height:3508},

    {group:'Instagram',name:'Post cuadrado',width:1080,height:1080},
    {group:'Instagram',name:'Post vertical 4:5',width:1080,height:1350},
    {group:'Instagram',name:'Story / Reel',width:1080,height:1920},
    {group:'Instagram',name:'Landscape 1.91:1',width:1080,height:566},
    {group:'Instagram',name:'Foto de perfil',width:320,height:320},

    {group:'TikTok',name:'Video / Story vertical',width:1080,height:1920},
    {group:'TikTok',name:'Cover vertical',width:1080,height:1920},
    {group:'TikTok',name:'Foto de perfil',width:200,height:200},

    {group:'YouTube',name:'Thumbnail',width:1280,height:720},
    {group:'YouTube',name:'Banner canal',width:2560,height:1440},
    {group:'YouTube',name:'Foto de perfil',width:800,height:800},

    {group:'Facebook',name:'Post horizontal',width:1200,height:630},
    {group:'Facebook',name:'Post cuadrado',width:1080,height:1080},
    {group:'Facebook',name:'Story',width:1080,height:1920},
    {group:'Facebook',name:'Portada pagina',width:851,height:315},
    {group:'Facebook',name:'Portada grupo',width:1640,height:856},

    {group:'X / Twitter',name:'Post horizontal',width:1600,height:900},
    {group:'X / Twitter',name:'Header',width:1500,height:500},
    {group:'X / Twitter',name:'Foto de perfil',width:400,height:400},

    {group:'Pinterest',name:'Pin vertical 2:3',width:1000,height:1500},
    {group:'Pinterest',name:'Pin cuadrado',width:1000,height:1000},
    {group:'Pinterest',name:'Pin largo',width:1000,height:2100},

    {group:'LinkedIn',name:'Post horizontal',width:1200,height:627},
    {group:'LinkedIn',name:'Post cuadrado',width:1200,height:1200},
    {group:'LinkedIn',name:'Banner personal',width:1584,height:396},
    {group:'LinkedIn',name:'Foto de perfil',width:400,height:400},

    {group:'Twitch',name:'Video / Offline',width:1920,height:1080},
    {group:'Twitch',name:'Panel',width:320,height:160},
    {group:'Twitch',name:'Banner perfil',width:1200,height:480},

    {group:'Discord',name:'Icono servidor',width:512,height:512},
    {group:'Discord',name:'Banner servidor',width:960,height:540},
    {group:'Discord',name:'Avatar',width:512,height:512},

    {group:'WhatsApp',name:'Estado vertical',width:1080,height:1920},
    {group:'WhatsApp',name:'Foto de perfil',width:500,height:500},

    {group:'Otros',name:'Threads cuadrado',width:1080,height:1080},
    {group:'Otros',name:'Bluesky horizontal',width:1600,height:900},
    {group:'Otros',name:'Wallpaper laptop FHD',width:1920,height:1080},
    {group:'Otros',name:'Wallpaper QHD',width:2560,height:1440},
    {group:'Otros',name:'Wallpaper 4K',width:3840,height:2160}
  ];

  window.CombinerPresets = {
    list: presets.slice(),
    customKey: 'kaoru.image-combiner.custom-presets.v1',
    readCustom(){
      try{
        const value = JSON.parse(localStorage.getItem(this.customKey) || '[]');
        return Array.isArray(value) ? value : [];
      }catch(_){
        return [];
      }
    },
    saveCustom(preset){
      const list = this.readCustom();
      list.push({
        group:'Mis presets',
        name:String(preset.name || 'Preset personal').slice(0,60),
        width:Math.max(1,Math.round(Number(preset.width)||1080)),
        height:Math.max(1,Math.round(Number(preset.height)||1080))
      });
      localStorage.setItem(this.customKey,JSON.stringify(list.slice(-30)));
      return list;
    }
  };
}());