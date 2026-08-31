(function(){
  'use strict';

  const $=selector=>document.querySelector(selector);
  const clone=CombinerState.clone;

  let state=CombinerState.initial();
  const history=new CombinerState.History(100);
  let scale=1;
  let interaction=null;
  let toastTimer=0;
  let draggedLayerId=null;

  const els={
    preset:$('#canvasPreset'),
    width:$('#canvasWidth'),
    height:$('#canvasHeight'),
    applyCanvas:$('#applyCanvasBtn'),
    savePreset:$('#savePresetBtn'),
    bgColor:$('#backgroundColor'),
    bgHex:$('#backgroundHex'),
    transparent:$('#transparentBg'),
    colorMode:$('#colorBg'),
    importBtn:$('#importImagesBtn'),
    fileInput:$('#imageFiles'),
    drop:$('#dropZone'),
    viewport:$('#canvasViewport'),
    stageShell:$('#stageShell'),
    stage:$('#canvasStage'),
    empty:$('#emptyCanvasHint'),
    marquee:$('#selectionMarquee'),
    layerCount:$('#layerCount'),
    selectionCount:$('#selectionCount'),
    selectedName:$('#selectedName'),
    controls:$('#layerControls'),
    x:$('#layerX'),
    y:$('#layerY'),
    w:$('#layerW'),
    h:$('#layerH'),
    rotation:$('#layerRotation'),
    opacity:$('#layerOpacity'),
    opacityOut:$('#layerOpacityOut'),
    aspect:$('#aspectLock'),
    duplicate:$('#duplicateBtn'),
    remove:$('#deleteBtn'),
    flipX:$('#flipXBtn'),
    flipY:$('#flipYBtn'),
    forward:$('#forwardBtn'),
    backward:$('#backwardBtn'),
    alignTarget:$('#alignTarget'),
    distributeH:$('#distributeHBtn'),
    distributeV:$('#distributeVBtn'),
    selectAll:$('#selectAllBtn'),
    layersList:$('#layersList'),
    showAll:$('#showAllBtn'),
    unlockAll:$('#unlockAllBtn'),
    undo:$('#undoBtn'),
    redo:$('#redoBtn'),
    zoom:$('#zoomSelect'),
    fit:$('#fitBtn'),
    export:$('#exportPngBtn'),
    toast:$('#toast'),
    canvasInfo:$('#canvasInfo')
  };

  function uid(){
    return `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  }

  function clamp(value,min,max){
    return Math.max(min,Math.min(max,Number(value)||0));
  }

  function selectionIds(){
    return state.selection.ids||[];
  }

  function selectedLayers(movableOnly=false){
    return CombinerLayers.selectedLayers(state,movableOnly);
  }

  function primary(){
    return state.layers.find(layer=>layer.id===state.selection.primaryId)||null;
  }

  function toast(message){
    els.toast.textContent=message;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>els.toast.classList.remove('show'),1700);
  }

  function snapshot(label){
    history.push(state);
    if(label) toast(label);
  }

  function restore(next){
    if(!next) return;
    state=next;
    render();
  }

  function normalizeHex(value){
    const raw=String(value||'').trim().toUpperCase();
    const hex=raw.startsWith('#')?raw:`#${raw}`;
    return /^#[0-9A-F]{6}$/.test(hex)?hex:null;
  }

  function setSelection(ids,primaryId=null){
    const valid=new Set(state.layers.map(layer=>layer.id));
    const clean=[...new Set(ids||[])].filter(id=>valid.has(id));

    state.selection={
      ids:clean,
      primaryId:clean.includes(primaryId)?primaryId:(clean.at(-1)||null)
    };
  }

  function toggleSelection(id){
    const ids=[...selectionIds()];
    const index=ids.indexOf(id);

    if(index>=0){
      ids.splice(index,1);
      setSelection(ids,ids.at(-1)||null);
    }else{
      ids.push(id);
      setSelection(ids,id);
    }
  }

  function selectOnly(id){
    setSelection(id?[id]:[],id||null);
  }

  function selectAll(){
    const ids=state.layers
      .filter(layer=>layer.visible!==false)
      .map(layer=>layer.id);

    setSelection(ids,ids.at(-1)||null);
    render();
  }

  function populatePresets(){
    const current=els.preset.value;
    els.preset.innerHTML='';

    const all=[
      ...CombinerPresets.list,
      ...CombinerPresets.readCustom()
    ];

    const groups=new Map();

    all.forEach(preset=>{
      if(!groups.has(preset.group)) groups.set(preset.group,[]);
      groups.get(preset.group).push(preset);
    });

    groups.forEach((items,group)=>{
      const optgroup=document.createElement('optgroup');
      optgroup.label=group;

      items.forEach(item=>{
        const option=document.createElement('option');
        option.value=`${item.width}x${item.height}`;
        option.textContent=`${item.name} - ${item.width} x ${item.height}`;
        optgroup.appendChild(option);
      });

      els.preset.appendChild(optgroup);
    });

    if(current && [...els.preset.options].some(option=>option.value===current)){
      els.preset.value=current;
    }else{
      els.preset.value='1080x1080';
    }
  }

  function calculateScale(){
    if(state.zoom!=='fit'){
      scale=clamp(Number(state.zoom)||1,.1,2);
      return;
    }

    const rect=els.viewport.getBoundingClientRect();
    const availableW=Math.max(200,rect.width-90);
    const availableH=Math.max(180,rect.height-90);

    scale=Math.min(
      1,
      availableW/state.canvas.width,
      availableH/state.canvas.height
    );

    scale=Math.max(.05,scale);
  }

  function updateStageSize(){
    calculateScale();

    els.stage.style.width=`${state.canvas.width}px`;
    els.stage.style.height=`${state.canvas.height}px`;
    els.stage.style.transform=`scale(${scale})`;

    els.stageShell.style.width=`${Math.round(state.canvas.width*scale)}px`;
    els.stageShell.style.height=`${Math.round(state.canvas.height*scale)}px`;

    els.stage.dataset.background=state.canvas.backgroundMode;
    els.stage.style.backgroundColor=
      state.canvas.backgroundMode==='transparent'
        ? 'transparent'
        : state.canvas.backgroundColor;

    els.canvasInfo.textContent=
      `${state.canvas.width} x ${state.canvas.height}px - ${Math.round(scale*100)}%`;
  }

  function renderLayers(){
    els.stage.querySelectorAll('.image-layer').forEach(node=>node.remove());

    const ids=new Set(selectionIds());
    const onlyOne=ids.size===1;

    state.layers.forEach((layer,index)=>{
      if(layer.visible===false) return;

      const node=document.createElement('div');
      const isSelected=ids.has(layer.id);
      const isPrimary=layer.id===state.selection.primaryId;

      node.className=[
        'image-layer',
        isSelected?'selected':'',
        isPrimary?'primary':'',
        layer.locked?'is-locked':''
      ].filter(Boolean).join(' ');

      node.dataset.id=layer.id;
      node.style.left=`${layer.x}px`;
      node.style.top=`${layer.y}px`;
      node.style.width=`${layer.width}px`;
      node.style.height=`${layer.height}px`;
      node.style.opacity=layer.opacity;
      node.style.zIndex=String(index+2);
      node.style.transform=
        `rotate(${layer.rotation}deg) scale(${layer.flipX?-1:1},${layer.flipY?-1:1})`;

      const img=document.createElement('img');
      img.src=layer.src;
      img.alt='';
      img.draggable=false;
      node.appendChild(img);

      if(isPrimary && onlyOne && !layer.locked){
        const resize=document.createElement('button');
        resize.type='button';
        resize.className='resize-handle';
        resize.title='Redimensionar';
        resize.dataset.handle='resize';

        const rotate=document.createElement('button');
        rotate.type='button';
        rotate.className='rotate-handle';
        rotate.title='Rotar';
        rotate.dataset.handle='rotate';

        node.append(resize,rotate);
      }

      els.stage.appendChild(node);
    });

    els.empty.hidden=state.layers.length>0;
    els.layerCount.textContent=
      `${state.layers.length} imagen${state.layers.length===1?'':'es'}`;
  }

  function renderControls(){
    const chosen=selectedLayers(false);
    const one=chosen.length===1?chosen[0]:null;
    const any=chosen.length>0;

    els.controls.classList.toggle('disabled',!any);

    [
      els.duplicate,els.remove,els.flipX,els.flipY,
      els.forward,els.backward,els.opacity
    ].forEach(element=>element.disabled=!any);

    [els.x,els.y,els.w,els.h,els.rotation].forEach(element=>{
      element.disabled=!one || one.locked;
    });

    document.querySelectorAll('[data-align]').forEach(button=>{
      button.disabled=!selectedLayers(true).length;
    });

    els.distributeH.disabled=selectedLayers(true).length<3;
    els.distributeV.disabled=selectedLayers(true).length<3;

    if(!any){
      els.selectedName.textContent='Ninguna imagen seleccionada';
      els.selectionCount.textContent='0 seleccionadas';
      return;
    }

    els.selectionCount.textContent=
      `${chosen.length} seleccionada${chosen.length===1?'':'s'}`;

    els.selectedName.textContent=
      one
        ? one.name
        : `${chosen.length} imágenes seleccionadas`;

    if(one){
      if(document.activeElement!==els.x) els.x.value=Math.round(one.x);
      if(document.activeElement!==els.y) els.y.value=Math.round(one.y);
      if(document.activeElement!==els.w) els.w.value=Math.round(one.width);
      if(document.activeElement!==els.h) els.h.value=Math.round(one.height);
      if(document.activeElement!==els.rotation) els.rotation.value=Math.round(one.rotation*10)/10;
    }else{
      [els.x,els.y,els.w,els.h,els.rotation].forEach(input=>input.value='');
    }

    const opacity=chosen[0]?.opacity ?? 1;
    if(document.activeElement!==els.opacity){
      els.opacity.value=Math.round(opacity*100);
    }
    els.opacityOut.textContent=`${Math.round(opacity*100)}%`;

    els.aspect.checked=state.aspectLock;
    els.alignTarget.value=state.alignTarget||'canvas';
  }

  function renderCanvasControls(){
    if(document.activeElement!==els.width) els.width.value=state.canvas.width;
    if(document.activeElement!==els.height) els.height.value=state.canvas.height;
    if(document.activeElement!==els.bgColor) els.bgColor.value=state.canvas.backgroundColor;
    if(document.activeElement!==els.bgHex) els.bgHex.value=state.canvas.backgroundColor;

    els.transparent.checked=state.canvas.backgroundMode==='transparent';
    els.colorMode.checked=state.canvas.backgroundMode==='color';
  }

  function renderLayerPanel(){
    const selectedSet=new Set(selectionIds());

    if(!state.layers.length){
      els.layersList.innerHTML='<div class="layers-empty">Agrega imágenes para ver sus capas aquí.</div>';
      return;
    }

    els.layersList.innerHTML='';

    [...state.layers].reverse().forEach((layer,index)=>{
      const row=document.createElement('div');
      row.className=[
        'layer-row',
        selectedSet.has(layer.id)?'selected':'',
        layer.visible===false?'hidden-layer':'',
        layer.locked?'locked-layer':''
      ].filter(Boolean).join(' ');

      row.dataset.layerId=layer.id;
      row.draggable=true;

      const visible=document.createElement('button');
      visible.type='button';
      visible.className='layer-action';
      visible.dataset.action='visibility';
      visible.title=layer.visible===false?'Mostrar':'Ocultar';
      visible.textContent=layer.visible===false?'○':'●';

      const thumb=document.createElement('img');
      thumb.className='layer-thumb';
      thumb.src=layer.src;
      thumb.alt='';

      const middle=document.createElement('div');

      const name=document.createElement('input');
      name.className='layer-name-input';
      name.type='text';
      name.value=layer.name;
      name.dataset.action='rename';

      const meta=document.createElement('span');
      meta.className='layer-meta';
      meta.textContent=`${Math.round(layer.width)} x ${Math.round(layer.height)} · capa ${state.layers.length-index}`;

      middle.append(name,meta);

      const lock=document.createElement('button');
      lock.type='button';
      lock.className='layer-action';
      lock.dataset.action='lock';
      lock.title=layer.locked?'Desbloquear':'Bloquear';
      lock.textContent=layer.locked?'L':'U';

      row.append(visible,thumb,middle,lock);
      els.layersList.appendChild(row);
    });
  }

  function render(){
    renderCanvasControls();
    updateStageSize();
    renderLayers();
    renderControls();
    renderLayerPanel();
  }

  function updateSingleLayer(id,patch){
    state.layers=state.layers.map(layer=>
      layer.id===id?{...layer,...patch}:layer
    );
  }

  function updateSelectedLayers(patch,commit=false){
    const ids=new Set(selectionIds());

    state.layers=state.layers.map(layer=>{
      if(!ids.has(layer.id) || layer.locked) return layer;
      return {
        ...layer,
        ...(typeof patch==='function'?patch(layer):patch)
      };
    });

    render();
    if(commit) snapshot();
  }

  function addImageFile(file){
    if(!file || !/^image\/(png|jpeg|webp|gif)$/i.test(file.type)){
      toast('Usa PNG, JPG, WEBP o GIF.');
      return;
    }

    const reader=new FileReader();

    reader.onload=()=>{
      const image=new Image();

      image.onload=()=>{
        const maxW=state.canvas.width*.66;
        const maxH=state.canvas.height*.66;

        const ratio=Math.min(
          1,
          maxW/Math.max(1,image.naturalWidth),
          maxH/Math.max(1,image.naturalHeight)
        );

        const width=Math.max(20,image.naturalWidth*ratio);
        const height=Math.max(20,image.naturalHeight*ratio);

        const layer={
          id:uid(),
          name:file.name||'Imagen pegada',
          src:String(reader.result),
          x:(state.canvas.width-width)/2,
          y:(state.canvas.height-height)/2,
          width,
          height,
          naturalWidth:image.naturalWidth,
          naturalHeight:image.naturalHeight,
          rotation:0,
          opacity:1,
          flipX:false,
          flipY:false,
          visible:true,
          locked:false
        };

        state.layers.push(layer);
        selectOnly(layer.id);
        render();
        snapshot('Imagen agregada');
      };

      image.onerror=()=>toast('No se pudo leer la imagen.');
      image.src=String(reader.result);
    };

    reader.readAsDataURL(file);
  }

  function addFiles(files){
    Array.from(files||[]).forEach(addImageFile);
  }

  function duplicateSelected(showToast=true){
    const ids=new Set(selectionIds());
    if(!ids.size) return [];

    const offset=Math.max(12,state.canvas.width*.018);
    const newIds=[];
    const next=[];

    state.layers.forEach(layer=>{
      next.push(layer);

      if(ids.has(layer.id)){
        const copy={
          ...clone(layer),
          id:uid(),
          name:`${layer.name} copia`,
          x:layer.x+offset,
          y:layer.y+offset,
          locked:false
        };

        next.push(copy);
        newIds.push(copy.id);
      }
    });

    state.layers=next;
    setSelection(newIds,newIds.at(-1)||null);
    render();
    snapshot(showToast?'Selección duplicada':null);
    return newIds;
  }

  function deleteSelected(){
    const ids=new Set(selectionIds());
    if(!ids.size) return;

    state.layers=state.layers.filter(layer=>!ids.has(layer.id));
    setSelection([],null);
    render();
    snapshot('Selección eliminada');
  }

  function moveOrder(direction){
    if(CombinerLayers.stepOrder(state,direction)){
      render();
      snapshot();
    }
  }

  function beginInteraction(event,node,type){
    const chosen=selectedLayers(true);
    if(!chosen.length) return;

    event.preventDefault();
    event.stopPropagation();

    const start={
      pointerId:event.pointerId,
      type,
      clientX:event.clientX,
      clientY:event.clientY,
      layers:chosen.map(layer=>clone(layer))
    };

    if(type==='rotate'){
      const layer=primary();
      if(!layer) return;

      const rect=node.getBoundingClientRect();

      start.centerX=rect.left+rect.width/2;
      start.centerY=rect.top+rect.height/2;
      start.startAngle=Math.atan2(
        event.clientY-start.centerY,
        event.clientX-start.centerX
      );
      start.layer=clone(layer);
    }

    interaction=start;
    node.setPointerCapture(event.pointerId);
  }

  function interactionMove(event){
    if(!interaction || event.pointerId!==interaction.pointerId) return;

    const dx=(event.clientX-interaction.clientX)/scale;
    const dy=(event.clientY-interaction.clientY)/scale;

    if(interaction.type==='move'){
      const patches=new Map(
        interaction.layers.map(layer=>[
          layer.id,
          {x:layer.x+dx,y:layer.y+dy}
        ])
      );

      state.layers=state.layers.map(layer=>
        patches.has(layer.id)
          ? {...layer,...patches.get(layer.id)}
          : layer
      );

      render();
    }else if(interaction.type==='resize'){
      const base=interaction.layers[0];
      let width=Math.max(20,base.width+dx);
      let height=Math.max(20,base.height+dy);

      if(state.aspectLock){
        const ratio=base.width/Math.max(1,base.height);

        if(Math.abs(dx)>Math.abs(dy)){
          height=width/ratio;
        }else{
          width=height*ratio;
        }
      }

      updateSingleLayer(base.id,{width,height});
      render();
    }else if(interaction.type==='rotate'){
      const base=interaction.layer;
      const angle=Math.atan2(
        event.clientY-interaction.centerY,
        event.clientX-interaction.centerX
      );

      const delta=(angle-interaction.startAngle)*180/Math.PI;
      updateSingleLayer(base.id,{rotation:base.rotation+delta});
      render();
    }else if(interaction.type==='marquee'){
      updateMarquee(event);
    }
  }

  function endInteraction(event){
    if(!interaction || event.pointerId!==interaction.pointerId) return;

    const type=interaction.type;
    interaction=null;

    if(type==='marquee'){
      els.marquee.hidden=true;
      render();
      return;
    }

    snapshot();
  }

  function stagePoint(event){
    const rect=els.stage.getBoundingClientRect();

    return {
      x:clamp((event.clientX-rect.left)/scale,0,state.canvas.width),
      y:clamp((event.clientY-rect.top)/scale,0,state.canvas.height)
    };
  }

  function startMarquee(event){
    const point=stagePoint(event);

    interaction={
      pointerId:event.pointerId,
      type:'marquee',
      startX:point.x,
      startY:point.y,
      additive:event.shiftKey||event.ctrlKey||event.metaKey,
      baseIds:event.shiftKey||event.ctrlKey||event.metaKey
        ? [...selectionIds()]
        : []
    };

    els.marquee.hidden=false;
    els.marquee.style.left=`${point.x}px`;
    els.marquee.style.top=`${point.y}px`;
    els.marquee.style.width='0px';
    els.marquee.style.height='0px';

    els.stage.setPointerCapture(event.pointerId);
  }

  function updateMarquee(event){
    const point=stagePoint(event);
    const minX=Math.min(interaction.startX,point.x);
    const minY=Math.min(interaction.startY,point.y);
    const maxX=Math.max(interaction.startX,point.x);
    const maxY=Math.max(interaction.startY,point.y);

    els.marquee.style.left=`${minX}px`;
    els.marquee.style.top=`${minY}px`;
    els.marquee.style.width=`${maxX-minX}px`;
    els.marquee.style.height=`${maxY-minY}px`;

    const hits=state.layers
      .filter(layer=>
        layer.visible!==false &&
        !layer.locked &&
        layer.x<maxX &&
        layer.x+layer.width>minX &&
        layer.y<maxY &&
        layer.y+layer.height>minY
      )
      .map(layer=>layer.id);

    const ids=interaction.additive
      ? [...new Set([...interaction.baseIds,...hits])]
      : hits;

    setSelection(ids,ids.at(-1)||null);
    renderLayers();
    renderControls();
    renderLayerPanel();
  }

  function applyCanvasSize(){
    const width=clamp(Math.round(Number(els.width.value)||1080),32,10000);
    const height=clamp(Math.round(Number(els.height.value)||1080),32,10000);

    state.canvas.width=width;
    state.canvas.height=height;
    state.zoom='fit';
    els.zoom.value='fit';

    render();
    snapshot('Lienzo actualizado');
  }

  function saveCustomPreset(){
    const name=(prompt('Nombre del preset:','Mi formato')||'').trim();
    if(!name) return;

    CombinerPresets.saveCustom({
      name,
      width:state.canvas.width,
      height:state.canvas.height
    });

    populatePresets();
    toast('Preset guardado');
  }

  function applyAlignment(mode){
    state.alignTarget=els.alignTarget.value;

    if(CombinerLayers.align(state,mode,state.alignTarget)){
      render();
      snapshot();
    }else{
      toast('Necesitas más imágenes para esa alineación.');
    }
  }

  function applyDistribution(axis){
    if(CombinerLayers.distribute(state,axis)){
      render();
      snapshot();
    }else{
      toast('Selecciona al menos 3 imágenes.');
    }
  }

  async function exportPng(){
    const canvas=document.createElement('canvas');
    canvas.width=state.canvas.width;
    canvas.height=state.canvas.height;
    const ctx=canvas.getContext('2d');

    if(state.canvas.backgroundMode==='color'){
      ctx.fillStyle=state.canvas.backgroundColor;
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }else{
      ctx.clearRect(0,0,canvas.width,canvas.height);
    }

    for(const layer of state.layers){
      if(layer.visible===false) continue;

      const img=await new Promise((resolve,reject)=>{
        const image=new Image();
        image.onload=()=>resolve(image);
        image.onerror=reject;
        image.src=layer.src;
      });

      ctx.save();
      ctx.globalAlpha=layer.opacity;
      ctx.translate(
        layer.x+layer.width/2,
        layer.y+layer.height/2
      );
      ctx.rotate(layer.rotation*Math.PI/180);
      ctx.scale(layer.flipX?-1:1,layer.flipY?-1:1);
      ctx.drawImage(
        img,
        -layer.width/2,
        -layer.height/2,
        layer.width,
        layer.height
      );
      ctx.restore();
    }

    canvas.toBlob(blob=>{
      if(!blob) return;

      const url=URL.createObjectURL(blob);
      const anchor=document.createElement('a');

      anchor.href=url;
      anchor.download=`CMB-${Date.now().toString(36).toUpperCase()}.png`;
      anchor.click();

      setTimeout(()=>URL.revokeObjectURL(url),1500);
      toast('PNG exportado');
    },'image/png');
  }

  function isEditingTarget(target){
    return target && (
      target.tagName==='INPUT' ||
      target.tagName==='TEXTAREA' ||
      target.tagName==='SELECT'
    );
  }

  function bind(){
    populatePresets();

    els.preset.addEventListener('change',()=>{
      const match=/^(\d+)x(\d+)$/.exec(els.preset.value);
      if(!match) return;
      els.width.value=match[1];
      els.height.value=match[2];
    });

    els.applyCanvas.addEventListener('click',applyCanvasSize);
    els.savePreset.addEventListener('click',saveCustomPreset);

    els.bgColor.addEventListener('input',()=>{
      const value=normalizeHex(els.bgColor.value);
      if(!value) return;
      state.canvas.backgroundColor=value;
      state.canvas.backgroundMode='color';
      render();
    });
    els.bgColor.addEventListener('change',()=>snapshot());

    els.bgHex.addEventListener('change',()=>{
      const value=normalizeHex(els.bgHex.value);

      if(!value){
        els.bgHex.value=state.canvas.backgroundColor;
        toast('HEX inválido');
        return;
      }

      state.canvas.backgroundColor=value;
      state.canvas.backgroundMode='color';
      render();
      snapshot();
    });

    [els.colorMode,els.transparent].forEach(radio=>{
      radio.addEventListener('change',()=>{
        state.canvas.backgroundMode=els.transparent.checked?'transparent':'color';
        render();
        snapshot();
      });
    });

    els.importBtn.addEventListener('click',()=>els.fileInput.click());

    els.fileInput.addEventListener('change',event=>{
      addFiles(event.target.files);
      event.target.value='';
    });

    ['dragenter','dragover'].forEach(type=>{
      els.viewport.addEventListener(type,event=>{
        event.preventDefault();
        els.drop.classList.add('dragover');
      });
    });

    ['dragleave','drop'].forEach(type=>{
      els.viewport.addEventListener(type,event=>{
        event.preventDefault();
        els.drop.classList.remove('dragover');
      });
    });

    els.viewport.addEventListener('drop',event=>{
      addFiles(event.dataTransfer.files);
    });

    document.addEventListener('paste',event=>{
      const files=Array.from(event.clipboardData?.files||[]);
      const images=files.filter(file=>file.type.startsWith('image/'));

      if(images.length){
        event.preventDefault();
        addFiles(images);
      }
    });

    els.stage.addEventListener('pointerdown',event=>{
      const node=event.target.closest('.image-layer');

      if(!node){
        if(event.button!==0) return;

        if(!(event.shiftKey||event.ctrlKey||event.metaKey)){
          selectOnly(null);
          render();
        }

        startMarquee(event);
        return;
      }

      const id=node.dataset.id;
      const layer=state.layers.find(item=>item.id===id);
      const modifier=event.shiftKey||event.ctrlKey||event.metaKey;

      if(modifier){
        toggleSelection(id);
        render();
      }else if(!selectionIds().includes(id)){
        selectOnly(id);
        render();
      }else{
        state.selection.primaryId=id;
        renderControls();
        renderLayerPanel();
      }

      if(layer.locked) return;

      const handle=event.target.dataset.handle;
      const chosen=selectedLayers(true);

      if((handle==='resize'||handle==='rotate') && chosen.length!==1){
        return;
      }

      beginInteraction(
        event,
        node,
        handle==='resize'?'resize':handle==='rotate'?'rotate':'move'
      );
    });

    els.stage.addEventListener('pointermove',interactionMove);
    els.stage.addEventListener('pointerup',endInteraction);
    els.stage.addEventListener('pointercancel',endInteraction);

    const numeric=[
      [els.x,'x'],
      [els.y,'y'],
      [els.rotation,'rotation']
    ];

    numeric.forEach(([input,key])=>{
      input.addEventListener('input',()=>{
        const layer=primary();
        if(!layer || layer.locked) return;
        updateSingleLayer(layer.id,{[key]:Number(input.value)||0});
        render();
      });
      input.addEventListener('change',()=>snapshot());
    });

    els.w.addEventListener('input',()=>{
      const layer=primary();
      if(!layer || layer.locked) return;

      const width=Math.max(20,Number(els.w.value)||20);

      if(state.aspectLock){
        updateSingleLayer(layer.id,{
          width,
          height:width/(layer.width/Math.max(1,layer.height))
        });
      }else{
        updateSingleLayer(layer.id,{width});
      }

      render();
    });
    els.w.addEventListener('change',()=>snapshot());

    els.h.addEventListener('input',()=>{
      const layer=primary();
      if(!layer || layer.locked) return;

      const height=Math.max(20,Number(els.h.value)||20);

      if(state.aspectLock){
        updateSingleLayer(layer.id,{
          height,
          width:height*(layer.width/Math.max(1,layer.height))
        });
      }else{
        updateSingleLayer(layer.id,{height});
      }

      render();
    });
    els.h.addEventListener('change',()=>snapshot());

    els.opacity.addEventListener('input',()=>{
      const value=clamp(Number(els.opacity.value)/100,0,1);
      updateSelectedLayers({opacity:value});
    });
    els.opacity.addEventListener('change',()=>snapshot());

    els.aspect.addEventListener('change',()=>{
      state.aspectLock=els.aspect.checked;
      snapshot();
    });

    els.duplicate.addEventListener('click',()=>duplicateSelected());
    els.remove.addEventListener('click',deleteSelected);

    els.flipX.addEventListener('click',()=>{
      updateSelectedLayers(layer=>({flipX:!layer.flipX}),true);
    });

    els.flipY.addEventListener('click',()=>{
      updateSelectedLayers(layer=>({flipY:!layer.flipY}),true);
    });

    els.forward.addEventListener('click',()=>moveOrder('forward'));
    els.backward.addEventListener('click',()=>moveOrder('backward'));

    els.alignTarget.addEventListener('change',()=>{
      state.alignTarget=els.alignTarget.value;
    });

    document.querySelectorAll('[data-align]').forEach(button=>{
      button.addEventListener('click',()=>applyAlignment(button.dataset.align));
    });

    els.distributeH.addEventListener('click',()=>applyDistribution('x'));
    els.distributeV.addEventListener('click',()=>applyDistribution('y'));

    els.selectAll.addEventListener('click',selectAll);

    els.layersList.addEventListener('click',event=>{
      const row=event.target.closest('.layer-row');
      if(!row) return;

      const id=row.dataset.layerId;
      const action=event.target.dataset.action;

      if(action==='visibility'){
        event.stopPropagation();

        const layer=state.layers.find(item=>item.id===id);
        updateSingleLayer(id,{visible:layer.visible===false});
        render();
        snapshot();
        return;
      }

      if(action==='lock'){
        event.stopPropagation();

        const layer=state.layers.find(item=>item.id===id);
        updateSingleLayer(id,{locked:!layer.locked});
        render();
        snapshot();
        return;
      }

      if(action==='rename') return;

      if(event.shiftKey||event.ctrlKey||event.metaKey){
        toggleSelection(id);
      }else{
        selectOnly(id);
      }

      render();
    });

    els.layersList.addEventListener('change',event=>{
      if(event.target.dataset.action!=='rename') return;

      const row=event.target.closest('.layer-row');
      const id=row?.dataset.layerId;
      const value=event.target.value.trim();

      if(!id) return;

      updateSingleLayer(id,{name:value||'Imagen'});
      render();
      snapshot();
    });

    els.layersList.addEventListener('dragstart',event=>{
      const row=event.target.closest('.layer-row');
      if(!row) return;

      draggedLayerId=row.dataset.layerId;
      event.dataTransfer.effectAllowed='move';
      event.dataTransfer.setData('text/plain',draggedLayerId);
    });

    els.layersList.addEventListener('dragover',event=>{
      if(event.target.closest('.layer-row')){
        event.preventDefault();
        event.dataTransfer.dropEffect='move';
      }
    });

    els.layersList.addEventListener('drop',event=>{
      const row=event.target.closest('.layer-row');
      if(!row || !draggedLayerId) return;

      event.preventDefault();

      if(CombinerLayers.reorder(state,draggedLayerId,row.dataset.layerId)){
        render();
        snapshot('Capas reordenadas');
      }

      draggedLayerId=null;
    });

    els.layersList.addEventListener('dragend',()=>{
      draggedLayerId=null;
    });

    els.showAll.addEventListener('click',()=>{
      state.layers=state.layers.map(layer=>({...layer,visible:true}));
      render();
      snapshot('Todas las capas visibles');
    });

    els.unlockAll.addEventListener('click',()=>{
      state.layers=state.layers.map(layer=>({...layer,locked:false}));
      render();
      snapshot('Todas las capas desbloqueadas');
    });

    els.undo.addEventListener('click',()=>restore(history.undo()));
    els.redo.addEventListener('click',()=>restore(history.redo()));

    els.zoom.addEventListener('change',()=>{
      state.zoom=els.zoom.value;
      render();
    });

    els.fit.addEventListener('click',()=>{
      state.zoom='fit';
      els.zoom.value='fit';
      render();
    });

    els.export.addEventListener('click',exportPng);

    document.addEventListener('keydown',event=>{
      const editing=isEditingTarget(event.target);
      const mod=event.ctrlKey||event.metaKey;
      const key=event.key.toLowerCase();

      if(mod && key==='a' && !editing){
        event.preventDefault();
        selectAll();
        return;
      }

      if(mod && key==='d' && !editing){
        event.preventDefault();
        duplicateSelected();
        return;
      }

      if(mod && key==='z'){
        event.preventDefault();
        restore(event.shiftKey?history.redo():history.undo());
        return;
      }

      if(event.key==='Escape' && !editing){
        selectOnly(null);
        render();
        return;
      }

      if(editing) return;

      if((event.key==='Delete'||event.key==='Backspace') && selectionIds().length){
        event.preventDefault();
        deleteSelected();
        return;
      }

      const chosen=selectedLayers(true);
      if(!chosen.length) return;

      const step=event.shiftKey?10:1;
      let dx=0;
      let dy=0;

      if(event.key==='ArrowLeft') dx=-step;
      if(event.key==='ArrowRight') dx=step;
      if(event.key==='ArrowUp') dy=-step;
      if(event.key==='ArrowDown') dy=step;

      if(dx||dy){
        event.preventDefault();
        updateSelectedLayers(layer=>({
          x:layer.x+dx,
          y:layer.y+dy
        }));
      }
    });

    document.addEventListener('keyup',event=>{
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
        snapshot();
      }
    });

    window.addEventListener('resize',()=>{
      if(state.zoom==='fit') render();
    });

    history.onChange=({canUndo,canRedo})=>{
      els.undo.disabled=!canUndo;
      els.redo.disabled=!canRedo;
    };
  }

  bind();
  render();
  history.reset(state);

  window.ImageCombinerStudio={
    getState:()=>clone(state),
    addFiles,
    selectAll
  };
}());