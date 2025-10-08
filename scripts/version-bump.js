#!/usr/bin/env node

/**
 * Version Bump Script
 * 
 * Automatically increments version number and updates all version references
 * Run before each deployment to ensure proper cache busting
 * 
 * Usage:
 *   npm run version:patch  (1.0.0 -> 1.0.1)
 *   npm run version:minor  (1.0.0 -> 1.1.0)
 *   npm run version:major  (1.0.0 -> 2.0.0)
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ROOT_DIR = resolve(process.cwd());

function getCurrentVersion() {
  const packageJson = JSON.parse(readFileSync(resolve(ROOT_DIR, 'package.json'), 'utf-8'));
  return packageJson.version;
}

function incrementVersion(version, type = 'patch') {
  const [major, minor, patch] = version.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

function updatePackageJson(newVersion) {
  const filePath = resolve(ROOT_DIR, 'package.json');
  const content = JSON.parse(readFileSync(filePath, 'utf-8'));
  content.version = newVersion;
  writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
  console.log(`✅ Updated package.json to ${newVersion}`);
}

function updateManifest(newVersion) {
  const filePath = resolve(ROOT_DIR, 'public/manifest.json');
  const content = JSON.parse(readFileSync(filePath, 'utf-8'));
  content.version = newVersion;
  content.build_time = new Date().toISOString();
  content.cache_version = `v${newVersion}-${Date.now()}`;
  writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
  console.log(`✅ Updated manifest.json to ${newVersion}`);
}

function updateIndexHtml(newVersion) {
  const filePath = resolve(ROOT_DIR, 'index.html');
  let content = readFileSync(filePath, 'utf-8');
  
  // Update version in meta tag
  content = content.replace(
    /data-version="[^"]*"/,
    `data-version="${newVersion}"`
  );
  
  // Update build time
  content = content.replace(
    /data-build-time="[^"]*"/,
    `data-build-time="${new Date().toISOString().split('T')[0]}"`
  );
  
  // Update softwareVersion in JSON-LD
  content = content.replace(
    /"softwareVersion":\s*"[^"]*"/,
    `"softwareVersion": "${newVersion}"`
  );
  
  // Update dateModified in JSON-LD
  content = content.replace(
    /"dateModified":\s*"[^"]*"/,
    `"dateModified": "${new Date().toISOString().split('T')[0]}"`
  );
  
  writeFileSync(filePath, content);
  console.log(`✅ Updated index.html to ${newVersion}`);
}

function main() {
  const versionType = process.argv[2] || 'patch';
  
  if (!['major', 'minor', 'patch'].includes(versionType)) {
    console.error('❌ Invalid version type. Use: major, minor, or patch');
    process.exit(1);
  }
  
  const currentVersion = getCurrentVersion();
  const newVersion = incrementVersion(currentVersion, versionType);
  
  console.log(`\n🔄 Bumping version: ${currentVersion} → ${newVersion} (${versionType})\n`);
  
  try {
    updatePackageJson(newVersion);
    updateManifest(newVersion);
    updateIndexHtml(newVersion);
    
    console.log(`\n✅ Version bump complete!`);
    console.log(`📦 New version: ${newVersion}`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Review changes: git diff`);
    console.log(`   2. Commit: git add -A && git commit -m "chore: bump version to ${newVersion}"`);
    console.log(`   3. Build: npm run build`);
    console.log(`   4. Deploy: firebase deploy --only hosting\n`);
  } catch (error) {
    console.error('❌ Error updating version:', error.message);
    process.exit(1);
  }
}

main();

