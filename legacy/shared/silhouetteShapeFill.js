(function(){
'use strict';
// KAORU_SILHOUETTE_VECTOR_NODE_EDITOR_V2

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
let nodeEditMode=false;
let nodeAddMode=false;
let selectedNodeIndex=null;

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
    enabled:true,
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
function makeNode(x,y){
  return{
    x:Number(x)||0,
    y:Number(y)||0,
    inX:Number(x)||0,
    inY:Number(y)||0,
    outX:Number(x)||0,
    outY:Number(y)||0,
    smooth:false
  };
}
function ensureNode(node){
  const x=Number(node?.x)||0;
  const y=Number(node?.y)||0;
  return{
    x,y,
    inX:Number.isFinite(Number(node?.inX))?Number(node.inX):x,
    inY:Number.isFinite(Number(node?.inY))?Number(node.inY):y,
    outX:Number.isFinite(Number(node?.outX))?Number(node.outX):x,
    outY:Number.isFinite(Number(node?.outY))?Number(node.outY):y,
    smooth:node?.smooth===true
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
    arrow:'Flecha',
    custom:'Forma libre'
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
    closed:true,
    points:kind==='custom'?[
      makeNode(w*.15,h*.18),
      makeNode(w*.82,h*.12),
      makeNode(w*.9,h*.72),
      makeNode(w*.58,h*.9),
      makeNode(w*.12,h*.78)
    ]:[],
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
  shape.closed=shape.closed!==false;
  if(shape.kind==='custom'){
    if(!Array.isArray(shape.points)||shape.points.length<2){
      shape.points=[
        makeNode(shape.width*.15,shape.height*.18),
        makeNode(shape.width*.82,shape.height*.12),
        makeNode(shape.width*.9,shape.height*.72),
        makeNode(shape.width*.58,shape.height*.9),
        makeNode(shape.width*.12,shape.height*.78)
      ];
    }else{
      shape.points=shape.points.map(ensureNode);
    }
  }else if(!Array.isArray(shape.points)){
    shape.points=[];
  }

  const fill=shape.fill&&typeof shape.fill==='object'?shape.fill:{};
  shape.fill={
    enabled:fill.enabled!==false,
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
function customPathD(shape){
  const points=(shape.points||[]).map(ensureNode);
  if(!points.length)return '';
  let d=`M ${points[0].x} ${points[0].y}`;
  for(let i=1;i<points.length;i++){
    const prev=points[i-1],next=points[i];
    d+=` C ${prev.outX} ${prev.outY}, ${next.inX} ${next.inY}, ${next.x} ${next.y}`;
  }
  if(shape.closed!==false&&points.length>1){
    const last=points[points.length-1],first=points[0];
    d+=` C ${last.outX} ${last.outY}, ${first.inX} ${first.inY}, ${first.x} ${first.y} Z`;
  }
  return d;
}
function pathCanvas(ctx,shape){
  const w=shape.width,h=shape.height;
  ctx.beginPath();
  if(shape.kind==='custom'){
    const points=(shape.points||[]).map(ensureNode);
    if(points.length){
      ctx.moveTo(points[0].x,points[0].y);
      for(let i=1;i<points.length;i++){
        const prev=points[i-1],next=points[i];
        ctx.bezierCurveTo(prev.outX,prev.outY,next.inX,next.inY,next.x,next.y);
      }
      if(shape.closed!==false&&points.length>1){
        const last=points[points.length-1],first=points[0];
        ctx.bezierCurveTo(last.outX,last.outY,first.inX,first.inY,first.x,first.y);
      }
    }
  }else if(shape.kind==='rect'){
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
  if(shape.kind!=='custom'||shape.closed!==false)ctx.closePath();
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

  if(shape.fill.enabled!==false&&shape.closed!==false){
    pathCanvas(ctx,shape);
    ctx.save();
    ctx.globalAlpha=clamp(shape.fill.opacity??1,0,1);
    ctx.fillStyle=shape.fill.mode==='gradient'?canvasGradient(ctx,shape):(shape.fill.color||'#8B5CF6');
    ctx.fill();
    ctx.restore();
  }

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
  if(shape.kind==='custom'){
    node=document.createElementNS(SVG_NS,'path');
    node.setAttribute('d',customPathD(shape));
  }else if(shape.kind==='rect'||shape.kind==='roundRect'){
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


function regularPolygonPoints(shape){
  const w=shape.width,h=shape.height;
  if(shape.kind==='rect'||shape.kind==='roundRect'){
    return[
      makeNode(0,0),makeNode(w,0),makeNode(w,h),makeNode(0,h)
    ];
  }
  if(shape.kind==='circle'||shape.kind==='ellipse'){
    const rx=shape.kind==='circle'?Math.min(w,h)/2:w/2;
    const ry=shape.kind==='circle'?Math.min(w,h)/2:h/2;
    const cx=w/2,cy=h/2,k=.5522847498307936;
    const points=[
      makeNode(cx,cy-ry),
      makeNode(cx+rx,cy),
      makeNode(cx,cy+ry),
      makeNode(cx-rx,cy)
    ];
    points[0].smooth=true;points[0].inX=cx-rx*k;points[0].outX=cx+rx*k;
    points[1].smooth=true;points[1].inY=cy-ry*k;points[1].outY=cy+ry*k;
    points[2].smooth=true;points[2].inX=cx+rx*k;points[2].outX=cx-rx*k;
    points[3].smooth=true;points[3].inY=cy+ry*k;points[3].outY=cy-ry*k;
    return points;
  }
  if(shape.kind==='heart'){
    const p0=makeNode(w/2,h),p1=makeNode(w*.22,h*.22),p2=makeNode(w/2,h*.3),p3=makeNode(w*.78,h*.22);
    p0.outX=w*.12;p0.outY=h*.76;p0.inX=w*.88;p0.inY=h*.76;
    p1.inX=0;p1.inY=h*.4;p1.outX=w*.36;p1.outY=h*.1;
    p2.inX=w*.48;p2.inY=h*.16;p2.outX=w*.52;p2.outY=h*.16;
    p3.inX=w*.64;p3.inY=h*.1;p3.outX=w;p3.outY=h*.4;
    [p0,p1,p2,p3].forEach(point=>point.smooth=true);
    return[p0,p1,p2,p3];
  }
  const raw=polygon(shape.kind,w,h);
  if(raw){
    return raw.split(/\s+/).map(value=>{
      const [x,y]=value.split(',').map(Number);
      return makeNode(x,y);
    });
  }
  return[
    makeNode(w*.15,h*.18),
    makeNode(w*.82,h*.12),
    makeNode(w*.9,h*.72),
    makeNode(w*.58,h*.9),
    makeNode(w*.12,h*.78)
  ];
}
function convertShapeToCustom(shape){
  if(!shape||shape.kind==='custom')return shape;
  shape.points=regularPolygonPoints(shape);
  shape.kind='custom';
  shape.closed=true;
  shape.radius=0;
  nodeEditMode=true;
  nodeAddMode=false;
  selectedNodeIndex=0;
  return shape;
}
function worldToLocal(shape,world){
  const center={x:shape.x+shape.width/2,y:shape.y+shape.height/2};
  const vector=rotateVector(world.x-center.x,world.y-center.y,-(shape.rotation||0));
  return{x:vector.x+shape.width/2,y:vector.y+shape.height/2};
}
function pointSegmentDistance(point,a,b){
  const vx=b.x-a.x,vy=b.y-a.y;
  const wx=point.x-a.x,wy=point.y-a.y;
  const length=vx*vx+vy*vy||1;
  const t=clamp((wx*vx+wy*vy)/length,0,1);
  const x=a.x+vx*t,y=a.y+vy*t;
  return Math.hypot(point.x-x,point.y-y);
}
function nearestSegmentIndex(shape,point){
  const points=shape.points||[];
  if(points.length<2)return 0;
  let best=0,bestDistance=Infinity;
  const count=shape.closed===false?points.length-1:points.length;
  for(let i=0;i<count;i++){
    const a=points[i],b=points[(i+1)%points.length];
    const distance=pointSegmentDistance(point,a,b);
    if(distance<bestDistance){bestDistance=distance;best=i;}
  }
  return best;
}
function insertNodeAt(shape,local,index=null){
  if(!shape||shape.kind!=='custom')return;
  const point=makeNode(
    clamp(local.x,0,shape.width),
    clamp(local.y,0,shape.height)
  );
  const after=Number.isInteger(index)?index:nearestSegmentIndex(shape,point);
  shape.points.splice(Math.min(shape.points.length,after+1),0,point);
  selectedNodeIndex=Math.min(shape.points.length-1,after+1);
}
function duplicateSelectedNode(){
  const shape=selected();
  if(!shape||shape.kind!=='custom'||selectedNodeIndex==null)return;
  mutateSelected(currentShape=>{
    const point=currentShape.points[selectedNodeIndex];
    if(!point)return;
    const copy=clone(point);
    copy.x=clamp(copy.x+18,0,currentShape.width);
    copy.y=clamp(copy.y+18,0,currentShape.height);
    copy.inX+=18;copy.inY+=18;copy.outX+=18;copy.outY+=18;
    currentShape.points.splice(selectedNodeIndex+1,0,copy);
    selectedNodeIndex++;
  },'Nodo duplicado.');
}
function deleteSelectedNode(){
  const shape=selected();
  if(!shape||shape.kind!=='custom'||selectedNodeIndex==null)return;
  if(shape.points.length<=3){
    api()?.notify?.('La figura necesita al menos 3 nodos.');
    return;
  }
  mutateSelected(currentShape=>{
    currentShape.points.splice(selectedNodeIndex,1);
    selectedNodeIndex=Math.min(selectedNodeIndex,currentShape.points.length-1);
  },'Nodo eliminado.');
}
function setNodeSmooth(shape,index,smooth){
  const point=shape?.points?.[index];
  if(!point)return;
  point.smooth=!!smooth;
  if(smooth){
    const prev=shape.points[(index-1+shape.points.length)%shape.points.length]||point;
    const next=shape.points[(index+1)%shape.points.length]||point;
    const angle=Math.atan2(next.y-prev.y,next.x-prev.x);
    const distance=Math.max(12,Math.min(
      Math.hypot(point.x-prev.x,point.y-prev.y),
      Math.hypot(next.x-point.x,next.y-point.y)
    )*.28);
    point.inX=point.x-Math.cos(angle)*distance;
    point.inY=point.y-Math.sin(angle)*distance;
    point.outX=point.x+Math.cos(angle)*distance;
    point.outY=point.y+Math.sin(angle)*distance;
  }else{
    point.inX=point.x;point.inY=point.y;
    point.outX=point.x;point.outY=point.y;
  }
}
function scalePointSet(points,sx,sy){
  return(points||[]).map(raw=>{
    const point=ensureNode(raw);
    point.x*=sx;point.y*=sy;
    point.inX*=sx;point.inY*=sy;
    point.outX*=sx;point.outY*=sy;
    return point;
  });
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
    #shapeMode .sil-node-tools{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;padding:8px;border:1px solid #ddd9e8;border-radius:9px;background:#fbfaff}
    #shapeMode .sil-node-tools button{min-height:30px;border:1px solid #ded8eb;border-radius:7px;background:#fff;color:inherit;font-size:8.5px;font-weight:850}
    #shapeMode .sil-node-tools button.active{background:#efe8ff;border-color:#8b5cf6;color:#6d28d9}
    #shapeMode .sil-node-tools .full{grid-column:1/-1}
    #silhouetteShapeOverlay .sil-node{fill:#fff;stroke:#7C3AED;stroke-width:2.4;vector-effect:non-scaling-stroke;cursor:grab;pointer-events:auto}
    #silhouetteShapeOverlay .sil-node.selected{fill:#FACC15;stroke:#111827}
    #silhouetteShapeOverlay .sil-node-mid{fill:#34D399;stroke:#064E3B;stroke-width:1.5;vector-effect:non-scaling-stroke;cursor:copy;pointer-events:auto}
    #silhouetteShapeOverlay .sil-control-line{stroke:#22C55E;stroke-width:1.5;stroke-dasharray:4 3;vector-effect:non-scaling-stroke;pointer-events:none}
    #silhouetteShapeOverlay .sil-control{fill:#fff;stroke:#16A34A;stroke-width:2;vector-effect:non-scaling-stroke;cursor:crosshair;pointer-events:auto}
    #silhouetteShapeOverlay .sil-node-add-zone{fill:rgba(124,58,237,.001);stroke:none;pointer-events:all;cursor:crosshair}
    html[data-theme=night] #shapeMode .sil-node-tools{background:var(--surface-3);border-color:var(--border)}
    html[data-theme=night] #shapeMode .sil-node-tools button{background:var(--surface-2);border-color:var(--border);color:var(--text)}
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
      <button data-add="custom">✦ Forma libre</button>
    </div>
    <div class="sil-shape-heading">Capas</div>
    <div class="sil-shape-list" id="silShapeLayerList"></div>
    <div class="sil-shape-heading">Ajustes</div>
    <div id="silShapeInspector"></div>
    <p class="sil-shape-help">Arrastra = mover · puntos blancos = escalar · Ctrl + esquina = mantener proporción · punto amarillo = rotar · Shift = saltos de 15° · rueda = escalar. En Editar nodos puedes mover puntos, colocar nuevos nodos, insertar entre segmentos, borrar nodos y editar curvas Bézier.</p>
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

    if(live.kind==='custom'&&nodeEditMode&&nodeAddMode){
      const world=overlayPoint(event,state);
      const local=worldToLocal(live,world);
      mutateSelected(currentShape=>{
        insertNodeAt(currentShape,local);
      },'Nodo añadido.');
      nodeAddMode=false;
      sync(current());
      return;
    }

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
      if(start.kind==='custom'){
        live.points=scalePointSet(start.points,width/start.width,height/start.height);
      }
      api()?.render?.();renderOverlay(current());renderInspector(current());
    },()=>{api()?.endGesture?.();sync(current());api()?.notify?.('Tamaño actualizado.');});
  });
}


function bindNodeDrag(nodeEl,shape,index){
  nodeEl.addEventListener('pointerdown',event=>{
    event.preventDefault();event.stopPropagation();
    const state=current();
    const live=shapesOf(state).find(item=>item.id===shape.id);
    const point=live?.points?.[index];
    if(!live||!point)return;
    state.activeShapeId=shape.id;
    selectedNodeIndex=index;
    const startWorld=overlayPoint(event,state);
    const start=clone(point);
    api()?.beginGesture?.();
    pointerSession(event,next=>{
      const world=overlayPoint(next,current());
      const deltaWorld={x:world.x-startWorld.x,y:world.y-startWorld.y};
      const delta=localDeltaFromWorld(deltaWorld.x,deltaWorld.y,live.rotation||0);
      const x=clamp(start.x+delta.x,0,live.width);
      const y=clamp(start.y+delta.y,0,live.height);
      const dx=x-start.x,dy=y-start.y;
      point.x=x;point.y=y;
      point.inX=start.inX+dx;point.inY=start.inY+dy;
      point.outX=start.outX+dx;point.outY=start.outY+dy;
      api()?.render?.();renderOverlay(current());renderInspector(current());
    },()=>{api()?.endGesture?.();sync(current());api()?.notify?.('Nodo movido.');});
  });
}
function bindControlDrag(controlEl,shape,index,key){
  controlEl.addEventListener('pointerdown',event=>{
    event.preventDefault();event.stopPropagation();
    const state=current();
    const live=shapesOf(state).find(item=>item.id===shape.id);
    const point=live?.points?.[index];
    if(!live||!point)return;
    selectedNodeIndex=index;
    api()?.beginGesture?.();
    pointerSession(event,next=>{
      const world=overlayPoint(next,current());
      const local=worldToLocal(live,world);
      const xKey=key==='in'?'inX':'outX',yKey=key==='in'?'inY':'outY';
      const oxKey=key==='in'?'outX':'inX',oyKey=key==='in'?'outY':'inY';
      point[xKey]=local.x;point[yKey]=local.y;
      if(point.smooth){
        const oppositeLength=Math.max(8,Math.hypot(point[oxKey]-point.x,point[oyKey]-point.y));
        const vx=local.x-point.x,vy=local.y-point.y;
        const length=Math.hypot(vx,vy)||1;
        point[oxKey]=point.x-vx/length*oppositeLength;
        point[oyKey]=point.y-vy/length*oppositeLength;
      }
      api()?.render?.();renderOverlay(current());renderInspector(current());
    },()=>{api()?.endGesture?.();sync(current());api()?.notify?.('Curva actualizada.');});
  });
}
function renderNodeEditor(group,shape,state){
  if(!nodeEditMode||shape.kind!=='custom'||shape.id!==state.activeShapeId)return;
  const points=shape.points||[];
  if(!points.length)return;

  const addZone=document.createElementNS(SVG_NS,'rect');
  addZone.classList.add('sil-node-add-zone');
  addZone.setAttribute('x','0');addZone.setAttribute('y','0');
  addZone.setAttribute('width',shape.width);addZone.setAttribute('height',shape.height);
  if(nodeAddMode){
    addZone.addEventListener('pointerdown',event=>{
      event.preventDefault();event.stopPropagation();
      const world=overlayPoint(event,current());
      const local=worldToLocal(shape,world);
      mutateSelected(currentShape=>insertNodeAt(currentShape,local),'Nodo añadido.');
      nodeAddMode=false;sync(current());
    });
    group.insertBefore(addZone,group.firstChild);
  }else{
    addZone.style.pointerEvents='none';
  }

  const segmentCount=shape.closed===false?points.length-1:points.length;
  for(let index=0;index<segmentCount;index++){
    const a=points[index],b=points[(index+1)%points.length];
    const mid=document.createElementNS(SVG_NS,'circle');
    mid.classList.add('sil-node-mid');
    mid.setAttribute('cx',(a.x+b.x)/2);mid.setAttribute('cy',(a.y+b.y)/2);mid.setAttribute('r',Math.max(5,Math.min(shape.width,shape.height)*.014));
    mid.addEventListener('pointerdown',event=>{
      event.preventDefault();event.stopPropagation();
      mutateSelected(currentShape=>{
        const p1=currentShape.points[index],p2=currentShape.points[(index+1)%currentShape.points.length];
        insertNodeAt(currentShape,{x:(p1.x+p2.x)/2,y:(p1.y+p2.y)/2},index);
      },'Nodo insertado entre segmentos.');
    });
    group.appendChild(mid);
  }

  points.forEach((point,index)=>{
    if(index===selectedNodeIndex){
      [['in',point.inX,point.inY],['out',point.outX,point.outY]].forEach(([key,x,y])=>{
        const line=document.createElementNS(SVG_NS,'line');
        line.classList.add('sil-control-line');
        line.setAttribute('x1',point.x);line.setAttribute('y1',point.y);line.setAttribute('x2',x);line.setAttribute('y2',y);
        group.appendChild(line);
        const control=document.createElementNS(SVG_NS,'circle');
        control.classList.add('sil-control');control.dataset.handle=key;
        control.setAttribute('cx',x);control.setAttribute('cy',y);control.setAttribute('r',Math.max(5,Math.min(shape.width,shape.height)*.013));
        bindControlDrag(control,shape,index,key);
        group.appendChild(control);
      });
    }

    const node=document.createElementNS(SVG_NS,'circle');
    node.classList.add('sil-node');
    if(index===selectedNodeIndex)node.classList.add('selected');
    node.dataset.nodeIndex=String(index);
    node.setAttribute('cx',point.x);node.setAttribute('cy',point.y);node.setAttribute('r',Math.max(6,Math.min(shape.width,shape.height)*.016));
    node.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();selectedNodeIndex=index;renderOverlay(current());renderInspector(current());});
    bindNodeDrag(node,shape,index);
    group.appendChild(node);
  });
}

function renderOverlay(state=current()){
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
      state.activeShapeId=shape.id;selectedNodeIndex=shape.kind==='custom'?0:null;nodeAddMode=false;sync(state);
    });
    bindMove(group,shape);
    bindRotation(rotator,shape);
    renderNodeEditor(group,shape,state);
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
      state.activeShapeId=shape.id;selectedNodeIndex=shape.kind==='custom'?0:null;nodeAddMode=false;sync(state);
    });

    $$('button',row).forEach(button=>button.addEventListener('click',event=>{
      event.stopPropagation();
      const action=button.dataset.act;
      mutate(next=>{
        const list=shapesOf(next);
        const index=list.findIndex(item=>item.id===shape.id);
        if(index<0)return;
        if(action==='del'){
          list.splice(index,1);next.activeShapeId=list.at(-1)?.id||null;selectedNodeIndex=null;nodeAddMode=false;
        }else if(action==='dup'){
          const copy=clone(list[index]);copy.id=uid();copy.name=`${copy.name} copia`;copy.x+=24;copy.y+=24;
          list.splice(index+1,0,copy);next.activeShapeId=copy.id;selectedNodeIndex=copy.kind==='custom'?0:null;nodeAddMode=false;
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

    <div class="sil-node-tools">
      <button class="full" data-convert-nodes type="button">${shape.kind==='custom'?'✓ Figura editable por nodos':'✦ Convertir figura a nodos'}</button>
      <button data-edit-nodes type="button">Editar nodos</button>
      <button data-add-node type="button">＋ Colocar nodo</button>
      <button data-duplicate-node type="button">⧉ Duplicar nodo</button>
      <button data-delete-node type="button">− Borrar nodo</button>
      <button data-node-corner type="button">Nodo esquina</button>
      <button data-node-smooth type="button">Nodo suave</button>
      <label class="sil-shape-check full"><span>Cerrar trazado</span><input data-shape-closed type="checkbox"></label>
      <div class="sil-shape-gradient full" data-node-position>
        <label class="sil-shape-field"><span>Nodo X</span><input data-node-x type="number" step="1"></label>
        <label class="sil-shape-field"><span>Nodo Y</span><input data-node-y type="number" step="1"></label>
      </div>
    </div>

    <div class="sil-shape-paint">
      <strong>Relleno</strong>
      <label class="sil-shape-check"><span>Activar relleno</span><input data-fill-enabled type="checkbox"></label>
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
      if((prop==='width'||prop==='height')&&shape.kind==='custom'){
        const oldW=shape.width,oldH=shape.height;
        const nextValue=Math.max(12,Number(value)||12);
        if(prop==='width'){
          shape.width=nextValue;
          shape.points=scalePointSet(shape.points,shape.width/oldW,1);
        }else{
          shape.height=nextValue;
          shape.points=scalePointSet(shape.points,1,shape.height/oldH);
        }
      }else{
        shape[prop]=prop==='width'||prop==='height'?Math.max(12,Number(value)||12):value;
      }
      if(out)out.textContent=prop==='rotation'?`${Math.round(Number(value))}°`:`${Math.round(Number(value))}`;
      api()?.render?.();renderOverlay(current());renderLayerList(current());
    });
    bindGestureInput(input);
  });

  const convertButton=$('[data-convert-nodes]',box);
  const editButton=$('[data-edit-nodes]',box);
  const addNodeButton=$('[data-add-node]',box);
  const duplicateNodeButton=$('[data-duplicate-node]',box);
  const deleteNodeButton=$('[data-delete-node]',box);
  const cornerButton=$('[data-node-corner]',box);
  const smoothButton=$('[data-node-smooth]',box);
  const closedInput=$('[data-shape-closed]',box);
  const nodePosition=$('[data-node-position]',box);
  const nodeX=$('[data-node-x]',box),nodeY=$('[data-node-y]',box);

  const custom=shape.kind==='custom';
  editButton.disabled=!custom;
  addNodeButton.disabled=!custom;
  duplicateNodeButton.disabled=!custom||selectedNodeIndex==null;
  deleteNodeButton.disabled=!custom||selectedNodeIndex==null||shape.points.length<=3;
  cornerButton.disabled=!custom||selectedNodeIndex==null;
  smoothButton.disabled=!custom||selectedNodeIndex==null;
  closedInput.disabled=!custom;
  closedInput.checked=shape.closed!==false;
  editButton.classList.toggle('active',custom&&nodeEditMode);
  addNodeButton.classList.toggle('active',custom&&nodeAddMode);

  convertButton.addEventListener('click',()=>{
    if(shape.kind!=='custom'){
      mutateSelected(currentShape=>convertShapeToCustom(currentShape),'Figura convertida a nodos.');
    }else{
      nodeEditMode=true;
      selectedNodeIndex=selectedNodeIndex??0;
      sync(current());
    }
  });
  editButton.addEventListener('click',()=>{
    if(shape.kind!=='custom')return;
    nodeEditMode=!nodeEditMode;
    nodeAddMode=false;
    if(nodeEditMode&&selectedNodeIndex==null)selectedNodeIndex=0;
    sync(current());
  });
  addNodeButton.addEventListener('click',()=>{
    if(shape.kind!=='custom')return;
    nodeEditMode=true;
    nodeAddMode=!nodeAddMode;
    sync(current());
    api()?.notify?.(nodeAddMode?'Haz clic dentro del transformador para colocar el nodo.':'Colocación de nodos cancelada.');
  });
  duplicateNodeButton.addEventListener('click',duplicateSelectedNode);
  deleteNodeButton.addEventListener('click',deleteSelectedNode);
  cornerButton.addEventListener('click',()=>mutateSelected(currentShape=>setNodeSmooth(currentShape,selectedNodeIndex,false),'Nodo convertido en esquina.'));
  smoothButton.addEventListener('click',()=>mutateSelected(currentShape=>setNodeSmooth(currentShape,selectedNodeIndex,true),'Nodo suavizado.'));
  closedInput.addEventListener('change',()=>mutateSelected(currentShape=>{currentShape.closed=closedInput.checked;},'Trazado actualizado.'));

  const activePoint=custom&&selectedNodeIndex!=null?shape.points[selectedNodeIndex]:null;
  nodePosition.style.display=activePoint?'grid':'none';
  if(activePoint){
    nodeX.value=Math.round(activePoint.x*100)/100;
    nodeY.value=Math.round(activePoint.y*100)/100;
    const updateNodePosition=()=>{
      const point=shape.points[selectedNodeIndex];
      if(!point)return;
      const nextX=clamp(Number(nodeX.value)||0,0,shape.width);
      const nextY=clamp(Number(nodeY.value)||0,0,shape.height);
      const dx=nextX-point.x,dy=nextY-point.y;
      point.x=nextX;point.y=nextY;
      point.inX+=dx;point.inY+=dy;point.outX+=dx;point.outY+=dy;
      api()?.render?.();renderOverlay(current());
    };
    nodeX.addEventListener('input',updateNodePosition);
    nodeY.addEventListener('input',updateNodePosition);
    [nodeX,nodeY].forEach(bindGestureInput);
  }

  const radiusRow=$('[data-radius-row]',box);
  if(radiusRow)radiusRow.style.display=shape.kind==='roundRect'?'':'none';

  const fillEnabled=$('[data-fill-enabled]',box);
  fillEnabled.checked=shape.fill.enabled!==false;
  fillEnabled.disabled=shape.closed===false;
  fillEnabled.addEventListener('change',()=>mutateSelected(s=>{s.fill.enabled=fillEnabled.checked;},'Relleno actualizado.'));

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
      event.preventDefault();event.stopImmediatePropagation();
      if(nodeEditMode&&selected(state)?.kind==='custom'&&selectedNodeIndex!=null)deleteSelectedNode();
      else deleteSelected();
      return;
    }
    if(event.key==='Escape'){
      if(nodeAddMode){nodeAddMode=false;sync(state);return;}
      if(nodeEditMode){nodeEditMode=false;selectedNodeIndex=null;sync(state);return;}
      state.activeShapeId=null;sync(state);return;
    }
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)&&selected(state)){
      event.preventDefault();event.stopImmediatePropagation();
      const step=event.shiftKey?10:1;
      const shape=selected(state);
      if(nodeEditMode&&shape.kind==='custom'&&selectedNodeIndex!=null&&shape.points[selectedNodeIndex]){
        mutateSelected(currentShape=>{
          const point=currentShape.points[selectedNodeIndex];
          const dx=event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0;
          const dy=event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0;
          const nextX=clamp(point.x+dx,0,currentShape.width);
          const nextY=clamp(point.y+dy,0,currentShape.height);
          const mx=nextX-point.x,my=nextY-point.y;
          point.x=nextX;point.y=nextY;
          point.inX+=mx;point.inY+=my;point.outX+=mx;point.outY+=my;
        },'Nodo movido.');
      }else{
        mutateSelected(currentShape=>{
          if(event.key==='ArrowLeft')currentShape.x-=step;
          if(event.key==='ArrowRight')currentShape.x+=step;
          if(event.key==='ArrowUp')currentShape.y-=step;
          if(event.key==='ArrowDown')currentShape.y+=step;
        },'Forma movida.');
      }
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
      const oldW=s.width,oldH=s.height;
      s.width=Math.max(12,s.width*factor);s.height=Math.max(12,s.height*factor);
      s.x=cx-s.width/2;s.y=cy-s.height/2;
      if(s.kind==='custom')s.points=scalePointSet(s.points,s.width/oldW,s.height/oldH);
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

window.SilhouetteShapeFill={draw,sync,duplicateSelected,deleteSelected,convertSelectedToNodes:()=>mutateSelected(shape=>convertShapeToCustom(shape),'Figura convertida a nodos.')};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();

}());
