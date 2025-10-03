/**
 * NeuraFit Service Worker with Workbox
 * 
 * Implements:
 * - App shell precaching
 * - Stale-While-Revalidate for workout function responses
 * - Network-first for HTML
 * - Cache-first for static assets
 */

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Environment detection
const isDevelopment = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const isProduction = !isDevelopment;

// Precache app shell and assets (injected by workbox-build)
// This will be replaced with actual file list during build
precacheAndRoute(self.__WB_MANIFEST || []);

console.log(`SW: Workbox service worker ${isDevelopment ? 'development' : 'production'} mode`);

/**
 * Strategy 1: Stale-While-Revalidate for workout function responses
 * - Serves cached response immediately
 * - Fetches fresh data in background
 * - Short maxAge (15s) to keep data fresh
 * - Don't cache auth errors
 */
registerRoute(
  ({ url }) => {
    // Match the workout generation function URL
    return url.href.includes('generateworkout') || 
           url.href.includes('cloudfunctions.net') ||
           url.href.includes('run.app');
  },
  new StaleWhileRevalidate({
    cacheName: 'workout-api-v1',
    plugins: [
      // Only cache successful responses
      new CacheableResponsePlugin({
        statuses: [200],
      }),
      // Expire after 15 seconds
      new ExpirationPlugin({
        maxAgeSeconds: 15,
        maxEntries: 10,
      }),
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
 * Strategy 2: Network-first for HTML navigation requests
 * - Try network first
 * - Fall back to cache if offline
 * - Cache for offline support
 */
const navigationRoute = new NavigationRoute(
  new NetworkFirst({
    cacheName: 'html-cache-v1',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24, // 24 hours
        maxEntries: 50,
      }),
    ],
  })
);

registerRoute(navigationRoute);

/**
 * Strategy 3: Cache-first for static assets (JS, CSS, images)
 * - Serve from cache if available
 * - Fetch from network if not in cache
 * - Long cache duration for versioned assets
 */
registerRoute(
  ({ request }) => {
    return request.destination === 'script' ||
           request.destination === 'style' ||
           request.destination === 'image' ||
           request.destination === 'font';
  },
  new CacheFirst({
    cacheName: 'static-assets-v1',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        maxEntries: 100,
      }),
    ],
  })
);

/**
 * Strategy 4: Stale-While-Revalidate for Firebase/Firestore requests
 * - Quick response from cache
 * - Update in background
 */
registerRoute(
  ({ url }) => {
    return url.hostname.includes('firebaseio.com') ||
           url.hostname.includes('googleapis.com') ||
           url.hostname.includes('firestore.googleapis.com');
  },
  new StaleWhileRevalidate({
    cacheName: 'firebase-cache-v1',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 5, // 5 minutes
        maxEntries: 50,
      }),
    ],
  })
);

/**
 * Install event - skip waiting to activate immediately
 */
self.addEventListener('install', (event) => {
  console.log('SW: Installing Workbox service worker');
  self.skipWaiting();
});

/**
 * Activate event - claim clients immediately
 */
self.addEventListener('activate', (event) => {
  console.log('SW: Activating Workbox service worker');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              // Keep Workbox caches and our versioned caches
              return !cacheName.includes('-v1') && 
                     !cacheName.startsWith('workbox-');
            })
            .map(cacheName => {
              console.log('SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
    ]).then(() => {
      // Notify all clients about the update
      return self.clients.matchAll();
    }).then(clients => {
      clients.forEach(client => {
        try {
          client.postMessage({ type: 'SW_UPDATED', version: 'workbox-v1' });
        } catch (error) {
          console.warn('SW: Failed to notify client:', error);
        }
      });
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

    switch (event.data.type) {
      case 'SKIP_WAITING':
        console.log('SW: Received SKIP_WAITING message');
        self.skipWaiting();
        break;

      case 'CHECK_UPDATE':
        console.log('SW: Received CHECK_UPDATE message');
        if (self.registration && self.registration.update) {
          self.registration.update().catch(error => {
            console.warn('SW: Update check failed:', error);
          });
        }
        break;

      case 'CLEAR_CACHE':
        console.log('SW: Received CLEAR_CACHE message');
        event.waitUntil(
          caches.keys().then(cacheNames => {
            return Promise.all(
              cacheNames.map(cacheName => caches.delete(cacheName))
            );
          }).then(() => {
            if (event.ports && event.ports[0]) {
              event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
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

