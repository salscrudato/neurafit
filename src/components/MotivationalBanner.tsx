// src/components/MotivationalBanner.tsx
import { memo, useMemo } from 'react'
import { Trophy, Target, Zap, TrendingUp, Award } from 'lucide-react'

interface MotivationalBannerProps {
  totalWorkouts: number
  weeklyWorkouts: number
  streak: number
  consistencyScore: number
}

export const MotivationalBanner = memo(function MotivationalBanner({
  totalWorkouts,
  weeklyWorkouts,
  streak,
  consistencyScore
}: MotivationalBannerProps) {
  // Memoize the motivational message calculation
  const motivation = useMemo(() => {
    const getMotivationalMessage = () => {
    if (streak >= 7) {
      return {
        icon: Trophy,
        title: `${streak} Day Streak! 🔥`,
        message: "You're on fire! This consistency is building incredible momentum.",
        color: "from-orange-500 to-red-500",
        bgColor: "from-orange-50 to-red-50"
      }
    }

    if (weeklyWorkouts >= 4) {
      return {
        icon: Award,
        title: "Crushing Your Goals!",
        message: `${weeklyWorkouts} workouts this week - you're exceeding expectations!`,
        color: "from-green-500 to-emerald-600",
        bgColor: "from-green-50 to-emerald-50"
      }
    }

    if (consistencyScore >= 80) {
      return {
        icon: Target,
        title: "Consistency Champion",
        message: `${Math.round(consistencyScore)}% consistency rate - you're building lasting habits!`,
        color: "from-purple-500 to-violet-600",
        bgColor: "from-purple-50 to-violet-50"
      }
    }

    if (totalWorkouts >= 10) {
      return {
        icon: TrendingUp,
        title: "Building Momentum",
        message: `${totalWorkouts} workouts completed - you're making real progress!`,
        color: "from-blue-500 to-cyan-600",
        bgColor: "from-blue-50 to-cyan-50"
      }
    }

    return {
      icon: Zap,
      title: "Keep Going Strong!",
      message: "Every workout brings you closer to your goals. You've got this!",
      color: "from-indigo-500 to-blue-600",
      bgColor: "from-indigo-50 to-blue-50"
    }
  }

    return getMotivationalMessage()
  }, [totalWorkouts, weeklyWorkouts, streak, consistencyScore])

  const Icon = motivation.icon

  return (
    <div className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${motivation.bgColor} border border-white/80 shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-[1.002] hover:-translate-y-1`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-white/30 to-transparent" />
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-white/30 blur-3xl group-hover:blur-2xl group-hover:scale-110 transition-all duration-700" />
      <div className="absolute -left-16 -bottom-16 h-32 w-32 rounded-full bg-white/20 blur-2xl group-hover:blur-3xl transition-all duration-700" />
      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/60 pointer-events-none" />
      <div className="relative p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br ${motivation.color} flex items-center justify-center shadow-lg shadow-current/40 group-hover:shadow-xl group-hover:shadow-current/50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ring-2 ring-white/50`}>
            <Icon className="h-7 w-7 sm:h-8 sm:w-8 text-white drop-shadow-sm" />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-slate-800 transition-colors duration-300 leading-tight tracking-tight drop-shadow-sm">
              {motivation.title}
            </h3>
            <p className="text-slate-700 text-sm sm:text-base leading-snug font-medium max-w-2xl">
              {motivation.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
})

interface WeeklyGoalProgressProps {
  currentWorkouts: number
  goalWorkouts?: number
}

export const WeeklyGoalProgress = memo(function WeeklyGoalProgress({ currentWorkouts, goalWorkouts = 3 }: WeeklyGoalProgressProps) {
  const progress = Math.min((currentWorkouts / goalWorkouts) * 100, 100)
  const isComplete = currentWorkouts >= goalWorkouts

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-semibold text-slate-900">Weekly Goal</h4>
          <p className="text-sm text-slate-600">{currentWorkouts} of {goalWorkouts} workouts</p>
        </div>
        <div className={`text-2xl font-bold ${isComplete ? 'text-emerald-600' : 'text-slate-700'}`}>
          {Math.round(progress)}%
        </div>
      </div>

      <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ease-out ${
            isComplete
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
              : 'bg-gradient-to-r from-slate-500 to-slate-600'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {isComplete && (
        <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
          <Trophy className="h-4 w-4" />
          Goal achieved!
        </div>
      )}
    </div>
  )
})

interface NextWorkoutSuggestionProps {
  lastWorkoutType?: string
  daysSinceLastWorkout?: number
}

export const NextWorkoutSuggestion = memo(function NextWorkoutSuggestion({ daysSinceLastWorkout = 0 }: NextWorkoutSuggestionProps) {
  const suggestion = useMemo(() => {
    const getSuggestion = () => {
    if (daysSinceLastWorkout === 0) {
      return {
        title: "Great job today!",
        suggestion: "Take some time to recover, then come back stronger tomorrow.",
        urgency: "low"
      }
    }
    
    if (daysSinceLastWorkout === 1) {
      return {
        title: "Ready for another session?",
        suggestion: "Perfect timing for your next workout. Your muscles are recovered and ready!",
        urgency: "medium"
      }
    }
    
    if (daysSinceLastWorkout >= 3) {
      return {
        title: "Time to get back in there!",
        suggestion: "It's been a few days - your body is ready for some action!",
        urgency: "high"
      }
    }
    
    return {
      title: "Keep the momentum going",
      suggestion: "You're in a great rhythm. Ready for your next challenge?",
      urgency: "medium"
    }
  }

    return getSuggestion()
  }, [daysSinceLastWorkout])

  const urgencyColors = {
    low: "from-gray-500 to-gray-600",
    medium: "from-blue-500 to-indigo-600", 
    high: "from-orange-500 to-red-500"
  }

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-gray-100/50 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${urgencyColors[suggestion.urgency as keyof typeof urgencyColors]} flex items-center justify-center`}>
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 text-sm">{suggestion.title}</h4>
          <p className="text-xs text-gray-600 mt-1">{suggestion.suggestion}</p>
        </div>
      </div>
    </div>
  )
})
