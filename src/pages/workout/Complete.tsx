import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../../lib/firebase'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

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
    <div className="p-6 text-center max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-4">Workout Complete! 🎉</h1>
      <p className="mb-6">Nice work.</p>
      <button onClick={()=>nav('/dashboard')} className="px-5 py-3 bg-blue-600 text-white rounded-lg">Back to Home</button>
    </div>
  )
}