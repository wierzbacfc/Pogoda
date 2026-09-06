const CACHE_NAME = 'pogoda-pwa-v8';

const STATIC_ASSETS = [
  './',
  './manifest.json',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/weather-3d/cloud.png',
  './icons/weather-3d/cloud_lightning.png',
  './icons/weather-3d/cloud_rain.png',
  './icons/weather-3d/cloud_snow.png',
  './icons/weather-3d/cloud_storm.png',
  './icons/weather-3d/crescent_moon.png',
  './icons/weather-3d/droplet.png',
  './icons/weather-3d/fog.png',
  './icons/weather-3d/moon_cloud.png',
  './icons/weather-3d/snowflake.png',
  './icons/weather-3d/sun.png',
  './icons/weather-3d/sun_cloud.png',
  './icons/weather-3d/sun_rain.png',
];

// Install: cache static assets into the new cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate: clean old caches and take immediate control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Message handler for skip waiting (update flow)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch: network-first for navigations and API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API calls — let them go directly to network
  if (
    url.hostname.includes('open-meteo.com') ||
    url.hostname.includes('bigdatacloud.net')
  ) {
    return;
  }

  // For navigation requests (HTML pages): network-first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the latest page
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || caches.match('./') || caches.match('/');
          });
        })
    );
    return;
  }

  // For static assets: stale-while-revalidate with subpath/relative fallback
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          // Update cache with fresh version if successful
          if (response && response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, return cached if available
          return cached;
        });

      if (cached) {
        return cached;
      }

      // If not cached directly and it's a weather icon, try matching by asset name
      if (url.pathname.includes('/icons/weather-3d/')) {
        const filename = url.pathname.split('/').pop();
        return caches.match(`./icons/weather-3d/${filename}`).then((fallbackCached) => {
          return fallbackCached || fetchPromise;
        });
      }

      return fetchPromise;
    })
  );
});
