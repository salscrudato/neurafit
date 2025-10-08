/**
 * Test script for workout generation function
 * Tests the deployed Firebase function with diverse user profiles
 */

const testProfiles = [
  {
    name: "Beginner Female with Knee Injury - Weight Loss",
    payload: {
      experience: "Beginner",
      goals: ["Weight Loss", "General Health"],
      equipment: ["Bodyweight", "Resistance Bands"],
      personalInfo: {
        sex: "Female",
        height: "5'4\"",
        weight: "165 lbs"
      },
      injuries: {
        list: ["Knee"],
        notes: "Previous ACL injury, avoid deep squats and jumping"
      },
      workoutType: "Full Body",
      duration: 30,
      uid: "test-user-1",
      recentWorkouts: []
    }
  },
  {
    name: "Intermediate Male - Build Muscle (with workout history)",
    payload: {
      experience: "Intermediate",
      goals: ["Build Muscle", "Strength"],
      equipment: ["Dumbbells", "Barbells", "Pull-Up Bar"],
      personalInfo: {
        sex: "Male",
        height: "5'11\"",
        weight: "180 lbs"
      },
      injuries: {
        list: [],
        notes: ""
      },
      workoutType: "Push",
      duration: 45,
      uid: "test-user-2",
      recentWorkouts: [
        {
          workoutType: "Push",
          timestamp: Date.now() - (3 * 24 * 60 * 60 * 1000), // 3 days ago
          exercises: [
            { name: "Barbell Bench Press" },
            { name: "Overhead Dumbbell Press" },
            { name: "Incline Dumbbell Press" },
            { name: "Tricep Dips" },
            { name: "Lateral Raises" }
          ]
        },
        {
          workoutType: "Pull",
          timestamp: Date.now() - (5 * 24 * 60 * 60 * 1000), // 5 days ago
          exercises: [
            { name: "Pull-Ups" },
            { name: "Barbell Rows" },
            { name: "Face Pulls" },
            { name: "Bicep Curls" }
          ]
        }
      ]
    }
  },
  {
    name: "Advanced Female - Strength & Performance",
    payload: {
      experience: "Advanced",
      goals: ["Strength", "Sports Performance"],
      equipment: ["Barbells", "Dumbbells", "Kettlebells", "Pull-Up Bar"],
      personalInfo: {
        sex: "Female",
        height: "5'7\"",
        weight: "145 lbs"
      },
      injuries: {
        list: [],
        notes: ""
      },
      workoutType: "Lower Body",
      duration: 60,
      uid: "test-user-3",
      recentWorkouts: []
    }
  },
  {
    name: "Beginner Male with Lower Back Injury - Cardio",
    payload: {
      experience: "Beginner",
      goals: ["Weight Loss", "Stamina", "General Health"],
      equipment: ["Bodyweight"],
      personalInfo: {
        sex: "Male",
        height: "6'0\"",
        weight: "220 lbs"
      },
      injuries: {
        list: ["Lower Back"],
        notes: "Chronic lower back pain, avoid spinal flexion"
      },
      workoutType: "Cardio",
      duration: 20,
      uid: "test-user-4",
      recentWorkouts: []
    }
  },
  {
    name: "Intermediate Female - Flexibility & Mental Health",
    payload: {
      experience: "Intermediate",
      goals: ["Increase Flexibility", "Mental Health", "General Health"],
      equipment: ["Bodyweight", "Resistance Bands"],
      personalInfo: {
        sex: "Female",
        height: "5'5\"",
        weight: "135 lbs"
      },
      injuries: {
        list: [],
        notes: ""
      },
      workoutType: "Yoga",
      duration: 45,
      uid: "test-user-5",
      recentWorkouts: []
    }
  },
  {
    name: "Advanced Male with Shoulder Injury - Back/Biceps",
    payload: {
      experience: "Advanced",
      goals: ["Build Muscle", "Strength"],
      equipment: ["Dumbbells", "Barbells", "Cable Machine", "Pull-Up Bar"],
      personalInfo: {
        sex: "Male",
        height: "6'2\"",
        weight: "195 lbs"
      },
      injuries: {
        list: ["Shoulder"],
        notes: "Rotator cuff impingement, avoid overhead movements"
      },
      workoutType: "Back/Biceps",
      duration: 45,
      uid: "test-user-6",
      recentWorkouts: []
    }
  }
];

