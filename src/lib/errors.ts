/**
 * Standardized Error Handling System
 * 
 * Provides consistent error handling across the application with:
 * - Typed error classes
 * - User-friendly error messages
 * - Error logging and monitoring
 * - Retry mechanisms
 */

import { logger } from './logger'
import * as Sentry from '@sentry/react'

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'
export type ErrorCode = 
  | 'AUTH_ERROR'
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'WORKOUT_GENERATION_ERROR'
  | 'SUBSCRIPTION_ERROR'
  | 'FIRESTORE_ERROR'
  | 'UNKNOWN_ERROR'
  | 'PERMISSION_DENIED'
  | 'TIMEOUT_ERROR'
  | 'OFFLINE_ERROR'

export interface ErrorContext {
  userId?: string
  component?: string
  action?: string
  metadata?: Record<string, unknown>
}

/**
 * Base application error class with enhanced context
 */
export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly severity: ErrorSeverity
  public readonly userMessage: string
  public readonly context: ErrorContext
  public readonly originalError?: Error
  public readonly timestamp: number
  public readonly retryable: boolean

  constructor(
    message: string,
    code: ErrorCode,
    severity: ErrorSeverity,
    userMessage: string,
    context: ErrorContext = {},
    originalError?: Error,
    retryable: boolean = false
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.severity = severity
    this.userMessage = userMessage
    this.context = context
    this.originalError = originalError
    this.timestamp = Date.now()
    this.retryable = retryable

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }

  /**
   * Convert to plain object for logging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      userMessage: this.userMessage,
      context: this.context,
      timestamp: this.timestamp,
      retryable: this.retryable,
      stack: this.stack,
      originalError: this.originalError ? {
        message: this.originalError.message,
        stack: this.originalError.stack
      } : undefined
    }
  }
}

/**
 * Authentication-related errors
 */
export class AuthError extends AppError {
  constructor(
    message: string,
    userMessage: string = 'Authentication failed. Please try signing in again.',
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(message, 'AUTH_ERROR', 'high', userMessage, context, originalError, false)
    this.name = 'AuthError'
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends AppError {
  constructor(
    message: string,
    userMessage: string = 'Network error. Please check your connection and try again.',
    context: ErrorContext = {},
    originalError?: Error,
    retryable: boolean = true
  ) {
    super(message, 'NETWORK_ERROR', 'medium', userMessage, context, originalError, retryable)
    this.name = 'NetworkError'
  }
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    userMessage: string,
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(message, 'VALIDATION_ERROR', 'low', userMessage, context, originalError, false)
    this.name = 'ValidationError'
  }
}

/**
 * Workout generation errors
 */
export class WorkoutGenerationError extends AppError {
  constructor(
    message: string,
    userMessage: string = 'Failed to generate workout. Please try again.',
    context: ErrorContext = {},
    originalError?: Error,
    retryable: boolean = true
  ) {
    super(message, 'WORKOUT_GENERATION_ERROR', 'high', userMessage, context, originalError, retryable)
    this.name = 'WorkoutGenerationError'
  }
}

/**
 * Subscription-related errors
 */
export class SubscriptionError extends AppError {
  constructor(
    message: string,
    userMessage: string = 'Subscription error. Please contact support.',
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(message, 'SUBSCRIPTION_ERROR', 'high', userMessage, context, originalError, false)
    this.name = 'SubscriptionError'
  }
}

/**
 * Firestore database errors
 */
export class FirestoreError extends AppError {
  constructor(
    message: string,
    userMessage: string = 'Database error. Please try again.',
    context: ErrorContext = {},
    originalError?: Error,
    retryable: boolean = true
  ) {
    super(message, 'FIRESTORE_ERROR', 'high', userMessage, context, originalError, retryable)
    this.name = 'FirestoreError'
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends AppError {
  constructor(
    message: string,
    userMessage: string = 'Request timed out. Please try again.',
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(message, 'TIMEOUT_ERROR', 'medium', userMessage, context, originalError, true)
    this.name = 'TimeoutError'
  }
}

/**
 * Offline errors
 */
export class OfflineError extends AppError {
  constructor(
    message: string,
    userMessage: string = 'You are offline. Please check your connection.',
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(message, 'OFFLINE_ERROR', 'medium', userMessage, context, originalError, true)
    this.name = 'OfflineError'
  }
}

/**
 * Error handler utility
 */
export class ErrorHandler {
  /**
   * Handle and log an error
   */
  static handle(error: Error | AppError, context: ErrorContext = {}): AppError {
    // Convert to AppError if needed
    const appError = error instanceof AppError 
      ? error 
      : new AppError(
          error.message,
          'UNKNOWN_ERROR',
          'medium',
          'An unexpected error occurred. Please try again.',
          context,
          error,
          true
        )

    // Log to console in development
    if (import.meta.env.MODE === 'development') {
      console.error('[ErrorHandler]', appError.toJSON())
    }

    // Log to application logger
    logger.error(appError.message, appError.originalError || appError, {
      code: appError.code,
      severity: appError.severity,
      context: appError.context
    })

    // Report to Sentry for high/critical errors
    if (appError.severity === 'high' || appError.severity === 'critical') {
      Sentry.captureException(appError.originalError || appError, {
        level: appError.severity === 'critical' ? 'fatal' : 'error',
        tags: {
          errorCode: appError.code,
          component: appError.context.component,
          action: appError.context.action
        },
        extra: {
          userMessage: appError.userMessage,
          context: appError.context,
          retryable: appError.retryable
        }
      })
    }

    return appError
  }

  /**
   * Convert unknown error to AppError
   */
  static normalize(error: unknown, context: ErrorContext = {}): AppError {
    if (error instanceof AppError) {
      return error
    }

    if (error instanceof Error) {
      return ErrorHandler.handle(error, context)
    }

    // Handle string errors
    if (typeof error === 'string') {
      return new AppError(
        error,
        'UNKNOWN_ERROR',
        'medium',
        error,
        context,
        undefined,
        true
      )
    }

    // Handle unknown error types
    return new AppError(
      'An unknown error occurred',
      'UNKNOWN_ERROR',
      'medium',
      'An unexpected error occurred. Please try again.',
      context,
      undefined,
      true
    )
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: Error | AppError): boolean {
    if (error instanceof AppError) {
      return error.retryable
    }

    // Network errors are generally retryable
    if (error.name === 'NetworkError' || error.name === 'TimeoutError') {
      return true
    }

    // Check for specific error messages
    const retryableMessages = [
      'network',
      'timeout',
      'connection',
      'unavailable',
      'ECONNREFUSED',
      'ETIMEDOUT'
    ]

    return retryableMessages.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    )
  }
}

/**
 * Retry utility with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    baseDelay?: number
    maxDelay?: number
    onRetry?: (attempt: number, error: Error) => void
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    onRetry
  } = options

  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Don't retry if not retryable
      if (!ErrorHandler.isRetryable(lastError)) {
        throw lastError
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
      
      // Call retry callback
      onRetry?.(attempt + 1, lastError)

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

