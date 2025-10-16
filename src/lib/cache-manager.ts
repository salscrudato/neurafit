/**
 * Cache Manager - Robust Cache Busting & Version Management
 * 
 * Handles:
 * - Version detection and mismatch handling
 * - Manifest validation and ETag tracking
 * - Aggressive cache invalidation
 * - Service worker update detection
 * - Automatic cache clearing on version mismatch
 */

const STORAGE_KEYS = {
  CURRENT_VERSION: 'app-version',
  MANIFEST_ETAG: 'manifest-etag',
  LAST_SW_CHECK: 'last-sw-check',
  CACHE_CLEARED: 'cache-cleared-at',
} as const;

const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const SW_CHECK_INTERVAL = 2 * 60 * 1000; // 2 minutes

interface VersionInfo {
  appVersion: string;
  buildTime: string;
  manifestETag?: string;
}

/**
 * Get current app version from HTML root element
 */
export function getCurrentAppVersion(): string {
  const root = document.getElementById('root');
  return root?.getAttribute('data-version') || 'unknown';
}

/**
 * Get stored version from localStorage
 */
function getStoredVersion(): string | null {
  return localStorage.getItem(STORAGE_KEYS.CURRENT_VERSION);
}

/**
 * Store current version to localStorage
 */
function storeCurrentVersion(version: string): void {
  localStorage.setItem(STORAGE_KEYS.CURRENT_VERSION, version);
}

/**
 * Fetch manifest and get ETag
 */
async function getManifestETag(): Promise<string | null> {
  try {
    const response = await fetch('/manifest.json', { cache: 'no-store' });
    return response.headers.get('etag') || response.headers.get('last-modified');
  } catch (error) {
    console.error('Failed to fetch manifest ETag:', error);
    return null;
  }
}

/**
 * Check if manifest has changed
 */
async function hasManifestChanged(): Promise<boolean> {
  const currentETag = await getManifestETag();
  const storedETag = localStorage.getItem(STORAGE_KEYS.MANIFEST_ETAG);

  if (!currentETag) return false;
  if (!storedETag) {
    localStorage.setItem(STORAGE_KEYS.MANIFEST_ETAG, currentETag);
    return false;
  }

  return currentETag !== storedETag;
}

/**
 * Update stored manifest ETag
 */
async function updateManifestETag(): Promise<void> {
  const eTag = await getManifestETag();
  if (eTag) {
    localStorage.setItem(STORAGE_KEYS.MANIFEST_ETAG, eTag);
  }
}

/**
 * Clear all caches and storage
 */
export async function clearAllCaches(): Promise<void> {
  try {
    // Unregister service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }

    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
      }
    }

    // Clear storage
    localStorage.clear();
    sessionStorage.clear();

    // Clear IndexedDB
    if ('indexedDB' in window) {
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      }
    }

    localStorage.setItem(STORAGE_KEYS.CACHE_CLEARED, new Date().toISOString());
  } catch (error) {
    console.error('Error clearing caches:', error);
  }
}

/**
 * Check for version mismatch and handle cache clearing
 */
export async function checkVersionMismatch(): Promise<boolean> {
  const currentVersion = getCurrentAppVersion();
  const storedVersion = getStoredVersion();

  if (!storedVersion) {
    // First visit
    storeCurrentVersion(currentVersion);
    await updateManifestETag();
    return false;
  }

  if (currentVersion !== storedVersion) {
    console.warn(
      `🔄 Version mismatch detected: ${storedVersion} → ${currentVersion}. Clearing cache...`
    );
    await clearAllCaches();
    storeCurrentVersion(currentVersion);
    await updateManifestETag();
    return true;
  }

  // Check manifest changes even if version is same
  if (await hasManifestChanged()) {
    console.warn('📦 Manifest changed detected. Clearing cache...');
    await clearAllCaches();
    await updateManifestETag();
    return true;
  }

  return false;
}

/**
 * Initialize cache manager with periodic checks
 */
export function initCacheManager(): void {
  // Initial check
  checkVersionMismatch().catch((error) => {
    console.error('Cache version check failed:', error);
  });

  // Periodic version checks
  setInterval(() => {
    checkVersionMismatch().catch((error) => {
      console.error('Periodic cache version check failed:', error);
    });
  }, CHECK_INTERVAL);

  // Aggressive service worker update checks
  if ('serviceWorker' in navigator) {
    setInterval(() => {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.update().catch((error) => {
            console.error('SW update check failed:', error);
          });
        }
      });
    }, SW_CHECK_INTERVAL);
  }
}

/**
 * Get version info for debugging
 */
export function getVersionInfo(): VersionInfo {
  return {
    appVersion: getCurrentAppVersion(),
    buildTime: document.getElementById('root')?.getAttribute('data-build-time') || 'unknown',
    manifestETag: localStorage.getItem(STORAGE_KEYS.MANIFEST_ETAG) || undefined,
  };
}

