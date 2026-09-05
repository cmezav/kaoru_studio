(function(){
'use strict';

const SUPABASE_URL='https://jnuovipdqlprxufdmxar.supabase.co';
const SUPABASE_KEY='sb_publishable__kijO2nJAFyKb2JW4OC6kA_axv_rl7K';
const MODULE='tasks';
const TABLE='kaoru_records';
const BUCKET='kaoru-files';
const QUEUE_KEY='kaoru.task-cloud.queue.v1';
const FILE_DELETE_QUEUE_KEY='kaoru.task-cloud.file-delete-queue.v1';
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
        const template=document.createElement('template');
        template.innerHTML=next.html;

        /*
          Las imagenes administradas por Kaoru se sincronizan por Storage.
          El src local puede ser blob: o data:, por lo que JAMAS debe viajar
          dentro del JSON de la tarea.
        */
        template.content
          .querySelectorAll('img[data-kaoru-image-id]')
          .forEach(img=>{
            const src=img.getAttribute('src')||'';
            if(/^(?:blob:|data:image\/)/i.test(src)){
              img.removeAttribute('src');
            }
          });

        /*
          Compatibilidad con notas viejas: si todavia queda una imagen Base64
          sin migrar, no mandamos megabytes al registro remoto.
        */
        template.content
          .querySelectorAll('img:not([data-kaoru-image-id])')
          .forEach(img=>{
            const src=img.getAttribute('src')||'';
            if(/^data:image\//i.test(src)){
              const placeholder=document.createElement('span');
              placeholder.dataset.kaoruCloudImagePending='1';
              placeholder.textContent='🖼 Imagen pendiente de migrar desde el dispositivo original';
              img.replaceWith(placeholder);
            }
          });

        next.html=template.innerHTML;
      }

      return next;
    });
  }
  return copy;
}
function sanitizeSchedule(schedule){
  const copy=clone(schedule||{});
  delete copy.blob;
  return copy;
}
function preparePayload(type,payload){
  if(type==='task')return sanitizeTask(payload);
  if(type==='schedule')return sanitizeSchedule(payload);
  return clone(payload);
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
function fileDeleteQueueRead(){
  try{
    const value=JSON.parse(localStorage.getItem(FILE_DELETE_QUEUE_KEY)||'[]');
    return Array.isArray(value)?value:[];
  }catch(_){return[];}
}
function fileDeleteQueueWrite(items){
  try{localStorage.setItem(FILE_DELETE_QUEUE_KEY,JSON.stringify(items));}catch(_){}
}
function fileDeleteQueueForCurrentUser(){
  const current=session?.user?.id||null;
  return fileDeleteQueueRead().filter(item=>item.userId===current);
}
function pendingCount(){
  return queueForCurrentUser().length+fileDeleteQueueForCurrentUser().length;
}
function emit(state,message,extra={}){
  try{
    adapter?.onStatus?.({
      state,
      message,
      user:session?.user||null,
      queue:pendingCount(),
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

  /*
    Primero resolvemos el archivo del horario. Asi, si fue creado offline,
    la cola recibe la metadata FINAL con storagePath y nunca necesitamos
    publicar el Blob dentro de kaoru_records.
  */
  const scheduleResult=await adapter?.syncSchedule?.();

  const scheduleList=await listLocal('schedule');
  for(const item of scheduleList){
    const key=`schedule:${item.id}`;
    const remoteRow=remote.get(key);
    const remoteTs=Number(remoteRow?.client_updated_at)||0;
    if(!remoteRow||localUpdated(item)>remoteTs){
      queueUpsert('schedule',item);
    }
  }

  await flushQueue();
  const fileResult=await adapter?.syncFiles?.();
  await flushQueue();
  await flushStorageDeletes();

  if(Number(fileResult?.pending||0)>0){
    emit(
      'pending',
      `${fileResult.pending} archivo${fileResult.pending===1?'':'s'} pendiente${fileResult.pending===1?'':'s'} de subir.`
    );
  }
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

  /*
    Si Kaoru arranca durante un viaje sin señal, no intentamos
    forzar Realtime. La sesión local sigue disponible y Task Studio
    continúa trabajando con IndexedDB + cola offline.
  */
  if(!navigator.onLine){
    await stopRealtime();
    emit(
      'offline',
      'Sin conexión. Puedes seguir trabajando; sincronizaré automáticamente cuando vuelva Internet.'
    );
    return;
  }

  emit('syncing','Conectando Kaoru Cloud…');
  await startRealtime();
  await reconcile();
}
function safePathPart(value,fallback='file'){
  const clean=String(value||'')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9._-]+/g,'_')
    .replace(/^_+|_+$/g,'')
    .slice(0,120);
  return clean||fallback;
}
function taskFilePath(taskId,fileId,name){
  if(!session?.user?.id)throw new Error('Inicia sesión para usar Kaoru Storage.');
  return [
    session.user.id,
    'tasks',
    safePathPart(taskId,'task'),
    safePathPart(fileId,'file'),
    safePathPart(name,'archivo')
  ].join('/');
}
function scheduleFilePath(fileRecord){
  if(!session?.user?.id)throw new Error('Inicia sesión para usar Kaoru Storage.');
  return [
    session.user.id,
    'tasks',
    'schedule',
    String(Number(fileRecord?.updatedAt)||Date.now()),
    safePathPart(fileRecord?.name,'horario')
  ].join('/');
}
function noteImagePath(taskId,noteId,imageId,fileRecord){
  if(!session?.user?.id)throw new Error('Inicia sesión para usar Kaoru Storage.');
  return [
    session.user.id,
    'tasks',
    safePathPart(taskId,'task'),
    'notes',
    safePathPart(noteId,'note'),
    safePathPart(imageId,'image'),
    safePathPart(fileRecord?.name,'imagen')
  ].join('/');
}
async function uploadNoteImage(taskId,noteId,imageId,fileRecord){
  if(!client||!session)throw new Error('Inicia sesión para sincronizar imagenes de notas.');
  if(!navigator.onLine)throw new Error('Sin conexión. La imagen permanece guardada en este dispositivo.');

  const blob=fileRecord?.blob;
  if(!(blob instanceof Blob))throw new Error('La imagen local ya no está disponible.');

  const path=noteImagePath(taskId,noteId,imageId,fileRecord);

  const {data,error}=await client.storage
    .from(BUCKET)
    .upload(path,blob,{
      upsert:true,
      contentType:fileRecord?.type||blob.type||'image/png',
      cacheControl:'3600'
    });

  if(error)throw error;

  return{
    path:data?.path||path,
    name:fileRecord?.name||'imagen',
    mime:fileRecord?.type||blob.type||'image/png',
    size:Number(fileRecord?.size||blob.size||0)
  };
}
async function uploadScheduleFile(fileRecord){
  if(!client||!session)throw new Error('Inicia sesión para sincronizar el horario.');
  if(!navigator.onLine)throw new Error('Sin conexión. El horario permanece guardado en este dispositivo.');
  const blob=fileRecord?.blob;
  if(!(blob instanceof Blob))throw new Error('La imagen local del horario ya no está disponible.');

  const path=scheduleFilePath(fileRecord);
  const {data,error}=await client.storage
    .from(BUCKET)
    .upload(path,blob,{
      upsert:false,
      contentType:fileRecord?.type||blob.type||'application/octet-stream',
      cacheControl:'3600'
    });

  if(error)throw error;

  return{
    path:data?.path||path,
    name:fileRecord?.name||'horario',
    mime:fileRecord?.type||blob.type||'application/octet-stream',
    size:Number(fileRecord?.size||blob.size||0)
  };
}
async function uploadTaskFile(taskId,fileId,fileRecord){
  if(!client||!session)throw new Error('Inicia sesión para sincronizar archivos.');
  if(!navigator.onLine)throw new Error('Sin conexión. El archivo permanece guardado en este dispositivo.');
  const blob=fileRecord?.blob;
  if(!(blob instanceof Blob))throw new Error('El archivo local ya no está disponible.');
  const path=taskFilePath(taskId,fileId,fileRecord?.name||fileId);
  const {data,error}=await client.storage
    .from(BUCKET)
    .upload(path,blob,{
      upsert:true,
      contentType:fileRecord?.type||blob.type||'application/octet-stream',
      cacheControl:'3600'
    });
  if(error)throw error;
  return{
    path:data?.path||path,
    name:fileRecord?.name||'Archivo',
    mime:fileRecord?.type||blob.type||'application/octet-stream',
    size:Number(fileRecord?.size||blob.size||0)
  };
}
async function downloadTaskFile(path){
  if(!client||!session)throw new Error('Inicia sesión para descargar este archivo.');
  if(!navigator.onLine)throw new Error('Este archivo todavía no está guardado en este dispositivo y no hay conexión.');
  if(!path)throw new Error('Este archivo todavía no tiene una copia en Kaoru Cloud.');
  const {data,error}=await client.storage.from(BUCKET).download(path);
  if(error)throw error;
  return data;
}
function queueStorageDelete(path){
  if(!path)return;
  const owner=String(path).split('/')[0]||session?.user?.id||null;
  if(!owner)return;
  const items=fileDeleteQueueRead().filter(item=>item.path!==path);
  items.push({path,userId:owner,createdAt:Date.now()});
  fileDeleteQueueWrite(items);
  emit(session?'pending':'local',session?'Archivo pendiente de eliminar de la nube.':'Cambio guardado localmente.');
  if(session&&navigator.onLine){
    setTimeout(()=>flushStorageDeletes().catch(err=>{
      console.warn('Kaoru Storage delete',err);
      emit('error',err?.message||'No se pudo eliminar un archivo de la nube.');
    }),100);
  }
}
async function flushStorageDeletes(){
  if(!client||!session||!navigator.onLine)return;
  const pending=fileDeleteQueueForCurrentUser();
  if(!pending.length)return;
  for(const item of pending){
    const {error}=await client.storage.from(BUCKET).remove([item.path]);
    if(error)throw error;
    fileDeleteQueueWrite(
      fileDeleteQueueRead().filter(current=>current.path!==item.path)
    );
  }
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

  /*
    IMPORTANTE:
    Supabase puede bloquear llamadas posteriores si hacemos operaciones
    async del propio cliente dentro de onAuthStateChange. El callback
    solo actualiza estado y difiere cualquier sincronizacion al siguiente
    turno del event loop.
  */
  client.auth.onAuthStateChange((event,nextSession)=>{
    session=nextSession||null;

    /*
      INITIAL_SESSION ya se procesa abajo mediante getSession().
      Ignorarlo aqui evita arrancar dos reconciliaciones al recargar.
    */
    if(event==='INITIAL_SESSION')return;

    setTimeout(()=>{
      if(event==='SIGNED_OUT'){
        activateSession(null).catch(()=>{});
        return;
      }

      if(
        event==='SIGNED_IN'||
        event==='TOKEN_REFRESHED'||
        event==='USER_UPDATED'
      ){
        activateSession(nextSession).catch(err=>{
          console.warn('Kaoru Cloud auth',err);
          emit(
            'error',
            err?.message||'No se pudo iniciar la sincronización.'
          );
        });
      }
    },0);
  });

  const {data,error}=await client.auth.getSession();
  if(error)throw error;
  await activateSession(data?.session||null);

  window.addEventListener('online',async()=>{
    if(!session){
      emit('local','Internet volvió. Inicia sesión para sincronizar.');
      return;
    }

    emit('syncing','Internet volvió. Reconectando Kaoru Cloud…');

    try{
      /*
        Volvemos a crear el canal Realtime de forma explícita.
        Así no dependemos de que el WebSocket anterior se recupere solo
        y no hace falta recargar la página.
      */
      await startRealtime();
      await reconcile();
      emit('synced','Todo sincronizado después de recuperar la conexión.');
    }catch(err){
      emit('error',err?.message||'No se pudo sincronizar al recuperar Internet.');
    }
  });

  window.addEventListener('offline',()=>{
    emit(
      'offline',
      'Sin conexión. Los cambios se guardarán en este dispositivo.'
    );
    stopRealtime().catch(()=>{});
  });
}

window.KaoruTaskCloud={
  init,
  available,
  currentUser,
  queueUpsert,
  queueDelete,
  queueStorageDelete,
  uploadTaskFile,
  uploadScheduleFile,
  uploadNoteImage,
  downloadTaskFile,
  flush:async()=>{
    await adapter?.syncSchedule?.();
    await flushQueue();
    await adapter?.syncFiles?.();
    await flushQueue();
    await flushStorageDeletes();
  },
  reconcile,
  signIn,
  signUp,
  signOut
};
}());