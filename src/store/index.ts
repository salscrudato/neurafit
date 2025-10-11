// Unified state management using Zustand
// Replaces multiple context providers for better performance and simpler state management

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import type { User } from 'firebase/auth'
import type { UserProfile } from '../session/types'
import { logger } from '../lib/logger'

// Debounced localStorage writer to reduce write frequency
let persistTimer: NodeJS.Timeout | null = null
const PERSIST_DEBOUNCE_MS = 1000 // Persist max once per second

function debouncedSetItem(key: string, value: string) {
  if (persistTimer) {
    clearTimeout(persistTimer)
  }

  persistTimer = setTimeout(() => {
    try {
      localStorage.setItem(key, value)
    } catch (error) {
      logger.warn('Failed to persist state to localStorage', { error })
    }
  }, PERSIST_DEBOUNCE_MS)
}

// Exercise and workout types
export interface Exercise {
  name: string
  description?: string
  sets: number
  reps: number | string
  formTips?: string[]
  safetyTips?: string[]
  restSeconds?: number
  usesWeight?: boolean
  muscleGroups?: string[]
  difficulty?: string
  weights?: Record<number, number | null>
}

export interface WorkoutPlan {
  exercises: Exercise[]
  workoutSummary?: {
    totalVolume: string
    primaryFocus: string
    expectedRPE: string
  }
}

// Types for the unified store
export interface AppState {
  // Authentication state
  user: User | null
  profile: UserProfile | null
  authStatus: 'loading' | 'signedOut' | 'needsOnboarding' | 'ready'

  // Workout state
  currentWorkout: WorkoutState | null
  workoutWeights: Record<number, Record<number, number | null>>
  workoutHistory: WorkoutHistoryItem[]
  
  // UI state
  isOnline: boolean
  lastSyncTime: number | null
  pendingOperations: PendingOperation[]
  
  // Error state
  errors: AppError[]
}

export interface WorkoutState {
  plan: WorkoutPlan
  type: string
  duration: number
  startTime: number
  currentExerciseIndex: number
  currentSetIndex: number
  isActive: boolean
}

export interface WorkoutHistoryItem {
  id: string
  timestamp: number
  workoutType: string
  duration: number
  exercises: Exercise[]
  completionRate: number
}

export interface PendingOperation {
  id: string
  type: 'weight_update' | 'workout_save' | 'profile_update'
  data: Record<string, unknown>
  timestamp: number
  retryCount: number
}

export interface AppError {
  id: string
  type: 'auth' | 'network' | 'validation' | 'unknown'
  message: string
  details?: Record<string, unknown>
  timestamp: number
  resolved: boolean
}



// Actions interface
export interface AppActions {
  // Auth actions
  setUser: (_user: User | null) => void
  setProfile: (_profile: UserProfile | null) => void
  setAuthStatus: (_status: AppState['authStatus']) => void

  // Workout actions
  startWorkout: (_plan: WorkoutPlan, _type: string, _duration: number) => void
  updateWorkoutProgress: (_exerciseIndex: number, _setIndex: number) => void
  updateWeight: (_exerciseIndex: number, _setIndex: number, _weight: number | null) => void
  completeWorkout: () => void
  clearWorkout: () => void
  
  // Data persistence actions
  addToHistory: (_workout: WorkoutHistoryItem) => void
  syncPendingOperations: () => Promise<void>
  addPendingOperation: (_operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>) => void

  // Error handling actions
  addError: (_error: Omit<AppError, 'id' | 'timestamp' | 'resolved'>) => void
  resolveError: (_errorId: string) => void
  clearErrors: () => void



  // Utility actions
  setOnlineStatus: (_isOnline: boolean) => void
  updateLastSyncTime: () => void
  reset: () => void
}

// Initial state
const initialState: AppState = {
  user: null,
  profile: null,
  authStatus: 'loading',
  currentWorkout: null,
  workoutWeights: {},
  workoutHistory: [],
  isOnline: navigator.onLine,
  lastSyncTime: null,
  pendingOperations: [],
  errors: []
}

