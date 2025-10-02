// src/components/MotivationalBanner.tsx
import { Trophy, Target, Zap, TrendingUp, Award } from 'lucide-react'

interface MotivationalBannerProps {
  totalWorkouts: number
  weeklyWorkouts: number
  streak: number
  consistencyScore: number
}

export function MotivationalBanner({ 
  totalWorkouts, 
  weeklyWorkouts, 
  streak, 
  consistencyScore 
}: MotivationalBannerProps) {
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

  const motivation = getMotivationalMessage()
  const Icon = motivation.icon

  return (
    <div className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${motivation.bgColor} border border-white/60 shadow-xl shadow-slate-200/30 hover:shadow-2xl hover:shadow-slate-300/20 transition-all duration-500`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-white/20 to-transparent" />
      <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-white/20 blur-2xl group-hover:blur-3xl transition-all duration-500" />
      <div className="relative p-8">
        <div className="flex items-center gap-6">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${motivation.color} flex items-center justify-center shadow-xl shadow-current/25 group-hover:shadow-current/40 transition-shadow duration-300`}>
            <Icon className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
              {motivation.title}
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {motivation.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

interface WeeklyGoalProgressProps {
  currentWorkouts: number
  goalWorkouts?: number
}

export function WeeklyGoalProgress({ currentWorkouts, goalWorkouts = 3 }: WeeklyGoalProgressProps) {
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
}

interface NextWorkoutSuggestionProps {
  lastWorkoutType?: string
  daysSinceLastWorkout?: number
}

export function NextWorkoutSuggestion({ daysSinceLastWorkout = 0 }: NextWorkoutSuggestionProps) {
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

  const suggestion = getSuggestion()
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
}
