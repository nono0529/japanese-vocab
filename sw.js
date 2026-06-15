/* ============================
   不背日语 — Service Worker
   Cache-first strategy for offline support
   ============================ */

const CACHE_NAME = 'bubei-nihongo-v4';

const PRECACHE_URLS = [
  './',
  './index.html',
  './css/main.css',
  './css/components.css',
  './css/home.css',
  './css/learn.css',
  './css/review.css',
  './css/quiz.css',
  './css/stats.css',
  './js/app.js',
  './js/db.js',
  './js/srs.js',
  './js/vocabulary.js',
  './js/ui.js',
  './js/tts.js',
  './js/views/home.js',
  './js/views/lessonList.js',
  './js/views/learn.js',
  './js/views/review.js',
  './js/views/dictation.js',
  './js/views/quiz.js',
  './js/views/stats.js',
  './js/views/wordbook.js',
  './js/views/settings.js',
  './lib/dexie.min.js',
  './data/vocabulary.json',
  './manifest.json'
];

/* ---- Install: Precache all assets ---- */
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching', PRECACHE_URLS.length, 'files');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

/* ---- Activate: Clean old caches ---- */
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            })
      );
    }).then(() => self.clients.claim())
  );
});

/* ---- Fetch: Cache-first strategy ---- */
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip non-http(s) requests
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Return from cache, update cache in background
        const fetchPromise = fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Network failed, cached response already returned
        });

        // Don't wait for network update
        return cachedResponse;
      }

      // Not in cache, try network
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      }).catch(() => {
        // Network failed and no cache — return a simple offline page for navigation
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
