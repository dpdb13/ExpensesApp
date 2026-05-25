const CACHE_NAME = 'splitly-v24';
const STATIC_ASSETS = [
  '/ExpensesApp/',
  '/ExpensesApp/index.html',
  '/ExpensesApp/manifest-v11.json',
  '/ExpensesApp/icon-192-v11.png',
  '/ExpensesApp/icon-512-v11.png',
  '/ExpensesApp/icon-maskable-192-v11.png',
  '/ExpensesApp/icon-maskable-512-v11.png',
  '/ExpensesApp/logo.png'
];

// Instalar: cachear assets estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activar: limpiar caches antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
  );
  self.clients.claim();
});

// Escuchar mensaje para activarse inmediatamente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch: diferentes estrategias según el tipo de recurso
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar peticiones a Supabase (siempre online)
  if (url.hostname.includes('supabase')) {
    return;
  }

  // Para assets estáticos: Cache First
  if (request.destination === 'image' ||
      request.destination === 'font' ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js')) {
    event.respondWith(
      caches.match(request)
        .then((cached) => {
          if (cached) {
            // Actualizar cache en segundo plano
            fetch(request).then((response) => {
              if (response.ok) {
                caches.open(CACHE_NAME)
                  .then((cache) => cache.put(request, response));
              }
            }).catch(() => {});
            return cached;
          }
          return fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(request, clone));
            }
            return response;
          });
        })
    );
    return;
  }

  // Para HTML: Network First con fallback a cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
