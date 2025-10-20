/**
 * Configuration for Cloud Functions
 * Centralized configuration with environment variable support
 */

/**
 * OpenAI model configuration
 * Using gpt-4o-mini for better JSON mode performance and lower latency
 * Falls back to gpt-4o-mini-2024-07-18 if the latest version is not available
 * Can be overridden via OPENAI_MODEL environment variable
 */
export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

/**
 * OpenAI generation parameters
 * Optimized for speed, cost, and quality balance
 * Using gpt-4o-mini for best cost/performance ratio
 */
export const OPENAI_CONFIG = {
  temperature: 0.3, // Slightly higher for better variety while maintaining consistency
  topP: 0.85, // Balanced for quality and speed
  maxTokens: 2600, // Optimized token count for typical workouts
  timeout: 180000, // 180 second timeout - sufficient for all workouts including 90+ min
  streamTimeout: 150000, // 150 second timeout for streaming operations
} as const;

/**
 * Get dynamic OpenAI config based on workout duration
 * Optimized for speed while maintaining quality
 * Balances token usage with generation quality
 */
export function getOpenAIConfigForDuration(duration: number) {
  // For 120+ minute workouts, aggressive speed optimization
  if (duration >= 120) {
    return {
      ...OPENAI_CONFIG,
      maxTokens: 2200, // Reduced for faster generation
      temperature: 0.35, // Slightly higher for faster convergence
    };
  }

  // For 90-119 minute workouts, optimize for speed
  if (duration >= 90) {
    return {
      ...OPENAI_CONFIG,
      maxTokens: 2300, // Reduced for faster generation
      temperature: 0.30, // Balanced for speed and quality
    };
  }

  // For 75-89 minute workouts, balanced optimization
  if (duration >= 75) {
    return {
      ...OPENAI_CONFIG,
      maxTokens: 2500,
      temperature: 0.28,
    };
  }

  // For 60-74 minute workouts, standard config
  if (duration >= 60) {
    return {
      ...OPENAI_CONFIG,
      maxTokens: 2600,
      temperature: 0.30,
    };
  }

  // Default for shorter workouts - allow more variety
  return OPENAI_CONFIG;
}

/**
 * Validation and quality thresholds
 * Balanced for quality and speed - repair attempts only when necessary
 */
export const QUALITY_THRESHOLDS = {
  minOverallScore: 82, // Minimum overall quality score to pass
  minSafetyScore: 88, // Minimum safety score - critical for user safety
  maxRepairAttempts: 1, // Allow 1 repair attempt for quality improvement
  skipRepairIfScoreAbove: 85, // Skip repair attempts if quality score is excellent
} as const;

/**
 * Get quality thresholds based on workout duration
 * For longer workouts, we skip quality gates to prioritize speed
 */
export function getQualityThresholdsForDuration(duration: number) {
  // For 120+ minute workouts, skip quality gate entirely (speed priority)
  if (duration >= 120) {
    return {
      ...QUALITY_THRESHOLDS,
      maxRepairAttempts: 0, // No repair attempts - accept first valid result
      skipRepairIfScoreAbove: 0, // Skip quality scoring entirely
    };
  }

  // For 90-119 minute workouts, minimal quality gate
  if (duration >= 90) {
    return {
      ...QUALITY_THRESHOLDS,
      maxRepairAttempts: 0, // No repair attempts - accept first valid result
      skipRepairIfScoreAbove: 100, // Always skip quality scoring
    };
  }

  // For shorter workouts, use standard thresholds
  return QUALITY_THRESHOLDS;
}

/**
 * API retry configuration
 * Handles transient failures and rate limiting
 */
export const API_RETRY_CONFIG = {
  maxRetries: 2, // Maximum number of retry attempts
  initialDelayMs: 1000, // Initial delay before first retry
  maxDelayMs: 5000, // Maximum delay between retries
  backoffMultiplier: 2, // Exponential backoff multiplier
  retryableStatusCodes: [408, 429, 500, 502, 503, 504], // HTTP status codes to retry on
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

