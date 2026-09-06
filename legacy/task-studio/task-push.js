(function(){
'use strict';

const OWNER_KEY='kaoru.task-push.owner.v1';
const DEVICE_KEY='kaoru.cloud.device-id.v1';
const SUB_TABLE='kaoru_push_subscriptions';
const PREF_TABLE='kaoru_push_preferences';

function cloud(){
  return window.KaoruTaskCloud||null;
}
function user(){
  return cloud()?.currentUser?.()||null;
}
function client(){
  return cloud()?.getClient?.()||null;
}
function config(){
  return cloud()?.getConfig?.()||null;
}
function deviceId(){
  try{return localStorage.getItem(DEVICE_KEY)||'';}catch(_){return'';}
}
function ownerId(){
  try{return localStorage.getItem(OWNER_KEY)||'';}catch(_){return'';}
}
function setOwner(id){
  try{
    if(id)localStorage.setItem(OWNER_KEY,id);
    else localStorage.removeItem(OWNER_KEY);
  }catch(_){}
}
function base64UrlToUint8Array(value){
  const padding='='.repeat((4-value.length%4)%4);
  const base64=(value+padding).replace(/-/g,'+').replace(/_/g,'/');
  const raw=atob(base64);
  return Uint8Array.from(raw,ch=>ch.charCodeAt(0));
}
function timezone(){
  try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'America/Lima';}
  catch(_){return'America/Lima';}
}
async function serviceWorker(){
  if(!('serviceWorker'in navigator))throw new Error('Este navegador no admite Service Worker.');
  if(!('PushManager'in window))throw new Error('Este navegador no admite Web Push.');
  const registration=await navigator.serviceWorker.ready;
  if(!registration?.pushManager)throw new Error('Push Manager no esta disponible.');
  return registration;
}
async function vapidPublicKey(){
  const cfg=config();
  if(!cfg?.url||!cfg?.key)throw new Error('Kaoru Cloud no esta listo.');
  const response=await fetch(
    `${cfg.url}/functions/v1/kaoru-push-dispatch?mode=vapid`,
    {
      method:'GET',
      cache:'no-store',
      headers:{apikey:cfg.key}
    }
  );
  if(!response.ok){
    throw new Error(`No pude obtener la clave Push (${response.status}).`);
  }
  const data=await response.json();
  if(!data?.publicKey)throw new Error('La funcion Push no devolvio una clave publica.');
  return data.publicKey;
}
async function saveSubscription(subscription){
  const currentUser=user();
  const db=client();
  if(!currentUser?.id||!db)throw new Error('Inicia sesion en Kaoru Account.');

  const json=subscription.toJSON();
  const p256dh=json?.keys?.p256dh||'';
  const auth=json?.keys?.auth||'';
  if(!subscription.endpoint||!p256dh||!auth){
    throw new Error('El navegador devolvio una suscripcion Push incompleta.');
  }

  const {error}=await db.from(SUB_TABLE).upsert(
    {
      user_id:currentUser.id,
      endpoint:subscription.endpoint,
      p256dh,
      auth,
      device_id:deviceId()||null,
      user_agent:navigator.userAgent||null,
      enabled:true,
      updated_at:new Date().toISOString(),
      last_seen_at:new Date().toISOString()
    },
    {onConflict:'endpoint'}
  );

  if(error)throw error;
  setOwner(currentUser.id);
}
async function syncPreferences(notificationConfig={}){
  const currentUser=user();
  const db=client();
  if(!currentUser?.id||!db)return false;

  const thresholds=(Array.isArray(notificationConfig.thresholds)
    ?notificationConfig.thresholds:[24,3,1])
    .map(Number)
    .filter(value=>Number.isFinite(value)&&value>0&&value<=168)
    .map(value=>Math.round(value))
    .filter((value,index,array)=>array.indexOf(value)===index)
    .sort((a,b)=>b-a);

  const {error}=await db.from(PREF_TABLE).upsert(
    {
      user_id:currentUser.id,
      enabled:Boolean(notificationConfig.enabled),
      thresholds:thresholds.length?thresholds:[24,3,1],
      overdue_enabled:true,
      timezone:timezone(),
      updated_at:new Date().toISOString()
    },
    {onConflict:'user_id'}
  );
  if(error)throw error;
  return true;
}
async function subscribe(){
  if(!user()?.id)throw new Error('Inicia sesion en Kaoru Account antes de activar avisos en segundo plano.');
  if(!('Notification'in window))throw new Error('Este navegador no ofrece notificaciones web.');
  if(Notification.permission!=='granted')throw new Error('Primero permite las notificaciones del sitio.');

  const registration=await serviceWorker();
  let subscription=await registration.pushManager.getSubscription();
  const currentOwner=ownerId();

  if(subscription&&currentOwner&&currentOwner!==user().id){
    try{await subscription.unsubscribe();}catch(_){}
    subscription=null;
    setOwner('');
  }

  if(!subscription){
    const publicKey=await vapidPublicKey();
    subscription=await registration.pushManager.subscribe({
      userVisibleOnly:true,
      applicationServerKey:base64UrlToUint8Array(publicKey)
    });
  }

  await saveSubscription(subscription);

  const status=document.getElementById('notificationStatus');
  if(status){
    status.textContent='Avisos activos, incluido segundo plano cuando el navegador lo permita.';
  }

  return subscription;
}
async function unsubscribe(){
  const db=client();
  const currentUser=user();
  let subscription=null;

  try{
    const registration=await serviceWorker();
    subscription=await registration.pushManager.getSubscription();
  }catch(_){}

  if(subscription?.endpoint&&db&&currentUser?.id){
    await db.from(SUB_TABLE)
      .delete()
      .eq('user_id',currentUser.id)
      .eq('endpoint',subscription.endpoint);
  }

  if(subscription){
    try{await subscription.unsubscribe();}catch(_){}
  }
  setOwner('');
}
async function restore(notificationConfig=null){
  if(Notification.permission!=='granted'||!user()?.id)return false;

  if(notificationConfig){
    if(!notificationConfig.enabled)return false;
    await subscribe();
    await syncPreferences(notificationConfig);
    return true;
  }

  const db=client();
  const currentUser=user();
  if(!db||!currentUser?.id)return false;

  const {data,error}=await db.from(PREF_TABLE)
    .select('enabled')
    .eq('user_id',currentUser.id)
    .maybeSingle();

  if(error)throw error;
  if(data?.enabled){
    await subscribe();
    return true;
  }
  return false;
}
async function refreshSeen(){
  const db=client();
  const currentUser=user();
  if(!db||!currentUser?.id)return;
  try{
    const registration=await serviceWorker();
    const subscription=await registration.pushManager.getSubscription();
    if(!subscription?.endpoint)return;
    await db.from(SUB_TABLE)
      .update({
        last_seen_at:new Date().toISOString(),
        enabled:true
      })
      .eq('user_id',currentUser.id)
      .eq('endpoint',subscription.endpoint);
  }catch(_){}
}

window.KaoruTaskPush={
  subscribe,
  unsubscribe,
  restore,
  syncPreferences,
  refreshSeen
};

window.addEventListener('kaoru:task-cloud-session',event=>{
  if(!event.detail?.user)return;
  restore().catch(error=>console.warn('Kaoru Push restore',error));
});
window.addEventListener('online',()=>refreshSeen());
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden)refreshSeen();
});
}());
