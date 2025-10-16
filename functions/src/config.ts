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
 * Optimized for speed while maintaining quality
 */
export const OPENAI_CONFIG = {
  temperature: 0.25, // Slightly higher (0.2→0.25) for faster generation without sacrificing quality
  topP: 0.85, // Reduced from 0.9 for faster token selection (more focused sampling)
  maxTokens: 3000, // Keep at 3000 to ensure sufficient output for all workout durations
  timeout: 120000, // 120 second timeout for API calls (allows for streaming + processing, especially for longer workouts)
} as const;

/**
 * Get dynamic OpenAI config based on workout duration
 * Reduces token limits for longer workouts to improve performance
 * Also reduces temperature for faster, more deterministic generation
 */
export function getOpenAIConfigForDuration(duration: number) {
  // For 75+ minute workouts, use ultra-aggressive optimization
  // Reduce maxTokens significantly and use lower temperature for faster generation
  if (duration >= 75) {
    return {
      ...OPENAI_CONFIG,
      maxTokens: 1600, // Ultra-aggressive reduction for 75+ min workouts (was 3000)
      temperature: 0.08, // Very low temperature for fastest, most deterministic generation
    };
  }

  if (duration >= 60) {
    return {
      ...OPENAI_CONFIG,
      maxTokens: 2200,
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
  minOverallScore: 85, // Minimum overall quality score to pass
  minSafetyScore: 90, // Minimum safety score (higher bar for safety)
  maxRepairAttempts: 2, // Maximum number of repair passes (increased from 1 to handle 60-min workouts better)
  skipRepairIfScoreAbove: 92, // Skip repair attempts if quality score is above this threshold
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
  timeoutSeconds: 300, // 5 minutes - enough for multi-pass generation
  memory: '1GiB' as const, // Increased memory for better performance
  region: 'us-central1' as const,
} as const;

