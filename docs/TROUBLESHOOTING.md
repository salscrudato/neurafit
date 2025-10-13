# NeuraFit Troubleshooting Guide

## Common Development Issues

### 1. Vite "Outdated Optimize Dep" Error

**Symptoms:**
```
GET http://localhost:5173/node_modules/.vite/deps/class-variance-authority.js?v=266c2ba5 
net::ERR_ABORTED 504 (Outdated Optimize Dep)
```

**Cause:**
Vite's dependency optimization cache is stale after code changes or dependency updates.

**Solution:**
```bash
# Stop the dev server (Ctrl+C)
# Clear Vite cache
rm -rf node_modules/.vite .vite

# Restart dev server
npm run dev
```

**Alternative (if above doesn't work):**
```bash
# Full cache clear
npm run clean:cache

# Restart
npm run dev
```

**Prevention:**
- Restart dev server after installing new dependencies
- Use `npm run clean:cache` before major updates

---

### 2. "Failed to fetch dynamically imported module" Error

**Symptoms:**
```
TypeError: Failed to fetch dynamically imported module: 
http://localhost:5173/src/pages/Dashboard.tsx
```

**Cause:**
- Stale Vite cache
- Hot Module Replacement (HMR) issues
- Browser cache issues

**Solution:**
```bash
# 1. Clear Vite cache
rm -rf node_modules/.vite .vite

# 2. Clear browser cache
# In browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# 3. Restart dev server
npm run dev
```

**If still not working:**
```bash
# Full rebuild
npm run clean:cache
npm install
npm run dev
```

---

### 3. Phone Authentication Not Working

**Symptoms:**
- "Verification not ready" error
- reCAPTCHA not loading
- SMS not received

**Solutions:**

#### A. reCAPTCHA Container Not Found
```bash
# Check browser console for:
# "reCAPTCHA container not found"

# Solution: Refresh the page
# The container should be in Auth.tsx at line 449
```

#### B. Firebase Configuration
```bash
# Verify .env file has all required variables:
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
```

#### C. Test Phone Numbers (Development)
```bash
# Add test numbers in Firebase Console:
# Authentication → Sign-in method → Phone → Test phone numbers

# Example:
# Phone: +1 555-123-4567
# Code: 123456
```

#### D. Rate Limiting
```bash
# If you see "Too many requests":
# - Wait 15-30 minutes
# - Use test phone numbers in development
# - Check Firebase quota in console
```

---

### 4. TypeScript Errors

**Symptoms:**
```
Type 'X' is not assignable to type 'Y'
```

**Solution:**
```bash
# Run type check
npm run typecheck

# If errors persist, rebuild TypeScript
npx tsc --build --clean
npm run typecheck
```

---

### 5. Build Failures

**Symptoms:**
```
Build failed with errors
```

**Solution:**
```bash
# 1. Clean everything
npm run clean:cache

# 2. Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# 3. Try build again
npm run build
```

---

### 6. Service Worker Issues

**Symptoms:**
- Old content showing after deployment
- "Update available" not appearing
- Offline mode not working

**Solution:**
```bash
# Development:
# 1. Unregister service worker in DevTools
# Application → Service Workers → Unregister

# 2. Clear all site data
# Application → Clear storage → Clear site data

# 3. Hard refresh
# Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# Production:
# Service worker auto-updates every 24 hours
# Or on page refresh after new deployment
```

---

### 7. Firebase Authentication Errors

#### A. "auth/popup-blocked"
**Solution:**
- Allow popups for localhost in browser settings
- Or use redirect flow (already implemented as fallback)

#### B. "auth/unauthorized-domain"
**Solution:**
```bash
# Add domain to Firebase Console:
# Authentication → Settings → Authorized domains
# Add: localhost, neurastack.ai, neurafit-ai-2025.web.app
```

#### C. "auth/network-request-failed"
**Solution:**
- Check internet connection
- Check Firebase status: https://status.firebase.google.com
- Verify firewall/proxy settings

---

### 8. Hot Module Replacement (HMR) Not Working

**Symptoms:**
- Changes not reflecting in browser
- Need to manually refresh

**Solution:**
```bash
# 1. Check if dev server is running
# Should see: "VITE v7.1.7 ready in XXXms"

# 2. Check browser console for HMR errors

# 3. Restart dev server
# Ctrl+C, then npm run dev

# 4. If still not working, clear cache
rm -rf node_modules/.vite .vite
npm run dev
```

---

### 9. CSS Not Loading / Styling Issues

**Symptoms:**
- No styles applied
- Tailwind classes not working

**Solution:**
```bash
# 1. Check if Tailwind is configured
# Should have: tailwind.config.js

# 2. Restart dev server
npm run dev

# 3. If still broken, rebuild
npm run clean:cache
npm run dev
```

---

### 10. Memory Issues / Slow Performance

**Symptoms:**
- Dev server slow
- Browser tab using too much memory
- Build taking too long

**Solution:**
```bash
# 1. Close unused browser tabs

# 2. Restart dev server
npm run dev

# 3. Increase Node memory (if needed)
export NODE_OPTIONS="--max-old-space-size=4096"
npm run dev

# 4. Check for memory leaks
# Open DevTools → Memory → Take heap snapshot
```

---

## Quick Fixes Checklist

When something breaks, try these in order:

1. **Hard refresh browser** - `Cmd+Shift+R` / `Ctrl+Shift+R`
2. **Clear Vite cache** - `rm -rf node_modules/.vite .vite`
3. **Restart dev server** - `Ctrl+C`, then `npm run dev`
4. **Clear all caches** - `npm run clean:cache`
5. **Reinstall dependencies** - `rm -rf node_modules && npm install`
6. **Check browser console** - Look for specific error messages
7. **Check terminal** - Look for build/server errors

---

## Development Best Practices

### To Avoid Issues:

1. **Always restart dev server after:**
   - Installing new dependencies
   - Changing environment variables
   - Major code refactoring

2. **Clear cache before:**
   - Switching branches
   - Pulling major updates
   - Debugging weird issues

3. **Use proper commands:**
   - `npm run dev` - Development
   - `npm run build` - Production build
   - `npm run preview` - Preview production build
   - `npm run clean:cache` - Clear all caches

4. **Keep dependencies updated:**
   ```bash
   npm outdated
   npm update
   ```

5. **Monitor bundle size:**
   ```bash
   npm run build:analyze
   ```

---

## Getting Help

### Before Asking for Help:

1. Check this troubleshooting guide
2. Check browser console for errors
3. Check terminal for errors
4. Try the quick fixes checklist
5. Search for the error message online

### When Asking for Help, Include:

1. **Error message** (full text from console)
2. **Steps to reproduce**
3. **Environment:**
   - OS (Mac/Windows/Linux)
   - Browser (Chrome/Safari/Firefox)
   - Node version (`node -v`)
   - npm version (`npm -v`)
4. **What you've tried** (from this guide)

### Useful Commands for Debugging:

```bash
# Check versions
node -v
npm -v

# Check environment variables
cat .env

# Check Firebase config
npm run dev
# Then check browser console for Firebase initialization logs

# Check build output
npm run build
# Look for errors or warnings

# Check bundle size
npm run build:check

# Run type check
npm run typecheck

# Run linter
npm run lint
```

---

## Emergency Reset

If nothing else works, nuclear option:

```bash
# 1. Stop all processes
# Ctrl+C in all terminals

# 2. Delete everything
rm -rf node_modules
rm -rf dist
rm -rf .vite
rm -rf node_modules/.vite
rm -rf node_modules/.cache
rm package-lock.json

# 3. Reinstall
npm install

# 4. Rebuild
npm run build

# 5. Start fresh
npm run dev
```

**Warning:** This will take 5-10 minutes but should fix almost any issue.

---

## Known Issues

### 1. iOS Safari - SMS Autofill
- Works on iOS 12+
- Requires `autoComplete="one-time-code"`
- May not work in private browsing mode

### 2. Android - SMS Retrieval
- Works on Chrome Android
- Requires numeric input mode
- May require user permission

### 3. reCAPTCHA in Development
- May show "localhost is not in the list of supported domains"
- Add localhost to Firebase Console authorized domains
- Use test phone numbers for development

---

**Last Updated:** January 13, 2025  
**Version:** 1.0.16

