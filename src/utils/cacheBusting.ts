// Aggressive Cache Busting Utilities
// Ensures all requests bypass cache and get fresh content

interface CacheBustingOptions {
  enableQueryParams: boolean
  enableHeaders: boolean
  enableServiceWorkerUpdates: boolean
  updateInterval: number
}

class CacheBustingManager {
  private static instance: CacheBustingManager
  private options: CacheBustingOptions
  private updateTimer: number | null = null
  private deploymentId: string

  private constructor(options: Partial<CacheBustingOptions> = {}) {
    this.options = {
      enableQueryParams: process.env.NODE_ENV === 'production',
      enableHeaders: process.env.NODE_ENV === 'production',
      enableServiceWorkerUpdates: process.env.NODE_ENV === 'production',
      updateInterval: 300000, // 5 minutes - much less aggressive
      ...options
    }

    this.deploymentId = this.generateDeploymentId()

    // Only start periodic updates in production
    if (process.env.NODE_ENV === 'production') {
      this.startPeriodicUpdates()
    }
  }

  static getInstance(options?: Partial<CacheBustingOptions>): CacheBustingManager {
    if (!CacheBustingManager.instance) {
      CacheBustingManager.instance = new CacheBustingManager(options)
    }
    return CacheBustingManager.instance
  }

