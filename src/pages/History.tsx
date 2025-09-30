import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../lib/firebase'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { convertToDate, safeConvertToDate } from '../utils/timestamp'
import { ArrowLeft, Calendar, Clock, CheckCircle, XCircle, Zap, Activity, BarChart3, Trophy, TrendingUp, Target, Award } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import { WorkoutHistorySkeleton } from '../components/SkeletonLoaders'
import { WorkoutAnalytics } from '../components/WorkoutAnalytics'
import { AchievementSystem } from '../components/AchievementSystem'
import { AnalyticsEngine, formatVolume, getProgressColor, getTrendIcon } from '../lib/analytics'
import { LineChart, DonutChart } from '../components/Charts'
import { DashboardCard, StatsCard } from '../design-system/components/SpecializedCards'
import { Stagger, Floating } from '../components/MicroInteractions'

type WorkoutItem = {
  id: string
  workoutType: string
  duration: number
  plannedDuration?: number
  exercises?: { name: string; sets: number; reps: string | number; weights?: Record<number, number | null>; usesWeight?: boolean }[]
  timestamp?: Date | { toDate(): Date } | string
}

export default function History() {
  const nav = useNavigate()
  const [items, setItems] = useState<WorkoutItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'history' | 'analytics' | 'achievements'>('history')

  // Enhanced analytics with the new engine
  const analyticsEngine = useMemo(() => {
    if (items.length === 0) return null

    // Convert WorkoutItem to WorkoutSession format
    const sessions = items.map(item => ({
      date: safeConvertToDate(item.timestamp).toISOString(),
      exercises: (item.exercises || []).map(exercise => ({
        name: exercise.name,
        sets: Object.entries(exercise.weights || {}).map(([_setNum, weight]) => ({ // eslint-disable-line @typescript-eslint/no-unused-vars
          weight: weight,
          reps: typeof exercise.reps === 'number' ? exercise.reps : parseInt(exercise.reps as string) || 1,
          completed: weight !== null
        }))
      }))
    }))

    return new AnalyticsEngine(sessions)
  }, [items])

  const performanceMetrics = useMemo(() => {
    return analyticsEngine?.getPerformanceMetrics() || null
  }, [analyticsEngine])

  useEffect(() => {
    (async () => {
      try {
        const uid = auth.currentUser?.uid
        if (!uid) {
          setError('Not authenticated')
          return
        }

        console.log('📚 Loading workout history for user:', uid)
        const q = query(collection(db, 'users', uid, 'workouts'), orderBy('timestamp', 'desc'))
        const snap = await getDocs(q)

        const workouts = snap.docs.map(d => {
          const data = d.data()
          console.log('📋 Raw workout data:', { id: d.id, ...data })
          return { id: d.id, ...data } as WorkoutItem
        })

        console.log(`Loaded ${workouts.length} workouts`)
        setItems(workouts)
      } catch (err) {
        const error = err as { message?: string }
        console.error('❌ Error fetching workout history:', error)
        setError(error.message || 'Failed to load workout history')
      } finally {
        setLoading(false)
      }
    })()
  }, [])
  const formatDate = (timestamp: Date | { toDate(): Date } | string) => {
    if (!timestamp) return 'Unknown date'
    const date = convertToDate(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

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
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-200/30 to-blue-200/30 rounded-full blur-3xl" />
      </div>

      <AppHeader />

      {/* Main Content */}
      <main className="relative max-w-4xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full mb-4">
            <Activity className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">Fitness Dashboard</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Fitness Journey</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Track your progress, analyze your performance, and celebrate your achievements.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white rounded-2xl p-1 border border-gray-200 shadow-sm">
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                History
              </div>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'analytics'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </div>
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'achievements'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Achievements
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'history' && (
          <>
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

              // Calculate completion rate based on sets completed, not exercises
              const setCompletionRate = stats.totalSets > 0 ? Math.round((stats.completedSets / stats.totalSets) * 100) : 0
              const exerciseCompletionRate = stats.totalExercises > 0 ? Math.round((stats.completedExercises / stats.totalExercises) * 100) : 0

              // Use set completion rate as the primary metric
              const completionRate = setCompletionRate

              // Debug logging for workout stats
              console.log(`Workout "${workout.workoutType}" stats:`, {
                totalExercises: stats.totalExercises,
                completedExercises: stats.completedExercises,
                fullyCompletedExercises: stats.fullyCompletedExercises,
                totalSets: stats.totalSets,
                completedSets: stats.completedSets,
                setCompletionRate: setCompletionRate,
                exerciseCompletionRate: exerciseCompletionRate,
                finalCompletionRate: completionRate
              })

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
                          <span>{formatDate(workout.timestamp || new Date())}</span>
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
                        ) : completionRate > 0 ? (
                          <div className="h-5 w-5 rounded-full bg-orange-100 flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-orange-500" />
                          </div>
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <span className="text-sm font-medium text-gray-700">{completionRate}%</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {stats.completedSets}/{stats.totalSets} sets completed
                      </div>
                      <div className="text-xs text-gray-400">
                        {stats.completedExercises}/{stats.totalExercises} exercises started
                      </div>
                    </div>
                  </div>

                  {/* Exercise Preview */}
                  {workout.exercises && workout.exercises.length > 0 && (
                    <div className="border-t border-gray-100 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {workout.exercises.slice(0, 4).map((exercise, index) => {
                          // Calculate average weight more safely
                          let avgWeight = null
                          let completedSets = 0

                          if (exercise.weights && typeof exercise.weights === 'object') {
                            const weights = Object.values(exercise.weights).filter(w => w !== null && w > 0) as number[]
                            completedSets = Object.values(exercise.weights).filter(w => w !== null).length

                            if (weights.length > 0) {
                              avgWeight = Math.round(weights.reduce((sum, w) => sum + w, 0) / weights.length)
                            }
                          }

                          return (
                            <div key={index} className="text-sm text-gray-700">
                              <span className="font-medium">{exercise.name}</span>
                              <span className="text-gray-500 ml-2">
                                {completedSets}/{exercise.sets} sets
                                {avgWeight && exercise.usesWeight && (
                                  <span className="text-blue-600 ml-1">@ {avgWeight}lbs</span>
                                )}
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
          </>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {performanceMetrics ? (
              <Stagger delay={100}>
                {/* Performance Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <StatsCard
                    label="Total Workouts"
                    value={performanceMetrics.totalWorkouts}
                    change={`${performanceMetrics.workoutFrequency.toFixed(1)}/week`}
                    trend="up"
                    icon={<Zap className="h-5 w-5" />}
                  />
                  <StatsCard
                    label="Total Volume"
                    value={formatVolume(performanceMetrics.totalVolume)}
                    change={`${performanceMetrics.totalSets} sets`}
                    trend="up"
                    icon={<TrendingUp className="h-5 w-5" />}
                  />
                  <StatsCard
                    label="Consistency"
                    value={`${performanceMetrics.consistencyScore}%`}
                    change={performanceMetrics.consistencyScore > 70 ? 'Excellent!' : 'Keep going!'}
                    trend={performanceMetrics.consistencyScore > 70 ? 'up' : 'neutral'}
                    icon={<Target className="h-5 w-5" />}
                  />
                  <StatsCard
                    label="Progress Rate"
                    value={`${performanceMetrics.progressionRate.toFixed(1)}%`}
                    change="Overall improvement"
                    trend={performanceMetrics.progressionRate > 0 ? 'up' : 'down'}
                    icon={<Award className="h-5 w-5" />}
                  />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* Weekly Volume Chart */}
                  <Floating intensity={4} duration={3000}>
                    <DashboardCard
                      title="Weekly Volume Trend"
                      description="Your training volume over the past 12 weeks"
                      icon={<BarChart3 className="h-5 w-5" />}
                    >
                      <div className="mt-4">
                        <LineChart
                          data={performanceMetrics.weeklyStats.map(week => ({
                            label: new Date(week.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                            value: week.totalVolume,
                            date: week.weekStart
                          }))}
                          height={200}
                          color="#3B82F6"
                          animated
                        />
                      </div>
                    </DashboardCard>
                  </Floating>

                  {/* Exercise Distribution */}
                  <Floating intensity={6} duration={3500}>
                    <DashboardCard
                      title="Exercise Distribution"
                      description="Your most trained exercises by volume"
                      icon={<Activity className="h-5 w-5" />}
                    >
                      <div className="mt-4">
                        <DonutChart
                          data={performanceMetrics.exerciseStats.slice(0, 5).map((exercise, index) => ({
                            label: exercise.name,
                            value: exercise.totalVolume,
                            color: `hsl(${(index * 72)}, 70%, 50%)`
                          }))}
                          size={200}
                          animated
                        />
                      </div>
                    </DashboardCard>
                  </Floating>
                </div>

                {/* Exercise Performance Table */}
                <DashboardCard
                  title="Exercise Performance Analysis"
                  description="Detailed breakdown of your exercise progress"
                  icon={<Trophy className="h-5 w-5" />}
                >
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Exercise</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-900">Volume</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-900">Max Weight</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-900">Progress</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-900">Trend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {performanceMetrics.exerciseStats.slice(0, 10).map((exercise) => (
                          <tr key={exercise.name} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium text-gray-900">{exercise.name}</td>
                            <td className="py-3 px-4 text-right text-gray-600">
                              {formatVolume(exercise.totalVolume)}
                            </td>
                            <td className="py-3 px-4 text-right text-gray-600">
                              {exercise.maxWeight} lbs
                            </td>
                            <td className={`py-3 px-4 text-right font-medium ${getProgressColor(exercise.progressionRate)}`}>
                              {exercise.progressionRate > 0 ? '+' : ''}{exercise.progressionRate.toFixed(1)}%
                            </td>
                            <td className="py-3 px-4 text-center text-lg">
                              {getTrendIcon(exercise.volumeTrend)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </DashboardCard>

                {/* Personal Records */}
                {performanceMetrics.personalRecords.length > 0 && (
                  <DashboardCard
                    title="Recent Personal Records"
                    description="Your latest achievements and milestones"
                    icon={<Award className="h-5 w-5" />}
                  >
                    <div className="mt-6 space-y-4">
                      {performanceMetrics.personalRecords.slice(0, 5).map((record, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                          <div>
                            <h4 className="font-semibold text-gray-900">{record.exerciseName}</h4>
                            <p className="text-sm text-gray-600">
                              {record.weight} lbs × {record.reps} reps
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(record.date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-yellow-500">
                              <Trophy className="h-6 w-6" />
                            </div>
                            {record.previousRecord && (
                              <p className="text-xs text-green-600">
                                +{(record.weight - record.previousRecord.weight).toFixed(1)} lbs
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </DashboardCard>
                )}
              </Stagger>
            ) : (
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Available</h3>
                <p className="text-gray-600">Complete some workouts to see your performance analytics.</p>
              </div>
            )}

            {/* Fallback to original analytics component */}
            <WorkoutAnalytics workouts={items} timeRange="month" />
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <AchievementSystem workouts={items} />
        )}
      </main>
    </div>
  )
}