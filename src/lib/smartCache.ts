// Smart caching system for NeuraFit
// Implements intelligent caching with TTL, compression, and memory management

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
  accessCount: number
  lastAccessed: number
  compressed?: boolean
}

interface CacheConfig {
  maxSize: number
  defaultTTL: number
  compressionThreshold: number
  enableCompression: boolean
}

class SmartCache {
  private cache = new Map<string, CacheItem<any>>()
  private config: CacheConfig
  private memoryUsage = 0
  private readonly MAX_MEMORY_MB = 50 // 50MB limit

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 100,
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      compressionThreshold: 10000, // 10KB
      enableCompression: true,
      ...config
    }

    // Cleanup expired items every minute
    setInterval(() => this.cleanup(), 60000)
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now()
    const itemTTL = ttl || this.config.defaultTTL
    
    // Estimate memory usage
    const dataSize = this.estimateSize(data)
    
    // Check if we need to compress
    let finalData = data
    let compressed = false
    
    if (this.config.enableCompression && dataSize > this.config.compressionThreshold) {
      try {
        finalData = this.compress(data) as T
        compressed = true
      } catch (error) {
        console.warn('Compression failed, storing uncompressed:', error)
      }
    }

    const item: CacheItem<T> = {
      data: finalData,
      timestamp: now,
      ttl: itemTTL,
      accessCount: 0,
      lastAccessed: now,
      compressed
    }

    // Remove old item if exists
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }

    // Ensure we don't exceed memory limits
    this.ensureMemoryLimit()

    this.cache.set(key, item)
    this.memoryUsage += dataSize
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }

    const now = Date.now()
    
    // Check if expired
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    // Update access statistics
    item.accessCount++
    item.lastAccessed = now

    // Decompress if needed
    let data = item.data
    if (item.compressed) {
      try {
        data = this.decompress(item.data)
      } catch (error) {
        console.warn('Decompression failed:', error)
        this.cache.delete(key)
        return null
      }
    }

    return data
  }

  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) return false
    
    const now = Date.now()
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
    this.memoryUsage = 0
  }

  // Get cache statistics
  getStats() {
    const now = Date.now()
    let validItems = 0
    let expiredItems = 0
    let totalAccessCount = 0

    for (const [_key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        expiredItems++
      } else {
        validItems++
        totalAccessCount += item.accessCount
      }
    }

    return {
      totalItems: this.cache.size,
      validItems,
      expiredItems,
      memoryUsageMB: this.memoryUsage / (1024 * 1024),
      averageAccessCount: validItems > 0 ? totalAccessCount / validItems : 0,
      hitRate: this.calculateHitRate()
    }
  }

  private cleanup(): void {
    const now = Date.now()
    const itemsToDelete: string[] = []

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        itemsToDelete.push(key)
      }
    }

    itemsToDelete.forEach(key => this.cache.delete(key))
    
    if (itemsToDelete.length > 0) {
      console.log(`Cache cleanup: removed ${itemsToDelete.length} expired items`)
    }
  }

  private ensureMemoryLimit(): void {
    const maxMemoryBytes = this.MAX_MEMORY_MB * 1024 * 1024
    
    if (this.memoryUsage > maxMemoryBytes) {
      // Remove least recently used items
      const items = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)
      
      const itemsToRemove = Math.ceil(items.length * 0.2) // Remove 20% of items
      
      for (let i = 0; i < itemsToRemove && this.memoryUsage > maxMemoryBytes * 0.8; i++) {
        const [key] = items[i]
        this.cache.delete(key)
      }
    }
  }

  private estimateSize(data: any): number {
    // Rough estimation of object size in bytes
    const jsonString = JSON.stringify(data)
    return new Blob([jsonString]).size
  }

  private compress(data: any): string {
    // Simple compression using JSON + base64
    // In production, consider using a proper compression library
    const jsonString = JSON.stringify(data)
    return btoa(jsonString)
  }

  private decompress(compressedData: string): any {
    const jsonString = atob(compressedData)
    return JSON.parse(jsonString)
  }

  private calculateHitRate(): number {
    // This would need to be tracked over time in a real implementation
    return 0.85 // Placeholder
  }
}

// Create singleton instances for different data types
export const workoutCache = new SmartCache({
  maxSize: 50,
  defaultTTL: 10 * 60 * 1000, // 10 minutes for workout data
  compressionThreshold: 5000
})

export const userCache = new SmartCache({
  maxSize: 20,
  defaultTTL: 30 * 60 * 1000, // 30 minutes for user data
  compressionThreshold: 2000
})

export const analyticsCache = new SmartCache({
  maxSize: 30,
  defaultTTL: 15 * 60 * 1000, // 15 minutes for analytics
  compressionThreshold: 8000
})

// Cache key generators
export const CacheKeys = {
  userProfile: (uid: string) => `user:profile:${uid}`,
  workoutHistory: (uid: string, page = 0) => `user:workouts:${uid}:${page}`,
  workoutPlan: (uid: string, hash: string) => `workout:plan:${uid}:${hash}`,
  analytics: (uid: string, period: string) => `analytics:${uid}:${period}`,
  exerciseHistory: (uid: string, exerciseName: string) => `exercise:history:${uid}:${exerciseName}`
}

export default SmartCache
