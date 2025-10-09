#!/usr/bin/env node

/**
 * Deployment Setup Verification Script
 * 
 * Verifies that all required configuration is in place for automated deployments:
 * 1. Checks local environment variables
 * 2. Verifies Firebase configuration
 * 3. Tests Firebase CLI authentication
 * 4. Validates build output
 * 
 * Usage:
 *   node scripts/verify-deployment-setup.js
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT_DIR = resolve(process.cwd());

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, silent = false) {
  try {
    const output = execSync(command, {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit',
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function checkFile(filePath, description) {
  const fullPath = resolve(ROOT_DIR, filePath);
  if (existsSync(fullPath)) {
    log(`  ✅ ${description}`, 'green');
    return true;
  } else {
    log(`  ❌ ${description} - NOT FOUND`, 'red');
    return false;
  }
}

function checkEnvVar(varName, required = true) {
  const value = process.env[varName];
  if (value && value !== 'undefined' && value !== '') {
    log(`  ✅ ${varName}`, 'green');
    return true;
  } else {
    if (required) {
      log(`  ❌ ${varName} - MISSING`, 'red');
    } else {
      log(`  ⚠️  ${varName} - OPTIONAL (not set)`, 'yellow');
    }
    return !required;
  }
}

function loadEnvFile() {
  const envPath = resolve(ROOT_DIR, '.env');
  if (!existsSync(envPath)) {
    return false;
  }

  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=');
      if (key && value) {
        process.env[key] = value;
      }
    }
  });

  return true;
}

async function main() {
  console.log('');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     NeuraFit Deployment Setup Verification Script         ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('');

  let allChecks = true;

  // Check 1: Required files
  log('📁 Checking required files...', 'blue');
  allChecks &= checkFile('package.json', 'package.json');
  allChecks &= checkFile('firebase.json', 'firebase.json');
  allChecks &= checkFile('.firebaserc', '.firebaserc');
  allChecks &= checkFile('vite.config.ts', 'vite.config.ts');
  allChecks &= checkFile('.env.example', '.env.example');
  console.log('');

  // Check 2: Environment file
  log('🔐 Checking environment configuration...', 'blue');
  const hasEnvFile = checkFile('.env', '.env file');
  if (hasEnvFile) {
    loadEnvFile();
  } else {
    log('  ⚠️  Create .env from .env.example', 'yellow');
    allChecks = false;
  }
  console.log('');

  // Check 3: Required environment variables
  log('🔑 Checking required environment variables...', 'blue');
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
  ];

  requiredVars.forEach(varName => {
    allChecks &= checkEnvVar(varName, true);
  });
  console.log('');

  // Check 4: Optional environment variables
  log('⚙️  Checking optional environment variables...', 'blue');
  const optionalVars = [
    'VITE_FIREBASE_MEASUREMENT_ID',
    'VITE_SENTRY_DSN',
    'VITE_WORKOUT_FN_URL',
  ];

  optionalVars.forEach(varName => {
    checkEnvVar(varName, false);
  });
  console.log('');

  // Check 5: Firebase CLI
  log('🔥 Checking Firebase CLI...', 'blue');
  const firebaseCheck = exec('firebase --version', true);
  if (firebaseCheck.success) {
    log(`  ✅ Firebase CLI installed (${firebaseCheck.output.trim()})`, 'green');
  } else {
    log('  ❌ Firebase CLI not installed', 'red');
    log('     Install: npm install -g firebase-tools', 'yellow');
    allChecks = false;
  }
  console.log('');

  // Check 6: Firebase authentication
  log('🔐 Checking Firebase authentication...', 'blue');
  const authCheck = exec('firebase projects:list', true);
  if (authCheck.success) {
    log('  ✅ Firebase CLI authenticated', 'green');
    
    // Check if correct project is selected
    if (authCheck.output.includes('neurafit-ai-2025')) {
      log('  ✅ Project neurafit-ai-2025 found', 'green');
    } else {
      log('  ⚠️  Project neurafit-ai-2025 not found in your projects', 'yellow');
      log('     Run: firebase use neurafit-ai-2025', 'yellow');
    }
  } else {
    log('  ❌ Firebase CLI not authenticated', 'red');
    log('     Run: firebase login', 'yellow');
    allChecks = false;
  }
  console.log('');

  // Check 7: Node.js version
  log('📦 Checking Node.js version...', 'blue');
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion >= 20) {
    log(`  ✅ Node.js ${nodeVersion} (>= 20.0.0)`, 'green');
  } else {
    log(`  ❌ Node.js ${nodeVersion} (requires >= 20.0.0)`, 'red');
    allChecks = false;
  }
  console.log('');

  // Check 8: Dependencies
  log('📚 Checking dependencies...', 'blue');
  if (existsSync(resolve(ROOT_DIR, 'node_modules'))) {
    log('  ✅ node_modules exists', 'green');
  } else {
    log('  ❌ node_modules not found', 'red');
    log('     Run: npm install', 'yellow');
    allChecks = false;
  }
  console.log('');

  // Check 9: GitHub workflow files
  log('🔄 Checking GitHub Actions workflows...', 'blue');
  checkFile('.github/workflows/ci.yml', 'CI workflow');
  checkFile('.github/workflows/deploy.yml', 'Deploy workflow');
  console.log('');

  // Check 10: Build test
  log('🏗️  Testing build process...', 'blue');
  log('  ℹ️  This may take a minute...', 'cyan');
  const buildCheck = exec('npm run build', false);
  if (buildCheck.success) {
    log('  ✅ Build successful', 'green');
    
    // Verify build output
    if (existsSync(resolve(ROOT_DIR, 'dist/index.html'))) {
      log('  ✅ dist/index.html generated', 'green');
    }
    if (existsSync(resolve(ROOT_DIR, 'dist/sw.js'))) {
      log('  ✅ dist/sw.js generated', 'green');
    }
    if (existsSync(resolve(ROOT_DIR, 'dist/manifest.json'))) {
      log('  ✅ dist/manifest.json generated', 'green');
    }
  } else {
    log('  ❌ Build failed', 'red');
    allChecks = false;
  }
  console.log('');

  // Summary
  log('═══════════════════════════════════════════════════════════', 'cyan');
  if (allChecks) {
    log('✅ All checks passed! Your deployment setup is ready.', 'green');
    console.log('');
    log('Next steps:', 'blue');
    log('  1. Set up GitHub secrets (see .github/DEPLOYMENT_SETUP.md)', 'cyan');
    log('  2. Push to main branch to trigger automated deployment', 'cyan');
    log('  3. Or manually trigger deployment from GitHub Actions tab', 'cyan');
  } else {
    log('❌ Some checks failed. Please fix the issues above.', 'red');
    console.log('');
    log('Common fixes:', 'blue');
    log('  • Copy .env.example to .env and fill in values', 'yellow');
    log('  • Run: npm install', 'yellow');
    log('  • Run: firebase login', 'yellow');
    log('  • Install Firebase CLI: npm install -g firebase-tools', 'yellow');
  }
  log('═══════════════════════════════════════════════════════════', 'cyan');
  console.log('');

  process.exit(allChecks ? 0 : 1);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});

