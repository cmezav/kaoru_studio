(function(){
'use strict';

const BRIDGE=()=>window.ImageStudioLensBridge||null;
const MAX_EXPORT_PIXELS=50000000;
const EDGE_MAX_SIDE=560;
const MAX_LASSO_POINTS=1800;

let active=false;
let drawing=false;
let mode='lasso';
let stabilizer=55;
let magnet=true;
let magnetStrength=70;
let guideWidth=6;

let points=[];
let rectStart=null;
let rectCurrent=null;
let bbox=null;
let overlay=null;
let resizeObserver=null;
let pointerId=null;

let edgeMap=null;
let edgeW=0;
let edgeH=0;
let edgeScaleX=1;
let edgeScaleY=1;
let edgeBuildToken=0;

let lastCanvasW=0;
let lastCanvasH=0;
let lastSnap=null;

let pendingPoint=null;
let moveFrame=0;

const $=s=>document.querySelector(s);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function toast(text){
  const bridge=BRIDGE();
  if(bridge?.toast) bridge.toast(text);
  const status=$('#statusText');
  if(status) status.textContent=text;
}

function injectStyles(){
  if($('#kaoruSelectionToolStyles')) return;

  const style=document.createElement('style');
  style.id='kaoruSelectionToolStyles';
  style.textContent=`
    #kaoruSelectionTools .selection-mode-grid{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:7px;
      margin:8px 0
    }
    #kaoruSelectionTools .selection-mode-grid button.active,
    #selectionActivateBtn.active{
      border-color:var(--accent);
      background:color-mix(in srgb,var(--accent) 14%,var(--panel));
      color:var(--accent);
      box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 28%,transparent)
    }
    #kaoruSelectionTools .selection-actions{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:7px;
      margin-top:9px
    }
    #kaoruSelectionTools .selection-actions .full-row{grid-column:1/-1}
    #kaoruSelectionTools .selection-range{
      grid-template-columns:92px minmax(0,1fr) 46px
    }
    #kaoruSelectionTools .selection-info{
      margin:9px 0 0;
      padding:8px 9px;
      border:1px solid var(--line);
      border-radius:9px;
      background:var(--panel);
      font-size:9px;
      line-height:1.45;
      color:var(--muted)
    }
    #kaoruSelectionTools .selection-kbd{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-width:20px;
      height:19px;
      padding:0 5px;
      border:1px solid var(--line);
      border-radius:5px;
      background:var(--surface2);
      font-size:8px;
      font-weight:900;
      color:var(--text)
    }
    #kaoruSelectionTools .magnet-note{
      margin-top:7px;
      font-size:9px;
      line-height:1.4;
      color:var(--muted)
    }
    #selectionOverlay{
      position:absolute;
      inset:0;
      z-index:30;
      width:100%;
      height:100%;
      pointer-events:none;
      touch-action:none
    }
    #selectionOverlay.active{
      pointer-events:auto;
      cursor:crosshair
    }
    #canvasWrap.selection-active #previewCanvas{
      cursor:crosshair!important
    }
  `;
  document.head.appendChild(style);
}

function buildUi(){
  if($('#kaoruSelectionTools')) return true;

  const controls=$('#editorControls');
  if(!controls) return false;

  const exportDetails=controls.querySelector('details[data-section="export"]');
  const details=document.createElement('details');

  details.id='kaoruSelectionTools';
  details.open=true;
  details.dataset.section='selection';

  details.innerHTML=`
    <summary>Selección inteligente <span class="pill">PRO</span></summary>
    <div class="details-body">
      <div class="selection-mode-grid">
        <button class="secondary active" id="selectionLassoMode" type="button">Lazo</button>
        <button class="secondary" id="selectionRectMode" type="button">Rectángulo</button>
      </div>

      <label class="range-row selection-range">
        <span>Estabilizador</span>
        <input id="selectionStabilizer" type="range" min="0" max="100" step="1" value="55">
        <output id="selectionStabilizerOut">55%</output>
      </label>

      <label class="switch-row">
        <span>Imán vectorial</span>
        <input id="selectionMagnet" type="checkbox" checked><i></i>
      </label>

      <label class="range-row selection-range" id="selectionMagnetStrengthRow">
        <span>Fuerza imán</span>
        <input id="selectionMagnetStrength" type="range" min="0" max="100" step="1" value="70">
        <output id="selectionMagnetStrengthOut">70%</output>
      </label>

      <label class="range-row selection-range">
        <span>Grosor guía</span>
        <input id="selectionGuideWidth" type="range" min="3" max="12" step="1" value="6">
        <output id="selectionGuideWidthOut">6 px</output>
      </label>

      <p class="magnet-note">
        Imán optimizado: analiza una versión reducida de la preview y busca contornos cercanos,
        para pegarse a bordes sin frenar el cursor.
      </p>

      <div class="selection-actions">
        <button class="primary full-row" id="selectionActivateBtn" type="button">Activar selección · M</button>
        <button class="secondary" id="selectionCloseBtn" type="button">Cerrar selección</button>
        <button class="secondary" id="selectionClearBtn" type="button">Limpiar</button>
        <button class="primary full-row" id="selectionExportBtn" type="button" disabled>Descargar selección PNG</button>
      </div>

      <div class="selection-info" id="selectionInfo">
        Sin selección. Activa la herramienta y dibuja alrededor de la parte que quieras conservar.
      </div>

      <p class="helper">
        <span class="selection-kbd">M</span> activar/desactivar ·
        <span class="selection-kbd">Esc</span> cancelar ·
        el área exterior se oscurece para que veas claramente qué estás seleccionando.
      </p>
    </div>`;

  exportDetails
    ? controls.insertBefore(details,exportDetails)
    : controls.appendChild(details);

  return true;
}

function ensureOverlay(){
  const wrap=$('#canvasWrap');
  const canvas=$('#previewCanvas');

  if(!wrap||!canvas) return false;

  if(!overlay){
    overlay=document.createElement('canvas');
    overlay.id='selectionOverlay';
    wrap.appendChild(overlay);
    bindOverlayEvents();
  }

  syncOverlaySize();

  if(!resizeObserver&&window.ResizeObserver){
    resizeObserver=new ResizeObserver(syncOverlaySize);
    resizeObserver.observe(canvas);
  }

  return true;
}

function syncOverlaySize(){
  const canvas=$('#previewCanvas');
  if(!canvas||!overlay) return;

  const nw=canvas.width||1;
  const nh=canvas.height||1;

  if(
    nw===lastCanvasW&&
    nh===lastCanvasH&&
    overlay.width===nw&&
    overlay.height===nh
  ){
    return;
  }

  if(points.length&&lastCanvasW>0&&lastCanvasH>0){
    const sx=nw/lastCanvasW;
    const sy=nh/lastCanvasH;

    points=points.map(p=>({
      x:p.x*sx,
      y:p.y*sy
    }));
  }

  overlay.width=nw;
  overlay.height=nh;

  lastCanvasW=nw;
  lastCanvasH=nh;

  edgeMap=null;
  edgeW=0;
  edgeH=0;

  computeBbox();
  drawOverlay();
}

function canvasPoint(event){
  const rect=overlay.getBoundingClientRect();

  return {
    x:clamp(
      (event.clientX-rect.left)*
      overlay.width/
      Math.max(1,rect.width),
      0,
      overlay.width-1
    ),
    y:clamp(
      (event.clientY-rect.top)*
      overlay.height/
      Math.max(1,rect.height),
      0,
      overlay.height-1
    )
  };
}

function smoothPoint(raw){
  if(!points.length||stabilizer<=0) return raw;

  const prev=points[points.length-1];
  const s=stabilizer/100;

  // Más estable sin convertir 100 en una herramienta excesivamente lenta.
  const alpha=Math.max(.075,1-s*.88);

  return {
    x:prev.x+(raw.x-prev.x)*alpha,
    y:prev.y+(raw.y-prev.y)*alpha
  };
}

function luminance(data,i){
  return data[i]*.2126+
    data[i+1]*.7152+
    data[i+2]*.0722;
}

function buildEdgeMap(){
  const canvas=$('#previewCanvas');

  if(!canvas||!magnet) return;

  const token=++edgeBuildToken;

  setInfoMessage('Preparando imán rápido…');

  setTimeout(()=>{
    if(token!==edgeBuildToken||!magnet) return;

    try{
      const sourceW=canvas.width;
      const sourceH=canvas.height;

      const ratio=Math.min(
        1,
        EDGE_MAX_SIDE/
        Math.max(sourceW,sourceH)
      );

      const w=Math.max(
        1,
        Math.round(sourceW*ratio)
      );

      const h=Math.max(
        1,
        Math.round(sourceH*ratio)
      );

      const work=document.createElement('canvas');
      work.width=w;
      work.height=h;

      const wctx=work.getContext(
        '2d',
        {
          alpha:true,
          willReadFrequently:true
        }
      );

      if(!wctx) return;

      wctx.imageSmoothingEnabled=true;
      wctx.imageSmoothingQuality='high';

      wctx.drawImage(
        canvas,
        0,
        0,
        w,
        h
      );

      const data=
        wctx.getImageData(
          0,
          0,
          w,
          h
        ).data;

      const edge=
        new Uint8ClampedArray(
          w*h
        );

      for(let y=1;y<h-1;y++){
        const row=y*w;

        for(let x=1;x<w-1;x++){
          const index=(row+x)*4;
          const left=index-4;
          const right=index+4;
          const up=index-w*4;
          const down=index+w*4;

          const gx=
            Math.abs(
              luminance(data,right)-
              luminance(data,left)
            );

          const gy=
            Math.abs(
              luminance(data,down)-
              luminance(data,up)
            );

          const alphaX=
            Math.abs(
              data[right+3]-
              data[left+3]
            );

          const alphaY=
            Math.abs(
              data[down+3]-
              data[up+3]
            );

          edge[row+x]=
            Math.min(
              255,
              (gx+gy)*.78+
              (alphaX+alphaY)*1.05
            );
        }
      }

      if(token!==edgeBuildToken) return;

      edgeMap=edge;
      edgeW=w;
      edgeH=h;
      edgeScaleX=w/sourceW;
      edgeScaleY=h/sourceH;

      setInfoMessage(
        `Imán listo · mapa rápido ${w} × ${h}px. Dibuja cerca del borde.`
      );
    }catch(error){
      console.warn(
        'Selection fast edge map',
        error
      );

      edgeMap=null;
      edgeW=0;
      edgeH=0;

      setInfoMessage(
        'No pude analizar bordes; el lazo seguirá funcionando sin imán.'
      );
    }
  },0);
}

function snapToEdge(point){
  lastSnap=null;

  if(
    !magnet||
    !edgeMap||
    !edgeW||
    !edgeH
  ){
    return point;
  }

  const mx=
    point.x*edgeScaleX;

  const my=
    point.y*edgeScaleY;

  const strength=
    magnetStrength/100;

  // El radio real equivale aprox. a 4–22 px del canvas,
  // pero se busca sobre el mapa reducido.
  const sourceRadius=
    4+
    strength*18;

  const radius=
    Math.max(
      2,
      Math.round(
        sourceRadius*
        Math.max(
          edgeScaleX,
          edgeScaleY
        )
      )
    );

  const cx=Math.round(mx);
  const cy=Math.round(my);

  let bestX=cx;
  let bestY=cy;
  let bestEdge=0;
  let bestScore=-Infinity;

  for(let dy=-radius;dy<=radius;dy++){
    const y=cy+dy;

    if(y<1||y>=edgeH-1) continue;

    for(let dx=-radius;dx<=radius;dx++){
      const x=cx+dx;

      if(x<1||x>=edgeW-1) continue;

      const dist2=
        dx*dx+
        dy*dy;

      if(
        dist2>
        radius*radius
      ){
        continue;
      }

      const edgeValue=
        edgeMap[
          y*edgeW+x
        ];

      if(edgeValue<12) continue;

      const distance=
        Math.sqrt(dist2);

      const score=
        edgeValue*
        (
          .82+
          strength*2.5
        )-
        distance*
        (
          7.8-
          strength*5.7
        );

      if(score>bestScore){
        bestScore=score;
        bestEdge=edgeValue;
        bestX=x;
        bestY=y;
      }
    }
  }

  const threshold=
    34-
    strength*22;

  if(bestEdge<threshold){
    return point;
  }

  const snapped={
    x:bestX/
      edgeScaleX,
    y:bestY/
      edgeScaleY
  };

  lastSnap={
    raw:point,
    snapped,
    edge:bestEdge
  };

  return snapped;
}

function resetBbox(){
  bbox=null;
}

function extendBbox(point){
  if(!point) return;

  if(!bbox){
    bbox={
      x:point.x,
      y:point.y,
      width:1,
      height:1,
      minX:point.x,
      minY:point.y,
      maxX:point.x,
      maxY:point.y
    };

    return;
  }

  bbox.minX=
    Math.min(
      bbox.minX??bbox.x,
      point.x
    );

  bbox.minY=
    Math.min(
      bbox.minY??bbox.y,
      point.y
    );

  bbox.maxX=
    Math.max(
      bbox.maxX??
        bbox.x+
        bbox.width,
      point.x
    );

  bbox.maxY=
    Math.max(
      bbox.maxY??
        bbox.y+
        bbox.height,
      point.y
    );

  bbox.x=bbox.minX;
  bbox.y=bbox.minY;
  bbox.width=
    Math.max(
      1,
      bbox.maxX-
      bbox.minX
    );

  bbox.height=
    Math.max(
      1,
      bbox.maxY-
      bbox.minY
    );
}

function computeBbox(){
  resetBbox();

  for(const point of points){
    extendBbox(point);
  }

  updateInfo();
  return bbox;
}

function setRectBbox(
  x1,
  y1,
  x2,
  y2
){
  bbox={
    x:x1,
    y:y1,
    width:Math.max(1,x2-x1),
    height:Math.max(1,y2-y1),
    minX:x1,
    minY:y1,
    maxX:x2,
    maxY:y2
  };

  updateInfo();
}

function setInfoMessage(text){
  const el=$('#selectionInfo');
  if(el) el.textContent=text;
}

function updateInfo(){
  const info=$('#selectionInfo');
  const btn=$('#selectionExportBtn');

  if(!info) return;

  if(
    !bbox||
    points.length<3
  ){
    info.textContent=
      'Sin selección. Activa la herramienta y dibuja alrededor de la parte que quieras conservar.';

    if(btn) btn.disabled=true;
    return;
  }

  const bridge=BRIDGE();
  const state=
    bridge?.getState?.();

  const canvas=
    $('#previewCanvas');

  let w=
    Math.round(
      bbox.width
    );

  let h=
    Math.round(
      bbox.height
    );

  if(
    state?.crop&&
    canvas?.width&&
    canvas?.height
  ){
    w=Math.max(
      1,
      Math.round(
        bbox.width/
        canvas.width*
        state.crop.width
      )
    );

    h=Math.max(
      1,
      Math.round(
        bbox.height/
        canvas.height*
        state.crop.height
      )
    );
  }

  info.textContent=
    `Caja automática: ${
      w.toLocaleString('es-ES')
    } × ${
      h.toLocaleString('es-ES')
    } px · ${
      points.length
    } puntos · ${
      magnet
        ?'imán activo'
        :'imán apagado'
    }`;

  if(btn) btn.disabled=false;
}

function pathOn(
  ctx,
  pts,
  close=true
){
  if(!pts.length) return;

  ctx.beginPath();
  ctx.moveTo(
    pts[0].x,
    pts[0].y
  );

  for(
    let i=1;
    i<pts.length;
    i++
  ){
    ctx.lineTo(
      pts[i].x,
      pts[i].y
    );
  }

  if(
    close&&
    pts.length>2
  ){
    ctx.closePath();
  }
}

function dimOutsideSelection(ctx){
  if(
    drawing||
    points.length<3
  ){
    return;
  }

  ctx.save();

  ctx.beginPath();
  ctx.rect(
    0,
    0,
    overlay.width,
    overlay.height
  );

  ctx.moveTo(
    points[0].x,
    points[0].y
  );

  for(
    let i=1;
    i<points.length;
    i++
  ){
    ctx.lineTo(
      points[i].x,
      points[i].y
    );
  }

  ctx.closePath();

  ctx.fillStyle=
    'rgba(15,10,25,.28)';

  ctx.fill('evenodd');
  ctx.restore();
}

function drawSnapIndicator(ctx){
  if(!lastSnap) return;

  const {
    raw,
    snapped
  }=lastSnap;

  const distance=
    Math.hypot(
      raw.x-snapped.x,
      raw.y-snapped.y
    );

  ctx.save();
  ctx.setLineDash([]);

  if(distance>2){
    ctx.strokeStyle=
      'rgba(0,240,255,.65)';
    ctx.lineWidth=1.5;

    ctx.beginPath();
    ctx.moveTo(
      raw.x,
      raw.y
    );
    ctx.lineTo(
      snapped.x,
      snapped.y
    );
    ctx.stroke();
  }

  ctx.fillStyle='#00F0FF';
  ctx.strokeStyle='#06131B';
  ctx.lineWidth=2;

  ctx.beginPath();
  ctx.arc(
    snapped.x,
    snapped.y,
    Math.max(
      4,
      guideWidth*.72
    ),
    0,
    Math.PI*2
  );
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawOverlay(){
  if(!overlay) return;

  const ctx=
    overlay.getContext('2d');

  ctx.clearRect(
    0,
    0,
    overlay.width,
    overlay.height
  );

  if(!points.length) return;

  dimOutsideSelection(ctx);

  ctx.save();
  ctx.lineJoin='round';
  ctx.lineCap='round';

  if(
    !drawing&&
    points.length>2
  ){
    pathOn(
      ctx,
      points,
      true
    );

    ctx.fillStyle=
      'rgba(124,58,237,.10)';

    ctx.fill();
  }

  // Trazo oscuro exterior: mantiene visible la selección sobre fondos blancos.
  pathOn(
    ctx,
    points,
    !drawing
  );

  ctx.strokeStyle=
    'rgba(0,0,0,.78)';

  ctx.lineWidth=
    guideWidth+4;

  ctx.setLineDash([]);
  ctx.stroke();

  // Línea blanca gruesa.
  pathOn(
    ctx,
    points,
    !drawing
  );

  ctx.strokeStyle='#FFFFFF';

  ctx.lineWidth=
    guideWidth;

  ctx.setLineDash([
    10,
    7
  ]);

  ctx.stroke();

  // Línea violeta interna.
  pathOn(
    ctx,
    points,
    !drawing
  );

  ctx.strokeStyle='#8B5CF6';

  ctx.lineWidth=
    Math.max(
      2,
      guideWidth*.42
    );

  ctx.setLineDash([
    10,
    7
  ]);

  ctx.lineDashOffset=9;
  ctx.stroke();

  if(bbox){
    ctx.setLineDash([
      6,
      5
    ]);

    ctx.strokeStyle=
      'rgba(255,196,68,.98)';

    ctx.lineWidth=
      Math.max(
        2,
        guideWidth*.32
      );

    ctx.strokeRect(
      bbox.x,
      bbox.y,
      bbox.width,
      bbox.height
    );
  }

  ctx.restore();

  drawSnapIndicator(ctx);
}

function decimateIfNeeded(){
  if(
    points.length<=
    MAX_LASSO_POINTS
  ){
    return;
  }

  const compact=[points[0]];

  for(
    let i=2;
    i<points.length-1;
    i+=2
  ){
    compact.push(
      points[i]
    );
  }

  compact.push(
    points[
      points.length-1
    ]
  );

  points=compact;
  computeBbox();
}

function finalize(){
  if(
    mode==='rect'&&
    rectStart&&
    rectCurrent
  ){
    const x1=
      Math.min(
        rectStart.x,
        rectCurrent.x
      );

    const x2=
      Math.max(
        rectStart.x,
        rectCurrent.x
      );

    const y1=
      Math.min(
        rectStart.y,
        rectCurrent.y
      );

    const y2=
      Math.max(
        rectStart.y,
        rectCurrent.y
      );

    points=[
      {x:x1,y:y1},
      {x:x2,y:y1},
      {x:x2,y:y2},
      {x:x1,y:y2}
    ];
  }

  drawing=false;
  pointerId=null;
  rectStart=null;
  rectCurrent=null;
  pendingPoint=null;
  lastSnap=null;

  if(moveFrame){
    cancelAnimationFrame(
      moveFrame
    );

    moveFrame=0;
  }

  if(points.length<3){
    points=[];
    bbox=null;
  }

  computeBbox();
  drawOverlay();

  if(points.length>=3){
    toast(
      'Selección cerrada · caja automática lista.'
    );
  }
}

function clearSelection(){
  points=[];
  bbox=null;
  drawing=false;
  rectStart=null;
  rectCurrent=null;
  pendingPoint=null;
  lastSnap=null;

  if(moveFrame){
    cancelAnimationFrame(
      moveFrame
    );

    moveFrame=0;
  }

  drawOverlay();
  updateInfo();
}

function setActive(value){
  active=!!value;
  ensureOverlay();

  const wrap=
    $('#canvasWrap');

  const btn=
    $('#selectionActivateBtn');

  overlay?.classList.toggle(
    'active',
    active
  );

  wrap?.classList.toggle(
    'selection-active',
    active
  );

  btn?.classList.toggle(
    'active',
    active
  );

  if(btn){
    btn.textContent=
      active
        ?'Desactivar selección · M'
        :'Activar selección · M';
  }

  if(active){
    syncOverlaySize();

    if(magnet){
      edgeMap=null;
      buildEdgeMap();
    }

    toast(
      'Selección activa · dibuja sobre la imagen.'
    );
  }else{
    edgeBuildToken++;

    toast(
      'Selección desactivada.'
    );
  }
}

function appendLassoPoint(raw){
  let point=
    smoothPoint(raw);

  point=
    snapToEdge(point);

  const previous=
    points[
      points.length-1
    ];

  // Menos puntos, misma precisión visual.
  const minStep=
    1.8+
    stabilizer*.045;

  if(
    previous&&
    Math.hypot(
      point.x-previous.x,
      point.y-previous.y
    )<
    minStep
  ){
    return;
  }

  points.push(point);
  extendBbox(point);
  decimateIfNeeded();
  updateInfo();
}

function processPendingMove(){
  moveFrame=0;

  if(
    !drawing||
    !pendingPoint
  ){
    return;
  }

  const raw=pendingPoint;
  pendingPoint=null;

  if(mode==='rect'){
    rectCurrent=raw;

    const x1=
      Math.min(
        rectStart.x,
        raw.x
      );

    const x2=
      Math.max(
        rectStart.x,
        raw.x
      );

    const y1=
      Math.min(
        rectStart.y,
        raw.y
      );

    const y2=
      Math.max(
        rectStart.y,
        raw.y
      );

    points=[
      {x:x1,y:y1},
      {x:x2,y:y1},
      {x:x2,y:y2},
      {x:x1,y:y2}
    ];

    setRectBbox(
      x1,
      y1,
      x2,
      y2
    );
  }else{
    appendLassoPoint(raw);
  }

  drawOverlay();
}

function queueMove(raw){
  pendingPoint=raw;

  if(moveFrame) return;

  moveFrame=
    requestAnimationFrame(
      processPendingMove
    );
}

function bindOverlayEvents(){
  overlay.addEventListener(
    'pointerdown',
    event=>{
      if(!active) return;

      event.preventDefault();
      event.stopPropagation();

      pointerId=
        event.pointerId;

      overlay.setPointerCapture?.(
        event.pointerId
      );

      drawing=true;
      lastSnap=null;

      const raw=
        canvasPoint(event);

      if(mode==='rect'){
        rectStart=raw;
        rectCurrent=raw;

        points=[
          raw,
          raw,
          raw,
          raw
        ];

        setRectBbox(
          raw.x,
          raw.y,
          raw.x+1,
          raw.y+1
        );
      }else{
        points=[];
        resetBbox();

        const first=
          snapToEdge(raw);

        points.push(first);
        extendBbox(first);
      }

      updateInfo();
      drawOverlay();
    }
  );

  overlay.addEventListener(
    'pointermove',
    event=>{
      if(
        !active||
        !drawing||
        event.pointerId!==
          pointerId
      ){
        return;
      }

      event.preventDefault();

      queueMove(
        canvasPoint(event)
      );
    }
  );

  const end=event=>{
    if(
      !drawing||
      event.pointerId!==
        pointerId
    ){
      return;
    }

    event.preventDefault();

    if(pendingPoint){
      processPendingMove();
    }

    finalize();
  };

  overlay.addEventListener(
    'pointerup',
    end
  );

  overlay.addEventListener(
    'pointercancel',
    end
  );
}

const cloneState=value=>
  JSON.parse(
    JSON.stringify(value)
  );

async function exportSelection(){
  const bridge=BRIDGE();

  if(
    !bridge?.getSource||
    !bridge?.getState
  ){
    toast(
      'Recarga Image Studio para habilitar exportación de selección.'
    );

    return;
  }

  const source=
    bridge.getSource();

  const state=
    cloneState(
      bridge.getState()
    );

  const preview=
    $('#previewCanvas');

  if(
    !source||
    !bbox||
    points.length<3||
    !preview?.width||
    !preview?.height
  ){
    toast(
      'Crea una selección antes de exportar.'
    );

    return;
  }

  const btn=
    $('#selectionExportBtn');

  if(btn) btn.disabled=true;

  try{
    const cropW=
      Math.max(
        1,
        Number(
          state.crop?.width
        )||
        preview.width
      );

    const cropH=
      Math.max(
        1,
        Number(
          state.crop?.height
        )||
        preview.height
      );

    let renderW=
      Math.round(cropW);

    let renderH=
      Math.round(cropH);

    const total=
      renderW*
      renderH;

    if(
      total>
      MAX_EXPORT_PIXELS
    ){
      const scale=
        Math.sqrt(
          MAX_EXPORT_PIXELS/
          total
        );

      renderW=
        Math.max(
          1,
          Math.floor(
            renderW*scale
          )
        );

      renderH=
        Math.max(
          1,
          Math.floor(
            renderH*scale
          )
        );
    }

    toast(
      'Renderizando selección desde la fuente original…'
    );

    const rendered=
      await ImageExportPipeline.render(
        source,
        state,
        {
          width:renderW,
          height:renderH,
          background:null
        },
        text=>{
          const status=
            $('#statusText');

          if(status){
            status.textContent=text;
          }
        }
      );

    const sx=
      renderW/
      preview.width;

    const sy=
      renderH/
      preview.height;

    const scaled=
      points.map(
        point=>({
          x:point.x*sx,
          y:point.y*sy
        })
      );

    let minX=
      Math.floor(
        Math.min(
          ...scaled.map(
            point=>point.x
          )
        )
      );

    let minY=
      Math.floor(
        Math.min(
          ...scaled.map(
            point=>point.y
          )
        )
      );

    let maxX=
      Math.ceil(
        Math.max(
          ...scaled.map(
            point=>point.x
          )
        )
      );

    let maxY=
      Math.ceil(
        Math.max(
          ...scaled.map(
            point=>point.y
          )
        )
      );

    const pad=2;

    minX=
      clamp(
        minX-pad,
        0,
        renderW-1
      );

    minY=
      clamp(
        minY-pad,
        0,
        renderH-1
      );

    maxX=
      clamp(
        maxX+pad,
        minX+1,
        renderW
      );

    maxY=
      clamp(
        maxY+pad,
        minY+1,
        renderH
      );

    const out=
      document.createElement(
        'canvas'
      );

    out.width=
      Math.max(
        1,
        maxX-minX
      );

    out.height=
      Math.max(
        1,
        maxY-minY
      );

    const ctx=
      out.getContext(
        '2d',
        {
          alpha:true
        }
      );

    ctx.clearRect(
      0,
      0,
      out.width,
      out.height
    );

    ctx.save();

    ctx.beginPath();

    ctx.moveTo(
      scaled[0].x-minX,
      scaled[0].y-minY
    );

    for(
      let i=1;
      i<scaled.length;
      i++
    ){
      ctx.lineTo(
        scaled[i].x-minX,
        scaled[i].y-minY
      );
    }

    ctx.closePath();
    ctx.clip();

    ctx.drawImage(
      rendered,
      -minX,
      -minY
    );

    ctx.restore();

    const blob=
      await new Promise(
        (resolve,reject)=>
          out.toBlob(
            value=>
              value
                ?resolve(value)
                :reject(
                  new Error(
                    'No se pudo crear PNG.'
                  )
                ),
            'image/png'
          )
      );

    const url=
      URL.createObjectURL(blob);

    const link=
      document.createElement('a');

    const base=
      String(
        bridge.getSourceName?.()||
        'imagen'
      )
        .replace(
          /\.[^.]+$/,
          ''
        )
        .replace(
          /[^a-z0-9_-]+/gi,
          '-'
        )
        .replace(
          /^-+|-+$/g,
          ''
        )||
      'imagen';

    link.href=url;
    link.download=
      `IMG-${base}-SELECCION.png`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(
      ()=>URL.revokeObjectURL(url),
      1500
    );

    toast(
      `Selección exportada · ${
        out.width
      } × ${
        out.height
      }px`
    );
  }catch(error){
    console.error(error);

    toast(
      'No se pudo exportar la selección.'
    );
  }finally{
    if(btn){
      btn.disabled=!bbox;
    }
  }
}

function bindUi(){
  const root=
    $('#kaoruSelectionTools');

  if(
    !root||
    root.dataset.bound==='1'
  ){
    return;
  }

  root.dataset.bound='1';

  $('#selectionLassoMode').onclick=
    ()=>{
      mode='lasso';

      $('#selectionLassoMode')
        .classList.add('active');

      $('#selectionRectMode')
        .classList.remove('active');

      clearSelection();
    };

  $('#selectionRectMode').onclick=
    ()=>{
      mode='rect';

      $('#selectionRectMode')
        .classList.add('active');

      $('#selectionLassoMode')
        .classList.remove('active');

      clearSelection();
    };

  $('#selectionStabilizer').oninput=
    event=>{
      stabilizer=
        Number(
          event.target.value
        )||0;

      $('#selectionStabilizerOut')
        .textContent=
          `${stabilizer}%`;
    };

  $('#selectionMagnet').onchange=
    event=>{
      magnet=
        event.target.checked;

      $('#selectionMagnetStrength')
        .disabled=
          !magnet;

      $('#selectionMagnetStrengthRow')
        .style.opacity=
          magnet
            ?'1'
            :'.45';

      edgeBuildToken++;
      edgeMap=null;

      if(
        magnet&&
        active
      ){
        buildEdgeMap();
      }

      updateInfo();
    };

  $('#selectionMagnetStrength').oninput=
    event=>{
      magnetStrength=
        Number(
          event.target.value
        )||0;

      $('#selectionMagnetStrengthOut')
        .textContent=
          `${magnetStrength}%`;
    };

  $('#selectionGuideWidth').oninput=
    event=>{
      guideWidth=
        Number(
          event.target.value
        )||6;

      $('#selectionGuideWidthOut')
        .textContent=
          `${guideWidth} px`;

      drawOverlay();
    };

  $('#selectionActivateBtn').onclick=
    ()=>setActive(!active);

  $('#selectionCloseBtn').onclick=
    finalize;

  $('#selectionClearBtn').onclick=
    ()=>{
      clearSelection();

      toast(
        'Selección limpiada.'
      );
    };

  $('#selectionExportBtn').onclick=
    exportSelection;

  document.addEventListener(
    'keydown',
    event=>{
      const editable=
        event.target
          instanceof
          HTMLInputElement||
        event.target
          instanceof
          HTMLTextAreaElement||
        event.target
          instanceof
          HTMLSelectElement||
        event.target
          ?.isContentEditable;

      if(
        editable||
        event.ctrlKey||
        event.metaKey||
        event.altKey
      ){
        return;
      }

      if(
        event.key.toLowerCase()===
        'm'
      ){
        event.preventDefault();
        setActive(!active);
      }else if(
        event.key==='Escape'&&
        active
      ){
        event.preventDefault();

        if(drawing){
          drawing=false;
          pointerId=null;
          pendingPoint=null;

          drawOverlay();

          toast(
            'Trazo cancelado.'
          );
        }else{
          setActive(false);
        }
      }else if(
        event.key==='Enter'&&
        active&&
        points.length>=3
      ){
        event.preventDefault();
        finalize();
      }
    }
  );

  ensureOverlay();
  updateInfo();
}

function boot(){
  injectStyles();

  const run=()=>{
    if(!buildUi()) return false;

    ensureOverlay();
    bindUi();

    return true;
  };

  if(run()) return;

  const observer=
    new MutationObserver(
      ()=>{
        if(run()){
          observer.disconnect();
        }
      }
    );

  observer.observe(
    document.documentElement,
    {
      childList:true,
      subtree:true
    }
  );
}

document.readyState==='loading'
  ?document.addEventListener(
      'DOMContentLoaded',
      boot,
      {
        once:true
      }
    )
  :boot();

}());
