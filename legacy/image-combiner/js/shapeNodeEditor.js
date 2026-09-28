(function(){
'use strict';

const api=()=>window.ImageCombinerStudio||null;
const shapeApi=()=>window.KaoruShapeStudio||null;
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const SVG_NS='http://www.w3.org/2000/svg';
const K=.5522847498307936;

let overlay=null;
let layer=null;
let wrapped=false;
let keyboardBound=false;
let wheelBound=false;
let editMode=false;
let placeMode=false;
let selectedNodeId=null;
let lastShapeId=null;
let syncing=false;

function clone(v){return JSON.parse(JSON.stringify(v));}
function uid(prefix='node'){return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;}
function current(){return api()?.getState?.()||null;}
function selectedId(){return shapeApi()?.getSelectedShapeId?.()||null;}
function selectedShape(state=current()){
  const id=selectedId();
  return Array.isArray(state?.shapes)?state.shapes.find(s=>s.id===id)||null:null;
}
function makeNode(u,v,opts={}){
  return {
    id:opts.id||uid(),
    u:Number(u)||0,v:Number(v)||0,
    inU:Number(opts.inU)||0,inV:Number(opts.inV)||0,
    outU:Number(opts.outU)||0,outV:Number(opts.outV)||0,
    smooth:opts.smooth===true
  };
}
function ensurePath(shape){
  if(!shape||shape.kind!=='path')return shape;
  shape.closed=shape.closed!==false;
  shape.nodes=Array.isArray(shape.nodes)?shape.nodes.map(n=>makeNode(n.u,n.v,n)):[];
  return shape;
}
function actual(shape,n){return{x:n.u*shape.width,y:n.v*shape.height};}
function controlActual(shape,n,side){
  const p=actual(shape,n);
  return side==='in'
    ?{x:p.x+n.inU*shape.width,y:p.y+n.inV*shape.height}
    :{x:p.x+n.outU*shape.width,y:p.y+n.outV*shape.height};
}
function svgPath(shape){
  ensurePath(shape);
  const nodes=shape?.nodes||[];
  if(!nodes.length)return '';
  const first=actual(shape,nodes[0]);
  let d=`M ${first.x} ${first.y}`;
  for(let i=1;i<nodes.length;i++){
    const a=nodes[i-1],b=nodes[i];
    const c1=controlActual(shape,a,'out'),c2=controlActual(shape,b,'in'),p=actual(shape,b);
    d+=` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p.x} ${p.y}`;
  }
  if(shape.closed!==false&&nodes.length>1){
    const a=nodes[nodes.length-1],b=nodes[0];
    const c1=controlActual(shape,a,'out'),c2=controlActual(shape,b,'in'),p=actual(shape,b);
    d+=` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p.x} ${p.y} Z`;
  }
  return d;
}
function pathCanvas(ctx,shape){
  ensurePath(shape);
  const nodes=shape?.nodes||[];
  if(!nodes.length)return;
  const first=actual(shape,nodes[0]);
  ctx.moveTo(first.x,first.y);
  for(let i=1;i<nodes.length;i++){
    const a=nodes[i-1],b=nodes[i];
    const c1=controlActual(shape,a,'out'),c2=controlActual(shape,b,'in'),p=actual(shape,b);
    ctx.bezierCurveTo(c1.x,c1.y,c2.x,c2.y,p.x,p.y);
  }
  if(shape.closed!==false&&nodes.length>1){
    const a=nodes[nodes.length-1],b=nodes[0];
    const c1=controlActual(shape,a,'out'),c2=controlActual(shape,b,'in'),p=actual(shape,b);
    ctx.bezierCurveTo(c1.x,c1.y,c2.x,c2.y,p.x,p.y);
    ctx.closePath();
  }
}

function primitivePoints(kind,shape){
  const w=Math.max(1,shape.width),h=Math.max(1,shape.height);
  if(kind==='rect')return[[0,0],[1,0],[1,1],[0,1]];
  if(kind==='triangle')return[[.5,0],[1,1],[0,1]];
  if(kind==='diamond')return[[.5,0],[1,.5],[.5,1],[0,.5]];
  if(kind==='hexagon')return[[.25,0],[.75,0],[1,.5],[.75,1],[.25,1],[0,.5]];
  if(kind==='arrow')return[[.06,.34],[.58,.34],[.58,0],[1,.5],[.58,1],[.58,.66],[.06,.66]];
  if(kind==='star'){
    const r=Math.min(w,h)/2,rx=r/w,ry=r/h,pts=[];
    for(let i=0;i<10;i++){
      const a=(-90+i*36)*Math.PI/180,rr=i%2===0?1:.45;
      pts.push([.5+Math.cos(a)*rx*rr,.5+Math.sin(a)*ry*rr]);
    }
    return pts;
  }
  return[];
}
function primitiveToNodes(shape){
  if(shape.kind==='path'&&Array.isArray(shape.nodes))return shape.nodes.map(n=>makeNode(n.u,n.v,n));

  if(shape.kind==='circle'||shape.kind==='ellipse'){
    const w=Math.max(1,shape.width),h=Math.max(1,shape.height);
    const r=shape.kind==='circle'?Math.min(w,h)/2:null;
    const rx=shape.kind==='circle'?r/w:.5,ry=shape.kind==='circle'?r/h:.5;
    return[
      makeNode(.5,.5-ry,{inU:-K*rx,outU:K*rx,smooth:true}),
      makeNode(.5+rx,.5,{inV:-K*ry,outV:K*ry,smooth:true}),
      makeNode(.5,.5+ry,{inU:K*rx,outU:-K*rx,smooth:true}),
      makeNode(.5-rx,.5,{inV:K*ry,outV:-K*ry,smooth:true})
    ];
  }

  if(shape.kind==='roundRect'){
    const rx=clamp((Number(shape.radius)||0)/Math.max(1,shape.width),0,.5);
    const ry=clamp((Number(shape.radius)||0)/Math.max(1,shape.height),0,.5);
    return[
      makeNode(rx,0,{inU:-K*rx}),
      makeNode(1-rx,0,{outU:K*rx}),
      makeNode(1,ry,{inV:-K*ry}),
      makeNode(1,1-ry,{outV:K*ry}),
      makeNode(1-rx,1,{inU:K*rx}),
      makeNode(rx,1,{outU:-K*rx}),
      makeNode(0,1-ry,{inV:K*ry}),
      makeNode(0,ry,{outV:-K*ry})
    ];
  }

  if(shape.kind==='heart'){
    return[
      makeNode(.5,1,{inU:.38,inV:-.24,outU:-.38,outV:-.24,smooth:true}),
      makeNode(.22,.22,{inU:-.22,inV:.18,outU:.14,outV:-.12,smooth:true}),
      makeNode(.5,.3,{inU:-.02,inV:-.14,outU:.02,outV:-.14,smooth:true}),
      makeNode(.78,.22,{inU:-.14,inV:-.12,outU:.22,outV:.18,smooth:true})
    ];
  }

  return primitivePoints(shape.kind,shape).map(([u,v])=>makeNode(u,v));
}
function freeformShape(state){
  const cw=Math.max(1,state?.canvas?.width||1080),ch=Math.max(1,state?.canvas?.height||1080);
  const width=Math.max(120,Math.round(cw*.28)),height=Math.max(100,Math.round(ch*.22));
  return{
    id:uid('shape'),kind:'path',name:'Forma libre',
    x:Math.round((cw-width)/2),y:Math.round((ch-height)/2),
    width,height,rotation:0,radius:0,strokeWidth:8,visible:true,closed:true,
    nodes:[makeNode(.15,.18),makeNode(.82,.15),makeNode(.9,.72),makeNode(.5,.9),makeNode(.1,.7)],
    fill:{
      enabled:true,mode:'solid',color:'#8B5CF6',opacity:1,
      gradient:{angle:45,stops:[{offset:0,color:'#A855F7',opacity:1},{offset:100,color:'#22D3EE',opacity:1}]},
      image:{src:'',scale:1,offsetX:0,offsetY:0,rotation:0}
    },
    stroke:{
      enabled:true,mode:'solid',color:'#FFFFFF',opacity:1,
      gradient:{angle:45,stops:[{offset:0,color:'#FFFFFF',opacity:1},{offset:100,color:'#FFFFFF',opacity:1}]},
      image:{src:'',scale:1,offsetX:0,offsetY:0,rotation:0}
    }
  };
}

function mutateShape(id,fn,label='Forma actualizada',commit=true){
  const studio=api();
  if(!studio?.mutate)return null;
  return studio.mutate(state=>{
    if(!Array.isArray(state.shapes))state.shapes=[];
    const shape=state.shapes.find(item=>item.id===id);
    if(shape){ensurePath(shape);fn(shape,state);}
  },label,commit);
}
function mutateSelected(fn,label='Forma actualizada',commit=true){
  const id=selectedId();
  if(!id)return null;
  const out=mutateShape(id,fn,label,commit);
  requestAnimationFrame(()=>sync(current()));
  return out;
}
function notify(text){api()?.notify?.(text);}

function worldPoint(event,state=current()){
  const base=$('#kaoruShapeOverlay');
  if(!base)return{x:0,y:0};
  const rect=base.getBoundingClientRect();
  const w=Math.max(1,state?.canvas?.width||1080),h=Math.max(1,state?.canvas?.height||1080);
  return{x:(event.clientX-rect.left)*w/Math.max(1,rect.width),y:(event.clientY-rect.top)*h/Math.max(1,rect.height)};
}
function rotateVector(x,y,degrees){
  const a=degrees*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  return{x:x*c-y*s,y:x*s+y*c};
}
function localFromWorld(shape,p){
  const cx=shape.x+shape.width/2,cy=shape.y+shape.height/2;
  const rel=rotateVector(p.x-cx,p.y-cy,-(shape.rotation||0));
  return{x:rel.x+shape.width/2,y:rel.y+shape.height/2};
}
function pointToUv(shape,p){
  const local=localFromWorld(shape,p);
  return{u:local.x/Math.max(1,shape.width),v:local.y/Math.max(1,shape.height)};
}
function pointerSession(event,onMove,onEnd){
  const id=event.pointerId;
  const move=e=>{if(e.pointerId!==id)return;e.preventDefault();onMove(e);};
  const end=e=>{
    if(e.pointerId!==id)return;
    e.preventDefault();
    window.removeEventListener('pointermove',move,true);
    window.removeEventListener('pointerup',end,true);
    window.removeEventListener('pointercancel',end,true);
    onEnd?.(e);
  };
  window.addEventListener('pointermove',move,true);
  window.addEventListener('pointerup',end,true);
  window.addEventListener('pointercancel',end,true);
}

function cubicPoint(p0,p1,p2,p3,t){
  const a=1-t,a2=a*a,t2=t*t;
  return{u:a2*a*p0.u+3*a2*t*p1.u+3*a*t2*p2.u+t2*t*p3.u,v:a2*a*p0.v+3*a2*t*p1.v+3*a*t2*p2.v+t2*t*p3.v};
}
function segment(a,b){
  return{p0:{u:a.u,v:a.v},p1:{u:a.u+a.outU,v:a.v+a.outV},p2:{u:b.u+b.inU,v:b.v+b.inV},p3:{u:b.u,v:b.v}};
}
function midpoint(shape,index){
  const nodes=shape.nodes,next=index===nodes.length-1?0:index+1;
  if(next===0&&shape.closed===false)return null;
  const s=segment(nodes[index],nodes[next]);
  return cubicPoint(s.p0,s.p1,s.p2,s.p3,.5);
}
function splitSegment(shape,index){
  const nodes=shape.nodes,next=index===nodes.length-1?0:index+1;
  if(next===0&&shape.closed===false)return null;
  const a=nodes[index],b=nodes[next],s=segment(a,b);
  const q0={u:(s.p0.u+s.p1.u)/2,v:(s.p0.v+s.p1.v)/2};
  const q1={u:(s.p1.u+s.p2.u)/2,v:(s.p1.v+s.p2.v)/2};
  const q2={u:(s.p2.u+s.p3.u)/2,v:(s.p2.v+s.p3.v)/2};
  const r0={u:(q0.u+q1.u)/2,v:(q0.v+q1.v)/2};
  const r1={u:(q1.u+q2.u)/2,v:(q1.v+q2.v)/2};
  const p={u:(r0.u+r1.u)/2,v:(r0.v+r1.v)/2};
  a.outU=q0.u-s.p0.u;a.outV=q0.v-s.p0.v;
  b.inU=q2.u-s.p3.u;b.inV=q2.v-s.p3.v;
  const fresh=makeNode(p.u,p.v,{inU:r0.u-p.u,inV:r0.v-p.v,outU:r1.u-p.u,outV:r1.v-p.v,smooth:true});
  if(next===0)nodes.push(fresh);else nodes.splice(next,0,fresh);
  return fresh;
}
function actualDistance(shape,du,dv){return Math.hypot(du*shape.width,dv*shape.height);}
function directionActual(shape,du,dv){
  const x=du*shape.width,y=dv*shape.height,len=Math.hypot(x,y)||1;
  return{x:x/len,y:y/len};
}
function makeSmooth(shape,index){
  const nodes=shape.nodes,n=nodes[index];
  const prev=index>0?nodes[index-1]:(shape.closed!==false?nodes.at(-1):null);
  const next=index<nodes.length-1?nodes[index+1]:(shape.closed!==false?nodes[0]:null);
  if(!prev&&!next)return;
  let tx=0,ty=0;
  if(prev&&next){tx=(next.u-prev.u)*shape.width;ty=(next.v-prev.v)*shape.height;}
  else if(next){tx=(next.u-n.u)*shape.width;ty=(next.v-n.v)*shape.height;}
  else{tx=(n.u-prev.u)*shape.width;ty=(n.v-prev.v)*shape.height;}
  const len=Math.hypot(tx,ty)||1;tx/=len;ty/=len;
  const a=prev?Math.hypot((n.u-prev.u)*shape.width,(n.v-prev.v)*shape.height)/3:0;
  const b=next?Math.hypot((next.u-n.u)*shape.width,(next.v-n.v)*shape.height)/3:0;
  n.inU=-(tx*a)/Math.max(1,shape.width);n.inV=-(ty*a)/Math.max(1,shape.height);
  n.outU=(tx*b)/Math.max(1,shape.width);n.outV=(ty*b)/Math.max(1,shape.height);
  n.smooth=true;
}
function makeCorner(n){n.inU=0;n.inV=0;n.outU=0;n.outV=0;n.smooth=false;}

function injectStyles(){
  if($('#kaoruCombinerNodeEditorStyles'))return;
  const style=document.createElement('style');
  style.id='kaoruCombinerNodeEditorStyles';
  style.textContent=`
    #kaoruShapeStudio .node-editor-box{grid-column:1/-1;margin-top:7px;padding:8px;border:1px solid var(--line);border-radius:9px;background:color-mix(in srgb,var(--surface) 94%,transparent)}
    #kaoruShapeStudio .node-editor-title{display:flex;justify-content:space-between;align-items:center;gap:7px;margin-bottom:7px}
    #kaoruShapeStudio .node-editor-title strong{font-size:8.5px}
    #kaoruShapeStudio .node-actions{display:grid;grid-template-columns:1fr 1fr;gap:5px}
    #kaoruShapeStudio .node-actions button{min-height:29px;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:inherit;font-size:7.7px;font-weight:800;cursor:pointer}
    #kaoruShapeStudio .node-actions button.active{border-color:#22c55e;background:color-mix(in srgb,#22c55e 12%,var(--surface));color:#16a34a}
    #kaoruShapeStudio .node-mini-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:7px}
    #kaoruShapeStudio .node-mini-grid label{display:flex;flex-direction:column;gap:3px;font-size:7.3px;color:var(--muted)}
    #kaoruShapeStudio .node-mini-grid input{width:100%;min-height:28px;padding:4px 6px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:inherit;font-size:8px}
    #kaoruShapeStudio .node-help{margin-top:7px;font-size:7px;line-height:1.4;color:var(--muted)}
    #kaoruShapeNodeOverlay{position:absolute;inset:0;width:100%;height:100%;z-index:34;overflow:visible;pointer-events:none}
    #kaoruShapeNodeOverlay .node-edit-path{fill:none;stroke:#38bdf8;stroke-width:1.6;stroke-dasharray:5 4;vector-effect:non-scaling-stroke;pointer-events:none}
    #kaoruShapeNodeOverlay .node-line{stroke:#22c55e;stroke-width:1.4;vector-effect:non-scaling-stroke;pointer-events:none}
    #kaoruShapeNodeOverlay .node-anchor{fill:#fff;stroke:#0ea5e9;stroke-width:2;vector-effect:non-scaling-stroke;pointer-events:all;cursor:move}
    #kaoruShapeNodeOverlay .node-anchor.selected{fill:#facc15;stroke:#111827}
    #kaoruShapeNodeOverlay .node-control{fill:#22c55e;stroke:#052e16;stroke-width:1.5;vector-effect:non-scaling-stroke;pointer-events:all;cursor:crosshair}
    #kaoruShapeNodeOverlay .node-mid{fill:#86efac;stroke:#166534;stroke-width:1.5;vector-effect:non-scaling-stroke;pointer-events:all;cursor:copy}
  `;
  document.head.appendChild(style);
}
function ensureOverlay(){
  if(overlay)return;
  const stage=$('#canvasStage');
  if(!stage)return;
  if(getComputedStyle(stage).position==='static')stage.style.position='relative';
  overlay=document.createElementNS(SVG_NS,'svg');
  overlay.id='kaoruShapeNodeOverlay';
  overlay.setAttribute('preserveAspectRatio','none');
  overlay.innerHTML='<g id="kaoruShapeNodeLayer"></g>';
  stage.appendChild(overlay);
  layer=$('#kaoruShapeNodeLayer',overlay);
  overlay.addEventListener('pointerdown',event=>{
    if(!placeMode||event.target.closest?.('.node-anchor,.node-control,.node-mid'))return;
    event.preventDefault();event.stopPropagation();
    const state=current(),shape=selectedShape(state);
    if(!shape||shape.kind!=='path')return;
    const uv=pointToUv(shape,worldPoint(event,state));
    mutateSelected(s=>{
      const fresh=makeNode(uv.u,uv.v);
      const index=s.nodes.findIndex(n=>n.id===selectedNodeId);
      s.nodes.splice(index>=0?index+1:s.nodes.length,0,fresh);
      selectedNodeId=fresh.id;
    },'Nodo añadido');
    placeMode=false;sync(current());
  },true);
}
function syncOverlaySize(state){
  if(!overlay)return;
  overlay.setAttribute('viewBox',`0 0 ${Math.max(1,state?.canvas?.width||1080)} ${Math.max(1,state?.canvas?.height||1080)}`);
  overlay.style.pointerEvents=placeMode?'auto':'none';
}

function dragNode(event,shapeId,nodeId){
  event.preventDefault();event.stopPropagation();
  selectedNodeId=nodeId;
  const state=current(),shape=selectedShape(state);
  if(!shape||shape.id!==shapeId)return;
  const origin=shape.nodes.find(n=>n.id===nodeId);
  const start=pointToUv(shape,worldPoint(event,state));
  const initial={u:origin.u,v:origin.v};
  pointerSession(event,e=>{
    const st=current(),sh=selectedShape(st);
    if(!sh)return;
    const uv=pointToUv(sh,worldPoint(e,st));
    mutateShape(shapeId,s=>{
      const n=s.nodes.find(item=>item.id===nodeId);
      if(n){n.u=initial.u+(uv.u-start.u);n.v=initial.v+(uv.v-start.v);}
    },'Mover nodo',false);
  },()=>{api()?.commit?.('Mover nodo');sync(current());});
}
function dragControl(event,shapeId,nodeId,side){
  event.preventDefault();event.stopPropagation();
  selectedNodeId=nodeId;
  pointerSession(event,e=>{
    const st=current(),sh=selectedShape(st);
    if(!sh||sh.id!==shapeId)return;
    const uv=pointToUv(sh,worldPoint(e,st));
    mutateShape(shapeId,s=>{
      const n=s.nodes.find(item=>item.id===nodeId);
      if(!n)return;
      const du=uv.u-n.u,dv=uv.v-n.v;
      if(side==='in'){n.inU=du;n.inV=dv;}else{n.outU=du;n.outV=dv;}
      if(n.smooth){
        const opposite=side==='in'?'out':'in';
        const oldU=opposite==='in'?n.inU:n.outU,oldV=opposite==='in'?n.inV:n.outV;
        let len=actualDistance(s,oldU,oldV);
        const moved=actualDistance(s,du,dv);
        if(len<.01)len=moved;
        const d=directionActual(s,du,dv);
        const mu=(-d.x*len)/Math.max(1,s.width),mv=(-d.y*len)/Math.max(1,s.height);
        if(opposite==='in'){n.inU=mu;n.inV=mv;}else{n.outU=mu;n.outV=mv;}
      }
    },'Curva actualizada',false);
  },()=>{api()?.commit?.('Curva actualizada');sync(current());});
}
function insertSegment(event,shapeId,index){
  event.preventDefault();event.stopPropagation();
  mutateShape(shapeId,s=>{const n=splitSegment(s,index);if(n)selectedNodeId=n.id;},'Nodo insertado');
  sync(current());
}
function renderNodeOverlay(state=current()){
  ensureOverlay();syncOverlaySize(state);
  if(!layer)return;
  layer.replaceChildren();
  const shape=selectedShape(state);
  if(!editMode||!shape||shape.kind!=='path'){overlay.style.display='none';return;}
  overlay.style.display='block';
  ensurePath(shape);

  const group=document.createElementNS(SVG_NS,'g');
  group.setAttribute('transform',`translate(${shape.x} ${shape.y}) rotate(${shape.rotation||0} ${shape.width/2} ${shape.height/2})`);
  const guide=document.createElementNS(SVG_NS,'path');
  guide.classList.add('node-edit-path');guide.setAttribute('d',svgPath(shape));group.appendChild(guide);

  shape.nodes.forEach((n,index)=>{
    const p=actual(shape,n),a=controlActual(shape,n,'in'),b=controlActual(shape,n,'out');
    if(n.id===selectedNodeId){
      [[a,'in',n.inU,n.inV],[b,'out',n.outU,n.outV]].forEach(([cp,side,du,dv])=>{
        if(Math.hypot(du,dv)<=.00001)return;
        const line=document.createElementNS(SVG_NS,'line');
        line.classList.add('node-line');line.setAttribute('x1',p.x);line.setAttribute('y1',p.y);line.setAttribute('x2',cp.x);line.setAttribute('y2',cp.y);group.appendChild(line);
        const h=document.createElementNS(SVG_NS,'circle');
        h.classList.add('node-control');h.setAttribute('cx',cp.x);h.setAttribute('cy',cp.y);h.setAttribute('r',7);
        h.addEventListener('pointerdown',e=>dragControl(e,shape.id,n.id,side));group.appendChild(h);
      });
    }

    const anchor=document.createElementNS(SVG_NS,'circle');
    anchor.classList.add('node-anchor');if(n.id===selectedNodeId)anchor.classList.add('selected');
    anchor.setAttribute('cx',p.x);anchor.setAttribute('cy',p.y);anchor.setAttribute('r',8);
    anchor.addEventListener('pointerdown',e=>dragNode(e,shape.id,n.id));
    anchor.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();selectedNodeId=n.id;sync(current());});
    group.appendChild(anchor);

    const mid=midpoint(shape,index);
    if(mid){
      const m=document.createElementNS(SVG_NS,'circle');
      m.classList.add('node-mid');m.setAttribute('cx',mid.u*shape.width);m.setAttribute('cy',mid.v*shape.height);m.setAttribute('r',5.5);
      m.addEventListener('pointerdown',e=>insertSegment(e,shape.id,index));group.appendChild(m);
    }
  });
  layer.appendChild(group);
}

