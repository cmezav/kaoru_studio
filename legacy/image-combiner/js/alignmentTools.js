(function(){
  'use strict';

  const POSITIONS=[
    {id:'tl',name:'Arriba izquierda',row:'top',col:'left'},
    {id:'tc',name:'Arriba centro',row:'top',col:'center'},
    {id:'tr',name:'Arriba derecha',row:'top',col:'right'},
    {id:'cl',name:'Centro izquierda',row:'center',col:'left'},
    {id:'cc',name:'Centro',row:'center',col:'center'},
    {id:'cr',name:'Centro derecha',row:'center',col:'right'},
    {id:'bl',name:'Abajo izquierda',row:'bottom',col:'left'},
    {id:'bc',name:'Abajo centro',row:'bottom',col:'center'},
    {id:'br',name:'Abajo derecha',row:'bottom',col:'right'}
  ];

  function api(){
    return window.ImageCombinerStudio||null;
  }

  function selectedMovable(state){
    const ids=new Set(state?.selection?.ids||[]);
    return (state?.layers||[]).filter(layer=>
      ids.has(layer.id) &&
      layer.visible!==false &&
      !layer.locked
    );
  }

  function rotatedRect(layer){
    const x=Number(layer.x)||0;
    const y=Number(layer.y)||0;
    const width=Math.max(0,Number(layer.width)||0);
    const height=Math.max(0,Number(layer.height)||0);
    const angle=(Number(layer.rotation)||0)*Math.PI/180;

    const centerX=x+width/2;
    const centerY=y+height/2;
    const cos=Math.abs(Math.cos(angle));
    const sin=Math.abs(Math.sin(angle));
    const visualWidth=width*cos+height*sin;
    const visualHeight=width*sin+height*cos;

    return {
      x:centerX-visualWidth/2,
      y:centerY-visualHeight/2,
      width:visualWidth,
      height:visualHeight,
      right:centerX+visualWidth/2,
      bottom:centerY+visualHeight/2
    };
  }

  function unionRect(layers){
    if(!layers.length) return null;

    const rects=layers.map(rotatedRect);
    const left=Math.min(...rects.map(rect=>rect.x));
    const top=Math.min(...rects.map(rect=>rect.y));
    const right=Math.max(...rects.map(rect=>rect.right));
    const bottom=Math.max(...rects.map(rect=>rect.bottom));

    return {
      x:left,
      y:top,
      width:right-left,
      height:bottom-top,
      right,
      bottom
    };
  }

  function desiredTopLeft(position,rect,canvas,margin){
    let x=margin;
    let y=margin;

    if(position.col==='center'){
      x=(canvas.width-rect.width)/2;
    }else if(position.col==='right'){
      x=canvas.width-rect.width-margin;
    }

    if(position.row==='center'){
      y=(canvas.height-rect.height)/2;
    }else if(position.row==='bottom'){
      y=canvas.height-rect.height-margin;
    }

    return {x,y};
  }

  function alignLayer(layer,position,canvas,margin){
    const rect=rotatedRect(layer);
    const target=desiredTopLeft(position,rect,canvas,margin);

    layer.x=(Number(layer.x)||0)+(target.x-rect.x);
    layer.y=(Number(layer.y)||0)+(target.y-rect.y);
  }

  function alignBlock(layers,position,canvas,margin){
    const rect=unionRect(layers);
    if(!rect) return;

    const target=desiredTopLeft(position,rect,canvas,margin);
    const dx=target.x-rect.x;
    const dy=target.y-rect.y;

    layers.forEach(layer=>{
      layer.x=(Number(layer.x)||0)+dx;
      layer.y=(Number(layer.y)||0)+dy;
    });
  }

  function buildTool(host){
    const panel=document.createElement('div');
    panel.className='combiner-anchor-tool';

    panel.innerHTML=`
      <div class="anchor-tool-head">
        <div>
          <strong>Posición 3×3</strong>
          <small>El cuadro coloreado indica dónde se alineará.</small>
        </div>
      </div>

      <div class="combiner-anchor-layout">
        <div>
          <div class="combiner-anchor-grid" role="group" aria-label="Posición en el lienzo"></div>
          <div class="combiner-anchor-key">
            <span>Izq.</span><span>Centro</span><span>Der.</span>
          </div>
        </div>

        <div class="combiner-anchor-options">
          <label class="combiner-anchor-field">
            <span>Aplicar a</span>
            <select data-anchor-mode>
              <option value="block">Selección como bloque</option>
              <option value="each">Cada capa</option>
            </select>
          </label>

          <label class="combiner-anchor-field">
            <span>Margen px</span>
            <input data-anchor-margin type="number" min="0" max="5000" step="1" value="0">
          </label>

          <div class="combiner-anchor-status" data-anchor-status>
            Centro seleccionado. El cálculo se actualiza con el tamaño, crop y rotación actuales.
          </div>
        </div>
      </div>
    `;

    const grid=panel.querySelector('.combiner-anchor-grid');
    const mode=panel.querySelector('[data-anchor-mode]');
    const margin=panel.querySelector('[data-anchor-margin]');
    const status=panel.querySelector('[data-anchor-status]');

    let activeId='cc';

    POSITIONS.forEach(position=>{
      const button=document.createElement('button');
      button.type='button';
      button.dataset.anchor=position.id;
      button.title=position.name;
      button.setAttribute('aria-label',position.name);
      button.setAttribute('aria-pressed',position.id===activeId?'true':'false');
      button.classList.toggle('is-active',position.id===activeId);
      grid.appendChild(button);
    });

    function setActive(id){
      activeId=id;
      grid.querySelectorAll('[data-anchor]').forEach(button=>{
        const active=button.dataset.anchor===id;
        button.classList.toggle('is-active',active);
        button.setAttribute('aria-pressed',active?'true':'false');
      });
    }

    grid.addEventListener('click',event=>{
      const button=event.target.closest('button[data-anchor]');
      if(!button) return;

      const studio=api();
      if(
        !studio ||
        typeof studio.getState!=='function' ||
        typeof studio.mutate!=='function'
      ){
        status.textContent='El Combiner todavía no está listo.';
        return;
      }

      const position=POSITIONS.find(item=>item.id===button.dataset.anchor);
      if(!position) return;

      const before=studio.getState();
      const movable=selectedMovable(before);

      if(!movable.length){
        status.textContent='Selecciona al menos una capa desbloqueada.';
        if(typeof studio.notify==='function'){
          studio.notify('Selecciona una capa desbloqueada');
        }
        return;
      }

      const safeMargin=Math.max(0,Number(margin.value)||0);
      margin.value=String(safeMargin);

      const canvas={
        width:Math.max(1,Number(before?.canvas?.width)||1),
        height:Math.max(1,Number(before?.canvas?.height)||1)
      };

      const modeValue=mode.value==='each'?'each':'block';

      studio.mutate(state=>{
        const layers=selectedMovable(state);

        if(modeValue==='each'){
          layers.forEach(layer=>
            alignLayer(layer,position,canvas,safeMargin)
          );
        }else{
          alignBlock(layers,position,canvas,safeMargin);
        }

        if(state.cropUi){
          state.cropUi.enabled=false;
        }
      },`Alinear · ${position.name}`,true);

      setActive(position.id);

      status.textContent=
        `${position.name} · ` +
        `${modeValue==='each'?'cada capa':'bloque'} · ` +
        `margen ${safeMargin}px`;

      if(typeof studio.notify==='function'){
        studio.notify(`Alineado: ${position.name}`);
      }
    });

    mode.addEventListener('change',()=>{
      status.textContent=
        mode.value==='each'
          ? 'Cada capa se alineará por separado al mismo punto.'
          : 'La selección conservará su distribución y se moverá como bloque.';
    });

    margin.addEventListener('change',()=>{
      margin.value=String(Math.max(0,Number(margin.value)||0));
    });

    host.appendChild(panel);
  }

  function mount(){
    if(document.querySelector('.combiner-anchor-tool')) return;

    const host=document.querySelector('.align-section');
    if(!host) return;

    buildTool(host);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',mount,{once:true});
  }else{
    mount();
  }
}());