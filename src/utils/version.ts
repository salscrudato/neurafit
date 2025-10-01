// Version management utilities for instant updates

export interface VersionInfo {
  version: string
  buildTime: string
  isLatest: boolean
}

export class VersionManager {
  private static instance: VersionManager
  private currentVersion: string
  private buildTime: string
  private checkInterval: number | null = null

  private constructor() {
    this.currentVersion = __APP_VERSION__
    this.buildTime = __BUILD_TIME__
  }

  static getInstance(): VersionManager {
    if (!VersionManager.instance) {
      VersionManager.instance = new VersionManager()
    }
    return VersionManager.instance
  }

  getCurrentVersion(): VersionInfo {
    return {
      version: this.currentVersion,
      buildTime: this.buildTime,
      isLatest: true // Will be updated by version checks
    }
  }

  // Aggressive update checking with multiple strategies
  async checkForUpdates(): Promise<boolean> {
    try {
      // Strategy 1: Check HTML with cache busting
      const cacheBuster = Date.now()
      const htmlResponse = await fetch(`/?v=${cacheBuster}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })

      if (htmlResponse.ok) {
        const html = await htmlResponse.text()

        // Look for build time or version in the HTML
        const buildTimeMatch = html.match(/data-build-time="([^"]+)"/)
        const versionMatch = html.match(/data-version="([^"]+)"/)

        if (buildTimeMatch && buildTimeMatch[1] !== this.buildTime) {
          console.log('🚀 New version detected via HTML:', {
            current: this.buildTime,
            new: buildTimeMatch[1]
          })
          return true
        }

        if (versionMatch && versionMatch[1] !== this.currentVersion) {
          console.log('🚀 New version detected via HTML:', {
            current: this.currentVersion,
            new: versionMatch[1]
          })
          return true
        }
      }

      // Strategy 2: Check manifest.json for version changes
      try {
        const manifestResponse = await fetch(`/manifest.json?v=${cacheBuster}`, {
          cache: 'no-cache'
        })

        if (manifestResponse.ok) {
          const manifest = await manifestResponse.json()
          const storedManifestVersion = localStorage.getItem('manifest-version')

          if (manifest.version && manifest.version !== storedManifestVersion) {
            console.log('🚀 New version detected via manifest:', manifest.version)
            localStorage.setItem('manifest-version', manifest.version)
            return true
          }
        }
      } catch (manifestError) {
        // Manifest check is optional
        console.debug('Manifest check skipped:', manifestError)
      }

      // Strategy 3: Check service worker updates
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          await registration.update()

          if (registration.waiting) {
            console.log('🚀 New service worker detected!')
            return true
          }
        }
      }

    } catch (error) {
      console.warn('Version check failed:', error)
    }

    return false
  }

  // Start version checking (default 5 minutes)
  startVersionChecking(intervalMs: number = 300000): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }

    // Skip immediate check in development to prevent refresh loops
    if (process.env.NODE_ENV === 'production') {
      setTimeout(async () => {
        const hasUpdate = await this.checkForUpdates()
        if (hasUpdate) {
          this.notifyUpdateAvailable()
        }
      }, 10000) // Wait 10 seconds before first check
    }

    // Then check periodically (only in production)
    if (process.env.NODE_ENV === 'production') {
      this.checkInterval = window.setInterval(async () => {
        const hasUpdate = await this.checkForUpdates()
        if (hasUpdate) {
          this.notifyUpdateAvailable()
        }
      }, intervalMs)

      // Also check when page becomes visible again (but throttled)
      let lastVisibilityCheck = 0
      document.addEventListener('visibilitychange', async () => {
        if (!document.hidden && Date.now() - lastVisibilityCheck > 60000) { // Max once per minute
          lastVisibilityCheck = Date.now()
          const hasUpdate = await this.checkForUpdates()
          if (hasUpdate) {
            this.notifyUpdateAvailable()
          }
        }
      })
    }
  }

  // Stop version checking
  stopVersionChecking(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  // Notify about available updates
  private notifyUpdateAvailable(): void {
    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('versionUpdate', {
      detail: { hasUpdate: true }
    }))

    // Also trigger service worker update check
    this.triggerServiceWorkerUpdate()
  }

  // Helper method to trigger service worker update
  private async triggerServiceWorkerUpdate(): Promise<void> {
    try {
      const { sendCheckUpdateMessage } = await import('./service-worker-messaging')
      sendCheckUpdateMessage()
    } catch (error) {
      console.warn('Failed to trigger service worker update:', error)
    }
  }

  // Aggressive cache clearing and reload
  async forceReload(): Promise<void> {
    console.log('🧹 Starting aggressive cache clear and reload...')

    try {
      // Clear all cache storage
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
        console.log('🧹 Cleared all cache storage')
      }

      // Clear localStorage (keep only essential user data)
      const essentialKeys = ['neurafit_user_preferences', 'neurafit_workout_drafts']
      const keysToRemove: string[] = []

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && !essentialKeys.includes(key)) {
          keysToRemove.push(key)
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key))
      console.log('🧹 Cleared localStorage')

      // Clear sessionStorage
      sessionStorage.clear()
      console.log('🧹 Cleared sessionStorage')

      // Clear IndexedDB if present
      if ('indexedDB' in window) {
        try {
          const databases = await indexedDB.databases()
          await Promise.all(
            databases.map(db => {
              if (db.name?.includes('firebase') || db.name?.includes('neurafit')) {
                return new Promise<void>((resolve, reject) => {
                  const deleteReq = indexedDB.deleteDatabase(db.name!)
                  deleteReq.onsuccess = () => resolve()
                  deleteReq.onerror = () => reject(deleteReq.error)
                })
              }
            }).filter(Boolean)
          )
          console.log('🧹 Cleared IndexedDB')
        } catch (idbError) {
          console.warn('IndexedDB clear failed:', idbError)
        }
      }

      // Update service worker if present
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration?.waiting) {
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
      console.warn('Cache clearing failed:', error)
    }

    // Force hard reload
    console.log('🔄 Performing hard reload...')
    window.location.reload()
  }

  // Store version info in localStorage for comparison
  storeVersionInfo(): void {
    localStorage.setItem('app-version', this.currentVersion)
    localStorage.setItem('app-build-time', this.buildTime)
  }

  // Check if this is a fresh install or update
  isFirstRun(): boolean {
    const storedVersion = localStorage.getItem('app-version')
    const storedBuildTime = localStorage.getItem('app-build-time')
    
    return !storedVersion || storedVersion !== this.currentVersion || 
           !storedBuildTime || storedBuildTime !== this.buildTime
  }
}

// Export singleton instance
export const versionManager = VersionManager.getInstance()
