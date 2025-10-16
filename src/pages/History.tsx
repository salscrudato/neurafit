import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../lib/firebase'
import { collection, getDocs, orderBy, query, limit, startAfter, doc, getDoc } from 'firebase/firestore'
import { convertToDate } from '../utils/timestamp'
import { ArrowLeft, Calendar, Clock, CheckCircle, XCircle, Zap, Activity } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import { WorkoutHistorySkeleton } from '../components/Loading'
import { logger } from '../lib/logger'

type WorkoutItem = {
  id: string
  workoutType: string
  duration: number
  plannedDuration?: number
  exercises?: { name: string; sets: number; reps: string | number; weights?: Record<number, number | null>; usesWeight?: boolean }[]
  timestamp?: Date | { toDate(): Date } | string
}

// Memoized date formatter
const formatDate = (timestamp: Date | { toDate(): Date } | string): string => {
  if (!timestamp) return 'Unknown date'
  const date = convertToDate(timestamp)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Memoized workout stats calculator
const calculateWorkoutStats = (workout: WorkoutItem) => {
  if (!workout.exercises || workout.exercises.length === 0) {
    return { totalExercises: 0, completedExercises: 0, totalSets: 0, completedSets: 0, fullyCompletedExercises: 0 }
  }

  const totalExercises = workout.exercises.length
  let completedExercises = 0 // Exercises with ANY completed sets
  let fullyCompletedExercises = 0 // Exercises with ALL sets completed
  let totalSets = 0
  let completedSets = 0

  workout.exercises.forEach(exercise => {
    totalSets += exercise.sets

    // Calculate completed sets for this exercise using the exact same logic as WorkoutDetail
    let exerciseCompletedSets = 0

    if (exercise.weights && typeof exercise.weights === 'object') {
      // Count all entries with non-null values (including 0 which indicates completed sets)
      // null values indicate skipped sets
      exerciseCompletedSets = Object.values(exercise.weights).filter(w => w !== null).length
    } else {
      // No weights data means no sets were tracked (shouldn't happen with new system)
      exerciseCompletedSets = 0
    }

    completedSets += exerciseCompletedSets

    // Exercise is considered "completed" if it has ANY completed sets
    if (exerciseCompletedSets > 0) {
      completedExercises++
    }

    // Track fully completed exercises separately
    if (exerciseCompletedSets === exercise.sets) {
      fullyCompletedExercises++
    }
  })

  return { totalExercises, completedExercises, totalSets, completedSets, fullyCompletedExercises }
}

export default function History() {
  const nav = useNavigate()
  const [items, setItems] = useState<WorkoutItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const WORKOUTS_PER_PAGE = 20

  // Fetch workout history with pagination
  useEffect(() => {
    (async () => {
      try {
        const uid = auth.currentUser?.uid
        if (!uid) {
          setError('Not authenticated')
          return
        }

        logger.debug('Loading workout history', { uid })
        // Fetch one extra to check if there are more
        const q = query(
          collection(db, 'users', uid, 'workouts'),
          orderBy('timestamp', 'desc'),
          limit(WORKOUTS_PER_PAGE + 1)
        )
        const snap = await getDocs(q)

        const workouts = snap.docs.map(d => {
          const data = d.data()
          return { id: d.id, ...data } as WorkoutItem
        })

        // Check if there are more workouts
        if (workouts.length > WORKOUTS_PER_PAGE) {
          setHasMore(true)
          workouts.pop() // Remove the extra item
        } else {
          setHasMore(false)
        }

        logger.debug('Workout history loaded', { count: workouts.length, hasMore: workouts.length > WORKOUTS_PER_PAGE })
        setItems(workouts)
      } catch (err) {
        const error = err as { message?: string }
        logger.error('Error fetching workout history', err as Error)
        setError(error.message || 'Failed to load workout history')
      } finally {
        setLoading(false)
      }
    })()
  }, [WORKOUTS_PER_PAGE])

  // Load more workouts
  const loadMoreWorkouts = async () => {
    if (loadingMore || !hasMore || items.length === 0) return

    setLoadingMore(true)
    try {
      const uid = auth.currentUser?.uid
      if (!uid) return

      const lastWorkout = items[items.length - 1]
      if (!lastWorkout) return

      const lastDoc = await getDoc(doc(db, 'users', uid, 'workouts', lastWorkout.id))

      const q = query(
        collection(db, 'users', uid, 'workouts'),
        orderBy('timestamp', 'desc'),
        startAfter(lastDoc),
        limit(WORKOUTS_PER_PAGE + 1)
      )
      const snap = await getDocs(q)

      const newWorkouts = snap.docs.map(d => {
        const data = d.data()
        return { id: d.id, ...data } as WorkoutItem
      })

      // Check if there are more workouts
      if (newWorkouts.length > WORKOUTS_PER_PAGE) {
        setHasMore(true)
        newWorkouts.pop() // Remove the extra item
      } else {
        setHasMore(false)
      }

      setItems([...items, ...newWorkouts])
      logger.debug('Loaded more workouts', { newCount: newWorkouts.length, totalCount: items.length + newWorkouts.length })
    } catch (err) {
      logger.error('Error loading more workouts', err as Error)
    } finally {
      setLoadingMore(false)
    }
  }

  // Memoize workout stats calculations
  const workoutStats = useMemo(() => {
    return items.map(workout => ({
      id: workout.id,
      stats: calculateWorkoutStats(workout),
    }))
  }, [items])

  if (loading) {
    return <WorkoutHistorySkeleton />
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-200/30 to-blue-200/30 rounded-full blur-3xl" aria-hidden="true" />
      </div>

      <AppHeader />

      {/* Main Content */}
      <main className="relative max-w-4xl mx-auto px-3 xs:px-4 sm:px-6 py-6 xs:py-7 sm:py-8">
        {/* Page Header */}
        <div className="text-center mb-6 xs:mb-7 sm:mb-8 animate-slide-in-up">
          <div className="inline-flex items-center gap-2 px-3 xs:px-4 py-1.5 xs:py-2 bg-blue-50 rounded-full mb-3 xs:mb-4">
            <Activity className="h-3.5 xs:h-4 w-3.5 xs:w-4 text-blue-600" />
            <span className="text-xs xs:text-sm font-medium text-blue-600">Workout History</span>
          </div>
          <h1 className="text-2xl xs:text-3xl sm:text-4xl font-bold text-gray-900 mb-2 xs:mb-3">Your Workout History</h1>
          <p className="text-gray-600 text-sm xs:text-base max-w-2xl mx-auto leading-relaxed">
            Track your completed workouts and monitor your progress over time.
          </p>
        </div>

        {/* Workout List */}
        {items.length === 0 ? (
          <div className="text-center py-12 xs:py-16 sm:py-20 animate-fade-in">
            <div className="bg-gray-50 rounded-full w-14 xs:w-16 sm:w-20 h-14 xs:h-16 sm:h-20 flex items-center justify-center mx-auto mb-4 xs:mb-6">
              <Activity className="h-7 xs:h-8 sm:h-10 w-7 xs:w-8 sm:w-10 text-gray-400" />
            </div>
            <h3 className="text-lg xs:text-xl sm:text-2xl font-semibold text-gray-900 mb-2 xs:mb-3">No workouts yet</h3>
            <p className="text-gray-600 text-sm xs:text-base mb-6 xs:mb-8">Complete your first workout to start tracking your progress!</p>
            <button
              onClick={() => nav('/generate')}
              className="inline-flex items-center gap-2 px-5 xs:px-6 py-2.5 xs:py-3 bg-blue-600 text-white rounded-lg xs:rounded-xl hover:bg-blue-700 transition-colors min-h-[44px] xs:min-h-[48px] touch-manipulation"
            >
              <Zap className="h-4 xs:h-5 w-4 xs:w-5" />
              Generate Your First Workout
            </button>
          </div>
        ) : (
          <div className="space-y-3 xs:space-y-4 sm:space-y-5 animate-slide-in-up">
            {items.map(workout => {
              // Use memoized stats
              const workoutStat = workoutStats.find(ws => ws.id === workout.id)
              const stats = workoutStat?.stats || { totalExercises: 0, completedExercises: 0, totalSets: 0, completedSets: 0, fullyCompletedExercises: 0 }

              // Calculate completion rate based on sets completed, not exercises
              const setCompletionRate = stats.totalSets > 0 ? Math.round((stats.completedSets / stats.totalSets) * 100) : 0
              const exerciseCompletionRate = stats.totalExercises > 0 ? Math.round((stats.completedExercises / stats.totalExercises) * 100) : 0

              // Use set completion rate as the primary metric
              const completionRate = setCompletionRate

              // Debug logging for workout stats
              if (import.meta.env.MODE === 'development') {
                logger.debug(`Workout "${workout.workoutType}" stats`, {
                  totalExercises: stats.totalExercises,
                  completedExercises: stats.completedExercises,
                  fullyCompletedExercises: stats.fullyCompletedExercises,
                  totalSets: stats.totalSets,
                  completedSets: stats.completedSets,
                  setCompletionRate: setCompletionRate,
                  exerciseCompletionRate: exerciseCompletionRate,
                  finalCompletionRate: completionRate
                })
              }

              return (
                <button
                  key={workout.id}
                  onClick={() => nav(`/workout/${workout.id}`)}
                  className="w-full text-left bg-white border border-gray-200 rounded-lg xs:rounded-xl sm:rounded-2xl p-4 xs:p-5 sm:p-6 hover:border-blue-300 hover:shadow-md transition-all group touch-manipulation min-h-[100px] xs:min-h-[110px]"
                >
                  <div className="flex items-start justify-between gap-3 xs:gap-4 mb-3 xs:mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base xs:text-lg sm:text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors leading-tight">
                        {workout.workoutType}
                      </h3>
                      <div className="flex flex-col xs:flex-row xs:items-center gap-2 xs:gap-4 text-xs xs:text-sm text-gray-600 mt-2 xs:mt-2.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 xs:h-4 w-3.5 xs:w-4 flex-shrink-0" />
                          <span>{formatDate(workout.timestamp || new Date())}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 xs:h-4 w-3.5 xs:w-4 flex-shrink-0" />
                          <span>{workout.duration} min</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center justify-end gap-1.5 xs:gap-2 mb-1.5 xs:mb-2">
                        {completionRate === 100 ? (
                          <CheckCircle className="h-4 xs:h-5 w-4 xs:w-5 text-green-500 flex-shrink-0" />
                        ) : completionRate > 0 ? (
                          <div className="h-4 xs:h-5 w-4 xs:w-5 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                            <div className="h-1.5 xs:h-2 w-1.5 xs:w-2 rounded-full bg-orange-500" />
                          </div>
                        ) : (
                          <XCircle className="h-4 xs:h-5 w-4 xs:w-5 text-red-500 flex-shrink-0" />
                        )}
                        <span className="text-xs xs:text-sm font-medium text-gray-700">{completionRate}%</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {stats.completedSets}/{stats.totalSets} sets
                      </div>
                      <div className="text-xs text-gray-400">
                        {stats.completedExercises}/{stats.totalExercises} exercises
                      </div>
                    </div>
                  </div>

                  {/* Exercise Preview */}
                  {workout.exercises && workout.exercises.length > 0 && (
                    <div className="border-t border-gray-100 pt-3 xs:pt-4">
                      <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 xs:gap-3">
                        {workout.exercises.slice(0, 4).map((exercise: NonNullable<WorkoutItem['exercises']>[0], index: number) => {
                          // Calculate average weight more safely
                          let avgWeight: number | null = null
                          let completedSets = 0

                          if (exercise.weights && typeof exercise.weights === 'object') {
                            const weights = Object.values(exercise.weights).filter((w): w is number => w !== null && w !== undefined && w > 0)
                            completedSets = Object.values(exercise.weights).filter(w => w !== null).length

                            if (weights.length > 0) {
                              avgWeight = Math.round(weights.reduce((sum, w) => sum + w, 0) / weights.length)
                            }
                          }

                          return (
                            <div key={index} className="text-xs xs:text-sm text-gray-700">
                              <span className="font-medium">{exercise.name}</span>
                              <span className="text-gray-500 ml-1.5 xs:ml-2">
                                {completedSets}/{exercise.sets} sets
                                {avgWeight && exercise.usesWeight && (
                                  <span className="text-blue-600 ml-1">@ {avgWeight}lbs</span>
                                )}
                              </span>
                            </div>
                          )
                        })}
                        {workout.exercises.length > 4 && (
                          <div className="text-xs xs:text-sm text-gray-500 italic">
                            + {workout.exercises.length - 4} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              )
            })}

            {/* Load More Button */}
            {hasMore && (
              <div className="mt-6 xs:mt-8 sm:mt-10 flex justify-center animate-slide-in-up" style={{ animationDelay: '0.3s' }}>
                <button
                  onClick={loadMoreWorkouts}
                  disabled={loadingMore}
                  className="px-5 xs:px-6 py-2.5 xs:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg xs:rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 min-h-[44px] xs:min-h-[48px] touch-manipulation text-sm xs:text-base"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 xs:w-5 h-4 xs:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    'Load More Workouts'
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}