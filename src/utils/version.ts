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

  // Check for updates by fetching a version endpoint
  async checkForUpdates(): Promise<boolean> {
    try {
      // Try to fetch the current index.html to see if it has changed
      const response = await fetch('/index.html', {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      
      if (response.ok) {
        const html = await response.text()
        
        // Look for build time or version in the HTML
        const buildTimeMatch = html.match(/data-build-time="([^"]+)"/)
        const versionMatch = html.match(/data-version="([^"]+)"/)
        
        if (buildTimeMatch && buildTimeMatch[1] !== this.buildTime) {
          console.log('New version detected:', {
            current: this.buildTime,
            new: buildTimeMatch[1]
          })
          return true
        }
        
        if (versionMatch && versionMatch[1] !== this.currentVersion) {
          console.log('New version detected:', {
            current: this.currentVersion,
            new: versionMatch[1]
          })
          return true
        }
      }
    } catch (error) {
      console.warn('Version check failed:', error)
    }
    
    return false
  }

  // Start periodic version checking
  startVersionChecking(intervalMs: number = 60000): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }

    this.checkInterval = window.setInterval(async () => {
      const hasUpdate = await this.checkForUpdates()
      if (hasUpdate) {
        this.notifyUpdateAvailable()
      }
    }, intervalMs)
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
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' })
    }
  }

  // Force reload with cache bypass
  forceReload(): void {
    // Clear all caches first
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name))
      })
    }

    // Clear localStorage version info
    localStorage.removeItem('app-version')
    localStorage.removeItem('app-build-time')

    // Force reload with cache bypass
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
