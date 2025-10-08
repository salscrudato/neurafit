# NeuraFit Deployment Guide

This guide explains how to deploy NeuraFit updates without caching issues.

## 🚀 Quick Deployment (Recommended)

For most updates, use the automated deployment script:

```bash
# 1. Bump version (automatically updates all version references)
npm run version:patch

# 2. Deploy (automatically clears caches and builds)
npm run deploy
```

That's it! The script handles everything automatically.

---

## 📋 Deployment Workflow

### Step 1: Version Bump

Always bump the version before deploying to ensure proper cache busting:

```bash
# For bug fixes and minor changes (1.0.0 -> 1.0.1)
npm run version:patch

# For new features (1.0.0 -> 1.1.0)
npm run version:minor

# For breaking changes (1.0.0 -> 2.0.0)
npm run version:major
```

**What this does:**
- Updates `package.json` version
- Updates `public/manifest.json` version and cache version
- Updates `index.html` version metadata
- Updates JSON-LD structured data

### Step 2: Review Changes

```bash
git diff
```

Make sure the version changes look correct.

### Step 3: Commit Version Bump

```bash
git add -A
git commit -m "chore: bump version to X.X.X"
```

### Step 4: Deploy

```bash
# Deploy hosting only (most common)
npm run deploy

# Deploy hosting + functions
npm run deploy:all

# Deploy functions only
npm run deploy:functions
```

**What the deploy script does:**
1. Clears all build caches (`dist`, `node_modules/.vite`, `.vite`)
2. Runs full build with TypeScript compilation
3. Builds service worker
4. Checks bundle size
5. Deploys to Firebase
6. Shows deployment URLs

---

## 🔧 Manual Deployment (Advanced)

If you need more control, you can run steps manually:

```bash
# 1. Clear caches
npm run clean:cache

# 2. Build
npm run build

# 3. Deploy
firebase deploy --only hosting
```

---

## 🎯 Cache Busting Strategy

NeuraFit uses multiple cache busting strategies to ensure users always get the latest version:

### 1. **Content-Based Hashing** ✅
- All JavaScript and CSS files include content hashes in filenames
- Example: `Generate-Dt_t7NFd.js` (hash changes when content changes)
- Configured in `vite.config.ts`

### 2. **Version Metadata** ✅
- Version number in `package.json`, `manifest.json`, and `index.html`
- Service worker cache version includes timestamp
- Automatic cache invalidation on version change

### 3. **Service Worker Updates** ✅
- Service worker automatically updates within 30 seconds
- Old caches are deleted on activation
- Users get notified of updates via `SW_UPDATED` message

### 4. **HTTP Headers** ✅
- `Cache-Control: no-cache` for `index.html` and `sw.js`
- `Cache-Control: immutable` for hashed assets
- Configured in `firebase.json`

### 5. **Pre-Build Cache Clearing** ✅
- `prebuild` script automatically clears Vite cache
- Ensures fresh build every time
- Prevents stale environment variables

---

## 🐛 Troubleshooting

### Issue: Users still see old version after deployment

**Solution 1: Hard Refresh**
- Chrome/Edge: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Firefox: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
- Safari: `Cmd+Option+R`

**Solution 2: Clear Site Data**
1. Open DevTools (F12)
2. Go to Application tab
3. Click "Clear storage" in left sidebar
4. Click "Clear site data" button

**Solution 3: Incognito/Private Mode**
- Test in incognito mode to verify deployment

### Issue: Build uses old environment variables

**Solution:**
```bash
# Clear all caches and rebuild
npm run clean:cache
npm run build
```

The `prebuild` script now does this automatically, but you can run it manually if needed.

### Issue: Service worker not updating

**Solution:**
1. Check service worker registration in DevTools → Application → Service Workers
2. Click "Unregister" to force re-registration
3. Refresh the page
4. New service worker should install automatically

### Issue: Firebase deployment shows old files

**Solution:**
```bash
# Clear Firebase hosting cache
firebase hosting:channel:delete preview

# Redeploy
npm run deploy
```

---

## 📊 Monitoring Deployments

### Check Current Version

Users can check their current version:
1. Open DevTools Console
2. Type: `document.getElementById('root').dataset.version`
3. Should show current version number

### Check Service Worker Version

```javascript
// In DevTools Console
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Service Worker:', reg.active.scriptURL);
});
```

### Check Bundle Hashes

After deployment, verify new hashes:
```bash
# View deployed files
firebase hosting:channel:list

# Check specific file
curl -I https://neurastack.ai/assets/Generate-[hash].js
```

---

## 🔐 Environment Variables

### Important: Environment Variables are Baked into Build

Vite embeds environment variables at **build time**, not runtime. This means:

1. **Changing `.env` requires rebuild:**
   ```bash
   npm run clean:cache
   npm run build
   ```

2. **Different environments need different builds:**
   - Development: Uses `.env` or `.env.development`
   - Production: Uses `.env.production`

3. **Never commit `.env` files:**
   - `.env` is in `.gitignore`
   - Use `.env.example` as template

### Updating Environment Variables

```bash
# 1. Update .env file
vim .env

# 2. Clear cache and rebuild
npm run clean:cache
npm run build

# 3. Deploy
npm run deploy
```

---

## 📝 Deployment Checklist

Before each deployment:

- [ ] Update version: `npm run version:patch`
- [ ] Review changes: `git diff`
- [ ] Commit version bump: `git commit -m "chore: bump version"`
- [ ] Run tests: `npm test` (if applicable)
- [ ] Check TypeScript: `npm run typecheck`
- [ ] Check linting: `npm run lint`
- [ ] Deploy: `npm run deploy`
- [ ] Verify deployment in incognito mode
- [ ] Check console for errors
- [ ] Test critical user flows

---

## 🎉 Best Practices

1. **Always bump version before deploying**
   - Ensures proper cache invalidation
   - Makes it easy to track which version is deployed

2. **Use automated deployment script**
   - Handles cache clearing automatically
   - Reduces human error

3. **Test in incognito mode**
   - Ensures you're seeing the actual deployed version
   - No cached files interfere

4. **Monitor deployment**
   - Check Firebase Console for deployment status
   - Verify version number in production

5. **Keep changelog updated**
   - Document what changed in each version
   - Helps with debugging and rollbacks

---

## 🔄 Rollback Procedure

If you need to rollback to a previous version:

```bash
# 1. List previous deployments
firebase hosting:channel:list

# 2. Rollback to specific version
firebase hosting:rollback

# 3. Or redeploy from git
git checkout <previous-commit>
npm run deploy
git checkout main
```

---

## 📚 Additional Resources

- [Vite Build Guide](https://vitejs.dev/guide/build.html)
- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [Service Worker Lifecycle](https://web.dev/service-worker-lifecycle/)
- [Cache-Control Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)

---

## 🆘 Need Help?

If you encounter issues not covered here:

1. Check browser console for errors
2. Check Firebase Console for deployment logs
3. Review recent git commits for breaking changes
4. Clear all caches and try again
5. Test in incognito mode to isolate caching issues

