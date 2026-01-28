const CACHE_NAME = 'expenses-app-v10';
const urlsToCache = [
  '/ExpensesApp/',
  '/ExpensesApp/index.html',
  '/ExpensesApp/manifest-v10.json',
  '/ExpensesApp/icon-192-v10.png',
  '/ExpensesApp/icon-512-v10.png',
  '/ExpensesApp/icon-maskable-192-v10.png',
  '/ExpensesApp/icon-maskable-512-v10.png'
];

// Instalar el service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activar y limpiar caches antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptar peticiones - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Guardar en cache si es exitoso
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => {
        // Si falla la red, intentar desde cache
        return caches.match(event.request);
      })
  );
});
