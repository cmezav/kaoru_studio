(function(){'use strict';
  const bridge=window.ImageStudioLensBridge;
  if(!bridge)return;

  const $=id=>document.getElementById(id);
  const canvas=bridge.getCanvas();

  let mode='none';
  let painting=null;
  let radiusDrag=null;
  let renderTimer=0;

  const blurBtn=$('lensBrushBlurBtn');
  const restoreBtn=$('lensBrushRestoreBtn');
  const clearBtn=$('clearLensBrushBtn');
  const focusNumber=$('lensFocusRadiusNumber');
  const brushRadius=$('lensBrushRadius');
  const brushRadiusOut=$('lensBrushRadiusOut');
  const hardness=$('lensBrushHardness');
  const hardnessOut=$('lensBrushHardnessOut');
  const strength=$('lensBrushStrength');
  const strengthOut=$('lensBrushStrengthOut');
  const handle=$('focusRadiusHandle');
  const cursor=$('lensBrushCursor');

  if(!canvas||!blurBtn||!restoreBtn)return;

  function state(){
    return bridge.getState()
  }

  function lens(){
    return state().lens
  }

  function clamp(value,min,max){
    return Math.max(min,Math.min(max,Number(value)||0))
  }

  function ensureLens(){
    const l=lens();

    if(!l.enabled){
      l.enabled=true;
      const box=$('lensEnabled');
      if(box)box.checked=true
    }
  }

  function syncButtons(){
    blurBtn.classList.toggle('active',mode==='blur');
    restoreBtn.classList.toggle('active',mode==='restore');

    if(cursor){
      cursor.hidden=mode==='none'||!state().lens.enabled
    }

    canvas.classList.toggle(
      'lens-brush-active',
      mode!=='none'
    )
  }

  function syncControls(current){
    const l=current&&current.lens;
    if(!l)return;

    if(focusNumber&&document.activeElement!==focusNumber){
      focusNumber.value=String(
        Math.round(clamp(l.focusRadius,.03,.7)*100)
      )
    }

    if(brushRadius&&document.activeElement!==brushRadius){
      brushRadius.value=String(
        Math.round(clamp(l.brushRadius,.01,.4)*100)
      )
    }

    if(hardness&&document.activeElement!==hardness){
      hardness.value=String(
        Math.round(clamp(l.brushHardness,0,1)*100)
      )
    }

    if(strength&&document.activeElement!==strength){
      strength.value=String(
        Math.round(clamp(l.brushStrength,.01,1)*100)
      )
    }

    if(brushRadiusOut){
      brushRadiusOut.textContent=
        `${Math.round(clamp(l.brushRadius,.01,.4)*100)}%`
    }

    if(hardnessOut){
      hardnessOut.textContent=
        `${Math.round(clamp(l.brushHardness,0,1)*100)}%`
    }

    if(strengthOut){
      strengthOut.textContent=
        `${Math.round(clamp(l.brushStrength,.01,1)*100)}%`
    }

    syncButtons()
  }

  function setMode(next){
    mode=mode===next?'none':next;

    if(mode!=='none'){
      ensureLens();
      bridge.setFocusMode(false)
    }

    syncControls(state());

    bridge.toast(
      mode==='blur'
        ? 'Pincel de desenfoque activo.'
        : mode==='restore'
          ? 'Pincel restaurador activo.'
          : 'Pinceles Lens Blur desactivados.'
    )
  }

  function pointFromEvent(event){
    const rect=canvas.getBoundingClientRect();

    return{
      x:clamp((event.clientX-rect.left)/Math.max(1,rect.width),0,1),
      y:clamp((event.clientY-rect.top)/Math.max(1,rect.height),0,1),
      rect
    }
  }

  function currentStroke(point){
    const l=lens();

    return{
      mode,
      x:point.x,
      y:point.y,
      radius:clamp(l.brushRadius,.01,.4),
      hardness:clamp(l.brushHardness,0,1),
      strength:clamp(l.brushStrength,.01,1)
    }
  }

  function shouldAddStroke(stroke){
    const strokes=lens().strokes;
    const last=strokes[strokes.length-1];

    if(!last||last.mode!==stroke.mode)return true;

    const distance=Math.hypot(
      stroke.x-last.x,
      stroke.y-last.y
    );

    return distance>=Math.max(.003,stroke.radius*.20)
  }

  function queuePreview(){
    clearTimeout(renderTimer);

    renderTimer=setTimeout(
      ()=>bridge.renderFast(),
      42
    )
  }

  function addStroke(event){
    const point=pointFromEvent(event);
    const stroke=currentStroke(point);

    if(!Array.isArray(lens().strokes)){
      lens().strokes=[]
    }

    if(shouldAddStroke(stroke)){
      lens().strokes.push(stroke);

      if(lens().strokes.length>2400){
        lens().strokes=lens().strokes.slice(-2400)
      }

      queuePreview()
    }

    updateCursor(event)
  }

  function updateCursor(event){
    if(!cursor||mode==='none'){
      if(cursor)cursor.hidden=true;
      return
    }

    const rect=canvas.getBoundingClientRect();
    const short=Math.min(rect.width,rect.height);
    const size=clamp(lens().brushRadius,.01,.4)*short*2;
    const wrap=canvas.parentElement.getBoundingClientRect();

    cursor.hidden=false;
    cursor.style.width=`${size}px`;
    cursor.style.height=`${size}px`;
    cursor.style.left=`${event.clientX-wrap.left-size/2}px`;
    cursor.style.top=`${event.clientY-wrap.top-size/2}px`;
    cursor.dataset.mode=mode
  }

  blurBtn.addEventListener(
    'click',
    ()=>setMode('blur')
  );

  restoreBtn.addEventListener(
    'click',
    ()=>setMode('restore')
  );

  $('focusModeBtn')?.addEventListener(
    'click',
    ()=>{
      mode='none';
      syncButtons()
    }
  );

  clearBtn?.addEventListener(
    'click',
    ()=>{
      if(!lens().strokes.length){
        bridge.toast('No hay pinceladas Lens Blur.')
        return
      }

      lens().strokes=[];
      bridge.commit('Pinceladas Lens Blur eliminadas');
      syncControls(state())
    }
  );

  focusNumber?.addEventListener(
    'input',
    ()=>{
      ensureLens();
      lens().focusRadius=
        clamp(focusNumber.value,3,70)/100;

      bridge.updateFocusRing();
      bridge.renderFast()
    }
  );

  focusNumber?.addEventListener(
    'change',
    ()=>{
      bridge.commit('Radio de foco')
    }
  );

  brushRadius?.addEventListener(
    'input',
    ()=>{
      lens().brushRadius=
        clamp(brushRadius.value,1,40)/100;

      syncControls(state())
    }
  );

  brushRadius?.addEventListener(
    'change',
    ()=>bridge.commit('Radio del pincel Lens Blur')
  );

  hardness?.addEventListener(
    'input',
    ()=>{
      lens().brushHardness=
        clamp(hardness.value,0,100)/100;

      syncControls(state())
    }
  );

  hardness?.addEventListener(
    'change',
    ()=>bridge.commit('Dureza del pincel Lens Blur')
  );

  strength?.addEventListener(
    'input',
    ()=>{
      lens().brushStrength=
        clamp(strength.value,1,100)/100;

      syncControls(state())
    }
  );

  strength?.addEventListener(
    'change',
    ()=>bridge.commit('Fuerza del pincel Lens Blur')
  );

  canvas.addEventListener(
    'pointermove',
    (event)=>{
      updateCursor(event);

      if(!painting||painting.id!==event.pointerId)return;

      event.preventDefault();
      event.stopImmediatePropagation();
      addStroke(event)
    },
    {capture:true}
  );

  canvas.addEventListener(
    'pointerleave',
    ()=>{
      if(cursor&&!painting)cursor.hidden=true
    },
    {capture:true}
  );

  canvas.addEventListener(
    'pointerdown',
    (event)=>{
      if(mode==='none')return;

      event.preventDefault();
      event.stopImmediatePropagation();

      ensureLens();

      painting={
        id:event.pointerId,
        count:lens().strokes.length
      };

      canvas.setPointerCapture(event.pointerId);
      addStroke(event)
    },
    {capture:true}
  );

  function finishPaint(event){
    if(!painting||painting.id!==event.pointerId)return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const changed=
      lens().strokes.length!==painting.count;

    painting=null;

    try{
      canvas.releasePointerCapture(event.pointerId)
    }catch(_){}

    clearTimeout(renderTimer);

    if(changed){
      bridge.commit(
        mode==='restore'
          ? 'Pincel restaurador Lens Blur'
          : 'Pincel desenfoque Lens Blur'
      )
    }
  }

  canvas.addEventListener(
    'pointerup',
    finishPaint,
    {capture:true}
  );

  canvas.addEventListener(
    'pointercancel',
    finishPaint,
    {capture:true}
  );

  handle?.addEventListener(
    'pointerdown',
    (event)=>{
      event.preventDefault();
      event.stopPropagation();

      ensureLens();
      mode='none';
      syncButtons();

      radiusDrag={
        id:event.pointerId
      };

      handle.setPointerCapture(
        event.pointerId
      )
    }
  );

  handle?.addEventListener(
    'pointermove',
    (event)=>{
      if(!radiusDrag||radiusDrag.id!==event.pointerId)return;

      event.preventDefault();

      const rect=canvas.getBoundingClientRect();
      const cx=rect.left+lens().focusX*rect.width;
      const cy=rect.top+lens().focusY*rect.height;
      const distance=Math.hypot(
        event.clientX-cx,
        event.clientY-cy
      );

      lens().focusRadius=clamp(
        distance/Math.max(1,Math.min(rect.width,rect.height)),
        .03,
        .7
      );

      syncControls(state());
      bridge.updateFocusRing();
      bridge.renderFast()
    }
  );

  function finishRadius(event){
    if(!radiusDrag||radiusDrag.id!==event.pointerId)return;

    radiusDrag=null;

    try{
      handle.releasePointerCapture(event.pointerId)
    }catch(_){}

    bridge.commit('Radio del foco Lens Blur')
  }

  handle?.addEventListener(
    'pointerup',
    finishRadius
  );

  handle?.addEventListener(
    'pointercancel',
    finishRadius
  );

  bridge.notify=syncControls;
  syncControls(state())
}());