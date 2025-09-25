#!/usr/bin/env node

/**
 * Test script for NeuraFit workout completion flow
 * This script tests the workout completion and history retrieval using Firebase REST API
 */

const https = require('https');
const fs = require('fs');

// Firebase project configuration
const PROJECT_ID = 'neurafit-ai-2025';
const API_KEY = 'AIzaSyAKo_Bf8aPCWSPM9Nigcnga1t6_Psi70T8';

// Test user ID (you'll need to replace this with a real user ID from your Firebase Auth)
const TEST_USER_ID = 'test-user-123';

// Sample workout data that simulates a completed workout
const sampleWorkoutData = {
  timestamp: new Date().toISOString(),
  workoutType: "Upper Body Strength",
  duration: 45,
  plannedDuration: 45,
  exercises: [
    {
      name: "Push-ups",
      description: "Classic bodyweight exercise for chest, shoulders, and triceps",
      sets: 3,
      reps: 12,
      usesWeight: false,
      formTips: ["Keep your body straight", "Lower chest to floor", "Push up explosively"],
      safetyTips: ["Don't let hips sag", "Keep core engaged"],
      restSeconds: 60,
      // Simulated completion: Set 1 completed (0), Set 2 completed (0), Set 3 skipped (null)
      weights: {
        1: 0,  // Completed without weight
        2: 0,  // Completed without weight  
        3: null // Skipped
      }
    },
    {
      name: "Dumbbell Bench Press",
      description: "Compound exercise targeting chest, shoulders, and triceps",
      sets: 4,
      reps: 10,
      usesWeight: true,
      formTips: ["Control the weight", "Full range of motion", "Squeeze chest at top"],
      safetyTips: ["Use spotter if needed", "Don't bounce weight off chest"],
      restSeconds: 90,
      // Simulated completion: All sets completed with different weights
      weights: {
        1: 135, // Completed with 135lbs
        2: 135, // Completed with 135lbs
        3: 140, // Completed with 140lbs
        4: 140  // Completed with 140lbs
      }
    },
    {
      name: "Shoulder Press",
      description: "Overhead pressing movement for shoulder development",
      sets: 3,
      reps: 12,
      usesWeight: true,
      formTips: ["Press straight up", "Keep core tight", "Control the descent"],
      safetyTips: ["Don't arch back excessively", "Warm up shoulders first"],
      restSeconds: 75,
      // Simulated completion: Mixed completion
      weights: {
        1: 65,  // Completed with 65lbs
        2: null, // Skipped
        3: 70   // Completed with 70lbs
      }
    }
  ]
};

/**
 * Make HTTP request to Firebase REST API
 */
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'firestore.googleapis.com',
      port: 443,
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents${path}?key=${API_KEY}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${responseData}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Convert JavaScript object to Firestore document format
 */
function toFirestoreDocument(obj) {
  const result = { fields: {} };
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === null) {
      result.fields[key] = { nullValue: null };
    } else if (typeof value === 'string') {
      result.fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      result.fields[key] = { integerValue: value.toString() };
    } else if (typeof value === 'boolean') {
      result.fields[key] = { booleanValue: value };
    } else if (Array.isArray(value)) {
      result.fields[key] = {
        arrayValue: {
          values: value.map(item => {
            if (typeof item === 'object') {
              return { mapValue: toFirestoreDocument(item) };
            } else {
              return toFirestoreDocument({ temp: item }).fields.temp;
            }
          })
        }
      };
    } else if (typeof value === 'object') {
      result.fields[key] = { mapValue: toFirestoreDocument(value) };
    }
  }
  
  return result;
}

/**
 * Convert Firestore document format to JavaScript object
 */
