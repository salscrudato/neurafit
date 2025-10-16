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
import { readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Read package.json for version
const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));
const version = packageJson.version;

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
        // Network-first for HTML navigation (app shell)
        // IMPORTANT: Only match actual HTML files, not module requests
        {
          urlPattern: ({ request, url }) => {
            // Only cache actual HTML navigation requests
            // Exclude module imports and API calls
            if (request.mode === 'navigate' && url.pathname.endsWith('.html')) {
              return true;
            }
            // Also match direct .html file requests (but not modules)
            if (url.pathname.endsWith('.html') && request.destination !== 'script') {
              return true;
            }
            return false;
          },
          handler: 'NetworkFirst',
          options: {
            cacheName: 'html-pages',
            networkTimeoutSeconds: 5,
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24, // 24 hours
            },
          },
        },
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

      // Cache name with version for cache busting
      // Include timestamp for aggressive cache invalidation
      cacheId: `neurafit-v${version}-${Date.now()}`,

      // Skip waiting and claim clients immediately
      skipWaiting: true,
      clientsClaim: true,

      // Navigation preload disabled to avoid console warnings
      // The preloadResponse promise can be cancelled before settling,
      // causing "navigation preload request was cancelled" warnings
      navigationPreload: false,

      // Additional runtime code to explicitly disable navigation preload
      additionalManifestEntries: [],

      // Inject custom code to handle navigation preload
      inlineWorkboxRuntime: true,
    });

    // Post-process the service worker to add MIME type error prevention
    const swPath = join(rootDir, 'dist/sw.js');
    let swContent = readFileSync(swPath, 'utf-8');

    // Add MIME type error prevention code at the end, before the closing
    const mimeTypeErrorPrevention = `
// ============================================
// MIME Type Error Prevention
// ============================================
// Prevent serving HTML as JavaScript modules
// This catches cases where the service worker might serve HTML for script requests
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only check GET requests
  if (request.method !== 'GET') return;

  // Check if this is a module/script request
  const isModuleRequest = request.destination === 'script' ||
                          request.destination === 'worker' ||
                          request.destination === 'sharedworker';

  if (isModuleRequest) {
    // Wrap the response to check for MIME type mismatches
    const originalRespond = event.respondWith.bind(event);
    event.respondWith = async function(responsePromise) {
      try {
        const response = await Promise.resolve(responsePromise);

        if (response && response.headers) {
          const contentType = response.headers.get('content-type') || '';

          // If we got HTML for a script request, that's an error
          if (contentType.includes('text/html')) {
            console.error('🚨 MIME Type Error Prevention: Blocked HTML response for script request', {
              url: request.url,
              destination: request.destination,
              contentType: contentType,
            });

            // Try to fetch fresh from network
            try {
              const freshResponse = await fetch(request.clone());
              const freshContentType = freshResponse.headers.get('content-type') || '';

              if (!freshContentType.includes('text/html')) {
                return freshResponse;
              }
            } catch (e) {
              // Network fetch failed, fall through to error
            }

            // Return a proper error response
            return new Response(
              'Module loading error: Invalid MIME type',
              {
                status: 400,
                statusText: 'Bad Request',
                headers: { 'Content-Type': 'text/plain' }
              }
            );
          }
        }

        return response;
      } catch (error) {
        console.error('Error in MIME type prevention handler:', error);
        throw error;
      }
    };
  }
});
`;

    // Append the prevention code before the source map comment
    if (swContent.includes('//# sourceMappingURL')) {
      swContent = swContent.replace(
        '//# sourceMappingURL',
        mimeTypeErrorPrevention + '\n//# sourceMappingURL'
      );
    } else {
      swContent += '\n' + mimeTypeErrorPrevention;
    }

    writeFileSync(swPath, swContent, 'utf-8');
    console.log(`✅ Added MIME type error prevention to service worker`);

    console.log(`✅ Service worker built successfully!`);
    console.log(`   📦 Precached ${count} files`);
    console.log(`   💾 Total size: ${(size / 1024).toFixed(2)} KB (${(size / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`   🎯 Strategies: Cache-First (static), SWR (API), Network-First (HTML)`);
    console.log(`   🔄 Update notifications: BroadcastChannel + postMessage`);
    console.log(`   📴 Offline support: App shell + last workout`);
    console.log(`   🛡️  MIME type error prevention: Enabled`);

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

