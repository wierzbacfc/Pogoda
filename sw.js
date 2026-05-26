const CACHE_NAME = 'weather-pwa-v43';

const STATIC_ASSETS = [
  './',
  'index.html',
  'css/styles.css?v=41',
  'js/app.js?v=41',
  'js/api.js?v=41',
  'js/geo.js?v=41',
  'js/storage.js?v=41',
  'js/ui.js?v=41',
  'js/weather-codes.js?v=41',
  'js/pwa.js?v=41',
  'manifest.json',
  'offline.html',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png'
];

// Install Service Worker and cache all static shell assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Service Worker and clean up stale caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[Service Worker] Removing old cache:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Intercept requests and serve from cache if available
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Bypass cache for Open-Meteo and BigDataCloud APIs (managed inside application JS caching)
  if (url.hostname.includes('open-meteo.com') ||
      url.hostname.includes('bigdatacloud.net')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).catch(() => {
        // Serve offline.html fallback for navigation requests when connection is lost
        if (event.request.mode === 'navigate') {
          return caches.match('offline.html');
        }
        return Response.error();
      });
    })
  );
});
