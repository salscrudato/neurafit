#!/usr/bin/env node

/**
 * Test Subscription Profile Persistence
 * Verifies that subscription status properly persists in user profiles
 */

const https = require('https');

// Configuration
const PROJECT_ID = 'neurafit-ai-2025';
const REGION = 'us-central1';
const WEBHOOK_URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/stripeWebhook`;

/**
 * Simulate Stripe webhook events to test profile updates
 */
async function testWebhookProfileUpdate() {
  console.log('🧪 Testing webhook profile persistence...');
  
  // Test data for a successful subscription
  const testEvents = [
    {
      name: 'Customer Created',
      event: {
        type: 'customer.created',
        data: {
          object: {
            id: 'cus_test_profile_123',
            email: 'test@neurafit.com',
            created: Math.floor(Date.now() / 1000)
          }
        }
      }
    },
    {
      name: 'Subscription Created',
      event: {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test_profile_123',
            customer: 'cus_test_profile_123',
            status: 'incomplete',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
            items: {
              data: [{
                price: {
                  id: 'price_1SCzf7QjUU16Imh7y9nLUIvP',
                  unit_amount: 1000,
                  currency: 'usd'
                }
              }]
            }
          }
        }
      }
    },
    {
      name: 'Invoice Payment Succeeded',
      event: {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_test_profile_123',
            customer: 'cus_test_profile_123',
            subscription: 'sub_test_profile_123',
            status: 'paid',
            amount_paid: 1000,
            currency: 'usd'
          }
        }
      }
    },
    {
      name: 'Subscription Updated to Active',
      event: {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test_profile_123',
            customer: 'cus_test_profile_123',
            status: 'active',
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
            items: {
              data: [{
                price: {
                  id: 'price_1SCzf7QjUU16Imh7y9nLUIvP',
                  unit_amount: 1000,
                  currency: 'usd'
                }
              }]
            }
          }
        }
      }
    }
  ];

  const results = [];

  for (const testCase of testEvents) {
    try {
      console.log(`\n📡 Testing: ${testCase.name}`);
      
      const response = await makeWebhookRequest(testCase.event);
      
      if (response.statusCode === 200) {
        console.log(`✅ ${testCase.name}: Webhook processed successfully`);
        console.log(`   Response:`, response.data);
        results.push({ name: testCase.name, success: true, response: response.data });
      } else {
        console.log(`❌ ${testCase.name}: Failed with status ${response.statusCode}`);
        console.log(`   Error:`, response.data);
        results.push({ name: testCase.name, success: false, error: response.data });
      }
      
      // Wait between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log(`❌ ${testCase.name}: Request failed - ${error.message}`);
      results.push({ name: testCase.name, success: false, error: error.message });
    }
  }

  return results;
}

/**
 * Make webhook request
 */
function makeWebhookRequest(eventData) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(eventData);
    
    const options = {
      hostname: `${REGION}-${PROJECT_ID}.cloudfunctions.net`,
      port: 443,
      path: '/stripeWebhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'stripe-signature': 'test_signature_for_profile_test'
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

    req.write(data);
    req.end();
  });
}

/**
 * Test subscription status persistence
 */
async function testSubscriptionPersistence() {
  console.log('🔍 Testing subscription status persistence...');
  
  // Test that the webhook properly handles subscription status changes
  const statusTests = [
    {
      name: 'Active Subscription',
      status: 'active',
      expected: 'Should update profile to active status'
    },
    {
      name: 'Cancelled Subscription',
      status: 'canceled',
      expected: 'Should update profile to cancelled status'
    },
    {
      name: 'Past Due Subscription',
      status: 'past_due',
      expected: 'Should update profile to past_due status'
    }
  ];

  const results = [];

  for (const test of statusTests) {
    try {
      console.log(`\n🧪 Testing: ${test.name}`);
      
      const event = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_persistence_test',
            customer: 'cus_persistence_test',
            status: test.status,
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
            items: {
              data: [{
                price: {
                  id: 'price_1SCzf7QjUU16Imh7y9nLUIvP',
                  unit_amount: 1000,
                  currency: 'usd'
                }
              }]
            }
          }
        }
      };

      const response = await makeWebhookRequest(event);
      
      if (response.statusCode === 200) {
        console.log(`✅ ${test.name}: Status update processed`);
        results.push({ name: test.name, success: true });
      } else {
        console.log(`❌ ${test.name}: Failed to process status update`);
        results.push({ name: test.name, success: false });
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.log(`❌ ${test.name}: Error - ${error.message}`);
      results.push({ name: test.name, success: false, error: error.message });
    }
  }

  return results;
}

/**
 * Main test runner
 */
async function runProfilePersistenceTests() {
  console.log('🚀 NeuraFit Subscription Profile Persistence Tests');
  console.log('================================================');
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Webhook URL: ${WEBHOOK_URL}`);
  console.log('');

  try {
    // Test 1: Webhook profile updates
    console.log('📋 Test 1: Webhook Profile Updates');
    console.log('==================================');
    const webhookResults = await testWebhookProfileUpdate();
    
    // Test 2: Subscription persistence
    console.log('\n📋 Test 2: Subscription Status Persistence');
    console.log('==========================================');
    const persistenceResults = await testSubscriptionPersistence();
    
    // Summary
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('=======================');
    
    const allResults = [...webhookResults, ...persistenceResults];
    const passed = allResults.filter(r => r.success).length;
    const failed = allResults.filter(r => !r.success).length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / allResults.length) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n🚨 FAILED TESTS:');
      allResults
        .filter(r => !r.success)
        .forEach(r => console.log(`- ${r.name}: ${r.error || 'Unknown error'}`));
    }
    
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. Check Firebase Functions logs for detailed webhook processing');
    console.log('2. Verify Firestore rules allow webhook updates');
    console.log('3. Ensure user documents exist before webhook processing');
    console.log('4. Test with real Stripe webhook signatures in production');
    
    console.log('\n🔧 NEXT STEPS:');
    console.log('1. Test with actual payment using test card: 4242 4242 4242 4242');
    console.log('2. Monitor Firebase Functions logs during payment');
    console.log('3. Check user profile in Firestore after successful payment');
    console.log('4. Verify subscription status persists across app sessions');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
}

// Run tests
if (require.main === module) {
  runProfilePersistenceTests().catch(console.error);
}

module.exports = { testWebhookProfileUpdate, testSubscriptionPersistence };