// Create the store with middleware
export const useAppStore = create<AppState & AppActions>()(
  subscribeWithSelector(
    immer(
      persist(
        (set, get) => ({
          ...initialState,
          
          // Auth actions
          setUser: (user) => set((state) => {
            state.user = user
          }),
          
          setProfile: (profile) => set((state) => {
            state.profile = profile
          }),
          
          setAuthStatus: (status) => set((state) => {
            state.authStatus = status
          }),

          // Workout actions
          startWorkout: (plan, type, duration) => set((state) => {
            state.currentWorkout = {
              plan,
              type,
              duration,
              startTime: Date.now(),
              currentExerciseIndex: 0,
              currentSetIndex: 1,
              isActive: true
            }
            state.workoutWeights = {}
          }),
          
          updateWorkoutProgress: (exerciseIndex, setIndex) => set((state) => {
            if (state.currentWorkout) {
              state.currentWorkout.currentExerciseIndex = exerciseIndex
              state.currentWorkout.currentSetIndex = setIndex
            }
          }),
          
          updateWeight: (exerciseIndex, setIndex, weight) => set((state) => {
            if (!state.workoutWeights[exerciseIndex]) {
              state.workoutWeights[exerciseIndex] = {}
            }
            state.workoutWeights[exerciseIndex][setIndex] = weight
          }),
          
          completeWorkout: () => set((state) => {
            if (state.currentWorkout) {
              const workout: WorkoutHistoryItem = {
                id: `workout_${Date.now()}`,
                timestamp: Date.now(),
                workoutType: state.currentWorkout.type,
                duration: Math.round((Date.now() - state.currentWorkout.startTime) / 1000 / 60),
                exercises: state.currentWorkout.plan.exercises.map((ex: Exercise, i: number) => ({
                  ...ex,
                  weights: state.workoutWeights[i] || undefined
                })),
                completionRate: calculateCompletionRate(state.workoutWeights, state.currentWorkout.plan.exercises)
              }
              
              state.workoutHistory.unshift(workout)
              state.currentWorkout = null
              state.workoutWeights = {}
            }
          }),
          
          clearWorkout: () => set((state) => {
            state.currentWorkout = null
            state.workoutWeights = {}
          }),
          
          // Data persistence actions
          addToHistory: (workout) => set((state) => {
            state.workoutHistory.unshift(workout)
            // Keep only last 50 workouts in memory
            if (state.workoutHistory.length > 50) {
              state.workoutHistory = state.workoutHistory.slice(0, 50)
            }
          }),
          
          addPendingOperation: (operation) => set((state) => {
            const newOperation: PendingOperation = {
              ...operation,
              id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: Date.now(),
              retryCount: 0
            }
            state.pendingOperations.push(newOperation)
          }),
          
          syncPendingOperations: async () => {
            const { pendingOperations } = get()

            // Sync pending operations when back online
            // This is a placeholder for future offline sync functionality
            // Currently, operations are executed immediately when online
            logger.debug(`Syncing ${pendingOperations.length} pending operations`)

            // In a full implementation, this would:
            // 1. Iterate through pendingOperations
            // 2. Retry failed operations
            // 3. Remove successful operations from the queue
            // 4. Handle conflicts and merge strategies
          },
          
          // Error handling actions
          addError: (error) => set((state) => {
            const newError: AppError = {
              ...error,
              id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: Date.now(),
              resolved: false
            }
            state.errors.push(newError)
            // Keep only last 20 errors
            if (state.errors.length > 20) {
              state.errors = state.errors.slice(-20)
            }
          }),
          
          resolveError: (errorId) => set((state) => {
            const error = state.errors.find(e => e.id === errorId)
            if (error) {
              error.resolved = true
            }
          }),
          
          clearErrors: () => set((state) => {
            state.errors = []
          }),
          

          // Utility actions
          setOnlineStatus: (isOnline) => set((state) => {
            state.isOnline = isOnline
          }),
          
          updateLastSyncTime: () => set((state) => {
            state.lastSyncTime = Date.now()
          }),
          
          reset: () => set(() => ({ ...initialState }))
        }),
        {
          name: 'neurafit-app-store',
          storage: createJSONStorage(() => ({
            getItem: (name: string) => {
              const str = localStorage.getItem(name)
              return str ? JSON.parse(str) : null
            },
            setItem: (name: string, value: unknown) => {
              // Use debounced writer to reduce localStorage writes
              debouncedSetItem(name, JSON.stringify(value))
            },
            removeItem: (name: string) => {
              localStorage.removeItem(name)
            }
          })),
          partialize: (state) => ({
            // Persist essential data and active workout state
            workoutHistory: state.workoutHistory,
            lastSyncTime: state.lastSyncTime,
            currentWorkout: state.currentWorkout, // Persist active workout
            workoutWeights: state.workoutWeights, // Persist workout weights
            // Don't persist sensitive or temporary data
            user: null,
            profile: null,
            errors: [],
            pendingOperations: []
          }),
          version: 1,
          migrate: (persistedState: unknown, _version: number) => {
            // Handle state migrations for future versions
            // Validate persisted state structure
            if (persistedState && typeof persistedState === 'object') {
              return persistedState
            }
            logger.warn('Invalid persisted state, resetting to initial state')
            return initialState
          }
        }
      )
    )
  )
)

