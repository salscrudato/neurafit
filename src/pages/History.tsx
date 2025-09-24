import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../lib/firebase'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { ArrowLeft, Calendar, Clock, CheckCircle, XCircle, Zap, Activity } from 'lucide-react'

type WorkoutItem = {
  id: string
  workoutType: string
  duration: number
  plannedDuration?: number
  exercises?: { name: string; sets: number; reps: string | number; weights?: Record<number, number | null>; usesWeight?: boolean }[]
  timestamp?: any
}

export default function History() {
  const nav = useNavigate()
  const [items, setItems] = useState<WorkoutItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const uid = auth.currentUser?.uid
        if (!uid) {
          setError('Not authenticated')
          return
        }

        const q = query(collection(db, 'users', uid, 'workouts'), orderBy('timestamp', 'desc'))
        const snap = await getDocs(q)
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkoutItem)))
      } catch (err: any) {
        console.error('Error fetching workout history:', err)
        setError(err.message || 'Failed to load workout history')
      } finally {
        setLoading(false)
      }
    })()
  }, [])
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown date'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const calculateWorkoutStats = (workout: WorkoutItem) => {
    if (!workout.exercises || workout.exercises.length === 0) {
      return { totalExercises: 0, completedExercises: 0, totalSets: 0 }
    }

    const totalExercises = workout.exercises.length
    let completedExercises = 0
    let totalSets = 0

    workout.exercises.forEach(exercise => {
      totalSets += exercise.sets

      // Use the same completion logic as WorkoutDetail
      let completedSets = 0
      const hasWeights = exercise.weights && Object.values(exercise.weights).some(w => w !== null)

      if (exercise.usesWeight) {
        // Weight-based exercise: count sets with recorded weights
        completedSets = hasWeights ? Object.values(exercise.weights!).filter(w => w !== null).length : 0
      } else {
        // Bodyweight exercise
        if (exercise.weights) {
          const hasAnyWeightData = Object.keys(exercise.weights).length > 0
          if (hasAnyWeightData) {
            completedSets = Object.values(exercise.weights).filter(w => w !== null).length
          } else {
            completedSets = 0
          }
        } else {
          // Legacy data - assume completed
          completedSets = exercise.sets
        }
      }

      if (completedSets === exercise.sets) {
        completedExercises++
      }
    })

    return { totalExercises, completedExercises, totalSets }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white grid place-items-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your workout history...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-md mx-auto px-6 py-8">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load History</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => nav('/dashboard')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => nav('/dashboard')}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back to Dashboard</span>
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
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full mb-4">
            <Activity className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">Workout History</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Fitness Journey</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Track your progress and review past workouts. Click on any workout to see detailed information about your performance.
          </p>
        </div>

        {/* Workout List */}
        {items.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Activity className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No workouts yet</h3>
            <p className="text-gray-600 mb-6">Complete your first workout to start tracking your progress!</p>
            <button
              onClick={() => nav('/generate')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Zap className="h-4 w-4" />
              Generate Your First Workout
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(workout => {
              const stats = calculateWorkoutStats(workout)
              const completionRate = stats.totalExercises > 0 ? Math.round((stats.completedExercises / stats.totalExercises) * 100) : 0

              return (
                <button
                  key={workout.id}
                  onClick={() => nav(`/workout/${workout.id}`)}
                  className="w-full text-left bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {workout.workoutType}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(workout.timestamp)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{workout.duration} min</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        {completionRate === 100 ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-orange-500" />
                        )}
                        <span className="text-sm font-medium text-gray-700">{completionRate}%</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {stats.completedExercises}/{stats.totalExercises} exercises
                      </div>
                    </div>
                  </div>

                  {/* Exercise Preview */}
                  {workout.exercises && workout.exercises.length > 0 && (
                    <div className="border-t border-gray-100 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {workout.exercises.slice(0, 4).map((exercise, index) => {
                          const hasWeights = exercise.weights && Object.values(exercise.weights).some(w => w !== null)
                          const avgWeight = hasWeights
                            ? Math.round(Object.values(exercise.weights!).filter(w => w !== null).reduce((sum, w) => sum + (w || 0), 0) / Object.values(exercise.weights!).filter(w => w !== null).length)
                            : null

                          return (
                            <div key={index} className="text-sm text-gray-700">
                              <span className="font-medium">{exercise.name}</span>
                              <span className="text-gray-500 ml-2">
                                {exercise.sets}×{exercise.reps}
                                {avgWeight && <span className="text-blue-600 ml-1">@ {avgWeight}lbs</span>}
                              </span>
                            </div>
                          )
                        })}
                        {workout.exercises.length > 4 && (
                          <div className="text-sm text-gray-500 italic">
                            + {workout.exercises.length - 4} more exercises
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}