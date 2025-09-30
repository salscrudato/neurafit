import { useState } from 'react'

export interface LoadingStage {
  id: string
  name: string
  priority: number
  estimatedTime: number
}

export interface LoadingState {
  currentStage: number
  completedStages: Set<string>
  isLoading: boolean
  progress: number
  error: string | null
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

  const nextStage = () => {
    setLoadingState(prev => {
      const newCompletedStages = new Set(prev.completedStages)
      if (stages[prev.currentStage]) {
        newCompletedStages.add(stages[prev.currentStage].id)
      }
      
      const nextStageIndex = prev.currentStage + 1
      const isComplete = nextStageIndex >= stages.length
      
      return {
        ...prev,
        currentStage: nextStageIndex,
        completedStages: newCompletedStages,
        isLoading: !isComplete,
        progress: isComplete ? 100 : (nextStageIndex / stages.length) * 100
      }
    })
  }

  const setError = (error: string) => {
    setLoadingState(prev => ({
      ...prev,
      error,
      isLoading: false
    }))
  }

  const reset = () => {
    setLoadingState({
      currentStage: 0,
      completedStages: new Set(),
      isLoading: true,
      progress: 0,
      error: null
    })
  }

  return {
    ...loadingState,
    nextStage,
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
  
  dataSync: [
    { id: 'authentication', name: 'Verifying credentials...', priority: 1, estimatedTime: 300 },
    { id: 'sync', name: 'Syncing data...', priority: 2, estimatedTime: 1500 },
    { id: 'validation', name: 'Validating data...', priority: 3, estimatedTime: 800 }
  ],
  
  initialization: [
    { id: 'setup', name: 'Setting up...', priority: 1, estimatedTime: 400 },
    { id: 'loading', name: 'Loading resources...', priority: 2, estimatedTime: 1200 },
    { id: 'ready', name: 'Almost ready...', priority: 3, estimatedTime: 600 }
  ]
}
