/**
 * Firestore Security Rules Tests
 *
 * Tests for SEC-01: Lock down Firestore rules
 *
 * Run with: firebase emulators:exec --only firestore "node firestore.rules.test.js"
 * Or manually: firebase emulators:start --only firestore
 *              then run: node firestore.rules.test.js
 */

import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { setLogLevel } from 'firebase/firestore';
import fs from 'fs';

// Disable logging for cleaner test output
setLogLevel('error');

let testEnv;

// Test user IDs
const USER_ID = 'test-user-123';
const OTHER_USER_ID = 'other-user-456';

/**
 * Initialize test environment before all tests
 */
async function setup() {
  console.log('🔧 Setting up test environment...');
  
  testEnv = await initializeTestEnvironment({
    projectId: 'neurafit-test',
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
  
  console.log('✅ Test environment ready\n');
}

/**
 * Clean up after all tests
 */
async function teardown() {
  console.log('\n🧹 Cleaning up test environment...');
  await testEnv.cleanup();
  console.log('✅ Cleanup complete');
}

/**
 * Clear all data between tests
 */
async function beforeEach() {
  await testEnv.clearFirestore();
}

/**
 * Test Suite: Root /workouts/* collection (should be denied)
 */
async function testRootWorkoutsCollection() {
  console.log('📋 Test Suite: Root /workouts/* collection');
  console.log('─'.repeat(60));
  
  // Test 1: Unauthenticated read should fail
  console.log('Test 1: Unauthenticated read of /workouts/test-workout');
  const unauthContext = testEnv.unauthenticatedContext();
  await assertFails(
    unauthContext.firestore().collection('workouts').doc('test-workout').get()
  );
  console.log('✅ PASS: Unauthenticated read denied\n');
  
  // Test 2: Unauthenticated write should fail
  console.log('Test 2: Unauthenticated write to /workouts/test-workout');
  await assertFails(
    unauthContext.firestore().collection('workouts').doc('test-workout').set({
      name: 'Test Workout',
      timestamp: new Date(),
    })
  );
  console.log('✅ PASS: Unauthenticated write denied\n');
  
  // Test 3: Authenticated read should fail
  console.log('Test 3: Authenticated read of /workouts/test-workout');
  const authContext = testEnv.authenticatedContext(USER_ID);
  await assertFails(
    authContext.firestore().collection('workouts').doc('test-workout').get()
  );
  console.log('✅ PASS: Authenticated read denied\n');
  
  // Test 4: Authenticated write should fail
  console.log('Test 4: Authenticated write to /workouts/test-workout');
  await assertFails(
    authContext.firestore().collection('workouts').doc('test-workout').set({
      name: 'Test Workout',
      timestamp: new Date(),
    })
  );
  console.log('✅ PASS: Authenticated write denied\n');
  
  // Test 5: Authenticated list should fail
  console.log('Test 5: Authenticated list of /workouts collection');
  await assertFails(
    authContext.firestore().collection('workouts').get()
  );
  console.log('✅ PASS: Authenticated list denied\n');
}

/**
 * Test Suite: User-scoped /users/{uid}/workouts/* collection (should succeed for owner)
 */
async function testUserWorkoutsCollection() {
  console.log('📋 Test Suite: User-scoped /users/{uid}/workouts/* collection');
  console.log('─'.repeat(60));
  
  const authContext = testEnv.authenticatedContext(USER_ID);
  const otherUserContext = testEnv.authenticatedContext(OTHER_USER_ID);
  
  // Test 1: Owner can write to their own workouts
  console.log('Test 1: Owner writes to /users/{uid}/workouts/workout-1');
  await assertSucceeds(
    authContext.firestore()
      .collection('users').doc(USER_ID)
      .collection('workouts').doc('workout-1')
      .set({
        workoutType: 'Full Body Strength',
        duration: 45,
        timestamp: new Date(),
        exercises: [
          { name: 'Squats', sets: 3, reps: 10 },
          { name: 'Push-ups', sets: 3, reps: 15 },
        ],
      })
  );
  console.log('✅ PASS: Owner can write to their workouts\n');
  
  // Test 2: Owner can read their own workouts
  console.log('Test 2: Owner reads /users/{uid}/workouts/workout-1');
  await assertSucceeds(
    authContext.firestore()
      .collection('users').doc(USER_ID)
      .collection('workouts').doc('workout-1')
      .get()
  );
  console.log('✅ PASS: Owner can read their workouts\n');
  
  // Test 3: Owner can list their own workouts
  console.log('Test 3: Owner lists /users/{uid}/workouts collection');
  await assertSucceeds(
    authContext.firestore()
      .collection('users').doc(USER_ID)
      .collection('workouts')
      .get()
  );
  console.log('✅ PASS: Owner can list their workouts\n');
  
  // Test 4: Owner can update their own workouts
  console.log('Test 4: Owner updates /users/{uid}/workouts/workout-1');
  await assertSucceeds(
    authContext.firestore()
      .collection('users').doc(USER_ID)
      .collection('workouts').doc('workout-1')
      .update({
        duration: 50,
      })
  );
  console.log('✅ PASS: Owner can update their workouts\n');
  
  // Test 5: Owner can delete their own workouts
  console.log('Test 5: Owner deletes /users/{uid}/workouts/workout-1');
  await assertSucceeds(
    authContext.firestore()
      .collection('users').doc(USER_ID)
      .collection('workouts').doc('workout-1')
      .delete()
  );
  console.log('✅ PASS: Owner can delete their workouts\n');
  
  // Test 6: Other user cannot read another user's workouts
  console.log('Test 6: Other user reads /users/{other-uid}/workouts/workout-2');
  await authContext.firestore()
    .collection('users').doc(USER_ID)
    .collection('workouts').doc('workout-2')
    .set({
      workoutType: 'Cardio',
      duration: 30,
      timestamp: new Date(),
    });
  
  await assertFails(
    otherUserContext.firestore()
      .collection('users').doc(USER_ID)
      .collection('workouts').doc('workout-2')
      .get()
  );
  console.log('✅ PASS: Other user cannot read another user\'s workouts\n');
  
  // Test 7: Other user cannot write to another user's workouts
  console.log('Test 7: Other user writes to /users/{other-uid}/workouts/workout-3');
  await assertFails(
    otherUserContext.firestore()
      .collection('users').doc(USER_ID)
      .collection('workouts').doc('workout-3')
      .set({
        workoutType: 'Malicious',
        duration: 1,
        timestamp: new Date(),
      })
  );
  console.log('✅ PASS: Other user cannot write to another user\'s workouts\n');
  
  // Test 8: Unauthenticated user cannot read user workouts
  console.log('Test 8: Unauthenticated read of /users/{uid}/workouts/workout-2');
  const unauthContext = testEnv.unauthenticatedContext();
  await assertFails(
    unauthContext.firestore()
      .collection('users').doc(USER_ID)
      .collection('workouts').doc('workout-2')
      .get()
  );
  console.log('✅ PASS: Unauthenticated user cannot read user workouts\n');
  
  // Test 9: Unauthenticated user cannot write to user workouts
  console.log('Test 9: Unauthenticated write to /users/{uid}/workouts/workout-4');
  await assertFails(
    unauthContext.firestore()
      .collection('users').doc(USER_ID)
      .collection('workouts').doc('workout-4')
      .set({
        workoutType: 'Malicious',
        duration: 1,
        timestamp: new Date(),
      })
  );
  console.log('✅ PASS: Unauthenticated user cannot write to user workouts\n');
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('\n🧪 Starting Firestore Security Rules Tests');
  console.log('='.repeat(60));
  console.log('Project: neurafit-test');
  console.log('Rules file: firestore.rules');
  console.log('='.repeat(60) + '\n');
  
  try {
    await setup();
    
    // Run test suites
    await beforeEach();
    await testRootWorkoutsCollection();
    
    await beforeEach();
    await testUserWorkoutsCollection();
    
    // Summary
    console.log('='.repeat(60));
    console.log('✅ All tests passed!');
    console.log('='.repeat(60));
    console.log('\n✅ SEC-01 Security Requirements Met:');
    console.log('   • Root /workouts/* collection is locked down');
    console.log('   • Only authenticated users can access their own workouts');
    console.log('   • Users cannot access other users\' workouts');
    console.log('   • Unauthenticated access is denied\n');
    
    await teardown();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await teardown();
    process.exit(1);
  }
}

// Run tests
runTests();

