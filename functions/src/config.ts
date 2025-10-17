/**
 * Configuration for Cloud Functions
 * Centralized configuration with environment variable support
 */

/**
 * OpenAI model configuration
 * Using gpt-4o-mini-2024-07-18 for better JSON mode performance and lower latency
 * Can be overridden via OPENAI_MODEL environment variable
 */
export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini-2024-07-18';

/**
 * OpenAI generation parameters
 * AGGRESSIVE optimization for speed
 */
export const OPENAI_CONFIG = {
  temperature: 0.2, // Lower for faster, more deterministic generation
  topP: 0.8, // Reduced from 0.85 for faster token selection
  maxTokens: 2800, // Reduced from 3000 for faster generation
  timeout: 150000, // 150 second timeout (reduced from 180s for faster failure detection)
} as const;

/**
 * Get dynamic OpenAI config based on workout duration
 * AGGRESSIVE optimization for longer workouts to prevent timeouts
 * Uses minimal tokens and deterministic generation for speed
 */
export function getOpenAIConfigForDuration(duration: number) {
  // For 90+ minute workouts, use ultra-aggressive optimization
  // Minimize tokens and use very low temperature for fastest generation
  if (duration >= 90) {
    return {
      ...OPENAI_CONFIG,
      maxTokens: 2000, // Aggressive reduction for 90+ min workouts
      temperature: 0.05, // Very low for deterministic, fast generation
    };
  }

  // For 75-89 minute workouts, use aggressive optimization
  if (duration >= 75) {
    return {
      ...OPENAI_CONFIG,
      maxTokens: 2200, // Reduced from 2800
      temperature: 0.08, // Lower for faster generation
    };
  }

  // For 60-74 minute workouts, use moderate optimization
  if (duration >= 60) {
    return {
      ...OPENAI_CONFIG,
      maxTokens: 2400, // Reduced from 2500
      temperature: 0.12,
    };
  }

  // Default for shorter workouts
  return OPENAI_CONFIG;
}

/**
 * Validation and quality thresholds
 */
export const QUALITY_THRESHOLDS = {
  minOverallScore: 80, // Minimum overall quality score to pass (lowered from 85 for speed)
  minSafetyScore: 85, // Minimum safety score (lowered from 90 for speed)
  maxRepairAttempts: 0, // No repair attempts for speed (was 1)
  skipRepairIfScoreAbove: 75, // Skip repair attempts if quality score is above this threshold (lowered from 90)
} as const;

/**
 * Duration validation windows
 */
export const DURATION_VALIDATION = {
  defaultVariance: 3, // ±3 minutes for workouts < 45 min
  longWorkoutVariance: 4, // ±4 minutes for workouts ≥ 45 min
  longWorkoutThreshold: 45, // Threshold for using longer variance
} as const;

/**
 * Cache configuration
 * Aggressive caching for common workout patterns
 */
export const CACHE_CONFIG = {
  ttlHours: 48, // Increased from 24 to 48 hours for better cache hit rate
  collectionName: 'ai_workout_cache', // Firestore collection name
  enabled: true, // Enable/disable caching
} as const;

/**
 * Logging configuration
 */
export const LOGGING_CONFIG = {
  structuredLogs: true, // Use structured JSON logging
  logLevel: process.env.LOG_LEVEL || 'info', // Log level: debug, info, warn, error
  anonymizePII: true, // Remove PII from logs
} as const;

/**
 * CORS origins for all deployment URLs
 */
export const CORS_ORIGINS: string[] = [
  'http://localhost:5173', // local dev
  'https://neurafit-ai-2025.web.app', // Firebase Hosting
  'https://neurafit-ai-2025.firebaseapp.com',
  'https://neurastack.ai', // Custom domain
  'https://www.neurastack.ai', // Custom domain with www
];

/**
 * Function timeouts and memory
 */
export const FUNCTION_CONFIG = {
  timeoutSeconds: 540, // 9 minutes - enough for longer workouts with streaming
  memory: '1GiB' as const, // Increased memory for better performance
  region: 'us-central1' as const,
} as const;

