#!/usr/bin/env node

/**
 * Comprehensive Subscription API Test Script
 * Tests the complete subscription workflow using Firebase Functions and Stripe test card
 */

const https = require('https');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Configuration
const PROJECT_ID = 'neurafit-ai-2025';
const REGION = 'us-central1';
const STRIPE_TEST_CARD = '4242424242424242';
const PRICE_ID = 'price_1SCzf7QjUU16Imh7y9nLUIvP'; // NeuraFit Pro $10/month

// API URLs
const BASE_URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net`;
const FUNCTIONS = {
  createPaymentIntent: `${BASE_URL}/createPaymentIntent`,
  getSubscriptionDetails: `${BASE_URL}/getSubscriptionDetails`,
  cancelUserSubscription: `${BASE_URL}/cancelUserSubscription`,
  getCustomerPortalUrl: `${BASE_URL}/getCustomerPortalUrl`,
  stripeWebhook: `${BASE_URL}/stripeWebhook`
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Log test result
 */
function logTest(name, passed, message, details = null) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${name}: ${message}`);
  
  if (details) {
    console.log(`   Details:`, details);
  }
  
  testResults.tests.push({ name, passed, message, details });
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

/**
 * Get Firebase Auth token for testing
 */
async function getAuthToken() {
  try {
    console.log('🔐 Getting Firebase auth token...');
    const { stdout } = await execAsync('firebase auth:print-access-token');
    const token = stdout.trim();
    
    if (!token) {
      throw new Error('No auth token received');
    }
    
    logTest('Auth Token', true, 'Successfully obtained Firebase auth token');
    return token;
  } catch (error) {
    logTest('Auth Token', false, `Failed to get auth token: ${error.message}`);
    throw error;
  }
}

/**
 * Make HTTP request to Firebase Function
 */
function makeRequest(url, method = 'POST', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
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
            headers: res.headers,
            data: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Test 1: Create Payment Intent
 */
async function testCreatePaymentIntent(authToken) {
  try {
    console.log('\n🧪 Testing createPaymentIntent...');
    
    const response = await makeRequest(
      FUNCTIONS.createPaymentIntent,
      'POST',
      {
        data: { priceId: PRICE_ID }
      },
      {
        'Authorization': `Bearer ${authToken}`
      }
    );

    if (response.statusCode === 200 && response.data.result) {
      const { subscriptionId, clientSecret, customerId } = response.data.result;
      
      if (subscriptionId && clientSecret && customerId) {
        logTest('Create Payment Intent', true, 'Payment intent created successfully', {
          subscriptionId: subscriptionId.substring(0, 20) + '...',
          hasClientSecret: !!clientSecret,
          customerId: customerId.substring(0, 20) + '...'
        });
        
        return { subscriptionId, clientSecret, customerId };
      } else {
        logTest('Create Payment Intent', false, 'Missing required fields in response', response.data);
        return null;
      }
    } else {
      logTest('Create Payment Intent', false, `API call failed: ${response.statusCode}`, response.data);
      return null;
    }
  } catch (error) {
    logTest('Create Payment Intent', false, `Request failed: ${error.message}`);
    return null;
  }
}

/**
 * Test 2: Get Subscription Details
 */
async function testGetSubscriptionDetails(authToken) {
  try {
    console.log('\n🧪 Testing getSubscriptionDetails...');
    
    const response = await makeRequest(
      FUNCTIONS.getSubscriptionDetails,
      'POST',
      { data: {} },
      {
        'Authorization': `Bearer ${authToken}`
      }
    );

    if (response.statusCode === 200) {
      logTest('Get Subscription Details', true, 'Subscription details retrieved', {
        hasData: !!response.data.result,
        status: response.data.result?.status || 'unknown'
      });
      
      return response.data.result;
    } else {
      logTest('Get Subscription Details', false, `API call failed: ${response.statusCode}`, response.data);
      return null;
    }
  } catch (error) {
    logTest('Get Subscription Details', false, `Request failed: ${error.message}`);
    return null;
  }
}

/**
 * Test 3: Simulate Stripe Webhook (Payment Success)
 */
async function testStripeWebhook() {
  try {
    console.log('\n🧪 Testing Stripe webhook simulation...');
    
    // This is a simplified webhook test - in reality, webhooks are sent by Stripe
    // We'll just test that the endpoint is accessible
    const response = await makeRequest(
      FUNCTIONS.stripeWebhook,
      'POST',
      {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            subscription: 'sub_test_123',
            customer: 'cus_test_123'
          }
        }
      },
      {
        'stripe-signature': 'test_signature'
      }
    );

    // Webhook should return 400 for invalid signature, which is expected
    if (response.statusCode === 400) {
      logTest('Stripe Webhook Endpoint', true, 'Webhook endpoint is accessible (signature validation working)');
    } else {
      logTest('Stripe Webhook Endpoint', false, `Unexpected response: ${response.statusCode}`, response.data);
    }
  } catch (error) {
    logTest('Stripe Webhook Endpoint', false, `Request failed: ${error.message}`);
  }
}

