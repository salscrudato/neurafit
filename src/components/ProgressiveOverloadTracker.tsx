// src/components/ProgressiveOverloadTracker.tsx
import { useMemo } from 'react'
import { TrendingUp, Target, Award, Calendar } from 'lucide-react'

interface WorkoutSession {
  date: string
  exercises: {
    name: string
    sets: { weight: number | null; reps: number; completed: boolean }[]
  }[]
}

interface ProgressiveOverloadTrackerProps {
  exerciseName: string
  recentSessions: WorkoutSession[]
  currentWeight?: number | null
  targetReps?: number | string
}

interface ProgressMetrics {
  volumeProgression: number[]
  maxWeightProgression: number[]
  averageWeightProgression: number[]
  totalVolumeChange: number
  maxWeightChange: number
  consistencyScore: number
  recommendations: string[]
}

export function ProgressiveOverloadTracker({
  exerciseName,
  recentSessions,
  currentWeight,
  targetReps: _targetReps
}: ProgressiveOverloadTrackerProps) {
  const metrics = useMemo((): ProgressMetrics => {
    const exerciseData = recentSessions
      .map(session => ({
        date: session.date,
        exercise: session.exercises.find(ex => ex.name === exerciseName)
      }))
      .filter(data => data.exercise)
      .slice(-8) // Last 8 sessions

    if (exerciseData.length === 0) {
      return {
        volumeProgression: [],
        maxWeightProgression: [],
        averageWeightProgression: [],
        totalVolumeChange: 0,
        maxWeightChange: 0,
        consistencyScore: 0,
        recommendations: ['Complete more workouts to see progression analysis']
      }
    }

    // Calculate progressions
    const volumeProgression: number[] = []
    const maxWeightProgression: number[] = []
    const averageWeightProgression: number[] = []

    exerciseData.forEach(({ exercise }) => {
      if (!exercise) return

      const completedSets = exercise.sets.filter(set => set.completed && set.weight && set.weight > 0)
      
      if (completedSets.length === 0) {
        volumeProgression.push(0)
        maxWeightProgression.push(0)
        averageWeightProgression.push(0)
        return
      }

      // Volume = weight × reps × sets
      const totalVolume = completedSets.reduce((sum, set) => {
        return sum + (set.weight! * set.reps)
      }, 0)
      
      const maxWeight = Math.max(...completedSets.map(set => set.weight!))
      const avgWeight = completedSets.reduce((sum, set) => sum + set.weight!, 0) / completedSets.length

      volumeProgression.push(totalVolume)
      maxWeightProgression.push(maxWeight)
      averageWeightProgression.push(avgWeight)
    })

    // Calculate changes
    const totalVolumeChange = volumeProgression.length >= 2 && volumeProgression[0] !== undefined && volumeProgression[volumeProgression.length - 1] !== undefined
      ? ((volumeProgression[volumeProgression.length - 1]! - volumeProgression[0]!) / volumeProgression[0]!) * 100
      : 0

    const maxWeightChange = maxWeightProgression.length >= 2 && maxWeightProgression[0] !== undefined && maxWeightProgression[maxWeightProgression.length - 1] !== undefined
      ? ((maxWeightProgression[maxWeightProgression.length - 1]! - maxWeightProgression[0]!) / maxWeightProgression[0]!) * 100
      : 0

    // Consistency score (percentage of sessions where exercise was performed)
    const consistencyScore = (exerciseData.length / recentSessions.length) * 100

    // Generate recommendations
    const recommendations: string[] = []
    
    if (maxWeightChange > 10) {
      recommendations.push('Great strength gains! Consider focusing on volume next.')
    } else if (maxWeightChange < -5) {
      recommendations.push('Weight has decreased. Focus on recovery and form.')
    } else if (Math.abs(maxWeightChange) < 2) {
      recommendations.push('Try increasing weight by 2.5-5 lbs next session.')
    }

    if (totalVolumeChange > 15) {
      recommendations.push('Excellent volume progression! You\'re getting stronger.')
    } else if (totalVolumeChange < -10) {
      recommendations.push('Volume has decreased. Consider reducing weight to maintain reps.')
    }

    if (consistencyScore < 70) {
      recommendations.push('Try to perform this exercise more consistently for better results.')
    }

    if (currentWeight && maxWeightProgression.length > 0) {
      const lastMaxWeight = maxWeightProgression[maxWeightProgression.length - 1]
      if (lastMaxWeight && currentWeight > lastMaxWeight) {
        recommendations.push('New personal record! Great job pushing your limits.')
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Keep up the consistent training!')
    }

    return {
      volumeProgression,
      maxWeightProgression,
      averageWeightProgression,
      totalVolumeChange,
      maxWeightChange,
      consistencyScore,
      recommendations
    }
  }, [exerciseName, recentSessions, currentWeight])

  if (metrics.volumeProgression.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-gray-600" />
          <span className="font-medium text-gray-900">Progressive Overload</span>
        </div>
        <p className="text-sm text-gray-600">Complete more sessions to see your progression!</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm p-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-blue-600" />
        <span className="font-medium text-gray-900">Progressive Overload</span>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
          <div className={`text-lg font-bold ${
            metrics.maxWeightChange > 0 ? 'text-green-600' : 
            metrics.maxWeightChange < 0 ? 'text-red-600' : 'text-gray-600'
          }`}>
            {metrics.maxWeightChange > 0 ? '+' : ''}{metrics.maxWeightChange.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-600">Max Weight</div>
        </div>

        <div className="text-center p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
          <div className={`text-lg font-bold ${
            metrics.totalVolumeChange > 0 ? 'text-green-600' : 
            metrics.totalVolumeChange < 0 ? 'text-red-600' : 'text-gray-600'
          }`}>
            {metrics.totalVolumeChange > 0 ? '+' : ''}{metrics.totalVolumeChange.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-600">Total Volume</div>
        </div>

        <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
          <div className="text-lg font-bold text-purple-600">
            {metrics.consistencyScore.toFixed(0)}%
          </div>
          <div className="text-xs text-gray-600">Consistency</div>
        </div>
      </div>

      {/* Mini Progress Chart */}
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-900 mb-2">Weight Progression</div>
        <div className="flex items-end gap-1 h-16 bg-gray-50 rounded-lg p-2">
          {metrics.maxWeightProgression.map((weight, index) => {
            const maxWeight = Math.max(...metrics.maxWeightProgression)
            const height = maxWeight > 0 ? (weight / maxWeight) * 100 : 0
            const isLatest = index === metrics.maxWeightProgression.length - 1
            
            return (
              <div
                key={index}
                className="flex-1 flex flex-col items-center"
              >
                <div
                  className={`w-full rounded-t transition-all duration-300 ${
                    isLatest 
                      ? 'bg-gradient-to-t from-blue-500 to-blue-400' 
                      : 'bg-gradient-to-t from-gray-300 to-gray-200'
                  }`}
                  style={{ height: `${height}%`, minHeight: '4px' }}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {weight > 0 ? weight.toFixed(0) : '-'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Personal Records */}
      {metrics.maxWeightProgression.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium text-gray-900">Personal Record</span>
          </div>
          <div className="p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
            <div className="text-lg font-bold text-yellow-700">
              {Math.max(...metrics.maxWeightProgression)} lbs
            </div>
            <div className="text-xs text-yellow-600">
              Your heaviest lift for this exercise
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-gray-900">Recommendations</span>
        </div>
        <div className="space-y-2">
          {metrics.recommendations.map((rec, index) => (
            <div key={index} className="p-2 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm text-green-700">{rec}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Session Target */}
      {currentWeight && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-900">Next Session Target</span>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-lg font-bold text-blue-700">
              {currentWeight + 2.5} lbs
            </div>
            <div className="text-xs text-blue-600">
              Progressive overload suggestion (+2.5 lbs)
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
