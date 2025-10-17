/**
 * NeuraFit Service Worker
 * Handles offline functionality, caching, and PWA features
 */

const CACHE_NAME = 'neurafit-v1';
const RUNTIME_CACHE = 'neurafit-runtime-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((error) => {
        console.warn('Failed to cache assets during install:', error);
        // Don't fail the install if caching fails
        return Promise.resolve();
      });
    })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
    })
  );
  // Claim all clients immediately
  self.clients.claim();
});

// Fetch event - implement caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // CRITICAL: Never serve HTML for module/script requests
  // This prevents MIME type errors for dynamic imports
  const isModuleRequest = request.destination === 'script' ||
                          request.destination === 'worker' ||
                          request.destination === 'sharedworker';

  if (isModuleRequest) {
    // Always fetch modules from network, never cache as HTML
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache if it's actually JavaScript
          if (response && response.status === 200) {
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/javascript') ||
                contentType.includes('application/wasm') ||
                contentType.includes('text/javascript')) {
              const responseToCache = response.clone();
              caches.open(RUNTIME_CACHE).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
          }
          return response;
        })
        .catch(() => {
          // For modules, don't fall back to HTML - let it fail properly
          return caches.match(request);
        })
    );
    return;
  }

  // Skip Firebase and external API requests - always fetch from network
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('cloudfunctions.net')
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses for offline use
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached response if network fails
          return caches.match(request);
        })
    );
    return;
  }

  // For HTML pages, use network-first strategy
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // For assets (CSS, images), use cache-first strategy
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Return a placeholder or cached response
          return caches.match(request);
        });
    })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  // CRITICAL: Use waitUntil() for async operations to prevent message channel from closing

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    // Use waitUntil to ensure async operation completes before message channel closes
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            return caches.delete(cacheName);
          })
        );
      })
    );
    return;
  }
});

