const CACHE_NAME = 'rumchat-v3-offline';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json'
];

// 1. INSTALL : Pré-cache les fichiers critiques
self.addEventListener('install', event => {
  self.skipWaiting(); // Force l'activation directe
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .catch(err => console.log('Precache failed:', err))
  );
});

// 2. ACTIVATE : Nettoie les vieux caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Prend le contrôle direct
  );
});

// 3. FETCH : Stratégie Cache First avec fallback réseau
self.addEventListener('fetch', event => {
  // Ignore les requêtes non-GET et chrome-extension
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension')) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Retourne le cache si dispo, sinon va sur le réseau
      return cachedResponse || fetch(event.request).then(networkResponse => {
        // Met en cache les nouvelles pages HTML pour offline
        if (networkResponse.ok && event.request.destination === 'document') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      });
    }).catch(() => {
      // Fallback si offline et pas en cache = retourne index.html
      if (event.request.destination === 'document') {
        return caches.match('./index.html');
      }
    })
  );
});
