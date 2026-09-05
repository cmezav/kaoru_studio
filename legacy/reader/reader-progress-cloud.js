(function(){
'use strict';

const MODULE='reader';
const ENTITY_TYPE='progress';
const QUEUE_KEY='kaoru.reader.progress-cloud.queue.v1';
const DEVICE_KEY='kaoru.reader.device-id.v1';

let flushTimer=0;
let flushing=false;

function account(){
  return window.KaoruReaderAccount||null;
}

function currentUser(){
  return account()?.currentUser?.()||null;
}

function client(){
  return account()?.getClient?.()||null;
}

function deviceId(){
  try{
    let value=localStorage.getItem(DEVICE_KEY);
    if(!value){
      value=crypto.randomUUID?.()||`reader-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(DEVICE_KEY,value);
    }
    return value;
  }catch(_){
    return 'reader-device';
  }
}

function readQueue(){
  try{
    const parsed=JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]');
    return Array.isArray(parsed)?parsed:[];
  }catch(_){
    return [];
  }
}

function writeQueue(items){
  try{
    localStorage.setItem(QUEUE_KEY,JSON.stringify(items.slice(-250)));
  }catch(_){}
}

function exactPayload(progress){
  const payload={
    bookId:String(progress?.bookId||''),
    ratio:Number(progress?.ratio)||0,
    updatedAt:Number(progress?.updatedAt)||Date.now()
  };

  for(const key of [
    'chapterIndex',
    'anchorIndex',
    'anchorViewportTop',
    'anchorOffset',
    'pdfPageIndex',
    'pdfPageRatio',
    'pageIndex',
    'pageRatio'
  ]){
    const value=progress?.[key];
    if(value!==undefined&&value!==null&&Number.isFinite(Number(value))){
      payload[key]=Number(value);
    }
  }

  return payload;
}

function showStatus(message){
  const target=document.getElementById('readerAccountStatus');
  if(target)target.textContent=message||'';
}

function queueProgress(progress){
  const payload=exactPayload(progress);
  if(!payload.bookId)return;

  const user=currentUser();
  const items=readQueue().filter(item=>
    !(
      item.bookId===payload.bookId&&
      (!item.userId||!user||item.userId===user.id)
    )
  );

  items.push({
    bookId:payload.bookId,
    payload,
    updatedAt:payload.updatedAt,
    userId:user?.id||null
  });

  writeQueue(items);

  if(user&&navigator.onLine){
    showStatus('Progreso exacto pendiente de guardar en Kaoru Cloud.');
    scheduleFlush(900);
  }
}

function scheduleFlush(delay=500){
  clearTimeout(flushTimer);
  flushTimer=window.setTimeout(()=>{
    flush().catch(error=>{
      console.warn('Kaoru Reader Progress',error);
      showStatus('El progreso quedo guardado localmente y se subira cuando vuelva la conexion.');
    });
  },delay);
}

async function flush(){
  if(flushing||!navigator.onLine)return;

  const api=client();
  const user=currentUser();
  if(!api||!user)return;

  flushing=true;
  try{
    const all=readQueue();
    const pending=all
      .filter(item=>!item.userId||item.userId===user.id)
      .sort((a,b)=>Number(a.updatedAt)-Number(b.updatedAt));

    if(!pending.length)return;

    showStatus(`Guardando ${pending.length} progreso${pending.length===1?'':'s'} en Kaoru Cloud...`);

    for(const item of pending){
      const op={
        p_module:MODULE,
        p_entity_type:ENTITY_TYPE,
        p_entity_id:String(item.bookId),
        p_payload:item.payload,
        p_client_updated_at:Number(item.updatedAt)||Date.now(),
        p_deleted:false,
        p_device_id:deviceId()
      };

      const {error}=await api.rpc('kaoru_upsert_record',op);
      if(error)throw error;

      const latest=readQueue();
      writeQueue(latest.filter(current=>
        !(
          current.bookId===item.bookId&&
          Number(current.updatedAt)<=Number(item.updatedAt)&&
          (!current.userId||current.userId===user.id)
        )
      ));
    }

    showStatus('Progreso exacto guardado en Kaoru Cloud.');
  }finally{
    flushing=false;
  }
}

window.addEventListener('kaoru:reader-progress-saved',event=>{
  queueProgress(event.detail);
});

window.addEventListener('kaoru:reader-account',event=>{
  if(event.detail?.user&&navigator.onLine)scheduleFlush(100);
});

window.addEventListener('online',()=>scheduleFlush(100));

window.KaoruReaderProgressCloud={
  queueProgress,
  flush,
  pendingCount:()=>readQueue().length
};

account()?.ready?.().then(()=>{
  if(currentUser()&&navigator.onLine)scheduleFlush(100);
}).catch(()=>{});
}());