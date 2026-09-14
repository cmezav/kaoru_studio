(function(){
'use strict';

const api=()=>window.ImageCombinerStudio||null;
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const SVG_NS='http://www.w3.org/2000/svg';

let panel=null;
let overlay=null;
let defs=null;
let layerGroup=null;
let selectedId=null;
let layerCounter=1;
let renderBusy=false;

function clone(v){return JSON.parse(JSON.stringify(v));}
function uid(){return `shape-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;}
function current(){return api()?.getState?.()||null;}
function shapesOf(state=current()){return Array.isArray(state?.shapes)?state.shapes:[];}
function selected(state=current()){return shapesOf(state).find(s=>s.id===selectedId)||null;}

function gradientDefault(){
  return {
    angle:45,
    stops:[
      {offset:0,color:'#A855F7',opacity:1},
      {offset:100,color:'#22D3EE',opacity:1}
    ]
  };
}
function imageDefault(){
  return {
    src:'',
    scale:1,
    offsetX:0,
    offsetY:0,
    rotation:0
  };
}
function paintDefault(color){
  return {
    enabled:true,
    mode:'solid',
    color,
    opacity:1,
    gradient:gradientDefault(),
    image:imageDefault()
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
  const cw=Math.max(1,state?.canvas?.width||1080);
  const ch=Math.max(1,state?.canvas?.height||1080);
  const w=Math.max(80,Math.round(cw*.22));
  const h=Math.max(70,Math.round(ch*.16));
  return {
    id:uid(),
    kind,
    name:`${names[kind]||'Forma'} ${layerCounter++}`,
    x:Math.round((cw-w)/2),
    y:Math.round((ch-h)/2),
    width:w,
    height:h,
    rotation:0,
    radius:30,
    strokeWidth:10,
    fill:paintDefault('#8B5CF6'),
    stroke:paintDefault('#FFFFFF'),
    visible:true
  };
}

function ensurePaint(paint,color){
  paint=paint&&typeof paint==='object'?paint:{};
  return {
    enabled:paint.enabled!==false,
    mode:['solid','gradient','image','none'].includes(paint.mode)?paint.mode:'solid',
    color:paint.color||color,
    opacity:clamp(paint.opacity??1,0,1),
    gradient:{
      angle:Number(paint.gradient?.angle??45),
      stops:Array.isArray(paint.gradient?.stops)&&paint.gradient.stops.length>=2
        ?paint.gradient.stops.map(s=>({
            offset:clamp(s.offset,0,100),
            color:s.color||'#FFFFFF',
            opacity:clamp(s.opacity??1,0,1)
          }))
        :gradientDefault().stops
    },
    image:{
      ...imageDefault(),
      ...(paint.image||{})
    }
  };
}
function ensureShape(shape){
  shape=shape&&typeof shape==='object'?shape:{};
  shape.id=shape.id||uid();
  shape.kind=shape.kind||'rect';
  shape.name=shape.name||'Forma';
  shape.x=Number(shape.x)||0;
  shape.y=Number(shape.y)||0;
  shape.width=Math.max(4,Number(shape.width)||200);
  shape.height=Math.max(4,Number(shape.height)||140);
  shape.rotation=Number(shape.rotation)||0;
  shape.radius=Math.max(0,Number(shape.radius)||0);
  shape.strokeWidth=Math.max(0,Number(shape.strokeWidth)||0);
  shape.visible=shape.visible!==false;
  shape.fill=ensurePaint(shape.fill,'#8B5CF6');
  shape.stroke=ensurePaint(shape.stroke,'#FFFFFF');
  return shape;
}
function ensureState(commit=false){
  const studio=api();
  if(!studio?.mutate) return false;
  studio.mutate(state=>{
    if(!Array.isArray(state.shapes)) state.shapes=[];
    state.shapes=state.shapes.map(ensureShape);
  },'Figuras inicializadas',commit);
  return true;
}
function mutate(fn,label='Figura actualizada',commit=true){
  const studio=api();
  if(!studio?.mutate) return null;
  const result=studio.mutate(state=>{
    if(!Array.isArray(state.shapes)) state.shapes=[];
    fn(state,state.shapes);
  },label,commit);
  sync(result);
  return result;
}
function mutateSelected(fn,label='Figura actualizada',commit=true){
  if(!selectedId)return;
  mutate((state,shapes)=>{
    const shape=shapes.find(s=>s.id===selectedId);
    if(shape)fn(shape,state);
  },label,commit);
}

function notify(text){
  api()?.notify?.(text);
  const node=$('#shapeStudioStatus');
  if(node)node.textContent=text;
}

function injectStyles(){
  if($('#kaoruShapeStudioStyles'))return;
  const style=document.createElement('style');
  style.id='kaoruShapeStudioStyles';
  style.textContent=`
    #kaoruShapeStudio .shape-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
    #kaoruShapeStudio .shape-grid button,#kaoruShapeStudio .shape-mini,#kaoruShapeStudio .shape-layer-actions button{min-height:30px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:inherit;cursor:pointer}
    #kaoruShapeStudio .shape-grid button:hover,#kaoruShapeStudio .shape-mini:hover,#kaoruShapeStudio .shape-layer-actions button:hover{border-color:var(--accent)}
    #kaoruShapeStudio .shape-heading{margin:10px 0 6px;font-size:8px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
    #kaoruShapeStudio .shape-layers{display:flex;flex-direction:column;gap:5px;max-height:165px;overflow:auto}
    #kaoruShapeStudio .shape-layer{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px;padding:6px;border:1px solid var(--line);border-radius:8px;background:var(--surface)}
    #kaoruShapeStudio .shape-layer.active{border-color:var(--accent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 28%,transparent)}
    #kaoruShapeStudio .shape-layer-name{font-size:8.5px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #kaoruShapeStudio .shape-layer-meta{margin-top:2px;font-size:7px;color:var(--muted)}
    #kaoruShapeStudio .shape-layer-actions{display:flex;gap:3px}
    #kaoruShapeStudio .shape-layer-actions button{min-width:25px;padding:2px 5px;font-size:8px}
    #kaoruShapeStudio .shape-grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px}
    #kaoruShapeStudio .shape-field{display:flex;flex-direction:column;gap:4px}
    #kaoruShapeStudio .shape-field.full{grid-column:1/-1}
    #kaoruShapeStudio .shape-field>span{font-size:7.6px;font-weight:800;color:var(--muted)}
    #kaoruShapeStudio .shape-field input[type=number],#kaoruShapeStudio .shape-field input[type=text],#kaoruShapeStudio .shape-field select{width:100%;min-height:29px;padding:5px 6px;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:inherit;font-size:8px}
    #kaoruShapeStudio .shape-field input[type=color]{width:100%;height:31px;padding:2px;border:1px solid var(--line);border-radius:7px;background:var(--surface)}
    #kaoruShapeStudio .shape-range{display:grid;grid-template-columns:minmax(0,1fr) 43px;gap:5px;align-items:center}
    #kaoruShapeStudio .shape-range input{width:100%}
    #kaoruShapeStudio .shape-range output{font-size:7.2px;text-align:right;color:var(--muted)}
    #kaoruShapeStudio .shape-paint{grid-column:1/-1;padding:7px;border:1px solid var(--line);border-radius:8px;background:color-mix(in srgb,var(--surface) 92%,transparent)}
    #kaoruShapeStudio .shape-paint-head{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:7px}
    #kaoruShapeStudio .shape-paint-head strong{font-size:8.5px}
    #kaoruShapeStudio .shape-stop-list{display:flex;flex-direction:column;gap:5px;margin:5px 0}
    #kaoruShapeStudio .shape-stop{display:grid;grid-template-columns:34px 1fr 42px 24px;gap:4px;align-items:center}
    #kaoruShapeStudio .shape-stop input[type=color]{width:34px;height:28px;padding:1px;border:1px solid var(--line);border-radius:6px;background:transparent}
    #kaoruShapeStudio .shape-stop input[type=range]{width:100%}
    #kaoruShapeStudio .shape-stop input[type=number]{width:42px;min-height:28px;padding:3px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:inherit;font-size:7px}
    #kaoruShapeStudio .shape-stop button{height:28px;border:1px solid var(--line);border-radius:6px;background:var(--surface);color:inherit}
    #kaoruShapeStudio .shape-status{margin-top:8px;font-size:7.4px;line-height:1.35;color:var(--muted)}
    #kaoruShapeOverlay{position:absolute;inset:0;width:100%;height:100%;z-index:30;pointer-events:none;overflow:visible}
    #kaoruShapeOverlay .kaoru-shape-node{pointer-events:auto;cursor:move}
    #kaoruShapeOverlay .kaoru-shape-node.selected .kaoru-shape-box{display:block}
    #kaoruShapeOverlay .kaoru-shape-box{display:none;fill:none;stroke:#FACC15;stroke-width:2;stroke-dasharray:8 5;vector-effect:non-scaling-stroke;pointer-events:none}
    #kaoruShapeOverlay .kaoru-shape-rotator{display:none;fill:#FACC15;stroke:#111827;stroke-width:2;vector-effect:non-scaling-stroke;cursor:grab;pointer-events:auto}
    #kaoruShapeOverlay .kaoru-shape-node.selected .kaoru-shape-rotator{display:block}
  `;
  document.head.appendChild(style);
}

function buildPanel(){
  if(panel)return;
  const settings=$('.settings-panel');
  if(!settings)return;

  const section=document.createElement('section');
  section.id='kaoruShapeStudio';
  section.className='panel-section shape-section';
  section.innerHTML=`
    <div class="section-title"><span>✦</span><h2>Figuras y formas</h2></div>

    <div class="shape-heading">Agregar figura</div>
    <div class="shape-grid">
      <button data-add-shape="rect" type="button">Rectángulo</button>
      <button data-add-shape="roundRect" type="button">Redondeado</button>
      <button data-add-shape="circle" type="button">Círculo</button>
      <button data-add-shape="ellipse" type="button">Elipse</button>
      <button data-add-shape="triangle" type="button">Triángulo</button>
      <button data-add-shape="diamond" type="button">Diamante</button>
      <button data-add-shape="hexagon" type="button">Hexágono</button>
      <button data-add-shape="star" type="button">Estrella</button>
      <button data-add-shape="heart" type="button">Corazón</button>
      <button data-add-shape="arrow" type="button">Flecha</button>
    </div>

    <div class="shape-heading">Capas de figuras</div>
    <div class="shape-layers" id="shapeLayerList"></div>

    <div class="shape-heading">Ajustes</div>
    <div id="shapeInspector"></div>

    <p class="shape-status" id="shapeStudioStatus">
      Las figuras se guardan con el proyecto y aparecen también en las exportaciones.
    </p>
  `;

  const project=$('.project-section');
  if(project?.parentNode){
    project.parentNode.insertBefore(section,project);
  }else{
    settings.appendChild(section);
  }

  panel=section;

  $$('[data-add-shape]',section).forEach(btn=>{
    btn.addEventListener('click',()=>{
      const state=current();
      const shape=shapeDefault(btn.dataset.addShape,state);
      mutate((next,shapes)=>{
        shapes.push(shape);
        selectedId=shape.id;
      },'Figura añadida');
      notify(`${shape.name} añadida.`);
    });
  });
}

function ensureOverlay(){
  if(overlay)return;
  const stage=$('#canvasStage');
  if(!stage)return;

  if(getComputedStyle(stage).position==='static'){
    stage.style.position='relative';
  }

  overlay=document.createElementNS(SVG_NS,'svg');
  overlay.id='kaoruShapeOverlay';
  overlay.setAttribute('preserveAspectRatio','none');
  overlay.innerHTML='<defs></defs><g id="kaoruShapeLayer"></g>';
  stage.appendChild(overlay);

  defs=$('defs',overlay);
  layerGroup=$('#kaoruShapeLayer',overlay);

  overlay.addEventListener('pointerdown',event=>{
    if(event.target===overlay){
      selectedId=null;
      sync(current());
    }
  });
}

function syncOverlaySize(state){
  if(!overlay)return;
  const w=Math.max(1,state?.canvas?.width||1080);
  const h=Math.max(1,state?.canvas?.height||1080);
  overlay.setAttribute('viewBox',`0 0 ${w} ${h}`);
}

function polygon(kind,w,h){
  if(kind==='triangle')return `${w/2},0 ${w},${h} 0,${h}`;
  if(kind==='diamond')return `${w/2},0 ${w},${h/2} ${w/2},${h} 0,${h/2}`;
  if(kind==='hexagon')return `${w*.25},0 ${w*.75},0 ${w},${h/2} ${w*.75},${h} ${w*.25},${h} 0,${h/2}`;
  if(kind==='arrow')return `${w*.06},${h*.34} ${w*.58},${h*.34} ${w*.58},0 ${w},${h/2} ${w*.58},${h} ${w*.58},${h*.66} ${w*.06},${h*.66}`;
  if(kind==='star'){
    const cx=w/2,cy=h/2,outer=Math.min(w,h)/2,inner=outer*.45,pts=[];
    for(let i=0;i<10;i++){
      const a=(-90+i*36)*Math.PI/180;
      const r=i%2===0?outer:inner;
      pts.push(`${cx+Math.cos(a)*r},${cy+Math.sin(a)*r}`);
    }
    return pts.join(' ');
  }
  return '';
}
function heartPath(w,h){
  return `M ${w/2} ${h} C ${w*.12} ${h*.76}, 0 ${h*.4}, ${w*.22} ${h*.22} C ${w*.36} ${h*.1}, ${w*.48} ${h*.16}, ${w/2} ${h*.3} C ${w*.52} ${h*.16}, ${w*.64} ${h*.1}, ${w*.78} ${h*.22} C ${w} ${h*.4}, ${w*.88} ${h*.76}, ${w/2} ${h} Z`;
}
function svgShapeElement(shape){
  const w=shape.width,h=shape.height;
  let node;

  if(shape.kind==='rect'||shape.kind==='roundRect'){
    node=document.createElementNS(SVG_NS,'rect');
    node.setAttribute('x','0');node.setAttribute('y','0');
    node.setAttribute('width',w);node.setAttribute('height',h);
    if(shape.kind==='roundRect'){
      node.setAttribute('rx',clamp(shape.radius,0,Math.min(w,h)/2));
      node.setAttribute('ry',clamp(shape.radius,0,Math.min(w,h)/2));
    }
  }else if(shape.kind==='circle'||shape.kind==='ellipse'){
    node=document.createElementNS(SVG_NS,'ellipse');
    node.setAttribute('cx',w/2);node.setAttribute('cy',h/2);
    const r=Math.min(w,h)/2;
    node.setAttribute('rx',shape.kind==='circle'?r:w/2);
    node.setAttribute('ry',shape.kind==='circle'?r:h/2);
  }else if(shape.kind==='heart'){
    node=document.createElementNS(SVG_NS,'path');
    node.setAttribute('d',heartPath(w,h));
  }else{
    node=document.createElementNS(SVG_NS,'polygon');
    node.setAttribute('points',polygon(shape.kind,w,h));
  }
  return node;
}

function svgPaint(shape,paint,key){
  if(!paint?.enabled||paint.mode==='none')return 'none';
  if(paint.mode==='solid')return paint.color||'#ffffff';

  const id=`kshape-${shape.id}-${key}`;

  if(paint.mode==='gradient'){
    const grad=document.createElementNS(SVG_NS,'linearGradient');
    grad.id=id;
    const angle=(Number(paint.gradient?.angle)||0)*Math.PI/180;
    const x1=50-Math.cos(angle)*50;
    const y1=50-Math.sin(angle)*50;
    const x2=50+Math.cos(angle)*50;
    const y2=50+Math.sin(angle)*50;
    grad.setAttribute('x1',`${x1}%`);
    grad.setAttribute('y1',`${y1}%`);
    grad.setAttribute('x2',`${x2}%`);
    grad.setAttribute('y2',`${y2}%`);
    (paint.gradient?.stops||[]).forEach(stop=>{
      const s=document.createElementNS(SVG_NS,'stop');
      s.setAttribute('offset',`${clamp(stop.offset,0,100)}%`);
      s.setAttribute('stop-color',stop.color||'#fff');
      s.setAttribute('stop-opacity',clamp(stop.opacity??1,0,1));
      grad.appendChild(s);
    });
    defs.appendChild(grad);
    return `url(#${id})`;
  }

  if(paint.mode==='image'&&paint.image?.src){
    const pattern=document.createElementNS(SVG_NS,'pattern');
    pattern.id=id;
    pattern.setAttribute('patternUnits','userSpaceOnUse');
    pattern.setAttribute('width','240');
    pattern.setAttribute('height','240');

    const cfg=paint.image;
    pattern.setAttribute(
      'patternTransform',
      `translate(${Number(cfg.offsetX)||0} ${Number(cfg.offsetY)||0}) rotate(${Number(cfg.rotation)||0}) scale(${Number(cfg.scale)||1})`
    );

    const img=document.createElementNS(SVG_NS,'image');
    img.setAttribute('href',cfg.src);
    img.setAttribute('width','240');
    img.setAttribute('height','240');
    img.setAttribute('preserveAspectRatio','xMidYMid slice');
    pattern.appendChild(img);
    defs.appendChild(pattern);
    return `url(#${id})`;
  }

  return 'none';
}

function renderOverlay(state){
  ensureOverlay();
  if(!overlay||!layerGroup)return;

  syncOverlaySize(state);
  defs.replaceChildren();
  layerGroup.replaceChildren();

  shapesOf(state).forEach(shape=>{
    ensureShape(shape);
    if(shape.visible===false)return;

    const group=document.createElementNS(SVG_NS,'g');
    group.classList.add('kaoru-shape-node');
    if(shape.id===selectedId)group.classList.add('selected');
    group.dataset.shapeId=shape.id;
    group.setAttribute(
      'transform',
      `translate(${shape.x} ${shape.y}) rotate(${shape.rotation} ${shape.width/2} ${shape.height/2})`
    );

    const node=svgShapeElement(shape);
    node.setAttribute('fill',svgPaint(shape,shape.fill,'fill'));
    node.setAttribute('fill-opacity',clamp(shape.fill.opacity??1,0,1));
    node.setAttribute('stroke',shape.stroke.enabled?svgPaint(shape,shape.stroke,'stroke'):'none');
    node.setAttribute('stroke-opacity',clamp(shape.stroke.opacity??1,0,1));
    node.setAttribute('stroke-width',shape.stroke.enabled?Math.max(0,shape.strokeWidth):0);
    node.setAttribute('vector-effect','non-scaling-stroke');
    group.appendChild(node);

    const box=document.createElementNS(SVG_NS,'rect');
    box.classList.add('kaoru-shape-box');
    box.setAttribute('x','0');box.setAttribute('y','0');
    box.setAttribute('width',shape.width);box.setAttribute('height',shape.height);
    group.appendChild(box);

    const rot=document.createElementNS(SVG_NS,'circle');
    rot.classList.add('kaoru-shape-rotator');
    rot.setAttribute('cx',shape.width/2);
    rot.setAttribute('cy',-Math.max(18,shape.height*.08));
    rot.setAttribute('r',Math.max(7,Math.min(shape.width,shape.height)*.018));
    group.appendChild(rot);

    bindShapeDrag(group,rot,shape,state);
    layerGroup.appendChild(group);
  });
}

function bindShapeDrag(group,rotator,shape,state){
  let drag=null;
  let rotate=null;

  group.addEventListener('pointerdown',event=>{
    if(event.target===rotator)return;
    event.preventDefault();
    event.stopPropagation();
    selectedId=shape.id;
    sync(current());

    const rect=overlay.getBoundingClientRect();
    const sx=(state.canvas.width||1080)/Math.max(1,rect.width);
    const sy=(state.canvas.height||1080)/Math.max(1,rect.height);

    drag={
      pointerId:event.pointerId,
      clientX:event.clientX,
      clientY:event.clientY,
      x:shape.x,
      y:shape.y,
      sx,sy
    };
    group.setPointerCapture?.(event.pointerId);
  });

  group.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.pointerId)return;
    const nx=drag.x+(event.clientX-drag.clientX)*drag.sx;
    const ny=drag.y+(event.clientY-drag.clientY)*drag.sy;
    mutateSelected(s=>{
      s.x=nx;s.y=ny;
    },'Mover figura',false);
  });

  const finishMove=event=>{
    if(!drag||event.pointerId!==drag.pointerId)return;
    drag=null;
    api()?.commit?.('Mover figura');
  };
  group.addEventListener('pointerup',finishMove);
  group.addEventListener('pointercancel',finishMove);

  rotator.addEventListener('pointerdown',event=>{
    event.preventDefault();
    event.stopPropagation();
    selectedId=shape.id;

    const rect=overlay.getBoundingClientRect();
    const sx=(state.canvas.width||1080)/Math.max(1,rect.width);
    const sy=(state.canvas.height||1080)/Math.max(1,rect.height);
    const centerX=shape.x+shape.width/2;
    const centerY=shape.y+shape.height/2;
    const px=(event.clientX-rect.left)*sx;
    const py=(event.clientY-rect.top)*sy;

    rotate={
      pointerId:event.pointerId,
      centerX,centerY,
      startAngle:Math.atan2(py-centerY,px-centerX)*180/Math.PI,
      rotation:shape.rotation
    };
    rotator.setPointerCapture?.(event.pointerId);
  });

  rotator.addEventListener('pointermove',event=>{
    if(!rotate||event.pointerId!==rotate.pointerId)return;

    const rect=overlay.getBoundingClientRect();
    const sx=(state.canvas.width||1080)/Math.max(1,rect.width);
    const sy=(state.canvas.height||1080)/Math.max(1,rect.height);
    const px=(event.clientX-rect.left)*sx;
    const py=(event.clientY-rect.top)*sy;
    const angle=Math.atan2(py-rotate.centerY,px-rotate.centerX)*180/Math.PI;

    mutateSelected(s=>{
      s.rotation=rotate.rotation+(angle-rotate.startAngle);
    },'Rotar figura',false);
  });

  const finishRotate=event=>{
    if(!rotate||event.pointerId!==rotate.pointerId)return;
    rotate=null;
    api()?.commit?.('Rotar figura');
  };
  rotator.addEventListener('pointerup',finishRotate);
  rotator.addEventListener('pointercancel',finishRotate);
}

