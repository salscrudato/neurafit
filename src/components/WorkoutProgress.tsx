// src/components/WorkoutProgress.tsx
import React, { memo } from 'react'
import { CheckCircle, Clock, Zap, Flame, Rocket, Sparkles, Target, PartyPopper } from 'lucide-react'

interface CircularProgressProps {
  progress: number // 0-100
  size?: number
  strokeWidth?: number
  className?: string
  children?: React.ReactNode
}

export const CircularProgress = memo(function CircularProgress({
  progress,
  size = 120,
  strokeWidth = 8,
  className = '',
  children
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-blue-500 transition-all duration-500 ease-out"
          strokeLinecap="round"
        />
      </svg>
      {/* Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
})

interface WorkoutProgressHeaderProps {
  currentExercise: number
  totalExercises: number
  currentSet: number
  totalSets: number
  overallProgress: number
  exerciseName: string
}

export const WorkoutProgressHeader = memo(function WorkoutProgressHeader({
  currentExercise,
  totalExercises,
  currentSet,
  totalSets,
  overallProgress,
  exerciseName
}: WorkoutProgressHeaderProps) {
  return (
    <div className="bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-6 py-4">
        {/* Overall Progress */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CircularProgress progress={overallProgress} size={48} strokeWidth={4}>
              <span className="text-xs font-bold text-gray-700">
                {Math.round(overallProgress)}%
              </span>
            </CircularProgress>
            <div>
              <div className="text-sm font-medium text-gray-900">
                Exercise {currentExercise} of {totalExercises}
              </div>
              <div className="text-xs text-gray-600">
                Overall Progress
              </div>
            </div>
          </div>

          {/* Exercise Progress */}
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              Set {currentSet} of {totalSets}
            </div>
            <div className="text-xs text-gray-600">
              Current Exercise
            </div>
          </div>
        </div>

        {/* Exercise Name */}
        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-900 truncate">
            {exerciseName}
          </h2>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}, (prev, next) => {
  // Custom comparison for optimal re-render prevention
  return (
    prev.currentExercise === next.currentExercise &&
    prev.totalExercises === next.totalExercises &&
    prev.currentSet === next.currentSet &&
    prev.totalSets === next.totalSets &&
    prev.overallProgress === next.overallProgress &&
    prev.exerciseName === next.exerciseName
  )
})

interface SetProgressIndicatorProps {
  currentSet: number
  totalSets: number
  completedSets: number[]
  skippedSets: number[]
}

export const SetProgressIndicator = memo(function SetProgressIndicator({
  currentSet,
  totalSets,
  completedSets,
  skippedSets
}: SetProgressIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {Array.from({ length: totalSets }, (_, i) => {
        const setNumber = i + 1
        const isCompleted = completedSets.includes(setNumber)
        const isSkipped = skippedSets.includes(setNumber)
        const isCurrent = setNumber === currentSet
        
        return (
          <div
            key={setNumber}
            className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 ${
              isCompleted
                ? 'bg-green-500 border-green-500 text-white'
                : isSkipped
                ? 'bg-red-100 border-red-300 text-red-600'
                : isCurrent
                ? 'bg-blue-500 border-blue-500 text-white animate-pulse'
                : 'bg-gray-100 border-gray-300 text-gray-600'
            }`}
          >
            {isCompleted ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <span className="text-xs font-bold">{setNumber}</span>
            )}
            
            {isCurrent && (
              <div className="absolute -inset-1 rounded-full border-2 border-blue-300 animate-ping" />
            )}
          </div>
        )
      })}
    </div>
  )
})

interface MotivationalMessageProps {
  progress: number
  completedSets: number
  totalSets: number
  exerciseName: string
}

export const MotivationalMessage = memo(function MotivationalMessage({
  progress: _progress,
  completedSets,
  totalSets,
  exerciseName
}: MotivationalMessageProps) {
  // Use exercise completion percentage for motivational messages, not overall workout progress
  const exerciseCompletionPct = Math.round((completedSets / totalSets) * 100)

  const getMotivationalMessage = () => {
    if (exerciseCompletionPct >= 90) return { text: "Almost there! Finish strong!", icon: <Zap className="h-4 w-4" /> }
    if (exerciseCompletionPct >= 75) return { text: "You're crushing it! Keep going!", icon: <Flame className="h-4 w-4" /> }
    if (exerciseCompletionPct >= 50) return { text: "Halfway there! You've got this!", icon: <Zap className="h-4 w-4" /> }
    if (exerciseCompletionPct >= 25) return { text: "Great start! Building momentum!", icon: <Rocket className="h-4 w-4" /> }
    if (completedSets > 0) return { text: "Nice work! One set at a time!", icon: <Sparkles className="h-4 w-4" /> }
    return { text: "Let's do this! You're stronger than you think!", icon: <Target className="h-4 w-4" /> }
  }

  const getCompletionMessage = () => {
    if (exerciseCompletionPct === 100) return { text: `${exerciseName} completed!`, icon: <PartyPopper className="h-4 w-4" /> }
    if (exerciseCompletionPct >= 75) return { text: `${exerciseCompletionPct}% complete - almost done!`, icon: null }
    if (exerciseCompletionPct >= 50) return { text: `${exerciseCompletionPct}% complete - keep it up!`, icon: null }
    if (exerciseCompletionPct > 0) return { text: `${exerciseCompletionPct}% complete - great progress!`, icon: null }
    return { text: "Ready to start? You've got this!", icon: null }
  }

  const motivationalMessage = getMotivationalMessage()
  const completionMessage = getCompletionMessage()

  return (
    <div className="text-center py-4 px-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
        <div className="flex items-center justify-center gap-2 text-lg font-semibold text-gray-900 mb-1">
          {motivationalMessage.icon}
          <span>{motivationalMessage.text}</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
          {completionMessage.icon}
          <span>{completionMessage.text}</span>
        </div>
      </div>
    </div>
  )
})

interface NextExercisePreviewProps {
  nextExercise?: {
    name: string
    sets: number
    reps: string | number
    restSeconds?: number
  }
  timeRemaining: number
}

export const NextExercisePreview = memo(function NextExercisePreview({ nextExercise, timeRemaining }: NextExercisePreviewProps) {
  if (!nextExercise) return null

  return (
    <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-4 border border-gray-200">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center gap-1 text-blue-600">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">{timeRemaining}s</span>
        </div>
        <div className="text-sm text-gray-600">Next up:</div>
      </div>

      <div className="text-lg font-semibold text-gray-900 mb-1">
        {nextExercise.name}
      </div>

      <div className="text-sm text-gray-600">
        {nextExercise.sets} sets × {nextExercise.reps} reps
        {nextExercise.restSeconds && (
          <span className="ml-2">• {nextExercise.restSeconds}s rest</span>
        )}
      </div>
    </div>
  )
})

interface WorkoutStatsProps {
  startTime: number
  completedSets: number
  totalSets: number
  completedExercises: number
  totalExercises: number
}

export const WorkoutStats = memo(function WorkoutStats({
  startTime,
  completedSets,
  totalSets,
  completedExercises,
  totalExercises
}: WorkoutStatsProps) {
  const elapsedMinutes = Math.floor((Date.now() - startTime) / 1000 / 60)
  const completionRate = Math.round((completedSets / totalSets) * 100)

  return (
    <div className="grid grid-cols-3 gap-4 p-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">{elapsedMinutes}</div>
        <div className="text-xs text-gray-600">Minutes</div>
      </div>

      <div className="text-center">
        <div className="text-2xl font-bold text-green-600">{completionRate}%</div>
        <div className="text-xs text-gray-600">Complete</div>
      </div>

      <div className="text-center">
        <div className="text-2xl font-bold text-indigo-600">
          {completedExercises}/{totalExercises}
        </div>
        <div className="text-xs text-gray-600">Exercises</div>
      </div>
    </div>
  )
})
