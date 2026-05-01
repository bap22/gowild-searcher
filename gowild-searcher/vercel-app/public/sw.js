// GoWild Fare Finder - Service Worker
const CACHE_NAME = 'gowild-v1';
const OFFLINE_URL = '/offline';

// App shell resources to cache immediately
const APP_SHELL = [
  '/',
  '/offline',
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching app shell');
      return cache.addAll(APP_SHELL);
    })
  );
  // Force activation even if old service worker is still active
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Claim all clients immediately
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // If not in cache, fetch from network
      if (!cachedResponse) {
        return fetchAndCache(event.request);
      }

      // Return cached response, but update cache in background (stale-while-revalidate)
      fetchAndCache(event.request).catch(() => {
        // Network failed, just use cache
      });

      return cachedResponse;
    }).catch(() => {
      // If all else fails, show offline page for navigation requests
      if (event.request.mode === 'navigate') {
        return caches.match(OFFLINE_URL);
      }
    })
  );
});

// Helper function to fetch and cache
async function fetchAndCache(request) {
  const response = await fetch(request);
  
  // Only cache successful responses
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  
  return response;
}
