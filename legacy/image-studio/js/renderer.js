(function(){'use strict';
  const F=ImageFilters;
  function render(source,state,options){const crop=state.crop,width=Math.max(1,Math.round(options.width)),height=Math.max(1,Math.round(options.height)),scale=width/Math.max(1,crop.width),quality=options.quality||'full';let work=F.canvas(width,height),ctx=work.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(source,crop.x,crop.y,crop.width,crop.height,0,0,width,height);
    work=F.colorAdjust(work,state);work=F.sharpen(work,state.sharpness,scale);work=F.pixelate(work,Math.max(1,state.filters.pixelate*scale));work=F.motionBlur(work,state.filters.motionBlur*scale,state.filters.motionAngle);if(state.filters.gaussianBlur>0)work=F.cssBlur(work,state.filters.gaussianBlur*scale);if(state.filters.blur>0)work=F.cssBlur(work,state.filters.blur*scale*.55);
    const lens={...state.lens,radius:state.lens.radius*scale,size:state.lens.size*scale};work=ImageLensBlur.apply(work,lens,quality);work=F.vignetteAndGrain(work,state,quality);
    const out=F.canvas(width,height),octx=out.getContext('2d');if(options.background){octx.fillStyle=options.background;octx.fillRect(0,0,width,height)}const t=state.transform;octx.save();octx.globalAlpha=Math.max(0,Math.min(1,state.adjustments.opacity));octx.translate(width/2+t.x*scale,height/2+t.y*(height/Math.max(1,crop.height)));octx.rotate(t.rotation*Math.PI/180);octx.scale(t.scaleX*(t.flipX?-1:1),t.scaleY*(t.flipY?-1:1));octx.drawImage(work,-width/2,-height/2,width,height);octx.restore();return out}
  window.ImageRenderer={render};
}());
