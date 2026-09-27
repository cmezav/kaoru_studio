(function(){
'use strict';

const api=()=>window.SilhouetteShapeBridge||null;
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const SVG_NS='http://www.w3.org/2000/svg';

let overlay=null;
let overlayLayer=null;
let resultStage=null;
let resizeObserver=null;
let renderBusy=false;
let layerCounter=1;

function clone(value){return JSON.parse(JSON.stringify(value));}
function uid(){return `sil-shape-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;}
function current(){return api()?.getState?.()||null;}
function shapesOf(state=current()){
  if(!state)return[];
  if(!Array.isArray(state.shapeLayers))state.shapeLayers=[];
  return state.shapeLayers;
}
function selected(state=current()){
  if(!state)return null;
  return shapesOf(state).find(shape=>shape.id===state.activeShapeId)||null;
}

function gradientDefault(){
  return{
    angle:45,
    stops:[
      {offset:0,color:'#A855F7',opacity:1},
      {offset:100,color:'#22D3EE',opacity:1}
    ]
  };
}
function fillDefault(){
  return{
    mode:'solid',
    color:'#8B5CF6',
    opacity:1,
    gradient:gradientDefault()
  };
}
function strokeDefault(){
  return{
    enabled:false,
    color:'#FFFFFF',
    width:8,
    opacity:1
  };
}
function shapeDefault(kind,state){
  const names={
    rect:'Rectángulo',
    roundRect:'Rectángulo redondeado',
    circle:'Círculo',
    ellipse:'Elipse',
    triangle:'Triángulo',
    diamond:'Diamante',
    hexagon:'Hexágono',
    star:'Estrella',
    heart:'Corazón',
    arrow:'Flecha'
  };
  const cw=Math.max(1,Number(state?.w)||1080);
  const ch=Math.max(1,Number(state?.h)||1080);
  const w=Math.max(70,Math.round(cw*.25));
  const h=Math.max(70,Math.round(ch*.20));
  return{
    id:uid(),
    kind,
    name:`${names[kind]||'Forma'} ${layerCounter++}`,
    x:Math.round((cw-w)/2),
    y:Math.round((ch-h)/2),
    width:w,
    height:h,
    rotation:0,
    radius:Math.min(32,Math.round(Math.min(w,h)*.18)),
    visible:true,
    fill:fillDefault(),
    stroke:strokeDefault()
  };
}
function ensureShape(shape){
  shape=shape&&typeof shape==='object'?shape:{};
  shape.id=shape.id||uid();
  shape.kind=shape.kind||'rect';
  shape.name=shape.name||'Forma';
  shape.x=Number(shape.x)||0;
  shape.y=Number(shape.y)||0;
  shape.width=Math.max(12,Number(shape.width)||200);
  shape.height=Math.max(12,Number(shape.height)||140);
  shape.rotation=Number(shape.rotation)||0;
  shape.radius=Math.max(0,Number(shape.radius)||0);
  shape.visible=shape.visible!==false;

  const fill=shape.fill&&typeof shape.fill==='object'?shape.fill:{};
  shape.fill={
    mode:['solid','gradient'].includes(fill.mode)?fill.mode:'solid',
    color:fill.color||'#8B5CF6',
    opacity:clamp(fill.opacity??1,0,1),
    gradient:{
      angle:Number(fill.gradient?.angle??45),
      stops:Array.isArray(fill.gradient?.stops)&&fill.gradient.stops.length>=2
        ?fill.gradient.stops.map(stop=>({
            offset:clamp(stop.offset,0,100),
            color:stop.color||'#FFFFFF',
            opacity:clamp(stop.opacity??1,0,1)
          }))
        :gradientDefault().stops
    }
  };

  const stroke=shape.stroke&&typeof shape.stroke==='object'?shape.stroke:{};
  shape.stroke={
    enabled:stroke.enabled===true,
    color:stroke.color||'#FFFFFF',
    width:Math.max(0,Number(stroke.width)||0),
    opacity:clamp(stroke.opacity??1,0,1)
  };
  return shape;
}
function normalizeState(state=current()){
  if(!state)return null;
  state.shapeLayers=shapesOf(state).map(ensureShape);
  if(
    state.activeShapeId&&
    !state.shapeLayers.some(shape=>shape.id===state.activeShapeId)
  ){
    state.activeShapeId=null;
  }
  return state;
}

function mutate(fn,label='Forma actualizada',commit=true){
  const studio=api();
  const state=current();
  if(!studio||!state)return;

  if(commit){
    studio.commit(()=>{
      fn(state);
      normalizeState(state);
    });
  }else{
    fn(state);
    normalizeState(state);
  }

  studio.render?.();
  sync(state);
  if(label)studio.notify?.(label);
}
function mutateSelected(fn,label='Forma actualizada',commit=true){
  const state=current();
  const shape=selected(state);
  if(!shape)return;
  mutate(()=>fn(shape,state),label,commit);
}

function polygon(kind,w,h){
  if(kind==='triangle')return `${w/2},0 ${w},${h} 0,${h}`;
  if(kind==='diamond')return `${w/2},0 ${w},${h/2} ${w/2},${h} 0,${h/2}`;
  if(kind==='hexagon')return `${w*.25},0 ${w*.75},0 ${w},${h/2} ${w*.75},${h} ${w*.25},${h} 0,${h/2}`;
  if(kind==='arrow')return `${w*.06},${h*.34} ${w*.58},${h*.34} ${w*.58},0 ${w},${h/2} ${w*.58},${h} ${w*.58},${h*.66} ${w*.06},${h*.66}`;
  if(kind==='star'){
    const cx=w/2,cy=h/2,outer=Math.min(w,h)/2,inner=outer*.45,pts=[];
    for(let i=0;i<10;i++){
      const angle=(-90+i*36)*Math.PI/180;
      const radius=i%2===0?outer:inner;
      pts.push(`${cx+Math.cos(angle)*radius},${cy+Math.sin(angle)*radius}`);
    }
    return pts.join(' ');
  }
  return '';
}
function heartPath(w,h){
  return `M ${w/2} ${h} C ${w*.12} ${h*.76}, 0 ${h*.4}, ${w*.22} ${h*.22} C ${w*.36} ${h*.1}, ${w*.48} ${h*.16}, ${w/2} ${h*.3} C ${w*.52} ${h*.16}, ${w*.64} ${h*.1}, ${w*.78} ${h*.22} C ${w} ${h*.4}, ${w*.88} ${h*.76}, ${w/2} ${h} Z`;
}
function pathCanvas(ctx,shape){
  const w=shape.width,h=shape.height;
  ctx.beginPath();
  if(shape.kind==='rect'){
    ctx.rect(0,0,w,h);
  }else if(shape.kind==='roundRect'){
    const radius=clamp(shape.radius,0,Math.min(w,h)/2);
    if(ctx.roundRect){
      ctx.roundRect(0,0,w,h,radius);
    }else{
      ctx.moveTo(radius,0);
      ctx.lineTo(w-radius,0);ctx.quadraticCurveTo(w,0,w,radius);
      ctx.lineTo(w,h-radius);ctx.quadraticCurveTo(w,h,w-radius,h);
      ctx.lineTo(radius,h);ctx.quadraticCurveTo(0,h,0,h-radius);
      ctx.lineTo(0,radius);ctx.quadraticCurveTo(0,0,radius,0);
    }
  }else if(shape.kind==='circle'||shape.kind==='ellipse'){
    const rx=shape.kind==='circle'?Math.min(w,h)/2:w/2;
    const ry=shape.kind==='circle'?Math.min(w,h)/2:h/2;
    ctx.ellipse(w/2,h/2,rx,ry,0,0,Math.PI*2);
  }else if(shape.kind==='heart'){
    ctx.moveTo(w/2,h);
    ctx.bezierCurveTo(w*.12,h*.76,0,h*.4,w*.22,h*.22);
    ctx.bezierCurveTo(w*.36,h*.1,w*.48,h*.16,w/2,h*.3);
    ctx.bezierCurveTo(w*.52,h*.16,w*.64,h*.1,w*.78,h*.22);
    ctx.bezierCurveTo(w,h*.4,w*.88,h*.76,w/2,h);
  }else{
    const points=polygon(shape.kind,w,h).split(/\s+/).map(value=>value.split(',').map(Number));
    points.forEach((point,index)=>index?ctx.lineTo(point[0],point[1]):ctx.moveTo(point[0],point[1]));
  }
  ctx.closePath();
}
function rgba(hex,alpha){
  let value=String(hex||'#FFFFFF').replace('#','');
  if(value.length===3)value=value.split('').map(c=>c+c).join('');
  const number=parseInt(value,16)||0;
  return `rgba(${(number>>16)&255},${(number>>8)&255},${number&255},${clamp(alpha,0,1)})`;
}
function canvasGradient(ctx,shape){
  const spec=shape.fill.gradient||gradientDefault();
  const angle=(Number(spec.angle)||0)*Math.PI/180;
  const cx=shape.width/2,cy=shape.height/2;
  const length=Math.abs(shape.width*Math.cos(angle))+Math.abs(shape.height*Math.sin(angle));
  const dx=Math.cos(angle)*length/2,dy=Math.sin(angle)*length/2;
  const gradient=ctx.createLinearGradient(cx-dx,cy-dy,cx+dx,cy+dy);
  [...(spec.stops||[])].sort((a,b)=>a.offset-b.offset).forEach(stop=>{
    gradient.addColorStop(clamp(stop.offset,0,100)/100,rgba(stop.color,stop.opacity??1));
  });
  return gradient;
}
function drawShape(ctx,shape){
  if(shape.visible===false)return;
  ensureShape(shape);

  ctx.save();
  ctx.translate(shape.x+shape.width/2,shape.y+shape.height/2);
  ctx.rotate((shape.rotation||0)*Math.PI/180);
  ctx.translate(-shape.width/2,-shape.height/2);

  pathCanvas(ctx,shape);
  ctx.save();
  ctx.globalAlpha=clamp(shape.fill.opacity??1,0,1);
  ctx.fillStyle=shape.fill.mode==='gradient'?canvasGradient(ctx,shape):(shape.fill.color||'#8B5CF6');
  ctx.fill();
  ctx.restore();

  if(shape.stroke.enabled&&shape.stroke.width>0){
    pathCanvas(ctx,shape);
    ctx.save();
    ctx.globalAlpha=clamp(shape.stroke.opacity??1,0,1);
    ctx.strokeStyle=shape.stroke.color||'#FFFFFF';
    ctx.lineWidth=shape.stroke.width;
    ctx.lineJoin='round';
    ctx.lineCap='round';
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
function draw(ctx,state=current()){
  normalizeState(state);
  shapesOf(state).forEach(shape=>drawShape(ctx,shape));
}

function svgShapeElement(shape){
  const w=shape.width,h=shape.height;
  let node;
  if(shape.kind==='rect'||shape.kind==='roundRect'){
    node=document.createElementNS(SVG_NS,'rect');
    node.setAttribute('x','0');node.setAttribute('y','0');
    node.setAttribute('width',w);node.setAttribute('height',h);
    if(shape.kind==='roundRect'){
      const radius=clamp(shape.radius,0,Math.min(w,h)/2);
      node.setAttribute('rx',radius);node.setAttribute('ry',radius);
    }
  }else if(shape.kind==='circle'||shape.kind==='ellipse'){
    node=document.createElementNS(SVG_NS,'ellipse');
    node.setAttribute('cx',w/2);node.setAttribute('cy',h/2);
    const radius=Math.min(w,h)/2;
    node.setAttribute('rx',shape.kind==='circle'?radius:w/2);
    node.setAttribute('ry',shape.kind==='circle'?radius:h/2);
  }else if(shape.kind==='heart'){
    node=document.createElementNS(SVG_NS,'path');
    node.setAttribute('d',heartPath(w,h));
  }else{
    node=document.createElementNS(SVG_NS,'polygon');
    node.setAttribute('points',polygon(shape.kind,w,h));
  }
  return node;
}
function rotateVector(x,y,degrees){
  const angle=degrees*Math.PI/180;
  const c=Math.cos(angle),s=Math.sin(angle);
  return{x:x*c-y*s,y:x*s+y*c};
}
function worldFromLocal(shape,lx,ly){
  const cx=shape.width/2,cy=shape.height/2;
  const vector=rotateVector(lx-cx,ly-cy,shape.rotation||0);
  return{x:shape.x+cx+vector.x,y:shape.y+cy+vector.y};
}
function localDeltaFromWorld(dx,dy,rotation){return rotateVector(dx,dy,-(rotation||0));}
function resizeSpec(dir,w,h){
  return{
    nw:{opp:[w,h],sx:-1,sy:-1,x:true,y:true},
    n:{opp:[w/2,h],sx:0,sy:-1,x:false,y:true},
    ne:{opp:[0,h],sx:1,sy:-1,x:true,y:true},
    e:{opp:[0,h/2],sx:1,sy:0,x:true,y:false},
    se:{opp:[0,0],sx:1,sy:1,x:true,y:true},
    s:{opp:[w/2,0],sx:0,sy:1,x:false,y:true},
    sw:{opp:[w,0],sx:-1,sy:1,x:true,y:true},
    w:{opp:[w,h/2],sx:-1,sy:0,x:true,y:false}
  }[dir];
}
function localOppForNewSize(dir,w,h){
  return{
    nw:[w,h],n:[w/2,h],ne:[0,h],e:[0,h/2],
    se:[0,0],s:[w/2,0],sw:[w,0],w:[w,h/2]
  }[dir];
}
function newTopLeftForAnchor(anchor,dir,w,h,rotation){
  const opposite=localOppForNewSize(dir,w,h);
  const cx=w/2,cy=h/2;
  const vector=rotateVector(opposite[0]-cx,opposite[1]-cy,rotation||0);
  return{x:anchor.x-cx-vector.x,y:anchor.y-cy-vector.y};
}

function injectStyles(){
  if($('#silhouetteShapeFillStyles'))return;
  const style=document.createElement('style');
  style.id='silhouetteShapeFillStyles';
  style.textContent=`
    #shapeMode .sil-shape-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:8px}
    #shapeMode .sil-shape-grid button{min-height:31px;border:1px solid var(--line);border-radius:8px;background:#fff;color:inherit;font-size:9px;font-weight:800}
    #shapeMode .sil-shape-grid button:hover{border-color:var(--purple);background:#faf8ff;color:var(--purple)}
    #shapeMode .sil-shape-heading{margin:12px 0 6px;font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#777780}
    #shapeMode .sil-shape-list{display:flex;flex-direction:column;gap:5px;max-height:170px;overflow:auto}
    #shapeMode .sil-shape-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px;padding:6px;border:1px solid #e5e5eb;border-radius:8px;background:#fff;cursor:pointer}
    #shapeMode .sil-shape-row.active{border-color:var(--purple);background:#faf8ff;box-shadow:inset 0 0 0 1px rgba(124,58,237,.18)}
    #shapeMode .sil-shape-name{font-size:9px;font-weight:850;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #shapeMode .sil-shape-meta{font-size:7.5px;color:#898991;margin-top:2px}
    #shapeMode .sil-shape-actions{display:flex;gap:3px}
    #shapeMode .sil-shape-actions button{min-width:25px;height:27px;padding:2px 5px;border:1px solid #e0e0e6;border-radius:6px;background:#fff;color:inherit;font-size:8px}
    #shapeMode .sil-shape-inspector{display:grid;grid-template-columns:1fr 1fr;gap:7px}
    #shapeMode .sil-shape-field{display:flex;flex-direction:column;gap:4px;min-width:0}
    #shapeMode .sil-shape-field.full{grid-column:1/-1}
    #shapeMode .sil-shape-field>span{font-size:8px;font-weight:800;color:#777780}
    #shapeMode .sil-shape-field input,#shapeMode .sil-shape-field select{width:100%;height:31px;border:1px solid #dedee5;border-radius:7px;background:#fff;color:inherit;padding:4px 7px;font-size:9px}
    #shapeMode .sil-shape-field input[type=color]{padding:2px}
    #shapeMode .sil-shape-range{display:grid;grid-template-columns:minmax(0,1fr) 42px;gap:6px;align-items:center}
    #shapeMode .sil-shape-range input{height:auto;padding:0}
    #shapeMode .sil-shape-range output{font-size:8px;text-align:right;color:var(--purple);font-weight:850}
    #shapeMode .sil-shape-paint{grid-column:1/-1;padding:8px;border:1px solid #ededf2;border-radius:9px;background:#fafafd}
    #shapeMode .sil-shape-paint strong{display:block;font-size:9px;margin-bottom:7px}
    #shapeMode .sil-shape-gradient{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:7px}
    #shapeMode .sil-shape-check{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:9px;font-weight:800}
    #shapeMode .sil-shape-help{margin-top:9px;font-size:8px;line-height:1.45;color:#85858e}
    #silhouetteShapeOverlay{position:absolute;z-index:35;pointer-events:none;overflow:visible}
    #silhouetteShapeOverlay .sil-shape-node{pointer-events:auto;cursor:move}
    #silhouetteShapeOverlay .sil-shape-hit{fill:rgba(124,58,237,.001);stroke:rgba(124,58,237,.001);stroke-width:12;pointer-events:all}
    #silhouetteShapeOverlay .sil-shape-box{fill:none;stroke:#FACC15;stroke-width:2;stroke-dasharray:8 5;vector-effect:non-scaling-stroke;pointer-events:none}
    #silhouetteShapeOverlay .sil-shape-rotate-line{stroke:#FACC15;stroke-width:2;vector-effect:non-scaling-stroke;pointer-events:none}
    #silhouetteShapeOverlay .sil-shape-rotator{fill:#FACC15;stroke:#111827;stroke-width:2;vector-effect:non-scaling-stroke;cursor:grab;pointer-events:auto}
    #silhouetteShapeOverlay .sil-shape-handle{fill:#fff;stroke:#7C3AED;stroke-width:2;vector-effect:non-scaling-stroke;pointer-events:auto}
    #silhouetteShapeOverlay .sil-shape-node:not(.selected) .sil-shape-box,
    #silhouetteShapeOverlay .sil-shape-node:not(.selected) .sil-shape-rotate-line,
    #silhouetteShapeOverlay .sil-shape-node:not(.selected) .sil-shape-rotator,
    #silhouetteShapeOverlay .sil-shape-node:not(.selected) .sil-shape-handle{display:none}
    html[data-theme=night] #shapeMode .sil-shape-grid button,
    html[data-theme=night] #shapeMode .sil-shape-row,
    html[data-theme=night] #shapeMode .sil-shape-actions button,
    html[data-theme=night] #shapeMode .sil-shape-field input,
    html[data-theme=night] #shapeMode .sil-shape-field select{background:var(--surface-2);border-color:var(--border);color:var(--text)}
    html[data-theme=night] #shapeMode .sil-shape-paint{background:var(--surface-3);border-color:var(--border)}
    html[data-theme=night] #shapeMode .sil-shape-row.active{background:#261e33;border-color:#7658b0}
  `;
  document.head.appendChild(style);
}

function buildPanel(){
  const host=$('#shapeMode');
  if(!host||host.dataset.shapeReady==='1')return;
  host.dataset.shapeReady='1';
  host.innerHTML=`
    <div class="hint"><b>Formas del Combiner dentro de la silueta.</b> Todo lo que quede fuera de la máscara se recorta automáticamente.</div>
    <div class="sil-shape-heading">Agregar forma</div>
    <div class="sil-shape-grid">
      <button data-add="rect">Rectángulo</button>
      <button data-add="roundRect">Redondeado</button>
      <button data-add="circle">Círculo</button>
      <button data-add="ellipse">Elipse</button>
      <button data-add="triangle">Triángulo</button>
      <button data-add="diamond">Diamante</button>
      <button data-add="hexagon">Hexágono</button>
      <button data-add="star">Estrella</button>
      <button data-add="heart">Corazón</button>
      <button data-add="arrow">Flecha</button>
    </div>
    <div class="sil-shape-heading">Capas</div>
    <div class="sil-shape-list" id="silShapeLayerList"></div>
    <div class="sil-shape-heading">Ajustes</div>
    <div id="silShapeInspector"></div>
    <p class="sil-shape-help">Arrastra = mover · puntos blancos = escalar · Ctrl + esquina = mantener proporción · punto amarillo = rotar · Shift = saltos de 15° · rueda = escalar · flechas = mover · Supr = eliminar.</p>
  `;

  $$('[data-add]',host).forEach(button=>{
    button.addEventListener('click',()=>{
      const state=current();
      if(!state?.baseImage){api()?.notify?.('Primero carga una silueta.');return;}
      const shape=shapeDefault(button.dataset.add,state);
      mutate(next=>{
        next.shapeLayers.push(shape);
        next.activeShapeId=shape.id;
        next.mode='shape';
      },`${shape.name} añadida.`);
    });
  });
}

function ensureOverlay(){
  const canvas=$('#resultCanvas');
  if(!canvas)return;
  const stage=canvas.closest('.preview-stage');
  if(!stage)return;
  resultStage=stage;
  if(getComputedStyle(stage).position==='static')stage.style.position='relative';

  if(!overlay){
    overlay=document.createElementNS(SVG_NS,'svg');
    overlay.id='silhouetteShapeOverlay';
    overlay.setAttribute('preserveAspectRatio','none');
    overlay.innerHTML='<g id="silhouetteShapeOverlayLayer"></g>';
    stage.appendChild(overlay);
    overlayLayer=$('#silhouetteShapeOverlayLayer',overlay);
  }

  if(!resizeObserver&&window.ResizeObserver){
    resizeObserver=new ResizeObserver(()=>syncOverlayLayout(current()));
    resizeObserver.observe(canvas);
    resizeObserver.observe(stage);
  }
}
function syncOverlayLayout(state=current()){
  ensureOverlay();
  const canvas=$('#resultCanvas');
  if(!overlay||!canvas||!resultStage||!state)return;

  const visible=state.mode==='shape'&&!!state.baseImage&&!$('#canvasWrap')?.classList.contains('hidden');
  overlay.style.display=visible?'block':'none';
  if(!visible)return;

  const stageRect=resultStage.getBoundingClientRect();
  const canvasRect=canvas.getBoundingClientRect();
  overlay.style.left=`${canvasRect.left-stageRect.left+resultStage.scrollLeft}px`;
  overlay.style.top=`${canvasRect.top-stageRect.top+resultStage.scrollTop}px`;
  overlay.style.width=`${canvasRect.width}px`;
  overlay.style.height=`${canvasRect.height}px`;
  overlay.setAttribute('viewBox',`0 0 ${Math.max(1,state.w)} ${Math.max(1,state.h)}`);
}
function overlayPoint(event,state=current()){
  const rect=overlay.getBoundingClientRect();
  return{
    x:(event.clientX-rect.left)*Math.max(1,state.w)/Math.max(1,rect.width),
    y:(event.clientY-rect.top)*Math.max(1,state.h)/Math.max(1,rect.height)
  };
}
function pointerSession(event,onMove,onEnd){
  const pointerId=event.pointerId;
  const move=next=>{
    if(next.pointerId!==pointerId)return;
    next.preventDefault();
    onMove(next);
  };
  const end=next=>{
    if(next.pointerId!==pointerId)return;
    next.preventDefault();
    window.removeEventListener('pointermove',move,true);
    window.removeEventListener('pointerup',end,true);
    window.removeEventListener('pointercancel',end,true);
    onEnd?.(next);
  };
  window.addEventListener('pointermove',move,true);
  window.addEventListener('pointerup',end,true);
  window.addEventListener('pointercancel',end,true);
}

function bindMove(group,shape){
  group.addEventListener('pointerdown',event=>{
    if(event.target.closest?.('.sil-shape-handle')||event.target.closest?.('.sil-shape-rotator'))return;
    event.preventDefault();event.stopPropagation();
    const state=current();
    const live=shapesOf(state).find(item=>item.id===shape.id);
    if(!live)return;
    state.activeShapeId=shape.id;
    const start=overlayPoint(event,state);
    const origin={x:live.x,y:live.y};
    api()?.beginGesture?.();
    pointerSession(event,next=>{
      const point=overlayPoint(next,current());
      live.x=origin.x+(point.x-start.x);
      live.y=origin.y+(point.y-start.y);
      api()?.render?.();
      renderOverlay(current());
      renderInspector(current());
    },()=>{
      api()?.endGesture?.();
      sync(current());
      api()?.notify?.('Forma movida.');
    });
  });
}
function bindRotation(rotator,shape){
  rotator.addEventListener('pointerdown',event=>{
    event.preventDefault();event.stopPropagation();
    const state=current();
    const live=shapesOf(state).find(item=>item.id===shape.id);
    if(!live)return;
    state.activeShapeId=shape.id;
    const center={x:live.x+live.width/2,y:live.y+live.height/2};
    const point=overlayPoint(event,state);
    const startAngle=Math.atan2(point.y-center.y,point.x-center.x)*180/Math.PI;
    const origin=live.rotation||0;
    api()?.beginGesture?.();
    pointerSession(event,next=>{
      const q=overlayPoint(next,current());
      let rotation=origin+(Math.atan2(q.y-center.y,q.x-center.x)*180/Math.PI-startAngle);
      if(next.shiftKey)rotation=Math.round(rotation/15)*15;
      live.rotation=rotation;
      api()?.render?.();renderOverlay(current());renderInspector(current());
    },()=>{api()?.endGesture?.();sync(current());api()?.notify?.('Rotación actualizada.');});
  });
}
function bindResize(handle,shape,dir){
  handle.addEventListener('pointerdown',event=>{
    event.preventDefault();event.stopPropagation();
    const state=current();
    const live=shapesOf(state).find(item=>item.id===shape.id);
    if(!live)return;
    state.activeShapeId=shape.id;
    const start=clone(live);
    const spec=resizeSpec(dir,start.width,start.height);
    const anchor=worldFromLocal(start,spec.opp[0],spec.opp[1]);
    const corner=spec.x&&spec.y;
    api()?.beginGesture?.();

    pointerSession(event,next=>{
      const point=overlayPoint(next,current());
      const local=localDeltaFromWorld(point.x-anchor.x,point.y-anchor.y,start.rotation||0);
      let width=spec.x?Math.max(12,spec.sx*local.x):start.width;
      let height=spec.y?Math.max(12,spec.sy*local.y):start.height;

      if(corner&&next.ctrlKey){
        const sw=width/start.width,sh=height/start.height;
        const scale=Math.max(12/start.width,12/start.height,Math.abs(sw-1)>=Math.abs(sh-1)?sw:sh);
        width=start.width*scale;height=start.height*scale;
      }

      const topLeft=newTopLeftForAnchor(anchor,dir,width,height,start.rotation||0);
      live.x=topLeft.x;live.y=topLeft.y;live.width=width;live.height=height;
      api()?.render?.();renderOverlay(current());renderInspector(current());
    },()=>{api()?.endGesture?.();sync(current());api()?.notify?.('Tamaño actualizado.');});
  });
}

function renderOverlay(state=current()){
  if(renderBusy)return;
  normalizeState(state);
  ensureOverlay();
  syncOverlayLayout(state);
  if(!overlayLayer||state.mode!=='shape')return;
  overlayLayer.replaceChildren();

  shapesOf(state).forEach(shape=>{
    if(shape.visible===false)return;
    const group=document.createElementNS(SVG_NS,'g');
    group.classList.add('sil-shape-node');
    if(shape.id===state.activeShapeId)group.classList.add('selected');
    group.setAttribute('transform',`translate(${shape.x} ${shape.y}) rotate(${shape.rotation} ${shape.width/2} ${shape.height/2})`);

    const hit=svgShapeElement(shape);
    hit.classList.add('sil-shape-hit');
    group.appendChild(hit);

    const box=document.createElementNS(SVG_NS,'rect');
    box.classList.add('sil-shape-box');
    box.setAttribute('x','0');box.setAttribute('y','0');box.setAttribute('width',shape.width);box.setAttribute('height',shape.height);
    group.appendChild(box);

    const rotateY=-Math.max(28,shape.height*.10);
    const line=document.createElementNS(SVG_NS,'line');
    line.classList.add('sil-shape-rotate-line');
    line.setAttribute('x1',shape.width/2);line.setAttribute('y1','0');line.setAttribute('x2',shape.width/2);line.setAttribute('y2',rotateY);
    group.appendChild(line);

    const rotator=document.createElementNS(SVG_NS,'circle');
    rotator.classList.add('sil-shape-rotator');
    rotator.setAttribute('cx',shape.width/2);rotator.setAttribute('cy',rotateY);rotator.setAttribute('r',Math.max(8,Math.min(shape.width,shape.height)*.025));
    group.appendChild(rotator);

    const size=Math.max(10,Math.min(shape.width,shape.height)*.03);
    const positions={
      nw:[0,0],n:[shape.width/2,0],ne:[shape.width,0],e:[shape.width,shape.height/2],
      se:[shape.width,shape.height],s:[shape.width/2,shape.height],sw:[0,shape.height],w:[0,shape.height/2]
    };
    Object.entries(positions).forEach(([dir,[x,y]])=>{
      const handle=document.createElementNS(SVG_NS,'rect');
      handle.classList.add('sil-shape-handle');handle.dataset.dir=dir;
      handle.setAttribute('x',x-size/2);handle.setAttribute('y',y-size/2);handle.setAttribute('width',size);handle.setAttribute('height',size);handle.setAttribute('rx',Math.max(2,size*.18));
      group.appendChild(handle);
      bindResize(handle,shape,dir);
    });

    hit.addEventListener('click',event=>{
      event.preventDefault();event.stopPropagation();
      state.activeShapeId=shape.id;sync(state);
    });
    bindMove(group,shape);
    bindRotation(rotator,shape);
    overlayLayer.appendChild(group);
  });
}

function renderLayerList(state=current()){
  const host=$('#silShapeLayerList');
  if(!host)return;
  host.replaceChildren();
  const shapes=shapesOf(state);
  if(!shapes.length){host.innerHTML='<div class="hint">Aún no hay formas. Añade una arriba.</div>';return;}

  [...shapes].reverse().forEach(shape=>{
    const row=document.createElement('div');
    row.className='sil-shape-row'+(shape.id===state.activeShapeId?' active':'');
    row.innerHTML=`<div><div class="sil-shape-name"></div><div class="sil-shape-meta"></div></div><div class="sil-shape-actions"><button data-act="up" title="Subir">↑</button><button data-act="down" title="Bajar">↓</button><button data-act="dup" title="Duplicar">⧉</button><button data-act="del" title="Eliminar">×</button></div>`;
    $('.sil-shape-name',row).textContent=shape.name;
    $('.sil-shape-meta',row).textContent=`${shape.kind} · ${Math.round(shape.width)}×${Math.round(shape.height)} · ${Math.round(shape.rotation)}°`;

    row.addEventListener('click',event=>{
      if(event.target.closest('button'))return;
      state.activeShapeId=shape.id;sync(state);
    });

    $$('button',row).forEach(button=>button.addEventListener('click',event=>{
      event.stopPropagation();
      const action=button.dataset.act;
      mutate(next=>{
        const list=shapesOf(next);
        const index=list.findIndex(item=>item.id===shape.id);
        if(index<0)return;
        if(action==='del'){
          list.splice(index,1);next.activeShapeId=list.at(-1)?.id||null;
        }else if(action==='dup'){
          const copy=clone(list[index]);copy.id=uid();copy.name=`${copy.name} copia`;copy.x+=24;copy.y+=24;
          list.splice(index+1,0,copy);next.activeShapeId=copy.id;
        }else if(action==='up'&&index<list.length-1){
          [list[index],list[index+1]]=[list[index+1],list[index]];
        }else if(action==='down'&&index>0){
          [list[index],list[index-1]]=[list[index-1],list[index]];
        }
      },action==='del'?'Forma eliminada.':'Capas de formas actualizadas.');
    }));
    host.appendChild(row);
  });
}

function bindGestureInput(input){
  if(!input)return;
  input.addEventListener('pointerdown',()=>api()?.beginGesture?.());
  input.addEventListener('focus',()=>api()?.beginGesture?.());
  const end=()=>api()?.endGesture?.();
  input.addEventListener('change',end);
  input.addEventListener('blur',end);
}

function renderInspector(state=current()){
  const host=$('#silShapeInspector');
  if(!host)return;
  host.replaceChildren();
  const shape=selected(state);
  if(!shape){host.innerHTML='<div class="hint">Selecciona una forma para editarla.</div>';return;}

  const box=document.createElement('div');
  box.className='sil-shape-inspector';
  box.innerHTML=`
    <label class="sil-shape-field full"><span>Nombre</span><input data-prop="name" type="text"></label>
    <label class="sil-shape-field"><span>X</span><input data-prop="x" type="number" step="1"></label>
    <label class="sil-shape-field"><span>Y</span><input data-prop="y" type="number" step="1"></label>
    <label class="sil-shape-field"><span>Ancho</span><input data-prop="width" type="number" min="12" step="1"></label>
    <label class="sil-shape-field"><span>Alto</span><input data-prop="height" type="number" min="12" step="1"></label>
    <label class="sil-shape-field full"><span>Rotación</span><div class="sil-shape-range"><input data-prop="rotation" type="range" min="-180" max="180" step="1"><output data-out="rotation"></output></div></label>
    <label class="sil-shape-field full" data-radius-row><span>Radio de esquinas</span><div class="sil-shape-range"><input data-prop="radius" type="range" min="0" max="200" step="1"><output data-out="radius"></output></div></label>

    <div class="sil-shape-paint">
      <strong>Relleno</strong>
      <label class="sil-shape-field"><span>Tipo</span><select data-fill-mode><option value="solid">Color sólido</option><option value="gradient">Degradado</option></select></label>
      <div class="sil-shape-gradient" data-solid><label class="sil-shape-field"><span>Color</span><input data-fill-color type="color"></label><label class="sil-shape-field"><span>Opacidad</span><input data-fill-opacity type="range" min="0" max="1" step="0.01"></label></div>
      <div data-gradient>
        <div class="sil-shape-gradient"><label class="sil-shape-field"><span>Color A</span><input data-grad-a type="color"></label><label class="sil-shape-field"><span>Color B</span><input data-grad-b type="color"></label></div>
        <label class="sil-shape-field" style="margin-top:7px"><span>Dirección</span><div class="sil-shape-range"><input data-grad-angle type="range" min="0" max="360" step="1"><output data-grad-angle-out></output></div></label>
      </div>
    </div>

    <div class="sil-shape-paint">
      <strong>Marco</strong>
      <label class="sil-shape-check"><span>Activar borde</span><input data-stroke-enabled type="checkbox"></label>
      <div class="sil-shape-gradient" style="margin-top:7px"><label class="sil-shape-field"><span>Color</span><input data-stroke-color type="color"></label><label class="sil-shape-field"><span>Grosor</span><input data-stroke-width type="number" min="0" max="300" step="1"></label></div>
      <label class="sil-shape-field" style="margin-top:7px"><span>Opacidad</span><input data-stroke-opacity type="range" min="0" max="1" step="0.01"></label>
    </div>
  `;
  host.appendChild(box);

  $$('[data-prop]',box).forEach(input=>{
    const prop=input.dataset.prop;
    input.value=shape[prop];
    const out=$(`[data-out="${prop}"]`,box);
    if(out)out.textContent=prop==='rotation'?`${Math.round(shape[prop])}°`:`${Math.round(shape[prop])}`;
    input.addEventListener('input',()=>{
      let value=input.value;
      if(input.type==='number'||input.type==='range')value=Number(value);
      shape[prop]=prop==='width'||prop==='height'?Math.max(12,Number(value)||12):value;
      if(out)out.textContent=prop==='rotation'?`${Math.round(Number(value))}°`:`${Math.round(Number(value))}`;
      api()?.render?.();renderOverlay(current());renderLayerList(current());
    });
    bindGestureInput(input);
  });

  const radiusRow=$('[data-radius-row]',box);
  if(radiusRow)radiusRow.style.display=shape.kind==='roundRect'?'':'none';

  const mode=$('[data-fill-mode]',box),solid=$('[data-solid]',box),gradient=$('[data-gradient]',box);
  mode.value=shape.fill.mode;
  const syncFillMode=()=>{solid.style.display=mode.value==='solid'?'grid':'none';gradient.style.display=mode.value==='gradient'?'':'none';};
  syncFillMode();
  mode.addEventListener('change',()=>mutateSelected(s=>{s.fill.mode=mode.value;},'Relleno actualizado.'));

  const fillColor=$('[data-fill-color]',box);fillColor.value=shape.fill.color;
  fillColor.addEventListener('input',()=>{shape.fill.color=fillColor.value;api()?.render?.();});
  bindGestureInput(fillColor);
  const fillOpacity=$('[data-fill-opacity]',box);fillOpacity.value=shape.fill.opacity;
  fillOpacity.addEventListener('input',()=>{shape.fill.opacity=Number(fillOpacity.value);api()?.render?.();});
  bindGestureInput(fillOpacity);

  const stops=shape.fill.gradient.stops;
  const gradA=$('[data-grad-a]',box),gradB=$('[data-grad-b]',box),gradAngle=$('[data-grad-angle]',box),gradOut=$('[data-grad-angle-out]',box);
  gradA.value=stops[0]?.color||'#A855F7';gradB.value=stops.at(-1)?.color||'#22D3EE';gradAngle.value=shape.fill.gradient.angle;gradOut.textContent=`${Math.round(shape.fill.gradient.angle)}°`;
  gradA.addEventListener('input',()=>{shape.fill.gradient.stops[0].color=gradA.value;api()?.render?.();});
  gradB.addEventListener('input',()=>{shape.fill.gradient.stops[shape.fill.gradient.stops.length-1].color=gradB.value;api()?.render?.();});
  gradAngle.addEventListener('input',()=>{shape.fill.gradient.angle=Number(gradAngle.value);gradOut.textContent=`${Math.round(Number(gradAngle.value))}°`;api()?.render?.();});
  [gradA,gradB,gradAngle].forEach(bindGestureInput);

  const strokeEnabled=$('[data-stroke-enabled]',box),strokeColor=$('[data-stroke-color]',box),strokeWidth=$('[data-stroke-width]',box),strokeOpacity=$('[data-stroke-opacity]',box);
  strokeEnabled.checked=shape.stroke.enabled;strokeColor.value=shape.stroke.color;strokeWidth.value=shape.stroke.width;strokeOpacity.value=shape.stroke.opacity;
  strokeEnabled.addEventListener('change',()=>mutateSelected(s=>{s.stroke.enabled=strokeEnabled.checked;},'Marco actualizado.'));
  strokeColor.addEventListener('input',()=>{shape.stroke.color=strokeColor.value;api()?.render?.();});
  strokeWidth.addEventListener('input',()=>{shape.stroke.width=Math.max(0,Number(strokeWidth.value)||0);api()?.render?.();});
  strokeOpacity.addEventListener('input',()=>{shape.stroke.opacity=Number(strokeOpacity.value);api()?.render?.();});
  [strokeColor,strokeWidth,strokeOpacity].forEach(bindGestureInput);
}

function duplicateSelected(){
  const state=current(),shape=selected(state);
  if(!state||!shape)return;
  mutate(next=>{
    const index=next.shapeLayers.findIndex(item=>item.id===shape.id);
    const copy=clone(shape);copy.id=uid();copy.name=`${copy.name} copia`;copy.x+=24;copy.y+=24;
    next.shapeLayers.splice(index+1,0,copy);next.activeShapeId=copy.id;
  },'Forma duplicada.');
}
function deleteSelected(){
  const state=current(),shape=selected(state);
  if(!state||!shape)return;
  mutate(next=>{
    const index=next.shapeLayers.findIndex(item=>item.id===shape.id);
    if(index>=0)next.shapeLayers.splice(index,1);
    next.activeShapeId=next.shapeLayers.at(-1)?.id||null;
  },'Forma eliminada.');
}

function bindKeyboard(){
  document.addEventListener('keydown',event=>{
    const state=current();
    if(state?.mode!=='shape')return;
    const target=event.target;
    const editing=target&&(['INPUT','TEXTAREA','SELECT'].includes(target.tagName)||target.isContentEditable);
    if(editing)return;

    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='d'){
      event.preventDefault();event.stopImmediatePropagation();duplicateSelected();return;
    }
    if(event.key==='Delete'||event.key==='Backspace'){
      event.preventDefault();event.stopImmediatePropagation();deleteSelected();return;
    }
    if(event.key==='Escape'){
      state.activeShapeId=null;sync(state);return;
    }
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)&&selected(state)){
      event.preventDefault();event.stopImmediatePropagation();
      const step=event.shiftKey?10:1;
      mutateSelected(shape=>{
        if(event.key==='ArrowLeft')shape.x-=step;
        if(event.key==='ArrowRight')shape.x+=step;
        if(event.key==='ArrowUp')shape.y-=step;
        if(event.key==='ArrowDown')shape.y+=step;
      },'Forma movida.');
    }
  },true);
}
function bindWheel(){
  const stage=$('#resultCanvas')?.closest('.preview-stage');
  if(!stage||stage.dataset.shapeWheel==='1')return;
  stage.dataset.shapeWheel='1';
  stage.addEventListener('wheel',event=>{
    const state=current(),shape=selected(state);
    if(state?.mode!=='shape'||!shape)return;
    event.preventDefault();event.stopImmediatePropagation();
    const factor=event.deltaY<0?1.05:.95;
    mutateSelected(s=>{
      const cx=s.x+s.width/2,cy=s.y+s.height/2;
      s.width=Math.max(12,s.width*factor);s.height=Math.max(12,s.height*factor);
      s.x=cx-s.width/2;s.y=cy-s.height/2;
    },'Escala de forma actualizada.');
  },{passive:false,capture:true});
}

function sync(state=current()){
  if(renderBusy)return;
  renderBusy=true;
  try{
    injectStyles();buildPanel();normalizeState(state);ensureOverlay();
    renderLayerList(state);renderInspector(state);renderOverlay(state);
  }finally{renderBusy=false;}
}

function boot(){
  const wait=()=>{
    if(api()?.getState&&$('#shapeMode')&&$('#resultCanvas')){
      normalizeState(current());
      injectStyles();buildPanel();ensureOverlay();bindKeyboard();bindWheel();sync(current());
      return true;
    }
    return false;
  };
  if(wait())return;
  const observer=new MutationObserver(()=>{if(wait())observer.disconnect();});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),15000);
}

window.SilhouetteShapeFill={draw,sync,duplicateSelected,deleteSelected};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();

}());
