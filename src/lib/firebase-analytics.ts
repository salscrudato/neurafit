/**
 * Simplified Analytics Service for NeuraFit
 * Unified analytics, telemetry, and tracking system
 */

import { logger } from './logger'

// Simple analytics configuration
interface AnalyticsConfig {
  enabled: boolean
  debug: boolean
  maxEvents: number
}

// Analytics event structure
interface AnalyticsEvent {
  event: string
  timestamp: number
  data: Record<string, unknown>
}

class SimpleAnalytics {
  private config: AnalyticsConfig
  private events: AnalyticsEvent[] = []

  constructor() {
    this.config = {
      enabled: true,
      debug: import.meta.env.DEV,
      maxEvents: 100
    }
  }

  private track(event: string, data: Record<string, unknown> = {}): void {
    if (!this.config.enabled) return

    const analyticsEvent: AnalyticsEvent = {
      event,
      timestamp: Date.now(),
      data: {
        ...data,
        url: window.location.href,
        userAgent: navigator.userAgent.substring(0, 50)
      }
    }

    // Store event locally
    this.events.push(analyticsEvent)

    // Keep only recent events
    if (this.events.length > this.config.maxEvents) {
      this.events = this.events.slice(-this.config.maxEvents)
    }

    // Debug logging
    if (this.config.debug) {
      logger.debug('Analytics event', { event, data })
    }

    // Store in localStorage for debugging
    try {
      localStorage.setItem('nf_analytics_events', JSON.stringify(this.events.slice(-20)))
    } catch {
      // Ignore storage errors
    }
  }

  // User Authentication Events
  trackUserSignUp = (method: string): void => this.track('sign_up', { method })
  trackUserLogin = (method: string): void => this.track('login', { method })
  trackUserLogout = (): void => this.track('logout')

  // User Profile Events
  trackProfileComplete = (experience: string, goals: string[], equipment: string[]): void =>
    this.track('profile_complete', { experience, goals: goals.length, equipment: equipment.length })
  trackProfileUpdate = (field: string): void => this.track('profile_update', { field })

  // Page View Events
  trackPageView = (pageName: string, title?: string): void =>
    this.track('page_view', { page_title: title, page_name: pageName })

  // Workout Events (unified interface)
  trackWorkoutGenerated = (workoutType: string, duration?: number, exerciseCount?: number): void =>
    this.track('workout_generated', { workout_type: workoutType, duration, exercise_count: exerciseCount })
  trackWorkoutStarted = (workoutType: string): void => this.track('workout_started', { workout_type: workoutType })
  trackWorkoutCompleted = (workoutType: string, duration: number, completionRate: number): void =>
    this.track('workout_completed', { workout_type: workoutType, duration, completion_rate: completionRate })
  trackWorkoutAbandoned = (workoutType: string, progress: number): void =>
    this.track('workout_abandoned', { workout_type: workoutType, progress })

  // Exercise Events
  trackExerciseCompleted = (exerciseName: string, sets: number, reps: number): void =>
    this.track('exercise_completed', { exerciseName, sets, reps })
  trackExerciseSkipped = (exerciseName: string, reason: string): void =>
    this.track('exercise_skipped', { exerciseName, reason })
  trackRestCompleted = (duration: number): void => this.track('rest_completed', { duration })
  trackRestSkipped = (): void => this.track('rest_skipped')

  // Feature Usage Events
  trackFeatureUsed = (feature: string, context?: string): void =>
    this.track('feature_used', { feature, context })
  trackButtonClicked = (buttonName: string, location: string): void =>
    this.track('button_clicked', { button_name: buttonName, location })
  trackFormSubmitted = (formName: string, success: boolean): void =>
    this.track('form_submitted', { form_name: formName, success })

  // Custom Events
  trackCustomEvent = (eventName: string, parameters: Record<string, unknown>): void =>
    this.track(eventName, parameters)
  trackError = (error: string, context?: string): void =>
    this.track('error', { error, context })

  // Telemetry Events (simplified from telemetry.ts)
  trackAdaptiveFeedback = (feedback: 'easy' | 'right' | 'hard', rpe: number | null, completionRate: number): void =>
    this.track('adaptive_feedback', { feedback, rpe, completion_rate: completionRate })

  // Utility methods
  getEvents = (): AnalyticsEvent[] => [...this.events]
  clearEvents = (): void => { this.events = [] }
  setConfig = (config: Partial<AnalyticsConfig>): void => { this.config = { ...this.config, ...config } }
}

// Create singleton instance
const analytics = new SimpleAnalytics()

// Export all tracking functions
export const {
  trackUserSignUp,
  trackUserLogin,
  trackUserLogout,
  trackProfileComplete,
  trackProfileUpdate,
  trackPageView,
  trackWorkoutGenerated,
  trackWorkoutStarted,
  trackWorkoutCompleted,
  trackWorkoutAbandoned,
  trackExerciseCompleted,
  trackExerciseSkipped,
  trackRestCompleted,
  trackRestSkipped,
  trackFeatureUsed,
  trackButtonClicked,
  trackFormSubmitted,
  trackCustomEvent,
  trackError,
  trackAdaptiveFeedback
} = analytics

// Legacy compatibility exports
export const setUserAnalyticsProperties = (_userId: string, _properties: Record<string, unknown>): void => {}
export const setEnhancedUserProperties = (_userId: string, _userProfile: Record<string, unknown>): void => {}
export const trackSessionStart = (): void => analytics.trackCustomEvent('session_start', {})

// Export analytics instance
export { analytics }
