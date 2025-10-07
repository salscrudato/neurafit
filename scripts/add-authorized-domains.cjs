#!/usr/bin/env node

/**
 * Script to add authorized domains for Firebase Authentication
 * Uses Firebase REST API with gcloud authentication
 */

const { execSync } = require('child_process');
const https = require('https');

const PROJECT_ID = 'neurafit-ai-2025';

// Domains to add
const DOMAINS_TO_ADD = [
  'neurastack.ai',
  'www.neurastack.ai',
  'neurafit-ai-2025.firebaseapp.com',
  'neurafit-ai-2025.web.app',
  'localhost'
];

async function getAccessToken() {
  try {
    const token = execSync('gcloud auth print-access-token', { encoding: 'utf-8' }).trim();
    return token;
  } catch (error) {
    console.error('❌ Error getting access token. Make sure you are logged in with: gcloud auth login');
    throw error;
  }
}

function makeRequest(method, path, token, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'identitytoolkit.googleapis.com',
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body || '{}'));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function addAuthorizedDomains() {
  try {
    console.log('🔧 Adding authorized domains for OAuth...\n');
    console.log('Domains to authorize:');
    DOMAINS_TO_ADD.forEach(domain => console.log(`  - ${domain}`));
    console.log('');

    // Get access token
    console.log('🔑 Getting access token...');
    const token = await getAccessToken();
    console.log('✅ Access token obtained\n');

    // Get current config
    console.log('📥 Fetching current auth config...');
    const config = await makeRequest(
      'GET',
      `/v2/projects/${PROJECT_ID}/config`,
      token
    );
    console.log('✅ Current config fetched\n');

    // Get existing authorized domains
    const existingDomains = config.authorizedDomains || [];
    console.log('Current authorized domains:');
    existingDomains.forEach(domain => console.log(`  - ${domain}`));
    console.log('');

    // Merge domains (avoid duplicates)
    const allDomains = [...new Set([...existingDomains, ...DOMAINS_TO_ADD])];

    // Update config
    console.log('📤 Updating authorized domains...');
    await makeRequest(
      'PATCH',
      `/v2/projects/${PROJECT_ID}/config?updateMask=authorizedDomains`,
      token,
      { authorizedDomains: allDomains }
    );

    console.log('✅ Authorized domains updated successfully!\n');
    console.log('New authorized domains:');
    allDomains.forEach(domain => console.log(`  - ${domain}`));
    console.log('');
    console.log('🎉 Google Auth will now work on all these domains!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('💡 Manual steps:');
    console.error('1. Go to: https://console.firebase.google.com/project/neurafit-ai-2025/authentication/settings');
    console.error('2. Click on the "Authorized domains" tab');
    console.error('3. Click "Add domain" and add each domain listed above');
    process.exit(1);
  }
}

addAuthorizedDomains();

