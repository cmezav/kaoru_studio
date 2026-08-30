(function(){'use strict';
  class PreviewPipeline{
    constructor(canvas,onBusy,onStatus){
      this.canvas=canvas;this.onBusy=onBusy||(()=>{});this.onStatus=onStatus||(()=>{});
      this.source=null;this.state=null;this.timer=0;this.requestId=0;this.display={width:1,height:1};
      this.back=document.createElement('canvas');this.lastRendered=null;this.watchdog=0;
    }
    setSource(source,state){this.source=source;this.state=state;this.updateDimensions(true)}
    setState(state){this.state=state}
    updateDimensions(force=false){if(!this.state)return;const crop=this.state.crop,ratio=Math.min(1,1200/Math.max(crop.width,crop.height)),w=Math.max(1,Math.round(crop.width*ratio)),h=Math.max(1,Math.round(crop.height*ratio));if(force||w!==this.display.width||h!==this.display.height){this.display={width:w,height:h};this.canvas.width=w;this.canvas.height=h;this.back.width=w;this.back.height=h}}
    schedule(mode='fast',delay){
      clearTimeout(this.timer);const request=++this.requestId;
      this.timer=setTimeout(()=>this.render(mode,request),delay==null?(mode==='fast'?70:20):delay);
      return request;
    }
    cancel(status='Preview cancelada'){
      clearTimeout(this.timer);this.timer=0;++this.requestId;clearTimeout(this.watchdog);this.watchdog=0;
      this.onBusy(false);if(status)this.onStatus(status);
    }
    async render(mode='full',request=this.requestId){
      if(!this.source||!this.state||request!==this.requestId)return;
      this.updateDimensions();
      const heavy=this.state.lens.enabled||this.state.grain.amount>0||this.state.filters.motionBlur>0||this.state.sharpness.amount>0;
      const max=mode==='fast'&&heavy?560:mode==='fast'?820:1050;
      const ratio=Math.min(1,max/Math.max(this.state.crop.width,this.state.crop.height));
      const pw=Math.max(1,Math.round(this.state.crop.width*ratio)),ph=Math.max(1,Math.round(this.state.crop.height*ratio));
      this.onBusy(true);this.onStatus(mode==='fast'?'Vista previa rápida…':'Procesando vista previa…');
      clearTimeout(this.watchdog);
      this.watchdog=setTimeout(()=>{if(request===this.requestId){this.onBusy(false);this.onStatus('La preview tardó demasiado. Usa “Reparar preview”.')}},7000);
      try{
        await new Promise(r=>requestAnimationFrame(r));
        if(request!==this.requestId)return;
        const rendered=ImageRenderer.render(this.source,this.state,{width:pw,height:ph,quality:mode});
        if(request!==this.requestId)return;
        const bctx=this.back.getContext('2d');bctx.clearRect(0,0,this.back.width,this.back.height);bctx.imageSmoothingEnabled=true;bctx.imageSmoothingQuality='high';bctx.drawImage(rendered,0,0,this.back.width,this.back.height);
        if(request!==this.requestId)return;
        const ctx=this.canvas.getContext('2d');ctx.clearRect(0,0,this.canvas.width,this.canvas.height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(this.back,0,0);
        this.lastRendered=Date.now();this.onStatus(`${mode==='fast'?'Preview rápida':'Preview completa'} · ${this.canvas.width} × ${this.canvas.height}px`);
      }catch(error){console.error(error);if(request===this.requestId)this.onStatus('Error al procesar la vista previa');}
      finally{
        clearTimeout(this.watchdog);this.watchdog=0;
        /* Este finally también cubre renders cancelados. El bug anterior hacía
           return antes de llegar aquí y dejaba el badge encendido para siempre. */
        if(request===this.requestId)this.onBusy(false);
      }
    }
    redrawLast(){
      if(!this.back.width||!this.back.height)return;
      const ctx=this.canvas.getContext('2d');ctx.clearRect(0,0,this.canvas.width,this.canvas.height);ctx.drawImage(this.back,0,0,this.canvas.width,this.canvas.height);
    }
    repair(){
      this.cancel('Reparando preview…');this.updateDimensions(true);this.redrawLast();
      const canvas=this.canvas,wrap=canvas.parentElement,viewport=wrap&&wrap.parentElement;
      canvas.style.visibility='hidden';canvas.style.transform='translateZ(0) scale(.9999)';
      if(wrap)wrap.style.transform='translateZ(0)';
      void canvas.offsetWidth;if(viewport)void viewport.offsetHeight;
      requestAnimationFrame(()=>{canvas.style.visibility='visible';canvas.style.transform='translateZ(0)';if(wrap)wrap.style.transform='';void canvas.getBoundingClientRect();this.schedule('full',0)});
    }
  }
  window.ImagePreviewPipeline={PreviewPipeline};
}());
