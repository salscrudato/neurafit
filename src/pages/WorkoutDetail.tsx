// src/pages/WorkoutDetail.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { auth, db } from '../lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { ArrowLeft, Clock, Calendar, CheckCircle, XCircle, Weight, Zap } from 'lucide-react'

type Exercise = {
  name: string
  sets: number
  reps: string | number
  weights?: Record<number, number | null>
  usesWeight?: boolean
  description?: string
  formTips?: string[]
  safetyTips?: string[]
  restSeconds?: number
}

type WorkoutData = {
  id: string
  workoutType: string
  duration: number
  plannedDuration?: number
  exercises: Exercise[]
  timestamp: any
}

export default function WorkoutDetail() {
  const { workoutId } = useParams<{ workoutId: string }>()
  const nav = useNavigate()
  const [workout, setWorkout] = useState<WorkoutData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchWorkout = async () => {
      try {
        const uid = auth.currentUser?.uid
        if (!uid || !workoutId) {
          setError('Invalid workout or user')
          return
        }

        const workoutDoc = await getDoc(doc(db, 'users', uid, 'workouts', workoutId))
        if (!workoutDoc.exists()) {
          setError('Workout not found')
          return
        }

        setWorkout({ id: workoutDoc.id, ...workoutDoc.data() } as WorkoutData)
      } catch (err: any) {
        console.error('Error fetching workout:', err)
        setError(err.message || 'Failed to load workout')
      } finally {
        setLoading(false)
      }
    }

    fetchWorkout()
  }, [workoutId])

  if (loading) {
    return (
      <div className="min-h-screen bg-white grid place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
      </div>
    )
  }

  if (error || !workout) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-md mx-auto px-6 py-8">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Workout Not Found</h1>
            <p className="text-gray-600 mb-6">{error || 'This workout could not be loaded.'}</p>
            <button
              onClick={() => nav('/history')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to History
            </button>
          </div>
        </div>
      </div>
    )
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Unknown time'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const calculateExerciseStats = (exercise: Exercise) => {
    const hasWeights = exercise.weights && Object.values(exercise.weights).some(w => w !== null)
    const totalSets = exercise.sets

    // For weight-based exercises, count completed sets based on recorded weights
    // For bodyweight exercises, we need a different approach since they don't have weights
    let completedSets = 0
    let isCompleted = false

    if (exercise.usesWeight) {
      // Weight-based exercise: count sets with recorded weights
      completedSets = hasWeights ? Object.values(exercise.weights!).filter(w => w !== null).length : 0
      isCompleted = completedSets === totalSets
    } else {
      // Bodyweight exercise: if weights object exists but is empty/null, it was likely skipped
      // If no weights object exists at all, assume it was completed (legacy data)
      if (exercise.weights) {
        // Check if any weights were recorded (shouldn't be for bodyweight, but indicates completion tracking)
        const hasAnyWeightData = Object.keys(exercise.weights).length > 0
        if (hasAnyWeightData) {
          // Count non-null entries as completed sets (even if weight is 0 for bodyweight)
          completedSets = Object.values(exercise.weights).filter(w => w !== null).length
        } else {
          // No weight data recorded, likely skipped
          completedSets = 0
        }
      } else {
        // Legacy data without weights tracking - assume completed
        completedSets = totalSets
      }
      isCompleted = completedSets === totalSets
    }

    let avgWeight = null
    let maxWeight = null
    let minWeight = null

    if (hasWeights && exercise.usesWeight) {
      const weights = Object.values(exercise.weights!).filter(w => w !== null) as number[]
      if (weights.length > 0) {
        avgWeight = Math.round(weights.reduce((sum, w) => sum + w, 0) / weights.length)
        maxWeight = Math.max(...weights)
        minWeight = Math.min(...weights)
      }
    }

    return { hasWeights, completedSets, totalSets, isCompleted, avgWeight, maxWeight, minWeight }
  }

  const totalExercises = workout.exercises.length
  const completedExercises = workout.exercises.filter(ex => {
    const stats = calculateExerciseStats(ex)
    return stats.isCompleted
  }).length

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => nav('/history')}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back to History</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">Neurafit</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Workout Overview */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{workout.workoutType}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(workout.timestamp)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatTime(workout.timestamp)}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{workout.duration}</div>
              <div className="text-sm text-gray-600">
                {workout.plannedDuration && workout.duration !== workout.plannedDuration
                  ? `actual (${workout.plannedDuration} planned)`
                  : 'minutes'
                }
              </div>
            </div>
          </div>

          {/* Progress Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-blue-100">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">{totalExercises}</div>
              <div className="text-sm text-gray-600">Total Exercises</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">{completedExercises}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">
                {Math.round((completedExercises / totalExercises) * 100)}%
              </div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {workout.exercises.reduce((total, ex) => {
                  const stats = calculateExerciseStats(ex)
                  return total + stats.completedSets
                }, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Sets</div>
            </div>
          </div>
        </div>

        {/* Exercise Details */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Exercise Details</h2>
          {workout.exercises.map((exercise, index) => {
            const stats = calculateExerciseStats(exercise)
            
            return (
              <div key={index} className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{exercise.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{exercise.sets} sets × {exercise.reps} reps</span>
                      {stats.hasWeights && stats.avgWeight && (
                        <span className="text-blue-600 font-medium">@ {stats.avgWeight}lbs avg</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {stats.isCompleted ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-500" />
                    )}
                    <span className="text-sm font-medium text-gray-700">
                      {stats.completedSets}/{stats.totalSets} sets
                    </span>
                  </div>
                </div>

                {/* Weight Information */}
                {stats.hasWeights && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Weight className="h-4 w-4 text-gray-600" />
                      <span className="font-medium text-gray-900">Weight Details</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-semibold text-gray-900">{stats.avgWeight}lbs</div>
                        <div className="text-gray-600">Average</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-gray-900">{stats.maxWeight}lbs</div>
                        <div className="text-gray-600">Max</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-gray-900">{stats.minWeight}lbs</div>
                        <div className="text-gray-600">Min</div>
                      </div>
                    </div>
                    
                    {/* Individual Set Weights */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-xs text-gray-600 mb-2">Set-by-set weights:</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(exercise.weights!).map(([setNum, weight]) => (
                          <span
                            key={setNum}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              weight !== null
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            Set {setNum}: {weight !== null ? `${weight}lbs` : 'Not recorded'}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}


              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
