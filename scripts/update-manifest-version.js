/**
 * Update Manifest Version Script
 * 
 * Updates manifest.json with current version and timestamp
 * for cache busting and version tracking.
 * 
 * Run this as part of the build process to ensure manifest
 * always reflects the current app version.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

async function updateManifestVersion() {
  try {
    console.log('📝 Updating manifest.json version...');

    // Read package.json for version
    const packageJsonPath = join(rootDir, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const appVersion = packageJson.version;

    // Read manifest.json
    const manifestPath = join(rootDir, 'public', 'manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

    // Update version fields
    const now = new Date();
    const timestamp = now.getTime();
    const isoTime = now.toISOString();

    manifest.version = appVersion;
    manifest.build_time = isoTime;
    manifest.cache_version = `v${appVersion}-${timestamp}`;

    // Write updated manifest
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

    console.log(`✅ Manifest updated:`);
    console.log(`   Version: ${appVersion}`);
    console.log(`   Build Time: ${isoTime}`);
    console.log(`   Cache Version: ${manifest.cache_version}`);
  } catch (error) {
    console.error('❌ Error updating manifest:', error);
    process.exit(1);
  }
}

updateManifestVersion();

