(function(){
  'use strict';

  const $=selector=>document.querySelector(selector);

  const els={
    name:$('#projectName'),
    save:$('#saveGalleryBtn'),
    saveTemplate:$('#saveTemplateBtn'),
    exportProject:$('#exportProjectBtn'),
    importProject:$('#importProjectBtn'),
    importInput:$('#projectFileInput'),
    format:$('#exportFormat'),
    scale:$('#exportScale'),
    quality:$('#exportQuality'),
    qualityOut:$('#exportQualityOut'),
    advancedExport:$('#advancedExportBtn'),
    newProject:$('#newProjectBtn'),
    projectStatus:$('#projectStatus')
  };

  let currentRecordId=null;
  let currentKind='project';

  function safeName(value){
    return String(value||'Composición')
      .trim()
      .slice(0,100) || 'Composición';
  }

  function fileName(value){
    return safeName(value)
      .normalize('NFKD')
      .replace(/[^\w\-]+/g,'-')
      .replace(/-+/g,'-')
      .replace(/^-|-$/g,'')
      .slice(0,70) || 'composicion';
  }

  function toast(message){
    const node=document.querySelector('#toast');
    if(!node) return;

    node.textContent=message;
    node.classList.add('show');

    clearTimeout(toast.timer);
    toast.timer=setTimeout(
      ()=>node.classList.remove('show'),
      1900
    );
  }

  function status(text){
    els.projectStatus.textContent=text;
  }

  async function renderCanvas(multiplier=1){
    const studio=window.ImageCombinerStudio;
    const state=studio.getState();

    const base=document.createElement('canvas');
    base.width=state.canvas.width;
    base.height=state.canvas.height;

    const ctx=base.getContext('2d');

    if(state.canvas.backgroundMode==='color'){
      ctx.fillStyle=state.canvas.backgroundColor;
      ctx.fillRect(0,0,base.width,base.height);
    }else{
      ctx.clearRect(0,0,base.width,base.height);
    }

    for(const layer of state.layers){
      if(layer.visible===false) continue;

      const image=await CombinerEffects.imageFromSource(layer.src);
      CombinerEffects.drawLayer(ctx,layer,image);
    }

    const scale=Math.max(.25,Math.min(4,Number(multiplier)||1));

    if(scale===1) return base;

    const output=document.createElement('canvas');
    output.width=Math.max(1,Math.round(base.width*scale));
    output.height=Math.max(1,Math.round(base.height*scale));

    const out=output.getContext('2d');
    out.imageSmoothingEnabled=true;
    out.imageSmoothingQuality='high';
    out.drawImage(base,0,0,output.width,output.height);

    return output;
  }

  async function thumbnail(){
    const source=await renderCanvas(1);
    const max=520;
    const ratio=Math.min(1,max/Math.max(source.width,source.height));

    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(source.width*ratio));
    canvas.height=Math.max(1,Math.round(source.height*ratio));

    const ctx=canvas.getContext('2d');
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality='high';

    if(source.width && source.height){
      ctx.drawImage(source,0,0,canvas.width,canvas.height);
    }

    return canvas.toDataURL('image/webp',.78);
  }

  function payload(kind=currentKind){
    const state=window.ImageCombinerStudio.getState();

    return {
      schema:'kaoru.image-combiner.project',
      version:5,
      kind,
      name:safeName(els.name.value),
      exportedAt:new Date().toISOString(),
      state
    };
  }

  async function saveGallery(kind='project'){
    if(!window.StudioGallery){
      throw new Error('La Galería no está disponible.');
    }

    status('Guardando...');

    const record=await StudioGallery.save({
      id:kind===currentKind?currentRecordId:null,
      studio:'combiner',
      kind,
      name:safeName(els.name.value),
      payload:payload(kind),
      thumbnail:await thumbnail()
    });

    currentRecordId=record.id;
    currentKind=kind;

    status(
      kind==='template'
        ? 'Plantilla guardada en Galería'
        : 'Proyecto guardado en Galería'
    );

    toast(
      kind==='template'
        ? 'Plantilla guardada.'
        : 'Proyecto guardado.'
    );

    return record;
  }

  function downloadJson(data,name){
    const blob=new Blob(
      [JSON.stringify(data,null,2)],
      {type:'application/json'}
    );

    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');

    a.href=url;
    a.download=`${fileName(name)}.cmb.json`;
    a.click();

    setTimeout(
      ()=>URL.revokeObjectURL(url),
      1500
    );
  }

  function loadPortable(data,recordId=null){
    const project=
      data?.schema==='silueta-studio-portable-project'
        ? data.record?.payload
        : data?.payload?.schema==='kaoru.image-combiner.project'
          ? data.payload
          : data;

    if(project?.schema!=='kaoru.image-combiner.project'){
      throw new Error('Este archivo no es un proyecto de Image Combiner.');
    }

    if(!project.state){
      throw new Error('El archivo Combiner no contiene el estado del lienzo.');
    }

    window.ImageCombinerStudio.loadState(project.state);

    currentRecordId=recordId;
    currentKind=project.kind==='template'?'template':'project';

    els.name.value=safeName(project.name);

    status(
      currentRecordId
        ? 'Proyecto abierto desde Galería'
        : 'Proyecto importado'
    );

    toast('Proyecto Combiner cargado.');
  }

  async function consumeGalleryLaunch(){
    if(!window.StudioGallery) return;

    const record=await StudioGallery.consumeLaunchIntent('combiner');

    if(!record) return;

    const project=record.payload;

    if(project?.schema!=='kaoru.image-combiner.project'){
      throw new Error('El elemento de Galería no contiene un proyecto Combiner válido.');
    }

    loadPortable(project,record.id);
    currentKind=record.kind||'project';
    els.name.value=record.name||project.name||'Composición';
  }

  async function exportImage(){
    const format=els.format.value;
    const scale=Math.max(.25,Math.min(4,Number(els.scale.value)||1));
    const quality=Math.max(.1,Math.min(1,Number(els.quality.value)/100||.92));

    status('Renderizando exportación...');

    const state=window.ImageCombinerStudio.getState();
    let canvas=await renderCanvas(scale);

    if(format==='jpeg' && state.canvas.backgroundMode==='transparent'){
      const flattened=document.createElement('canvas');
      flattened.width=canvas.width;
      flattened.height=canvas.height;

      const ctx=flattened.getContext('2d');
      ctx.fillStyle='#FFFFFF';
      ctx.fillRect(0,0,flattened.width,flattened.height);
      ctx.drawImage(canvas,0,0);

      canvas=flattened;
    }

    const mime=
      format==='jpeg'
        ? 'image/jpeg'
        : format==='webp'
          ? 'image/webp'
          : 'image/png';

    const extension=
      format==='jpeg'
        ? 'jpg'
        : format;

    canvas.toBlob(blob=>{
      if(!blob){
        status('No se pudo exportar.');
        return;
      }

      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');

      a.href=url;
      a.download=`CMB-${fileName(els.name.value)}-${canvas.width}x${canvas.height}.${extension}`;
      a.click();

      setTimeout(
        ()=>URL.revokeObjectURL(url),
        1500
      );

      status(`Exportado ${canvas.width} × ${canvas.height}`);
      toast(`${extension.toUpperCase()} exportado.`);
    },mime,format==='png'?undefined:quality);
  }

  els.save.addEventListener(
    'click',
    ()=>saveGallery('project').catch(error=>{
      console.error(error);
      status('Error al guardar');
      toast(error.message||'No se pudo guardar.');
    })
  );

  els.saveTemplate.addEventListener(
    'click',
    ()=>saveGallery('template').catch(error=>{
      console.error(error);
      status('Error al guardar plantilla');
      toast(error.message||'No se pudo guardar la plantilla.');
    })
  );

  els.exportProject.addEventListener(
    'click',
    ()=>downloadJson(
      payload(currentKind),
      els.name.value
    )
  );

  els.importProject.addEventListener(
    'click',
    ()=>els.importInput.click()
  );

  els.importInput.addEventListener(
    'change',
    async event=>{
      const file=event.target.files?.[0];
      event.target.value='';

      if(!file) return;

      try{
        loadPortable(
          JSON.parse(await file.text()),
          null
        );
      }catch(error){
        console.error(error);
        toast(error.message||'No se pudo abrir el proyecto.');
      }
    }
  );

  els.quality.addEventListener(
    'input',
    ()=>{
      els.qualityOut.textContent=`${els.quality.value}%`;
    }
  );

  els.format.addEventListener(
    'change',
    ()=>{
      const lossy=els.format.value!=='png';
      els.quality.disabled=!lossy;
      els.qualityOut.classList.toggle('muted',!lossy);
    }
  );

  els.advancedExport.addEventListener(
    'click',
    ()=>exportImage().catch(error=>{
      console.error(error);
      status('Error al exportar');
      toast(error.message||'No se pudo exportar.');
    })
  );

  els.newProject.addEventListener(
    'click',
    ()=>{
      if(!confirm('¿Crear una composición nueva? Los cambios no guardados se perderán.')){
        return;
      }

      window.ImageCombinerStudio.clearProject();
      currentRecordId=null;
      currentKind='project';
      els.name.value='Mi composición';
      status('Proyecto nuevo');
      toast('Composición nueva.');
    }
  );

  els.format.dispatchEvent(new Event('change'));

  consumeGalleryLaunch().catch(error=>{
    console.error(error);
    status('No se pudo abrir desde Galería');
    toast(error.message||'No se pudo abrir el proyecto.');
  });

  window.CombinerProject={
    saveGallery,
    exportImage,
    loadPortable
  };
}());