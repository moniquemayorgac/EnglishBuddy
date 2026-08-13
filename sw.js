// sw.js - Service Worker para caché offline parcial

const CACHE_NAME = 'englishchat-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
  // Puedes añadir más recursos estáticos si los tienes
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierta');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activación y limpieza de cachés antiguas
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptar peticiones y servir desde caché si está disponible
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si el recurso está en caché, devolverlo
        if (response) {
          return response;
        }
        // Si no, intentar obtenerlo de la red
        return fetch(event.request).catch(() => {
          // Si falla la red, mostrar un mensaje offline (opcional)
          // Para páginas HTML podemos mostrar una página offline
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Recurso no disponible offline', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});
