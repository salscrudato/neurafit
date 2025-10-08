# 🚀 Quick Deployment Reference

## Standard Deployment (Most Common)

```bash
# 1. Bump version
npm run version:patch

# 2. Commit
git add -A && git commit -m "chore: bump version to $(node -p "require('./package.json').version")"

# 3. Deploy
npm run deploy
```

## Available Commands

### Version Management
```bash
npm run version:patch    # 1.0.0 → 1.0.1 (bug fixes)
npm run version:minor    # 1.0.0 → 1.1.0 (new features)
npm run version:major    # 1.0.0 → 2.0.0 (breaking changes)
npm run version:check    # Show current version
```

### Deployment
```bash
npm run deploy           # Deploy hosting only (recommended)
npm run deploy:all       # Deploy hosting + functions
npm run deploy:functions # Deploy functions only
```

### Cache Management
```bash
npm run clean:cache      # Clear all build caches
npm run build            # Build (auto-clears cache via prebuild)
```

## Troubleshooting

### Users see old version?
```bash
# Hard refresh in browser
# Mac: Cmd+Shift+R
# Windows: Ctrl+Shift+R
```

### Build has old environment variables?
```bash
npm run clean:cache
npm run build
```

### Need to rollback?
```bash
firebase hosting:rollback
```

## What Gets Updated Automatically

When you run `npm run version:patch`:
- ✅ `package.json` version
- ✅ `public/manifest.json` version + cache version
- ✅ `index.html` version metadata

When you run `npm run deploy`:
- ✅ Clears all build caches
- ✅ Runs full TypeScript build
- ✅ Builds service worker
- ✅ Deploys to Firebase
- ✅ Updates both domains (neurafit-ai-2025.web.app + neurastack.ai)

## Cache Busting Strategy

1. **Content hashes** - All JS/CSS files have content-based hashes
2. **Version metadata** - Tracked in package.json, manifest.json, index.html
3. **Service worker** - Auto-updates within 30 seconds
4. **HTTP headers** - Proper Cache-Control headers configured
5. **Pre-build cache clear** - Automatic via prebuild script

## Full Documentation

See [DEPLOYMENT.md](../DEPLOYMENT.md) for complete guide.

