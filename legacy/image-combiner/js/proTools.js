(function(){
  'use strict';

  const api=window.ImageCombinerStudio;

  if(!api){
    console.error('ImageCombinerStudio API no disponible.');
    return;
  }

  const $=selector=>document.querySelector(selector);

  let styleClipboard=null;

  const MASK_OPTIONS=[
    ['none','Sin máscara'],
    ['rounded','Rectángulo redondeado'],
    ['circle','Círculo'],
    ['ellipse','Elipse'],
    ['triangle','Triángulo'],
    ['diamond','Rombo'],
    ['hexagon','Hexágono'],
    ['star','Estrella']
  ];

  const BLEND_OPTIONS=[
    ['normal','Normal'],
    ['multiply','Multiplicar'],
    ['screen','Trama / Screen'],
    ['overlay','Superponer'],
    ['darken','Oscurecer'],
    ['lighten','Aclarar'],
    ['color-dodge','Sobreexponer color'],
    ['color-burn','Subexponer color'],
    ['hard-light','Luz fuerte'],
    ['soft-light','Luz suave'],
    ['difference','Diferencia'],
    ['exclusion','Exclusión'],
    ['hue','Tono'],
    ['saturation','Saturación'],
    ['color','Color'],
    ['luminosity','Luminosidad']
  ];

  function uid(){
    return `group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  }

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function selected(state){
    const ids=new Set(state.selection?.ids||[]);
    return state.layers.filter(layer=>ids.has(layer.id));
  }

  function primary(state){
    return state.layers.find(layer=>layer.id===state.selection?.primaryId)||selected(state)[0]||null;
  }

  function makeOptions(list){
    return list
      .map(([value,label])=>`<option value="${value}">${label}</option>`)
      .join('');
  }

  const section=document.createElement('section');
  section.className='panel-section pro-tools-section';

  section.innerHTML=`
    <div class="section-title"><span>PRO</span><h2>Máscaras, mezcla y grupos</h2></div>

    <div class="pro-selection-summary" id="proSelectionSummary">Selecciona una o más capas.</div>

    <div class="pro-card">
      <strong>Máscara de imagen</strong>
      <label class="field">
        <span>Forma</span>
        <select id="proMaskType">${makeOptions(MASK_OPTIONS)}</select>
      </label>

      <label class="range-field slim">
        <span>Radio redondeado <output id="proMaskRadiusOut">18 px</output></span>
        <input id="proMaskRadius" type="range" min="0" max="50" value="18">
      </label>
      <p class="mini-help">La máscara recorta visualmente la capa sin destruir la imagen original.</p>
    </div>

    <div class="pro-card">
      <strong>Modo de fusión</strong>
      <label class="field">
        <span>Blend mode</span>
        <select id="proBlendMode">${makeOptions(BLEND_OPTIONS)}</select>
      </label>
      <p class="mini-help">Funciona en el lienzo y también al exportar PNG/JPG/WEBP.</p>
    </div>

    <div class="pro-card">
      <div class="pro-card-title">
        <strong>Grupos</strong>
        <span id="proGroupStatus">Sin grupo</span>
      </div>

      <label class="field">
        <span>Nombre del grupo</span>
        <input id="proGroupName" type="text" maxlength="60" placeholder="Ej. stickers">
      </label>

      <div class="button-grid two">
        <button class="secondary" id="proGroupBtn" type="button">Agrupar</button>
        <button class="secondary" id="proUngroupBtn" type="button">Desagrupar</button>
        <button class="secondary" id="proSelectGroupBtn" type="button">Seleccionar grupo</button>
        <button class="secondary" id="proRenameGroupBtn" type="button">Renombrar grupo</button>
      </div>

      <p class="mini-help">Ctrl+G agrupa. Ctrl+Shift+G desagrupa. Al seleccionar el grupo puedes mover todas sus capas juntas.</p>
    </div>

    <div class="pro-card">
      <strong>Organización PRO</strong>

      <div class="button-grid two">
        <button class="secondary" id="proFrontBtn" type="button">Traer al frente</button>
        <button class="secondary" id="proBackBtn" type="button">Enviar al fondo</button>
        <button class="secondary" id="proLockBtn" type="button">Bloquear selección</button>
        <button class="secondary" id="proHideBtn" type="button">Ocultar selección</button>
        <button class="secondary" id="proCopyStyleBtn" type="button">Copiar estilo</button>
        <button class="secondary" id="proPasteStyleBtn" type="button">Pegar estilo</button>
      </div>
    </div>

    <div class="pro-card">
      <strong>Guías del lienzo</strong>

      <label class="check-row">
        <input id="proGridToggle" type="checkbox">
        <span>Mostrar cuadrícula</span>
      </label>

      <label class="check-row">
        <input id="proCenterToggle" type="checkbox">
        <span>Mostrar centro horizontal/vertical</span>
      </label>

      <label class="field">
        <span>Safe area</span>
        <select id="proSafeArea">
          <option value="none">Ninguna</option>
          <option value="instagram-story">Instagram Story / Reel</option>
          <option value="tiktok">TikTok vertical</option>
          <option value="youtube">YouTube / thumbnail</option>
          <option value="square">Post cuadrado</option>
        </select>
      </label>

      <p class="mini-help">Las guías son solo de trabajo: nunca aparecen en la exportación.</p>
    </div>
  `;

  const projectSection=$('.project-section');
  const settings=$('.settings-panel');

  if(projectSection?.parentNode){
    projectSection.parentNode.insertBefore(section,projectSection);
  }else{
    settings?.appendChild(section);
  }

  const els={
    summary:$('#proSelectionSummary'),
    mask:$('#proMaskType'),
    maskRadius:$('#proMaskRadius'),
    maskRadiusOut:$('#proMaskRadiusOut'),
    blend:$('#proBlendMode'),
    groupStatus:$('#proGroupStatus'),
    groupName:$('#proGroupName'),
    group:$('#proGroupBtn'),
    ungroup:$('#proUngroupBtn'),
    selectGroup:$('#proSelectGroupBtn'),
    renameGroup:$('#proRenameGroupBtn'),
    front:$('#proFrontBtn'),
    back:$('#proBackBtn'),
    lock:$('#proLockBtn'),
    hide:$('#proHideBtn'),
    copyStyle:$('#proCopyStyleBtn'),
    pasteStyle:$('#proPasteStyleBtn'),
    grid:$('#proGridToggle'),
    center:$('#proCenterToggle'),
    safe:$('#proSafeArea')
  };

  const guides=document.createElement('div');
  guides.className='pro-guide-overlay';
  guides.innerHTML=`
    <div class="pro-grid-guide"></div>
    <div class="pro-center-guide pro-center-h"></div>
    <div class="pro-center-guide pro-center-v"></div>
    <div class="pro-safe-guide"></div>
  `;

  const stage=$('#canvasStage');
  stage?.appendChild(guides);

  function mutate(mutator,label,commit=true){
    const next=api.mutate(mutator,label,commit);
    sync(next);
    return next;
  }

  function groupInfo(state){
    const chosen=selected(state);
    const ids=[...new Set(chosen.map(layer=>layer.groupId).filter(Boolean))];

    if(ids.length!==1) return null;

    const groupId=ids[0];
    const members=state.layers.filter(layer=>layer.groupId===groupId);

    return {
      id:groupId,
      members,
      name:members.find(layer=>layer.groupName)?.groupName||'Grupo'
    };
  }

  function annotateRows(state){
    const byId=new Map(state.layers.map(layer=>[layer.id,layer]));

    document.querySelectorAll('.layer-row').forEach(row=>{
      const layer=byId.get(row.dataset.layerId);
      if(!layer) return;

      let badge=row.querySelector('.pro-layer-badge');

      if(layer.groupId || layer.blendMode!=='normal' || layer.mask?.type!=='none'){
        if(!badge){
          badge=document.createElement('span');
          badge.className='pro-layer-badge';

          const meta=row.querySelector('.layer-meta');
          meta?.after(badge);
        }

        const tags=[];

        if(layer.groupId){
          tags.push(`G:${layer.groupName||'grupo'}`);
        }

        if(layer.mask?.type && layer.mask.type!=='none'){
          tags.push(`M:${layer.mask.type}`);
        }

        if(layer.blendMode && layer.blendMode!=='normal'){
          tags.push(`B:${layer.blendMode}`);
        }

        badge.textContent=tags.join(' · ');
      }else{
        badge?.remove();
      }
    });
  }

  function safeAreaStyle(value){
    if(value==='instagram-story'){
      return {left:'8%',right:'8%',top:'12%',bottom:'14%'};
    }

    if(value==='tiktok'){
      return {left:'7%',right:'15%',top:'12%',bottom:'18%'};
    }

    if(value==='youtube'){
      return {left:'5%',right:'5%',top:'8%',bottom:'8%'};
    }

    if(value==='square'){
      return {left:'10%',right:'10%',top:'10%',bottom:'10%'};
    }

    return null;
  }

  function syncGuides(state){
    const ui=state.proUi||{};
    const grid=guides.querySelector('.pro-grid-guide');
    const centerH=guides.querySelector('.pro-center-h');
    const centerV=guides.querySelector('.pro-center-v');
    const safe=guides.querySelector('.pro-safe-guide');

    grid.hidden=!ui.grid;
    centerH.hidden=!ui.centerGuides;
    centerV.hidden=!ui.centerGuides;

    const safeStyle=safeAreaStyle(ui.safeArea);

    safe.hidden=!safeStyle;

    if(safeStyle){
      Object.assign(safe.style,safeStyle);
    }

    els.grid.checked=Boolean(ui.grid);
    els.center.checked=Boolean(ui.centerGuides);
    els.safe.value=ui.safeArea||'none';
  }

  function sync(state=api.getState()){
    const chosen=selected(state);
    const first=primary(state);
    const group=groupInfo(state);
    const has=chosen.length>0;

    els.summary.textContent=
      chosen.length===0
        ? 'Selecciona una o más capas.'
        : chosen.length===1
          ? `1 capa: ${first?.name||'imagen'}`
          : `${chosen.length} capas seleccionadas`;

    [
      els.mask,els.maskRadius,els.blend,
      els.group,els.ungroup,els.selectGroup,els.renameGroup,
      els.front,els.back,els.lock,els.hide,els.copyStyle
    ].forEach(control=>{
      control.disabled=!has;
    });

    els.pasteStyle.disabled=!has || !styleClipboard;
    els.group.disabled=chosen.length<2;
    els.selectGroup.disabled=!group;
    els.renameGroup.disabled=!group;

    if(first){
      CombinerEffects.ensure(first);
      els.mask.value=first.mask.type;
      els.maskRadius.value=String(first.mask.radius);
      els.maskRadiusOut.textContent=`${Math.round(first.mask.radius)} px`;
      els.blend.value=first.blendMode;
    }

    if(group){
      els.groupStatus.textContent=`${group.name} · ${group.members.length} capas`;

      if(document.activeElement!==els.groupName){
        els.groupName.value=group.name;
      }
    }else{
      els.groupStatus.textContent='Sin grupo';

      if(document.activeElement!==els.groupName){
        els.groupName.value='';
      }
    }

    annotateRows(state);
    syncGuides(state);
  }

  els.mask.addEventListener('change',()=>{
    mutate(state=>{
      const ids=new Set(state.selection.ids||[]);

      state.layers.forEach(layer=>{
        if(ids.has(layer.id)){
          CombinerEffects.ensure(layer);
          layer.mask.type=els.mask.value;
        }
      });
    },'Máscara actualizada');
  });

  els.maskRadius.addEventListener('input',()=>{
    els.maskRadiusOut.textContent=`${els.maskRadius.value} px`;

    mutate(state=>{
      const ids=new Set(state.selection.ids||[]);

      state.layers.forEach(layer=>{
        if(ids.has(layer.id)){
          CombinerEffects.ensure(layer);
          layer.mask.radius=Number(els.maskRadius.value)||0;
        }
      });
    },null,false);
  });

  els.maskRadius.addEventListener('change',()=>{
    api.commit('Radio de máscara actualizado');
  });

  els.blend.addEventListener('change',()=>{
    mutate(state=>{
      const ids=new Set(state.selection.ids||[]);

      state.layers.forEach(layer=>{
        if(ids.has(layer.id)){
          CombinerEffects.ensure(layer);
          layer.blendMode=els.blend.value;
        }
      });
    },'Modo de fusión actualizado');
  });

  els.group.addEventListener('click',()=>{
    const state=api.getState();
    const ids=state.selection.ids||[];

    if(ids.length<2){
      api.notify('Selecciona al menos 2 capas.');
      return;
    }

    const id=uid();
    const name=(els.groupName.value||`Grupo ${Date.now().toString(36).slice(-3)}`).trim();

    mutate(next=>{
      const chosen=new Set(next.selection.ids||[]);

      next.layers.forEach(layer=>{
        if(chosen.has(layer.id)){
          layer.groupId=id;
          layer.groupName=name;
        }
      });
    },'Capas agrupadas');
  });

  function ungroup(){
    const state=api.getState();
    const chosen=selected(state);
    const groupIds=new Set(chosen.map(layer=>layer.groupId).filter(Boolean));

    if(!groupIds.size){
      api.notify('La selección no pertenece a un grupo.');
      return;
    }

    mutate(next=>{
      next.layers.forEach(layer=>{
        if(groupIds.has(layer.groupId)){
          layer.groupId=null;
          layer.groupName='';
        }
      });
    },'Grupo eliminado');
  }

  els.ungroup.addEventListener('click',ungroup);

  els.selectGroup.addEventListener('click',()=>{
    const state=api.getState();
    const group=groupInfo(state);

    if(!group) return;

    api.selectIds(
      group.members.map(layer=>layer.id),
      group.members.at(-1)?.id||null
    );

    api.notify('Grupo seleccionado.');
    sync(api.getState());
  });

  els.renameGroup.addEventListener('click',()=>{
    const state=api.getState();
    const group=groupInfo(state);

    if(!group) return;

    const name=(els.groupName.value||'Grupo').trim().slice(0,60)||'Grupo';

    mutate(next=>{
      next.layers.forEach(layer=>{
        if(layer.groupId===group.id){
          layer.groupName=name;
        }
      });
    },'Grupo renombrado');
  });

  els.front.addEventListener('click',()=>{
    mutate(state=>{
      const ids=new Set(state.selection.ids||[]);
      const selectedLayers=state.layers.filter(layer=>ids.has(layer.id));
      const rest=state.layers.filter(layer=>!ids.has(layer.id));
      state.layers=[...rest,...selectedLayers];
    },'Selección traída al frente');
  });

  els.back.addEventListener('click',()=>{
    mutate(state=>{
      const ids=new Set(state.selection.ids||[]);
      const selectedLayers=state.layers.filter(layer=>ids.has(layer.id));
      const rest=state.layers.filter(layer=>!ids.has(layer.id));
      state.layers=[...selectedLayers,...rest];
    },'Selección enviada al fondo');
  });

  els.lock.addEventListener('click',()=>{
    mutate(state=>{
      const ids=new Set(state.selection.ids||[]);
      const chosen=state.layers.filter(layer=>ids.has(layer.id));
      const shouldLock=!chosen.every(layer=>layer.locked);

      state.layers.forEach(layer=>{
        if(ids.has(layer.id)){
          layer.locked=shouldLock;
        }
      });
    },'Bloqueo de selección actualizado');
  });

  els.hide.addEventListener('click',()=>{
    mutate(state=>{
      const ids=new Set(state.selection.ids||[]);
      const chosen=state.layers.filter(layer=>ids.has(layer.id));
      const shouldHide=!chosen.every(layer=>layer.visible===false);

      state.layers.forEach(layer=>{
        if(ids.has(layer.id)){
          layer.visible=!shouldHide;
        }
      });

      if(shouldHide){
        state.selection={ids:[],primaryId:null};
      }
    },'Visibilidad de selección actualizada');
  });

  els.copyStyle.addEventListener('click',()=>{
    const state=api.getState();
    const layer=primary(state);

    if(!layer) return;

    CombinerEffects.ensure(layer);

    styleClipboard=clone({
      borders:layer.borders,
      shadow:layer.shadow,
      glow:layer.glow,
      effects:layer.effects,
      mask:layer.mask,
      blendMode:layer.blendMode,
      opacity:layer.opacity
    });

    els.pasteStyle.disabled=false;
    api.notify('Estilo copiado.');
  });

  els.pasteStyle.addEventListener('click',()=>{
    if(!styleClipboard) return;

    mutate(state=>{
      const ids=new Set(state.selection.ids||[]);

      state.layers.forEach(layer=>{
        if(!ids.has(layer.id)) return;

        layer.borders=clone(styleClipboard.borders);
        layer.shadow=clone(styleClipboard.shadow);
        layer.glow=clone(styleClipboard.glow);
        layer.effects=clone(styleClipboard.effects);
        layer.mask=clone(styleClipboard.mask);
        layer.blendMode=styleClipboard.blendMode;
        layer.opacity=styleClipboard.opacity;
      });
    },'Estilo pegado');
  });

  els.grid.addEventListener('change',()=>{
    mutate(state=>{
      state.proUi={
        grid:false,
        centerGuides:false,
        safeArea:'none',
        ...(state.proUi||{}),
        grid:els.grid.checked
      };
    },null,false);
  });

  els.center.addEventListener('change',()=>{
    mutate(state=>{
      state.proUi={
        grid:false,
        centerGuides:false,
        safeArea:'none',
        ...(state.proUi||{}),
        centerGuides:els.center.checked
      };
    },null,false);
  });

  els.safe.addEventListener('change',()=>{
    mutate(state=>{
      state.proUi={
        grid:false,
        centerGuides:false,
        safeArea:'none',
        ...(state.proUi||{}),
        safeArea:els.safe.value
      };
    },null,false);
  });

  document.addEventListener('keydown',event=>{
    const editing=['INPUT','TEXTAREA','SELECT'].includes(event.target?.tagName);
    if(editing) return;

    const mod=event.ctrlKey||event.metaKey;

    if(mod && event.key.toLowerCase()==='g'){
      event.preventDefault();

      if(event.shiftKey){
        ungroup();
      }else{
        els.group.click();
      }
    }
  });

  document.addEventListener('pointerup',()=>{
    queueMicrotask(()=>sync(api.getState()));
  },true);

  document.addEventListener('keyup',()=>{
    queueMicrotask(()=>sync(api.getState()));
  },true);

  window.ImageCombinerProBridge={
    notify:sync
  };

  sync();
}());