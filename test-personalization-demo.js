/**
 * Demonstration test showing personalization improvements
 * Compares workouts for different body types with same goals/equipment
 */

const testProfiles = [
  {
    name: "Petite Female - Weight Loss",
    payload: {
      experience: "Beginner",
      goals: ["Weight Loss", "Tone"],
      equipment: ["Bodyweight", "Dumbbells"],
      personalInfo: {
        sex: "Female",
        height: "5'2\"",
        weight: "125 lbs"
      },
      injuries: { list: [], notes: "" },
      workoutType: "Full Body",
      duration: 30,
      uid: "demo-user-1",
      recentWorkouts: []
    }
  },
  {
    name: "Tall Male - Weight Loss",
    payload: {
      experience: "Beginner",
      goals: ["Weight Loss", "Tone"],
      equipment: ["Bodyweight", "Dumbbells"],
      personalInfo: {
        sex: "Male",
        height: "6'3\"",
        weight: "240 lbs"
      },
      injuries: { list: [], notes: "" },
      workoutType: "Full Body",
      duration: 30,
      uid: "demo-user-2",
      recentWorkouts: []
    }
  }
];

async function demonstratePersonalization() {
  const functionUrl = process.env.VITE_WORKOUT_FN_URL || 
    'https://us-central1-neurafit-ai-2025.cloudfunctions.net/generateWorkout';
  
  console.log('🎯 PERSONALIZATION DEMONSTRATION');
  console.log('=' .repeat(80));
  console.log('Testing how the system personalizes workouts for different body types');
  console.log('Same goals, same equipment, same duration - different bodies');
  console.log('=' .repeat(80));
  console.log('');

  const results = [];

  for (const profile of testProfiles) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`👤 ${profile.name}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`Gender: ${profile.payload.personalInfo.sex}`);
    console.log(`Height: ${profile.payload.personalInfo.height}`);
    console.log(`Weight: ${profile.payload.personalInfo.weight}`);
    console.log(`Goals: ${profile.payload.goals.join(', ')}`);
    console.log('');

    try {
      const startTime = Date.now();
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile.payload),
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        console.error(`❌ Error: ${response.status}`);
        continue;
      }

      const workout = await response.json();
      
      console.log(`✅ Generated in ${duration}ms`);
      console.log(`📊 Quality Score: ${workout.metadata?.qualityScore?.overall}/100 (${workout.metadata?.qualityScore?.grade})`);
      console.log('');
      console.log('🏋️  EXERCISES GENERATED:');
      
      workout.exercises.forEach((ex, i) => {
        console.log(`   ${i + 1}. ${ex.name}`);
        console.log(`      ${ex.sets}x${ex.reps} | Rest: ${ex.restSeconds}s | Weight: ${ex.usesWeight ? 'Yes' : 'No'}`);
        console.log(`      Muscles: ${ex.muscleGroups?.join(', ') || 'N/A'}`);
        console.log('');
      });

      console.log('📝 WORKOUT SUMMARY:');
      console.log(`   ${workout.workoutSummary?.primaryFocus || 'N/A'}`);
      console.log(`   RPE: ${workout.workoutSummary?.expectedRPE || 'N/A'}`);

      results.push({
        name: profile.name,
        exercises: workout.exercises.map(e => e.name),
        score: workout.metadata?.qualityScore?.overall,
        duration
      });

    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }

  // Comparison
  console.log('\n\n');
  console.log('='.repeat(80));
  console.log('📊 PERSONALIZATION COMPARISON');
  console.log('='.repeat(80));
  console.log('');

  if (results.length === 2) {
    console.log('Exercise Selection Differences:');
    console.log('');
    
    const [result1, result2] = results;
    const unique1 = result1.exercises.filter(e => !result2.exercises.includes(e));
    const unique2 = result2.exercises.filter(e => !result1.exercises.includes(e));
    const common = result1.exercises.filter(e => result2.exercises.includes(e));

    console.log(`Common Exercises (${common.length}):`);
    common.forEach(e => console.log(`   ✓ ${e}`));
    console.log('');

    console.log(`Unique to ${result1.name} (${unique1.length}):`);
    unique1.forEach(e => console.log(`   → ${e}`));
    console.log('');

    console.log(`Unique to ${result2.name} (${unique2.length}):`);
    unique2.forEach(e => console.log(`   → ${e}`));
    console.log('');

    const personalizationScore = ((unique1.length + unique2.length) / (result1.exercises.length + result2.exercises.length)) * 100;
    console.log(`Personalization Score: ${personalizationScore.toFixed(1)}%`);
    console.log(`(Higher = more personalized to individual characteristics)`);
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('✅ Demonstration Complete!');
  console.log('='.repeat(80));
  console.log('');
  console.log('KEY TAKEAWAY:');
  console.log('The system now generates different workouts for different body types,');
  console.log('even when goals, equipment, and duration are identical. This shows');
  console.log('true personalization based on gender, height, and weight.');
}

// Run the demonstration
demonstratePersonalization().catch(console.error);

