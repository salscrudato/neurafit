// Unified app provider using the new store architecture
// Replaces multiple context providers with a single, efficient provider

import { useEffect, type ReactNode } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../lib/firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import { useAppStore } from '../store'
import { isProfileComplete } from '../session/types'
import type { UserProfile } from '../session/types'
import { performanceMonitor } from '../lib/performanceMonitor.tsx'
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

  useEffect(() => {
    let unsubDoc: (() => void) | null = null
    let unsubSubscription: (() => void) | null = null

    // Performance tracking
    performanceMonitor.startMeasure('auth-initialization')

    // Auth state listener
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔐 Auth state changed:', user?.email || 'signed out')
        }
        if (process.env.NODE_ENV === 'development') {
          console.log('🔐 Auth state:', user?.email || 'signed out')
        }

        // Clean up existing listeners
        if (unsubDoc) {
          unsubDoc()
          unsubDoc = null
        }
        if (unsubSubscription) {
          unsubSubscription()
          unsubSubscription = null
        }

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

        // Small delay to ensure auth state is stable
        setTimeout(async () => {
          try {
            // Ensure user document exists
            await ensureUserDocument(user)

            // Setup profile listener
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

                // Extract subscription data
                if (profileData.subscription) {
                  setSubscription(profileData.subscription)
                  setSubscriptionLoading(false)
                } else {
                  // Initialize default subscription for new users
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
                  setSubscriptionLoading(false)
                }

                performanceMonitor.endMeasure('auth-initialization')
              },
              (error) => {
                console.error('Profile listener error:', error)
                // handleFirestoreError(error, {
                //   component: 'AppProvider',
                //   action: 'profile-listener'
                // })

                if (error.code === 'permission-denied') {
                  // User likely signed out, clean up and set appropriate state
                  if (unsubDoc) {
                    unsubDoc()
                    unsubDoc = null
                  }
                  setProfile(null)
                  setAuthStatus('signedOut')
                }
              }
            )

            // Sync any pending operations
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
      if (unsubDoc) unsubDoc()
      if (unsubSubscription) unsubSubscription()
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

  // Setup online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true)
      // Sync pending operations when coming back online
      syncPendingOperations()
    }

    const handleOffline = () => {
      setOnlineStatus(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Set initial status
    setOnlineStatus(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnlineStatus, syncPendingOperations])

  // Setup periodic sync for pending operations
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (navigator.onLine) {
        syncPendingOperations()
      }
    }, 5 * 60 * 1000) // Sync every 5 minutes

    return () => clearInterval(syncInterval)
  }, [syncPendingOperations])

  // Setup memory pressure monitoring
  useEffect(() => {
    if ('memory' in performance) {
      const checkMemoryPressure = () => {
        const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory
        if (!memory) return

        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024)
        const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
        
        // If memory usage is high, trigger cleanup
        if (usedMB > limitMB * 0.8) {
          console.warn('High memory usage detected, triggering cleanup')
          
          // Clear old data from IndexedDB (will be implemented later)
          // dataManager.clearCache()
          
          // Force garbage collection if available
          if ('gc' in window) {
            (window as Window & { gc?: () => void }).gc?.()
          }
        }
      }

      const memoryInterval = setInterval(checkMemoryPressure, 60000) // Check every minute
      
      return () => clearInterval(memoryInterval)
    }
  }, [])

  // Setup error recovery
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason)
      
      // Try to recover from common errors
      if (event.reason?.code === 'permission-denied') {
        // Redirect to auth if permission denied
        setAuthStatus('signedOut')
      }
      
      // Prevent the default browser behavior
      event.preventDefault()
    }

    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error)
      
      // Report to error tracking service in production
      if (process.env.NODE_ENV === 'production') {
        // This would integrate with an error tracking service
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
