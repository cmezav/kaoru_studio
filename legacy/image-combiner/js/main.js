(function(){
  'use strict';

  const $=selector=>document.querySelector(selector);
  const $$=selector=>Array.from(document.querySelectorAll(selector));
  const clone=CombinerState.clone;

  let state=CombinerState.initial();
  const history=new CombinerState.History(100);
  let scale=1;
  let interaction=null;
  let toastTimer=0;

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
    layerCount:$('#layerCount'),
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

  function selected(){
    return state.layers.find(layer=>layer.id===state.selectedId)||null;
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

  function populatePresets(){
    const current=els.preset.value;
    els.preset.innerHTML='';

    const all=[
      ...CombinerPresets.list,
      ...CombinerPresets.readCustom()
    ];

    const groups=new Map();
    all.forEach((preset,index)=>{
      if(!groups.has(preset.group)) groups.set(preset.group,[]);
      groups.get(preset.group).push({...preset,index});
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

    if(current && [...els.preset.options].some(o=>o.value===current)){
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
    const availableW=Math.max(200,rect.width-100);
    const availableH=Math.max(180,rect.height-100);
    scale=Math.min(
      1,
      availableW/state.canvas.width,
      availableH/state.canvas.height
    );
    scale=Math.max(.06,scale);
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

    state.layers.forEach((layer,index)=>{
      const node=document.createElement('div');
      node.className=`image-layer${layer.id===state.selectedId?' selected':''}`;
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

      if(layer.id===state.selectedId){
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
    els.layerCount.textContent=`${state.layers.length} imagen${state.layers.length===1?'':'es'}`;
  }

  function renderControls(){
    const layer=selected();
    els.controls.classList.toggle('disabled',!layer);

    [
      els.x,els.y,els.w,els.h,els.rotation,els.opacity,
      els.duplicate,els.remove,els.flipX,els.flipY,
      els.forward,els.backward
    ].forEach(el=>el.disabled=!layer);

    if(!layer){
      els.selectedName.textContent='Ninguna imagen seleccionada';
      return;
    }

    els.selectedName.textContent=layer.name;
    if(document.activeElement!==els.x) els.x.value=Math.round(layer.x);
    if(document.activeElement!==els.y) els.y.value=Math.round(layer.y);
    if(document.activeElement!==els.w) els.w.value=Math.round(layer.width);
    if(document.activeElement!==els.h) els.h.value=Math.round(layer.height);
    if(document.activeElement!==els.rotation) els.rotation.value=Math.round(layer.rotation*10)/10;
    if(document.activeElement!==els.opacity) els.opacity.value=Math.round(layer.opacity*100);
    els.opacityOut.textContent=`${Math.round(layer.opacity*100)}%`;
    els.aspect.checked=state.aspectLock;
  }

  function renderCanvasControls(){
    if(document.activeElement!==els.width) els.width.value=state.canvas.width;
    if(document.activeElement!==els.height) els.height.value=state.canvas.height;
    if(document.activeElement!==els.bgColor) els.bgColor.value=state.canvas.backgroundColor;
    if(document.activeElement!==els.bgHex) els.bgHex.value=state.canvas.backgroundColor;
    els.transparent.checked=state.canvas.backgroundMode==='transparent';
    els.colorMode.checked=state.canvas.backgroundMode==='color';
  }

  function render(){
    renderCanvasControls();
    updateStageSize();
    renderLayers();
    renderControls();
  }

  function updateLayer(patch,commit=false){
    const id=state.selectedId;
    if(!id) return;

    state.layers=state.layers.map(layer=>
      layer.id===id?{...layer,...patch}:layer
    );

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
          flipY:false
        };

        state.layers.push(layer);
        state.selectedId=layer.id;
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

  function duplicateSelected(){
    const layer=selected();
    if(!layer) return;

    const copy={
      ...clone(layer),
      id:uid(),
      name:`${layer.name} copia`,
      x:layer.x+Math.max(12,state.canvas.width*.02),
      y:layer.y+Math.max(12,state.canvas.height*.02)
    };

    state.layers.push(copy);
    state.selectedId=copy.id;
    render();
    snapshot('Imagen duplicada');
  }

  function deleteSelected(){
    if(!state.selectedId) return;
    state.layers=state.layers.filter(layer=>layer.id!==state.selectedId);
    state.selectedId=state.layers.at(-1)?.id||null;
    render();
    snapshot('Imagen eliminada');
  }

  function moveLayer(direction){
    const index=state.layers.findIndex(layer=>layer.id===state.selectedId);
    if(index<0) return;

    const next=direction==='forward'
      ? Math.min(state.layers.length-1,index+1)
      : Math.max(0,index-1);

    if(next===index) return;

    const [item]=state.layers.splice(index,1);
    state.layers.splice(next,0,item);
    render();
    snapshot();
  }

  function beginInteraction(event,node,type){
    const layer=selected();
    if(!layer) return;

    event.preventDefault();
    event.stopPropagation();

    const start={
      pointerId:event.pointerId,
      type,
      clientX:event.clientX,
      clientY:event.clientY,
      layer:clone(layer)
    };

    if(type==='rotate'){
      const rect=node.getBoundingClientRect();
      start.centerX=rect.left+rect.width/2;
      start.centerY=rect.top+rect.height/2;
      start.startAngle=Math.atan2(
        event.clientY-start.centerY,
        event.clientX-start.centerX
      );
    }

    interaction=start;
    node.setPointerCapture(event.pointerId);
  }

  function interactionMove(event){
    if(!interaction || event.pointerId!==interaction.pointerId) return;

    const base=interaction.layer;
    const dx=(event.clientX-interaction.clientX)/scale;
    const dy=(event.clientY-interaction.clientY)/scale;

    if(interaction.type==='move'){
      updateLayer({
        x:base.x+dx,
        y:base.y+dy
      });
    }else if(interaction.type==='resize'){
      let width=Math.max(20,base.width+dx);
      let height=Math.max(20,base.height+dy);

      if(state.aspectLock){
        const ratio=base.width/Math.max(1,base.height);
        const dominant=Math.abs(dx)>Math.abs(dy)?'x':'y';
        if(dominant==='x'){
          height=width/ratio;
        }else{
          width=height*ratio;
        }
      }

      updateLayer({width,height});
    }else if(interaction.type==='rotate'){
      const angle=Math.atan2(
        event.clientY-interaction.centerY,
        event.clientX-interaction.centerX
      );

      const delta=(angle-interaction.startAngle)*180/Math.PI;
      updateLayer({rotation:base.rotation+delta});
    }
  }

  function endInteraction(event){
    if(!interaction || event.pointerId!==interaction.pointerId) return;
    interaction=null;
    snapshot();
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
      const a=document.createElement('a');
      a.href=url;
      a.download=`CMB-${Date.now().toString(36).toUpperCase()}.png`;
      a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
      toast('PNG exportado');
    },'image/png');
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
        toast('HEX invalido');
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
        state.selectedId=null;
        render();
        return;
      }

      const id=node.dataset.id;
      if(state.selectedId!==id){
        state.selectedId=id;
        render();
      }

      const handle=event.target.dataset.handle;
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
      input.addEventListener('input',()=>updateLayer({[key]:Number(input.value)||0}));
      input.addEventListener('change',()=>snapshot());
    });

    els.w.addEventListener('input',()=>{
      const layer=selected();
      if(!layer) return;
      const width=Math.max(20,Number(els.w.value)||20);
      if(state.aspectLock){
        updateLayer({
          width,
          height:width/(layer.width/Math.max(1,layer.height))
        });
      }else{
        updateLayer({width});
      }
    });
    els.w.addEventListener('change',()=>snapshot());

    els.h.addEventListener('input',()=>{
      const layer=selected();
      if(!layer) return;
      const height=Math.max(20,Number(els.h.value)||20);
      if(state.aspectLock){
        updateLayer({
          height,
          width:height*(layer.width/Math.max(1,layer.height))
        });
      }else{
        updateLayer({height});
      }
    });
    els.h.addEventListener('change',()=>snapshot());

    els.opacity.addEventListener('input',()=>{
      updateLayer({opacity:clamp(Number(els.opacity.value)/100,0,1)});
    });
    els.opacity.addEventListener('change',()=>snapshot());

    els.aspect.addEventListener('change',()=>{
      state.aspectLock=els.aspect.checked;
      snapshot();
    });

    els.duplicate.addEventListener('click',duplicateSelected);
    els.remove.addEventListener('click',deleteSelected);

    els.flipX.addEventListener('click',()=>{
      const layer=selected();
      if(!layer) return;
      updateLayer({flipX:!layer.flipX},true);
    });

    els.flipY.addEventListener('click',()=>{
      const layer=selected();
      if(!layer) return;
      updateLayer({flipY:!layer.flipY},true);
    });

    els.forward.addEventListener('click',()=>moveLayer('forward'));
    els.backward.addEventListener('click',()=>moveLayer('backward'));

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
      const target=event.target;
      const editing=target && (
        target.tagName==='INPUT' ||
        target.tagName==='TEXTAREA' ||
        target.tagName==='SELECT'
      );

      const mod=event.ctrlKey||event.metaKey;
      const key=event.key.toLowerCase();

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

      if(editing) return;

      if((event.key==='Delete'||event.key==='Backspace') && state.selectedId){
        event.preventDefault();
        deleteSelected();
        return;
      }

      const layer=selected();
      if(!layer) return;

      const step=event.shiftKey?10:1;
      const patch={};

      if(event.key==='ArrowLeft') patch.x=layer.x-step;
      if(event.key==='ArrowRight') patch.x=layer.x+step;
      if(event.key==='ArrowUp') patch.y=layer.y-step;
      if(event.key==='ArrowDown') patch.y=layer.y+step;

      if(Object.keys(patch).length){
        event.preventDefault();
        updateLayer(patch);
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
    addFiles
  };
}());