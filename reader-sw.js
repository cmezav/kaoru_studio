const CACHE_NAME = 'kaoru-archive-reader-shell-7';

const CORE = [
  './',
  './index.html',
  './logo.png',
  './vendor/react.production.min.js',
  './vendor/react-dom.production.min.js',
  './app/dist/app.css',
  './app/dist/app.js',
  './legacy/home/index.html',
  './legacy/reader/index.html',
  './legacy/reader/reader.css',
  './legacy/reader/reader.js',
  './legacy/reader/reader-db.js',
  './legacy/reader/epub-parser.js',
  './legacy/reader/reader-cloud.js',
  './legacy/reader/reader-font.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
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
    path === 'vendor/react.production.min.js' ||
    path === 'vendor/react-dom.production.min.js' ||
    path === 'app/dist/app.css' ||
    path === 'app/dist/app.js' ||
    path.startsWith('legacy/home/') ||
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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const path = relativePath(event.request.url);

  if (!isReaderShell(path)) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await networkFirst(event.request);
        } catch (_) {
          const cache = await caches.open(CACHE_NAME);

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
