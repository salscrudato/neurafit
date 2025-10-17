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
  timeout: 180000, // 180 second timeout for API calls (increased from 120s to handle longer workouts better)
} as const;

/**
 * Get dynamic OpenAI config based on workout duration
 * Balances token limits for quality while maintaining reasonable performance
 * Uses streaming for all durations to avoid timeouts
 */
export function getOpenAIConfigForDuration(duration: number) {
  // For 75+ minute workouts, use balanced optimization
  // Keep sufficient tokens for quality output while using lower temperature for faster generation
  if (duration >= 75) {
    return {
      ...OPENAI_CONFIG,
      maxTokens: 2800, // Increased from 1600 to ensure quality for long workouts
      temperature: 0.15, // Slightly higher than 0.08 for better quality
    };
  }

  if (duration >= 60) {
    return {
      ...OPENAI_CONFIG,
      maxTokens: 2500, // Increased from 2200 for better quality
      temperature: 0.15,
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
  maxRepairAttempts: 1, // Maximum number of repair passes (reduced from 2 to speed up longer workouts)
  skipRepairIfScoreAbove: 90, // Skip repair attempts if quality score is above this threshold (lowered from 92)
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

