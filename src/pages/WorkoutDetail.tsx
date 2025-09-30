// src/pages/WorkoutDetail.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { auth, db } from '../lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { convertToDate } from '../utils/timestamp'
import { ArrowLeft, Clock, Calendar, CheckCircle, XCircle, Weight } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import { WorkoutDetailSkeleton } from '../components/SkeletonLoaders'

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
  timestamp: Date | { toDate(): Date } | string
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
      } catch (err) {
        const error = err as { message?: string }
        console.error('Error fetching workout:', error)
        setError(error.message || 'Failed to load workout')
      } finally {
        setLoading(false)
      }
    }

    fetchWorkout()
  }, [workoutId])

  if (loading) {
    return <WorkoutDetailSkeleton />
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

  const formatDate = (timestamp: Date | { toDate(): Date } | string) => {
    if (!timestamp) return 'Unknown date'
    const date = convertToDate(timestamp)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (timestamp: Date | { toDate(): Date } | string) => {
    if (!timestamp) return 'Unknown time'
    const date = convertToDate(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatEndTime = (timestamp: Date | { toDate(): Date } | string, duration: number) => {
    if (!timestamp) return 'Unknown time'
    const startDate = convertToDate(timestamp)
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000) // Add duration in milliseconds
    return endDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const calculateExerciseStats = (exercise: Exercise) => {
    const hasWeights = exercise.weights && Object.values(exercise.weights).some(w => w !== null && w > 0)
    const totalSets = exercise.sets

    let completedSets = 0
    let isCompleted = false

    if (exercise.weights) {
      // Count all entries with non-null values (including 0 which indicates completed sets)
      // null values indicate skipped sets
      completedSets = Object.values(exercise.weights).filter(w => w !== null).length
    } else {
      // No weights data means no sets were tracked (shouldn't happen with new system)
      completedSets = 0
    }
    // Exercise is considered completed if it has ANY completed sets (consistent with History.tsx)
    isCompleted = completedSets > 0

    let avgWeight = null
    let maxWeight = null
    let minWeight = null

    if (hasWeights && exercise.usesWeight) {
      // Only consider actual weight values (> 0) for statistics, not completion markers (0)
      const weights = Object.values(exercise.weights!).filter(w => w !== null && w > 0) as number[]
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative text-gray-900">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-200/30 to-blue-200/30 rounded-full blur-3xl" />
      </div>

      <AppHeader />

      {/* Main Content */}
      <main className="relative max-w-4xl mx-auto px-6 py-8">
        {/* Workout Overview */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-3">{workout.workoutType}</h1>
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
            <div className="text-right ml-6">
              <div className="text-3xl font-bold text-blue-600 mb-1">{workout.duration}</div>
              <div className="text-sm text-gray-600 mb-2">minutes</div>
              <div className="text-xs text-gray-500">
                Ended {formatEndTime(workout.timestamp, workout.duration)}
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

                {/* Weight Summary for weight-based exercises */}
                {stats.hasWeights && exercise.usesWeight && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Weight className="h-4 w-4 text-gray-600" />
                      <span className="font-medium text-gray-900">Weight Summary</span>
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
                  </div>
                )}

                {/* Set-by-Set Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-medium text-gray-900">Set Details</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {Array.from({ length: exercise.sets }, (_, i) => {
                      const setNumber = i + 1
                      const weight = exercise.weights?.[setNumber]

                      // Determine if set is completed
                      // weight === null means skipped
                      // weight === 0 means completed without weight
                      // weight > 0 means completed with weight
                      // weight === undefined means set was never attempted (shouldn't happen)
                      const isCompleted = weight !== null && weight !== undefined
                      const wasAttempted = weight !== undefined

                      return (
                        <div
                          key={setNumber}
                          className={`px-3 py-2 rounded-lg text-sm font-medium text-center ${
                            !wasAttempted
                              ? 'bg-gray-100 text-gray-600 border border-gray-200'
                              : isCompleted
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}
                        >
                          <div className="font-semibold">Set {setNumber}</div>
                          <div className="text-xs mt-1">
                            {!wasAttempted ? (
                              'Not attempted'
                            ) : isCompleted ? (
                              exercise.usesWeight && weight > 0 ? `${weight}lbs` : 'Completed'
                            ) : (
                              'Skipped'
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>


              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}