(function(){
'use strict';

const F=ImageFilters;

const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

function number(value,fallback=0){
  const parsed=Number(value);
  return Number.isFinite(parsed)?parsed:fallback;
}

function validCanvas(value){
  return Boolean(
    value&&
    Number.isFinite(value.width)&&
    Number.isFinite(value.height)&&
    value.width>0&&
    value.height>0
  );
}

function safeStage(label,current,callback){
  try{
    const next=callback();

    if(validCanvas(next)){
      return next;
    }

    console.warn(
      `Image Studio: ${label} devolvio un resultado invalido. Se conserva la etapa anterior.`
    );
  }catch(error){
    console.warn(
      `Image Studio: fallo ${label}. Se conserva la etapa anterior.`,
      error
    );
  }

  return current;
}

function normalizedCrop(source,state){
  const sourceWidth=Math.max(
    1,
    number(
      source?.width||
      source?.naturalWidth,
      1
    )
  );

  const sourceHeight=Math.max(
    1,
    number(
      source?.height||
      source?.naturalHeight,
      1
    )
  );

  const incoming=state?.crop||{};

  const x=clamp(
    number(incoming.x,0),
    0,
    Math.max(0,sourceWidth-1)
  );

  const y=clamp(
    number(incoming.y,0),
    0,
    Math.max(0,sourceHeight-1)
  );

  const width=clamp(
    number(
      incoming.width,
      sourceWidth-x
    ),
    1,
    Math.max(1,sourceWidth-x)
  );

  const height=clamp(
    number(
      incoming.height,
      sourceHeight-y
    ),
    1,
    Math.max(1,sourceHeight-y)
  );

  return{
    x,
    y,
    width,
    height
  };
}

function hasColorAdjustments(state){
  const a=state?.adjustments||{};
  const f=state?.filters||{};

  return Boolean(
    number(a.brightness)!==0||
    number(a.contrast)!==0||
    number(a.saturation)!==0||
    number(a.exposure)!==0||
    number(a.temperature)!==0||
    number(a.hue)!==0||
    number(a.vibrance)!==0||
    number(a.gamma,1)!==1||
    number(a.shadows)!==0||
    number(a.highlights)!==0||
    number(a.whites)!==0||
    number(a.blacks)!==0||
    number(f.grayscale)!==0||
    number(f.monochrome)!==0||
    number(f.sepia)!==0||
    number(f.invert)!==0
  );
}

function alphaMask(source){
  const width=source.width;
  const height=source.height;
  const mask=F.canvas(width,height);
  const ctx=mask.getContext('2d',{alpha:true});

  ctx.clearRect(0,0,width,height);
  ctx.fillStyle='#fff';
  ctx.fillRect(0,0,width,height);
  ctx.globalCompositeOperation='destination-in';
  ctx.drawImage(source,0,0);
  ctx.globalCompositeOperation='source-over';

  return mask
}

function copyMask(mask){
  const out=F.canvas(mask.width,mask.height);
  out.getContext('2d',{alpha:true}).drawImage(mask,0,0);
  return out
}

function morphMask(mask,distance,operation){
  const amount=Math.max(0,number(distance,0));
  const out=copyMask(mask);

  if(amount<=.25){
    return out
  }

  const ctx=out.getContext('2d',{alpha:true});
  const diagonal=amount*.70710678;
  const offsets=[
    [amount,0],
    [-amount,0],
    [0,amount],
    [0,-amount],
    [diagonal,diagonal],
    [-diagonal,diagonal],
    [diagonal,-diagonal],
    [-diagonal,-diagonal]
  ];

  ctx.globalCompositeOperation=
    operation==='erode'
      ?'destination-in'
      :'source-over';

  for(const [dx,dy] of offsets){
    ctx.drawImage(mask,dx,dy)
  }

  ctx.globalCompositeOperation='source-over';
  return out
}

function subtractMask(a,b){
  const out=copyMask(a);
  const ctx=out.getContext('2d',{alpha:true});
  ctx.globalCompositeOperation='destination-out';
  ctx.drawImage(b,0,0);
  ctx.globalCompositeOperation='source-over';
  return out
}

function blurMask(mask,radius){
  if(radius<=.25){
    return copyMask(mask)
  }

  const out=F.canvas(mask.width,mask.height);
  const ctx=out.getContext('2d',{alpha:true});
  ctx.filter=`blur(${Math.min(120,radius)}px)`;
  ctx.drawImage(mask,0,0);
  ctx.filter='none';
  return out
}

function buildAlphaContourMask(source,opt,scaleFactor=1){
  const inside=Math.max(
    .5,
    number(opt.width,48)*
    scaleFactor
  );

  const outside=Math.max(
    0,
    number(opt.roundness,0)*
    scaleFactor
  );

  const feather=Math.max(
    0,
    number(opt.feather,18)*
    scaleFactor
  );

  const radius=Math.max(
    0,
    number(opt.radius,16)*
    scaleFactor
  );

  const softness=Math.max(
    .5,
    radius+feather
  );

  const alpha=alphaMask(source);

  /*
    Feather real del contorno:
    - innerCore preserva el centro totalmente nítido;
    - hardEdge es la franja dura original;
    - softEdge es esa misma zona, pero suavizada con blur SOLO en alfa.
    Esto se comporta más como un suavizado de silueta y evita el efecto
    de imagen encogida o fantasma translúcido.
  */
  const innerCore=morphMask(
    alpha,
    inside,
    'erode'
  );

  const outerBase=outside>0
    ?morphMask(
        alpha,
        outside,
        'dilate'
      )
    :copyMask(alpha);

  const hardEdge=subtractMask(
    outerBase,
    innerCore
  );

  const softOuter=blurMask(
    outerBase,
    softness
  );

  const softEdge=subtractMask(
    softOuter,
    innerCore
  );

  return {
    innerCore,
    hardEdge,
    softEdge
  }
}

function applyContourBlur(source,opt,scaleFactor=1){
  opt=opt||{};

  const intensity=clamp(
    number(opt.intensity,75)/100,
    0,
    1
  );

  const softness=Math.max(
    0,
    (
      number(opt.radius,16)+
      number(opt.feather,18)
    )*scaleFactor
  );

  if(
    !opt.enabled||
    intensity<=0||
    softness<=0
  ){
    return source
  }

  const {
    innerCore,
    hardEdge,
    softEdge
  }=buildAlphaContourMask(
    source,
    opt,
    scaleFactor
  );

  const finalMask=F.canvas(
    source.width,
    source.height
  );
  const mctx=finalMask.getContext('2d',{alpha:true});

  /*
    Mezcla correcta:
    - centro 100% intacto
    - parte del borde duro original
    - parte del borde suavizado
    Así el blur se siente como feather del borde,
    no como encogimiento de toda la imagen.
  */
  mctx.drawImage(innerCore,0,0);

  if(intensity<1){
    mctx.save();
    mctx.globalAlpha=1-intensity;
    mctx.drawImage(hardEdge,0,0);
    mctx.restore()
  }

  mctx.save();
  mctx.globalAlpha=intensity;
  mctx.drawImage(softEdge,0,0);
  mctx.restore();

  const out=F.canvas(source.width,source.height);
  const ctx=out.getContext('2d',{alpha:true});
  ctx.drawImage(source,0,0);
  ctx.globalCompositeOperation='destination-in';
  ctx.drawImage(finalMask,0,0);
  ctx.globalCompositeOperation='source-over';

  return out
}

function render(source,state={},options={}){
  if(!source){
    throw new Error(
      'Image Studio no recibio una imagen fuente.'
    );
  }

  const crop=normalizedCrop(
    source,
    state
  );

  const width=Math.max(
    1,
    Math.round(
      number(
        options.width,
        crop.width
      )
    )
  );

  const height=Math.max(
    1,
    Math.round(
      number(
        options.height,
        crop.height
      )
    )
  );

  const scaleX=
    width/
    Math.max(
      1,
      crop.width
    );

  const scaleY=
    height/
    Math.max(
      1,
      crop.height
    );

  const quality=
    options.quality||
    'full';

  let work=F.canvas(
    width,
    height
  );

  const ctx=
    work.getContext(
      '2d',
      {alpha:true}
    );

  if(!ctx){
    throw new Error(
      'No se pudo crear el contexto 2D.'
    );
  }

  ctx.clearRect(
    0,
    0,
    width,
    height
  );

  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';

  ctx.drawImage(
    source,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    width,
    height
  );

  /*
    El preview base ya esta dibujado.
    Solo ejecutamos etapas que realmente estan activas.
    Si una etapa falla, conservamos la imagen anterior en vez de
    devolver un lienzo transparente.
  */
  if(
    hasColorAdjustments(
      state
    )
  ){
    work=safeStage(
      'ajustes de color',
      work,
      ()=>F.colorAdjust(
        work,
        state
      )
    );
  }

  const sharpness=
    state?.sharpness||{};

  if(
    number(
      sharpness.amount
    )>0
  ){
    work=safeStage(
      'nitidez',
      work,
      ()=>F.sharpen(
        work,
        sharpness,
        Math.min(
          scaleX,
          scaleY
        )
      )
    );
  }

  const filters=
    state?.filters||{};

  if(
    number(
      filters.pixelate,
      1
    )>1
  ){
    work=safeStage(
      'pixelado',
      work,
      ()=>F.pixelate(
        work,
        Math.max(
          1,
          number(
            filters.pixelate,
            1
          )*
          Math.min(
            scaleX,
            scaleY
          )
        )
      )
    );
  }

  if(
    number(
      filters.motionBlur
    )>0
  ){
    work=safeStage(
      'motion blur',
      work,
      ()=>F.motionBlur(
        work,
        number(
          filters.motionBlur
        )*
        Math.min(
          scaleX,
          scaleY
        ),
        number(
          filters.motionAngle
        )
      )
    );
  }

  if(
    number(
      filters.gaussianBlur
    )>0
  ){
    work=safeStage(
      'blur gaussiano',
      work,
      ()=>F.cssBlur(
        work,
        number(
          filters.gaussianBlur
        )*
        Math.min(
          scaleX,
          scaleY
        )
      )
    );
  }

  if(
    number(
      filters.blur
    )>0
  ){
    work=safeStage(
      'desenfoque',
      work,
      ()=>F.cssBlur(
        work,
        number(
          filters.blur
        )*
        Math.min(
          scaleX,
          scaleY
        )*
        .55
      )
    );
  }

  if(
    state?.lens?.enabled&&
    number(
      state.lens.radius
    )>0
  ){
    const lens={
      ...state.lens,
      radius:
        number(
          state.lens.radius
        )*
        Math.min(
          scaleX,
          scaleY
        ),
      size:
        number(
          state.lens.size,
          18
        )*
        Math.min(
          scaleX,
          scaleY
        )
    };

    work=safeStage(
      'Lens Blur',
      work,
      ()=>ImageLensBlur.apply(
        work,
        lens,
        quality
      )
    );
  }

  const grain=
    state?.grain||{};

  if(
    number(
      filters.vignette
    )>0||
    number(
      grain.amount
    )>0
  ){
    work=safeStage(
      'vineta/grano',
      work,
      ()=>F.vignetteAndGrain(
        work,
        state,
        quality
      )
    );
  }

  if(
    state?.contourBlur?.enabled&&
    number(
      state.contourBlur.intensity
    )>0&&
    number(
      state.contourBlur.radius
    )>0
  ){
    work=safeStage(
      'blur de contorno',
      work,
      ()=>applyContourBlur(
        work,
        state.contourBlur,
        Math.min(
          scaleX,
          scaleY
        )
      )
    );
  }

  const out=F.canvas(
    width,
    height
  );

  const octx=
    out.getContext(
      '2d',
      {alpha:true}
    );

  if(!octx){
    throw new Error(
      'No se pudo crear el lienzo final.'
    );
  }

  if(
    options.background
  ){
    octx.fillStyle=
      options.background;

    octx.fillRect(
      0,
      0,
      width,
      height
    );
  }else{
    octx.clearRect(
      0,
      0,
      width,
      height
    );
  }

  const transform=
    state?.transform||{};

  const rawOpacity=
    number(
      state?.adjustments?.opacity,
      1
    );

  const opacity=
    Number.isFinite(
      rawOpacity
    )
      ?clamp(
          rawOpacity,
          0,
          1
        )
      :1;

  const transformScaleX=
    Math.max(
      .01,
      Math.abs(
        number(
          transform.scaleX,
          1
        )
      )
    )*
    (
      transform.flipX
        ?-1
        :1
    );

  const transformScaleY=
    Math.max(
      .01,
      Math.abs(
        number(
          transform.scaleY,
          1
        )
      )
    )*
    (
      transform.flipY
        ?-1
        :1
    );

  octx.save();

  octx.globalAlpha=
    opacity;

  octx.translate(
    width/2+
      number(
        transform.x
      )*
      scaleX,
    height/2+
      number(
        transform.y
      )*
      scaleY
  );

  octx.rotate(
    number(
      transform.rotation
    )*
    Math.PI/
    180
  );

  octx.scale(
    transformScaleX,
    transformScaleY
  );

  octx.drawImage(
    work,
    -width/2,
    -height/2,
    width,
    height
  );

  octx.restore();

  return out;
}

window.ImageRenderer={
  render
};

}());
