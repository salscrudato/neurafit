/**
 * NeuraFit Service Worker with Workbox - Production Ready
 *
 * Implements:
 * - App shell precaching with versioning
 * - Cache-first for static assets (JS, CSS, images, fonts)
 * - Stale-While-Revalidate for API GETs with query param normalization
 * - Network-first for HTML navigation
 * - Broadcast channel for SW update notifications
 * - Offline support for shell + last workout
 * - Smart cache invalidation
 */

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkFirst, CacheFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BroadcastUpdatePlugin } from 'workbox-broadcast-update';

// Environment detection
const isDevelopment = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const isProduction = !isDevelopment;

// Cache version - increment to force cache refresh
const CACHE_VERSION = 'v1.0.1';

// Precache app shell and assets (injected by workbox-build)
// This will be replaced with actual file list during build
precacheAndRoute(self.__WB_MANIFEST || []);

// Clean up outdated precaches automatically
cleanupOutdatedCaches();

console.log(`SW: Workbox service worker ${isDevelopment ? 'development' : 'production'} mode - ${CACHE_VERSION}`);

/**
 * Helper: Normalize URL by removing cache-busting query parameters
 * This prevents duplicate cache entries for the same resource
 */
const ignoredParams = ['_', 'timestamp', 'cache', 'v', 'version', 'cb'];

function normalizeUrl(url) {
  const urlObj = new URL(url);
  ignoredParams.forEach(param => urlObj.searchParams.delete(param));
  return urlObj.toString();
}

/**
 * Strategy 1: Cache-First for Static Assets (JS, CSS, images, fonts)
 * - Serve from cache if available (fastest)
 * - Fetch from network if not in cache
 * - Long cache duration for versioned assets
 * - Ignore cache-busting query params
 */
registerRoute(
  ({ request }) => {
    return request.destination === 'script' ||
           request.destination === 'style' ||
           request.destination === 'image' ||
           request.destination === 'font';
  },
  new CacheFirst({
    cacheName: `static-assets-${CACHE_VERSION}`,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200], // 0 for opaque responses
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year for versioned assets
        maxEntries: 200,
        purgeOnQuotaError: true,
      }),
      // Custom plugin to normalize URLs (ignore cache-busting params)
      {
        cacheKeyWillBeUsed: async ({ request }) => {
          return normalizeUrl(request.url);
        },
      },
    ],
  })
);

/**
 * Strategy 2: Stale-While-Revalidate for API GET requests
 * - Serves cached response immediately
 * - Fetches fresh data in background
 * - Broadcasts updates to clients
 * - Ignores cache-busting query params
 * - Don't cache auth errors or POST requests
 */
registerRoute(
  ({ url, request }) => {
    // Match API endpoints (Firebase Functions, Cloud Run)
    const isApiEndpoint = url.href.includes('generateworkout') ||
                          url.href.includes('cloudfunctions.net') ||
                          url.href.includes('run.app') ||
                          url.hostname.includes('firebaseio.com') ||
                          url.hostname.includes('firestore.googleapis.com');

    // Only cache GET requests
    return isApiEndpoint && request.method === 'GET';
  },
  new StaleWhileRevalidate({
    cacheName: `api-cache-${CACHE_VERSION}`,
    plugins: [
      // Only cache successful responses
      new CacheableResponsePlugin({
        statuses: [200],
      }),
      // Expire after 5 minutes
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 5,
        maxEntries: 50,
        purgeOnQuotaError: true,
      }),
      // Broadcast updates to all clients
      new BroadcastUpdatePlugin({
        headersToCheck: ['content-length', 'etag', 'last-modified'],
      }),
      // Normalize URLs to ignore cache-busting params
      {
        cacheKeyWillBeUsed: async ({ request }) => {
          return normalizeUrl(request.url);
        },
      },
      // Custom plugin to skip caching auth errors
      {
        cacheWillUpdate: async ({ response }) => {
          // Don't cache if response indicates auth error
          if (response.status === 401 || response.status === 403) {
            console.log('SW: Skipping cache for auth error');
            return null;
          }

          // Check response body for auth errors (if JSON)
          try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const clone = response.clone();
              const data = await clone.json();

              // Don't cache if response contains auth error
              if (data.error && (
                data.error.includes('auth') ||
                data.error.includes('unauthorized') ||
                data.error.includes('permission')
              )) {
                console.log('SW: Skipping cache for auth error in response body');
                return null;
              }
            }
          } catch (e) {
            // If we can't parse, just cache it
          }

          return response;
        },
      },
    ],
  })
);

/**
 * Strategy 3: Network-Only for POST/PUT/DELETE requests
 * - Never cache mutations
 * - Always go to network
 */
registerRoute(
  ({ request }) => {
    return request.method === 'POST' ||
           request.method === 'PUT' ||
           request.method === 'DELETE' ||
           request.method === 'PATCH';
  },
  new NetworkOnly()
);

