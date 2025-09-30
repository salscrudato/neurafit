// src/components/ProgressiveLoadingBar.tsx
import React, { useEffect, useState } from 'react'
import { Zap, Brain, Dumbbell, Target } from 'lucide-react'

interface ProgressiveLoadingBarProps {
  isVisible: boolean
  onComplete?: () => void
  duration?: number // Total duration in milliseconds
}

interface LoadingStage {
  id: string
  label: string
  icon: React.ReactNode
  duration: number // Percentage of total duration
  color: string
}

export function ProgressiveLoadingBar({ 
  isVisible, 
  onComplete, 
  duration = 8000 
}: ProgressiveLoadingBarProps) {
  const [currentStage, setCurrentStage] = useState(0)
  const [progress, setProgress] = useState(0)
  const [stageProgress, setStageProgress] = useState(0)

  const stages: LoadingStage[] = [
    {
      id: 'analyzing',
      label: 'Analyzing your profile...',
      icon: <Brain className="h-5 w-5" />,
      duration: 25, // 25% of total time
      color: 'from-blue-500 to-indigo-600'
    },
    {
      id: 'generating',
      label: 'Generating personalized workout...',
      icon: <Zap className="h-5 w-5" />,
      duration: 40, // 40% of total time
      color: 'from-indigo-500 to-purple-600'
    },
    {
      id: 'optimizing',
      label: 'Optimizing exercise selection...',
      icon: <Dumbbell className="h-5 w-5" />,
      duration: 25, // 25% of total time
      color: 'from-purple-500 to-pink-600'
    },
    {
      id: 'finalizing',
      label: 'Finalizing your workout plan...',
      icon: <Target className="h-5 w-5" />,
      duration: 10, // 10% of total time
      color: 'from-pink-500 to-red-600'
    }
  ]

  useEffect(() => {
    if (!isVisible) {
      setCurrentStage(0)
      setProgress(0)
      setStageProgress(0)
      return
    }

    let startTime = Date.now()
    let animationFrame: number

    const animate = () => {
      const elapsed = Date.now() - startTime
      const totalProgress = Math.min((elapsed / duration) * 100, 100)
      
      // Calculate which stage we're in
      let cumulativeProgress = 0
      let newStage = 0
      
      for (let i = 0; i < stages.length; i++) {
        const stageEnd = cumulativeProgress + stages[i].duration
        if (totalProgress <= stageEnd) {
          newStage = i
          break
        }
        cumulativeProgress = stageEnd
        newStage = i + 1
      }

      // Calculate progress within current stage
      const stageStart = stages.slice(0, newStage).reduce((sum, stage) => sum + stage.duration, 0)
      // const stageEnd = stageStart + (stages[newStage]?.duration || 0) // Unused for now
      const stageProgressValue = stages[newStage] 
        ? Math.min(((totalProgress - stageStart) / stages[newStage].duration) * 100, 100)
        : 100

      setCurrentStage(newStage)
      setProgress(totalProgress)
      setStageProgress(stageProgressValue)

      if (totalProgress < 100) {
        animationFrame = requestAnimationFrame(animate)
      } else {
        // Add a small delay before calling onComplete
        setTimeout(() => {
          onComplete?.()
        }, 500)
      }
    }

    animationFrame = requestAnimationFrame(animate)

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [isVisible, duration, onComplete])

  if (!isVisible) return null

  const currentStageData = stages[currentStage]

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg">
            <Zap className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Creating Your Workout</h2>
          <p className="text-gray-600">AI is crafting the perfect workout just for you</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          
          {/* Main Progress Bar */}
          <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
            
            {/* Shimmer Effect */}
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full animate-pulse"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Current Stage */}
        {currentStageData && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className={`inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r ${currentStageData.color} rounded-xl text-white shadow-md`}>
                {currentStageData.icon}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{currentStageData.label}</div>
                <div className="text-sm text-gray-500">
                  Stage {currentStage + 1} of {stages.length}
                </div>
              </div>
            </div>
            
            {/* Stage Progress Bar */}
            <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`absolute inset-y-0 left-0 bg-gradient-to-r ${currentStageData.color} rounded-full transition-all duration-200 ease-out`}
                style={{ width: `${stageProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Stage Indicators */}
        <div className="flex justify-between items-center">
          {stages.map((stage, index) => {
            const isCompleted = index < currentStage
            const isCurrent = index === currentStage
            // const isUpcoming = index > currentStage // Unused for now
            
            return (
              <div key={stage.id} className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-green-500 text-white shadow-md' 
                    : isCurrent 
                    ? `bg-gradient-to-r ${stage.color} text-white shadow-md animate-pulse`
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {isCompleted ? '✓' : index + 1}
                </div>
                <div className={`text-xs text-center max-w-16 leading-tight ${
                  isCurrent ? 'text-gray-900 font-medium' : 'text-gray-500'
                }`}>
                  {stage.label.split(' ')[0]}
                </div>
              </div>
            )
          })}
        </div>

        {/* Animated Dots */}
        <div className="flex justify-center mt-6 gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
              style={{ 
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Simplified version for inline use
interface InlineProgressBarProps {
  progress: number
  label?: string
  className?: string
}

export function InlineProgressBar({ 
  progress, 
  label = 'Loading...', 
  className = '' 
}: InlineProgressBarProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700 font-medium">{label}</span>
          <span className="text-gray-500">{Math.round(progress)}%</span>
        </div>
      )}
      
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
        
        {/* Shimmer Effect */}
        <div 
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-full"
          style={{ 
            width: `${Math.min(progress, 100)}%`,
            animation: progress < 100 ? 'shimmer 2s infinite' : 'none'
          }}
        />
      </div>
    </div>
  )
}
