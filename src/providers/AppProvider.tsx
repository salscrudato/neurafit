// Unified app provider using the new store architecture
// Replaces multiple context providers with a single, efficient provider

import { useEffect, type ReactNode } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../lib/firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import { useAppStore } from '../store'
import { isProfileComplete } from '../session/types'
import type { UserProfile } from '../session/types'
import { performanceMonitor } from '../lib/performanceMonitor'
import type { UserSubscription } from '../types/subscription'
import { ensureUserDocument } from '../lib/user-utils'
// Import utilities dynamically to avoid circular dependencies
// import { handleAuthError, handleFirestoreError } from '../lib/errorHandler'
// import { dataManager } from '../lib/dataManager'
// import { performanceMonitor } from '../lib/performanceMonitor'

interface AppProviderProps {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  const {
    setUser,
    setProfile,
    setAuthStatus,
    setSubscription,
    setSubscriptionLoading,
    syncPendingOperations,
    setOnlineStatus,
    updateLastSyncTime
  } = useAppStore()

  // Authentication state management
  useEffect(() => {
    let unsubDoc: (() => void) | null = null
    let unsubSubscription: (() => void) | null = null

    performanceMonitor.startMeasure('auth-initialization')

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔐 Auth state changed:', user?.email || 'signed out')
        }

        // Cleanup existing listeners
        unsubDoc?.()
        unsubDoc = null
        unsubSubscription?.()
        unsubSubscription = null

        setUser(user)
        setProfile(null)
        setSubscription(null)

        if (!user) {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔐 No user, setting status to signedOut')
          }
          setAuthStatus('signedOut')
          performanceMonitor.endMeasure('auth-initialization')
          return
        }

        // Delay to ensure auth stability
        setTimeout(async () => {
          try {
            await ensureUserDocument(user)

            const profileRef = doc(db, 'users', user.uid)
            unsubDoc = onSnapshot(
              profileRef,
              (snapshot) => {
                if (!snapshot.exists()) {
                  setProfile(null)
                  setAuthStatus('needsOnboarding')
                  return
                }

                const profileData = snapshot.data() as UserProfile
                setProfile(profileData)
                setAuthStatus(isProfileComplete(profileData) ? 'ready' : 'needsOnboarding')

                // Handle subscription data
                if (profileData.subscription) {
                  setSubscription(profileData.subscription)
                } else {
                  const defaultSubscription: UserSubscription = {
                    customerId: '',
                    status: 'incomplete',
                    workoutCount: 0,
                    freeWorkoutsUsed: 0,
                    freeWorkoutLimit: 5,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                  }
                  setSubscription(defaultSubscription)
                }
                setSubscriptionLoading(false)

                performanceMonitor.endMeasure('auth-initialization')
              },
              (error) => {
                console.error('Profile listener error:', error)
                // handleFirestoreError(error, {
                //   component: 'AppProvider',
                //   action: 'profile-listener'
                // })

                if (error.code === 'permission-denied') {
                  unsubDoc?.()
                  unsubDoc = null
                  setProfile(null)
                  setAuthStatus('signedOut')
                }
              }
            )

            await syncPendingOperations()
            updateLastSyncTime()
          } catch (error) {
            console.error('User initialization error:', error)
            // handleAuthError(error, {
            //   component: 'AppProvider',
            //   action: 'user-initialization'
            // })
          }
        }, 100)
      } catch (error) {
        console.error('Auth state change error:', error)
        // handleAuthError(error, {
        //   component: 'AppProvider',
        //   action: 'auth-state-change'
        // })
      }
    })

    return () => {
      unsubAuth()
      unsubDoc?.()
      unsubSubscription?.()
    }
  }, [
    setUser,
    setProfile,
    setAuthStatus,
    setSubscription,
    setSubscriptionLoading,
    syncPendingOperations,
    updateLastSyncTime
  ])

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true)
      syncPendingOperations()
    }

    const handleOffline = () => {
      setOnlineStatus(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    setOnlineStatus(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnlineStatus, syncPendingOperations])

  // Periodic sync for pending operations
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (navigator.onLine) {
        syncPendingOperations()
      }
    }, 5 * 60 * 1000) // Every 5 minutes

    return () => clearInterval(syncInterval)
  }, [syncPendingOperations])

  // Memory pressure monitoring
  useEffect(() => {
    if ('memory' in performance) {
      const checkMemoryPressure = () => {
        const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory
        if (!memory) return

        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024)
        const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024)

        if (usedMB > limitMB * 0.8) {
          console.warn('High memory usage detected, triggering cleanup')
          // dataManager.clearCache()

          if ('gc' in window) {
            (window as Window & { gc?: () => void }).gc?.()
          }
        }
      }

      const memoryInterval = setInterval(checkMemoryPressure, 60000) // Every minute

      return () => clearInterval(memoryInterval)
    }
  }, [])

  // Global error recovery
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason)

      if (event.reason?.code === 'permission-denied') {
        setAuthStatus('signedOut')
      }

      event.preventDefault()
    }

    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error)

      if (process.env.NODE_ENV === 'production') {
        // Integrate with error tracking service
        console.error('Production error reported:', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error
        })
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [setAuthStatus])

  return <>{children}</>
}

// Hook to access the unified store
export const useApp = () => {
  const store = useAppStore()

  return {
    // Auth state
    user: store.user,
    profile: store.profile,
    authStatus: store.authStatus,

    // Subscription state
    subscription: store.subscription,
    subscriptionLoading: store.subscriptionLoading,

    // Workout state
    currentWorkout: store.currentWorkout,
    workoutWeights: store.workoutWeights,
    workoutHistory: store.workoutHistory,

    // UI state
    isOnline: store.isOnline,
    errors: store.errors,
    performanceMetrics: store.performanceMetrics,

    // Actions
    actions: {
      // Auth actions
      setUser: store.setUser,
      setProfile: store.setProfile,
      setAuthStatus: store.setAuthStatus,

      // Workout actions
      startWorkout: store.startWorkout,
      updateWorkoutProgress: store.updateWorkoutProgress,
      updateWeight: store.updateWeight,
      completeWorkout: store.completeWorkout,
      clearWorkout: store.clearWorkout,

      // Error actions
      addError: store.addError,
      resolveError: store.resolveError,
      clearErrors: store.clearErrors,

      // Utility actions
      reset: store.reset
    }
  }
}