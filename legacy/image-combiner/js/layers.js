(function(){
  'use strict';

  function selectedLayers(state, movableOnly=false){
    const ids=new Set(state.selection?.ids||[]);
    return state.layers.filter(layer=>
      ids.has(layer.id) &&
      layer.visible!==false &&
      (!movableOnly || !layer.locked)
    );
  }

  function bounds(layers){
    if(!layers.length) return null;

    const minX=Math.min(...layers.map(layer=>layer.x));
    const minY=Math.min(...layers.map(layer=>layer.y));
    const maxX=Math.max(...layers.map(layer=>layer.x+layer.width));
    const maxY=Math.max(...layers.map(layer=>layer.y+layer.height));

    return {
      minX,
      minY,
      maxX,
      maxY,
      width:maxX-minX,
      height:maxY-minY,
      centerX:(minX+maxX)/2,
      centerY:(minY+maxY)/2
    };
  }

  function align(state,mode,target='canvas'){
    const chosen=selectedLayers(state,true);
    if(!chosen.length) return false;

    const ids=new Set(chosen.map(layer=>layer.id));
    const group=bounds(chosen);

    if(target==='canvas'){
      let dx=0;
      let dy=0;

      if(mode==='left') dx=-group.minX;
      if(mode==='center-x') dx=state.canvas.width/2-group.centerX;
      if(mode==='right') dx=state.canvas.width-group.maxX;
      if(mode==='top') dy=-group.minY;
      if(mode==='center-y') dy=state.canvas.height/2-group.centerY;
      if(mode==='bottom') dy=state.canvas.height-group.maxY;

      state.layers=state.layers.map(layer=>
        ids.has(layer.id)
          ? {...layer,x:layer.x+dx,y:layer.y+dy}
          : layer
      );

      return true;
    }

    if(chosen.length<2) return false;

    state.layers=state.layers.map(layer=>{
      if(!ids.has(layer.id)) return layer;

      if(mode==='left') return {...layer,x:group.minX};
      if(mode==='center-x') return {...layer,x:group.centerX-layer.width/2};
      if(mode==='right') return {...layer,x:group.maxX-layer.width};
      if(mode==='top') return {...layer,y:group.minY};
      if(mode==='center-y') return {...layer,y:group.centerY-layer.height/2};
      if(mode==='bottom') return {...layer,y:group.maxY-layer.height};

      return layer;
    });

    return true;
  }

  function distribute(state,axis){
    const chosen=selectedLayers(state,true);
    if(chosen.length<3) return false;

    const sorted=[...chosen].sort((a,b)=>
      axis==='x' ? a.x-b.x : a.y-b.y
    );

    const group=bounds(sorted);
    const ids=new Set(sorted.map(layer=>layer.id));
    const patches=new Map();

    if(axis==='x'){
      const total=sorted.reduce((sum,layer)=>sum+layer.width,0);
      const gap=(group.width-total)/(sorted.length-1);
      let cursor=group.minX;

      sorted.forEach(layer=>{
        patches.set(layer.id,{x:cursor});
        cursor+=layer.width+gap;
      });
    }else{
      const total=sorted.reduce((sum,layer)=>sum+layer.height,0);
      const gap=(group.height-total)/(sorted.length-1);
      let cursor=group.minY;

      sorted.forEach(layer=>{
        patches.set(layer.id,{y:cursor});
        cursor+=layer.height+gap;
      });
    }

    state.layers=state.layers.map(layer=>
      ids.has(layer.id)
        ? {...layer,...patches.get(layer.id)}
        : layer
    );

    return true;
  }

  function stepOrder(state,direction){
    const ids=new Set(state.selection?.ids||[]);
    if(!ids.size) return false;

    let changed=false;
    const list=[...state.layers];

    if(direction==='forward'){
      for(let i=list.length-2;i>=0;i-=1){
        if(ids.has(list[i].id) && !ids.has(list[i+1].id)){
          [list[i],list[i+1]]=[list[i+1],list[i]];
          changed=true;
        }
      }
    }else{
      for(let i=1;i<list.length;i+=1){
        if(ids.has(list[i].id) && !ids.has(list[i-1].id)){
          [list[i],list[i-1]]=[list[i-1],list[i]];
          changed=true;
        }
      }
    }

    if(changed) state.layers=list;
    return changed;
  }

  function reorder(state,sourceId,targetId){
    if(sourceId===targetId) return false;

    const sourceIndex=state.layers.findIndex(layer=>layer.id===sourceId);
    const targetIndex=state.layers.findIndex(layer=>layer.id===targetId);

    if(sourceIndex<0 || targetIndex<0) return false;

    const list=[...state.layers];
    const [item]=list.splice(sourceIndex,1);
    const adjustedTarget=list.findIndex(layer=>layer.id===targetId);

    list.splice(Math.max(0,adjustedTarget),0,item);
    state.layers=list;
    return true;
  }

  window.CombinerLayers={
    selectedLayers,
    bounds,
    align,
    distribute,
    stepOrder,
    reorder
  };
}());