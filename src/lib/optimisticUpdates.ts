// src/lib/optimisticUpdates.ts
import { useState, useCallback, useRef } from 'react'

export type OptimisticState<T> = {
  data: T
  isOptimistic: boolean
  error: string | null
  isLoading: boolean
}

export type OptimisticAction<T> = {
  optimisticUpdate: (current: T) => T
  serverUpdate: () => Promise<T>
  onSuccess?: (result: T) => void
  onError?: (error: Error) => void
}

/**
 * Hook for managing optimistic updates with automatic rollback on failure
 */
export function useOptimisticUpdate<T>(initialData: T) {
  const [state, setState] = useState<OptimisticState<T>>({
    data: initialData,
    isOptimistic: false,
    error: null,
    isLoading: false
  })

  const rollbackRef = useRef<T | null>(null)

  const executeOptimisticUpdate = useCallback(async (action: OptimisticAction<T>) => {
    // Store current state for potential rollback
    rollbackRef.current = state.data

    // Apply optimistic update immediately
    const optimisticData = action.optimisticUpdate(state.data)
    setState(prev => ({
      ...prev,
      data: optimisticData,
      isOptimistic: true,
      error: null,
      isLoading: true
    }))

    try {
      // Execute server update
      const result = await action.serverUpdate()
      
      // Update with server response
      setState(prev => ({
        ...prev,
        data: result,
        isOptimistic: false,
        isLoading: false,
        error: null
      }))

      action.onSuccess?.(result)
      rollbackRef.current = null
    } catch (error) {
      // Rollback to previous state on error
      const rollbackData = rollbackRef.current || initialData
      setState(prev => ({
        ...prev,
        data: rollbackData,
        isOptimistic: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An error occurred'
      }))

      action.onError?.(error instanceof Error ? error : new Error('Unknown error'))
      rollbackRef.current = null
    }
  }, [state.data, initialData])

  const updateData = useCallback((newData: T) => {
    setState(prev => ({
      ...prev,
      data: newData,
      isOptimistic: false,
      error: null
    }))
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    executeOptimisticUpdate,
    updateData,
    clearError
  }
}

/**
 * Utility for creating optimistic workout weight updates
 */
export function createWeightUpdateAction(
  exerciseIndex: number,
  setNumber: number,
  weight: number | null,
  onServerUpdate: (exerciseIndex: number, setNumber: number, weight: number | null) => Promise<void>
): OptimisticAction<Record<number, Record<number, number | null>>> {
  return {
    optimisticUpdate: (currentWeights) => ({
      ...currentWeights,
      [exerciseIndex]: {
        ...currentWeights[exerciseIndex],
        [setNumber]: weight
      }
    }),
    serverUpdate: async () => {
      await onServerUpdate(exerciseIndex, setNumber, weight)
      // Return the updated weights (in real implementation, this might come from server)
      const savedWeights = sessionStorage.getItem('nf_workout_weights')
      return savedWeights ? JSON.parse(savedWeights) : {}
    }
  }
}

/**
 * Utility for creating optimistic set completion updates
 */
export function createSetCompletionAction(
  exerciseIndex: number,
  setNumber: number,
  isComplete: boolean,
  weight?: number | null
): OptimisticAction<Record<number, Record<number, number | null>>> {
  return {
    optimisticUpdate: (currentWeights) => ({
      ...currentWeights,
      [exerciseIndex]: {
        ...currentWeights[exerciseIndex],
        [setNumber]: isComplete ? (weight !== undefined ? weight : 0) : null
      }
    }),
    serverUpdate: async () => {
      // Get current weights from session storage
      const savedWeights = sessionStorage.getItem('nf_workout_weights')
      const currentWeights = savedWeights ? JSON.parse(savedWeights) : {}

      const updatedWeights = {
        ...currentWeights,
        [exerciseIndex]: {
          ...currentWeights[exerciseIndex],
          [setNumber]: isComplete ? (weight !== undefined ? weight : 0) : null
        }
      }
      sessionStorage.setItem('nf_workout_weights', JSON.stringify(updatedWeights))
      return updatedWeights
    }
  }
}

/**
 * Debounced function utility for reducing API calls
 */
export function useDebounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): T {
  const timeoutRef = useRef<number | null>(null)

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => func(...args), delay)
  }, [func, delay]) as T
}

/**
 * Cache utility for storing and retrieving data with expiration
 */
export class OptimisticCache<T> {
  private cache = new Map<string, { data: T; timestamp: number; ttl: number }>()

  set(key: string, data: T, ttlMs: number = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    })
  }

  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  invalidate(key: string) {
    this.cache.delete(key)
  }

  clear() {
    this.cache.clear()
  }
}

// Global cache instances
export const workoutCache = new OptimisticCache<Record<string, unknown>>()
export const profileCache = new OptimisticCache<Record<string, unknown>>()

/**
 * Preloader utility for prefetching data
 */
export class DataPreloader {
  private static instance: DataPreloader
  private preloadQueue = new Set<string>()

  static getInstance() {
    if (!DataPreloader.instance) {
      DataPreloader.instance = new DataPreloader()
    }
    return DataPreloader.instance
  }

  async preload(key: string, fetcher: () => Promise<unknown>, cache: OptimisticCache<unknown>) {
    if (this.preloadQueue.has(key)) return
    
    this.preloadQueue.add(key)
    
    try {
      const data = await fetcher()
      cache.set(key, data)
    } catch (error) {
      console.warn(`Failed to preload ${key}:`, error)
    } finally {
      this.preloadQueue.delete(key)
    }
  }
}

export const preloader = DataPreloader.getInstance()

/**
 * Error boundary utility for graceful error handling
 */
export function createErrorHandler(fallback: () => void) {
  return (error: Error) => {
    console.error('Optimistic update failed:', error)
    
    // Log to analytics if available
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as { gtag: (event: string, action: string, params: Record<string, unknown>) => void }).gtag('event', 'exception', {
        description: error.message,
        fatal: false
      })
    }

    fallback()
  }
}

/**
 * Retry utility with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      
      if (attempt === maxRetries) break
      
      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}
