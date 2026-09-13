(function(){
'use strict';

const BRIDGE=()=>window.ImageStudioLensBridge||null;
const MAX_EXPORT_PIXELS=50000000;
let active=false,drawing=false,mode='lasso',stabilizer=55,magnet=true,magnetStrength=70;
let points=[],rectStart=null,rectCurrent=null,bbox=null,edgeMap=null,edgeW=0,edgeH=0;
let overlay=null,lastCanvasW=0,lastCanvasH=0,pointerId=null,resizeObserver=null;
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
    #kaoruSelectionTools .selection-mode-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:8px 0}
    #kaoruSelectionTools .selection-mode-grid button.active{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--panel));color:var(--accent)}
    #kaoruSelectionTools .selection-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}
    #kaoruSelectionTools .selection-actions .full-row{grid-column:1/-1}
    #kaoruSelectionTools .selection-range{grid-template-columns:92px minmax(0,1fr) 46px}
    #kaoruSelectionTools .selection-info{margin:9px 0 0;padding:8px 9px;border:1px solid var(--line);border-radius:9px;background:var(--panel);font-size:9px;line-height:1.45;color:var(--muted)}
    #kaoruSelectionTools .selection-kbd{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:19px;padding:0 5px;border:1px solid var(--line);border-radius:5px;background:var(--surface2);font-size:8px;font-weight:900;color:var(--text)}
    #selectionOverlay{position:absolute;inset:0;z-index:30;width:100%;height:100%;pointer-events:none;touch-action:none}
    #selectionOverlay.active{pointer-events:auto;cursor:crosshair}
    #canvasWrap.selection-active #previewCanvas{cursor:crosshair!important}
    #kaoruSelectionTools .magnet-note{margin-top:7px;font-size:9px;line-height:1.4;color:var(--muted)}
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

      <p class="magnet-note">En imágenes raster, el imán detecta contornos de píxeles y aproxima el trazo a esos bordes. El estabilizador 0–100 suaviza la selección.</p>

      <div class="selection-actions">
        <button class="primary full-row" id="selectionActivateBtn" type="button">Activar selección · M</button>
        <button class="secondary" id="selectionCloseBtn" type="button">Cerrar selección</button>
        <button class="secondary" id="selectionClearBtn" type="button">Limpiar</button>
        <button class="primary full-row" id="selectionExportBtn" type="button" disabled>Descargar selección PNG</button>
      </div>

      <div class="selection-info" id="selectionInfo">Sin selección. Activa la herramienta y dibuja alrededor de la parte que quieras conservar.</div>
      <p class="helper"><span class="selection-kbd">M</span> activar/desactivar · <span class="selection-kbd">Esc</span> cancelar · la caja rectangular se calcula automáticamente alrededor de la selección.</p>
    </div>`;
  exportDetails ? controls.insertBefore(details,exportDetails) : controls.appendChild(details);
  return true;
}

function ensureOverlay(){
  const wrap=$('#canvasWrap'),canvas=$('#previewCanvas');
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
  const nw=canvas.width||1,nh=canvas.height||1;
  if(nw===lastCanvasW&&nh===lastCanvasH&&overlay.width===nw&&overlay.height===nh) return;
  if(points.length&&lastCanvasW>0&&lastCanvasH>0){
    const sx=nw/lastCanvasW,sy=nh/lastCanvasH;
    points=points.map(p=>({x:p.x*sx,y:p.y*sy}));
  }
  overlay.width=nw;overlay.height=nh;lastCanvasW=nw;lastCanvasH=nh;
  edgeMap=null;edgeW=edgeH=0;computeBbox();drawOverlay();
}

function canvasPoint(event){
  const rect=overlay.getBoundingClientRect();
  return {
    x:clamp((event.clientX-rect.left)*overlay.width/Math.max(1,rect.width),0,overlay.width-1),
    y:clamp((event.clientY-rect.top)*overlay.height/Math.max(1,rect.height),0,overlay.height-1)
  };
}

function smoothPoint(raw){
  if(!points.length||stabilizer<=0) return raw;
  const prev=points[points.length-1],s=stabilizer/100,alpha=1-s*.92;
  return {x:prev.x+(raw.x-prev.x)*alpha,y:prev.y+(raw.y-prev.y)*alpha};
}

function luminance(data,i){return data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722}

function buildEdgeMap(){
  const canvas=$('#previewCanvas');
  if(!canvas||!magnet) return;
  try{
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx) return;
    const w=canvas.width,h=canvas.height,data=ctx.getImageData(0,0,w,h).data,edge=new Uint8ClampedArray(w*h);
    for(let y=1;y<h-1;y++){
      for(let x=1;x<w-1;x++){
        const i=(y*w+x)*4,il=i-4,ir=i+4,iu=i-w*4,id=i+w*4;
        const gx=Math.abs(luminance(data,ir)-luminance(data,il));
        const gy=Math.abs(luminance(data,id)-luminance(data,iu));
        const ax=Math.abs(data[ir+3]-data[il+3]),ay=Math.abs(data[id+3]-data[iu+3]);
        edge[y*w+x]=Math.min(255,(gx+gy)*.72+(ax+ay)*.9);
      }
    }
    edgeMap=edge;edgeW=w;edgeH=h;
    setInfoMessage('Bordes analizados. Dibuja cerca del contorno y el imán se pegará automáticamente.');
  }catch(error){
    console.warn('Selection edge map',error);
    edgeMap=null;edgeW=edgeH=0;
    setInfoMessage('No pude analizar bordes; la selección seguirá funcionando sin imán.');
  }
}

function snapToEdge(point){
  if(!magnet||!edgeMap||edgeW!==overlay.width||edgeH!==overlay.height) return point;
  const strength=magnetStrength/100,radius=Math.max(2,Math.round(3+strength*17));
  const cx=Math.round(point.x),cy=Math.round(point.y),step=radius>13?2:1;
  let best=null,bestScore=-Infinity;
  for(let dy=-radius;dy<=radius;dy+=step){
    const y=cy+dy;if(y<1||y>=edgeH-1) continue;
    for(let dx=-radius;dx<=radius;dx+=step){
      const x=cx+dx;if(x<1||x>=edgeW-1) continue;
      const dist=Math.hypot(dx,dy);if(dist>radius) continue;
      const e=edgeMap[y*edgeW+x],score=e*(.8+strength*2.25)-dist*(9-strength*7.5);
      if(score>bestScore){bestScore=score;best={x,y,e}}
    }
  }
  return best&&best.e>18?{x:best.x,y:best.y}:point;
}

function computeBbox(){
  if(!points.length){bbox=null;updateInfo();return null}
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const p of points){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y)}
  bbox={x:minX,y:minY,width:Math.max(1,maxX-minX),height:Math.max(1,maxY-minY)};
  updateInfo();return bbox;
}

function setInfoMessage(text){const el=$('#selectionInfo');if(el)el.textContent=text}
function updateInfo(){
  const info=$('#selectionInfo'),btn=$('#selectionExportBtn');
  if(!info) return;
  if(!bbox||points.length<3){info.textContent='Sin selección. Activa la herramienta y dibuja alrededor de la parte que quieras conservar.';if(btn)btn.disabled=true;return}
  const bridge=BRIDGE(),state=bridge?.getState?.(),canvas=$('#previewCanvas');
  let w=Math.round(bbox.width),h=Math.round(bbox.height);
  if(state?.crop&&canvas?.width&&canvas?.height){
    w=Math.max(1,Math.round(bbox.width/canvas.width*state.crop.width));
    h=Math.max(1,Math.round(bbox.height/canvas.height*state.crop.height));
  }
  info.textContent=`Caja automática: ${w.toLocaleString('es-ES')} × ${h.toLocaleString('es-ES')} px · ${points.length} puntos · ${magnet?'imán activo':'imán apagado'}`;
  if(btn)btn.disabled=false;
}

function pathOn(ctx,pts,close=true){
  if(!pts.length)return;
  ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
  for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);
  if(close&&pts.length>2)ctx.closePath();
}

function drawOverlay(){
  if(!overlay)return;
  const ctx=overlay.getContext('2d');ctx.clearRect(0,0,overlay.width,overlay.height);
  if(!points.length)return;
  ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
  if(!drawing&&points.length>2){pathOn(ctx,points,true);ctx.fillStyle='rgba(124,58,237,.10)';ctx.fill()}
  pathOn(ctx,points,!drawing);ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.setLineDash([7,5]);ctx.stroke();
  pathOn(ctx,points,!drawing);ctx.strokeStyle='#7c3aed';ctx.lineWidth=1.5;ctx.setLineDash([7,5]);ctx.lineDashOffset=6;ctx.stroke();
  if(bbox){ctx.setLineDash([4,4]);ctx.strokeStyle='rgba(255,196,68,.95)';ctx.lineWidth=1.5;ctx.strokeRect(bbox.x,bbox.y,bbox.width,bbox.height)}
  if(points.length<80){ctx.setLineDash([]);ctx.fillStyle='#fff';for(const p of points){ctx.beginPath();ctx.arc(p.x,p.y,2.2,0,Math.PI*2);ctx.fill()}}
  ctx.restore();
}

function finalize(){
  if(mode==='rect'&&rectStart&&rectCurrent){
    const x1=Math.min(rectStart.x,rectCurrent.x),x2=Math.max(rectStart.x,rectCurrent.x),y1=Math.min(rectStart.y,rectCurrent.y),y2=Math.max(rectStart.y,rectCurrent.y);
    points=[{x:x1,y:y1},{x:x2,y:y1},{x:x2,y:y2},{x:x1,y:y2}];
  }
  drawing=false;pointerId=null;rectStart=null;rectCurrent=null;
  if(points.length<3){points=[];bbox=null}
  computeBbox();drawOverlay();
  if(points.length>=3)toast('Selección cerrada · caja automática lista.');
}

function clearSelection(){points=[];bbox=null;drawing=false;rectStart=rectCurrent=null;drawOverlay();updateInfo()}

function setActive(value){
  active=!!value;ensureOverlay();
  const wrap=$('#canvasWrap'),btn=$('#selectionActivateBtn');
  overlay?.classList.toggle('active',active);wrap?.classList.toggle('selection-active',active);btn?.classList.toggle('active',active);
  if(btn)btn.textContent=active?'Desactivar selección · M':'Activar selección · M';
  if(active){
    syncOverlaySize();
    if(magnet){setInfoMessage('Analizando bordes para el imán…');requestAnimationFrame(buildEdgeMap)}
    toast('Selección activa · dibuja sobre la imagen.');
  }else toast('Selección desactivada.');
}

function bindOverlayEvents(){
  overlay.addEventListener('pointerdown',e=>{
    if(!active)return;
    e.preventDefault();e.stopPropagation();pointerId=e.pointerId;overlay.setPointerCapture?.(e.pointerId);
    drawing=true;const raw=canvasPoint(e);
    if(mode==='rect'){rectStart=raw;rectCurrent=raw;points=[raw,raw,raw,raw]}
    else{points=[];points.push(snapToEdge(raw))}
    computeBbox();drawOverlay();
  });
  overlay.addEventListener('pointermove',e=>{
    if(!active||!drawing||e.pointerId!==pointerId)return;
    e.preventDefault();const raw=canvasPoint(e);
    if(mode==='rect'){
      rectCurrent=raw;const x1=Math.min(rectStart.x,raw.x),x2=Math.max(rectStart.x,raw.x),y1=Math.min(rectStart.y,raw.y),y2=Math.max(rectStart.y,raw.y);
      points=[{x:x1,y:y1},{x:x2,y:y1},{x:x2,y:y2},{x:x1,y:y2}];
    }else{
      let p=snapToEdge(smoothPoint(raw));const prev=points[points.length-1],minStep=1.2+stabilizer*.035;
      if(!prev||Math.hypot(p.x-prev.x,p.y-prev.y)>=minStep)points.push(p);
    }
    computeBbox();drawOverlay();
  });
  const end=e=>{if(!drawing||e.pointerId!==pointerId)return;e.preventDefault();finalize()};
  overlay.addEventListener('pointerup',end);overlay.addEventListener('pointercancel',end);
}

const cloneState=value=>JSON.parse(JSON.stringify(value));

async function exportSelection(){
  const bridge=BRIDGE();
  if(!bridge?.getSource||!bridge?.getState){toast('Recarga Image Studio para habilitar exportación de selección.');return}
  const source=bridge.getSource(),state=cloneState(bridge.getState()),preview=$('#previewCanvas');
  if(!source||!bbox||points.length<3||!preview?.width||!preview?.height){toast('Crea una selección antes de exportar.');return}
  const btn=$('#selectionExportBtn');if(btn)btn.disabled=true;
  try{
    const cropW=Math.max(1,Number(state.crop?.width)||preview.width),cropH=Math.max(1,Number(state.crop?.height)||preview.height);
    let renderW=Math.round(cropW),renderH=Math.round(cropH);
    const total=renderW*renderH;
    if(total>MAX_EXPORT_PIXELS){const scale=Math.sqrt(MAX_EXPORT_PIXELS/total);renderW=Math.max(1,Math.floor(renderW*scale));renderH=Math.max(1,Math.floor(renderH*scale))}
    toast('Renderizando selección desde la fuente original…');
    const rendered=await ImageExportPipeline.render(source,state,{width:renderW,height:renderH,background:null},text=>{const s=$('#statusText');if(s)s.textContent=text});
    const sx=renderW/preview.width,sy=renderH/preview.height,scaled=points.map(p=>({x:p.x*sx,y:p.y*sy}));
    let minX=Math.floor(Math.min(...scaled.map(p=>p.x))),minY=Math.floor(Math.min(...scaled.map(p=>p.y))),maxX=Math.ceil(Math.max(...scaled.map(p=>p.x))),maxY=Math.ceil(Math.max(...scaled.map(p=>p.y)));
    const pad=2;minX=clamp(minX-pad,0,renderW-1);minY=clamp(minY-pad,0,renderH-1);maxX=clamp(maxX+pad,minX+1,renderW);maxY=clamp(maxY+pad,minY+1,renderH);
    const out=document.createElement('canvas');out.width=Math.max(1,maxX-minX);out.height=Math.max(1,maxY-minY);
    const ctx=out.getContext('2d',{alpha:true});ctx.clearRect(0,0,out.width,out.height);ctx.save();
    ctx.beginPath();ctx.moveTo(scaled[0].x-minX,scaled[0].y-minY);
    for(let i=1;i<scaled.length;i++)ctx.lineTo(scaled[i].x-minX,scaled[i].y-minY);
    ctx.closePath();ctx.clip();ctx.drawImage(rendered,-minX,-minY);ctx.restore();
    const blob=await new Promise((resolve,reject)=>out.toBlob(b=>b?resolve(b):reject(new Error('No se pudo crear PNG.')),'image/png'));
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    const base=String(bridge.getSourceName?.()||'imagen').replace(/\.[^.]+$/,'').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'')||'imagen';
    a.href=url;a.download=`IMG-${base}-SELECCION.png`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
    toast(`Selección exportada · ${out.width} × ${out.height}px`);
  }catch(error){console.error(error);toast('No se pudo exportar la selección.')}
  finally{if(btn)btn.disabled=!bbox}
}

function bindUi(){
  const root=$('#kaoruSelectionTools');
  if(!root||root.dataset.bound==='1')return;
  root.dataset.bound='1';
  $('#selectionLassoMode').onclick=()=>{mode='lasso';$('#selectionLassoMode').classList.add('active');$('#selectionRectMode').classList.remove('active');clearSelection()};
  $('#selectionRectMode').onclick=()=>{mode='rect';$('#selectionRectMode').classList.add('active');$('#selectionLassoMode').classList.remove('active');clearSelection()};
  $('#selectionStabilizer').oninput=e=>{stabilizer=Number(e.target.value)||0;$('#selectionStabilizerOut').textContent=`${stabilizer}%`};
  $('#selectionMagnet').onchange=e=>{magnet=e.target.checked;$('#selectionMagnetStrength').disabled=!magnet;$('#selectionMagnetStrengthRow').style.opacity=magnet?'1':'.45';edgeMap=null;if(magnet&&active)buildEdgeMap();updateInfo()};
  $('#selectionMagnetStrength').oninput=e=>{magnetStrength=Number(e.target.value)||0;$('#selectionMagnetStrengthOut').textContent=`${magnetStrength}%`};
  $('#selectionActivateBtn').onclick=()=>setActive(!active);
  $('#selectionCloseBtn').onclick=finalize;
  $('#selectionClearBtn').onclick=()=>{clearSelection();toast('Selección limpiada.')};
  $('#selectionExportBtn').onclick=exportSelection;
  document.addEventListener('keydown',e=>{
    const editable=e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||e.target instanceof HTMLSelectElement||e.target?.isContentEditable;
    if(editable||e.ctrlKey||e.metaKey||e.altKey)return;
    if(e.key.toLowerCase()==='m'){e.preventDefault();setActive(!active)}
    else if(e.key==='Escape'&&active){e.preventDefault();if(drawing){drawing=false;pointerId=null;drawOverlay();toast('Trazo cancelado.')}else setActive(false)}
    else if(e.key==='Enter'&&active&&points.length>=3){e.preventDefault();finalize()}
  });
  ensureOverlay();updateInfo();
}

function boot(){
  injectStyles();
  const run=()=>{if(!buildUi())return false;ensureOverlay();bindUi();return true};
  if(run())return;
  const obs=new MutationObserver(()=>{if(run())obs.disconnect()});
  obs.observe(document.documentElement,{childList:true,subtree:true});
}

document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
}());
