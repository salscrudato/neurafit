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

        await addDoc(collection(db, 'users', uid, 'workouts'), {
          timestamp: serverTimestamp(),
          workoutType: type,
          duration,
          exercises: plan.exercises
        })

        // Clear the session storage after successful save
        sessionStorage.removeItem('nf_workout_plan')
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