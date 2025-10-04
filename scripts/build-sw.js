/**
 * Build script for generating service worker with Workbox - Production Ready
 *
 * This script:
 * 1. Reads the sw-template.js file
 * 2. Uses workbox-build to inject precache manifest
 * 3. Bundles Workbox runtime with advanced strategies
 * 4. Outputs to dist/sw.js with optimizations
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

import { injectManifest } from 'workbox-build';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

async function buildServiceWorker() {
  try {
    console.log('🔨 Building production service worker with Workbox...');
    console.log('   📦 Features: precaching, offline support, smart caching strategies');

    const { count, size, warnings } = await injectManifest({
      // Source service worker file (template)
      swSrc: join(rootDir, 'public/sw-template.js'),

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
        // Fonts
        '**/*.{woff,woff2,ttf,eot}',
        // Manifest
        'manifest.json',
      ],

      // Files to ignore (don't precache)
      globIgnores: [
        // Service worker itself
        '**/sw.js',
        '**/sw-template.js',
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
      // Files larger than this will be lazy-loaded
      maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,

      // Manifest transforms (optional: modify manifest entries)
      manifestTransforms: [
        // Add revision info based on file size and timestamp
        (manifestEntries) => {
          const manifest = manifestEntries.map(entry => {
            // Add custom metadata if needed
            return entry;
          });
          return { manifest };
        },
      ],
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

