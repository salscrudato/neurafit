/**
 * Configuration for Cloud Functions
 * Centralized configuration with environment variable support
 */

/**
 * OpenAI model configuration
 * Default to gpt-4.1-mini for cost-effective, high-quality generation
 * Can be overridden via OPENAI_MODEL environment variable
 */
export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

/**
 * OpenAI generation parameters
 */
export const OPENAI_CONFIG = {
  temperature: 0.2, // Lower for more consistent, deterministic outputs
  topP: 0.9, // Nucleus sampling for quality
  maxTokens: 4500, // Sufficient for comprehensive workouts
  timeout: 60000, // 60 second timeout for API calls
} as const;

/**
 * Validation and quality thresholds
 */
export const QUALITY_THRESHOLDS = {
  minOverallScore: 85, // Minimum overall quality score to pass
  minSafetyScore: 90, // Minimum safety score (higher bar for safety)
  maxRepairAttempts: 2, // Maximum number of repair passes (total 3 generations)
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

