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
 */
export const OPENAI_CONFIG = {
  temperature: 0.2, // Lower for more consistent, deterministic outputs
  topP: 0.9, // Nucleus sampling for quality
  maxTokens: 3000, // Optimized for 6-12 exercises (reduced from 4500 for 33% cost savings)
  timeout: 90000, // 90 second timeout for API calls (allows for streaming + processing)
} as const;

/**
 * Validation and quality thresholds
 */
export const QUALITY_THRESHOLDS = {
  minOverallScore: 85, // Minimum overall quality score to pass
  minSafetyScore: 90, // Minimum safety score (higher bar for safety)
  maxRepairAttempts: 1, // Maximum number of repair passes (reduced from 2 for cost optimization)
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
 */
export const CACHE_CONFIG = {
  ttlHours: 24, // Cache TTL in hours
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