function fromFirestoreDocument(doc) {
  if (!doc.fields) return {};
  
  const result = {};
  
  for (const [key, value] of Object.entries(doc.fields)) {
    if (value.nullValue !== undefined) {
      result[key] = null;
    } else if (value.stringValue !== undefined) {
      result[key] = value.stringValue;
    } else if (value.integerValue !== undefined) {
      result[key] = parseInt(value.integerValue);
    } else if (value.doubleValue !== undefined) {
      result[key] = parseFloat(value.doubleValue);
    } else if (value.booleanValue !== undefined) {
      result[key] = value.booleanValue;
    } else if (value.arrayValue !== undefined) {
      result[key] = value.arrayValue.values.map(item => {
        if (item.mapValue) {
          return fromFirestoreDocument(item.mapValue);
        } else {
          return fromFirestoreDocument({ fields: { temp: item } }).temp;
        }
      });
    } else if (value.mapValue !== undefined) {
      result[key] = fromFirestoreDocument(value.mapValue);
    }
  }
  
  return result;
}

/**
 * Test workout completion by creating a workout document
 */
async function testWorkoutCompletion() {
  console.log('🧪 Testing workout completion...');
  
  try {
    // Convert to Firestore format
    const firestoreDoc = toFirestoreDocument(sampleWorkoutData);
    
    // Create workout document
    const response = await makeRequest(
      'POST',
      `/users/${TEST_USER_ID}/workouts`,
      firestoreDoc
    );
    
    console.log('✅ Workout saved successfully!');
    console.log('📄 Document ID:', response.name.split('/').pop());
    
    return response.name.split('/').pop();
  } catch (error) {
    console.error('❌ Failed to save workout:', error.message);
    throw error;
  }
}

/**
 * Test workout history retrieval
 */
async function testWorkoutHistoryRetrieval() {
  console.log('🧪 Testing workout history retrieval...');
  
  try {
    const response = await makeRequest('GET', `/users/${TEST_USER_ID}/workouts`);
    
    if (!response.documents || response.documents.length === 0) {
      console.log('📭 No workouts found for user');
      return [];
    }
    
    console.log(`✅ Retrieved ${response.documents.length} workout(s)`);
    
    // Convert and analyze each workout
    const workouts = response.documents.map(doc => {
      const data = fromFirestoreDocument(doc);
      const docId = doc.name.split('/').pop();
      return { id: docId, ...data };
    });
    
    // Analyze completion data
    workouts.forEach((workout, index) => {
      console.log(`\n📋 Workout ${index + 1}: ${workout.workoutType}`);
      console.log(`⏱️  Duration: ${workout.duration} minutes`);
      
      if (workout.exercises) {
        workout.exercises.forEach((exercise, exerciseIndex) => {
          console.log(`\n  🏋️  Exercise ${exerciseIndex + 1}: ${exercise.name}`);
          
          if (exercise.weights) {
            let completedSets = 0;
            let totalWeight = 0;
            let weightCount = 0;
            
            Object.entries(exercise.weights).forEach(([setNum, weight]) => {
              const status = weight === null ? 'SKIPPED' : weight === 0 ? 'COMPLETED (no weight)' : `COMPLETED (${weight}lbs)`;
              console.log(`    Set ${setNum}: ${status}`);
              
              if (weight !== null) {
                completedSets++;
                if (weight > 0) {
                  totalWeight += weight;
                  weightCount++;
                }
              }
            });
            
            console.log(`    📊 Completed: ${completedSets}/${exercise.sets} sets`);
            if (weightCount > 0) {
              console.log(`    📈 Average weight: ${Math.round(totalWeight / weightCount)}lbs`);
            }
          } else {
            console.log('    ⚠️  No weight data found');
          }
        });
      }
    });
    
    return workouts;
  } catch (error) {
    console.error('❌ Failed to retrieve workout history:', error.message);
    throw error;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting NeuraFit workout completion tests...\n');
  
  try {
    // Test 1: Workout completion
    const workoutId = await testWorkoutCompletion();
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 2: Workout history retrieval
    const workouts = await testWorkoutHistoryRetrieval();
    
    console.log('\n' + '='.repeat(50) + '\n');
    console.log('✅ All tests completed successfully!');
    console.log(`📊 Total workouts in database: ${workouts.length}`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testWorkoutCompletion,
  testWorkoutHistoryRetrieval,
  runTests
};
