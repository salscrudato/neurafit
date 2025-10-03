#!/usr/bin/env node

/**
 * Test the complete payment flow to identify where it's failing
 */

const https = require('https');

// Configuration
const PROJECT_ID = 'neurafit-ai-2025';
const REGION = 'us-central1';

/**
 * Simulate a successful payment webhook
 */
async function simulatePaymentSuccess() {
  console.log('🧪 Simulating successful payment webhook...');
  
  const webhookData = {
    type: 'invoice.payment_succeeded',
    data: {
      object: {
        id: 'in_test_payment_success',
        customer: 'cus_TAHzaYodCxSwti', // Your actual customer ID from logs
        subscription: 'sub_1SE5HtQjUU16Imh79VbOIM2o', // Your actual subscription ID from logs
        status: 'paid',
        amount_paid: 1000,
        currency: 'usd',
        payment_intent: 'pi_test_payment_success'
      }
    }
  };

  try {
    const response = await makeWebhookRequest(webhookData);
    
    if (response.statusCode === 200) {
      console.log('✅ Payment success webhook processed:', response.data);
      return true;
    } else {
      console.log('❌ Payment success webhook failed:', response.statusCode, response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error simulating payment success:', error.message);
    return false;
  }
}

/**
 * Simulate subscription update to active
 */
async function simulateSubscriptionActive() {
  console.log('🧪 Simulating subscription update to active...');
  
  const webhookData = {
    type: 'customer.subscription.updated',
    data: {
      object: {
        id: 'sub_1SE5HtQjUU16Imh79VbOIM2o', // Your actual subscription ID
        customer: 'cus_TAHzaYodCxSwti', // Your actual customer ID
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
        cancel_at_period_end: false,
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

  try {
    const response = await makeWebhookRequest(webhookData);
    
    if (response.statusCode === 200) {
      console.log('✅ Subscription active webhook processed:', response.data);
      return true;
    } else {
      console.log('❌ Subscription active webhook failed:', response.statusCode, response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error simulating subscription active:', error.message);
    return false;
  }
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
        'stripe-signature': 'test_signature_for_payment_flow_test'
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
 * Test webhook endpoint health
 */
async function testWebhookHealth() {
  console.log('🏥 Testing webhook endpoint health...');
  
  const testData = {
    type: 'ping',
    data: { object: { test: true } }
  };

  try {
    const response = await makeWebhookRequest(testData);
    
    if (response.statusCode === 200) {
      console.log('✅ Webhook endpoint is healthy:', response.data);
      return true;
    } else {
      console.log('⚠️ Webhook endpoint response:', response.statusCode, response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Webhook endpoint error:', error.message);
    return false;
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('🚀 NeuraFit Payment Flow Test');
  console.log('=============================');
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Customer ID: cus_TAHzaYodCxSwti`);
  console.log(`Subscription ID: sub_1SE5HtQjUU16Imh79VbOIM2o`);
  console.log('');

  try {
    // Test 1: Webhook health
    console.log('📋 Test 1: Webhook Health Check');
    console.log('===============================');
    const healthCheck = await testWebhookHealth();
    
    if (!healthCheck) {
      console.log('❌ Webhook endpoint is not healthy, stopping tests');
      return;
    }
    
    console.log('');
    
    // Test 2: Simulate payment success
    console.log('📋 Test 2: Simulate Payment Success');
    console.log('===================================');
    const paymentSuccess = await simulatePaymentSuccess();
    
    console.log('');
    
    // Test 3: Simulate subscription activation
    console.log('📋 Test 3: Simulate Subscription Activation');
    console.log('===========================================');
    const subscriptionActive = await simulateSubscriptionActive();
    
    console.log('');
    console.log('🎯 TEST RESULTS');
    console.log('===============');
    console.log(`Webhook Health: ${healthCheck ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Payment Success: ${paymentSuccess ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Subscription Active: ${subscriptionActive ? '✅ PASS' : '❌ FAIL'}`);
    
    if (paymentSuccess && subscriptionActive) {
      console.log('');
      console.log('🎉 SUCCESS! The webhook processing is working correctly.');
      console.log('Your subscription should now be active in the app.');
      console.log('');
      console.log('Next steps:');
      console.log('1. Refresh the app in your browser');
      console.log('2. Check if you can generate unlimited workouts');
      console.log('3. Verify subscription status shows as "active"');
    } else {
      console.log('');
      console.log('⚠️ Some tests failed. Check the error messages above.');
      console.log('The subscription status may not be updating properly.');
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
}

// Run the tests
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { simulatePaymentSuccess, simulateSubscriptionActive, testWebhookHealth };
