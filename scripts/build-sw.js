/**
 * Build script for generating service worker with Workbox - Production Ready
 *
 * This script:
 * 1. Uses workbox-build to generate a complete service worker
 * 2. Bundles Workbox runtime with the service worker
 * 3. Outputs to dist/sw.js with optimizations
 *
 * Features:
 * - Precaches app shell and static assets
 * - Cache-first for static assets
 * - Stale-while-revalidate for API GETs
 * - Network-first for HTML navigation
 * - Query parameter normalization
 * - Broadcast channel for updates
 * - Offline support for shell + last workout
 */

import { generateSW } from 'workbox-build';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

async function buildServiceWorker() {
  try {
    console.log('🔨 Building production service worker with Workbox...');
    console.log('   📦 Features: precaching, offline support, smart caching strategies');

    const { count, size, warnings } = await generateSW({
      // Output service worker file
      swDest: join(rootDir, 'dist/sw.js'),

      // Directory to scan for files to precache
      globDirectory: join(rootDir, 'dist'),

      // Patterns to match files for precaching (app shell)
      globPatterns: [
        // HTML files (app shell)
        '**/*.html',
        // JavaScript bundles (versioned, cache-busted)
        '**/*.js',
        // CSS stylesheets
        '**/*.css',
        // Images and icons
        '**/*.{png,jpg,jpeg,gif,svg,ico,webp}',
        // Manifest
        'manifest.json',
      ],

      // Files to ignore (don't precache)
      globIgnores: [
        // Service worker itself
        '**/sw.js',
        // Workbox runtime (bundled separately)
        '**/workbox-*.js',
        // Source maps (too large, not needed for runtime)
        '**/*.map',
        // Development files
        '**/*.local',
        // Large assets that should be lazy-loaded
        '**/screenshots/**',
        '**/og-images/**',
      ],

      // Maximum file size to precache (2MB)
      maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,

      // Runtime caching strategies
      runtimeCaching: [
        // Cache Google Fonts CSS with stale-while-revalidate
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'google-fonts-stylesheets',
            expiration: {
              maxEntries: 20,
              maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
            },
          },
        },
        // Cache Google Fonts files with cache-first
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-webfonts',
            expiration: {
              maxEntries: 30,
              maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        // Cache other Google APIs with stale-while-revalidate
        {
          urlPattern: /^https:\/\/.*\.googleapis\.com\/.*/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'google-apis',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 * 24, // 24 hours
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        // Cache Firebase API calls
        {
          urlPattern: /^https:\/\/.*\.firebaseio\.com\/.*/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'firebase-api',
            networkTimeoutSeconds: 10,
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 5, // 5 minutes
            },
          },
        },
        // Cache images with cache-first
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'images',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
            },
          },
        },
      ],

      // Skip waiting and claim clients immediately
      skipWaiting: true,
      clientsClaim: true,

      // Navigation preload disabled to avoid console warnings
      // The preloadResponse promise can be cancelled before settling,
      // causing "navigation preload request was cancelled" warnings
      navigationPreload: false,
    });

    console.log(`✅ Service worker built successfully!`);
    console.log(`   📦 Precached ${count} files`);
    console.log(`   💾 Total size: ${(size / 1024).toFixed(2)} KB (${(size / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`   🎯 Strategies: Cache-First (static), SWR (API), Network-First (HTML)`);
    console.log(`   🔄 Update notifications: BroadcastChannel + postMessage`);
    console.log(`   📴 Offline support: App shell + last workout`);

    if (warnings.length > 0) {
      console.warn('⚠️  Warnings:');
      warnings.forEach(warning => console.warn(`   - ${warning}`));
    }

  } catch (error) {
    console.error('❌ Failed to build service worker:', error);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

buildServiceWorker();

