const CACHE_NAME = 'kaoru-archive-reader-shell-48-notify-visual-20260906';
const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4';

const CORE = [
  './',
  './index.html',
  './logo.png',
  './kaoru-notification-icon.png',
  './kaoru-notification-badge.png',
  './icono-kaoru.png',
  './vendor/react.production.min.js',
  './vendor/react-dom.production.min.js',
  './app/dist/app.css',
  './app/dist/app.js',
  './legacy/home/index.html',
  './legacy/task-studio/index.html',
  './legacy/task-studio/styles.css',
  './legacy/task-studio/app.js',
  './legacy/task-studio/task-cloud.js',
  './legacy/task-studio/task-push.js',
  './legacy/reader/index.html',
  './legacy/reader/reader.css',
  './legacy/reader/reader.js',
  './legacy/reader/reader-db.js',
  './legacy/reader/epub-parser.js',
  './legacy/reader/reader-cloud.js',
  './legacy/reader/reader-account.js',
  './legacy/reader/reader-progress-cloud.js',
  './legacy/reader/reader-files-cloud.js',
  './legacy/reader/reader-font.js',
  './legacy/reader/pdf-reader.js',
  './legacy/reader/vendor/pdfjs/pdf.min.mjs',
  './legacy/reader/vendor/pdfjs/pdf.worker.min.mjs',
  './legacy/reader/vendor/pdfjs/pdf_viewer.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      /*
        El shell local es obligatorio.
        Supabase se intenta guardar también, pero si el CDN falla
        momentáneamente no bloqueamos la instalación de Kaoru.
      */
      await cache.addAll(CORE);

      try {
        const response = await fetch(
          SUPABASE_CDN,
          { cache: 'no-store' }
        );

        if (response) {
          await cache.put(
            SUPABASE_CDN,
            response.clone()
          );
        }
      } catch (error) {
        console.warn(
          'Kaoru: Supabase no pudo precargarse todavía.',
          error
        );
      }

      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) =>
              key.startsWith('kaoru-archive-reader-shell-') &&
              key !== CACHE_NAME
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function relativePath(url) {
  const scope = new URL(self.registration.scope);
  const current = new URL(url);

  if (current.origin !== scope.origin) return null;
  if (!current.pathname.startsWith(scope.pathname)) return null;

  return current.pathname.slice(scope.pathname.length);
}

function isReaderShell(path) {
  if (path == null) return false;

  return (
    path === '' ||
    path === 'index.html' ||
    path === 'logo.png' ||
    path === 'kaoru-notification-icon.png' ||
    path === 'kaoru-notification-badge.png' ||
    path === 'icono-kaoru.png' ||
    path === 'vendor/react.production.min.js' ||
    path === 'vendor/react-dom.production.min.js' ||
    path === 'app/dist/app.css' ||
    path === 'app/dist/app.js' ||
    path.startsWith('legacy/home/') ||
    path.startsWith('legacy/task-studio/') ||
    path.startsWith('legacy/reader/')
  );
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request, { cache: 'no-store' });

    if (
      response &&
      response.ok &&
      request.method === 'GET'
    ) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cached = await cache.match(
      request,
      { ignoreSearch: true }
    );

    if (cached) return cached;
    throw error;
  }
}


async function supabaseNetworkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(
      request,
      { cache: 'no-store' }
    );

    if (response) {
      /*
        También guardamos respuestas opaque. Para un <script> cross-origin
        son válidas en Cache Storage y permiten el arranque offline.
      */
      await cache.put(
        SUPABASE_CDN,
        response.clone()
      );
    }

    return response;
  } catch (error) {
    const cached = await cache.match(
      SUPABASE_CDN
    );

    if (cached) return cached;
    throw error;
  }
}
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  /*
    Aunque Supabase sea cross-origin, las peticiones iniciadas por una
    página controlada llegan al Service Worker. Primero atendemos ese
    recurso externo y después seguimos con el shell normal de Kaoru.
  */
  if (event.request.url === SUPABASE_CDN) {
    event.respondWith(
      supabaseNetworkFirst(event.request)
    );
    return;
  }

  const path = relativePath(event.request.url);

  if (!isReaderShell(path)) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await networkFirst(event.request);
        } catch (_) {
          const cache = await caches.open(CACHE_NAME);

          if (path && path.startsWith('legacy/task-studio/')) {
            return cache.match(
              './legacy/task-studio/index.html',
              { ignoreSearch: true }
            );
          }
          if (path && path.startsWith('legacy/reader/')) {
            return cache.match(
              './legacy/reader/index.html',
              { ignoreSearch: true }
            );
          }

          if (path && path.startsWith('legacy/home/')) {
            return cache.match(
              './legacy/home/index.html',
              { ignoreSearch: true }
            );
          }

          return cache.match(
            './index.html',
            { ignoreSearch: true }
          );
        }
      })()
    );

    return;
  }

  event.respondWith(networkFirst(event.request));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=event.notification?.data?.url||new URL('./#tasks',self.registration.scope).href;
  event.waitUntil((async()=>{
    const windows=await clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      try{if('navigate'in client)await client.navigate(target);}catch(_){}
      if('focus'in client)return client.focus();
    }
    return clients.openWindow?clients.openWindow(target):null;
  })());
});

self.addEventListener('push',event=>{
  let payload={};
  try{payload=event.data?.json?.()||{};}catch(_){
    try{payload={body:event.data?.text?.()||''};}catch(__){}
  }
  if(payload.closeTag){

    event.waitUntil((async()=>{

      const notifications=await self.registration.getNotifications({tag:payload.closeTag});

      notifications.forEach(notification=>notification.close());

    })());

    return;

  }

  const title=payload.title||'Kaoru Task Studio';
  const options={
    body:payload.body||'Tienes una tarea pendiente.',
    icon:new URL('./logo.png',self.registration.scope).href,
    badge:new URL('./kaoru-notification-badge.png',self.registration.scope).href,
    color:'#8B5CF6',
    tag:payload.tag||'kaoru-task-push',
    renotify:Boolean(payload.renotify),
    requireInteraction:Boolean(payload.requireInteraction),
    silent:Boolean(payload.silent),
    timestamp:Number(payload.timestamp||Date.now()),
    data:{
      ...payload,
      url:payload.url||new URL('./#tasks',self.registration.scope).href
    }
  };
  event.waitUntil(self.registration.showNotification(title,options));
});
