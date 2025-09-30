// src/components/WorkoutAnalytics.tsx
import React, { useMemo } from 'react'
import { TrendingUp, Calendar, Clock, Zap, Target, Award, Activity } from 'lucide-react'
import { convertToDate, formatTimestampISO } from '../utils/timestamp'

interface WorkoutData {
  id: string
  workoutType: string
  duration: number
  plannedDuration?: number
  exercises?: {
    name: string
    sets: number
    reps: string | number
    weights?: Record<number, number | null>
    usesWeight?: boolean
  }[]
  timestamp?: Date | { toDate(): Date } | string
}

interface WorkoutAnalyticsProps {
  workouts: WorkoutData[]
  timeRange?: 'week' | 'month' | 'all'
}

interface AnalyticsMetrics {
  totalWorkouts: number
  totalDuration: number
  averageDuration: number
  completionRate: number
  totalVolume: number
  averageVolume: number
  consistencyScore: number
  favoriteExercises: { name: string; count: number }[]
  weeklyTrend: number[]
  monthlyTrend: number[]
  personalRecords: { exercise: string; weight: number; date: string }[]
}

export function WorkoutAnalytics({ workouts, timeRange = 'month' }: WorkoutAnalyticsProps) {
  const metrics = useMemo((): AnalyticsMetrics => {
    if (workouts.length === 0) {
      return {
        totalWorkouts: 0,
        totalDuration: 0,
        averageDuration: 0,
        completionRate: 0,
        totalVolume: 0,
        averageVolume: 0,
        consistencyScore: 0,
        favoriteExercises: [],
        weeklyTrend: [],
        monthlyTrend: [],
        personalRecords: []
      }
    }

    // Filter workouts based on time range
    const now = new Date()
    const filteredWorkouts = workouts.filter(workout => {
      if (!workout.timestamp) return true
      
      const workoutDate = convertToDate(workout.timestamp)
      const daysDiff = Math.floor((now.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24))
      
      switch (timeRange) {
        case 'week': return daysDiff <= 7
        case 'month': return daysDiff <= 30
        default: return true
      }
    })

    // Basic metrics
    const totalWorkouts = filteredWorkouts.length
    const totalDuration = filteredWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0)
    const averageDuration = totalWorkouts > 0 ? totalDuration / totalWorkouts : 0

    // Completion rate (based on planned vs actual duration)
    const workoutsWithPlanned = filteredWorkouts.filter(w => w.plannedDuration && w.plannedDuration > 0)
    const completionRate = workoutsWithPlanned.length > 0 
      ? workoutsWithPlanned.reduce((sum, w) => {
          const ratio = Math.min(w.duration / (w.plannedDuration || w.duration), 1)
          return sum + ratio
        }, 0) / workoutsWithPlanned.length * 100
      : 100

    // Volume calculation (weight × reps × sets)
    let totalVolume = 0
    const exerciseCounts: Record<string, number> = {}
    const exerciseMaxWeights: Record<string, { weight: number; date: string }> = {}

    filteredWorkouts.forEach(workout => {
      let workoutVolume = 0
      const workoutDate = formatTimestampISO(workout.timestamp || new Date())
      
      workout.exercises?.forEach(exercise => {
        exerciseCounts[exercise.name] = (exerciseCounts[exercise.name] || 0) + 1
        
        if (exercise.weights && exercise.usesWeight) {
          const weights = Object.values(exercise.weights).filter(w => w && w > 0) as number[]
          if (weights.length > 0) {
            const maxWeight = Math.max(...weights)
            const reps = typeof exercise.reps === 'number' ? exercise.reps : parseInt(exercise.reps) || 10
            const volume = weights.reduce((sum, weight) => sum + (weight * reps), 0)
            
            workoutVolume += volume
            
            // Track personal records
            if (!exerciseMaxWeights[exercise.name] || maxWeight > exerciseMaxWeights[exercise.name].weight) {
              exerciseMaxWeights[exercise.name] = { weight: maxWeight, date: workoutDate }
            }
          }
        }
      })
      
      totalVolume += workoutVolume
    })

    const averageVolume = totalWorkouts > 0 ? totalVolume / totalWorkouts : 0

    // Favorite exercises (most frequently performed)
    const favoriteExercises = Object.entries(exerciseCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))

    // Personal records
    const personalRecords = Object.entries(exerciseMaxWeights)
      .map(([exercise, { weight, date }]) => ({ exercise, weight, date }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5)

    // Weekly trend (last 7 weeks)
    const weeklyTrend: number[] = []
    for (let i = 6; i >= 0; i--) {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - (i * 7) - now.getDay())
      weekStart.setHours(0, 0, 0, 0)
      
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)
      
      const weekWorkouts = workouts.filter(w => {
        if (!w.timestamp) return false
        const workoutDate = convertToDate(w.timestamp)
        return workoutDate >= weekStart && workoutDate <= weekEnd
      }).length
      
      weeklyTrend.push(weekWorkouts)
    }

    // Monthly trend (last 6 months)
    const monthlyTrend: number[] = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      const monthWorkouts = workouts.filter(w => {
        if (!w.timestamp) return false
        const workoutDate = convertToDate(w.timestamp)
        return workoutDate >= monthStart && workoutDate <= monthEnd
      }).length
      
      monthlyTrend.push(monthWorkouts)
    }

    // Consistency score (workouts per week over the time range)
    const weeksInRange = timeRange === 'week' ? 1 : timeRange === 'month' ? 4 : 12
    const expectedWorkouts = weeksInRange * 3 // Assuming 3 workouts per week as ideal
    const consistencyScore = Math.min((totalWorkouts / expectedWorkouts) * 100, 100)

    return {
      totalWorkouts,
      totalDuration,
      averageDuration,
      completionRate,
      totalVolume,
      averageVolume,
      consistencyScore,
      favoriteExercises,
      weeklyTrend,
      monthlyTrend,
      personalRecords
    }
  }, [workouts, timeRange])

  if (workouts.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm p-6">
        <div className="text-center">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Workout Data</h3>
          <p className="text-gray-600">Complete some workouts to see your analytics!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<Calendar className="h-5 w-5" />}
          label="Total Workouts"
          value={metrics.totalWorkouts.toString()}
          color="blue"
        />
        <MetricCard
          icon={<Clock className="h-5 w-5" />}
          label="Avg Duration"
          value={`${Math.round(metrics.averageDuration)}m`}
          color="green"
        />
        <MetricCard
          icon={<Target className="h-5 w-5" />}
          label="Completion Rate"
          value={`${Math.round(metrics.completionRate)}%`}
          color="purple"
        />
        <MetricCard
          icon={<Zap className="h-5 w-5" />}
          label="Consistency"
          value={`${Math.round(metrics.consistencyScore)}%`}
          color="orange"
        />
      </div>

      {/* Workout Frequency Chart */}
      <div className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Workout Frequency</h3>
        </div>
        
        <div className="space-y-4">
          {/* Weekly Trend */}
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Last 7 Weeks</div>
            <div className="flex items-end gap-2 h-20">
              {metrics.weeklyTrend.map((count, index) => {
                const maxCount = Math.max(...metrics.weeklyTrend, 1)
                const height = (count / maxCount) * 100
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all duration-300"
                      style={{ height: `${height}%`, minHeight: '4px' }}
                    />
                    <div className="text-xs text-gray-500 mt-1">{count}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Monthly Trend */}
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Last 6 Months</div>
            <div className="flex items-end gap-2 h-16">
              {metrics.monthlyTrend.map((count, index) => {
                const maxCount = Math.max(...metrics.monthlyTrend, 1)
                const height = (count / maxCount) * 100
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t transition-all duration-300"
                      style={{ height: `${height}%`, minHeight: '4px' }}
                    />
                    <div className="text-xs text-gray-500 mt-1">{count}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Personal Records & Favorite Exercises */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Personal Records */}
        {metrics.personalRecords.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Award className="h-5 w-5 text-yellow-600" />
              <h3 className="text-lg font-semibold text-gray-900">Personal Records</h3>
            </div>
            <div className="space-y-3">
              {metrics.personalRecords.map((record, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                  <div>
                    <div className="font-medium text-gray-900">{record.exercise}</div>
                    <div className="text-xs text-gray-600">{record.date}</div>
                  </div>
                  <div className="text-lg font-bold text-yellow-700">
                    {record.weight} lbs
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Favorite Exercises */}
        {metrics.favoriteExercises.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Most Performed</h3>
            </div>
            <div className="space-y-3">
              {metrics.favoriteExercises.map((exercise, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <div className="font-medium text-gray-900">{exercise.name}</div>
                  <div className="text-lg font-bold text-purple-700">
                    {exercise.count}×
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
  color: 'blue' | 'green' | 'purple' | 'orange'
}

function MetricCard({ icon, label, value, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'from-blue-50 to-indigo-50 border-blue-200 text-blue-600',
    green: 'from-green-50 to-emerald-50 border-green-200 text-green-600',
    purple: 'from-purple-50 to-pink-50 border-purple-200 text-purple-600',
    orange: 'from-orange-50 to-yellow-50 border-orange-200 text-orange-600'
  }

  return (
    <div className={`rounded-2xl border bg-gradient-to-br backdrop-blur-sm p-4 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  )
}