/**
 * Strategy 4: Network-First for HTML Navigation Requests
 * - Try network first for fresh content
 * - Fall back to cache if offline (offline shell support)
 * - Cache for offline navigation
 */
const navigationRoute = new NavigationRoute(
  new NetworkFirst({
    cacheName: `html-cache-${CACHE_VERSION}`,
    networkTimeoutSeconds: 3, // Fast fallback to cache
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24, // 24 hours
        maxEntries: 50,
        purgeOnQuotaError: true,
      }),
    ],
  })
);

registerRoute(navigationRoute);

/**
 * Install event - skip waiting to activate immediately
 */
self.addEventListener('install', (event) => {
  console.log(`SW: Installing service worker ${CACHE_VERSION}`);
  // Skip waiting to activate immediately
  self.skipWaiting();
});

/**
 * Activate event - claim clients and clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log(`SW: Activating service worker ${CACHE_VERSION}`);

  event.waitUntil(
    Promise.all([
      // Take control of all clients immediately
      self.clients.claim(),

      // Clean up old caches (keep only current version)
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              // Delete caches that don't match current version
              const isOldCache = !cacheName.includes(CACHE_VERSION) &&
                                !cacheName.startsWith('workbox-precache');

              if (isOldCache) {
                console.log('SW: Deleting old cache:', cacheName);
              }

              return isOldCache;
            })
            .map(cacheName => caches.delete(cacheName))
        );
      }),
    ])
    .then(() => {
      // Notify all clients about the update using multiple methods
      return self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    })
    .then(clients => {
      console.log(`SW: Notifying ${clients.length} clients about update`);

      clients.forEach(client => {
        try {
          // Method 1: postMessage (traditional)
          client.postMessage({
            type: 'SW_UPDATED',
            version: CACHE_VERSION,
            timestamp: Date.now()
          });
        } catch (error) {
          console.warn('SW: Failed to notify client via postMessage:', error);
        }
      });

      // Method 2: BroadcastChannel (more reliable)
      try {
        const channel = new BroadcastChannel('sw-updates');
        channel.postMessage({
          type: 'SW_UPDATED',
          version: CACHE_VERSION,
          timestamp: Date.now()
        });
        channel.close();
      } catch (error) {
        console.warn('SW: BroadcastChannel not supported:', error);
      }
    })
  );
});

/**
 * Message handler for communication with the main thread
 */
self.addEventListener('message', (event) => {
  try {
    if (!event.data || !event.data.type) {
      return;
    }

    console.log('SW: Received message:', event.data.type);

    switch (event.data.type) {
      case 'SKIP_WAITING':
        console.log('SW: Activating new service worker immediately');
        self.skipWaiting();
        break;

      case 'CHECK_UPDATE':
        console.log('SW: Checking for updates');
        if (self.registration && self.registration.update) {
          self.registration.update()
            .then(() => console.log('SW: Update check complete'))
            .catch(error => console.warn('SW: Update check failed:', error));
        }
        break;

      case 'CLEAR_CACHE':
        console.log('SW: Clearing all caches');
        event.waitUntil(
          caches.keys()
            .then(cacheNames => {
              console.log(`SW: Deleting ${cacheNames.length} caches`);
              return Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
              );
            })
            .then(() => {
              console.log('SW: All caches cleared');
              // Respond back to the caller
              if (event.ports && event.ports[0]) {
                event.ports[0].postMessage({
                  type: 'CACHE_CLEARED',
                  timestamp: Date.now()
                });
              }
            })
            .catch(error => {
              console.error('SW: Failed to clear caches:', error);
              if (event.ports && event.ports[0]) {
                event.ports[0].postMessage({
                  type: 'CACHE_CLEAR_FAILED',
                  error: error.message
                });
              }
            })
        );
        break;

      case 'GET_CACHE_SIZE':
        console.log('SW: Calculating cache size');
        event.waitUntil(
          caches.keys()
            .then(cacheNames => {
              return Promise.all(
                cacheNames.map(async cacheName => {
                  const cache = await caches.open(cacheName);
                  const keys = await cache.keys();
                  return { name: cacheName, count: keys.length };
                })
              );
            })
            .then(cacheInfo => {
              if (event.ports && event.ports[0]) {
                event.ports[0].postMessage({
                  type: 'CACHE_SIZE',
                  caches: cacheInfo,
                  timestamp: Date.now()
                });
              }
            })
        );
        break;

      default:
        console.log('SW: Unknown message type:', event.data.type);
    }
  } catch (error) {
    console.error('SW: Message handler error:', error);
  }
});

/**
 * Fetch event - log offline requests in development
 */
if (isDevelopment) {
  self.addEventListener('fetch', (event) => {
    // Log failed fetches in development
    event.respondWith(
      fetch(event.request).catch(error => {
        console.log('SW: Fetch failed (offline?):', event.request.url);
        throw error;
      })
    );
  });
}

