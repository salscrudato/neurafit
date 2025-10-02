/**
 * Unified Loading System
 * Consolidates LoadingSpinner, ProgressiveLoadingBar, and SkeletonLoaders
 */

import React, { memo, useEffect, useState, useMemo } from 'react'
import { Loader2, Zap, Brain, Dumbbell, Target } from 'lucide-react'

// Base loading spinner (replaces LoadingSpinner.tsx)
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  fullScreen?: boolean
  className?: string
}

export const LoadingSpinner = memo(({ 
  size = 'md', 
  text, 
  fullScreen = false, 
  className = '' 
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Loader2 
        className={`${sizeClasses[size]} animate-spin text-blue-600`}
        aria-hidden="true"
      />
      {text && (
        <p className={`${textSizeClasses[size]} text-gray-600 font-medium`}>
          {text}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div 
        className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50"
        role="status"
        aria-label="Loading"
      >
        {spinner}
      </div>
    )
  }

  return (
    <div role="status" aria-label="Loading">
      {spinner}
    </div>
  )
})

LoadingSpinner.displayName = 'LoadingSpinner'

// Enhanced skeleton component (from SkeletonLoaders.tsx)
export function SkeletonBase({
  className = '',
  children,
  variant = 'default',
  speed = 'normal'
}: {
  className?: string;
  children?: React.ReactNode;
  variant?: 'default' | 'text' | 'circular' | 'rectangular';
  speed?: 'slow' | 'normal' | 'fast';
}) {
  const speedClasses = {
    slow: 'animate-shimmer-slow',
    normal: 'animate-shimmer',
    fast: 'animate-shimmer-fast'
  }

  const variantClasses = {
    default: 'rounded',
    text: 'rounded-sm',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  }

  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] ${speedClasses[speed]} ${variantClasses[variant]} ${className}`}
      role="status"
      aria-label="Loading content"
    >
      {children}
      <span className="sr-only">Loading...</span>
    </div>
  )
}

// Progressive loading bar (from ProgressiveLoadingBar.tsx)
interface LoadingStage {
  id: string
  label: string
  icon: React.ReactNode
  duration: number // Percentage of total duration
  color: string
}

interface ProgressiveLoadingBarProps {
  isVisible: boolean
  onComplete?: () => void
  duration?: number // Total duration in milliseconds
}

export function ProgressiveLoadingBar({
  isVisible,
  onComplete,
  duration = 4000
}: ProgressiveLoadingBarProps) {
  const [currentStage, setCurrentStage] = useState(0)
  const [progress, setProgress] = useState(0)
  const [stageProgress, setStageProgress] = useState(0)

  const stages: LoadingStage[] = useMemo(() => [
    {
      id: 'analyzing',
      label: 'Analyzing your profile...',
      icon: <Brain className="h-5 w-5" />,
      duration: 20, // 20% of total time
      color: 'from-blue-500 to-indigo-600'
    },
    {
      id: 'generating',
      label: 'Generating personalized workout...',
      icon: <Zap className="h-5 w-5" />,
      duration: 50, // 50% of total time
      color: 'from-indigo-500 to-purple-600'
    },
    {
      id: 'optimizing',
      label: 'Optimizing exercise selection...',
      icon: <Dumbbell className="h-5 w-5" />,
      duration: 20, // 20% of total time
      color: 'from-purple-500 to-pink-600'
    },
    {
      id: 'finalizing',
      label: 'Finalizing your workout plan...',
      icon: <Target className="h-5 w-5" />,
      duration: 10, // 10% of total time
      color: 'from-pink-500 to-red-600'
    }
  ], [])

  useEffect(() => {
    if (!isVisible) {
      setCurrentStage(0)
      setProgress(0)
      setStageProgress(0)
      return
    }

    const _totalStages = stages.length
    const stageInterval = duration / 100 // Update every 1% of total duration

    const timer = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 1
        
        // Calculate which stage we should be in
        let cumulativeDuration = 0
        let newStage = 0
        
        for (let i = 0; i < stages.length; i++) {
          cumulativeDuration += stages[i].duration
          if (newProgress <= cumulativeDuration) {
            newStage = i
            break
          }
        }
        
        // Update stage if it changed
        if (newStage !== currentStage) {
          setCurrentStage(newStage)
        }
        
        // Calculate progress within current stage
        const stageStart = stages.slice(0, newStage).reduce((sum, stage) => sum + stage.duration, 0)
        const stageProgressPercent = ((newProgress - stageStart) / stages[newStage].duration) * 100
        setStageProgress(Math.min(100, Math.max(0, stageProgressPercent)))
        
        if (newProgress >= 100) {
          onComplete?.()
          return 100
        }
        
        return newProgress
      })
    }, stageInterval)

    return () => clearInterval(timer)
  }, [isVisible, duration, stages, currentStage, onComplete])

  if (!isVisible) return null

  const currentStageData = stages[currentStage]

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* Current Stage */}
        <div className="text-center mb-6">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${currentStageData.color} text-white mb-4`}>
            {currentStageData.icon}
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {currentStageData.label}
          </h3>
          
          <div className="text-sm text-gray-600">
            Stage {currentStage + 1} of {stages.length}
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Overall Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full bg-gradient-to-r ${currentStageData.color} transition-all duration-300 ease-out`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stage Progress Bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Current Stage</span>
            <span>{Math.round(stageProgress)}%</span>
          </div>
          
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div 
              className={`h-2 rounded-full bg-gradient-to-r ${currentStageData.color} transition-all duration-150 ease-out`}
              style={{ width: `${stageProgress}%` }}
            />
          </div>
        </div>

        {/* Stage Indicators */}
        <div className="flex justify-center mt-6 space-x-2">
          {stages.map((stage, index) => (
            <div
              key={stage.id}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                index < currentStage 
                  ? 'bg-green-500' 
                  : index === currentStage 
                  ? `bg-gradient-to-r ${stage.color}` 
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Specialized skeleton loaders for common use cases
export function WorkoutHistorySkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <SkeletonBase className="h-6 w-32" variant="text" />
            <SkeletonBase className="h-4 w-20" variant="text" />
          </div>
          <div className="space-y-2">
            <SkeletonBase className="h-4 w-full" variant="text" />
            <SkeletonBase className="h-4 w-3/4" variant="text" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function WorkoutDetailSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonBase className="h-8 w-48" variant="text" />
      <div className="grid grid-cols-2 gap-4">
        <SkeletonBase className="h-16" variant="rectangular" />
        <SkeletonBase className="h-16" variant="rectangular" />
      </div>
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border rounded-lg p-4">
            <SkeletonBase className="h-6 w-40 mb-2" variant="text" />
            <SkeletonBase className="h-4 w-24" variant="text" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProfilePageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <SkeletonBase className="h-24 w-24 mx-auto mb-4" variant="circular" />
        <SkeletonBase className="h-8 w-48 mx-auto" variant="text" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-4">
            <SkeletonBase className="h-6 w-32" variant="text" />
            <SkeletonBase className="h-10 w-full" variant="rectangular" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Default export for backward compatibility
export default LoadingSpinner
