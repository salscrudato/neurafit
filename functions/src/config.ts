export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export const OPENAI_CONFIG = {
  // Core parameters optimized for high-quality, consistent generation
  // gpt-4o-mini is fast, cost-effective, and excellent for structured outputs
  temperature: 0.2, // Very low for consistency and reliability (0.2 is optimal for structured generation)
  topP: 0.9, // Slightly lower for more focused, deterministic outputs
  maxTokens: 2000, // Increased for comprehensive exercise descriptions and safety tips

  // Penalty parameters to reduce repetition and improve diversity
  frequencyPenalty: 0.3, // Increased to strongly discourage repeated exercises
  presencePenalty: 0.2, // Increased to encourage diverse exercise selection

  // Timeouts - optimized for non-streaming approach
  // Non-streaming is significantly faster than streaming (typically 2-5 seconds)
  timeout: 120000, // 120 seconds for full workouts (non-streaming is very fast)
  singleExerciseTimeout: 40000, // 40 seconds for single exercises
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