// Helper function to calculate completion rate
// Completed sets are marked with a number (including 0 for bodyweight exercises)
// Skipped sets are marked as null
// Sets not attempted are undefined
function calculateCompletionRate(weights: Record<number, Record<number, number | null>>, exercises: Exercise[]): number {
  let totalSets = 0
  let completedSets = 0

  exercises.forEach((exercise, exerciseIndex) => {
    const exerciseWeights = weights[exerciseIndex] || {}
    const sets = exercise.sets || 0
    totalSets += sets

    for (let setIndex = 1; setIndex <= sets; setIndex++) {
      // A set is complete if it has a number value (including 0)
      // null = skipped (incomplete), undefined = not attempted (incomplete)
      const setWeight = exerciseWeights[setIndex]
      if (setWeight !== null && setWeight !== undefined) {
        completedSets++
      }
    }
  })
  
  return totalSets > 0 ? completedSets / totalSets : 0
}

// Optimized atomic selectors to prevent unnecessary re-renders
// Auth selectors
export const useUser = () => useAppStore((state) => state.user)
export const useProfile = () => useAppStore((state) => state.profile)
export const useAuthStatus = () => useAppStore((state) => state.authStatus)
export const useSetUser = () => useAppStore((state) => state.setUser)
export const useSetProfile = () => useAppStore((state) => state.setProfile)
export const useSetAuthStatus = () => useAppStore((state) => state.setAuthStatus)

// Stable selector reference for composite auth selector
const authSelector = (state: AppState & AppActions) => ({
  user: state.user,
  profile: state.profile,
  status: state.authStatus,
  setUser: state.setUser,
  setProfile: state.setProfile,
  setAuthStatus: state.setAuthStatus
})

// Composite auth selector with shallow comparison to prevent unnecessary re-renders
// Uses stable selector reference to prevent creating new objects on every call
export const useAuth = () => {
  return useAppStore(useShallow(authSelector))
}

// Workout selectors
export const useCurrentWorkout = () => useAppStore((state) => state.currentWorkout)
export const useWorkoutWeights = () => useAppStore((state) => state.workoutWeights)
export const useWorkoutHistory = () => useAppStore((state) => state.workoutHistory)
export const useStartWorkout = () => useAppStore((state) => state.startWorkout)
export const useUpdateWorkoutProgress = () => useAppStore((state) => state.updateWorkoutProgress)
export const useUpdateWeight = () => useAppStore((state) => state.updateWeight)
export const useCompleteWorkout = () => useAppStore((state) => state.completeWorkout)
export const useClearWorkout = () => useAppStore((state) => state.clearWorkout)
export const useAddToHistory = () => useAppStore((state) => state.addToHistory)

// Stable selector reference for composite workout selector
const workoutSelector = (state: AppState & AppActions) => ({
  currentWorkout: state.currentWorkout,
  workoutWeights: state.workoutWeights,
  workoutHistory: state.workoutHistory,
  startWorkout: state.startWorkout,
  updateWorkoutProgress: state.updateWorkoutProgress,
  updateWeight: state.updateWeight,
  completeWorkout: state.completeWorkout,
  clearWorkout: state.clearWorkout,
  addToHistory: state.addToHistory
})

// Composite workout selector with shallow comparison
export const useWorkout = () => {
  return useAppStore(useShallow(workoutSelector))
}

// Error selectors
export const useErrorsState = () => useAppStore((state) => state.errors)
export const useAddError = () => useAppStore((state) => state.addError)
export const useResolveError = () => useAppStore((state) => state.resolveError)
export const useClearErrors = () => useAppStore((state) => state.clearErrors)

// Stable selector reference for composite error selector
const errorsSelector = (state: AppState & AppActions) => ({
  errors: state.errors,
  addError: state.addError,
  resolveError: state.resolveError,
  clearErrors: state.clearErrors
})

// Composite error selector with shallow comparison
export const useErrors = () => {
  return useAppStore(useShallow(errorsSelector))
}



// Expose store globally for performance monitoring and debugging (development only)
if (typeof window !== 'undefined' && import.meta.env.MODE === 'development') {
  (window as Window & { __NEURAFIT_STORE__?: typeof useAppStore }).__NEURAFIT_STORE__ = useAppStore
}