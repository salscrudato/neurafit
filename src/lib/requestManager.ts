/**
 * Request Management System
 * 
 * Provides:
 * - Request deduplication
 * - Automatic cancellation on component unmount
 * - Request caching
 * - Concurrent request limiting
 */

import { logger } from './logger'

/**
 * Pending requests map for deduplication
 */
const pendingRequests = new Map<string, Promise<unknown>>()

/**
 * Active abort controllers for cleanup
 */
const activeControllers = new Map<string, AbortController>()

/**
 * Request cache with TTL
 */
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

const requestCache = new Map<string, CacheEntry<unknown>>()

/**
 * Deduplicated fetch - prevents duplicate concurrent requests
 */
export async function dedupedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    cacheTTL?: number // Cache time-to-live in milliseconds
    forceRefresh?: boolean // Bypass cache
  } = {}
): Promise<T> {
  const { cacheTTL = 0, forceRefresh = false } = options

  // Check cache first
  if (!forceRefresh && cacheTTL > 0) {
    const cached = requestCache.get(key) as CacheEntry<T> | undefined
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      logger.debug(`Cache hit for ${key}`)
      return cached.data
    }
  }

  // Check if request is already pending
  if (pendingRequests.has(key)) {
    logger.debug(`Deduplicating request for ${key}`)
    return pendingRequests.get(key) as Promise<T>
  }

  // Create new request
  const promise = fetcher()
    .then((data) => {
      // Cache the result
      if (cacheTTL > 0) {
        requestCache.set(key, {
          data,
          timestamp: Date.now(),
          ttl: cacheTTL
        })
      }
      return data
    })
    .finally(() => {
      // Remove from pending requests
      pendingRequests.delete(key)
    })

  pendingRequests.set(key, promise)
  return promise
}

/**
 * Managed fetch with automatic cancellation
 */
export function createManagedFetch(componentId: string) {
  const controllers = new Map<string, AbortController>()

  return {
    /**
     * Fetch with automatic cancellation support
     */
    fetch: async <T>(
      url: string,
      options: RequestInit & {
        key?: string // Unique key for deduplication
        cacheTTL?: number
        timeout?: number
      } = {}
    ): Promise<T> => {
      const { key = url, cacheTTL = 0, timeout = 60000, ...fetchOptions } = options

      // Create abort controller
      const controller = new AbortController()
      const requestKey = `${componentId}:${key}`
      
      // Store controller for cleanup
      controllers.set(requestKey, controller)
      activeControllers.set(requestKey, controller)

      // Set up timeout
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, timeout)

      try {
        // Use deduplicated fetch
        const result = await dedupedFetch<T>(
          key,
          async () => {
            const response = await fetch(url, {
              ...fetchOptions,
              signal: controller.signal
            })

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }

            return response.json()
          },
          { cacheTTL }
        )

        return result
      } finally {
        clearTimeout(timeoutId)
        controllers.delete(requestKey)
        activeControllers.delete(requestKey)
      }
    },

    /**
     * Cancel all requests for this component
     */
    cancelAll: () => {
      controllers.forEach((controller, key) => {
        controller.abort()
        activeControllers.delete(key)
      })
      controllers.clear()
    },

    /**
     * Cancel specific request
     */
    cancel: (key: string) => {
      const requestKey = `${componentId}:${key}`
      const controller = controllers.get(requestKey)
      if (controller) {
        controller.abort()
        controllers.delete(requestKey)
        activeControllers.delete(requestKey)
      }
    }
  }
}

/**
 * React hook for managed fetch
 */
export function useManagedFetch(componentId: string) {
  // Create manager on mount
  const manager = createManagedFetch(componentId)

  // Cleanup on unmount
  if (typeof window !== 'undefined') {
    // Store cleanup function
    const cleanup = () => manager.cancelAll()
    
    // This will be called by the component's useEffect cleanup
    return {
      ...manager,
      cleanup
    }
  }

  return manager
}

/**
 * Concurrent request limiter
 */
export class ConcurrentRequestLimiter {
  private queue: Array<() => Promise<unknown>> = []
  private active = 0
  private maxConcurrent: number

  constructor(maxConcurrent: number = 6) {
    this.maxConcurrent = maxConcurrent
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    // Wait if at capacity
    while (this.active >= this.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    this.active++

    try {
      return await fn()
    } finally {
      this.active--
      this.processQueue()
    }
  }

  private processQueue() {
    if (this.queue.length > 0 && this.active < this.maxConcurrent) {
      const next = this.queue.shift()
      if (next) {
        next()
      }
    }
  }
}

/**
 * Global request limiter instance
 */
export const globalRequestLimiter = new ConcurrentRequestLimiter(6)

/**
 * Clear all caches
 */
export function clearRequestCache() {
  requestCache.clear()
  logger.debug('Request cache cleared')
}

/**
 * Clear specific cache entry
 */
export function clearCacheEntry(key: string) {
  requestCache.delete(key)
  logger.debug(`Cache entry cleared: ${key}`)
}

/**
 * Cancel all active requests (useful for logout)
 */
export function cancelAllRequests() {
  activeControllers.forEach(controller => controller.abort())
  activeControllers.clear()
  pendingRequests.clear()
  logger.debug('All active requests cancelled')
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const now = Date.now()
  let validEntries = 0
  let expiredEntries = 0

  requestCache.forEach((entry) => {
    if (now - entry.timestamp < entry.ttl) {
      validEntries++
    } else {
      expiredEntries++
    }
  })

  return {
    total: requestCache.size,
    valid: validEntries,
    expired: expiredEntries,
    pendingRequests: pendingRequests.size,
    activeControllers: activeControllers.size
  }
}

/**
 * Clean up expired cache entries
 */
export function cleanupExpiredCache() {
  const now = Date.now()
  let cleaned = 0

  requestCache.forEach((entry, key) => {
    if (now - entry.timestamp >= entry.ttl) {
      requestCache.delete(key)
      cleaned++
    }
  })

  if (cleaned > 0) {
    logger.debug(`Cleaned up ${cleaned} expired cache entries`)
  }

  return cleaned
}

// Auto cleanup expired cache every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(cleanupExpiredCache, 5 * 60 * 1000)
}