function getPath(obj,path){
  return path.split('.').reduce((v,k)=>v?.[k],obj);
}
function setPath(obj,path,value){
  const parts=path.split('.');
  const last=parts.pop();
  let ref=obj;
  parts.forEach(key=>{
    if(!ref[key]||typeof ref[key]!=='object')ref[key]={};
    ref=ref[key];
  });
  ref[last]=value;
}
function outputText(path,value){
  if(path.includes('opacity'))return `${Math.round(Number(value)*100)}%`;
  if(path.includes('rotation')||path.includes('angle'))return `${Math.round(Number(value))}°`;
  if(path.includes('scale'))return `${Number(value).toFixed(2)}×`;
  return String(value);
}
function paintUi(prefix,label){
  return `
    <div class="shape-paint">
      <div class="shape-paint-head">
        <strong>${label}</strong>
        <button class="shape-mini" data-action="${prefix}-toggle" type="button">Activar / desactivar</button>
      </div>

      <div class="shape-grid2">
        <label class="shape-field full">
          <span>Tipo</span>
          <select data-bind="${prefix}.mode">
            <option value="solid">Color sólido</option>
            <option value="gradient">Degradado</option>
            <option value="image">Imagen</option>
            <option value="none">Sin ${label.toLowerCase()}</option>
          </select>
        </label>

        <label class="shape-field full">
          <span>Opacidad</span>
          <div class="shape-range">
            <input data-bind="${prefix}.opacity" type="range" min="0" max="1" step="0.01">
            <output data-out="${prefix}.opacity"></output>
          </div>
        </label>

        <div class="shape-field full" data-mode="${prefix}:solid">
          <span>Color</span>
          <input data-bind="${prefix}.color" type="color">
        </div>

        <div class="shape-field full" data-mode="${prefix}:gradient">
          <span>Ángulo del degradado</span>
          <div class="shape-range">
            <input data-bind="${prefix}.gradient.angle" type="range" min="0" max="360" step="1">
            <output data-out="${prefix}.gradient.angle"></output>
          </div>

          <div class="shape-stop-list" data-stops="${prefix}"></div>
          <button class="shape-mini" data-action="${prefix}-add-stop" type="button">+ Punto de degradado</button>
        </div>

        <div class="shape-field full" data-mode="${prefix}:image">
          <span>Imagen</span>
          <input data-upload="${prefix}" type="file" accept="image/*">

          <span>Escala</span>
          <div class="shape-range">
            <input data-bind="${prefix}.image.scale" type="range" min="0.1" max="4" step="0.01">
            <output data-out="${prefix}.image.scale"></output>
          </div>

          <div class="shape-grid2">
            <label class="shape-field">
              <span>Desplazar X</span>
              <input data-bind="${prefix}.image.offsetX" type="number" step="1">
            </label>
            <label class="shape-field">
              <span>Desplazar Y</span>
              <input data-bind="${prefix}.image.offsetY" type="number" step="1">
            </label>
          </div>

          <span>Rotar imagen</span>
          <div class="shape-range">
            <input data-bind="${prefix}.image.rotation" type="range" min="-180" max="180" step="1">
            <output data-out="${prefix}.image.rotation"></output>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderLayerList(state){
  const host=$('#shapeLayerList',panel);
  if(!host)return;
  host.replaceChildren();

  const shapes=shapesOf(state);
  if(!shapes.length){
    host.innerHTML='<div class="shape-layer-meta">Aún no hay figuras.</div>';
    return;
  }

  [...shapes].reverse().forEach(shape=>{
    const row=document.createElement('div');
    row.className='shape-layer'+(shape.id===selectedId?' active':'');
    row.innerHTML=`
      <div>
        <div class="shape-layer-name">${shape.name}</div>
        <div class="shape-layer-meta">${shape.kind} · ${Math.round(shape.width)}×${Math.round(shape.height)} · ${Math.round(shape.rotation)}°</div>
      </div>
      <div class="shape-layer-actions">
        <button data-act="up" type="button" title="Subir">↑</button>
        <button data-act="down" type="button" title="Bajar">↓</button>
        <button data-act="dup" type="button" title="Duplicar">⧉</button>
        <button data-act="del" type="button" title="Eliminar">✕</button>
      </div>
    `;

    row.addEventListener('click',event=>{
      if(event.target.closest('button'))return;
      selectedId=shape.id;
      sync(current());
    });

    $$('button',row).forEach(btn=>{
      btn.addEventListener('click',event=>{
        event.stopPropagation();
        const act=btn.dataset.act;
        mutate((next,list)=>{
          const index=list.findIndex(s=>s.id===shape.id);
          if(index<0)return;

          if(act==='del'){
            list.splice(index,1);
            selectedId=list.at(-1)?.id||null;
          }else if(act==='dup'){
            const copy=clone(list[index]);
            copy.id=uid();
            copy.name=`${copy.name} copia`;
            copy.x+=18;copy.y+=18;
            list.splice(index+1,0,copy);
            selectedId=copy.id;
          }else if(act==='up'&&index<list.length-1){
            [list[index],list[index+1]]=[list[index+1],list[index]];
          }else if(act==='down'&&index>0){
            [list[index],list[index-1]]=[list[index-1],list[index]];
          }
        },act==='del'?'Figura eliminada':'Orden de figura actualizado');
      });
    });

    host.appendChild(row);
  });
}

function renderStops(host,shape,prefix){
  host.replaceChildren();
  const paint=shape[prefix];
  const stops=paint.gradient.stops;

  stops.forEach((stop,index)=>{
    const row=document.createElement('div');
    row.className='shape-stop';
    row.innerHTML=`
      <input type="color" value="${stop.color}">
      <input type="range" min="0" max="100" step="1" value="${stop.offset}">
      <input type="number" min="0" max="100" step="1" value="${stop.offset}">
      <button type="button">✕</button>
    `;

    const [color,range,num,del]=$$('input,button',row);

    color.addEventListener('input',()=>{
      mutateSelected(s=>{
        s[prefix].gradient.stops[index].color=color.value;
      },'Color de degradado',false);
    });

    const changeOffset=value=>{
      const v=clamp(value,0,100);
      range.value=v;num.value=v;
      mutateSelected(s=>{
        s[prefix].gradient.stops[index].offset=v;
      },'Punto de degradado',false);
    };

    range.addEventListener('input',()=>changeOffset(range.value));
    num.addEventListener('input',()=>changeOffset(num.value));

    const commit=()=>api()?.commit?.('Degradado actualizado');
    range.addEventListener('change',commit);
    num.addEventListener('change',commit);
    color.addEventListener('change',commit);

    del.addEventListener('click',()=>{
      if(stops.length<=2){
        notify('El degradado necesita al menos dos puntos.');
        return;
      }

      mutateSelected(s=>{
        s[prefix].gradient.stops.splice(index,1);
      },'Punto de degradado eliminado');
    });

    host.appendChild(row);
  });
}

function fileToDataUrl(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result||''));
    reader.onerror=reject;
    reader.readAsDataURL(file);
  });
}

function renderInspector(state){
  const host=$('#shapeInspector',panel);
  if(!host)return;
  host.replaceChildren();

  const shape=selected(state);
  if(!shape){
    host.innerHTML='<div class="shape-layer-meta">Selecciona una figura para editarla.</div>';
    return;
  }

  const wrap=document.createElement('div');
  wrap.className='shape-grid2';
  wrap.innerHTML=`
    <label class="shape-field full">
      <span>Nombre</span>
      <input data-bind="name" type="text">
    </label>
    <label class="shape-field">
      <span>X</span>
      <input data-bind="x" type="number" step="1">
    </label>
    <label class="shape-field">
      <span>Y</span>
      <input data-bind="y" type="number" step="1">
    </label>
    <label class="shape-field">
      <span>Ancho</span>
      <input data-bind="width" type="number" min="4" step="1">
    </label>
    <label class="shape-field">
      <span>Alto</span>
      <input data-bind="height" type="number" min="4" step="1">
    </label>
    <label class="shape-field full">
      <span>Rotación</span>
      <div class="shape-range">
        <input data-bind="rotation" type="range" min="-180" max="180" step="1">
        <output data-out="rotation"></output>
      </div>
    </label>
    <label class="shape-field">
      <span>Grosor marco</span>
      <input data-bind="strokeWidth" type="number" min="0" max="300" step="1">
    </label>
    <label class="shape-field">
      <span>Radio</span>
      <input data-bind="radius" type="number" min="0" step="1">
    </label>

    ${paintUi('fill','Relleno')}
    ${paintUi('stroke','Marco')}
  `;

  host.appendChild(wrap);

  $$('[data-bind]',wrap).forEach(input=>{
    const path=input.dataset.bind;
    const value=getPath(shape,path);
    input.value=value??'';

    const out=$(`[data-out="${CSS.escape(path)}"]`,wrap);
    if(out)out.textContent=outputText(path,input.value);

    input.addEventListener('input',()=>{
      let value=input.value;
      if(input.type==='number'||input.type==='range')value=Number(value);

      mutateSelected(s=>{
        if(path.endsWith('.mode')){
          const root=path.replace(/\.mode$/,'');
          setPath(s,`${root}.enabled`,value!=='none');
        }
        setPath(s,path,value);
      },'Figura actualizada',false);

      const output=$(`[data-out="${CSS.escape(path)}"]`,wrap);
      if(output)output.textContent=outputText(path,value);
    });

    input.addEventListener('change',()=>{
      api()?.commit?.('Figura actualizada');
    });
  });

  $$('[data-action]',wrap).forEach(btn=>{
    btn.addEventListener('click',()=>{
      const action=btn.dataset.action;

      if(action==='fill-toggle'||action==='stroke-toggle'){
        const prefix=action.split('-')[0];
        mutateSelected(s=>{
          s[prefix].enabled=!s[prefix].enabled;
          if(s[prefix].enabled&&s[prefix].mode==='none')s[prefix].mode='solid';
        },`${prefix==='fill'?'Relleno':'Marco'} actualizado`);
      }else if(action==='fill-add-stop'||action==='stroke-add-stop'){
        const prefix=action.split('-')[0];
        mutateSelected(s=>{
          const list=s[prefix].gradient.stops;
          const last=list[list.length-1]||{offset:100,color:'#FFFFFF'};
          list.push({
            offset:clamp((Number(last.offset)||50)+10,0,100),
            color:last.color||'#FFFFFF',
            opacity:1
          });
        },'Punto de degradado añadido');
      }
    });
  });

  $$('[data-upload]',wrap).forEach(input=>{
    input.addEventListener('change',async()=>{
      const file=input.files?.[0];
      input.value='';
      if(!file)return;
      const src=await fileToDataUrl(file);
      const prefix=input.dataset.upload;

      mutateSelected(s=>{
        s[prefix].enabled=true;
        s[prefix].mode='image';
        s[prefix].image.src=src;
      },`Imagen aplicada al ${prefix==='fill'?'relleno':'marco'}`);
    });
  });

  ['fill','stroke'].forEach(prefix=>{
    const list=$(`[data-stops="${prefix}"]`,wrap);
    if(list)renderStops(list,shape,prefix);

    const mode=shape[prefix].enabled?shape[prefix].mode:'none';
    $$(`[data-mode^="${prefix}:"]`,wrap).forEach(node=>{
      node.style.display=node.dataset.mode.split(':')[1]===mode?'':'none';
    });
  });
}

function sync(state){
  if(renderBusy)return;
  renderBusy=true;
  try{
    buildPanel();
    ensureOverlay();

    const normalized=state||current();
    if(!normalized)return;

    if(selectedId&&!shapesOf(normalized).some(s=>s.id===selectedId)){
      selectedId=null;
    }

    renderLayerList(normalized);
    renderInspector(normalized);
    renderOverlay(normalized);
  }finally{
    renderBusy=false;
  }
}

function pathCanvas(ctx,shape){
  const w=shape.width,h=shape.height;
  ctx.beginPath();

  if(shape.kind==='rect'){
    ctx.rect(0,0,w,h);
  }else if(shape.kind==='roundRect'){
    const r=clamp(shape.radius,0,Math.min(w,h)/2);
    if(ctx.roundRect)ctx.roundRect(0,0,w,h,r);
    else{
      ctx.moveTo(r,0);ctx.lineTo(w-r,0);ctx.quadraticCurveTo(w,0,w,r);
      ctx.lineTo(w,h-r);ctx.quadraticCurveTo(w,h,w-r,h);
      ctx.lineTo(r,h);ctx.quadraticCurveTo(0,h,0,h-r);
      ctx.lineTo(0,r);ctx.quadraticCurveTo(0,0,r,0);
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
    const pts=polygon(shape.kind,w,h).split(/\s+/).map(v=>v.split(',').map(Number));
    pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));
  }
  ctx.closePath();
}
function canvasGradient(ctx,shape,paint){
  const a=(Number(paint.gradient?.angle)||0)*Math.PI/180;
  const cx=shape.width/2,cy=shape.height/2;
  const length=Math.abs(shape.width*Math.cos(a))+Math.abs(shape.height*Math.sin(a));
  const dx=Math.cos(a)*length/2,dy=Math.sin(a)*length/2;
  const g=ctx.createLinearGradient(cx-dx,cy-dy,cx+dx,cy+dy);

  (paint.gradient?.stops||[]).slice().sort((a,b)=>a.offset-b.offset).forEach(stop=>{
    const color=hexToRgba(stop.color||'#FFFFFF',clamp(stop.opacity??1,0,1));
    g.addColorStop(clamp(stop.offset,0,100)/100,color);
  });
  return g;
}
function hexToRgba(hex,alpha){
  let value=String(hex||'#FFFFFF').replace('#','');
  if(value.length===3)value=value.split('').map(c=>c+c).join('');
  const num=parseInt(value,16);
  const r=(num>>16)&255,g=(num>>8)&255,b=num&255;
  return `rgba(${r},${g},${b},${alpha})`;
}
function imageFrom(src){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=reject;
    img.src=src;
  });
}
async function canvasPaint(ctx,shape,paint){
  if(!paint?.enabled||paint.mode==='none')return null;
  if(paint.mode==='solid')return paint.color||'#FFFFFF';
  if(paint.mode==='gradient')return canvasGradient(ctx,shape,paint);

  if(paint.mode==='image'&&paint.image?.src){
    const img=await imageFrom(paint.image.src);
    const pattern=ctx.createPattern(img,'repeat');
    if(pattern?.setTransform){
      const cfg=paint.image;
      const matrix=new DOMMatrix();
      matrix.translateSelf(Number(cfg.offsetX)||0,Number(cfg.offsetY)||0);
      matrix.rotateSelf(Number(cfg.rotation)||0);
      matrix.scaleSelf(Number(cfg.scale)||1,Number(cfg.scale)||1);
      pattern.setTransform(matrix);
    }
    return pattern;
  }

  return null;
}
async function drawShapeToCanvas(ctx,shape,scale=1){
  if(shape.visible===false)return;

  const copy=clone(shape);
  copy.x*=scale;copy.y*=scale;
  copy.width*=scale;copy.height*=scale;
  copy.strokeWidth*=scale;
  copy.radius*=scale;

  ctx.save();
  ctx.translate(copy.x+copy.width/2,copy.y+copy.height/2);
  ctx.rotate((copy.rotation||0)*Math.PI/180);
  ctx.translate(-copy.width/2,-copy.height/2);

  pathCanvas(ctx,copy);

  const fill=await canvasPaint(ctx,copy,copy.fill);
  if(fill){
    ctx.save();
    ctx.globalAlpha=clamp(copy.fill.opacity??1,0,1);
    ctx.fillStyle=fill;
    pathCanvas(ctx,copy);
    ctx.fill();
    ctx.restore();
  }

  const stroke=await canvasPaint(ctx,copy,copy.stroke);
  if(stroke&&copy.strokeWidth>0){
    ctx.save();
    ctx.globalAlpha=clamp(copy.stroke.opacity??1,0,1);
    ctx.strokeStyle=stroke;
    ctx.lineWidth=copy.strokeWidth;
    ctx.lineJoin='round';
    ctx.lineCap='round';
    pathCanvas(ctx,copy);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}
async function drawToCanvas(ctx,scale=1,state=current()){
  for(const shape of shapesOf(state)){
    await drawShapeToCanvas(ctx,ensureShape(clone(shape)),Number(scale)||1);
  }
}

function boot(){
  injectStyles();

  const wait=()=>{
    if(
      api()?.getState&&
      api()?.mutate&&
      $('#canvasStage')&&
      $('.settings-panel')
    ){
      ensureState(false);
      buildPanel();
      ensureOverlay();
      sync(current());
      return true;
    }
    return false;
  };

  if(wait())return;

  const observer=new MutationObserver(()=>{
    if(wait())observer.disconnect();
  });

  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),15000);
}

window.KaoruShapeStudio={
  sync,
  drawToCanvas
};

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',boot,{once:true});
}else{
  boot();
}

}());
