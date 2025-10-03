#!/usr/bin/env node

/**
 * Debug and fix user subscription status
 * This script will check the current subscription status and fix any issues
 */

const https = require('https');

// Configuration
const PROJECT_ID = 'neurafit-ai-2025';
const REGION = 'us-central1';
const USER_ID = 'Wx0ru97LXdSschw0eGUhKC02lEp2'; // Your user ID from the logs

/**
 * Call Firebase function
 */
function callFirebaseFunction(functionName, data = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: `${REGION}-${PROJECT_ID}.cloudfunctions.net`,
      port: 443,
      path: `/${functionName}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : {};
          resolve({
            statusCode: res.statusCode,
            data: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Debug user subscription
 */
async function debugUserSubscription() {
  console.log('🔍 Debugging subscription for user:', USER_ID);
  
  try {
    const response = await callFirebaseFunction('debugSubscription', {
      data: { userId: USER_ID }
    });
    
    if (response.statusCode === 200) {
      console.log('✅ Debug response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } else {
      console.log('❌ Debug failed:', response.statusCode, response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error debugging subscription:', error.message);
    return null;
  }
}

/**
 * Manual sync subscription
 */
async function manualSyncSubscription() {
  console.log('🔄 Manually syncing subscription for user:', USER_ID);
  
  try {
    const response = await callFirebaseFunction('manualSyncSubscription', {
      data: { userId: USER_ID }
    });
    
    if (response.statusCode === 200) {
      console.log('✅ Manual sync response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } else {
      console.log('❌ Manual sync failed:', response.statusCode, response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error syncing subscription:', error.message);
    return null;
  }
}

/**
 * Emergency subscription fix
 */
async function emergencySubscriptionFix() {
  console.log('🚨 Running emergency subscription fix for user:', USER_ID);
  
  try {
    const response = await callFirebaseFunction('emergencySubscriptionFix', {
      data: { userId: USER_ID }
    });
    
    if (response.statusCode === 200) {
      console.log('✅ Emergency fix response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } else {
      console.log('❌ Emergency fix failed:', response.statusCode, response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error running emergency fix:', error.message);
    return null;
  }
}

/**
 * Get Stripe subscription status
 */
async function getStripeSubscriptionStatus() {
  console.log('🔍 Getting Stripe subscription status for user:', USER_ID);
  
  try {
    const response = await callFirebaseFunction('getStripeSubscriptionStatus', {
      data: { userId: USER_ID }
    });
    
    if (response.statusCode === 200) {
      console.log('✅ Stripe status response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } else {
      console.log('❌ Stripe status check failed:', response.statusCode, response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting Stripe status:', error.message);
    return null;
  }
}

/**
 * Main debug function
 */
async function main() {
  console.log('🚀 NeuraFit Subscription Debug Tool');
  console.log('===================================');
  console.log(`User ID: ${USER_ID}`);
  console.log(`Project: ${PROJECT_ID}`);
  console.log('');

  try {
    // Step 1: Debug current subscription
    console.log('📋 Step 1: Debug Current Subscription');
    console.log('=====================================');
    const debugResult = await debugUserSubscription();
    
    if (debugResult) {
      console.log('Current subscription data:', debugResult);
    }
    
    console.log('');
    
    // Step 2: Get Stripe status
    console.log('📋 Step 2: Check Stripe Status');
    console.log('==============================');
    const stripeStatus = await getStripeSubscriptionStatus();
    
    if (stripeStatus) {
      console.log('Stripe subscription status:', stripeStatus);
    }
    
    console.log('');
    
    // Step 3: Manual sync
    console.log('📋 Step 3: Manual Sync');
    console.log('======================');
    const syncResult = await manualSyncSubscription();
    
    if (syncResult) {
      console.log('Manual sync result:', syncResult);
    }
    
    console.log('');
    
    // Step 4: Emergency fix if needed
    if (!syncResult || syncResult.error) {
      console.log('📋 Step 4: Emergency Fix');
      console.log('========================');
      const fixResult = await emergencySubscriptionFix();
      
      if (fixResult) {
        console.log('Emergency fix result:', fixResult);
      }
    }
    
    console.log('');
    console.log('🎯 SUMMARY');
    console.log('==========');
    console.log('1. Check the subscription status in the app');
    console.log('2. Try generating a workout to test unlimited access');
    console.log('3. If issues persist, check Firebase Functions logs');
    console.log('4. Verify Stripe dashboard for payment status');
    
  } catch (error) {
    console.error('❌ Debug process failed:', error);
  }
}

// Run the debug tool
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { debugUserSubscription, manualSyncSubscription, emergencySubscriptionFix };
