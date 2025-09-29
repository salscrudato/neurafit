// src/components/AchievementSystem.tsx
import React, { useMemo } from 'react'
import { Award, Calendar, Clock, Target, TrendingUp, Zap } from 'lucide-react'

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
  timestamp?: any
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  progress: number
  maxProgress: number
  unlocked: boolean
  unlockedDate?: string
  category: 'milestone' | 'consistency' | 'strength' | 'dedication'
}

interface AchievementSystemProps {
  workouts: WorkoutData[]
}

export function AchievementSystem({ workouts }: AchievementSystemProps) {
  const achievements = useMemo((): Achievement[] => {
    const totalWorkouts = workouts.length
    const totalDuration = workouts.reduce((sum, w) => sum + (w.duration || 0), 0)
    const totalVolume = workouts.reduce((sum, workout) => {
      return sum + (workout.exercises?.reduce((exerciseSum, exercise) => {
        if (exercise.weights && exercise.usesWeight) {
          const weights = Object.values(exercise.weights).filter(w => w && w > 0) as number[]
          const reps = typeof exercise.reps === 'number' ? exercise.reps : parseInt(exercise.reps) || 10
          return exerciseSum + weights.reduce((weightSum, weight) => weightSum + (weight * reps), 0)
        }
        return exerciseSum
      }, 0) || 0)
    }, 0)

    // Get max weight for any exercise
    const maxWeight = workouts.reduce((max, workout) => {
      const workoutMax = workout.exercises?.reduce((exerciseMax, exercise) => {
        if (exercise.weights && exercise.usesWeight) {
          const weights = Object.values(exercise.weights).filter(w => w && w > 0) as number[]
          return Math.max(exerciseMax, ...weights)
        }
        return exerciseMax
      }, 0) || 0
      return Math.max(max, workoutMax)
    }, 0)

    // Calculate consistency (workouts in last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentWorkouts = workouts.filter(w => {
      if (!w.timestamp) return false
      const workoutDate = w.timestamp.toDate ? w.timestamp.toDate() : new Date(w.timestamp)
      return workoutDate >= thirtyDaysAgo
    }).length

    // Calculate weekly consistency (last 4 weeks)
    const weeklyWorkouts = []
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - (i * 7) - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)
      
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)
      
      const weekCount = workouts.filter(w => {
        if (!w.timestamp) return false
        const workoutDate = w.timestamp.toDate ? w.timestamp.toDate() : new Date(w.timestamp)
        return workoutDate >= weekStart && workoutDate <= weekEnd
      }).length
      
      weeklyWorkouts.push(weekCount)
    }

    const consistentWeeks = weeklyWorkouts.filter(count => count >= 3).length

    return [
      // Milestone Achievements
      {
        id: 'first_workout',
        title: 'Getting Started',
        description: 'Complete your first workout',
        icon: <Zap className="h-6 w-6" />,
        progress: Math.min(totalWorkouts, 1),
        maxProgress: 1,
        unlocked: totalWorkouts >= 1,
        unlockedDate: totalWorkouts >= 1 ? workouts[workouts.length - 1]?.timestamp?.toDate?.()?.toLocaleDateString() : undefined,
        category: 'milestone'
      },
      {
        id: 'workout_5',
        title: 'Building Momentum',
        description: 'Complete 5 workouts',
        icon: <Target className="h-6 w-6" />,
        progress: Math.min(totalWorkouts, 5),
        maxProgress: 5,
        unlocked: totalWorkouts >= 5,
        unlockedDate: totalWorkouts >= 5 ? workouts[Math.max(0, workouts.length - 5)]?.timestamp?.toDate?.()?.toLocaleDateString() : undefined,
        category: 'milestone'
      },
      {
        id: 'workout_25',
        title: 'Quarter Century',
        description: 'Complete 25 workouts',
        icon: <Award className="h-6 w-6" />,
        progress: Math.min(totalWorkouts, 25),
        maxProgress: 25,
        unlocked: totalWorkouts >= 25,
        unlockedDate: totalWorkouts >= 25 ? workouts[Math.max(0, workouts.length - 25)]?.timestamp?.toDate?.()?.toLocaleDateString() : undefined,
        category: 'milestone'
      },
      {
        id: 'workout_50',
        title: 'Half Century Hero',
        description: 'Complete 50 workouts',
        icon: <Award className="h-6 w-6" />,
        progress: Math.min(totalWorkouts, 50),
        maxProgress: 50,
        unlocked: totalWorkouts >= 50,
        unlockedDate: totalWorkouts >= 50 ? workouts[Math.max(0, workouts.length - 50)]?.timestamp?.toDate?.()?.toLocaleDateString() : undefined,
        category: 'milestone'
      },

      // Consistency Achievements
      {
        id: 'weekly_warrior',
        title: 'Weekly Warrior',
        description: 'Work out 3+ times per week for 4 weeks',
        icon: <Calendar className="h-6 w-6" />,
        progress: Math.min(consistentWeeks, 4),
        maxProgress: 4,
        unlocked: consistentWeeks >= 4,
        unlockedDate: consistentWeeks >= 4 ? 'Recently achieved' : undefined,
        category: 'consistency'
      },
      {
        id: 'monthly_master',
        title: 'Monthly Master',
        description: 'Complete 12 workouts in 30 days',
        icon: <TrendingUp className="h-6 w-6" />,
        progress: Math.min(recentWorkouts, 12),
        maxProgress: 12,
        unlocked: recentWorkouts >= 12,
        unlockedDate: recentWorkouts >= 12 ? 'Recently achieved' : undefined,
        category: 'consistency'
      },

      // Strength Achievements
      {
        id: 'century_club',
        title: 'Century Club',
        description: 'Lift 100+ lbs in a single set',
        icon: <Award className="h-6 w-6" />,
        progress: Math.min(maxWeight, 100),
        maxProgress: 100,
        unlocked: maxWeight >= 100,
        unlockedDate: maxWeight >= 100 ? 'Recently achieved' : undefined,
        category: 'strength'
      },
      {
        id: 'heavy_lifter',
        title: 'Heavy Lifter',
        description: 'Lift 200+ lbs in a single set',
        icon: <Award className="h-6 w-6" />,
        progress: Math.min(maxWeight, 200),
        maxProgress: 200,
        unlocked: maxWeight >= 200,
        unlockedDate: maxWeight >= 200 ? 'Recently achieved' : undefined,
        category: 'strength'
      },
      {
        id: 'powerhouse',
        title: 'Powerhouse',
        description: 'Lift 300+ lbs in a single set',
        icon: <Award className="h-6 w-6" />,
        progress: Math.min(maxWeight, 300),
        maxProgress: 300,
        unlocked: maxWeight >= 300,
        unlockedDate: maxWeight >= 300 ? 'Recently achieved' : undefined,
        category: 'strength'
      },

      // Dedication Achievements
      {
        id: 'time_dedication_5h',
        title: 'Time Investment',
        description: 'Spend 5 hours working out',
        icon: <Clock className="h-6 w-6" />,
        progress: Math.min(totalDuration, 300),
        maxProgress: 300,
        unlocked: totalDuration >= 300,
        unlockedDate: totalDuration >= 300 ? 'Recently achieved' : undefined,
        category: 'dedication'
      },
      {
        id: 'time_dedication_20h',
        title: 'Time Dedication',
        description: 'Spend 20 hours working out',
        icon: <Clock className="h-6 w-6" />,
        progress: Math.min(totalDuration, 1200),
        maxProgress: 1200,
        unlocked: totalDuration >= 1200,
        unlockedDate: totalDuration >= 1200 ? 'Recently achieved' : undefined,
        category: 'dedication'
      },
      {
        id: 'volume_master',
        title: 'Volume Master',
        description: 'Lift 50,000 lbs total volume',
        icon: <TrendingUp className="h-6 w-6" />,
        progress: Math.min(totalVolume, 50000),
        maxProgress: 50000,
        unlocked: totalVolume >= 50000,
        unlockedDate: totalVolume >= 50000 ? 'Recently achieved' : undefined,
        category: 'dedication'
      }
    ]
  }, [workouts])

  const unlockedAchievements = achievements.filter(a => a.unlocked)
  const lockedAchievements = achievements.filter(a => !a.unlocked)

  const categoryColors = {
    milestone: 'from-blue-50 to-indigo-50 border-blue-200 text-blue-600',
    consistency: 'from-green-50 to-emerald-50 border-green-200 text-green-600',
    strength: 'from-red-50 to-orange-50 border-red-200 text-red-600',
    dedication: 'from-purple-50 to-pink-50 border-purple-200 text-purple-600'
  }

  if (workouts.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm p-6">
        <div className="text-center">
          <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Achievements Yet</h3>
          <p className="text-gray-600">Complete your first workout to start earning achievements!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm p-6">
      <div className="flex items-center gap-2 mb-6">
        <Award className="h-5 w-5 text-yellow-600" />
        <h3 className="text-lg font-semibold text-gray-900">Achievements</h3>
        <div className="ml-auto text-sm text-gray-600">
          {unlockedAchievements.length} / {achievements.length}
        </div>
      </div>

      {/* Progress Overview */}
      <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm text-yellow-600 font-semibold">
            {Math.round((unlockedAchievements.length / achievements.length) * 100)}%
          </span>
        </div>
        <div className="w-full bg-yellow-200 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-yellow-500 to-orange-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${(unlockedAchievements.length / achievements.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {/* Unlocked Achievements */}
        {unlockedAchievements.map(achievement => (
          <div key={achievement.id} className={`flex items-center gap-4 p-4 bg-gradient-to-r rounded-xl border ${categoryColors[achievement.category]}`}>
            <div className="text-current">
              {achievement.icon}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900">{achievement.title}</div>
              <div className="text-sm text-gray-600">{achievement.description}</div>
              {achievement.unlockedDate && (
                <div className="text-xs text-current mt-1 opacity-75">Unlocked: {achievement.unlockedDate}</div>
              )}
            </div>
            <div className="text-current">
              <Award className="h-5 w-5" />
            </div>
          </div>
        ))}

        {/* Locked Achievements */}
        {lockedAchievements.map(achievement => (
          <div key={achievement.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="text-gray-400">
              {achievement.icon}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-700">{achievement.title}</div>
              <div className="text-sm text-gray-500">{achievement.description}</div>
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{achievement.progress} / {achievement.maxProgress}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
