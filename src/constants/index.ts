/**
 * Application Constants
 * 
 * Centralized constants for magic numbers, timeouts, limits, and default values
 * used throughout the application.
 */

// ============================================================================
// Pagination & Limits
// ============================================================================

/** Optimal number of workouts to display per page for performance and UX */
export const WORKOUTS_PER_PAGE = 20

/** Maximum number of exercises in a single workout */
export const MAX_EXERCISES_PER_WORKOUT = 15

/** Maximum number of sets per exercise */
export const MAX_SETS_PER_EXERCISE = 10

// ============================================================================
// Timeouts & Delays
// ============================================================================

/** Timeout for workout generation warning (30 seconds) */
export const WORKOUT_GENERATION_WARNING_TIMEOUT = 30_000

/** Timeout for workout generation abort (60 seconds) */
export const WORKOUT_GENERATION_ABORT_TIMEOUT = 60_000

/** Debounce delay for search inputs (300ms) */
export const SEARCH_DEBOUNCE_DELAY = 300

/** Throttle delay for scroll events (100ms) */
export const SCROLL_THROTTLE_DELAY = 100

/** Delay before showing loading spinner (200ms) */
export const LOADING_SPINNER_DELAY = 200

/** Prefetch delay for idle routes (3 seconds) */
export const PREFETCH_IDLE_DELAY = 3000

// ============================================================================
// Exercise & Workout Defaults
// ============================================================================

/** Minimum rest time between exercises (30 seconds) */
export const MIN_REST_BETWEEN_EXERCISES = 30

/** Default rest time between sets (60 seconds) */
export const DEFAULT_REST_BETWEEN_SETS = 60

/** Maximum rest time between sets (300 seconds / 5 minutes) */
export const MAX_REST_BETWEEN_SETS = 300

/** Assumed time to execute one exercise (1 minute) */
export const EXERCISE_EXECUTION_TIME = 60

/** Default workout duration in minutes */
export const DEFAULT_WORKOUT_DURATION = 45

// ============================================================================
// Storage Keys
// ============================================================================

/** SessionStorage key for workout plan */
export const STORAGE_KEY_WORKOUT_PLAN = 'nf_workout_plan'

/** SessionStorage key for workout weights */
export const STORAGE_KEY_WORKOUT_WEIGHTS = 'nf_workout_weights'

/** SessionStorage key for rest timer */
export const STORAGE_KEY_REST_TIMER = 'nf_rest'

/** SessionStorage key for next exercise */
export const STORAGE_KEY_NEXT_EXERCISE = 'nf_next'

/** LocalStorage key for user preferences */
export const STORAGE_KEY_USER_PREFERENCES = 'nf_user_preferences'

/** LocalStorage key for onboarding completion */
export const STORAGE_KEY_ONBOARDING_COMPLETE = 'nf_onboarding_complete'

// ============================================================================
// UI Constants
// ============================================================================

/** Minimum touch target size for mobile (44px) */
export const MIN_TOUCH_TARGET_SIZE = 44

/** Maximum width for content containers (1200px) */
export const MAX_CONTENT_WIDTH = 1200

/** Mobile breakpoint (768px) */
export const MOBILE_BREAKPOINT = 768

/** Tablet breakpoint (1024px) */
export const TABLET_BREAKPOINT = 1024

// ============================================================================
// Validation Limits
// ============================================================================

/** Minimum weight value in pounds */
export const MIN_WEIGHT_VALUE = 0

/** Maximum weight value in pounds */
export const MAX_WEIGHT_VALUE = 1000

/** Minimum workout duration in minutes */
export const MIN_WORKOUT_DURATION = 10

/** Maximum workout duration in minutes */
export const MAX_WORKOUT_DURATION = 180

// ============================================================================
// Sync & Offline
// ============================================================================

/** Interval for syncing pending operations (5 minutes) */
export const SYNC_INTERVAL = 5 * 60 * 1000

/** Maximum number of retry attempts for failed operations */
export const MAX_RETRY_ATTEMPTS = 3

/** Base delay for exponential backoff (1 second) */
export const RETRY_BASE_DELAY = 1000

// ============================================================================
// Analytics & Tracking
// ============================================================================

/** Number of recent workout sessions to fetch for history */
export const RECENT_SESSIONS_LIMIT = 10

/** Number of days to look back for workout history */
export const WORKOUT_HISTORY_DAYS = 30

// ============================================================================
// Feature Flags
// ============================================================================

/** Enable adaptive personalization feature */
export const FEATURE_ADAPTIVE_PERSONALIZATION = true

/** Enable progressive overload tracking */
export const FEATURE_PROGRESSIVE_OVERLOAD = true

/** Enable workout sharing */
export const FEATURE_WORKOUT_SHARING = false

// ============================================================================
// Error Messages (Standardized)
// ============================================================================

export const ERROR_MESSAGES = {
  WORKOUT_GENERATION_FAILED: 'Failed to generate workout. Please try again.',
  WORKOUT_LOAD_FAILED: 'Failed to load workout. Please try again.',
  PROFILE_LOAD_FAILED: 'Failed to load profile. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  AUTHENTICATION_REQUIRED: 'Please sign in to continue.',
  PERMISSION_DENIED: 'Permission denied. Please check your account settings.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
} as const

// ============================================================================
// Success Messages (Standardized)
// ============================================================================

export const SUCCESS_MESSAGES = {
  WORKOUT_COMPLETED: 'Workout completed successfully!',
  PROFILE_UPDATED: 'Profile updated successfully.',
  WORKOUT_SAVED: 'Workout saved successfully.',
  SETTINGS_SAVED: 'Settings saved successfully.',
} as const

// ============================================================================
// Gradient Classes (for Tailwind)
// ============================================================================

export const GRADIENT_CLASSES = {
  PRIMARY: 'bg-gradient-to-br from-blue-500 to-indigo-600',
  PRIMARY_HOVER: 'bg-gradient-to-br from-blue-600 to-indigo-700',
  SUCCESS: 'bg-gradient-to-br from-green-500 to-emerald-600',
  SUCCESS_HOVER: 'bg-gradient-to-br from-green-600 to-emerald-700',
  DANGER: 'bg-gradient-to-br from-red-500 to-rose-600',
  DANGER_HOVER: 'bg-gradient-to-br from-red-600 to-rose-700',
  WARNING: 'bg-gradient-to-br from-amber-500 to-orange-600',
  WARNING_HOVER: 'bg-gradient-to-br from-amber-600 to-orange-700',
} as const

