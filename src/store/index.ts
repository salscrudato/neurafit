// Unified state management using Zustand
// Replaces multiple context providers for better performance and simpler state management

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User } from 'firebase/auth'
import type { UserProfile } from '../session/types'
import type { UserSubscription } from '../types/subscription'
import { logger } from '../lib/logger'

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
  
  // Subscription state
  subscription: UserSubscription | null
  subscriptionLoading: boolean
  
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

  // Subscription actions
  setSubscription: (_subscription: UserSubscription | null) => void
  setSubscriptionLoading: (_loading: boolean) => void

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
  subscription: null,
  subscriptionLoading: true,
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
          
          // Subscription actions
          setSubscription: (subscription) => set((state) => {
            state.subscription = subscription
          }),
          
          setSubscriptionLoading: (loading) => set((state) => {
            state.subscriptionLoading = loading
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
          storage: createJSONStorage(() => localStorage),
          partialize: (state) => ({
            // Only persist essential data
            workoutHistory: state.workoutHistory,
            lastSyncTime: state.lastSyncTime,
            // Don't persist sensitive or temporary data
            user: null,
            profile: null,
            subscription: null,
            currentWorkout: null,
            workoutWeights: {},
            errors: [],
            pendingOperations: []
          }),
          version: 1,
          migrate: (persistedState: unknown, _version: number) => {
            // Handle state migrations for future versions
            // _version parameter reserved for future use
            return persistedState
          }
        }
      )
    )
  )
)

// Helper function to calculate completion rate
function calculateCompletionRate(weights: Record<number, Record<number, number | null>>, exercises: Exercise[]): number {
  let totalSets = 0
  let completedSets = 0
  
  exercises.forEach((exercise, exerciseIndex) => {
    const exerciseWeights = weights[exerciseIndex] || {}
    const sets = exercise.sets || 0
    totalSets += sets
    
    for (let setIndex = 1; setIndex <= sets; setIndex++) {
      if (exerciseWeights[setIndex] !== null && exerciseWeights[setIndex] !== undefined) {
        completedSets++
      }
    }
  })
  
  return totalSets > 0 ? completedSets / totalSets : 0
}

// Selectors for common state access patterns
export const useAuth = () => useAppStore((state) => ({
  user: state.user,
  profile: state.profile,
  status: state.authStatus,
  setUser: state.setUser,
  setProfile: state.setProfile,
  setAuthStatus: state.setAuthStatus
}))

export const useSubscriptionStore = () => useAppStore((state) => ({
  subscription: state.subscription,
  loading: state.subscriptionLoading,
  setSubscription: state.setSubscription,
  setSubscriptionLoading: state.setSubscriptionLoading
}))

export const useWorkout = () => useAppStore((state) => ({
  currentWorkout: state.currentWorkout,
  workoutWeights: state.workoutWeights,
  workoutHistory: state.workoutHistory,
  startWorkout: state.startWorkout,
  updateWorkoutProgress: state.updateWorkoutProgress,
  updateWeight: state.updateWeight,
  completeWorkout: state.completeWorkout,
  clearWorkout: state.clearWorkout,
  addToHistory: state.addToHistory
}))

export const useErrors = () => useAppStore((state) => ({
  errors: state.errors,
  addError: state.addError,
  resolveError: state.resolveError,
  clearErrors: state.clearErrors
}))



// Expose store globally for performance monitoring and other utilities
if (typeof window !== 'undefined') {
  (window as Window & { __NEURAFIT_STORE__?: typeof useAppStore }).__NEURAFIT_STORE__ = useAppStore
}