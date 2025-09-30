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



export default ProgressiveLoader
