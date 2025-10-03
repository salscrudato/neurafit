#!/usr/bin/env node

/**
 * Subscription Profile Validation Script
 * Validates that subscription data is properly stored and updated in Firebase
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://neurafit-ai-2025-default-rtdb.firebaseapp.com'
});

const db = admin.firestore();

/**
 * Test subscription profile validation
 */
async function validateSubscriptionProfile(userId) {
  try {
    console.log('🔍 Validating subscription profile for user:', userId);
    
    // Get user document
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.log('❌ User document not found');
      return false;
    }
    
    const userData = userDoc.data();
    const subscription = userData.subscription;
    
    if (!subscription) {
      console.log('❌ No subscription data found');
      return false;
    }
    
    console.log('✅ Subscription data found:');
    console.log('   Status:', subscription.status || 'unknown');
    console.log('   Customer ID:', subscription.customerId ? 'present' : 'missing');
    console.log('   Subscription ID:', subscription.subscriptionId ? 'present' : 'missing');
    console.log('   Free Workout Limit:', subscription.freeWorkoutLimit || 'not set');
    console.log('   Free Workouts Used:', subscription.freeWorkoutsUsed || 0);
    console.log('   Workout Count:', subscription.workoutCount || 0);
    console.log('   Updated At:', subscription.updatedAt ? new Date(subscription.updatedAt).toISOString() : 'not set');
    
    // Validate free trial implementation
    const expectedFreeLimit = 10;
    if (subscription.freeWorkoutLimit !== expectedFreeLimit) {
      console.log(`⚠️  Free workout limit is ${subscription.freeWorkoutLimit}, expected ${expectedFreeLimit}`);
    } else {
      console.log('✅ Free workout limit is correct (10)');
    }
    
    // Validate subscription duration if active
    if (subscription.status === 'active' && subscription.currentPeriodStart && subscription.currentPeriodEnd) {
      const duration = subscription.currentPeriodEnd - subscription.currentPeriodStart;
      const durationDays = duration / (1000 * 60 * 60 * 24);
      
      if (Math.abs(durationDays - 30) <= 1) {
        console.log(`✅ Subscription duration is valid: ${durationDays.toFixed(2)} days`);
      } else {
        console.log(`⚠️  Subscription duration is ${durationDays.toFixed(2)} days, expected ~30 days`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error validating subscription profile:', error);
    return false;
  }
}

/**
 * List all users with subscription data
 */
async function listUsersWithSubscriptions() {
  try {
    console.log('📋 Listing users with subscription data...');
    
    const usersSnapshot = await db.collection('users').get();
    const usersWithSubscriptions = [];
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.subscription) {
        usersWithSubscriptions.push({
          id: doc.id,
          email: userData.email || 'unknown',
          status: userData.subscription.status || 'unknown',
          freeWorkoutsUsed: userData.subscription.freeWorkoutsUsed || 0,
          workoutCount: userData.subscription.workoutCount || 0
        });
      }
    });
    
    console.log(`Found ${usersWithSubscriptions.length} users with subscription data:`);
    usersWithSubscriptions.forEach(user => {
      console.log(`   ${user.email} (${user.id.substring(0, 8)}...): ${user.status}, ${user.freeWorkoutsUsed}/10 free workouts used`);
    });
    
    return usersWithSubscriptions;
  } catch (error) {
    console.error('❌ Error listing users:', error);
    return [];
  }
}

/**
 * Validate subscription system health
 */
async function validateSystemHealth() {
  try {
    console.log('🏥 Validating subscription system health...');
    
    const users = await listUsersWithSubscriptions();
    
    if (users.length === 0) {
      console.log('⚠️  No users with subscription data found');
      return false;
    }
    
    // Check for common issues
    let issues = 0;
    
    users.forEach(user => {
      // Check for invalid free workout limits
      if (user.freeWorkoutLimit && user.freeWorkoutLimit !== 10) {
        console.log(`⚠️  User ${user.email} has incorrect free workout limit: ${user.freeWorkoutLimit}`);
        issues++;
      }
      
      // Check for impossible workout counts
      if (user.freeWorkoutsUsed > 10) {
        console.log(`⚠️  User ${user.email} has used more free workouts than allowed: ${user.freeWorkoutsUsed}`);
        issues++;
      }
    });
    
    if (issues === 0) {
      console.log('✅ System health check passed - no issues found');
      return true;
    } else {
      console.log(`⚠️  System health check found ${issues} issues`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error validating system health:', error);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 NeuraFit Subscription Profile Validation');
  console.log('==========================================');
  
  try {
    // List all users with subscriptions
    const users = await listUsersWithSubscriptions();
    
    if (users.length > 0) {
      console.log('\n🔍 Validating individual profiles...');
      
      // Validate each user's subscription profile
      for (const user of users.slice(0, 3)) { // Limit to first 3 users
        console.log(`\n--- User: ${user.email} ---`);
        await validateSubscriptionProfile(user.id);
      }
    }
    
    // Validate overall system health
    console.log('\n🏥 System Health Check...');
    const healthCheck = await validateSystemHealth();
    
    console.log('\n📊 Validation Summary');
    console.log('====================');
    console.log(`Users with subscriptions: ${users.length}`);
    console.log(`System health: ${healthCheck ? '✅ Healthy' : '⚠️  Issues found'}`);
    
    if (users.length === 0) {
      console.log('\n💡 To test the subscription system:');
      console.log('1. Open http://localhost:5174/ in your browser');
      console.log('2. Sign up or log in');
      console.log('3. Generate workouts until you hit the free limit');
      console.log('4. Subscribe using test card: 4242 4242 4242 4242');
      console.log('5. Run this script again to validate the profile updates');
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
  } finally {
    process.exit(0);
  }
}

// Check if service account key exists
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const fs = require('fs');

if (!fs.existsSync(serviceAccountPath)) {
  console.log('❌ Service account key not found at:', serviceAccountPath);
  console.log('💡 To get the service account key:');
  console.log('1. Go to Firebase Console > Project Settings > Service Accounts');
  console.log('2. Click "Generate new private key"');
  console.log('3. Save as serviceAccountKey.json in the project root');
  console.log('4. Run this script again');
  process.exit(1);
}

// Run the validation
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { validateSubscriptionProfile, listUsersWithSubscriptions, validateSystemHealth };
