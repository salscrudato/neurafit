// Advanced service worker for instant updates and cache management
const CACHE_NAME = 'neurafit-v2'
const STATIC_CACHE = 'neurafit-static-v2'
const DYNAMIC_CACHE = 'neurafit-dynamic-v2'

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/manifest.json'
]

// Files that should always be fetched fresh
const BYPASS_CACHE = [
  '/sw.js',
  '/index.html'
]

// Install event - cache static files and skip waiting
self.addEventListener('install', (event) => {
  console.log('SW: Installing new version')

  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_FILES)),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  )
})

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('SW: Activating new version')

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('SW: Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ])
  )

  // Notify all clients about the update
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'SW_UPDATED' })
    })
  })
})

// Fetch event - implement cache-first with network fallback strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip cross-origin requests
  if (url.origin !== location.origin) return

  // Always fetch fresh for bypass files
  if (BYPASS_CACHE.some(path => url.pathname === path)) {
    event.respondWith(fetch(request))
    return
  }

  // For HTML files, use network-first strategy
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request)
        })
    )
    return
  }

  // For other resources, use cache-first strategy
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then(response => {
            // Cache successful responses
            if (response.status === 200) {
              const responseClone = response.clone()
              caches.open(DYNAMIC_CACHE).then(cache => {
                cache.put(request, responseClone)
              })
            }
            return response
          })
      })
  )
})

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data && event.data.type === 'CHECK_UPDATE') {
    // Force update check
    self.registration.update()
  }
})
