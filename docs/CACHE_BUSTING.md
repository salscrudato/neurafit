# Cache Busting & Version Management

## Overview

NeuraFit implements a **multi-layer, robust cache busting strategy** to ensure seamless updates for existing users without screen errors or stale content. This document explains how the system works and how to maintain it.

## Architecture

### 1. **Version Detection Layer** (`src/lib/cache-manager.ts`)

Automatically detects version mismatches and triggers cache clearing:

- **App Version**: Tracked via `package.json` version injected into `index.html`
- **Manifest ETag**: Monitors `manifest.json` changes via HTTP headers
- **Periodic Checks**: Runs every 5 minutes to detect version changes
- **Automatic Recovery**: Clears all caches when version mismatch detected

```typescript
// Automatically initialized in src/main.tsx
initCacheManager();
```

### 2. **Service Worker Cache Invalidation**

Multiple strategies ensure SW caches are invalidated:

#### Cache ID with Timestamp
```javascript
// scripts/build-sw.js
cacheId: `neurafit-v${version}-${Date.now()}`
```
- Includes version + timestamp for aggressive invalidation
- Old caches are automatically abandoned when new SW registers

#### Aggressive Update Checks
```typescript
// src/main.tsx
// Check every 2 minutes (was 10 minutes)
setInterval(() => registration.update(), 120000);

// Also check when user returns to tab
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) registration.update();
});
```

### 3. **Manifest Version Tracking**

The `manifest.json` includes version metadata:

```json
{
  "version": "1.0.17",
  "build_time": "2025-10-16T12:00:00.000Z",
  "cache_version": "v1.0.17-1729100400000"
}
```

Updated automatically during build via `scripts/update-manifest-version.js`

### 4. **Cache Recovery UI** (`src/components/CacheRecoveryBanner.tsx`)

Non-intrusive banner that appears when cache errors are detected:

- Monitors for cache-related errors
- Offers one-click cache clearing
- Automatically reloads app after clearing
- Dismissible if user prefers to continue

## Build Process

### Pre-Build
```bash
npm run update:manifest  # Updates manifest.json with current version
```

### Build
```bash
npm run build
# Runs:
# 1. TypeScript compilation
# 2. Vite build (with versioned assets)
# 3. Service worker generation (with timestamp cache ID)
# 4. Bundle size check
```

### Key Build Features

1. **Asset Versioning**: All JS/CSS files include content hash
   ```
   assets/main-[hash].js
   assets/vendor-react-[hash].js
   ```

2. **Service Worker**: Generated with Workbox
   - Precaches app shell
   - Cache-first for static assets
   - Stale-while-revalidate for APIs
   - Network-first for HTML

3. **HTTP Headers** (Firebase): Configured in `firebase.json`
   ```
   index.html: no-cache, no-store, must-revalidate
   sw.js: no-cache, no-store, must-revalidate
   manifest.json: public, max-age=86400
   Assets: public, max-age=31536000, immutable
   ```

## How It Works: User Update Flow

### Scenario: User has v1.0.16, new v1.0.17 deployed

1. **User opens app** (still on v1.0.16)
   - Cache manager initializes
   - Detects version in `index.html` (v1.0.17)
   - Compares with stored version (v1.0.16)
   - **Version mismatch detected!**

2. **Automatic Recovery**
   - Clears all caches
   - Unregisters old service workers
   - Clears localStorage/sessionStorage/IndexedDB
   - Stores new version
   - Page reloads

3. **Fresh App Load**
   - Service worker registers with new cache ID
   - All assets fetched fresh
   - User sees latest version seamlessly

### Scenario: User has app open, new version deployed

1. **Service Worker Update Check**
   - Runs every 2 minutes
   - Also checks when user returns to tab
   - Detects new SW available

2. **Update Toast Notification**
   - Shows "Update Available" banner
   - User clicks "Refresh"
   - Page reloads with new version

3. **Cache Manager Validates**
   - Confirms version match
   - Clears old caches if needed
   - App loads fresh content

## Storage Keys

Cache manager uses these localStorage keys:

```typescript
STORAGE_KEYS = {
  CURRENT_VERSION: 'app-version',           // Current app version
  MANIFEST_ETAG: 'manifest-etag',           // Manifest HTTP ETag
  LAST_SW_CHECK: 'last-sw-check',           // Last SW update check
  CACHE_CLEARED: 'cache-cleared-at',        // Last cache clear timestamp
}
```

## Debugging

### Check Current Version Info

```typescript
import { getVersionInfo } from '@/lib/cache-manager';

console.log(getVersionInfo());
// Output:
// {
//   appVersion: "1.0.17",
//   buildTime: "2025-10-16T12:00:00.000Z",
//   manifestETag: "abc123def456"
// }
```

### Manual Cache Clear

Users can visit `/clear-cache.html` for manual cache clearing:
- Unregisters all service workers
- Clears all caches
- Clears all storage
- Clears IndexedDB
- Reloads app

### Browser DevTools

1. **Application Tab**
   - Service Workers: Check registration status
   - Cache Storage: View all caches
   - Local Storage: Check version keys

2. **Network Tab**
   - Check `index.html` headers (should be no-cache)
   - Check `sw.js` headers (should be no-cache)
   - Verify assets have content hashes

## Best Practices

1. **Always increment version** in `package.json` before deploying
2. **Run full build** (`npm run build`) to update manifest and SW
3. **Monitor errors** in Sentry for cache-related issues
4. **Test locally** with `npm run preview` to verify SW behavior
5. **Check Firebase headers** after deployment

## Troubleshooting

### Users still seeing old version

1. Check if `package.json` version was incremented
2. Verify `npm run build` was run (updates manifest)
3. Check Firebase deployment completed
4. Verify HTTP headers in Firebase console

### Cache errors appearing

1. Check browser console for specific error
2. User can visit `/clear-cache.html`
3. Cache recovery banner should appear automatically
4. Check Sentry for error patterns

### Service worker not updating

1. Check `sw.js` HTTP headers (must be no-cache)
2. Verify new SW has different cache ID
3. Check browser DevTools > Application > Service Workers
4. Try manual cache clear at `/clear-cache.html`

## Future Improvements

- [ ] Add analytics tracking for cache clears
- [ ] Implement gradual rollout with feature flags
- [ ] Add A/B testing for update strategies
- [ ] Create admin dashboard for cache monitoring
- [ ] Implement differential updates (only changed assets)

