/**
 * NeuraFit Service Worker
 *
 * Optimized for development and production environments with proper error handling,
 * cache management, and update mechanisms.
 */

// Environment detection
const isDevelopment = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
const isProduction = !isDevelopment

// Cache configuration
const CACHE_VERSION = isProduction ? Date.now() : 'dev'
const CACHE_NAME = `neurafit-v${CACHE_VERSION}`
const STATIC_CACHE = `neurafit-static-v${CACHE_VERSION}`
const DYNAMIC_CACHE = `neurafit-dynamic-v${CACHE_VERSION}`

// Files to cache immediately (only in production)
const STATIC_FILES = isProduction ? [
  '/',
  '/manifest.json',
  '/logo.svg'
] : []

// Files that should always be fetched fresh
const BYPASS_CACHE = [
  '/sw.js',
  '/index.html',
  '/manifest.json'
]

// Development URLs to skip (Vite HMR and dev server)
const DEV_SKIP_PATTERNS = [
  '/@vite/',
  '/@fs/',
  '/__vite_ping',
  '/node_modules/',
  '/@id/',
  '/@react-refresh'
]

/**
 * Install event - cache static files and skip waiting
 */
self.addEventListener('install', (event) => {
  console.log(`SW: Installing ${isDevelopment ? 'development' : 'production'} version`)

  event.waitUntil(
    Promise.all([
      // Only cache files in production
      isProduction ?
        caches.open(STATIC_CACHE)
          .then(cache => cache.addAll(STATIC_FILES))
          .catch(error => {
            console.warn('SW: Failed to cache static files:', error)
            return Promise.resolve() // Don't fail installation
          }) :
        Promise.resolve(),

      // Skip waiting to activate immediately
      self.skipWaiting()
    ]).catch(error => {
      console.error('SW: Installation failed:', error)
      throw error
    })
  )
})

/**
 * Activate event - clean up old caches and claim clients
 */
self.addEventListener('activate', (event) => {
  console.log('SW: Activating new version')

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName =>
              cacheName.startsWith('neurafit-') &&
              cacheName !== STATIC_CACHE &&
              cacheName !== DYNAMIC_CACHE
            )
            .map(cacheName => {
              console.log('SW: Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            })
        )
      }).catch(error => {
        console.warn('SW: Cache cleanup failed:', error)
        return Promise.resolve()
      }),

      // Take control of all clients immediately
      self.clients.claim()
    ]).then(() => {
      // Notify all clients about the update
      return self.clients.matchAll()
    }).then(clients => {
      clients.forEach(client => {
        try {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION })
        } catch (error) {
          console.warn('SW: Failed to notify client:', error)
        }
      })
    }).catch(error => {
      console.error('SW: Activation failed:', error)
      throw error
    })
  )
})

/**
 * Fetch event handler with proper error handling and development support
 */
self.addEventListener('fetch', (event) => {
  const { request } = event

  try {
    const url = new URL(request.url)

    // Skip non-GET requests
    if (request.method !== 'GET') {
      return
    }

    // Skip cross-origin requests
    if (url.origin !== location.origin) {
      return
    }

    // In development, skip Vite-specific URLs
    if (isDevelopment && DEV_SKIP_PATTERNS.some(pattern => url.pathname.includes(pattern))) {
      return
    }

    // Always fetch fresh for bypass files
    if (BYPASS_CACHE.some(path => url.pathname === path || url.pathname.startsWith(path))) {
      event.respondWith(
        fetch(request).catch(error => {
          console.warn('SW: Network fetch failed for bypass file:', url.pathname, error)
          return new Response('Network Error', {
            status: 503,
            statusText: 'Service Unavailable'
          })
        })
      )
      return
    }

    // In development, use network-first for everything
    if (isDevelopment) {
      event.respondWith(
        fetch(request).catch(error => {
          console.warn('SW: Development fetch failed:', url.pathname, error)
          return new Response('Development Network Error', {
            status: 503,
            statusText: 'Service Unavailable'
          })
        })
      )
      return
    }

    // Production caching strategies
    if (isProduction) {
      // For HTML files, use network-first strategy
      if (request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(
          handleNetworkFirst(request)
        )
        return
      }

      // For other resources, use cache-first strategy
      event.respondWith(
        handleCacheFirst(request)
      )
    }

  } catch (error) {
    console.error('SW: Fetch event handler error:', error)
    // Don't call event.respondWith if there's an error in the handler
  }
})

/**
 * Network-first strategy with cache fallback
 */
