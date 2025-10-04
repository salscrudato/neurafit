// Simplified Workout Analytics

import { TrendingUp, Calendar, Clock } from 'lucide-react'

interface WorkoutData {
  id: string
  workoutType: string
  duration: number
  timestamp?: Date | { toDate(): Date } | string
}

interface WorkoutAnalyticsProps {
  workouts: WorkoutData[]
}

export function WorkoutAnalytics({ workouts }: WorkoutAnalyticsProps) {
  const totalWorkouts = workouts.length
  const totalDuration = workouts.reduce((sum, w) => sum + (w.duration || 0), 0)
  const averageDuration = totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-blue-600" />
        Workout Analytics
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <Calendar className="h-6 w-6 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{totalWorkouts}</div>
          <div className="text-sm text-gray-600">Total Workouts</div>
        </div>

        <div className="text-center p-4 bg-green-50 rounded-lg">
          <Clock className="h-6 w-6 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{Math.round(totalDuration / 60)}h</div>
          <div className="text-sm text-gray-600">Total Time</div>
        </div>

        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <TrendingUp className="h-6 w-6 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{averageDuration}m</div>
          <div className="text-sm text-gray-600">Avg Duration</div>
        </div>
      </div>
    </div>
  )
}
