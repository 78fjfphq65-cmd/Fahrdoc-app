/* ============================================
   FahrDoc — Service Worker
   Caching strategy: Network-first for API calls,
   Cache-first for static assets.
   ============================================ */
const CACHE_NAME = 'fahrdoc-v27-trial-banner';
const STATIC_ASSETS = [
  './',
  './index.html',
  './app.js',
  './style.css',
  './base.css',
  './i18n.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // API calls: network-first (don't serve stale data)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Offline — keine Verbindung zum Server' }),
          { headers: { 'Content-Type': 'application/json' }, status: 503 }
        );
      })
    );
    return;
  }

  // Google Maps & external: network only
  if (url.origin !== self.location.origin) return;

  // Core app files: NETWORK-FIRST (always get fresh code)
  const isCoreFile = /\.(js|css|html)$/.test(url.pathname) || url.pathname === '/' || url.pathname.endsWith('/index.html');
  if (isCoreFile) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response && response.ok) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned);
          });
        }
        return response;
      }).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Images & other static: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.ok) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned);
          });
        }
        return response;
      });
    })
  );
});
