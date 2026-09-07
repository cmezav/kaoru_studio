(function(){
'use strict';

class PreviewPipeline{
  constructor(
    canvas,
    onBusy,
    onStatus
  ){
    this.canvas=canvas;
    this.onBusy=
      onBusy||
      (()=>{});
    this.onStatus=
      onStatus||
      (()=>{});

    this.source=null;
    this.state=null;
    this.timer=0;
    this.requestId=0;
    this.activeRequest=0;
    this.display={
      width:1,
      height:1
    };
    this.back=
      document.createElement(
        'canvas'
      );
    this.lastRendered=null;
    this.watchdog=0;
  }

  setSource(
    source,
    state
  ){
    this.cancel('');
    this.source=source;
    this.state=state;
    this.updateDimensions(
      true
    );

    /*
      Primera pintura inmediata:
      la imagen debe aparecer antes de ejecutar filtros.
      Asi un filtro lento nunca deja la pantalla vacia.
    */
    this.paintFallback(
      'Imagen cargada · preparando preview'
    );
  }

  setState(state){
    this.state=state;
  }

  updateDimensions(
    force=false
  ){
    if(!this.state)return;

    const crop=
      this.state.crop||{};

    const cropWidth=
      Math.max(
        1,
        Number(
          crop.width
        )||1
      );

    const cropHeight=
      Math.max(
        1,
        Number(
          crop.height
        )||1
      );

    const ratio=
      Math.min(
        1,
        1200/
        Math.max(
          cropWidth,
          cropHeight
        )
      );

    const width=
      Math.max(
        1,
        Math.round(
          cropWidth*
          ratio
        )
      );

    const height=
      Math.max(
        1,
        Math.round(
          cropHeight*
          ratio
        )
      );

    if(
      force||
      width!==
        this.display.width||
      height!==
        this.display.height
    ){
      this.display={
        width,
        height
      };

      this.canvas.width=
        width;

      this.canvas.height=
        height;

      this.back.width=
        width;

      this.back.height=
        height;
    }
  }

  schedule(
    mode='fast',
    delay
  ){
    clearTimeout(
      this.timer
    );

    const request=
      ++this.requestId;

    this.timer=
      setTimeout(
        ()=>{
          this.timer=0;

          this.render(
            mode,
            request
          );
        },
        delay==null
          ?(
            mode==='fast'
              ?70
              :20
          )
          :delay
      );

    return request;
  }

  cancel(
    status='Preview cancelada'
  ){
    clearTimeout(
      this.timer
    );

    this.timer=0;
    ++this.requestId;

    clearTimeout(
      this.watchdog
    );

    this.watchdog=0;
    this.activeRequest=0;
    this.onBusy(
      false
    );

    if(status){
      this.onStatus(
        status
      );
    }
  }

  safeCrop(){
    if(
      !this.source||
      !this.state
    ){
      return null;
    }

    const sourceWidth=
      Math.max(
        1,
        Number(
          this.source.width||
          this.source.naturalWidth
        )||1
      );

    const sourceHeight=
      Math.max(
        1,
        Number(
          this.source.height||
          this.source.naturalHeight
        )||1
      );

    const crop=
      this.state.crop||{};

    const x=
      Math.max(
        0,
        Math.min(
          sourceWidth-1,
          Number(
            crop.x
          )||0
        )
      );

    const y=
      Math.max(
        0,
        Math.min(
          sourceHeight-1,
          Number(
            crop.y
          )||0
        )
      );

    const width=
      Math.max(
        1,
        Math.min(
          sourceWidth-x,
          Number(
            crop.width
          )||
          sourceWidth-x
        )
      );

    const height=
      Math.max(
        1,
        Math.min(
          sourceHeight-y,
          Number(
            crop.height
          )||
          sourceHeight-y
        )
      );

    return{
      x,
      y,
      width,
      height
    };
  }

  paintFallback(
    status=''
  ){
    if(
      !this.source||
      !this.state
    ){
      return false;
    }

    try{
      this.updateDimensions();

      const crop=
        this.safeCrop();

      if(!crop){
        return false;
      }

      const ctx=
        this.canvas.getContext(
          '2d',
          {alpha:true}
        );

      const bctx=
        this.back.getContext(
          '2d',
          {alpha:true}
        );

      if(
        !ctx||
        !bctx
      ){
        return false;
      }

      ctx.clearRect(
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );

      ctx.imageSmoothingEnabled=
        true;

      ctx.imageSmoothingQuality=
        'high';

      ctx.drawImage(
        this.source,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );

      bctx.clearRect(
        0,
        0,
        this.back.width,
        this.back.height
      );

      bctx.drawImage(
        this.canvas,
        0,
        0,
        this.back.width,
        this.back.height
      );

      this.lastRendered=
        Date.now();

      if(status){
        this.onStatus(
          status
        );
      }

      return true;
    }catch(error){
      console.error(
        'Image Studio fallback preview',
        error
      );

      return false;
    }
  }

  async render(
    mode='full',
    request=this.requestId
  ){
    if(
      !this.source||
      !this.state||
      request!==
        this.requestId
    ){
      return;
    }

    this.activeRequest=
      request;

    this.updateDimensions();

    const heavy=
      Boolean(
        this.state.lens?.enabled||
        Number(
          this.state.grain?.amount
        )>0||
        Number(
          this.state.filters?.motionBlur
        )>0||
        Number(
          this.state.sharpness?.amount
        )>0
      );

    /*
      Preview deliberadamente limitada.
      Exportar sigue usando la fuente original y su resolucion real.
    */
    const max=
      mode==='fast'&&heavy
        ?480
        :mode==='fast'
          ?720
          :900;

    const cropWidth=
      Math.max(
        1,
        Number(
          this.state.crop?.width
        )||1
      );

    const cropHeight=
      Math.max(
        1,
        Number(
          this.state.crop?.height
        )||1
      );

    const ratio=
      Math.min(
        1,
        max/
        Math.max(
          cropWidth,
          cropHeight
        )
      );

    const previewWidth=
      Math.max(
        1,
        Math.round(
          cropWidth*
          ratio
        )
      );

    const previewHeight=
      Math.max(
        1,
        Math.round(
          cropHeight*
          ratio
        )
      );

    this.onBusy(
      true
    );

    this.onStatus(
      mode==='fast'
        ?'Vista previa rapida...'
        :'Procesando vista previa...'
    );

    clearTimeout(
      this.watchdog
    );

    this.watchdog=
      setTimeout(
        ()=>{
          if(
            request===
              this.requestId&&
            this.activeRequest===
              request
          ){
            this.onBusy(
              false
            );

            this.onStatus(
              'La preview esta tardando. La imagen base sigue disponible.'
            );
          }
        },
        8000
      );

    try{
      await new Promise(
        resolve=>
          requestAnimationFrame(
            resolve
          )
      );

      if(
        request!==
          this.requestId
      ){
        return;
      }

      const rendered=
        ImageRenderer.render(
          this.source,
          this.state,
          {
            width:
              previewWidth,
            height:
              previewHeight,
            quality:
              mode
          }
        );

      if(
        request!==
          this.requestId
      ){
        return;
      }

      if(
        !rendered||
        !rendered.width||
        !rendered.height
      ){
        throw new Error(
          'El renderer devolvio un lienzo vacio.'
        );
      }

      const bctx=
        this.back.getContext(
          '2d',
          {alpha:true}
        );

      const ctx=
        this.canvas.getContext(
          '2d',
          {alpha:true}
        );

      if(
        !bctx||
        !ctx
      ){
        throw new Error(
          'No se pudo acceder al canvas de preview.'
        );
      }

      bctx.clearRect(
        0,
        0,
        this.back.width,
        this.back.height
      );

      bctx.imageSmoothingEnabled=
        true;

      bctx.imageSmoothingQuality=
        'high';

      bctx.drawImage(
        rendered,
        0,
        0,
        this.back.width,
        this.back.height
      );

      if(
        request!==
          this.requestId
      ){
        return;
      }

      ctx.clearRect(
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );

      ctx.imageSmoothingEnabled=
        true;

      ctx.imageSmoothingQuality=
        'high';

      ctx.drawImage(
        this.back,
        0,
        0
      );

      this.lastRendered=
        Date.now();

      this.onStatus(
        `${
          mode==='fast'
            ?'Preview rapida'
            :'Preview completa'
        } · ${
          this.canvas.width
        } × ${
          this.canvas.height
        }px`
      );
    }catch(error){
      console.error(
        'Image Studio preview',
        error
      );

      if(
        request===
          this.requestId
      ){
        const recovered=
          this.paintFallback();

        this.onStatus(
          recovered
            ?'Preview segura · se mostro la imagen base porque un efecto fallo'
            :'Error al procesar la vista previa'
        );
      }
    }finally{
      clearTimeout(
        this.watchdog
      );

      this.watchdog=0;

      if(
        this.activeRequest===
          request
      ){
        this.activeRequest=0;
        this.onBusy(
          false
        );
      }
    }
  }

  redrawLast(){
    if(
      !this.back.width||
      !this.back.height
    ){
      this.paintFallback();
      return;
    }

    const ctx=
      this.canvas.getContext(
        '2d',
        {alpha:true}
      );

    if(!ctx)return;

    ctx.clearRect(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    ctx.drawImage(
      this.back,
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
  }

  repair(){
    this.cancel(
      'Reparando preview...'
    );

    this.updateDimensions(
      true
    );

    this.paintFallback(
      'Imagen base restaurada · recalculando efectos'
    );

    this.schedule(
      'full',
      60
    );
  }
}

window.ImagePreviewPipeline={
  PreviewPipeline
};

}());
