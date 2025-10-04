/**
 * Environment Variable Helper
 * Provides type-safe access to environment variables with proper index signature handling
 */

/**
 * Get environment variable with type safety
 * Handles noUncheckedIndexedAccess TypeScript strict mode
 */
function getEnv(key: string): string | undefined {
  return import.meta.env[key]
}

/**
 * Get environment variable or throw if not found
 */
function getRequiredEnv(key: string): string {
  const value = import.meta.env[key]
  if (value === undefined) {
    throw new Error(`Required environment variable ${key} is not defined`)
  }
  return value
}

/**
 * Check if running in development mode
 */
export const isDevelopment = getEnv('MODE') === 'development'

/**
 * Check if running in production mode
 */
export const isProduction = getEnv('MODE') === 'production'

/**
 * Get Node environment (development, production, test)
 */
export const nodeEnv = getEnv('NODE_ENV') ?? 'development'

/**
 * Workout function URL
 */
export const workoutFnUrl = getEnv('VITE_WORKOUT_FN_URL')

/**
 * Feature flags
 */
export const features = {
  adaptivePersonalization: getEnv('VITE_ADAPTIVE_PERSONALIZATION_ENABLED') === 'true',
  adaptiveFeedbackUI: getEnv('VITE_ADAPTIVE_FEEDBACK_UI_ENABLED') === 'true',
  adaptiveCalibration: getEnv('VITE_ADAPTIVE_CALIBRATION_ENABLED') === 'true',
  adaptiveTelemetry: getEnv('VITE_ADAPTIVE_TELEMETRY_ENABLED') === 'true',
} as const

/**
 * Export helper functions for custom usage
 */
export { getEnv, getRequiredEnv }

