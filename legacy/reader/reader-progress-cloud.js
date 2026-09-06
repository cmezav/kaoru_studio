import {
  getProgress,
  listProgress,
  putProgress
} from './reader-db.js?cache=pdf-reader-1';

const MODULE='reader';
const ENTITY_TYPE='progress';
const TABLE='kaoru_records';
const QUEUE_KEY='kaoru.reader.progress-cloud.queue.v1';
const DEVICE_KEY='kaoru.reader.device-id.v1';

let flushTimer=0;
let flushing=false;
let reconciling=false;
let applyingRemote=false;
let channel=null;

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
  if(applyingRemote)return;

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
    showStatus('Progreso pendiente de sincronizar.');
    scheduleFlush(700);
  }
}

function scheduleFlush(delay=400){
  clearTimeout(flushTimer);
  flushTimer=window.setTimeout(()=>{
    flush().catch(error=>{
      console.warn('Kaoru Reader Progress',error);
      showStatus('El progreso quedo local y se sincronizara al recuperar la conexion.');
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
    const pending=readQueue()
      .filter(item=>!item.userId||item.userId===user.id)
      .sort((a,b)=>Number(a.updatedAt)-Number(b.updatedAt));

    for(const item of pending){
      const {error}=await api.rpc('kaoru_upsert_record',{
        p_module:MODULE,
        p_entity_type:ENTITY_TYPE,
        p_entity_id:String(item.bookId),
        p_payload:item.payload,
        p_client_updated_at:Number(item.updatedAt)||Date.now(),
        p_deleted:false,
        p_device_id:deviceId()
      });

      if(error)throw error;

      writeQueue(readQueue().filter(current=>
        !(
          current.bookId===item.bookId&&
          Number(current.updatedAt)<=Number(item.updatedAt)&&
          (!current.userId||current.userId===user.id)
        )
      ));
    }
  }finally{
    flushing=false;
  }
}

async function applyRemote(row){
  if(
    !row||
    row.module!==MODULE||
    row.entity_type!==ENTITY_TYPE||
    row.deleted
  )return false;

  const payload=exactPayload({
    ...(row.payload||{}),
    bookId:row.entity_id,
    updatedAt:Number(row.client_updated_at)||Number(row.payload?.updatedAt)||Date.now()
  });

  const local=await getProgress(payload.bookId);
  const localTs=Number(local?.updatedAt)||0;
  const remoteTs=Number(payload.updatedAt)||0;

  if(local&&localTs>remoteTs){
    queueProgress(local);
    return false;
  }

  if(local&&localTs===remoteTs)return false;

  applyingRemote=true;
  try{
    await putProgress(payload);
  }finally{
    applyingRemote=false;
  }

  window.dispatchEvent(new CustomEvent('kaoru:reader-progress-applied',{
    detail:{
      bookId:payload.bookId,
      progress:payload,
      source:'cloud'
    }
  }));

  return true;
}

async function reconcile(){
  if(reconciling||!navigator.onLine)return;

  const api=client();
  const user=currentUser();
  if(!api||!user)return;

  reconciling=true;
  showStatus('Comparando progreso entre dispositivos...');

  try{
    await flush();

    const {data,error}=await api
      .from(TABLE)
      .select('user_id,module,entity_type,entity_id,payload,client_updated_at,device_id,deleted,server_updated_at')
      .eq('user_id',user.id)
      .eq('module',MODULE)
      .eq('entity_type',ENTITY_TYPE);

    if(error)throw error;

    const rows=(Array.isArray(data)?data:[])
      .filter(row=>row.user_id===user.id);
    const remoteByBook=new Map(rows.map(row=>[String(row.entity_id),row]));
    let received=0;

    for(const row of rows){
      if(await applyRemote(row))received+=1;
    }

    const localItems=await listProgress();
    for(const local of localItems){
      const remote=remoteByBook.get(String(local.bookId));
      const remoteTs=Number(remote?.client_updated_at)||0;
      const localTs=Number(local?.updatedAt)||0;

      if(!remote||localTs>remoteTs){
        queueProgress(local);
      }
    }

    await flush();

    showStatus(
      received
        ?`Progreso actualizado desde otro dispositivo (${received}).`
        :'Progreso sincronizado entre dispositivos.'
    );
  }finally{
    reconciling=false;
  }
}

async function stopRealtime(){
  const api=client();
  if(channel&&api){
    try{await api.removeChannel(channel);}catch(_){}
  }
  channel=null;
}

async function startRealtime(){
  await stopRealtime();

  const api=client();
  const user=currentUser();
  if(!api||!user||!navigator.onLine)return;

  channel=api
    .channel(`kaoru-reader-progress-${user.id}-${deviceId()}`)
    .on(
      'postgres_changes',
      {event:'*',schema:'public',table:TABLE,filter:`user_id=eq.${user.id}`},
      async payload=>{
        const row=payload?.new&&Object.keys(payload.new).length
          ?payload.new
          :payload?.old;

        if(
          !row||
          row.user_id!==currentUser()?.id||
          row.module!==MODULE||
          row.entity_type!==ENTITY_TYPE||
          row.device_id===deviceId()
        )return;

        try{
          const changed=await applyRemote(row);
          if(changed)showStatus('Progreso recibido de otro dispositivo.');
        }catch(error){
          console.warn('Kaoru Reader Realtime',error);
          showStatus('No se pudo aplicar un progreso remoto; se reintentara.');
        }
      }
    )
    .subscribe(status=>{
      if(status==='CHANNEL_ERROR'){
        showStatus('La conexion en tiempo real se interrumpio; se reintentara.');
      }
    });
}

async function activate(){
  if(!currentUser()){
    await stopRealtime();
    return;
  }

  if(!navigator.onLine)return;

  await startRealtime();
  await reconcile();
}

window.addEventListener('kaoru:reader-progress-saved',event=>{
  queueProgress(event.detail);
});

window.addEventListener('kaoru:reader-account',event=>{
  if(event.detail?.user){
    setTimeout(()=>activate().catch(error=>{
      console.warn('Kaoru Reader activate',error);
      showStatus(error?.message||'No se pudo sincronizar el progreso.');
    }),0);
  }else{
    stopRealtime().catch(()=>{});
  }
});

window.addEventListener('online',()=>{
  activate().catch(error=>{
    console.warn('Kaoru Reader online',error);
  });
});

window.addEventListener('offline',()=>{
  stopRealtime().catch(()=>{});
  showStatus('Sin conexion. El progreso seguira guardandose localmente.');
});

window.KaoruReaderProgressCloud={
  queueProgress,
  flush,
  reconcile,
  pendingCount:()=>readQueue().length
};

account()?.ready?.().then(()=>activate()).catch(error=>{
  console.warn('Kaoru Reader Progress boot',error);
});