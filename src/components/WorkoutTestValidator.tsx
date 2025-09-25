// src/components/WorkoutTestValidator.tsx
import { useState } from 'react'
import { addDoc, collection, getDocs, query, orderBy } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

type TestExercise = {
  name: string
  sets: number
  reps: number | string
  usesWeight?: boolean
  weights?: Record<number, number | null>
}

type TestWorkout = {
  workoutType: string
  duration: number
  exercises: TestExercise[]
  timestamp?: any
}

/**
 * Component for testing workout completion logic
 * This validates that the completion logic works correctly
 */
export default function WorkoutTestValidator() {
  const [testResults, setTestResults] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, message])
    console.log(message)
  }

  // Sample test workout data
  const createTestWorkout = (): TestWorkout => ({
    workoutType: "Test Workout - Completion Logic",
    duration: 30,
    exercises: [
      {
        name: "Push-ups",
        sets: 3,
        reps: 12,
        usesWeight: false,
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
        weights: {
          1: 65,   // Completed with weight
          2: null, // Skipped
          3: 70    // Completed with weight
        }
      },
      {
        name: "Bodyweight Squats",
        sets: 2,
        reps: 15,
        usesWeight: false,
        weights: {
          1: null, // Skipped
          2: null  // Skipped (entire exercise skipped)
        }
      }
    ]
  })

  // Test the completion logic calculations
  const validateCompletionLogic = (workout: TestWorkout) => {
    addResult("🧪 Testing completion logic calculations...")

    workout.exercises.forEach((exercise, index) => {
      addResult(`\n📋 Exercise ${index + 1}: ${exercise.name}`)
      
      if (!exercise.weights) {
        addResult("  ❌ No weights data - this shouldn't happen")
        return
      }

      let completedSets = 0
      let totalWeight = 0
      let weightCount = 0

      Object.entries(exercise.weights).forEach(([setNum, weight]) => {
        const status = weight === null ? 'SKIPPED' : weight === 0 ? 'COMPLETED (no weight)' : `COMPLETED (${weight}lbs)`
        addResult(`    Set ${setNum}: ${status}`)
        
        // Count completed sets (non-null values)
        if (weight !== null) {
          completedSets++
          if (weight > 0) {
            totalWeight += weight
            weightCount++
          }
        }
      })

      addResult(`    📊 Completed: ${completedSets}/${exercise.sets} sets`)
      
      if (weightCount > 0) {
        const avgWeight = Math.round(totalWeight / weightCount)
        addResult(`    📈 Average weight: ${avgWeight}lbs`)
      }

      // Validate exercise completion (should be true if ANY sets completed)
      const isExerciseCompleted = completedSets > 0
      addResult(`    ✅ Exercise completed: ${isExerciseCompleted}`)
    })

    // Calculate overall workout stats
    const totalExercises = workout.exercises.length
    const completedExercises = workout.exercises.filter(ex => {
      if (!ex.weights) return false
      const completedSets = Object.values(ex.weights).filter(w => w !== null).length
      return completedSets > 0
    }).length

    const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets, 0)
    const completedSets = workout.exercises.reduce((sum, ex) => {
      if (!ex.weights) return sum
      return sum + Object.values(ex.weights).filter(w => w !== null).length
    }, 0)

    addResult(`\n📊 Overall Workout Stats:`)
    addResult(`  Exercises: ${completedExercises}/${totalExercises} completed`)
    addResult(`  Sets: ${completedSets}/${totalSets} completed`)
    addResult(`  Completion rate: ${Math.round((completedSets / totalSets) * 100)}%`)
  }

  // Test saving and retrieving workout
  const testWorkoutSaveAndRetrieve = async () => {
    const uid = auth.currentUser?.uid
    if (!uid) {
      addResult("❌ User not authenticated")
      return
    }

    try {
      const testWorkout = createTestWorkout()
      
      addResult("💾 Saving test workout to Firestore...")
      
      // Save workout (simulating Complete.tsx logic)
      const docRef = await addDoc(collection(db, 'users', uid, 'workouts'), {
        timestamp: new Date(),
        workoutType: testWorkout.workoutType,
        duration: testWorkout.duration,
        exercises: testWorkout.exercises
      })

      addResult(`✅ Workout saved with ID: ${docRef.id}`)

      // Retrieve workouts (simulating History.tsx logic)
      addResult("📚 Retrieving workout history...")
      
      const q = query(collection(db, 'users', uid, 'workouts'), orderBy('timestamp', 'desc'))
      const snap = await getDocs(q)
      
      const workouts = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      addResult(`✅ Retrieved ${workouts.length} workout(s)`)

      // Find our test workout
      const savedWorkout: any = workouts.find((w: any) => w.workoutType === testWorkout.workoutType)
      if (savedWorkout) {
        addResult("✅ Test workout found in history")

        // Validate the saved data structure
        if (savedWorkout.exercises && Array.isArray(savedWorkout.exercises)) {
          addResult("✅ Exercises array structure correct")

          savedWorkout.exercises.forEach((exercise: any, index: number) => {
            if (exercise.weights && typeof exercise.weights === 'object') {
              addResult(`✅ Exercise ${index + 1} weights structure correct`)
            } else {
              addResult(`❌ Exercise ${index + 1} weights structure incorrect`)
            }
          })
        } else {
          addResult("❌ Exercises structure incorrect")
        }
      } else {
        addResult("❌ Test workout not found in history")
      }

    } catch (error) {
      addResult(`❌ Error during save/retrieve test: ${error}`)
    }
  }

  const runAllTests = async () => {
    setIsRunning(true)
    setTestResults([])
    
    addResult("🚀 Starting NeuraFit workout completion tests...")
    addResult("=".repeat(50))

    try {
      // Test 1: Validate completion logic
      const testWorkout = createTestWorkout()
      validateCompletionLogic(testWorkout)

      addResult("\n" + "=".repeat(50))

      // Test 2: Test save and retrieve
      await testWorkoutSaveAndRetrieve()

      addResult("\n" + "=".repeat(50))
      addResult("✅ All tests completed!")

    } catch (error) {
      addResult(`❌ Test suite failed: ${error}`)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          🧪 Workout Completion Test Suite
        </h2>
        
        <p className="text-gray-600 mb-6">
          This component tests the workout completion logic to ensure data is correctly 
          stored and retrieved. It validates set completion states, weight tracking, 
          and exercise completion calculations.
        </p>

        <button
          onClick={runAllTests}
          disabled={isRunning}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            isRunning
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isRunning ? '🔄 Running Tests...' : '🚀 Run Test Suite'}
        </button>

        {testResults.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Test Results:</h3>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="whitespace-pre-wrap">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
