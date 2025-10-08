/**
 * Network Optimization Utilities
 * 
 * Provides utilities for optimizing network requests including request
 * deduplication, intelligent caching, and connection quality detection.
 */

import { useEffect, useState, useCallback, useRef } from 'react'

/**
 * Request deduplication cache
 * Prevents multiple identical requests from being made simultaneously
 */
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<unknown>>()

  async deduplicate<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>
    }

    // Create new request
    const promise = fetcher()
      .finally(() => {
        // Remove from pending requests when complete
        this.pendingRequests.delete(key)
      })

    this.pendingRequests.set(key, promise)
    return promise
  }

  clear() {
    this.pendingRequests.clear()
  }
}

export const requestDeduplicator = new RequestDeduplicator()

/**
 * Detects network connection quality
 * 
 * @example
 * ```tsx
 * const { effectiveType, downlink, rtt, saveData } = useNetworkQuality()
 * 
 * if (effectiveType === 'slow-2g' || saveData) {
 *   // Load low-quality images
 * }
 * ```
 */
export function useNetworkQuality() {
  const [networkInfo, setNetworkInfo] = useState<{
    effectiveType: string
    downlink: number
    rtt: number
    saveData: boolean
  }>({
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false,
  })

  useEffect(() => {
    const connection = (navigator as Navigator & {
      connection?: {
        effectiveType?: string
        downlink?: number
        rtt?: number
        saveData?: boolean
        addEventListener?: (event: string, handler: () => void) => void
        removeEventListener?: (event: string, handler: () => void) => void
      }
    }).connection

    if (!connection) return

    const updateNetworkInfo = () => {
      setNetworkInfo({
        effectiveType: connection.effectiveType || '4g',
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 50,
        saveData: connection.saveData || false,
      })
    }

    updateNetworkInfo()

    if (connection.addEventListener) {
      connection.addEventListener('change', updateNetworkInfo)
    }

    return () => {
      if (connection.removeEventListener) {
        connection.removeEventListener('change', updateNetworkInfo)
      }
    }
  }, [])

  return networkInfo
}

/**
 * Detects if the user is online/offline
 * 
 * @example
 * ```tsx
 * const isOnline = useOnlineStatus()
 * 
 * if (!isOnline) {
 *   return <div>You are offline</div>
 * }
 * ```
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

/**
 * Adaptive loading based on network conditions
 * 
 * @example
 * ```tsx
 * const shouldLoadHighQuality = useAdaptiveLoading()
 * 
 * return (
 *   <img src={shouldLoadHighQuality ? highQualityUrl : lowQualityUrl} />
 * )
 * ```
 */
export function useAdaptiveLoading() {
  const { effectiveType, saveData } = useNetworkQuality()
  const isOnline = useOnlineStatus()

  // Don't load high quality content if:
  // - User is offline
  // - Connection is slow (2g or slow-2g)
  // - User has data saver enabled
  const shouldLoadHighQuality =
    isOnline &&
    effectiveType !== '2g' &&
    effectiveType !== 'slow-2g' &&
    !saveData

  return shouldLoadHighQuality
}

/**
 * Preloads resources based on network conditions
 * 
 * @example
 * ```tsx
 * usePreload([
 *   { href: '/api/data', as: 'fetch' },
 *   { href: '/image.jpg', as: 'image' },
 * ])
 * ```
 */
export function usePreload(
  resources: Array<{ href: string; as: string; type?: string }>,
  condition: boolean = true
) {
  useEffect(() => {
    if (!condition) return

    const links: HTMLLinkElement[] = []

    resources.forEach(({ href, as, type }) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.href = href
      link.as = as
      if (type) {
        link.type = type
      }
      document.head.appendChild(link)
      links.push(link)
    })

    return () => {
      links.forEach((link) => {
        document.head.removeChild(link)
      })
    }
  }, [resources, condition])
}

/**
 * Implements request batching to reduce number of network calls
 * 
 * @example
 * ```tsx
 * const batchedFetch = useBatchedRequests(
 *   async (ids: string[]) => {
 *     return fetch(`/api/items?ids=${ids.join(',')}`)
 *   },
 *   { delay: 50, maxBatchSize: 10 }
 * )
 * 
 * // These will be batched together
 * batchedFetch('1')
 * batchedFetch('2')
 * batchedFetch('3')
 * ```
 */
export function useBatchedRequests<T, R>(
  batchFetcher: (items: T[]) => Promise<R[]>,
  options: { delay?: number; maxBatchSize?: number } = {}
) {
  const { delay = 50, maxBatchSize = 10 } = options
  const batchRef = useRef<{
    items: T[]
    resolvers: Array<(value: R) => void>
    rejecters: Array<(error: unknown) => void>
    timeoutId?: NodeJS.Timeout
  }>({
    items: [],
    resolvers: [],
    rejecters: [],
  })

  const processBatch = useCallback(async () => {
    const { items, resolvers, rejecters } = batchRef.current

    if (items.length === 0) return

    // Clear current batch
    batchRef.current = {
      items: [],
      resolvers: [],
      rejecters: [],
    }

    try {
      const results = await batchFetcher(items)
      results.forEach((result, index) => {
        resolvers[index]?.(result)
      })
    } catch (error) {
      rejecters.forEach((reject) => reject(error))
    }
  }, [batchFetcher])

  const fetch = useCallback(
    (item: T): Promise<R> => {
      return new Promise((resolve, reject) => {
        batchRef.current.items.push(item)
        batchRef.current.resolvers.push(resolve)
        batchRef.current.rejecters.push(reject)

        // Clear existing timeout
        if (batchRef.current.timeoutId) {
          clearTimeout(batchRef.current.timeoutId)
        }

        // Process immediately if batch is full
        if (batchRef.current.items.length >= maxBatchSize) {
          processBatch()
        } else {
          // Otherwise, wait for more items
          batchRef.current.timeoutId = setTimeout(processBatch, delay)
        }
      })
    },
    [processBatch, delay, maxBatchSize]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchRef.current.timeoutId) {
        clearTimeout(batchRef.current.timeoutId)
      }
    }
  }, [])

  return fetch
}

/**
 * Implements stale-while-revalidate caching strategy
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error, revalidate } = useSWR(
 *   'user-profile',
 *   () => fetch('/api/profile').then(r => r.json()),
 *   { staleTime: 5000 }
 * )
 * ```
 */
export function useSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { staleTime?: number; cacheTime?: number } = {}
) {
  const { staleTime = 5000, cacheTime = 300000 } = options
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map())

  const revalidate = useCallback(async () => {
    try {
      setIsLoading(true)
      const result = await fetcher()
      setData(result)
      setError(null)

      // Update cache
      cacheRef.current.set(key, {
        data: result,
        timestamp: Date.now(),
      })
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [key, fetcher])

  useEffect(() => {
    const cached = cacheRef.current.get(key)
    const now = Date.now()

    if (cached) {
      const age = now - cached.timestamp

      // Serve stale data immediately
      setData(cached.data)
      setIsLoading(false)

      // Revalidate if stale
      if (age > staleTime) {
        revalidate()
      }

      // Remove from cache if expired
      if (age > cacheTime) {
        cacheRef.current.delete(key)
      }
    } else {
      // No cache, fetch fresh data
      revalidate()
    }
  }, [key, staleTime, cacheTime, revalidate])

  return { data, error, isLoading, revalidate }
}

