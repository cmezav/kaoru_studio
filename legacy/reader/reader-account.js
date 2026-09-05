(function(){
'use strict';

/*
  Archive Reader comparte EXACTAMENTE la misma cuenta Supabase que
  Task Studio. Supabase persiste la sesion por proyecto/origen, por lo
  que una sesion iniciada en Task Studio aparece aqui automaticamente.

  Libros, archivos y progreso usan esta misma sesion.
  Reader sigue funcionando localmente cuando no hay Internet.
*/

const SUPABASE_URL='https://jnuovipdqlprxufdmxar.supabase.co';
const SUPABASE_KEY='sb_publishable__kijO2nJAFyKb2JW4OC6kA_axv_rl7K';

let client=null;
let session=null;
let initialized=false;
let readyPromise=null;
const listeners=new Set();

function emit(state,message){
  const detail={
    state,
    message:String(message||''),
    user:session?.user||null,
    online:navigator.onLine
  };

  for(const fn of listeners){
    try{fn(detail);}catch(_){}
  }

  try{
    window.dispatchEvent(
      new CustomEvent('kaoru:reader-account',{
        detail
      })
    );
  }catch(_){}

  renderAccountUi(detail);
}

function currentUser(){
  return session?.user||null;
}

function getClient(){
  return client;
}

function getSession(){
  return session;
}

function onStatus(fn){
  if(typeof fn!=='function')return()=>{};
  listeners.add(fn);

  try{
    fn({
      state:session
        ?navigator.onLine?'signed-in':'offline'
        :'signed-out',
      message:session
        ?navigator.onLine
          ?'Kaoru Account conectada.'
          :'Sesión local disponible sin conexión.'
        :'Inicia sesión para conectar Reader con Kaoru Account.',
      user:session?.user||null,
      online:navigator.onLine
    });
  }catch(_){}

  return()=>listeners.delete(fn);
}

async function activateSession(nextSession){
  session=nextSession||null;

  if(!session){
    emit(
      'signed-out',
      'Reader sigue disponible en local. Inicia sesión para sincronizar entre dispositivos.'
    );
    return;
  }

  if(!navigator.onLine){
    emit(
      'offline',
      'Cuenta reconocida sin conexión. Tus libros locales siguen disponibles.'
    );
    return;
  }

  emit(
    'signed-in',
    'Sincronización automática activa para libros, archivos y progreso.'
  );
}

async function init(){
  if(initialized)return readyPromise;
  initialized=true;

  readyPromise=(async()=>{
    if(!window.supabase?.createClient){
      emit(
        'unavailable',
        'Kaoru Account no pudo cargar. Archive Reader sigue funcionando completamente en local.'
      );
      return null;
    }

    client=window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY,
      {
        auth:{
          persistSession:true,
          autoRefreshToken:true,
          detectSessionInUrl:true
        },
        realtime:{
          params:{eventsPerSecond:10}
        }
      }
    );

    /*
      No hacemos trabajo async del cliente dentro de onAuthStateChange.
      Task Studio ya usa la misma estrategia para evitar bloqueos al
      restaurar una sesion despues de recargar.
    */
    client.auth.onAuthStateChange((event,nextSession)=>{
      session=nextSession||null;

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
            emit(
              'error',
              err?.message||'No se pudo actualizar la sesión de Kaoru Account.'
            );
          });
        }
      },0);
    });

    const {data,error}=await client.auth.getSession();
    if(error)throw error;

    await activateSession(data?.session||null);
    return session;
  })().catch(err=>{
    console.error('Kaoru Reader Account',err);
    emit(
      navigator.onLine?'error':'offline',
      navigator.onLine
        ?(err?.message||'Kaoru Account no pudo iniciar. Reader sigue disponible localmente.')
        :'Sin conexión. Reader sigue disponible localmente.'
    );
    return null;
  });

  return readyPromise;
}

async function signIn(email,password){
  if(!client)await init();
  if(!client)throw new Error('Kaoru Account no está disponible.');

  const {data,error}=await client.auth.signInWithPassword({
    email:String(email||'').trim(),
    password:String(password||'')
  });

  if(error)throw error;

  await activateSession(data.session);
  return data;
}

async function signUp(email,password){
  if(!client)await init();
  if(!client)throw new Error('Kaoru Account no está disponible.');

  const {data,error}=await client.auth.signUp({
    email:String(email||'').trim(),
    password:String(password||'')
  });

  if(error)throw error;

  if(data.session){
    await activateSession(data.session);
  }else{
    emit(
      'confirmation',
      'Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.'
    );
  }

  return data;
}

async function signOut(){
  if(!client)return;

  const {error}=await client.auth.signOut();
  if(error)throw error;

  await activateSession(null);
}

