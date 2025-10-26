const CACHE_NAME = 'audioVersets-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app-complet.js',
  '/bdd-audio.js',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch(() => {
        console.log('Some assets could not be cached');
      });
    })
  );
  
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  if (request.method !== 'GET') {
    return;
  }
  
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const cache = caches.open(CACHE_NAME);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }
  
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }
        
        return fetch(request).then((response) => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          
          return response;
        });
      })
      .catch(() => {
        if (request.destination === 'image') {
          return caches.match('/offline-image.png');
        }
        return caches.match('/offline.html');
      })
  );
});

self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-quiz-results') {
    event.waitUntil(syncQuizResults());
  }
});

async function syncQuizResults() {
  try {
    console.log('[SW] Syncing quiz results...');
    return true;
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
    throw error;
  }
}

self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'TRIGGER_SYNC':
      self.registration.sync.register('sync-quiz-results');
      break;
      
    case 'CHECK_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
  }
});

console.log('Service Worker loaded and ready');