function selectedNode(shape){return shape?.nodes?.find(n=>n.id===selectedNodeId)||null;}
function appendFreeformButton(){
  const grid=$('#kaoruShapeStudio .shape-grid');
  if(!grid||grid.querySelector('[data-add-vector-path]'))return;
  const button=document.createElement('button');
  button.type='button';button.dataset.addVectorPath='1';button.textContent='✦ Forma libre';
  button.addEventListener('click',()=>{
    const state=current();if(!state)return;
    const shape=freeformShape(state);
    api()?.mutate?.(s=>{if(!Array.isArray(s.shapes))s.shapes=[];s.shapes.push(shape);},'Forma libre añadida',true);
    shapeApi()?.selectShape?.(shape.id);
    editMode=true;placeMode=false;selectedNodeId=shape.nodes[0]?.id||null;sync(current());
  });
  grid.appendChild(button);
}
function editorHtml(shape){
  if(!shape)return'';
  if(shape.kind!=='path'){
    return `<div class="node-editor-box"><div class="node-editor-title"><strong>Constructor vectorial</strong></div><div class="node-actions"><button data-vector-action="convert">Convertir a nodos</button><button data-vector-action="duplicate">Duplicar figura</button></div><div class="node-help">Convierte esta forma en un trazado editable. El relleno y el marco actuales se conservan.</div></div>`;
  }
  const n=selectedNode(shape);
  return `<div class="node-editor-box">
    <div class="node-editor-title"><strong>Constructor vectorial · ${shape.nodes.length} nodos</strong><span style="font-size:7px;color:var(--muted)">${shape.closed!==false?'Cerrada':'Abierta'}</span></div>
    <div class="node-actions">
      <button data-vector-action="edit" class="${editMode?'active':''}">${editMode?'Salir de nodos':'Editar nodos'}</button>
      <button data-vector-action="place" class="${placeMode?'active':''}">＋ Colocar nodo</button>
      <button data-vector-action="closed">${shape.closed!==false?'Abrir trazado':'Cerrar trazado'}</button>
      <button data-vector-action="duplicate">Duplicar figura</button>
    </div>
    ${n?`<div class="node-mini-grid"><label>X del nodo<input data-node-x type="number" step="1" value="${(n.u*shape.width).toFixed(1)}"></label><label>Y del nodo<input data-node-y type="number" step="1" value="${(n.v*shape.height).toFixed(1)}"></label></div>
    <div class="node-actions" style="margin-top:6px"><button data-vector-action="corner" class="${!n.smooth?'active':''}">Nodo esquina</button><button data-vector-action="smooth" class="${n.smooth?'active':''}">Nodo suave</button><button data-vector-action="dup-node">Duplicar nodo</button><button data-vector-action="del-node">Borrar nodo</button></div>`:'<div class="node-help">Selecciona un nodo azul.</div>'}
    <div class="node-help">Puntos verdes pequeños = insertar nodo en el segmento · handles verdes = curva Bézier · Supr borra el nodo seleccionado · flechas lo mueven.</div>
  </div>`;
}
function renderPanel(state=current()){
  appendFreeformButton();
  const host=$('#shapeInspector'),shape=selectedShape(state);
  if(!host||!shape)return;
  $('#kaoruCombinerNodeEditor',host)?.remove();
  const box=document.createElement('div');
  box.id='kaoruCombinerNodeEditor';box.style.gridColumn='1/-1';box.innerHTML=editorHtml(shape);host.appendChild(box);

  $$('[data-vector-action]',box).forEach(button=>button.addEventListener('click',()=>{
    const action=button.dataset.vectorAction,live=selectedShape(current());if(!live)return;
    if(action==='convert'){
      mutateSelected(s=>{s.nodes=primitiveToNodes(s);s.kind='path';s.closed=true;s.radius=0;},'Figura convertida a nodos');
      editMode=true;placeMode=false;selectedNodeId=selectedShape(current())?.nodes?.[0]?.id||null;
    }else if(action==='edit'){
      editMode=!editMode;placeMode=false;if(editMode&&!selectedNodeId)selectedNodeId=live.nodes?.[0]?.id||null;
    }else if(action==='place'){
      editMode=true;placeMode=!placeMode;
    }else if(action==='closed'){
      mutateSelected(s=>{s.closed=s.closed===false;},'Trazado actualizado');
    }else if(action==='duplicate'){
      const copy=clone(live);copy.id=uid('shape');copy.name=`${copy.name} copia`;copy.x+=24;copy.y+=24;copy.nodes?.forEach(n=>n.id=uid());
      api()?.mutate?.(s=>{const i=s.shapes.findIndex(x=>x.id===live.id);s.shapes.splice(i+1,0,copy);},'Figura duplicada',true);
      shapeApi()?.selectShape?.(copy.id);selectedNodeId=copy.nodes?.[0]?.id||null;
    }else if(action==='corner'){
      mutateSelected(s=>{const i=s.nodes.findIndex(n=>n.id===selectedNodeId);if(i>=0)makeCorner(s.nodes[i]);},'Nodo convertido a esquina');
    }else if(action==='smooth'){
      mutateSelected(s=>{const i=s.nodes.findIndex(n=>n.id===selectedNodeId);if(i>=0)makeSmooth(s,i);},'Nodo suavizado');
    }else if(action==='dup-node'){
      mutateSelected(s=>{const i=s.nodes.findIndex(n=>n.id===selectedNodeId);if(i<0)return;const c=clone(s.nodes[i]);c.id=uid();c.u+=.035;c.v+=.035;s.nodes.splice(i+1,0,c);selectedNodeId=c.id;},'Nodo duplicado');
    }else if(action==='del-node'){
      mutateSelected(s=>{const min=s.closed!==false?3:2;if(s.nodes.length<=min){notify(`El trazado necesita al menos ${min} nodos.`);return;}const i=s.nodes.findIndex(n=>n.id===selectedNodeId);if(i<0)return;s.nodes.splice(i,1);selectedNodeId=s.nodes[Math.min(i,s.nodes.length-1)]?.id||null;},'Nodo eliminado');
    }
    sync(current());
  }));

  const x=$('[data-node-x]',box),y=$('[data-node-y]',box);
  if(x&&y){
    const update=()=>mutateSelected(s=>{const n=s.nodes.find(item=>item.id===selectedNodeId);if(!n)return;n.u=(Number(x.value)||0)/Math.max(1,s.width);n.v=(Number(y.value)||0)/Math.max(1,s.height);},'Nodo reubicado',false);
    x.addEventListener('input',update);y.addEventListener('input',update);
    const commit=()=>{api()?.commit?.('Nodo reubicado');sync(current());};
    x.addEventListener('change',commit);y.addEventListener('change',commit);
  }
}

