import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { SkeletonBase } from './SkeletonLoaders'

interface LoadingStage {
  id: string
  name: string
  priority: number
  estimatedTime: number
  component?: ReactNode
}

interface ProgressiveLoaderProps {
  stages: LoadingStage[]
  onStageComplete?: (stageId: string) => void
  onAllComplete?: () => void
  fallbackComponent?: ReactNode
  showProgress?: boolean
  className?: string
}

interface LoadingState {
  currentStage: number
  completedStages: Set<string>
  isLoading: boolean
  progress: number
  error: string | null
}

export function ProgressiveLoader({
  stages,
  onStageComplete,
  onAllComplete,
  fallbackComponent,
  showProgress = true,
  className = ''
}: ProgressiveLoaderProps) {
  const [state, setState] = useState<LoadingState>({
    currentStage: 0,
    completedStages: new Set(),
    isLoading: true,
    progress: 0,
    error: null
  })

  const completeStage = useCallback((stageId: string) => {
    setState(prev => {
      const newCompleted = new Set(prev.completedStages)
      newCompleted.add(stageId)
      
      const newProgress = (newCompleted.size / stages.length) * 100
      const isComplete = newCompleted.size === stages.length
      
      if (isComplete) {
        onAllComplete?.()
      }
      
      onStageComplete?.(stageId)
      
      return {
        ...prev,
        completedStages: newCompleted,
        progress: newProgress,
        isLoading: !isComplete,
        currentStage: Math.min(prev.currentStage + 1, stages.length - 1)
      }
    })
  }, [stages.length, onStageComplete, onAllComplete])

  // setError function removed - not used in this component

  // Auto-progress through stages based on priority and estimated time
  useEffect(() => {
    if (state.isLoading && state.currentStage < stages.length) {
      const currentStageData = stages[state.currentStage]
      
      // Simulate loading time (in real app, this would be actual async operations)
      const timer = setTimeout(() => {
        completeStage(currentStageData.id)
      }, currentStageData.estimatedTime)

      return () => clearTimeout(timer)
    }
  }, [state.currentStage, state.isLoading, stages, completeStage])

  if (state.error) {
    return (
      <div className={`progressive-loader error ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 text-sm">Loading failed: {state.error}</p>
        </div>
      </div>
    )
  }

  if (!state.isLoading) {
    return null // Content should be rendered by parent
  }

  const currentStage = stages[state.currentStage]

  return (
    <div className={`progressive-loader ${className}`}>
      {showProgress && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {currentStage?.name || 'Loading...'}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(state.progress)}%
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${state.progress}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>{state.completedStages.size} of {stages.length} complete</span>
            <span>
              {stages
                .filter(stage => state.completedStages.has(stage.id))
                .map(stage => stage.name)
                .join(', ')}
            </span>
          </div>
        </div>
      )}

      {currentStage?.component || fallbackComponent || (
        <div className="space-y-4">
          <SkeletonBase className="h-8 w-3/4" variant="text" />
          <SkeletonBase className="h-4 w-full" variant="text" />
          <SkeletonBase className="h-4 w-2/3" variant="text" />
          <div className="grid grid-cols-2 gap-4 mt-6">
            <SkeletonBase className="h-24" variant="rectangular" />
            <SkeletonBase className="h-24" variant="rectangular" />
          </div>
        </div>
      )}
    </div>
  )
}

// Hook for managing progressive loading states
export function useProgressiveLoading(stages: LoadingStage[]) {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    currentStage: 0,
    completedStages: new Set(),
    isLoading: true,
    progress: 0,
    error: null
  })

  const completeStage = useCallback((stageId: string) => {
    setLoadingState(prev => {
      const newCompleted = new Set(prev.completedStages)
      newCompleted.add(stageId)
      
      const newProgress = (newCompleted.size / stages.length) * 100
      const isComplete = newCompleted.size === stages.length
      
      return {
        ...prev,
        completedStages: newCompleted,
        progress: newProgress,
        isLoading: !isComplete,
        currentStage: Math.min(prev.currentStage + 1, stages.length - 1)
      }
    })
  }, [stages.length])

  const setError = useCallback((error: string) => {
    setLoadingState(prev => ({ ...prev, error, isLoading: false }))
  }, [])

  // Expose setError for external use
  void setError // Mark as used

  const reset = useCallback(() => {
    setLoadingState({
      currentStage: 0,
      completedStages: new Set(),
      isLoading: true,
      progress: 0,
      error: null
    })
  }, [])

  return {
    ...loadingState,
    completeStage,
    setError,
    reset,
    currentStageData: stages[loadingState.currentStage]
  }
}

// Predefined loading stages for common scenarios
export const LoadingStages = {
  workoutGeneration: [
    { id: 'profile', name: 'Loading your profile...', priority: 1, estimatedTime: 500 },
    { id: 'preferences', name: 'Analyzing preferences...', priority: 2, estimatedTime: 800 },
    { id: 'ai-generation', name: 'Generating workout...', priority: 3, estimatedTime: 2000 },
    { id: 'optimization', name: 'Optimizing for you...', priority: 4, estimatedTime: 1000 }
  ],
  
  workoutHistory: [
    { id: 'auth', name: 'Verifying access...', priority: 1, estimatedTime: 300 },
    { id: 'data', name: 'Loading workout history...', priority: 2, estimatedTime: 1200 },
    { id: 'analytics', name: 'Calculating statistics...', priority: 3, estimatedTime: 800 }
  ],
  
  dashboard: [
    { id: 'session', name: 'Initializing session...', priority: 1, estimatedTime: 400 },
    { id: 'recent', name: 'Loading recent activity...', priority: 2, estimatedTime: 600 },
    { id: 'recommendations', name: 'Preparing recommendations...', priority: 3, estimatedTime: 1000 }
  ]
}

export default ProgressiveLoader
