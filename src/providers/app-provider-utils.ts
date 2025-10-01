/**
 * App Provider Utilities
 * Shared utilities and hooks for the app provider
 */

import { useAppStore } from '../store'

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
      reset: store.reset,
    },
  }
}

// App state utilities
export const appUtils = {
  getAuthStatusText: (status: string): string => {
    switch (status) {
      case 'loading':
        return 'Checking authentication...'
      case 'authenticated':
        return 'Signed in'
      case 'unauthenticated':
        return 'Not signed in'
      case 'error':
        return 'Authentication error'
      default:
        return 'Unknown status'
    }
  },

  getSubscriptionStatusText: (status?: string): string => {
    switch (status) {
      case 'active':
        return 'Active subscription'
      case 'canceled':
        return 'Canceled subscription'
      case 'incomplete':
        return 'Incomplete subscription'
      case 'past_due':
        return 'Payment overdue'
      case 'trialing':
        return 'Trial period'
      case 'unpaid':
        return 'Payment required'
      default:
        return 'No subscription'
    }
  },

  formatNotificationCount: (count: number): string => {
    if (count === 0) return ''
    if (count > 99) return '99+'
    return count.toString()
  },

  shouldShowUpgradePrompt: (subscription?: { status?: string; freeWorkoutsUsed?: number; freeWorkoutLimit?: number }): boolean => {
    if (!subscription) return true
    if (subscription.status === 'active') return false
    
    const used = subscription.freeWorkoutsUsed || 0
    const limit = subscription.freeWorkoutLimit || 5
    
    return used >= limit * 0.8 // Show when 80% of free workouts used
  }
}

// Theme utilities
export const themeUtils = {
  getThemeClass: (theme: string): string => {
    return theme === 'dark' ? 'dark' : ''
  },

  toggleTheme: (currentTheme: string): string => {
    return currentTheme === 'dark' ? 'light' : 'dark'
  },

  getSystemTheme: (): string => {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
}

// Notification utilities
export const notificationUtils = {
  createNotification: (
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message?: string,
    duration?: number
  ) => ({
    id: Date.now().toString(),
    type,
    title,
    message,
    duration: duration || (type === 'error' ? 0 : 5000), // Errors persist until dismissed
    timestamp: Date.now()
  }),

  filterNotificationsByType: (notifications: Array<{ type: string }>, type: string) => {
    return notifications.filter(n => n.type === type)
  },

  getNotificationIcon: (type: string): string => {
    switch (type) {
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'info':
        return 'ℹ️'
      default:
        return '📢'
    }
  }
}
