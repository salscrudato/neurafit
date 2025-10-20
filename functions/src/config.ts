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
 * Simple ±10% variance for all workouts
 */
export const DURATION_VALIDATION = {
  variancePercent: 0.1, // ±10% variance for all workouts
  minVariance: 3, // Minimum ±3 minutes
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

