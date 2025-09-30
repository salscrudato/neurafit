import { addDoc, collection, serverTimestamp, doc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../../lib/firebase'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../../components/AppHeader'
import { isFeedbackUIEnabled } from '../../config/features'
import { logAdaptiveFeedbackSubmitted, logAdaptivePersonalizationError } from '../../lib/telemetry'
import { Bed, ThumbsUp, Flame, CheckCircle } from 'lucide-react'

type FeedbackSignal = 'easy' | 'right' | 'hard'

export default function Complete() {
  const nav = useNavigate()
  const [workoutSaved, setWorkoutSaved] = useState(false)
  const [workoutId, setWorkoutId] = useState<string | null>(null)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackSignal | null>(null)
  const [rpeValue, setRpeValue] = useState<number | null>(null)
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [workoutData, setWorkoutData] = useState<Record<string, unknown> | null>(null)

  // Save workout on component mount
  useEffect(() => {
    (async () => {
      try {
        const saved = sessionStorage.getItem('nf_workout_plan')
        if (!saved) return
        const { plan, type, duration } = JSON.parse(saved) as { plan: { exercises: unknown[] }; type: string; duration: number }
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
        const exercisesWithWeights = (plan.exercises as Record<string, unknown>[]).map((exercise, exerciseIndex: number) => ({
          ...exercise,
          weights: workoutWeights[exerciseIndex] || null
        }))

        // Debug: Log the workout data being saved
        console.log('[SAVE] Saving workout with the following completion data:')
        exercisesWithWeights.forEach((exercise: Record<string, unknown>, index: number) => {
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

        const workoutDoc = {
          timestamp: serverTimestamp(),
          workoutType: type,
          duration: actualDuration,
          plannedDuration: duration, // Keep the planned duration for reference
          exercises: exercisesWithWeights
        }

        const docRef = await addDoc(collection(db, 'users', uid, 'workouts'), workoutDoc)

        // Store workout data and ID for feedback
        setWorkoutData({ ...workoutDoc, exercises: exercisesWithWeights })
        setWorkoutId(docRef.id)
        setWorkoutSaved(true)
        console.log('[FEEDBACK] Workout saved, should show feedback UI now')

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

  // Calculate workout completion rate
  const calculateCompletionRate = (exercises: Record<string, unknown>[]): number => {
    let totalSets = 0
    let completedSets = 0

    exercises.forEach(exercise => {
      if (exercise.weights && typeof exercise.weights === 'object') {
        const setCount = (typeof exercise.sets === 'number' ? exercise.sets : 0) || Object.keys(exercise.weights).length
        totalSets += setCount

        // Count completed sets (non-null weights)
        Object.values(exercise.weights).forEach((weight: unknown) => {
          if (weight !== null) {
            completedSets++
          }
        })
      } else {
        // Fallback: assume all sets completed if no weight data
        const sets = typeof exercise.sets === 'number' ? exercise.sets : 0
        totalSets += sets
        completedSets += sets
      }
    })

    return totalSets > 0 ? completedSets / totalSets : 1.0
  }

  // Submit difficulty feedback
  const submitFeedback = async () => {
    if (!selectedFeedback || !workoutId || !workoutData) return

    setSubmittingFeedback(true)
    try {
      const uid = auth.currentUser?.uid
      if (!uid) return

      // Calculate completion rate
      const completionRate = calculateCompletionRate(workoutData.exercises as Record<string, unknown>[])

      // Update workout document with feedback
      const workoutRef = doc(db, 'users', uid, 'workouts', workoutId)
      await updateDoc(workoutRef, {
        feedback: selectedFeedback,
        rpe: rpeValue,
        completionRate
      })

      // Log telemetry event
      logAdaptiveFeedbackSubmitted(uid, selectedFeedback, rpeValue, completionRate)

      // For now, we'll update the adaptive state when generating the next workout
      // This ensures we have the most recent feedback and completion data
      console.log('Feedback submitted:', {
        feedback: selectedFeedback,
        rpe: rpeValue,
        completionRate
      })

      setFeedbackSubmitted(true)
    } catch (error) {
      console.error('Error submitting feedback:', error)
      const uid = auth.currentUser?.uid
      if (uid) {
        logAdaptivePersonalizationError(uid, String(error), 'feedback_submission')
      }
    } finally {
      setSubmittingFeedback(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-200/30 to-blue-200/30 rounded-full blur-3xl" />
      </div>

      <AppHeader />

      <div className="relative flex items-center justify-center min-h-[80vh] px-4">
        <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-3xl p-8 text-center max-w-lg mx-auto shadow-lg">
          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-4 text-gray-900">Workout Complete!</h1>
          <p className="mb-6 text-gray-600">Great job! Your workout has been saved to your history.</p>

          {/* Debug info */}
          {(() => {
            console.log('[FEEDBACK] Render check - workoutSaved:', workoutSaved, 'feedbackSubmitted:', feedbackSubmitted, 'isFeedbackUIEnabled:', isFeedbackUIEnabled());
            return null;
          })()}

          {/* Feedback Section */}
          {workoutSaved && !feedbackSubmitted && (
            <div className="mb-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
              <h3 className="text-lg font-semibold mb-3 text-gray-900">How was this workout?</h3>
              <p className="text-sm text-gray-600 mb-4">Your feedback helps us personalize future workouts</p>

              {/* Difficulty Buttons */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { value: 'easy' as const, label: 'Too Easy', icon: Bed, color: 'from-green-400 to-emerald-500' },
                  { value: 'right' as const, label: 'Just Right', icon: ThumbsUp, color: 'from-blue-400 to-indigo-500' },
                  { value: 'hard' as const, label: 'Too Hard', icon: Flame, color: 'from-red-400 to-pink-500' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedFeedback(option.value)}
                    className={`p-3 rounded-xl border-2 transition-all duration-200 ${
                      selectedFeedback === option.value
                        ? `bg-gradient-to-br ${option.color} text-white border-transparent shadow-md scale-105`
                        : 'bg-white/70 border-gray-200 hover:border-gray-300 hover:scale-102'
                    }`}
                  >
                    <div className="flex justify-center mb-1">
                      <option.icon className="h-5 w-5" />
                    </div>
                    <div className="text-xs font-medium">{option.label}</div>
                  </button>
                ))}
              </div>

              {/* Optional RPE Slider */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rate of Perceived Exertion (1-10) - Optional
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">1</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={rpeValue || 5}
                    onChange={(e) => setRpeValue(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs text-gray-500">10</span>
                </div>
                {rpeValue && (
                  <div className="text-center mt-1 text-sm font-medium text-gray-700">
                    RPE: {rpeValue}
                  </div>
                )}
              </div>

              {/* Submit Feedback Button */}
              <button
                onClick={submitFeedback}
                disabled={!selectedFeedback || submittingFeedback}
                className={`w-full px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                  selectedFeedback && !submittingFeedback
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white hover:scale-[1.02] shadow-md'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          )}

          {/* Success message after feedback */}
          {feedbackSubmitted && (
            <div className="mb-6 p-4 bg-green-50/50 rounded-xl border border-green-100">
              <div className="flex items-center gap-2 text-green-600 font-medium">
                <CheckCircle className="h-4 w-4" />
                Feedback submitted!
              </div>
              <div className="text-sm text-green-600 mt-1">Your next workout will be personalized based on this feedback.</div>
            </div>
          )}

          {/* Navigation Button */}
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