export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export const OPENAI_CONFIG = {
  // Core parameters for deterministic, high-quality generation
  temperature: 0.2, // Very low for consistency and reliability (0.0-2.0)
  topP: 0.9, // Balanced diversity with slight increase for variety (0.0-1.0)
  maxTokens: 1800, // Sufficient for detailed workouts

  // Penalty parameters to reduce repetition and improve diversity
  frequencyPenalty: 0.15, // Slight penalty for repeated tokens (0.0-2.0)
  presencePenalty: 0.05, // Minimal penalty for new tokens (0.0-2.0)

  // Timeouts - optimized for non-streaming approach
  timeout: 180000, // 180 seconds for full workouts (non-streaming is faster than streaming)
  singleExerciseTimeout: 60000, // 60 seconds for single exercises
} as const;

export const API_RETRY_CONFIG = {
  maxRetries: 2,
  initialDelayMs: 1000,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
} as const;

export const DURATION_VALIDATION = {
  variancePercent: 0.1,
  minVariance: 3,
} as const;

export const LOGGING_CONFIG = {
  structuredLogs: true,
  logLevel: process.env.LOG_LEVEL || 'info',
  anonymizePII: true,
} as const;

export const CORS_ORIGINS: string[] = [
  'http://localhost:5173', // Local development
  'https://neurafit-ai-2025.web.app', // Firebase Hosting
  'https://neurafit-ai-2025.firebaseapp.com', // Firebase default domain
  'https://neurastack.ai', // Custom domain
  'https://www.neurastack.ai', // Custom domain with www
];

export const FUNCTION_CONFIG = {
  timeoutSeconds: 540, // 9 minutes for full workout generation
  memory: '1GiB' as const,
  region: 'us-central1' as const,
} as const;

// Single exercise function config
export const SINGLE_EXERCISE_CONFIG = {
  timeoutSeconds: 60,
  memory: '512MiB' as const,
  region: 'us-central1' as const,
} as const;

