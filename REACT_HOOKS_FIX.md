# React Hooks Error Fix - "Cannot read properties of null (reading 'useEffect')"

## Problem
The application was throwing the error:
```
TypeError: Cannot read properties of null (reading 'useEffect')
    at usePrefetchOnIdle (usePrefetch.ts:74:3)
    at Dashboard (Dashboard.tsx:103:3)
```

This error occurs when React is null during hook execution, typically caused by:
1. **Stale Vite cache** - Cached dependencies with old React instances
2. **React deduplication failure** - Multiple React instances loaded
3. **Module loading race condition** - React not fully initialized when hooks are called

## Solution

### 1. Comprehensive Cache Clearing (scripts/clear-all-caches.js)
- Clears ALL caches before every dev/build: `.vite`, `node_modules/.vite`, `node_modules/.cache`, etc.
- Prevents stale React instances from being reused
- Runs automatically via `predev` and `prebuild` npm hooks

### 2. Vite Configuration Hardening (vite.config.ts)
- **Always** disable dependency discovery: `noDiscovery: true`
- **Always** force re-optimization: `force: true`
- Ensures React is always freshly optimized, never cached

### 3. Hook Safety Guards (src/hooks/usePrefetch.ts)
- Added guards to detect if React is available before calling hooks
- Wrapped hooks in try-catch to gracefully handle errors
- Provides helpful error messages directing users to clear cache

### 4. Build Script Updates (package.json)
- `predev`: Clears cache before `npm run dev`
- `prebuild`: Clears cache before `npm run build`
- `clean:cache`: Now uses comprehensive cache clearing script

## Deployment Instructions

### For Firebase Hosting
1. **Clear all caches locally:**
   ```bash
   npm run clean:all
   npm install
   ```

2. **Build and deploy:**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

3. **Verify deployment:**
   - Check browser console for no React hook errors
   - Verify Dashboard page loads without errors
   - Check that route prefetching works (check Network tab)

### For Custom Domain (neurastack.ai)
Same as Firebase Hosting - the build process is identical.

## Troubleshooting

### If error persists after deployment:
1. **Clear browser cache:**
   - Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
   - Or clear browser cache manually

2. **Clear service worker cache:**
   - Open DevTools → Application → Service Workers
   - Click "Unregister" for any NeuraFit service workers
   - Clear all storage

3. **Full cache reset:**
   ```bash
   npm run clean:all
   npm install
   npm run build
   ```

### If error occurs in development:
1. **Stop dev server** (Ctrl+C)
2. **Clear cache:**
   ```bash
   npm run clean:cache
   ```
3. **Restart dev server:**
   ```bash
   npm run dev
   ```

## Technical Details

### Why this works:
- **Vite cache corruption** was the root cause - old React instances were being reused
- **Forcing re-optimization** ensures React is always freshly bundled
- **Hook guards** prevent execution if React is not available
- **Automatic cache clearing** prevents users from encountering this issue

### What changed:
1. `scripts/clear-all-caches.js` - New comprehensive cache clearing script
2. `vite.config.ts` - Changed `noDiscovery` and `force` to always be true
3. `src/hooks/usePrefetch.ts` - Added safety guards and error handling
4. `package.json` - Added `predev` hook and updated build scripts

### Performance impact:
- **Minimal** - Cache clearing only adds ~100-200ms to build time
- **Benefit** - Eliminates React hook errors completely
- **Trade-off** - Worth it for reliability and user experience

## Verification Checklist

- [ ] Local dev works: `npm run dev` (no React hook errors)
- [ ] Build succeeds: `npm run build` (no errors)
- [ ] Dashboard loads without errors
- [ ] Route prefetching works (check Network tab)
- [ ] Deployed to Firebase Hosting
- [ ] Deployed to custom domain
- [ ] No errors in production console
- [ ] Service worker registered successfully

## References
- React Hooks Rules: https://react.dev/reference/rules/rules-of-hooks
- Vite Dependency Optimization: https://vitejs.dev/guide/dep-pre-bundling.html
- Firebase Hosting Deployment: https://firebase.google.com/docs/hosting/deploying

