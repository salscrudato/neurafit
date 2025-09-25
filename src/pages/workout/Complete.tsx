import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../../lib/firebase'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../../components/AppHeader'

export default function Complete() {
  const nav = useNavigate()
  useEffect(() => {
    (async () => {
      try {
        const saved = sessionStorage.getItem('nf_workout_plan')
        if (!saved) return
        const { plan, type, duration } = JSON.parse(saved) as any
        const uid = auth.currentUser?.uid
        if (!uid) return

        // Get weight data if it exists
        const savedWeights = sessionStorage.getItem('nf_workout_weights')
        const workoutWeights = savedWeights ? JSON.parse(savedWeights) : {}



        // Calculate actual workout duration
        const startTimeStr = sessionStorage.getItem('nf_workout_start_time')
        const actualDuration = startTimeStr
          ? Math.round((Date.now() - parseInt(startTimeStr)) / 1000 / 60) // Convert to minutes
          : duration // Fallback to planned duration if start time not available

        // Enhance exercises with weight data
        const exercisesWithWeights = plan.exercises.map((exercise: any, exerciseIndex: number) => ({
          ...exercise,
          weights: workoutWeights[exerciseIndex] || null
        }))

        // Debug: Log the workout data being saved
        console.log('💾 Saving workout with the following completion data:')
        exercisesWithWeights.forEach((exercise: any, index: number) => {
          console.log(`Exercise ${index}: ${exercise.name}`)
          if (exercise.weights) {
            Object.entries(exercise.weights).forEach(([setNum, weight]) => {
              const status = weight === null ? 'SKIPPED' : weight === 0 ? 'COMPLETED (no weight)' : `COMPLETED (${weight}lbs)`
              console.log(`  Set ${setNum}: ${status}`)
            })
          } else {
            console.log('  No weight data (should not happen with new system)')
          }
        })

        await addDoc(collection(db, 'users', uid, 'workouts'), {
          timestamp: serverTimestamp(),
          workoutType: type,
          duration: actualDuration,
          plannedDuration: duration, // Keep the planned duration for reference
          exercises: exercisesWithWeights
        })

        // Clear the session storage after successful save
        sessionStorage.removeItem('nf_workout_plan')
        sessionStorage.removeItem('nf_workout_weights')
        sessionStorage.removeItem('nf_workout_start_time')
      } catch (error) {
        console.error('Error saving workout:', error)
        // Don't block the user, but log the error
      }
    })()
  }, [])
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-200/30 to-blue-200/30 rounded-full blur-3xl" />
      </div>

      <AppHeader />

      <div className="relative flex items-center justify-center min-h-[80vh]">
        <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-3xl p-8 text-center max-w-md mx-6 shadow-lg">
          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">🎉</span>
          </div>
          <h1 className="text-3xl font-bold mb-4 text-gray-900">Workout Complete!</h1>
          <p className="mb-6 text-gray-600">Great job! Your workout has been saved to your history.</p>
          <button
            onClick={() => nav('/dashboard')}
            className="w-full px-6 py-3 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:scale-[1.02] transition-all duration-200 shadow-md"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}