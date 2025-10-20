export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

export const OPENAI_CONFIG = {
  temperature: 0.3,
  topP: 0.85,
  maxTokens: 2600,
  timeout: 180000,
  streamTimeout: 150000,
  singleExerciseTimeout: 60000,
} as const

export const API_RETRY_CONFIG = {
  maxRetries: 2,
  initialDelayMs: 1000,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
} as const

export const DURATION_VALIDATION = {
  variancePercent: 0.1,
  minVariance: 3,
} as const

export const LOGGING_CONFIG = {
  structuredLogs: true,
  logLevel: process.env.LOG_LEVEL || 'info',
  anonymizePII: true,
} as const

export const CORS_ORIGINS: string[] = [
  'http://localhost:5173',
  'https://neurafit-ai-2025.web.app',
  'https://neurafit-ai-2025.firebaseapp.com',
  'https://neurastack.ai',
  'https://www.neurastack.ai',
]

export const FUNCTION_CONFIG = {
  timeoutSeconds: 540,
  memory: '1GiB' as const,
  region: 'us-central1' as const,
} as const

