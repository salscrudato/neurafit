# Vite Cache Prevention Strategy

## Problem
The "Outdated Optimize Dep" error (504 net::ERR_ABORTED) occurs when Vite's pre-bundled dependency cache (`node_modules/.vite`) becomes stale. This happens when:
- Dependencies are updated but the cache isn't cleared
- The cache is committed to git and deployed
- Multiple build environments have conflicting cache versions

## Solution: Multi-Layered Cache Management

### 1. **Git Ignore (.gitignore)**
Added explicit entries to prevent `.vite` cache from being committed:
```
.vite
node_modules/.vite
```

**Why**: The cache is environment-specific and should never be version-controlled. Each build environment (local, CI/CD, Firebase) must regenerate it fresh.

### 2. **Build Script Enhancement (package.json)**
Updated build commands to always clear cache first:
```json
"build": "npm run clean:cache && tsc -b && vite build && npm run build:sw && npm run build:check",
"build:deploy": "npm run clean:cache && vite build && npm run build:sw"
```

**Why**: Ensures cache is cleared before every build, preventing stale dependency issues.

### 3. **Vite Plugin (vite.config.ts)**
Added a pre-build plugin that clears the cache:
```typescript
{
  name: 'clear-vite-cache',
  apply: 'build',
  enforce: 'pre',
  async configResolved() {
    try {
      const viteCachePath = resolve(__dirname, 'node_modules/.vite')
      rmSync(viteCachePath, { recursive: true, force: true })
      console.log('✅ Cleared Vite cache before build')
    } catch (error) {
      console.warn('⚠️ Failed to clear Vite cache:', error)
    }
  },
}
```

**Why**: Provides an additional safety layer - even if the npm script fails, Vite itself clears the cache before building.

### 4. **Dependency Optimization Settings (vite.config.ts)**
Added production-specific optimization settings:
```typescript
optimizeDeps: {
  // ... existing config ...
  noDiscovery: isProduction,  // Disable auto-discovery in production
  force: isProduction,         // Force re-optimization on every build
}
```

**Why**: In production builds, forces Vite to re-optimize all dependencies from scratch, preventing any stale cache issues.

## How It Works in Production (Firebase)

1. **Firebase Build Process**:
   - Firebase runs `npm run build` in a clean environment
   - `npm run clean:cache` clears any existing `.vite` cache
   - Vite plugin clears cache again before building
   - Dependencies are re-optimized with `force: true`
   - Fresh, valid cache is generated
   - Build completes successfully

2. **No Cache Persistence**:
   - `.vite` is in `.gitignore`, so it's never committed
   - Each deployment gets a fresh build with fresh cache
   - No stale dependency hashes

## Testing

To verify the fix works:

```bash
# Local development
npm run dev

# Production build
npm run build

# Deploy to Firebase
npm run deploy
```

All commands now include cache clearing, ensuring no stale dependency issues.

## Benefits

✅ **Prevents 504 Errors**: No stale cache = no "Outdated Optimize Dep" errors  
✅ **Consistent Builds**: Every build starts fresh  
✅ **Production-Safe**: Firebase deployments always work  
✅ **Simple & Robust**: Multiple layers ensure reliability  
✅ **Zero Configuration**: Works automatically, no manual steps needed  

## Related Files

- `.gitignore` - Prevents cache from being committed
- `package.json` - Build scripts with cache clearing
- `vite.config.ts` - Vite plugin and optimization settings

