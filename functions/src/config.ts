export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export const OPENAI_CONFIG = {
  // Core parameters optimized for high-quality, consistent generation
  // gpt-4o-mini is fast, cost-effective, and excellent for structured outputs
  temperature: 0.3, // Balanced for consistency + diversity (0.3 optimal for structured generation with variety)
  topP: 0.95, // Higher for better quality outputs while maintaining focus
  maxTokens: 3000, // Increased to 3000 for longer workouts with more exercises and detailed descriptions

  // Penalty parameters to reduce repetition and improve diversity
  frequencyPenalty: 0.4, // Increased to strongly discourage repeated exercises
  presencePenalty: 0.3, // Increased to encourage diverse exercise selection

  // Timeouts - optimized for non-streaming approach
  // Non-streaming typically completes in 3-8 seconds; set timeouts accordingly
  timeout: 45000, // 45 seconds for full workouts (non-streaming is very fast, 3-8s typical)
  singleExerciseTimeout: 30000, // 30 seconds for single exercises (typically 2-5s)
} as const;

// Input validation constraints
export const INPUT_VALIDATION = {
  minDuration: 5,
  maxDuration: 150,
  defaultDuration: 30,
  defaultExperience: 'Intermediate',
  defaultWorkoutType: 'Full Body',
} as const;

// Default arrays (not const to avoid readonly issues)
export const DEFAULT_GOALS = ['General Fitness'];
export const DEFAULT_EQUIPMENT = ['Bodyweight'];

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