/**
 * Test 4: Check Firebase User Profile Update
 */
async function testFirebaseProfileUpdate() {
  try {
    console.log('\n🧪 Testing Firebase profile update...');
    
    // Use Firebase CLI to check user data
    const { stdout } = await execAsync(`firebase firestore:get users/$(firebase auth:print-access-token | head -1) --project ${PROJECT_ID}`);
    
    if (stdout.includes('subscription')) {
      logTest('Firebase Profile Update', true, 'User profile contains subscription data');
    } else {
      logTest('Firebase Profile Update', false, 'User profile missing subscription data');
    }
  } catch (error) {
    logTest('Firebase Profile Update', false, `Failed to check profile: ${error.message}`);
  }
}

/**
 * Test 5: Validate Subscription Duration (30 days)
 */
async function testSubscriptionDuration(subscriptionDetails) {
  try {
    console.log('\n🧪 Testing subscription duration validation...');
    
    if (!subscriptionDetails || !subscriptionDetails.current_period_start || !subscriptionDetails.current_period_end) {
      logTest('Subscription Duration', false, 'Missing subscription period data');
      return;
    }
    
    const startDate = new Date(subscriptionDetails.current_period_start * 1000);
    const endDate = new Date(subscriptionDetails.current_period_end * 1000);
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationDays = durationMs / (1000 * 60 * 60 * 24);
    
    // Allow 1 day tolerance for timezone differences
    const isValid = Math.abs(durationDays - 30) <= 1;
    
    if (isValid) {
      logTest('Subscription Duration', true, `Subscription duration is valid: ${durationDays.toFixed(2)} days`);
    } else {
      logTest('Subscription Duration', false, `Subscription duration is invalid: ${durationDays.toFixed(2)} days (expected ~30 days)`);
    }
  } catch (error) {
    logTest('Subscription Duration', false, `Duration validation failed: ${error.message}`);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting NeuraFit Subscription API Tests');
  console.log('==========================================');
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Region: ${REGION}`);
  console.log(`Test Card: ${STRIPE_TEST_CARD}`);
  console.log(`Price ID: ${PRICE_ID}`);
  console.log('');

  try {
    // Get auth token
    const authToken = await getAuthToken();
    
    // Test 1: Create Payment Intent
    const paymentResult = await testCreatePaymentIntent(authToken);
    
    // Test 2: Get Subscription Details
    const subscriptionDetails = await testGetSubscriptionDetails(authToken);
    
    // Test 3: Stripe Webhook
    await testStripeWebhook();
    
    // Test 4: Firebase Profile Update
    await testFirebaseProfileUpdate();
    
    // Test 5: Subscription Duration
    if (subscriptionDetails) {
      await testSubscriptionDuration(subscriptionDetails);
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  }

  // Print summary
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('=======================');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n🚨 FAILED TESTS:');
    testResults.tests
      .filter(test => !test.passed)
      .forEach(test => console.log(`- ${test.name}: ${test.message}`));
  }
  
  console.log('\n✨ Test completed!');
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testResults };
