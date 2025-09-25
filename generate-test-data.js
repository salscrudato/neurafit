#!/usr/bin/env node

/**
 * Generate Test Data for NeuraFit Workout Completion Testing
 * This script creates sample workout data that can be manually added to test the system
 */

import fs from 'fs';

// Generate sample workout data with various completion scenarios
function generateTestWorkouts() {
  const workouts = [
    {
      workoutType: "Upper Body Strength",
      duration: 45,
      plannedDuration: 45,
      timestamp: new Date(Date.now() - 86400000 * 2), // 2 days ago
      exercises: [
        {
          name: "Push-ups",
          sets: 3,
          reps: 12,
          usesWeight: false,
          description: "Classic bodyweight exercise for chest, shoulders, and triceps",
          formTips: ["Keep your body straight", "Lower chest to floor", "Push up explosively"],
          safetyTips: ["Don't let hips sag", "Keep core engaged"],
          restSeconds: 60,
          weights: {
            1: 0,    // Completed without weight
            2: 0,    // Completed without weight
            3: null  // Skipped
          }
        },
        {
          name: "Dumbbell Bench Press",
          sets: 4,
          reps: 10,
          usesWeight: true,
          description: "Compound exercise targeting chest, shoulders, and triceps",
          formTips: ["Control the weight", "Full range of motion", "Squeeze chest at top"],
          safetyTips: ["Use spotter if needed", "Don't bounce weight off chest"],
          restSeconds: 90,
          weights: {
            1: 135,  // Completed with weight
            2: 135,  // Completed with weight
            3: 140,  // Completed with weight
            4: 140   // Completed with weight
          }
        },
        {
          name: "Shoulder Press",
          sets: 3,
          reps: 12,
          usesWeight: true,
          description: "Overhead pressing movement for shoulder development",
          formTips: ["Press straight up", "Keep core tight", "Control the descent"],
          safetyTips: ["Don't arch back excessively", "Warm up shoulders first"],
          restSeconds: 75,
          weights: {
            1: 65,   // Completed with weight
            2: null, // Skipped
            3: 70    // Completed with weight
          }
        }
      ]
    },
    {
      workoutType: "Lower Body Power",
      duration: 35,
      plannedDuration: 40,
      timestamp: new Date(Date.now() - 86400000), // 1 day ago
      exercises: [
        {
          name: "Bodyweight Squats",
          sets: 4,
          reps: 15,
          usesWeight: false,
          description: "Fundamental lower body movement",
          formTips: ["Keep chest up", "Knees track over toes", "Full depth"],
          safetyTips: ["Don't let knees cave in", "Keep weight on heels"],
          restSeconds: 45,
          weights: {
            1: 0,    // Completed
            2: 0,    // Completed
            3: 0,    // Completed
            4: null  // Skipped
          }
        },
        {
          name: "Goblet Squats",
          sets: 3,
          reps: 12,
          usesWeight: true,
          description: "Weighted squat variation with dumbbell",
          formTips: ["Hold weight at chest", "Elbows down", "Slow descent"],
          safetyTips: ["Don't round back", "Control the weight"],
          restSeconds: 60,
          weights: {
            1: 35,   // Completed with weight
            2: 40,   // Completed with weight
            3: 40    // Completed with weight
          }
        },
        {
          name: "Lunges",
          sets: 2,
          reps: "10 each leg",
          usesWeight: false,
          description: "Single-leg strength and stability exercise",
          formTips: ["Step forward", "90-degree angles", "Push back to start"],
          safetyTips: ["Don't let knee touch ground", "Keep torso upright"],
          restSeconds: 60,
          weights: {
            1: null, // Skipped (entire exercise)
            2: null  // Skipped
          }
        }
      ]
    },
    {
      workoutType: "Full Body Circuit",
      duration: 25,
      plannedDuration: 30,
      timestamp: new Date(), // Today
      exercises: [
        {
          name: "Burpees",
          sets: 3,
          reps: 8,
          usesWeight: false,
          description: "Full body explosive movement",
          formTips: ["Jump up explosively", "Land softly", "Maintain rhythm"],
          safetyTips: ["Don't slam down", "Modify if needed"],
          restSeconds: 90,
          weights: {
            1: 0,    // Completed
            2: 0,    // Completed
            3: 0     // Completed
          }
        },
        {
          name: "Dumbbell Rows",
          sets: 3,
          reps: 12,
          usesWeight: true,
          description: "Back strengthening exercise",
          formTips: ["Pull to hip", "Squeeze shoulder blades", "Control descent"],
          safetyTips: ["Don't round back", "Keep core tight"],
          restSeconds: 60,
          weights: {
            1: 25,   // Completed with weight
            2: 30,   // Completed with weight
            3: 30    // Completed with weight
          }
        },
        {
          name: "Plank",
          sets: 2,
          reps: "45 seconds",
          usesWeight: false,
          description: "Core stability exercise",
          formTips: ["Straight line", "Engage core", "Breathe normally"],
          safetyTips: ["Don't let hips sag", "Stop if form breaks"],
          restSeconds: 60,
          weights: {
            1: 0,    // Completed
            2: 0     // Completed
          }
        }
      ]
    }
  ];

  return workouts;
}

