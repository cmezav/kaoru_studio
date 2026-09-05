(function(){
'use strict';

const SUPABASE_URL='https://jnuovipdqlprxufdmxar.supabase.co';
const SUPABASE_KEY='sb_publishable__kijO2nJAFyKb2JW4OC6kA_axv_rl7K';
const MODULE='tasks';
const TABLE='kaoru_records';
const QUEUE_KEY='kaoru.task-cloud.queue.v1';
const DEVICE_KEY='kaoru.cloud.device-id.v1';

let adapter=null;
let client=null;
let session=null;
let channel=null;
let syncTimer=0;
let syncing=false;
let initialized=false;

function uid(){
  if(globalThis.crypto?.randomUUID)return crypto.randomUUID();
  return `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}
function deviceId(){
  try{
    let id=localStorage.getItem(DEVICE_KEY);
    if(!id){id=uid();localStorage.setItem(DEVICE_KEY,id);}
    return id;
  }catch(_){return uid();}
}
const DEVICE_ID=deviceId();

function clone(value){
  try{return structuredClone(value);}catch(_){
    return JSON.parse(JSON.stringify(value));
  }
}
function localUpdated(value){
  return Number(value?.updatedAt||value?.createdAt||0)||0;
}
function sanitizeTask(task){
  const copy=clone(task);
  if(Array.isArray(copy.notes)){
    copy.notes=copy.notes.map(note=>{
      const next={...note};
      if(typeof next.html==='string'){
        next.html=next.html.replace(
          /<img\b[^>]*\bsrc=(["'])data:image\/[^"']+\1[^>]*>/gi,
          '<span data-kaoru-cloud-image-pending="1">🖼 Imagen disponible en el dispositivo original</span>'
        );
      }
      return next;
    });
  }
  return copy;
}
function preparePayload(type,payload){
  return type==='task'?sanitizeTask(payload):clone(payload);
}
function queueRead(){
  try{
    const value=JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]');
    return Array.isArray(value)?value:[];
  }catch(_){return[];}
}
function queueWrite(items){
  try{localStorage.setItem(QUEUE_KEY,JSON.stringify(items));}catch(_){}
}
function queueKey(op){return `${op.entityType}:${op.entityId}`;}
function queueForCurrentUser(){
  const current=session?.user?.id||null;
  return queueRead().filter(op=>!op.userId||op.userId===current);
}
function emit(state,message,extra={}){
  try{
    adapter?.onStatus?.({
      state,
      message,
      user:session?.user||null,
      queue:queueForCurrentUser().length,
      online:navigator.onLine,
      ...extra
    });
  }catch(_){}
}
function scheduleFlush(delay=350){
  clearTimeout(syncTimer);
  syncTimer=setTimeout(()=>flushQueue().catch(err=>{
    console.warn('Kaoru Cloud flush',err);
    emit('error',err?.message||'No se pudo sincronizar.');
  }),delay);
}
function putQueue(op){
  const items=queueRead();
  const key=queueKey(op);
  const next=items.filter(item=>queueKey(item)!==key);
  next.push(op);
  queueWrite(next);
  emit(session?'pending':'local',session?'Cambio pendiente de sincronizar.':'Guardado localmente.');
  if(session&&navigator.onLine)scheduleFlush();
}
function queueUpsert(entityType,payload){
  if(!payload?.id)return;
  putQueue({
    kind:'upsert',
    entityType,
    entityId:String(payload.id),
    payload:preparePayload(entityType,payload),
    updatedAt:Math.max(localUpdated(payload),Date.now()),
    userId:session?.user?.id||null,
    deviceId:DEVICE_ID
  });
}
function queueDelete(entityType,entityId,updatedAt=Date.now()){
  if(!entityId)return;
  putQueue({
    kind:'delete',
    entityType,
    entityId:String(entityId),
    payload:{},
    updatedAt:Number(updatedAt)||Date.now(),
    userId:session?.user?.id||null,
    deviceId:DEVICE_ID
  });
}
async function rpcOp(op){
  const {data,error}=await client.rpc('kaoru_upsert_record',{
    p_module:MODULE,
    p_entity_type:op.entityType,
    p_entity_id:op.entityId,
    p_payload:op.kind==='delete'?{}:op.payload,
    p_client_updated_at:Number(op.updatedAt)||Date.now(),
    p_deleted:op.kind==='delete',
    p_device_id:DEVICE_ID
  });
  if(error)throw error;
  return data;
}
function removeSentOp(sent){
  const key=queueKey(sent);
  const items=queueRead();
  const next=items.filter(item=>{
    if(queueKey(item)!==key)return true;
    return Number(item.updatedAt)>Number(sent.updatedAt);
  });
  queueWrite(next);
}
async function flushQueue(){
  if(syncing||!client||!session||!navigator.onLine)return;
  const pending=queueForCurrentUser();
  if(!pending.length){
    emit('synced','Sincronizado');
    return;
  }
  syncing=true;
  emit('syncing',`Sincronizando ${pending.length} cambio${pending.length===1?'':'s'}…`);
  try{
    pending.sort((a,b)=>Number(a.updatedAt)-Number(b.updatedAt));
    for(const op of pending){
      await rpcOp(op);
      removeSentOp(op);
    }
    emit('synced','Sincronizado');
  }finally{
    syncing=false;
  }
}
async function getLocal(type,id){
  return adapter?.getLocal?.(type,id)||null;
}
async function listLocal(type){
  return adapter?.listLocal?.(type)||[];
}
async function applyRemote(row){
  if(!row||row.module!==MODULE)return false;
  const local=await getLocal(row.entity_type,row.entity_id);
  const localTs=localUpdated(local);
  const remoteTs=Number(row.client_updated_at)||0;

  if(local&&localTs>remoteTs)return false;

  globalThis.__kaoruCloudApplyingRemote=true;
  try{
    if(row.deleted){
      if(local)await adapter?.deleteLocal?.(row.entity_type,row.entity_id);
    }else{
      await adapter?.putLocal?.(row.entity_type,clone(row.payload||{}));
    }
  }finally{
    globalThis.__kaoruCloudApplyingRemote=false;
  }
  return true;
}
async function reconcile(){
  if(!client||!session||!navigator.onLine)return;
  emit('syncing','Comparando cambios…');

  const {data,error}=await client
    .from(TABLE)
    .select('user_id,module,entity_type,entity_id,payload,client_updated_at,device_id,deleted,server_updated_at')
    .eq('module',MODULE);

  if(error)throw error;

  const rows=Array.isArray(data)?data:[];
  const remote=new Map(rows.map(row=>[`${row.entity_type}:${row.entity_id}`,row]));
  let changed=false;

  for(const row of rows){
    if(row.user_id!==session.user.id)continue;
    const local=await getLocal(row.entity_type,row.entity_id);
    const localTs=localUpdated(local);
    const remoteTs=Number(row.client_updated_at)||0;

    if(row.deleted){
      if(local&&remoteTs>=localTs){
        changed=(await applyRemote(row))||changed;
      }else if(local&&localTs>remoteTs){
        queueUpsert(row.entity_type,local);
      }
      continue;
    }

    if(!local||remoteTs>localTs){
      changed=(await applyRemote(row))||changed;
    }else if(localTs>remoteTs){
      queueUpsert(row.entity_type,local);
    }
  }

  for(const type of ['course','task']){
    const localList=await listLocal(type);
    for(const item of localList){
      const key=`${type}:${item.id}`;
      if(!remote.has(key))queueUpsert(type,item);
    }
  }

  if(changed)await adapter?.refresh?.();
  await flushQueue();
}
async function stopRealtime(){
  if(channel&&client){
    try{await client.removeChannel(channel);}catch(_){}
  }
  channel=null;
}
async function startRealtime(){
  await stopRealtime();
  if(!client||!session)return;

  channel=client
    .channel(`kaoru-task-${session.user.id}`)
    .on(
      'postgres_changes',
      {event:'*',schema:'public',table:TABLE},
      async payload=>{
        const row=payload?.new&&Object.keys(payload.new).length?payload.new:payload?.old;
        if(!row||row.module!==MODULE||row.user_id!==session?.user?.id)return;
        if(row.device_id===DEVICE_ID)return;
        try{
          const changed=await applyRemote(row);
          if(changed){
            await adapter?.refresh?.();
            emit('synced','Cambio recibido de otro dispositivo.');
          }
        }catch(err){
          console.warn('Kaoru Cloud realtime',err);
          emit('error',err?.message||'No se pudo aplicar un cambio remoto.');
        }
      }
    )
    .subscribe(status=>{
      if(status==='SUBSCRIBED')emit('synced','Sincronización automática activa.');
      else if(status==='CHANNEL_ERROR')emit('error','Realtime perdió la conexión. Reintentaremos automáticamente.');
    });
}
async function activateSession(nextSession){
  session=nextSession||null;
  if(!session){
    await stopRealtime();
    emit('local','Solo local. Inicia sesión para sincronizar.');
    return;
  }
  emit('syncing','Conectando Kaoru Cloud…');
  await startRealtime();
  await reconcile();
}
async function signIn(email,password){
  if(!client)throw new Error('Supabase no está disponible.');
  const {data,error}=await client.auth.signInWithPassword({
    email:String(email||'').trim(),
    password:String(password||'')
  });
  if(error)throw error;
  await activateSession(data.session);
  return data;
}
async function signUp(email,password){
  if(!client)throw new Error('Supabase no está disponible.');
  const {data,error}=await client.auth.signUp({
    email:String(email||'').trim(),
    password:String(password||'')
  });
  if(error)throw error;
  if(data.session)await activateSession(data.session);
  return data;
}
async function signOut(){
  if(!client)return;
  const {error}=await client.auth.signOut();
  if(error)throw error;
  await activateSession(null);
}
function currentUser(){return session?.user||null;}
function available(){return Boolean(client);}
async function init(nextAdapter){
  adapter=nextAdapter||{};
  if(initialized)return;
  initialized=true;

  if(!window.supabase?.createClient){
    emit('offline','Kaoru Cloud no cargó. Task Studio sigue funcionando de forma local.');
    return;
  }

  client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{
    auth:{
      persistSession:true,
      autoRefreshToken:true,
      detectSessionInUrl:true
    },
    realtime:{
      params:{eventsPerSecond:10}
    }
  });

  client.auth.onAuthStateChange((event,nextSession)=>{
    if(event==='SIGNED_OUT'){
      activateSession(null).catch(()=>{});
      return;
    }
    if(
      event==='SIGNED_IN'||
      event==='TOKEN_REFRESHED'||
      event==='INITIAL_SESSION'
    ){
      activateSession(nextSession).catch(err=>{
        console.warn('Kaoru Cloud auth',err);
        emit('error',err?.message||'No se pudo iniciar la sincronización.');
      });
    }
  });

  const {data}=await client.auth.getSession();
  await activateSession(data?.session||null);

  window.addEventListener('online',()=>{
    emit(session?'syncing':'local',session?'Internet volvió. Sincronizando…':'Internet volvió.');
    if(session)reconcile().catch(err=>emit('error',err?.message||'No se pudo sincronizar.'));
  });
  window.addEventListener('offline',()=>emit('offline','Sin conexión. Los cambios se guardarán localmente.'));

  if(session&&navigator.onLine){
    reconcile().catch(err=>emit('error',err?.message||'No se pudo sincronizar.'));
  }
}

window.KaoruTaskCloud={
  init,
  available,
  currentUser,
  queueUpsert,
  queueDelete,
  flush:flushQueue,
  reconcile,
  signIn,
  signUp,
  signOut
};
}());