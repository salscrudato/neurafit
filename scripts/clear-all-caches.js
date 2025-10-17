#!/usr/bin/env node

/**
 * Comprehensive Cache Clearing Script
 *
 * Clears ALL caches that could cause React hook errors:
 * - Vite cache (.vite, node_modules/.vite)
 * - Node modules cache (.cache, .tmp)
 * - TypeScript cache
 * - ESBuild cache
 *
 * This prevents the "Cannot read properties of null (reading 'useEffect')" error
 * which occurs when React instances are stale or duplicated.
 *
 * Run before: npm run dev, npm run build, npm run preview
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const projectRoot = path.resolve(__dirname, '..');

const cachePaths = [
  // Vite caches
  path.join(projectRoot, '.vite'),
  path.join(projectRoot, 'node_modules', '.vite'),
  
  // Node modules caches
  path.join(projectRoot, 'node_modules', '.cache'),
  path.join(projectRoot, 'node_modules', '.tmp'),
  
  // TypeScript cache
  path.join(projectRoot, 'node_modules', '.tsbuildinfo'),
  
  // ESBuild cache
  path.join(projectRoot, 'node_modules', '.esbuild'),
  
  // Dist directory (old builds)
  path.join(projectRoot, 'dist'),
];

function clearCache(cachePath) {
  try {
    if (fs.existsSync(cachePath)) {
      fs.rmSync(cachePath, { recursive: true, force: true });
      console.log(`✅ Cleared: ${path.relative(projectRoot, cachePath)}`);
      return true;
    }
  } catch (error) {
    console.warn(`⚠️  Failed to clear ${path.relative(projectRoot, cachePath)}: ${error.message}`);
    return false;
  }
  return false;
}

console.log('🧹 Clearing all caches to prevent React hook errors...\n');

let clearedCount = 0;
for (const cachePath of cachePaths) {
  if (clearCache(cachePath)) {
    clearedCount++;
  }
}

console.log(`\n✅ Cache clearing complete! Cleared ${clearedCount} cache directories.`);
console.log('💡 Tip: If you still see "Cannot read properties of null (reading \'useEffect\')" error:');
console.log('   1. Run: npm run clean:all');
console.log('   2. Run: npm install');
console.log('   3. Run: npm run dev');