// Calculate statistics for a workout
function calculateWorkoutStats(workout) {
  let totalSets = 0;
  let completedSets = 0;
  let totalExercises = workout.exercises.length;
  let completedExercises = 0;

  workout.exercises.forEach(exercise => {
    totalSets += exercise.sets;
    
    if (exercise.weights) {
      const exerciseCompletedSets = Object.values(exercise.weights).filter(w => w !== null).length;
      completedSets += exerciseCompletedSets;
      
      if (exerciseCompletedSets > 0) {
        completedExercises++;
      }
    }
  });

  return {
    totalExercises,
    completedExercises,
    totalSets,
    completedSets,
    completionRate: Math.round((completedSets / totalSets) * 100)
  };
}

// Generate detailed analysis
function generateAnalysis() {
  const workouts = generateTestWorkouts();
  
  console.log("🏋️ NeuraFit Test Data Analysis");
  console.log("=" .repeat(50));
  
  workouts.forEach((workout, index) => {
    const stats = calculateWorkoutStats(workout);
    
    console.log(`\n📋 Workout ${index + 1}: ${workout.workoutType}`);
    console.log(`⏱️  Duration: ${workout.duration}/${workout.plannedDuration} minutes`);
    console.log(`📊 Completion: ${stats.completedSets}/${stats.totalSets} sets (${stats.completionRate}%)`);
    console.log(`🏃 Exercises: ${stats.completedExercises}/${stats.totalExercises} completed`);
    
    workout.exercises.forEach((exercise, exerciseIndex) => {
      console.log(`\n  🏋️  Exercise ${exerciseIndex + 1}: ${exercise.name}`);
      
      if (exercise.weights) {
        let exerciseCompletedSets = 0;
        let totalWeight = 0;
        let weightCount = 0;
        
        Object.entries(exercise.weights).forEach(([setNum, weight]) => {
          const status = weight === null ? 'SKIPPED' : weight === 0 ? 'COMPLETED (no weight)' : `COMPLETED (${weight}lbs)`;
          console.log(`    Set ${setNum}: ${status}`);
          
          if (weight !== null) {
            exerciseCompletedSets++;
            if (weight > 0) {
              totalWeight += weight;
              weightCount++;
            }
          }
        });
        
        console.log(`    📈 Completed: ${exerciseCompletedSets}/${exercise.sets} sets`);
        if (weightCount > 0) {
          console.log(`    📊 Average weight: ${Math.round(totalWeight / weightCount)}lbs`);
        }
      }
    });
  });
  
  console.log("\n" + "=".repeat(50));
  console.log("✅ Test data analysis complete!");
}

// Generate JSON files for manual import
function generateJSONFiles() {
  const workouts = generateTestWorkouts();
  
  workouts.forEach((workout, index) => {
    const filename = `test-workout-${index + 1}.json`;
    fs.writeFileSync(filename, JSON.stringify(workout, null, 2));
    console.log(`📄 Generated: ${filename}`);
  });
  
  // Generate combined file
  fs.writeFileSync('all-test-workouts.json', JSON.stringify(workouts, null, 2));
  console.log(`📄 Generated: all-test-workouts.json`);
}

// Main execution
function main() {
  console.log("🚀 Generating NeuraFit test data...\n");
  
  // Generate analysis
  generateAnalysis();
  
  console.log("\n📁 Generating JSON files...");
  generateJSONFiles();
  
  console.log("\n🎯 Test Data Summary:");
  console.log("====================");
  console.log("• 3 sample workouts with different completion patterns");
  console.log("• Mixed weight-based and bodyweight exercises");
  console.log("• Various completion scenarios (completed, skipped, partial)");
  console.log("• Realistic weight progressions and exercise combinations");
  console.log("• JSON files ready for manual database import");
  
  console.log("\n📋 Usage Instructions:");
  console.log("======================");
  console.log("1. Use the generated JSON files to manually add test data");
  console.log("2. Import via Firebase console or use in test components");
  console.log("3. Validate workout history and detail views");
  console.log("4. Test completion logic with various scenarios");
  
  console.log("\n✅ Test data generation complete!");
}

// Run if executed directly
main();
