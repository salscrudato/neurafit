/**
 * Build script for generating service worker with Workbox
 * 
 * This script:
 * 1. Reads the sw-template.js file
 * 2. Uses workbox-build to inject precache manifest
 * 3. Bundles Workbox runtime
 * 4. Outputs to public/sw.js
 */

import { injectManifest } from 'workbox-build';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

async function buildServiceWorker() {
  try {
    console.log('🔨 Building service worker with Workbox...');

    const { count, size, warnings } = await injectManifest({
      // Source service worker file (template)
      swSrc: join(rootDir, 'public/sw-template.js'),
      
      // Output service worker file
      swDest: join(rootDir, 'dist/sw.js'),
      
      // Directory to scan for files to precache
      globDirectory: join(rootDir, 'dist'),
      
      // Patterns to match files for precaching
      globPatterns: [
        '**/*.{html,js,css,png,jpg,jpeg,gif,svg,woff,woff2,ttf,eot,ico}',
      ],
      
      // Files to ignore
      globIgnores: [
        '**/sw.js',
        '**/sw-template.js',
        '**/workbox-*.js',
        '**/*.map',
      ],
      
      // Maximum file size to precache (2MB)
      maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
    });

    console.log(`✅ Service worker built successfully!`);
    console.log(`   - Precached ${count} files`);
    console.log(`   - Total size: ${(size / 1024).toFixed(2)} KB`);

    if (warnings.length > 0) {
      console.warn('⚠️  Warnings:');
      warnings.forEach(warning => console.warn(`   - ${warning}`));
    }

  } catch (error) {
    console.error('❌ Failed to build service worker:', error);
    process.exit(1);
  }
}

buildServiceWorker();