async function testWorkoutGeneration() {
  const functionUrl = process.env.VITE_WORKOUT_FN_URL || 
    'https://us-central1-neurafit-ai-2025.cloudfunctions.net/generateWorkout';
  
  console.log('🧪 Testing Workout Generation Function');
  console.log('📍 Function URL:', functionUrl);
  console.log('=' .repeat(80));
  console.log('');

  const results = [];

  for (const profile of testProfiles) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🏋️  Testing: ${profile.name}`);
    console.log(`${'='.repeat(80)}`);
    console.log('Profile:', JSON.stringify(profile.payload, null, 2));
    console.log('');

    try {
      const startTime = Date.now();
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile.payload),
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Error: ${response.status} ${response.statusText}`);
        console.error('Response:', errorText);
        results.push({
          profile: profile.name,
          success: false,
          error: `${response.status}: ${errorText}`,
          duration
        });
        continue;
      }

      const workout = await response.json();
      
      console.log(`✅ Success! Generated in ${duration}ms`);
      console.log('');
      console.log('📊 QUALITY METRICS:');
      console.log(`   Overall Score: ${workout.metadata?.qualityScore?.overall || 'N/A'}/100`);
      console.log(`   Grade: ${workout.metadata?.qualityScore?.grade || 'N/A'}`);
      console.log(`   Method: ${workout.metadata?.qualityScore?.method || 'N/A'}`);
      console.log('');
      console.log('🏋️  WORKOUT DETAILS:');
      console.log(`   Exercise Count: ${workout.exercises?.length || 0}`);
      console.log(`   Exercises:`);
      (workout.exercises || []).forEach((ex, i) => {
        console.log(`      ${i + 1}. ${ex.name} - ${ex.sets}x${ex.reps} (${ex.restSeconds}s rest)`);
        console.log(`         Uses Weight: ${ex.usesWeight ? 'Yes' : 'No'}`);
        console.log(`         Difficulty: ${ex.difficulty || 'N/A'}`);
        console.log(`         Muscle Groups: ${ex.muscleGroups?.join(', ') || 'N/A'}`);
      });
      console.log('');
      console.log('📝 WORKOUT SUMMARY:');
      if (workout.workoutSummary) {
        console.log(`   Total Volume: ${workout.workoutSummary.totalVolume}`);
        console.log(`   Primary Focus: ${workout.workoutSummary.primaryFocus}`);
        console.log(`   Expected RPE: ${workout.workoutSummary.expectedRPE}`);
      }

      results.push({
        profile: profile.name,
        success: true,
        duration,
        qualityScore: workout.metadata?.qualityScore?.overall || 0,
        grade: workout.metadata?.qualityScore?.grade || 'N/A',
        exerciseCount: workout.exercises?.length || 0
      });

    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      results.push({
        profile: profile.name,
        success: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n\n');
  console.log('='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log('');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log('');

  if (successful.length > 0) {
    const avgScore = successful.reduce((sum, r) => sum + r.qualityScore, 0) / successful.length;
    const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
    
    console.log(`Average Quality Score: ${avgScore.toFixed(1)}/100`);
    console.log(`Average Generation Time: ${avgDuration.toFixed(0)}ms`);
    console.log('');
    console.log('Individual Results:');
    successful.forEach(r => {
      console.log(`  ${r.profile}`);
      console.log(`    Score: ${r.qualityScore}/100 | Grade: ${r.grade} | Exercises: ${r.exerciseCount}`);
    });
  }

  if (failed.length > 0) {
    console.log('');
    console.log('Failed Tests:');
    failed.forEach(r => {
      console.log(`  ${r.profile}: ${r.error}`);
    });
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('✅ Testing Complete!');
  console.log('='.repeat(80));
}

// Run the tests
testWorkoutGeneration().catch(console.error);

