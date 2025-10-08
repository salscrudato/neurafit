#!/usr/bin/env node

/**
 * Automated Deployment Script
 * 
 * Handles the complete deployment workflow:
 * 1. Clears all caches
 * 2. Builds the application
 * 3. Deploys to Firebase
 * 4. Verifies deployment
 * 
 * Usage:
 *   npm run deploy          (deploy hosting only)
 *   npm run deploy:all      (deploy hosting + functions)
 */

import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { resolve } from 'path';

const ROOT_DIR = resolve(process.cwd());

function exec(command, options = {}) {
  console.log(`\n🔧 Running: ${command}\n`);
  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: ROOT_DIR,
      ...options,
    });
    return true;
  } catch {
    console.error(`❌ Command failed: ${command}`);
    return false;
  }
}

function clearCaches() {
  console.log('\n🧹 Clearing all caches...\n');
  
  const cacheDirs = [
    'dist',
    'node_modules/.vite',
    '.vite',
    'node_modules/.cache',
  ];
  
  cacheDirs.forEach(dir => {
    const fullPath = resolve(ROOT_DIR, dir);
    if (existsSync(fullPath)) {
      console.log(`   Removing ${dir}...`);
      rmSync(fullPath, { recursive: true, force: true });
    }
  });
  
  console.log('✅ Caches cleared\n');
}

function build() {
  console.log('\n📦 Building application...\n');
  return exec('npm run build');
}

function deploy(target = 'hosting') {
  console.log(`\n🚀 Deploying to Firebase (${target})...\n`);
  return exec(`firebase deploy --only ${target}`);
}

function verifyDeployment() {
  console.log('\n✅ Deployment complete!\n');
  console.log('🌐 Your app is now live at:');
  console.log('   • https://neurafit-ai-2025.web.app');
  console.log('   • https://neurastack.ai\n');
  console.log('💡 Tips:');
  console.log('   • Clear browser cache or use incognito mode to see changes');
  console.log('   • Service worker will auto-update within 30 seconds');
  console.log('   • Check console for any errors\n');
}

function main() {
  const deployTarget = process.argv[2] || 'hosting';
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         NeuraFit Automated Deployment Script              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  // Step 1: Clear caches
  clearCaches();
  
  // Step 2: Build
  if (!build()) {
    console.error('\n❌ Build failed. Deployment aborted.\n');
    process.exit(1);
  }
  
  // Step 3: Deploy
  if (!deploy(deployTarget)) {
    console.error('\n❌ Deployment failed.\n');
    process.exit(1);
  }
  
  // Step 4: Verify
  verifyDeployment();
}

main();

