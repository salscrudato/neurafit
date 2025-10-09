/// <reference types="vite/client" />

/**
 * Type definitions for environment variables
 * This provides type safety and autocomplete for import.meta.env
 */
interface ImportMetaEnv {
  // Firebase Configuration
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string

  // Sentry Configuration
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_ENABLE_SENTRY?: string

  // Feature Flags - Adaptive Personalization
  readonly VITE_ADAPTIVE_PERSONALIZATION_ENABLED?: string
  readonly VITE_ADAPTIVE_FEEDBACK_UI_ENABLED?: string
  readonly VITE_ADAPTIVE_CALIBRATION_ENABLED?: string
  readonly VITE_ADAPTIVE_TELEMETRY_ENABLED?: string

  // Feature Flags - General
  readonly VITE_ENABLE_ANALYTICS?: string
  readonly VITE_ENABLE_ERROR_TRACKING?: string

  // Cloud Functions
  readonly VITE_WORKOUT_FN_URL?: string
  readonly VITE_ADD_EXERCISE_FN_URL?: string
  readonly VITE_SWAP_EXERCISE_FN_URL?: string

  // Environment
  readonly VITE_APP_ENV?: 'development' | 'staging' | 'production'

  // Vite built-in
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

