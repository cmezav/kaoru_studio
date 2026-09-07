function clone(value){
  if(value==null)return value;

  try{
    return structuredClone(value);
  }catch(_){
    return JSON.parse(
      JSON.stringify(value)
    );
  }
}

function snapshotState(state){
  const result=clone(state);

  if(result?.reference){
    result.reference.image=null;
  }

  if(result?.ui){
    result.ui.selectedSwatchIndex=null;
    result.ui.lastSamplePosition=null;
  }

  return result;
}

function comparable(state){
  const copy=snapshotState(state);

  if(copy?.project){
    copy.project.updatedAt=null;
    copy.project.id=null;
    copy.project.galleryId=null;
    copy.project.createdAt=null;
  }

  if(copy?.engine){
    delete copy.engine;
  }

  if(
    Object.prototype.hasOwnProperty.call(
      copy||{},
      'customModel'
    )
  ){
    delete copy.customModel;
  }

  return JSON.stringify(copy);
}

function restoreLiveOnlyFields(
  target,
  live
){
  const next=clone(target);

  if(next?.reference){
    next.reference.image=
      live?.reference?.image||
      null;
  }

  if(live?.engine){
    next.engine=clone(
      live.engine
    );
  }

  if(
    Object.prototype.hasOwnProperty.call(
      live||{},
      'customModel'
    )
  ){
    next.customModel=
      live.customModel;
  }

  if(
    next?.project&&
    live?.project
  ){
    next.project.id=
      live.project.id??null;

    if(
      Object.prototype.hasOwnProperty.call(
        live.project,
        'galleryId'
      )
    ){
      next.project.galleryId=
        live.project.galleryId??null;
    }

    next.project.createdAt=
      live.project.createdAt??null;

    next.project.updatedAt=
      live.project.updatedAt??null;
  }

  return next;
}

export function createStudioHistory(
  store,
  options={}
){
  const limit=
    Math.max(
      10,
      Number(options.limit)||120
    );

  const debounceMs=
    Math.max(
      60,
      Number(options.debounceMs)||180
    );

  let past=[];
  let future=[];
  let current=
    snapshotState(
      store.getState()
    );

  let pending=null;
  let timer=null;
  let applying=false;
  let suspended=0;

  const listeners=
    new Set();

  function status(){
    return{
      canUndo:past.length>0,
      canRedo:future.length>0,
      undoCount:past.length,
      redoCount:future.length
    };
  }

  function emit(){
    const value=status();

    listeners.forEach(
      listener=>
        listener(value)
    );
  }

  function commitPending(){
    clearTimeout(timer);
    timer=null;

    if(!pending)return;

    const next=pending;
    pending=null;

    if(
      comparable(next)===
      comparable(current)
    ){
      current=
        snapshotState(next);
      return;
    }

    past.push(current);

    if(past.length>limit){
      past.shift();
    }

    current=next;
    future=[];
    emit();
  }

  const unsubscribeStore=
    store.subscribe((state)=>{
      if(applying||suspended>0){
        current=
          snapshotState(state);
        pending=null;
        clearTimeout(timer);
        timer=null;
        return;
      }

      pending=
        snapshotState(state);

      clearTimeout(timer);

      timer=
        setTimeout(
          commitPending,
          debounceMs
        );
    });

  function applySnapshot(target){
    const live=
      store.getState();

    const next=
      restoreLiveOnlyFields(
        target,
        live
      );

    applying=true;

    try{
      store.setState(next);
    }finally{
      applying=false;
    }

    current=
      snapshotState(
        store.getState()
      );
  }

  function undo(){
    commitPending();

    if(!past.length){
      return false;
    }

    const previous=
      past.pop();

    future.push(current);

    applySnapshot(previous);
    emit();

    return true;
  }

  function redo(){
    commitPending();

    if(!future.length){
      return false;
    }

    const next=
      future.pop();

    past.push(current);

    applySnapshot(next);
    emit();

    return true;
  }

  function clear(){
    clearTimeout(timer);
    timer=null;
    past=[];
    future=[];
    pending=null;

    current=
      snapshotState(
        store.getState()
      );

    emit();
  }

  function checkpoint(){
    commitPending();
  }

  function subscribe(listener){
    listeners.add(listener);
    listener(status());

    return()=>
      listeners.delete(listener);
  }

  function withoutRecording(callback){
    commitPending();

    suspended+=1;

    try{
      return callback();
    }finally{
      suspended=
        Math.max(
          0,
          suspended-1
        );

      clearTimeout(timer);
      timer=null;
      pending=null;

      current=
        snapshotState(
          store.getState()
        );
    }
  }

  function destroy(){
    clearTimeout(timer);
    unsubscribeStore();
    listeners.clear();
  }

  return{
    undo,
    redo,
    clear,
    checkpoint,
    withoutRecording,
    subscribe,
    destroy,
    status
  };
}
