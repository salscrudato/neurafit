/**
 * Tests for Request Manager
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  dedupedFetch,
  createManagedFetch,
  clearRequestCache,
  clearCacheEntry,
  getCacheStats,
  cleanupExpiredCache
} from '../requestManager'

describe('dedupedFetch', () => {
  beforeEach(() => {
    clearRequestCache()
  })

  it('should deduplicate concurrent requests', async () => {
    const fetcher = vi.fn().mockResolvedValue('result')

    // Make two concurrent requests with the same key
    const [result1, result2] = await Promise.all([
      dedupedFetch('test-key', fetcher),
      dedupedFetch('test-key', fetcher)
    ])

    expect(result1).toBe('result')
    expect(result2).toBe('result')
    expect(fetcher).toHaveBeenCalledTimes(1) // Only called once
  })

  it('should cache results with TTL', async () => {
    const fetcher = vi.fn().mockResolvedValue('result')

    // First call
    const result1 = await dedupedFetch('test-key', fetcher, { cacheTTL: 5000 })
    
    // Second call should use cache
    const result2 = await dedupedFetch('test-key', fetcher, { cacheTTL: 5000 })

    expect(result1).toBe('result')
    expect(result2).toBe('result')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('should bypass cache with forceRefresh', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce('result1')
      .mockResolvedValueOnce('result2')

    // First call
    await dedupedFetch('test-key', fetcher, { cacheTTL: 5000 })
    
    // Second call with forceRefresh
    const result = await dedupedFetch('test-key', fetcher, {
      cacheTTL: 5000,
      forceRefresh: true
    })

    expect(result).toBe('result2')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('should handle errors correctly', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('Fetch failed'))

    await expect(
      dedupedFetch('test-key', fetcher)
    ).rejects.toThrow('Fetch failed')

    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})

describe('createManagedFetch', () => {
  beforeEach(() => {
    clearRequestCache()
    vi.clearAllMocks()
  })

  it('should create a managed fetch instance', () => {
    const manager = createManagedFetch('test-component')

    expect(manager).toHaveProperty('fetch')
    expect(manager).toHaveProperty('cancelAll')
    expect(manager).toHaveProperty('cancel')
  })

  it('should cancel all requests', async () => {
    const manager = createManagedFetch('test-component')

    // Mock fetch
    global.fetch = vi.fn().mockImplementation(() => 
      new Promise((resolve) => setTimeout(resolve, 1000))
    )

    // Start a request
    const promise = manager.fetch('https://example.com/api')

    // Cancel all
    manager.cancelAll()

    // Request should be aborted
    await expect(promise).rejects.toThrow()
  })

  it('should cancel specific request', async () => {
    const manager = createManagedFetch('test-component')

    // Mock fetch
    global.fetch = vi.fn().mockImplementation(() => 
      new Promise((resolve) => setTimeout(resolve, 1000))
    )

    // Start a request with a key
    const promise = manager.fetch('https://example.com/api', {
      key: 'test-request'
    })

    // Cancel specific request
    manager.cancel('test-request')

    // Request should be aborted
    await expect(promise).rejects.toThrow()
  })
})

describe('Cache Management', () => {
  beforeEach(() => {
    clearRequestCache()
  })

  it('should clear cache entry', async () => {
    const fetcher = vi.fn().mockResolvedValue('result')

    // Add to cache
    await dedupedFetch('test-key', fetcher, { cacheTTL: 5000 })

    // Clear specific entry
    clearCacheEntry('test-key')

    // Should fetch again
    await dedupedFetch('test-key', fetcher, { cacheTTL: 5000 })

    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('should get cache stats', async () => {
    const fetcher = vi.fn().mockResolvedValue('result')

    // Add some entries
    await dedupedFetch('key1', fetcher, { cacheTTL: 5000 })
    await dedupedFetch('key2', fetcher, { cacheTTL: 5000 })

    const stats = getCacheStats()

    expect(stats.total).toBeGreaterThanOrEqual(2)
    expect(stats.valid).toBeGreaterThanOrEqual(2)
  })

  it('should cleanup expired cache entries', async () => {
    const fetcher = vi.fn().mockResolvedValue('result')

    // Add entry with very short TTL
    await dedupedFetch('test-key', fetcher, { cacheTTL: 1 })

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 10))

    // Cleanup
    const cleaned = cleanupExpiredCache()

    expect(cleaned).toBeGreaterThanOrEqual(1)
  })
})