function ui(){
  const byId=id=>document.getElementById(id);

  return{
    details:byId('readerAccountDetails'),
    summary:byId('readerAccountSummary'),
    badge:byId('readerAccountBadge'),
    stateCard:byId('readerCloudStateCard'),
    stateText:byId('readerCloudStateText'),
    stateDetail:byId('readerCloudStateDetail'),
    signedOut:byId('readerAccountSignedOut'),
    signedIn:byId('readerAccountSignedIn'),
    form:byId('readerAccountForm'),
    email:byId('readerAccountEmail'),
    password:byId('readerAccountPassword'),
    create:byId('readerAccountCreate'),
    signOut:byId('readerAccountSignOut'),
    userEmail:byId('readerAccountUserEmail'),
    status:byId('readerAccountStatus')
  };
}

function renderAccountUi(info={}){
  const elements=ui();
  if(!elements.details)return;

  const user=info.user||currentUser();
  const state=info.state||(
    user
      ?navigator.onLine?'signed-in':'offline'
      :'signed-out'
  );

  if(elements.signedOut)elements.signedOut.hidden=!!user;
  if(elements.signedIn)elements.signedIn.hidden=!user;

  if(elements.userEmail){
    elements.userEmail.textContent=user?.email||'—';
  }

  const cloudState=
    state==='signed-in'?'synced':
    state==='offline'?'offline':
    state==='error'?'error':
    state==='unavailable'?'error':
    state==='confirmation'?'pending':
    'local';

  if(elements.stateCard){
    elements.stateCard.dataset.state=cloudState;
  }

  const labels={
    synced:'Sincronizado',
    offline:'Sin conexión',
    error:'Problema de sincronización',
    pending:'Confirmación pendiente',
    local:'Solo local'
  };

  if(elements.stateText){
    elements.stateText.textContent=labels[cloudState]||'Kaoru Cloud';
  }

  if(elements.stateDetail){
    elements.stateDetail.textContent=info.message||(
      user
        ?'La sincronización automática está activa.'
        :'Inicia sesión para sincronizar automáticamente.'
    );
  }

  if(elements.summary){
    elements.summary.textContent=user
      ?user.email||'Sesión iniciada'
      :'Misma cuenta que Task Studio';
  }

  if(elements.badge){
    elements.badge.textContent=
      state==='signed-in'?'Sincronizado':
      state==='offline'&&user?'Sin conexión':
      state==='error'?'Error':
      state==='confirmation'?'Pendiente':
      state==='unavailable'?'Local':
      'Solo local';
    elements.badge.classList.toggle(
      'is-online',
      state==='signed-in'&&navigator.onLine
    );
  }

  if(elements.status){
    elements.status.textContent=info.message||(
      user
        ?'Kaoru Account conectada.'
        :'Reader continúa guardando todo localmente.'
    );
  }
}

function setupAccountUi(){
  const elements=ui();
  if(!elements.details)return;

  elements.form?.addEventListener('submit',async e=>{
    e.preventDefault();

    const email=elements.email?.value?.trim()||'';
    const password=elements.password?.value||'';

    if(!email||!password)return;

    if(elements.status){
      elements.status.textContent='Iniciando sesión…';
    }

    try{
      await signIn(email,password);

      if(elements.password)elements.password.value='';
    }catch(err){
      if(elements.status){
        elements.status.textContent=
          err?.message||'No se pudo iniciar sesión.';
      }
    }
  });

  elements.create?.addEventListener('click',async()=>{
    const email=elements.email?.value?.trim()||'';
    const password=elements.password?.value||'';

    if(!email||!password){
      if(elements.status){
        elements.status.textContent=
          'Escribe correo y contraseña para crear la cuenta.';
      }
      return;
    }

    if(elements.status){
      elements.status.textContent='Creando cuenta…';
    }

    try{
      await signUp(email,password);

      if(elements.password)elements.password.value='';
    }catch(err){
      if(elements.status){
        elements.status.textContent=
          err?.message||'No se pudo crear la cuenta.';
      }
    }
  });

  elements.signOut?.addEventListener('click',async()=>{
    if(elements.status){
      elements.status.textContent='Cerrando sesión…';
    }

    try{
      await signOut();
    }catch(err){
      if(elements.status){
        elements.status.textContent=
          err?.message||'No se pudo cerrar sesión.';
      }
    }
  });

  renderAccountUi();
}

window.addEventListener('online',()=>{
  if(session){
    emit(
      'signed-in',
      'Internet volvió. Kaoru Account está conectada.'
    );
  }else{
    emit(
      'signed-out',
      'Internet volvió. Puedes iniciar sesión en Kaoru Account.'
    );
  }
});

window.addEventListener('offline',()=>{
  emit(
    session?'offline':'signed-out',
    session
      ?'Sin conexión. La sesión local sigue disponible y Reader continúa funcionando.'
      :'Sin conexión. Archive Reader continúa funcionando en local.'
  );
});

window.KaoruReaderAccount={
  init,
  ready:()=>readyPromise||init(),
  currentUser,
  getClient,
  getSession,
  onStatus,
  signIn,
  signUp,
  signOut
};

function boot(){
  setupAccountUi();
  init().catch(()=>{});
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',boot,{once:true});
}else{
  boot();
}
}());