function bindKeyboard(){
  if(keyboardBound)return;keyboardBound=true;
  document.addEventListener('keydown',event=>{
    if(!editMode)return;
    const shape=selectedShape(current()),n=selectedNode(shape);
    if(!shape||shape.kind!=='path')return;
    const target=event.target,typing=target&&(['INPUT','TEXTAREA','SELECT'].includes(target.tagName)||target.isContentEditable);
    if(typing)return;

    if((event.key==='Delete'||event.key==='Backspace')&&n){
      event.preventDefault();event.stopImmediatePropagation();
      const min=shape.closed!==false?3:2;
      if(shape.nodes.length<=min){notify(`El trazado necesita al menos ${min} nodos.`);return;}
      mutateSelected(s=>{const i=s.nodes.findIndex(x=>x.id===selectedNodeId);s.nodes.splice(i,1);selectedNodeId=s.nodes[Math.min(i,s.nodes.length-1)]?.id||null;},'Nodo eliminado');
      return;
    }

    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)&&n){
      event.preventDefault();event.stopImmediatePropagation();
      const px=event.shiftKey?10:1;
      mutateSelected(s=>{const q=s.nodes.find(x=>x.id===selectedNodeId);if(!q)return;if(event.key==='ArrowLeft')q.u-=px/Math.max(1,s.width);if(event.key==='ArrowRight')q.u+=px/Math.max(1,s.width);if(event.key==='ArrowUp')q.v-=px/Math.max(1,s.height);if(event.key==='ArrowDown')q.v+=px/Math.max(1,s.height);},'Mover nodo',false);
      return;
    }

    if(event.key==='Escape'){
      event.preventDefault();event.stopImmediatePropagation();
      if(placeMode)placeMode=false;else editMode=false;
      sync(current());
    }
  },true);

  document.addEventListener('keyup',event=>{
    if(editMode&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
      event.preventDefault();event.stopImmediatePropagation();api()?.commit?.('Mover nodo');sync(current());
    }
  },true);
}
function bindWheel(){
  if(wheelBound)return;
  const stage=$('#canvasStage');if(!stage)return;wheelBound=true;
  stage.addEventListener('wheel',event=>{
    if(!editMode)return;
    const shape=selectedShape(current());if(!shape||shape.kind!=='path')return;
    if(!event.target.closest?.('#kaoruShapeNodeOverlay,#kaoruShapeOverlay'))return;
    event.preventDefault();event.stopImmediatePropagation();
    const factor=event.deltaY<0?1.05:.95;
    mutateSelected(s=>{const cx=s.x+s.width/2,cy=s.y+s.height/2;s.width=Math.max(12,s.width*factor);s.height=Math.max(12,s.height*factor);s.x=cx-s.width/2;s.y=cy-s.height/2;},'Escalar figura');
  },{passive:false,capture:true});
}
function wrap(){
  if(wrapped||!shapeApi()?.sync)return;
  wrapped=true;
  const studio=shapeApi(),oldSync=studio.sync.bind(studio);
  studio.sync=state=>{oldSync(state);requestAnimationFrame(()=>sync(state||current()));};
}
function sync(state=current()){
  if(syncing)return;syncing=true;
  try{
    injectStyles();ensureOverlay();wrap();appendFreeformButton();
    const id=selectedId();
    if(id!==lastShapeId){
      lastShapeId=id;selectedNodeId=null;placeMode=false;
      if(selectedShape(state)?.kind!=='path')editMode=false;
    }
    const shape=selectedShape(state);
    if(shape?.kind==='path'){
      ensurePath(shape);
      if(selectedNodeId&&!shape.nodes.some(n=>n.id===selectedNodeId))selectedNodeId=null;
    }
    renderPanel(state);renderNodeOverlay(state);
  }finally{syncing=false;}
}
function boot(){
  const wait=()=>{
    if(api()?.getState&&shapeApi()?.sync&&$('#kaoruShapeStudio')&&$('#canvasStage')){
      injectStyles();ensureOverlay();wrap();appendFreeformButton();bindKeyboard();bindWheel();sync(current());return true;
    }
    return false;
  };
  if(wait())return;
  const observer=new MutationObserver(()=>{if(wait())observer.disconnect();});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),15000);
}

window.KaoruShapeNodeEditor={svgPath,pathCanvas,sync};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();

}());
