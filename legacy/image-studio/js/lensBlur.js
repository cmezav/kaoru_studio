(function(){'use strict';
  const {canvas}=ImageFilters;

  function aperture(ctx,shape,x,y,r,rotation){
    const sides=shape==='octagon'?8:shape==='diamond'?4:shape==='triangle'?3:0;
    ctx.beginPath();
    if(!sides){ctx.arc(x,y,r,0,Math.PI*2);return}
    const start=rotation*Math.PI/180-Math.PI/2;
    for(let i=0;i<sides;i++){
      const a=start+i*Math.PI*2/sides;
      const px=x+Math.cos(a)*r;
      const py=y+Math.sin(a)*r;
      i?ctx.lineTo(px,py):ctx.moveTo(px,py)
    }
    ctx.closePath()
  }

  function saturate(r,g,b,amount){
    const gray=.299*r+.587*g+.114*b;
    const f=Math.max(0,amount)/100;
    return[
      gray+(r-gray)*f,
      gray+(g-gray)*f,
      gray+(b-gray)*f
    ]
  }

  function clamp01(value){
    return Math.max(0,Math.min(1,Number(value)||0))
  }

  function strokeWeight(stroke,x,y,w,h){
    const short=Math.min(w,h);
    const cx=clamp01(stroke.x)*w;
    const cy=clamp01(stroke.y)*h;
    const radius=Math.max(.002,Number(stroke.radius)||.08)*short;
    const hardness=clamp01(stroke.hardness==null ? 0.65 : stroke.hardness);
    const strength=clamp01(stroke.strength==null ? 1 : stroke.strength);
    const d=Math.hypot(x-cx,y-cy);

    if(d>=radius)return 0;

    const core=radius*Math.min(.995,hardness);
    if(d<=core)return strength;

    const feather=Math.max(.001,radius-core);
    return strength*(1-(d-core)/feather)
  }

  function sharpAt(opt,x,y,w,h){
    const short=Math.min(w,h);
    const fx=(Number(opt.focusX)||.5)*w;
    const fy=(Number(opt.focusY)||.5)*h;
    const focusR=Math.max(.01,Number(opt.focusRadius)||.24)*short;
    const transition=Math.max(.01,Number(opt.transition)||.18)*short;
    const d=Math.hypot(x-fx,y-fy);
    const inner=Math.max(0,focusR-transition);
    const outer=focusR+transition;

    let sharp=d<=inner?1:d>=outer?0:1-(d-inner)/Math.max(1,outer-inner);

    const strokes=Array.isArray(opt.strokes)?opt.strokes:[];
    for(const stroke of strokes){
      const weight=strokeWeight(stroke,x,y,w,h);
      if(weight<=0)continue;

      if(stroke.mode==='blur'){
        sharp*=1-weight;
      }else if(stroke.mode==='restore'){
        sharp=sharp+(1-sharp)*weight;
      }
    }

    return clamp01(sharp)
  }

  function paintStroke(ctx,stroke,w,h){
    const short=Math.min(w,h);
    const x=clamp01(stroke.x)*w;
    const y=clamp01(stroke.y)*h;
    const radius=Math.max(.002,Number(stroke.radius)||.08)*short;
    const hardness=clamp01(stroke.hardness==null ? 0.65 : stroke.hardness);
    const strength=clamp01(stroke.strength==null ? 1 : stroke.strength);
    const inner=Math.min(radius-.001,radius*hardness);
    const gradient=ctx.createRadialGradient(x,y,Math.max(0,inner),x,y,radius);

    if(stroke.mode==='blur'){
      ctx.globalCompositeOperation='destination-out';
      gradient.addColorStop(0,`rgba(0,0,0,${strength})`);
      gradient.addColorStop(1,'rgba(0,0,0,0)');
    }else{
      ctx.globalCompositeOperation='source-over';
      gradient.addColorStop(0,`rgba(255,255,255,${strength})`);
      gradient.addColorStop(1,'rgba(255,255,255,0)');
    }

    ctx.fillStyle=gradient;
    ctx.fillRect(x-radius,y-radius,radius*2,radius*2)
  }

  function buildSharpMask(opt,w,h){
    const short=Math.min(w,h);
    const fx=(Number(opt.focusX)||.5)*w;
    const fy=(Number(opt.focusY)||.5)*h;
    const focusR=Math.max(.01,Number(opt.focusRadius)||.24)*short;
    const transition=Math.max(.01,Number(opt.transition)||.18)*short;
    const maskCanvas=canvas(w,h);
    const ctx=maskCanvas.getContext('2d');

    const radial=ctx.createRadialGradient(
      fx,fy,Math.max(0,focusR-transition),
      fx,fy,focusR+transition
    );

    radial.addColorStop(0,'rgba(255,255,255,1)');
    radial.addColorStop(.48,'rgba(255,255,255,.98)');
    radial.addColorStop(1,'rgba(255,255,255,0)');

    ctx.fillStyle=radial;
    ctx.fillRect(0,0,w,h);

    const strokes=Array.isArray(opt.strokes)?opt.strokes:[];
    for(const stroke of strokes){
      if(stroke&&(
        stroke.mode==='blur'||
        stroke.mode==='restore'
      )){
        paintStroke(ctx,stroke,w,h)
      }
    }

    ctx.globalCompositeOperation='source-over';
    return maskCanvas
  }

  function apply(source,opt,quality='full'){
    if(!opt||!opt.enabled||Number(opt.radius)<=0)return source;

    const w=source.width;
    const h=source.height;
    const radius=Math.max(.1,Number(opt.radius)||1);

    const blurred=canvas(w,h);
    const bctx=blurred.getContext('2d');
    bctx.filter=`blur(${Math.min(60,radius)}px)`;
    bctx.drawImage(source,0,0);
    bctx.filter='none';

    const out=canvas(w,h);
    const ctx=out.getContext('2d');
    ctx.drawImage(blurred,0,0);

    const sharpMask=buildSharpMask(opt,w,h);
    const focus=canvas(w,h);
    const fctx=focus.getContext('2d');
    fctx.drawImage(source,0,0);
    fctx.globalCompositeOperation='destination-in';
    fctx.drawImage(sharpMask,0,0);
    fctx.globalCompositeOperation='source-over';
    ctx.drawImage(focus,0,0);

    const opacity=Math.max(0,Math.min(1,Number(opt.opacity)||0));
    const density=Math.max(1,Math.min(100,Number(opt.density)||1));
    const threshold=Math.max(0,Math.min(1,(Number(opt.threshold)||0)/100));

    if(opacity<=0)return out;

    const sampleMax=quality==='fast'?170:260;
    const scale=Math.min(1,sampleMax/Math.max(w,h));
    const sw=Math.max(1,Math.round(w*scale));
    const sh=Math.max(1,Math.round(h*scale));
    const sample=canvas(sw,sh);
    const sctx=sample.getContext('2d',{willReadFrequently:true});
    sctx.drawImage(source,0,0,sw,sh);
    const data=sctx.getImageData(0,0,sw,sh).data;
    const step=Math.max(1,Math.round(Math.sqrt(sw*sh/(quality==='fast'?6000:14000))));
    const points=[];

    for(let sy=0;sy<sh;sy+=step){
      for(let sx=0;sx<sw;sx+=step){
        const x=sx/sw*w;
        const y=sy/sh*h;

        if(sharpAt(opt,x,y,w,h)>.28)continue;

        const i=(sy*sw+sx)*4;
        const r=data[i];
        const g=data[i+1];
        const b=data[i+2];
        const lum=(.2126*r+.7152*g+.0722*b)/255;

        if(lum<threshold)continue;

        const hash=(((sx*73856093)^(sy*19349663))>>>0)%100;
        if(hash>density)continue;

        points.push({x,y,r,g,b,lum})
      }
    }

    points.sort((a,b)=>b.lum-a.lum);

    const limit=Math.min(
      points.length,
      Math.round(
        (quality==='fast'?55:110)+
        density*(quality==='fast'?1.7:3.2)
      )
    );

    const layer=canvas(w,h);
    const lctx=layer.getContext('2d');
    const size=Math.max(1,Number(opt.size)||radius*1.5);
    const light=Math.max(0,Number(opt.lightness)||0)/100;
    const soft=Math.max(0,Number(opt.softness)||0)/100;
    const rotation=Number(opt.rotation)||0;
    const saturation=Number(opt.saturation)||100;
    const shape=opt.shape||'circle';

    for(let i=0;i<limit;i++){
      const p=points[i];
      const strength=Math.min(
        1,
        (p.lum-threshold)/
        Math.max(.05,1-threshold)
      );

      const [r,g,b]=saturate(
        p.r,p.g,p.b,saturation
      );

      const alpha=opacity*strength*(.18+light*.7);
      const rr=size*(.5+strength*.7);

      lctx.fillStyle=
        `rgba(${r|0},${g|0},${b|0},${alpha*.62})`;

      aperture(
        lctx,
        shape,
        p.x,
        p.y,
        rr,
        rotation
      );

      lctx.fill()
    }

    let softLayer=layer;

    if(soft>.02){
      softLayer=canvas(w,h);
      const sl=softLayer.getContext('2d');
      sl.filter=`blur(${Math.min(30,size*soft*.4)}px)`;
      sl.drawImage(layer,0,0);
      sl.filter='none'
    }

    ctx.save();
    ctx.globalCompositeOperation='lighter';

    if(softLayer!==layer){
      ctx.globalAlpha=.78;
      ctx.drawImage(softLayer,0,0)
    }

    ctx.globalAlpha=.72;
    ctx.drawImage(layer,0,0);
    ctx.restore();

    return out
  }

  window.ImageLensBlur={
    apply,
    sharpAt
  };
}());