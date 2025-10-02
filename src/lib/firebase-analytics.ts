/**
 * Firebase Analytics utility functions for NeuraFit
 * Stubbed version to prevent Firebase bundling issues
 * All analytics functions are disabled to avoid Firebase imports
 */

// Stub function - all analytics calls are no-ops to prevent bundling issues
const stub = (..._args: unknown[]): void => {
  // No-op to prevent Firebase bundling issues
};

// User Authentication Events
export const trackUserSignUp = (method: string): void => stub('sign_up', { method });
export const trackUserLogin = (method: string): void => stub('login', { method });
export const trackUserLogout = (): void => stub('logout');

// User Profile Events
export const trackProfileComplete = (experience: string, goals: string[], equipment: string[]): void => 
  stub('profile_complete', { experience, goals: goals.length, equipment: equipment.length });
export const trackProfileUpdate = (field: string): void => stub('profile_update', { field });

// Workout Generation Events
export const trackWorkoutGenerated = (isSubscribed: boolean, workoutCount: number): void => 
  stub('workout_generated', { isSubscribed, workoutCount });
export const trackWorkoutStarted = (workoutId: string, exerciseCount: number): void => 
  stub('workout_started', { workoutId, exerciseCount });
export const trackWorkoutCompleted = (workoutId: string, duration: number, completionRate: number): void => 
  stub('workout_completed', { workoutId, duration, completionRate });
export const trackWorkoutAbandoned = (workoutId: string, exerciseIndex: number, reason: string): void => 
  stub('workout_abandoned', { workoutId, exerciseIndex, reason });

// Exercise Events
export const trackExerciseCompleted = (exerciseName: string, sets: number, reps: number): void => 
  stub('exercise_completed', { exerciseName, sets, reps });
export const trackExerciseSkipped = (exerciseName: string, reason: string): void => 
  stub('exercise_skipped', { exerciseName, reason });
export const trackRestCompleted = (duration: number): void => stub('rest_completed', { duration });
export const trackRestSkipped = (): void => stub('rest_skipped');

// Subscription Events
export const trackSubscriptionStarted = (plan?: string, price?: number): void =>
  stub('subscription_started', { plan, price });
export const trackSubscriptionCompleted = (plan?: string, price?: number): void =>
  stub('subscription_completed', { plan, price });
export const trackSubscriptionCancelled = (plan: string, reason?: string): void =>
  stub('subscription_cancelled', { plan, reason });
export const trackSubscriptionReactivated = (plan: string): void =>
  stub('subscription_reactivated', { plan });
export const trackPaymentFailed = (plan: string, error: string): void => 
  stub('payment_failed', { plan, error });
export const trackFreeTrialStarted = (): void => stub('free_trial_started');
export const trackFreeTrialEnded = (converted: boolean): void => 
  stub('free_trial_ended', { converted });
export const trackFreeTrialLimitReached = (workoutCount: number): void => 
  stub('free_trial_limit_reached', { workoutCount });

// Navigation Events
export const trackPageView = (pageName: string, pageTitle?: string): void => 
  stub('page_view', { pageName, pageTitle });
export const trackButtonClick = (buttonName: string, location: string): void => 
  stub('button_click', { buttonName, location });

// User Properties
export const setUserAnalyticsProperties = (userId: string, properties: Record<string, unknown>): void =>
  stub('set_user_properties', { userId, properties });
export const setEnhancedUserProperties = (userId: string, userProfile: Record<string, unknown>): void =>
  stub('set_enhanced_user_properties', { userId, userProfile });

// Custom Events
export const trackCustomEvent = (eventName: string, parameters: Record<string, unknown>): void => 
  stub('custom_event', { eventName, parameters });
export const trackSessionStart = (): void => stub('session_start');
export const trackError = (error: string, context?: string): void => 
  stub('error', { error, context });
