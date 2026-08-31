(function(){
  'use strict';

  function decimals(step){
    const text=String(step||'1');
    if(text==='any') return 8;
    const index=text.indexOf('.');
    return index<0?0:Math.min(8,text.length-index-1);
  }

  function finite(value,fallback){
    const number=Number(value);
    return Number.isFinite(number)?number:fallback;
  }

  function clampToRange(range,value){
    let next=finite(value,finite(range.value,0));
    const hasMin=range.min!=='' && Number.isFinite(Number(range.min));
    const hasMax=range.max!=='' && Number.isFinite(Number(range.max));
    const min=hasMin?Number(range.min):-Infinity;
    const max=hasMax?Number(range.max):Infinity;

    next=Math.max(min,Math.min(max,next));

    if(range.step && range.step!=='any'){
      const step=Number(range.step);
      if(Number.isFinite(step) && step>0){
        const base=hasMin?min:0;
        next=base+Math.round((next-base)/step)*step;
        next=Number(next.toFixed(decimals(range.step)));
      }
    }

    return next;
  }

  function findNativeNumber(range){
    const scope=
      range.closest(
        '.range-field,.slider-row,.control-row,.slider-control,.parameter-list label,.control-section label,.effect-card,label'
      ) || range.parentElement;

    if(!scope) return null;

    return Array.from(
      scope.querySelectorAll('input[type="number"]')
    ).find(input=>!input.classList.contains('kaoru-exact-number'))||null;
  }

  function enhance(range){
    if(!(range instanceof HTMLInputElement)) return;
    if(range.type!=='range') return;

    if(range.dataset.kaoruExact==='native') return;

    if(range.dataset.kaoruExact==='ready'){
      const box=range.parentElement?.querySelector('.kaoru-exact-number');
      if(box){
        box.min=range.min;
        box.max=range.max;
        box.step=range.step||'1';
        box.disabled=range.disabled;
        if(document.activeElement!==box) box.value=range.value;
      }
      return;
    }

    if(
      range.dataset.noExactNumber==='true' ||
      range.dataset.kaoruNoNumber==='true'
    ){
      return;
    }

    if(findNativeNumber(range)){
      range.dataset.kaoruExact='native';
      return;
    }

    const parent=range.parentNode;
    if(!parent) return;

    const pair=document.createElement('span');
    pair.className='kaoru-range-pair';

    parent.insertBefore(pair,range);
    pair.appendChild(range);

    const box=document.createElement('input');
    box.type='number';
    box.className='kaoru-exact-number';
    box.setAttribute('aria-label','Valor exacto');
    box.title='Escribe un valor exacto';
    pair.appendChild(box);

    function syncMeta(){
      box.min=range.min;
      box.max=range.max;
      box.step=range.step||'1';
      box.disabled=range.disabled;
    }

    function syncFromRange(){
      syncMeta();
      if(document.activeElement!==box){
        box.value=range.value;
      }
    }

    function pushToRange(type){
      if(box.value==='') return;
      const next=clampToRange(range,box.valueAsNumber);
      range.value=String(next);
      range.dispatchEvent(new Event(type,{bubbles:true}));
      if(type==='change') box.value=range.value;
    }

    range.addEventListener('input',syncFromRange);
    range.addEventListener('change',syncFromRange);

    box.addEventListener('input',()=>{
      if(Number.isFinite(box.valueAsNumber)){
        pushToRange('input');
      }
    });

    box.addEventListener('change',()=>{
      if(!Number.isFinite(box.valueAsNumber)){
        box.value=range.value;
        return;
      }
      pushToRange('change');
    });

    box.addEventListener('keydown',event=>{
      if(event.key==='Enter') box.blur();
    });

    range.dataset.kaoruExact='ready';
    syncFromRange();
  }

  function scan(root){
    if(!root) return;

    if(root instanceof HTMLInputElement && root.type==='range'){
      enhance(root);
    }

    if(root.querySelectorAll){
      root.querySelectorAll('input[type="range"]').forEach(enhance);
    }
  }

  function init(){
    scan(document);

    const observer=new MutationObserver(mutations=>{
      mutations.forEach(mutation=>{
        if(mutation.type==='childList'){
          mutation.addedNodes.forEach(node=>{
            if(node.nodeType===1) scan(node);
          });
        }

        if(
          mutation.type==='attributes' &&
          mutation.target instanceof HTMLInputElement &&
          mutation.target.type==='range'
        ){
          enhance(mutation.target);
        }
      });
    });

    observer.observe(document.body,{
      subtree:true,
      childList:true,
      attributes:true,
      attributeFilter:['min','max','step','disabled','value']
    });

    window.KaoruPrecisionControls={
      refresh(){
        scan(document);
      }
    };
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init,{once:true});
  }else{
    init();
  }
}());