async function handleNetworkFirst(request) {
  try {
    const response = await fetch(request)

    // Cache successful responses
    if (response.ok && response.status === 200) {
      try {
        const responseClone = response.clone()
        const cache = await caches.open(DYNAMIC_CACHE)
        await cache.put(request, responseClone)
      } catch (cacheError) {
        console.warn('SW: Failed to cache response:', cacheError)
      }
    }

    return response
  } catch (networkError) {
    console.warn('SW: Network request failed, trying cache:', networkError)

    // Fallback to cache if network fails
    try {
      const cachedResponse = await caches.match(request)
      if (cachedResponse) {
        return cachedResponse
      }
    } catch (cacheError) {
      console.warn('SW: Cache lookup failed:', cacheError)
    }

    // Return a proper error response
    return new Response('Offline - Content not available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}

/**
 * Cache-first strategy with network fallback
 */
async function handleCacheFirst(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // Not in cache, fetch from network
    const response = await fetch(request)

    // Cache successful responses
    if (response.ok && response.status === 200) {
      try {
        const responseClone = response.clone()
        const cache = await caches.open(DYNAMIC_CACHE)
        await cache.put(request, responseClone)
      } catch (cacheError) {
        console.warn('SW: Failed to cache response:', cacheError)
      }
    }

    return response
  } catch (error) {
    console.warn('SW: Cache-first strategy failed:', error)

    // Return a proper error response
    return new Response('Resource not available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}

/**
 * Message handler for communication with the main thread
 */
self.addEventListener('message', (event) => {
  try {
    // Enhanced validation with debugging info
    if (event.data === null || event.data === undefined) {
      console.warn('SW: Received null/undefined message data from:', event.origin || 'unknown origin')
      return
    }

    // Handle both object and primitive message formats
    let messageType, messagePayload
    if (typeof event.data === 'object' && event.data !== null) {
      // Check for Firebase message format (eventType instead of type)
      if (event.data.eventType && !event.data.type) {
        // This is a Firebase internal message, ignore it silently
        return
      }

      messageType = event.data.type
      messagePayload = event.data.payload

      // Additional validation for object messages
      if (event.data.type === null || event.data.type === undefined) {
        console.warn('SW: Received object message with null/undefined type:', event.data)
        return
      }
    } else if (typeof event.data === 'string') {
      messageType = event.data
      messagePayload = null
    } else {
      console.warn('SW: Received message with unsupported data type:', typeof event.data, 'Value:', event.data)
      return
    }

    // Validate message type
    if (!messageType || typeof messageType !== 'string' || messageType.trim() === '') {
      console.warn('SW: Received message with invalid or missing type:', messageType, 'Full data:', event.data)
      return
    }

    switch (messageType) {
      case 'SKIP_WAITING':
        console.log('SW: Received SKIP_WAITING message')
        self.skipWaiting()
        break

      case 'CHECK_UPDATE':
        console.log('SW: Received CHECK_UPDATE message')
        if (self.registration && self.registration.update) {
          self.registration.update().catch(error => {
            console.warn('SW: Update check failed:', error)
          })
        }
        break

      case 'GET_VERSION':
        // Respond with current version
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({
            type: 'VERSION_RESPONSE',
            version: CACHE_VERSION,
            environment: isDevelopment ? 'development' : 'production'
          })
        }
        break

      case 'CLEAR_CACHE':
        console.log('SW: Received CLEAR_CACHE message')
        clearAllCaches().then(() => {
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ type: 'CACHE_CLEARED' })
          }
        }).catch(error => {
          console.error('SW: Cache clearing failed:', error)
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ type: 'CACHE_CLEAR_FAILED', error: error.message })
          }
        })
        break

      case 'SUBSCRIPTION_UPDATED':
        // Handle subscription update notifications
        console.log('SW: Received SUBSCRIPTION_UPDATED message')
        // Broadcast to all clients
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            try {
              client.postMessage({
                type: 'SUBSCRIPTION_SYNC_REQUIRED',
                payload: messagePayload
              })
            } catch (error) {
              console.warn('SW: Failed to notify client about subscription update:', error)
            }
          })
        })
        break

      default:
        console.log('SW: Unknown message type:', messageType)
    }
  } catch (error) {
    console.error('SW: Message handler error:', error)
  }
})

/**
 * Clear all caches
 */
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys()
    const deletePromises = cacheNames
      .filter(name => name.startsWith('neurafit-'))
      .map(name => caches.delete(name))

    await Promise.all(deletePromises)
    console.log('SW: All caches cleared')
  } catch (error) {
    console.error('SW: Failed to clear caches:', error)
    throw error
  }
}

/**
 * Error handler for unhandled promise rejections
 */
self.addEventListener('unhandledrejection', (event) => {
  console.error('SW: Unhandled promise rejection:', event.reason)
  // Prevent the default behavior (logging to console)
  event.preventDefault()
})

/**
 * Error handler for uncaught errors
 */
self.addEventListener('error', (event) => {
  console.error('SW: Uncaught error:', event.error || event.message)
})