  private generateDeploymentId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2)
    return `${timestamp}-${random}`
  }

  // Add cache busting parameters to any URL
  bustUrl(url: string): string {
    if (!this.options.enableQueryParams) return url

    const urlObj = new URL(url, window.location.origin)
    const timestamp = Date.now()
    
    // Add multiple cache busting parameters
    urlObj.searchParams.set('v', this.deploymentId)
    urlObj.searchParams.set('t', timestamp.toString())
    urlObj.searchParams.set('cb', Math.random().toString(36).substring(2))
    
    return urlObj.toString()
  }

  // Get cache busting headers
  getCacheBustingHeaders(): Record<string, string> {
    if (!this.options.enableHeaders) return {}

    return {
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Deployment-Id': this.deploymentId,
      'X-Cache-Bust': Date.now().toString()
    }
  }

  // Enhanced fetch with aggressive cache busting
  async fetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url
    const bustedUrl = this.bustUrl(url)
    
    const headers = {
      ...this.getCacheBustingHeaders(),
      ...(init?.headers || {})
    }

    const requestInit: RequestInit = {
      ...init,
      headers,
      cache: 'no-cache'
    }

    try {
      const response = await fetch(bustedUrl, requestInit)
      
      // If this is an HTML response, check for version changes
      if (response.headers.get('content-type')?.includes('text/html')) {
        this.checkResponseForUpdates(response.clone())
      }
      
      return response
    } catch (error) {
      console.warn('Cache-busted fetch failed:', error)
      throw error
    }
  }

  // Check response for version updates
  private async checkResponseForUpdates(response: Response): Promise<void> {
    try {
      const html = await response.text()
      const buildTimeMatch = html.match(/data-build-time="([^"]+)"/)
      const versionMatch = html.match(/data-version="([^"]+)"/)
      
      if (buildTimeMatch || versionMatch) {
        const newVersion = buildTimeMatch?.[1] || versionMatch?.[1]
        const storedVersion = localStorage.getItem('current-deployment-version')
        
        if (storedVersion && storedVersion !== newVersion) {
          console.log('🚀 Version change detected, triggering update...')
          this.triggerUpdate()
        }
        
        localStorage.setItem('current-deployment-version', newVersion || '')
      }
    } catch (error) {
      console.debug('Version check failed:', error)
    }
  }

  // Start periodic update checking (production only)
  private startPeriodicUpdates(): void {
    if (process.env.NODE_ENV !== 'production') {
      return // Skip in development
    }

    if (this.updateTimer) {
      clearInterval(this.updateTimer)
    }

    this.updateTimer = window.setInterval(() => {
      this.checkForUpdates()
    }, this.options.updateInterval)

    // Also check when page becomes visible (throttled)
    let lastVisibilityCheck = 0
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && Date.now() - lastVisibilityCheck > 60000) { // Max once per minute
        lastVisibilityCheck = Date.now()
        this.checkForUpdates()
      }
    })

    // Check when online status changes (throttled)
    let lastOnlineCheck = 0
    window.addEventListener('online', () => {
      if (Date.now() - lastOnlineCheck > 30000) { // Max once per 30 seconds
        lastOnlineCheck = Date.now()
        this.checkForUpdates()
      }
    })
  }

  // Check for updates by fetching index.html
  private async checkForUpdates(): Promise<void> {
    try {
      const response = await this.fetch('/', { method: 'HEAD' })
      
      if (response.ok) {
        // Check ETag or Last-Modified headers
        const etag = response.headers.get('etag')
        const lastModified = response.headers.get('last-modified')
        
        const storedEtag = localStorage.getItem('page-etag')
        const storedLastModified = localStorage.getItem('page-last-modified')
        
        if ((etag && etag !== storedEtag) || 
            (lastModified && lastModified !== storedLastModified)) {
          console.log('🚀 Page headers changed, triggering update...')
          this.triggerUpdate()
        }
        
        if (etag) localStorage.setItem('page-etag', etag)
        if (lastModified) localStorage.setItem('page-last-modified', lastModified)
      }
    } catch (error) {
      console.debug('Update check failed:', error)
    }
  }

  // Trigger update process
  private triggerUpdate(): void {
    // Clear all caches
    this.clearAllCaches()
    
    // Update service worker
    if (this.options.enableServiceWorkerUpdates) {
      this.updateServiceWorker()
    }
    
    // Dispatch update event
    window.dispatchEvent(new CustomEvent('cacheUpdate', {
      detail: {
        deploymentId: this.deploymentId,
        timestamp: Date.now()
      }
    }))
    
    // Only auto-reload in production, and with user confirmation
    if (process.env.NODE_ENV === 'production') {
      setTimeout(() => {
        if (confirm('A new version is available. Reload to update?')) {
          console.log('🔄 User confirmed reload due to cache update...')
          window.location.reload()
        }
      }, 2000)
    } else {
      console.log('🔄 Cache update detected (development mode - no auto-reload)')
    }
  }

  // Clear all browser caches
  private async clearAllCaches(): Promise<void> {
    try {
      // Clear Cache API
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
        console.log('🧹 Cleared all cache storage')
      }

      // Clear localStorage (except user preferences)
      const preserveKeys = ['user-preferences', 'workout-drafts', 'auth-tokens']
      const keysToRemove: string[] = []
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && !preserveKeys.some(preserve => key.includes(preserve))) {
          keysToRemove.push(key)
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
      // Clear sessionStorage
      sessionStorage.clear()
      
      console.log('🧹 Cleared browser storage')
    } catch (error) {
      console.warn('Cache clearing failed:', error)
    }
  }

  // Update service worker
  private async updateServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) return

    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await registration.update()
        
        if (registration.waiting) {
          try {
            const { sendSkipWaitingMessage } = await import('./service-worker-messaging')
            sendSkipWaitingMessage()
          } catch (error) {
            console.warn('Failed to send skip waiting message:', error)
            // Fallback to direct message
            registration.waiting.postMessage({ type: 'SKIP_WAITING' })
          }
        }
      }
    } catch (error) {
      console.warn('Service worker update failed:', error)
    }
  }

  // Stop periodic updates
  destroy(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
      this.updateTimer = null
    }
  }

  // Get current deployment info
  getDeploymentInfo(): { id: string; timestamp: number } {
    return {
      id: this.deploymentId,
      timestamp: Date.now()
    }
  }
}

// Export singleton instance
export const cacheBustingManager = CacheBustingManager.getInstance()

// Enhanced fetch function with automatic cache busting
export const cacheBustedFetch = (input: string | URL | Request, init?: RequestInit) => {
  return cacheBustingManager.fetch(input, init)
}

// Utility to add cache busting to any URL
export const bustUrl = (url: string): string => {
  return cacheBustingManager.bustUrl(url)
}

// Utility to get cache busting headers
export const getCacheBustingHeaders = (): Record<string, string> => {
  return cacheBustingManager.getCacheBustingHeaders()
}
