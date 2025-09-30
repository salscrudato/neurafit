import { logEvent, setUserProperties, setUserId } from 'firebase/analytics'
import { analytics } from './firebase'

/**
 * Firebase Analytics utility functions for NeuraFit
 * Tracks user interactions, workout generation, subscriptions, and more
 */

// Check if analytics is available
const isAnalyticsAvailable = () => {
  return analytics !== null && typeof window !== 'undefined'
}

// Safe wrapper for analytics calls
const safeAnalyticsCall = (fn: () => void) => {
  if (isAnalyticsAvailable()) {
    try {
      fn()
    } catch (error) {
      console.warn('Analytics error:', error)
    }
  }
}

/**
 * User Authentication Events
 */
export const trackUserSignUp = (method: string) => {
  safeAnalyticsCall(() => {
    logEvent(analytics!, 'sign_up', {
      method: method // 'google', 'email', etc.
    })
  })
}

export const trackUserLogin = (method: string) => {
  safeAnalyticsCall(() => {
    logEvent(analytics!, 'login', {
      method: method
    })
  })
}

export const trackUserLogout = () => {
  safeAnalyticsCall(() => {
    logEvent(analytics!, 'logout')
  })
}

/**
 * User Profile Events
 */
export const trackProfileComplete = (experience: string, goals: string[], equipment: string[]) => {
  safeAnalyticsCall(() => {
    logEvent(analytics!, 'profile_complete', {
      experience_level: experience,
      goal_count: goals.length,
      equipment_count: equipment.length,
      primary_goal: goals[0] || 'none'
    })
  })
}

export const trackProfileUpdate = (field: string) => {
  safeAnalyticsCall(() => {
    logEvent(analytics!, 'profile_update', {
      field_updated: field
    })
  })
}

/**
 * Workout Generation Events
 */
export const trackWorkoutGenerated = (isSubscribed: boolean, workoutCount: number) => {
  safeAnalyticsCall(() => {
    logEvent(analytics!, 'workout_generated', {
      is_subscribed: isSubscribed,
      workout_count: workoutCount,
      user_type: isSubscribed ? 'premium' : 'free'
    })
  })
}

export const trackWorkoutStarted = (workoutId: string, exerciseCount: number) => {
  safeAnalyticsCall(() => {
    logEvent(analytics!, 'workout_started', {
      workout_id: workoutId,
      exercise_count: exerciseCount
    })
  })
}

export const trackWorkoutCompleted = (workoutId: string, duration: number, exercisesCompleted: number) => {
  safeAnalyticsCall(() => {
    logEvent(analytics!, 'workout_completed', {
      workout_id: workoutId,
      duration_minutes: Math.round(duration / 60),
      exercises_completed: exercisesCompleted
    })
  })
}

/**
 * Subscription Events
 */
export const trackSubscriptionStarted = () => {
  safeAnalyticsCall(() => {
    logEvent(analytics!, 'begin_checkout', {
      currency: 'USD',
      value: 10.00,
      items: [{
        item_id: 'neurafit_pro_monthly',
        item_name: 'NeuraFit Pro Monthly',
        category: 'subscription',
        price: 10.00,
        quantity: 1
      }]
    })
  })
}

export const trackSubscriptionCompleted = (subscriptionId: string) => {
  safeAnalyticsCall(() => {
    logEvent(analytics!, 'purchase', {
      transaction_id: subscriptionId,
      currency: 'USD',
      value: 10.00,
      items: [{
        item_id: 'neurafit_pro_monthly',
        item_name: 'NeuraFit Pro Monthly',
        category: 'subscription',
        price: 10.00,
        quantity: 1
      }]
    })
  })
}

export const trackFreeTrialLimitReached = (workoutCount: number) => {
  safeAnalyticsCall(() => {
    logEvent(analytics!, 'free_trial_limit_reached', {
      workout_count: workoutCount
    })
  })
}

/**
 * Navigation Events
 */
export const trackPageView = (pageName: string, pageTitle?: string) => {
  safeAnalyticsCall(() => {
    logEvent(analytics!, 'page_view', {
      page_title: pageTitle || pageName,
      page_location: window.location.href,
      page_path: window.location.pathname
    })
  })
}

export const trackButtonClick = (buttonName: string, location: string) => {
  safeAnalyticsCall(() => {
    logEvent(analytics!, 'button_click', {
      button_name: buttonName,
      location: location
    })
  })
}

/**
 * Error Tracking
 */
export const trackError = (errorType: string, errorMessage: string, location: string) => {
  safeAnalyticsCall(() => {
    logEvent(analytics!, 'exception', {
      description: `${errorType}: ${errorMessage}`,
      fatal: false,
      location: location
    })
  })
}

/**
 * User Properties
 */
export const setUserAnalyticsProperties = (userId: string, properties: {
  experience_level?: string
  subscription_status?: string
  total_workouts?: number
  signup_date?: string
}) => {
  safeAnalyticsCall(() => {
    setUserId(analytics!, userId)
    setUserProperties(analytics!, properties)
  })
}

/**
 * Custom Events
 */
export const trackCustomEvent = (eventName: string, parameters: Record<string, any>) => {
  safeAnalyticsCall(() => {
    logEvent(analytics!, eventName, parameters)
  })
}

/**
 * Debug function to check analytics status
 */
export const getAnalyticsStatus = () => {
  return {
    isAvailable: isAnalyticsAvailable(),
    analytics: analytics,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server'
  }
}
