(function(){
  'use strict';

  const MASKS=[
    'none','rounded','circle','ellipse',
    'triangle','diamond','hexagon','star'
  ];

  const BLENDS=[
    'normal','multiply','screen','overlay','darken','lighten',
    'color-dodge','color-burn','hard-light','soft-light',
    'difference','exclusion','hue','saturation','color','luminosity'
  ];

  function clamp(value,min,max){
    return Math.max(min,Math.min(max,Number(value)||0));
  }

  function hex(value,fallback='#000000'){
    const raw=String(value||'').trim().toUpperCase();
    const next=raw.startsWith('#')?raw:`#${raw}`;
    return /^#[0-9A-F]{6}$/.test(next)?next:fallback;
  }

  function rgba(color,opacity){
    const value=hex(color).slice(1);
    const r=parseInt(value.slice(0,2),16);
    const g=parseInt(value.slice(2,4),16);
    const b=parseInt(value.slice(4,6),16);
    return `rgba(${r},${g},${b},${clamp(opacity,0,1)})`;
  }

  function borderDefaults(index=0){
    const colors=['#FFFFFF','#000000','#E05F87','#7C3AED','#55B8FF','#FFD166'];
    return {
      id:`border-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`,
      color:colors[index%colors.length],
      width:index===0?6:4,
      opacity:1
    };
  }

  function styleDefaults(){
    return {
      crop:{x:0,y:0,width:1,height:1},
      borders:[],
      shadow:{
        enabled:false,
        color:'#000000',
        angle:45,
        distance:24,
        blur:24,
        opacity:.38
      },
      glow:{
        enabled:false,
        color:'#FFFFFF',
        blur:28,
        opacity:.42
      },
      effects:{
        brightness:100,
        contrast:100,
        saturation:100,
        blur:0,
        grayscale:0
      },
      mask:{
        type:'none',
        radius:18
      },
      blendMode:'normal',
      groupId:null,
      groupName:''
    };
  }

  function ensure(layer){
    const defaults=styleDefaults();

    layer.crop={
      ...defaults.crop,
      ...(layer.crop||{})
    };

    layer.crop.x=clamp(layer.crop.x,0,.95);
    layer.crop.y=clamp(layer.crop.y,0,.95);
    layer.crop.width=clamp(layer.crop.width,.05,1-layer.crop.x);
    layer.crop.height=clamp(layer.crop.height,.05,1-layer.crop.y);

    layer.borders=Array.isArray(layer.borders)
      ? layer.borders.slice(0,6).map((border,index)=>({
          ...borderDefaults(index),
          ...border,
          color:hex(border.color,'#FFFFFF'),
          width:clamp(border.width,0,80),
          opacity:clamp(border.opacity,0,1)
        }))
      : [];

    layer.shadow={
      ...defaults.shadow,
      ...(layer.shadow||{})
    };

    layer.glow={
      ...defaults.glow,
      ...(layer.glow||{})
    };

    layer.effects={
      ...defaults.effects,
      ...(layer.effects||{})
    };

    layer.mask={
      ...defaults.mask,
      ...(layer.mask||{})
    };

    if(!MASKS.includes(layer.mask.type)){
      layer.mask.type='none';
    }

    layer.mask.radius=clamp(layer.mask.radius,0,50);

    if(!BLENDS.includes(layer.blendMode)){
      layer.blendMode='normal';
    }

    layer.groupId=layer.groupId||null;
    layer.groupName=String(layer.groupName||'').slice(0,60);

    return layer;
  }

  function filterCss(layer){
    ensure(layer);

    const e=layer.effects;
    const filters=[
      `brightness(${clamp(e.brightness,0,200)}%)`,
      `contrast(${clamp(e.contrast,0,200)}%)`,
      `saturate(${clamp(e.saturation,0,200)}%)`,
      `grayscale(${clamp(e.grayscale,0,100)}%)`
    ];

    const blur=clamp(e.blur,0,50);
    if(blur>0) filters.push(`blur(${blur}px)`);

    if(layer.shadow.enabled){
      const angle=Number(layer.shadow.angle||0)*Math.PI/180;
      const distance=clamp(layer.shadow.distance,0,200);
      const dx=Math.cos(angle)*distance;
      const dy=Math.sin(angle)*distance;

      filters.push(
        `drop-shadow(${dx.toFixed(2)}px ${dy.toFixed(2)}px ${clamp(layer.shadow.blur,0,120)}px ${rgba(layer.shadow.color,layer.shadow.opacity)})`
      );
    }

    if(layer.glow.enabled){
      filters.push(
        `drop-shadow(0px 0px ${clamp(layer.glow.blur,0,120)}px ${rgba(layer.glow.color,layer.glow.opacity)})`
      );
    }

    return filters.join(' ');
  }

  function cropImageStyle(layer){
    ensure(layer);
    const crop=layer.crop;

    return {
      width:`${100/crop.width}%`,
      height:`${100/crop.height}%`,
      left:`${-crop.x/crop.width*100}%`,
      top:`${-crop.y/crop.height*100}%`
    };
  }

  function cropPreset(layer,ratio){
    ensure(layer);

    if(!ratio){
      layer.crop={x:0,y:0,width:1,height:1};
      return layer.crop;
    }

    const sourceAspect=
      Math.max(1,layer.naturalWidth)/
      Math.max(1,layer.naturalHeight);

    let width=1;
    let height=1;

    if(sourceAspect>ratio){
      width=ratio/sourceAspect;
    }else{
      height=sourceAspect/ratio;
    }

    layer.crop={
      x:(1-width)/2,
      y:(1-height)/2,
      width,
      height
    };

    return layer.crop;
  }

  function cropAspect(layer){
    ensure(layer);

    return (
      Math.max(1,layer.naturalWidth)*layer.crop.width
    ) / (
      Math.max(1,layer.naturalHeight)*layer.crop.height
    );
  }

  function borderRects(layer){
    ensure(layer);
    let cumulative=0;

    return layer.borders.map(border=>{
      cumulative+=Math.max(0,Number(border.width)||0);

      return {
        ...border,
        cumulative
      };
    });
  }

  function applyBorderElements(node,layer){
    borderRects(layer).forEach((border,index)=>{
      if(border.width<=0 || border.opacity<=0) return;

      const element=document.createElement('div');
      element.className='visual-border';
      element.dataset.borderIndex=String(index);
      element.style.inset=`-${border.cumulative}px`;
      element.style.borderWidth=`${border.width}px`;
      element.style.borderColor=rgba(border.color,border.opacity);
      element.style.zIndex=String(-1-index);
      node.appendChild(element);
    });
  }

  function drawBorders(ctx,layer){
    const list=borderRects(layer);

    for(let index=list.length-1;index>=0;index-=1){
      const border=list[index];
      if(border.width<=0 || border.opacity<=0) continue;

      ctx.fillStyle=rgba(border.color,border.opacity);
      ctx.fillRect(
        -layer.width/2-border.cumulative,
        -layer.height/2-border.cumulative,
        layer.width+border.cumulative*2,
        layer.height+border.cumulative*2
      );
    }
  }

  function maskCss(layer){
    ensure(layer);

    const type=layer.mask.type;
    const radius=clamp(layer.mask.radius,0,50);

    if(type==='none') return 'none';
    if(type==='rounded') return `inset(0 round ${radius}px)`;
    if(type==='circle') return 'circle(50% at 50% 50%)';
    if(type==='ellipse') return 'ellipse(50% 43% at 50% 50%)';
    if(type==='triangle') return 'polygon(50% 0%,100% 100%,0% 100%)';
    if(type==='diamond') return 'polygon(50% 0%,100% 50%,50% 100%,0% 50%)';
    if(type==='hexagon') return 'polygon(25% 0%,75% 0%,100% 50%,75% 100%,25% 100%,0% 50%)';
    if(type==='star') return 'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 94%,50% 72%,21% 94%,32% 57%,2% 35%,39% 35%)';

    return 'none';
  }

  function applyMaskElement(element,layer){
    const clip=maskCss(layer);
    element.style.clipPath=clip;
    element.style.webkitClipPath=clip;
  }

  function blendCss(layer){
    ensure(layer);
    return layer.blendMode==='normal'?'normal':layer.blendMode;
  }

  function blendCanvas(layer){
    ensure(layer);
    return layer.blendMode==='normal'?'source-over':layer.blendMode;
  }

  function polygonPath(ctx,points,width,height){
    const left=-width/2;
    const top=-height/2;

    ctx.moveTo(
      left+points[0][0]*width,
      top+points[0][1]*height
    );

    for(let i=1;i<points.length;i+=1){
      ctx.lineTo(
        left+points[i][0]*width,
        top+points[i][1]*height
      );
    }

    ctx.closePath();
  }

  function roundedPath(ctx,x,y,w,h,r){
    const radius=Math.min(Math.max(0,r),w/2,h/2);

    if(typeof ctx.roundRect==='function'){
      ctx.roundRect(x,y,w,h,radius);
      return;
    }

    ctx.moveTo(x+radius,y);
    ctx.lineTo(x+w-radius,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+radius);
    ctx.lineTo(x+w,y+h-radius);
    ctx.quadraticCurveTo(x+w,y+h,x+w-radius,y+h);
    ctx.lineTo(x+radius,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-radius);
    ctx.lineTo(x,y+radius);
    ctx.quadraticCurveTo(x,y,x+radius,y);
    ctx.closePath();
  }

  function traceMask(ctx,layer){
    ensure(layer);

    const type=layer.mask.type;
    const w=layer.width;
    const h=layer.height;
    const x=-w/2;
    const y=-h/2;

    ctx.beginPath();

    if(type==='none'){
      ctx.rect(x,y,w,h);
      return;
    }

    if(type==='rounded'){
      roundedPath(ctx,x,y,w,h,layer.mask.radius);
      return;
    }

    if(type==='circle'){
      ctx.arc(0,0,Math.min(w,h)/2,0,Math.PI*2);
      return;
    }

    if(type==='ellipse'){
      ctx.ellipse(0,0,w/2,h*.43,0,0,Math.PI*2);
      return;
    }

    if(type==='triangle'){
      polygonPath(ctx,[[.5,0],[1,1],[0,1]],w,h);
      return;
    }

    if(type==='diamond'){
      polygonPath(ctx,[[.5,0],[1,.5],[.5,1],[0,.5]],w,h);
      return;
    }

    if(type==='hexagon'){
      polygonPath(ctx,[[.25,0],[.75,0],[1,.5],[.75,1],[.25,1],[0,.5]],w,h);
      return;
    }

    if(type==='star'){
      polygonPath(ctx,[
        [.5,0],[.61,.35],[.98,.35],[.68,.57],[.79,.94],
        [.5,.72],[.21,.94],[.32,.57],[.02,.35],[.39,.35]
      ],w,h);
      return;
    }

    ctx.rect(x,y,w,h);
  }

  function canvasFilter(layer){
    return filterCss(layer);
  }

  async function imageFromSource(src){
    return new Promise((resolve,reject)=>{
      const image=new Image();
      image.onload=()=>resolve(image);
      image.onerror=reject;
      image.src=src;
    });
  }

  function drawLayer(ctx,layer,image){
    ensure(layer);

    const crop=layer.crop;
    const sx=crop.x*image.naturalWidth;
    const sy=crop.y*image.naturalHeight;
    const sw=crop.width*image.naturalWidth;
    const sh=crop.height*image.naturalHeight;

    ctx.save();
    ctx.globalAlpha=clamp(layer.opacity,0,1);
    ctx.globalCompositeOperation=blendCanvas(layer);

    ctx.translate(
      layer.x+layer.width/2,
      layer.y+layer.height/2
    );

    ctx.rotate((Number(layer.rotation)||0)*Math.PI/180);
    ctx.scale(layer.flipX?-1:1,layer.flipY?-1:1);

    drawBorders(ctx,layer);

    ctx.save();

    if(layer.mask.type!=='none'){
      traceMask(ctx,layer);
      ctx.clip();
    }

    const oldFilter=ctx.filter;
    ctx.filter=canvasFilter(layer);

    ctx.drawImage(
      image,
      sx,sy,sw,sh,
      -layer.width/2,
      -layer.height/2,
      layer.width,
      layer.height
    );

    ctx.filter=oldFilter;
    ctx.restore();
    ctx.restore();
  }

  window.CombinerEffects={
    MASKS,
    BLENDS,
    clamp,
    hex,
    rgba,
    borderDefaults,
    styleDefaults,
    ensure,
    filterCss,
    cropImageStyle,
    cropPreset,
    cropAspect,
    borderRects,
    applyBorderElements,
    maskCss,
    applyMaskElement,
    blendCss,
    blendCanvas,
    traceMask,
    imageFromSource,
    drawLayer
  };
}());