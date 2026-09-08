/* KAORU SILUETA BRUSH FILL V1.4 */
(function(){
'use strict';

const previous=window.SilhouetteBrushFill;
if(previous?.__v14)return;

const state={
  width:0,
  height:0,
  enabled:false,
  eraser:false,
  size:36,
  opacity:1,
  layer:null,
  ctx:null,
  maskCanvas:null,
  maskCtx:null,
  maskRef:null,
  surface:null,
  overlay:null,
  overlayCtx:null,
  drawing:false,
  last:null,
  undoUrl:null,
  hasPaint:false,
  ui:{}
};

function clamp(v,min,max){
  return Math.max(min,Math.min(max,v));
}

function hex(value){
  const match=/^#([0-9a-f]{6})$/i.exec(
    String(value||'').trim()
  );

  return match
    ?('#'+match[1].toUpperCase())
    :'#000000';
}

function currentStudioColor(){
  const input=
    document.getElementById(
      'hexInput'
    );

  return hex(
    input?.value||
    state.ui.color?.value||
    '#000000'
  );
}

function brushColor(){
  return hex(
    state.ui.color?.value||
    currentStudioColor()
  );
}

function ensureCanvas(){
  if(!state.layer){
    state.layer=
      document.createElement(
        'canvas'
      );

    state.ctx=
      state.layer.getContext(
        '2d'
      );
  }

  if(!state.maskCanvas){
    state.maskCanvas=
      document.createElement(
        'canvas'
      );

    state.maskCtx=
      state.maskCanvas.getContext(
        '2d',
        {willReadFrequently:true}
      );
  }
}

function ensureSize(width,height){
  width=
    Math.max(
      1,
      Math.round(Number(width)||0)
    );

  height=
    Math.max(
      1,
      Math.round(Number(height)||0)
    );

  if(!width||!height){
    return false;
  }

  ensureCanvas();

  if(
    state.width===width&&
    state.height===height
  ){
    return true;
  }

  state.width=width;
  state.height=height;

  state.layer.width=width;
  state.layer.height=height;

  state.maskCanvas.width=width;
  state.maskCanvas.height=height;

  state.maskRef=null;
  state.undoUrl=null;
  state.hasPaint=false;

  syncOverlayGeometry();
  renderOverlay();

  refreshUI();

  return true;
}

function setMask(mask,width,height){
  if(
    !mask||
    !ensureSize(width,height)
  ){
    return;
  }

  if(mask===state.maskRef){
    return;
  }

  state.maskRef=mask;

  const image=
    state.maskCtx.createImageData(
      state.width,
      state.height
    );

  for(
    let p=0;
    p<mask.length;
    p++
  ){
    const i=p*4;

    image.data[i]=255;
    image.data[i+1]=255;
    image.data[i+2]=255;
    image.data[i+3]=mask[p];
  }

  state.maskCtx.putImageData(
    image,
    0,
    0
  );
}

function clipLayerToMask(){
  if(
    !state.ctx||
    !state.maskCanvas||
    !state.width||
    !state.height
  ){
    return;
  }

  state.ctx.save();
  state.ctx.globalCompositeOperation=
    'destination-in';

  state.ctx.globalAlpha=1;
  state.ctx.shadowBlur=0;

  state.ctx.drawImage(
    state.maskCanvas,
    0,
    0
  );

  state.ctx.restore();
}

function brushCanInteract(){
  const editing=
    document.getElementById(
      'editingTab'
    );

  const colorMode=
    document.getElementById(
      'colorMode'
    );

  return Boolean(
    editing&&
    colorMode&&
    !editing.classList.contains(
      'hidden'
    )&&
    !colorMode.classList.contains(
      'hidden'
    )
  );
}

function rerenderStudio(){
  try{
    window.SilhouetteStudioActions
      ?.render?.();
  }catch(error){
    console.error(error);
  }
}

function outputFrameInfo(){
  const frame=
    window.SilhouetteStudioActions
      ?.getOutputFrame?.();

  if(
    frame&&
    Number(frame.width)>0&&
    Number(frame.height)>0
  ){
    return frame;
  }

  return{
    format:'rect',
    width:state.width,
    height:state.height,
    sourceWidth:state.width,
    sourceHeight:state.height,
    offsetX:0,
    offsetY:0
  };
}

function syncOverlayGeometry(){
  if(!state.overlay)return;

  const target=
    document.getElementById(
      'resultCanvas'
    );

  const frame=
    outputFrameInfo();

  const width=
    Math.max(
      1,
      Number(
        target?.width||
        frame.width||
        state.width
      )
    );

  const height=
    Math.max(
      1,
      Number(
        target?.height||
        frame.height||
        state.height
      )
    );

  if(
    state.overlay.width!==
      width||
    state.overlay.height!==
      height
  ){
    state.overlay.width=
      width;

    state.overlay.height=
      height;
  }
}

function renderOverlay(){
  if(
    !state.overlayCtx||
    !state.overlay
  ){
    return;
  }

  syncOverlayGeometry();

  state.overlayCtx.clearRect(
    0,
    0,
    state.overlay.width,
    state.overlay.height
  );

  /*
    Mientras se pinta, la capa temporal se coloca dentro de la
    zona real de la silueta. En formato cuadrado el padding queda
    transparente y NO se estira el pincel.
  */
  if(
    state.drawing&&
    state.layer&&
    state.width&&
    state.height
  ){
    const frame=
      outputFrameInfo();

    state.overlayCtx.drawImage(
      state.layer,
      Number(frame.offsetX)||0,
      Number(frame.offsetY)||0,
      state.width,
      state.height
    );
  }

  const interactive=
    state.enabled&&
    brushCanInteract();

  state.overlay.classList.toggle(
    'is-enabled',
    interactive
  );

  state.overlay.classList.toggle(
    'is-eraser',
    state.eraser
  );
}

function updateHasPaint(){
  if(
    !state.ctx||
    !state.width||
    !state.height
  ){
    state.hasPaint=false;
    return;
  }

  try{
    const probe=
      document.createElement(
        'canvas'
      );

    probe.width=128;
    probe.height=128;

    const pctx=
      probe.getContext(
        '2d',
        {willReadFrequently:true}
      );

    pctx.clearRect(
      0,
      0,
      128,
      128
    );

    pctx.drawImage(
      state.layer,
      0,
      0,
      128,
      128
    );

    const data=
      pctx.getImageData(
        0,
        0,
        128,
        128
      ).data;

    let found=false;

    for(
      let i=3;
      i<data.length;
      i+=4
    ){
      if(data[i]>0){
        found=true;
        break;
      }
    }

    state.hasPaint=found;
  }catch(_){}
}

function refreshUI(){
  const ui=state.ui;

  if(!ui.panel){
    return;
  }

  ui.enable.classList.toggle(
    'active',
    state.enabled
  );

  ui.enable.textContent=
    state.enabled
      ?'Pincel activo'
      :'Activar pincel';

  ui.eraser.classList.toggle(
    'active',
    state.eraser
  );

  ui.eraser.textContent=
    state.eraser
      ?'Borrador activo'
      :'Borrador';

  ui.undo.disabled=
    !state.undoUrl;

  ui.clear.disabled=
    !state.hasPaint;

  ui.sizeOut.textContent=
    Math.round(state.size)+
    ' px';

  ui.opacityOut.textContent=
    Math.round(
      state.opacity*100
    )+
    '%';

  if(
    !state.width||
    !state.height
  ){
    ui.status.textContent=
      'Carga una silueta para empezar a pintar.';
  }else if(
    state.enabled&&
    !brushCanInteract()
  ){
    ui.status.textContent=
      'El pincel queda pausado fuera de Edición > Color para no bloquear la edición de Plantillas.';
  }else if(state.enabled){
    ui.status.textContent=
      state.eraser
        ?'Borrador activo: arrastra dentro de la silueta.'
        :'Pincel activo: arrastra dentro de la silueta.';
  }else{
    ui.status.textContent=
      'Activa el pincel para pintar únicamente dentro de la silueta.';
  }
}

function snapshotUndo(){
  if(
    !state.layer||
    !state.width||
    !state.height
  ){
    return;
  }

  try{
    state.undoUrl=
      state.layer.toDataURL(
        'image/png'
      );
  }catch(_){
    state.undoUrl=null;
  }

  refreshUI();
}

function restoreFromDataUrl(url){
  return new Promise(
    (resolve,reject)=>{
      ensureCanvas();

      state.ctx.clearRect(
        0,
        0,
        state.width,
        state.height
      );

      if(!url){
        state.undoUrl=null;
        state.hasPaint=false;

        rerenderStudio();
        renderOverlay();
        refreshUI();

        resolve();
        return;
      }

      const image=
        new Image();

      image.onload=()=>{
        state.ctx.clearRect(
          0,
          0,
          state.width,
          state.height
        );

        state.ctx.drawImage(
          image,
          0,
          0,
          state.width,
          state.height
        );

        clipLayerToMask();

        state.undoUrl=null;

        updateHasPaint();
        rerenderStudio();
        renderOverlay();
        refreshUI();

        resolve();
      };

      image.onerror=()=>reject(
        new Error(
          'No se pudo restaurar el trazo.'
        )
      );

      image.src=url;
    }
  );
}

function clear(){
  ensureCanvas();

  if(
    state.width&&
    state.height
  ){
    state.ctx.clearRect(
      0,
      0,
      state.width,
      state.height
    );
  }

  state.undoUrl=null;
  state.hasPaint=false;

  rerenderStudio();
  renderOverlay();
  refreshUI();
}

function pointFromEvent(event){
  syncOverlayGeometry();

  const rect=
    state.overlay.getBoundingClientRect();

  const frame=
    outputFrameInfo();

  const sx=
    Number(frame.width)/
    Math.max(
      1,
      rect.width
    );

  const sy=
    Number(frame.height)/
    Math.max(
      1,
      rect.height
    );

  const outputX=
    (event.clientX-rect.left)*
    sx;

  const outputY=
    (event.clientY-rect.top)*
    sy;

  const x=
    outputX-
    (Number(frame.offsetX)||0);

  const y=
    outputY-
    (Number(frame.offsetY)||0);

  if(
    x<0||
    y<0||
    x>state.width||
    y>state.height
  ){
    return null;
  }

  return{
    x:clamp(
      x,
      0,
      state.width
    ),
    y:clamp(
      y,
      0,
      state.height
    ),
    scale:
      (sx+sy)/2
  };
}

function drawSegment(from,to){
  if(
    !state.ctx||
    !state.maskCanvas
  ){
    return;
  }

  const width=
    Math.max(
      1,
      state.size*
      (
        (
          from.scale+
          to.scale
        )/
        2
      )
    );

  state.ctx.save();

  state.ctx.lineCap='round';
  state.ctx.lineJoin='round';
  state.ctx.lineWidth=width;
  state.ctx.globalAlpha=
    state.opacity;

  state.ctx.shadowBlur=0;

  if(state.eraser){
    state.ctx.globalCompositeOperation=
      'destination-out';

    state.ctx.strokeStyle=
      'rgba(0,0,0,1)';
  }else{
    state.ctx.globalCompositeOperation=
      'source-over';

    state.ctx.strokeStyle=
      brushColor();
  }

  state.ctx.beginPath();

  state.ctx.moveTo(
    from.x,
    from.y
  );

  state.ctx.lineTo(
    to.x,
    to.y
  );

  state.ctx.stroke();
  state.ctx.restore();

  if(!state.eraser){
    clipLayerToMask();
  }

  state.hasPaint=true;

  renderOverlay();
  refreshUI();
}

function onPointerDown(event){
  if(
    !state.enabled||
    !brushCanInteract()||
    !state.width||
    !state.height
  ){
    return;
  }

  if(
    event.pointerType==='mouse'&&
    event.button!==0
  ){
    return;
  }

  event.preventDefault();

  snapshotUndo();

  /*
    Quitamos temporalmente el pincel del resultCanvas.
    Durante el trazo se muestra solo en el overlay correctamente
    alineado; al soltar vuelve a integrarse al render.
  */
  state.drawing=true;
  rerenderStudio();

  state.last=
    pointFromEvent(event);

  if(!state.last){
    state.drawing=false;
    renderOverlay();
    return;
  }

  try{
    state.overlay
      .setPointerCapture(
        event.pointerId
      );
  }catch(_){}

  drawSegment(
    state.last,
    state.last
  );
}

function onPointerMove(event){
  if(
    !state.enabled||
    !state.drawing
  ){
    return;
  }

  event.preventDefault();

  const next=
    pointFromEvent(event);

  if(!next)return;

  drawSegment(
    state.last||next,
    next
  );

  state.last=next;
}

function onPointerEnd(event){
  if(!state.drawing){
    return;
  }

  state.drawing=false;
  state.last=null;

  try{
    if(
      state.overlay
        .hasPointerCapture(
          event.pointerId
        )
    ){
      state.overlay
        .releasePointerCapture(
          event.pointerId
        );
    }
  }catch(_){}

  updateHasPaint();

  /*
    El trazo ya queda dentro del resultado real.
    El overlay vuelve a quedar vacío para que no se duplique.
  */
  rerenderStudio();
  renderOverlay();
  refreshUI();
}

function buildUI(){
  if(
    document.getElementById(
      'silhouetteBrushFillPanel'
    )
  ){
    return;
  }

  const mount=
    document.getElementById(
      'colorMode'
    );

  if(!mount){
    return;
  }

  const style=
    document.createElement(
      'style'
    );

  style.id=
    'silhouetteBrushFillStyles';

  style.textContent=`
    .sil-brush-panel{margin-top:10px;padding:10px;border:1px solid #ededf2;border-radius:12px;background:#fafafd}
    .sil-brush-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px}
    .sil-brush-head strong{display:block;font-size:11px}
    .sil-brush-head small{display:block;margin-top:2px;color:#85858e;font-size:9px;line-height:1.35}
    .sil-brush-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .sil-brush-field{display:grid;gap:4px}
    .sil-brush-field span{font-size:9px;color:#696971}
    .sil-brush-field output{font-size:9px;color:var(--purple);font-weight:850;text-align:right}
    .sil-brush-field input[type=range]{width:100%;accent-color:var(--purple)}
    .sil-brush-color-row{display:grid;grid-template-columns:42px 1fr;gap:6px;align-items:center}
    .sil-brush-color-row input[type=color]{width:42px;height:30px;border:1px solid #dedee5;border-radius:7px;background:#fff;padding:2px}
    .sil-brush-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}
    .sil-brush-actions button{min-height:31px;border:1px solid #dedee5;border-radius:8px;background:#fff;color:#55555e;font-size:9px;font-weight:850}
    .sil-brush-actions button:hover:not(:disabled),.sil-brush-actions button.active{background:#f4efff;border-color:#cdb7f4;color:var(--purple)}
    .sil-brush-actions button:disabled{opacity:.42;cursor:default}
    .sil-brush-status{margin-top:7px;color:#85858e;font-size:9px;line-height:1.35}

    #silhouetteResultSurface{
      position:relative;
      display:inline-grid;
      place-items:center;
      line-height:0;
      max-width:100%;
      max-height:100%;
      flex:0 1 auto;
    }

    #silhouetteResultSurface>#resultCanvas{
      grid-area:1/1;
      max-width:100%;
      max-height:100%;
    }

    #silhouetteBrushOverlay{
      position:absolute;
      inset:0;
      width:100%;
      height:100%;
      z-index:8;
      pointer-events:none;
      touch-action:none;
      border-radius:6px;
    }

    #silhouetteBrushOverlay.is-enabled{
      pointer-events:auto;
      cursor:crosshair;
    }

    #silhouetteBrushOverlay.is-enabled.is-eraser{
      cursor:cell;
    }

    @media(max-width:640px){
      .sil-brush-grid{
        grid-template-columns:1fr;
      }
    }
  `;

  document.head.appendChild(
    style
  );

  const panel=
    document.createElement(
      'div'
    );

  panel.id=
    'silhouetteBrushFillPanel';

  panel.className=
    'sil-brush-panel';

  panel.innerHTML=`
    <div class="sil-brush-head">
      <div>
        <strong>Pincel de relleno</strong>
        <small>Pinta manualmente dentro de la silueta. No crea otra silueta: el trazo se integra al resultado real y al PNG.</small>
      </div>
    </div>

    <div class="sil-brush-grid">
      <label class="sil-brush-field">
        <span>Tamaño</span>
        <input id="silBrushSize" type="range" min="2" max="180" value="36">
        <output id="silBrushSizeOut">36 px</output>
      </label>

      <label class="sil-brush-field">
        <span>Opacidad</span>
        <input id="silBrushOpacity" type="range" min="5" max="100" value="100">
        <output id="silBrushOpacityOut">100%</output>
      </label>
    </div>

    <div class="sil-brush-color-row" style="margin-top:8px">
      <input id="silBrushColor" type="color" value="#000000" aria-label="Color del pincel">
      <button id="silBrushUseCurrent" class="mini-btn" type="button">Usar color actual</button>
    </div>

    <div class="sil-brush-actions">
      <button id="silBrushEnable" type="button">Activar pincel</button>
      <button id="silBrushEraser" type="button">Borrador</button>
      <button id="silBrushUndo" type="button" disabled>Deshacer último trazo</button>
      <button id="silBrushClear" type="button" disabled>Limpiar pincel</button>
    </div>

    <div id="silBrushStatus" class="sil-brush-status"></div>
  `;

  mount.appendChild(panel);

  state.ui={
    panel,
    size:
      panel.querySelector(
        '#silBrushSize'
      ),
    sizeOut:
      panel.querySelector(
        '#silBrushSizeOut'
      ),
    opacity:
      panel.querySelector(
        '#silBrushOpacity'
      ),
    opacityOut:
      panel.querySelector(
        '#silBrushOpacityOut'
      ),
    color:
      panel.querySelector(
        '#silBrushColor'
      ),
    useCurrent:
      panel.querySelector(
        '#silBrushUseCurrent'
      ),
    enable:
      panel.querySelector(
        '#silBrushEnable'
      ),
    eraser:
      panel.querySelector(
        '#silBrushEraser'
      ),
    undo:
      panel.querySelector(
        '#silBrushUndo'
      ),
    clear:
      panel.querySelector(
        '#silBrushClear'
      ),
    status:
      panel.querySelector(
        '#silBrushStatus'
      )
  };

  state.ui.color.value=
    currentStudioColor();

  state.ui.size.addEventListener(
    'input',
    ()=>{
      state.size=
        Number(
          state.ui.size.value
        )||36;

      refreshUI();
    }
  );

  state.ui.opacity.addEventListener(
    'input',
    ()=>{
      state.opacity=
        (
          Number(
            state.ui.opacity.value
          )||100
        )/
        100;

      refreshUI();
    }
  );

  state.ui.useCurrent.addEventListener(
    'click',
    ()=>{
      state.ui.color.value=
        currentStudioColor();
    }
  );

  state.ui.enable.addEventListener(
    'click',
    ()=>{
      state.enabled=
        !state.enabled;

      renderOverlay();
      refreshUI();
    }
  );

  state.ui.eraser.addEventListener(
    'click',
    ()=>{
      state.eraser=
        !state.eraser;

      renderOverlay();
      refreshUI();
    }
  );

  state.ui.undo.addEventListener(
    'click',
    async()=>{
      const url=
        state.undoUrl;

      if(!url){
        return;
      }

      try{
        await restoreFromDataUrl(
          url
        );
      }catch(error){
        console.error(error);
      }
    }
  );

  state.ui.clear.addEventListener(
    'click',
    ()=>{
      if(!state.hasPaint){
        return;
      }

      snapshotUndo();

      state.ctx.clearRect(
        0,
        0,
        state.width,
        state.height
      );

      state.hasPaint=false;

      rerenderStudio();
      renderOverlay();
      refreshUI();
    }
  );

  refreshUI();
}

function buildOverlay(){
  if(
    state.overlay?.isConnected
  ){
    return;
  }

  const target=
    document.getElementById(
      'resultCanvas'
    );

  const stage=
    target?.closest(
      '.preview-stage'
    );

  if(
    !target||
    !stage
  ){
    return;
  }

  let surface=
    document.getElementById(
      'silhouetteResultSurface'
    );

  if(!surface){
    surface=
      document.createElement(
        'div'
      );

    surface.id=
      'silhouetteResultSurface';

    target.parentNode.insertBefore(
      surface,
      target
    );

    surface.appendChild(
      target
    );
  }

  const overlay=
    document.createElement(
      'canvas'
    );

  overlay.id=
    'silhouetteBrushOverlay';

  overlay.setAttribute(
    'aria-label',
    'Pincel de relleno sobre la silueta'
  );

  surface.appendChild(
    overlay
  );

  state.surface=surface;
  state.overlay=overlay;

  state.overlayCtx=
    overlay.getContext(
      '2d'
    );

  if(
    state.width&&
    state.height
  ){
    overlay.width=
      state.width;

    overlay.height=
      state.height;
  }

  overlay.addEventListener(
    'pointerdown',
    onPointerDown
  );

  overlay.addEventListener(
    'pointermove',
    onPointerMove
  );

  overlay.addEventListener(
    'pointerup',
    onPointerEnd
  );

  overlay.addEventListener(
    'pointercancel',
    onPointerEnd
  );

  renderOverlay();
}

function serialize(){
  if(
    !state.layer||
    !state.hasPaint||
    !state.width||
    !state.height
  ){
    return null;
  }

  try{
    return{
      version:2,
      width:state.width,
      height:state.height,
      png:
        state.layer.toDataURL(
          'image/png'
        )
    };
  }catch(_){
    return null;
  }
}

async function restore(
  payload,
  width,
  height
){
  ensureSize(
    width,
    height
  );

  if(!payload?.png){
    clear();
    return;
  }

  await new Promise(
    (resolve,reject)=>{
      const image=
        new Image();

      image.onload=()=>{
        state.ctx.clearRect(
          0,
          0,
          state.width,
          state.height
        );

        state.ctx.drawImage(
          image,
          0,
          0,
          state.width,
          state.height
        );

        state.undoUrl=null;
        state.hasPaint=true;

        renderOverlay();
        refreshUI();

        resolve();
      };

      image.onerror=()=>reject(
        new Error(
          'No se pudo restaurar el pincel guardado.'
        )
      );

      image.src=payload.png;
    }
  );
}

function maskedBrushCanvas(){
  if(
    !state.layer||
    !state.maskCanvas||
    !state.width||
    !state.height
  ){
    return null;
  }

  const temp=
    document.createElement(
      'canvas'
    );

  temp.width=
    state.width;

  temp.height=
    state.height;

  const ctx=
    temp.getContext(
      '2d'
    );

  ctx.drawImage(
    state.layer,
    0,
    0
  );

  ctx.globalCompositeOperation=
    'destination-in';

  ctx.drawImage(
    state.maskCanvas,
    0,
    0
  );

  ctx.globalCompositeOperation=
    'source-over';

  return temp;
}

function applyToCanvas(
  canvas,
  mask,
  width,
  height
){
  if(
    !canvas||
    !mask
  ){
    return canvas;
  }

  setMask(
    mask,
    width,
    height
  );

  /*
    Mientras arrastras, el pincel vive solo en el overlay.
    Al terminar el trazo vuelve a incorporarse a composeResult.
  */
  if(
    state.layer&&
    state.hasPaint&&
    !state.drawing
  ){
    const brush=
      maskedBrushCanvas();

    if(brush){
      const ctx=
        canvas.getContext(
          '2d'
        );

      ctx.drawImage(
        brush,
        0,
        0,
        width,
        height
      );
    }
  }

  renderOverlay();

  return canvas;
}

function observeNavigation(){
  const nodes=[
    document.getElementById(
      'editingTab'
    ),
    document.getElementById(
      'colorMode'
    )
  ].filter(Boolean);

  if(nodes.length){
    const observer=
      new MutationObserver(
        ()=>{
          renderOverlay();
          refreshUI();
        }
      );

    nodes.forEach(
      node=>
        observer.observe(
          node,
          {
            attributes:true,
            attributeFilter:[
              'class'
            ]
          }
        )
    );
  }

  document.addEventListener(
    'click',
    (event)=>{
      if(
        event.target.closest(
          '.control-tab,.seg'
        )
      ){
        setTimeout(
          ()=>{
            renderOverlay();
            refreshUI();
          },
          0
        );
      }
    }
  );
}

function boot(){
  buildUI();
  buildOverlay();
  observeNavigation();

  const reset=
    document.getElementById(
      'resetBtn'
    );

  reset?.addEventListener(
    'click',
    ()=>{
      setTimeout(
        clear,
        0
      );
    }
  );

  const hexInput=
    document.getElementById(
      'hexInput'
    );

  const hexApply=
    document.getElementById(
      'hexApply'
    );

  const sync=()=>{
    if(state.ui.color){
      state.ui.color.value=
        currentStudioColor();
    }
  };

  hexApply?.addEventListener(
    'click',
    sync
  );

  hexInput?.addEventListener(
    'change',
    sync
  );

  refreshUI();
}

window.SilhouetteBrushFill={
  __v14:true,
  applyToCanvas,
  serialize,
  restore,
  clear,
  enable(){
    state.enabled=true;
    renderOverlay();
    refreshUI();
  },
  disable(){
    state.enabled=false;
    renderOverlay();
    refreshUI();
  }
};

if(
  document.readyState===
  'loading'
){
  document.addEventListener(
    'DOMContentLoaded',
    boot,
    {once:true}
  );
}else{
  boot();
}
})();
