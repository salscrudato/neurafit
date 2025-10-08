/**
 * Error Handling Utilities
 * 
 * Provides comprehensive error handling utilities including custom error
 * classes, error parsing, and user-friendly error messages.
 */

import { captureException } from './sentry'
import type { ApiError } from '../types/common'

/**
 * Base application error
 */
export class AppError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly timestamp: Date

  constructor(
    message: string,
    code: string = 'APP_ERROR',
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.timestamp = new Date()

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON(): ApiError {
    return {
      code: this.code,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
    }
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  public readonly fields: Record<string, string>

  constructor(message: string, fields: Record<string, string> = {}) {
    super(message, 'VALIDATION_ERROR', 400)
    this.fields = fields
  }

  override toJSON(): ApiError {
    return {
      ...super.toJSON(),
      details: { fields: this.fields },
    }
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401)
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403)
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404)
  }
}

/**
 * Conflict error
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 'CONFLICT', 409)
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  public readonly retryAfter?: number

  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message, 'RATE_LIMIT', 429)
    this.retryAfter = retryAfter
  }

  override toJSON(): ApiError {
    return {
      ...super.toJSON(),
      details: { retryAfter: this.retryAfter },
    }
  }
}

/**
 * Network error
 */
export class NetworkError extends AppError {
  constructor(message: string = 'Network request failed') {
    super(message, 'NETWORK_ERROR', 0)
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends AppError {
  constructor(message: string = 'Request timeout') {
    super(message, 'TIMEOUT', 408)
  }
}

/**
 * Parse error response from API
 */
export function parseErrorResponse(error: unknown): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error
  }

  // Axios/Fetch error with response
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { status?: number; data?: { message?: string; code?: string } } }).response

    if (response) {
      const status = response.status || 500
      const message = response.data?.message || 'An error occurred'
      const code = response.data?.code || 'UNKNOWN_ERROR'

      switch (status) {
        case 400:
          return new ValidationError(message)
        case 401:
          return new AuthenticationError(message)
        case 403:
          return new AuthorizationError(message)
        case 404:
          return new NotFoundError(message)
        case 409:
          return new ConflictError(message)
        case 429:
          return new RateLimitError(message)
        case 408:
          return new TimeoutError(message)
        default:
          return new AppError(message, code, status)
      }
    }
  }

  // Network error
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: string }).message
    if (message.includes('network') || message.includes('fetch')) {
      return new NetworkError(message)
    }
  }

  // Generic error
  if (error instanceof Error) {
    return new AppError(error.message, 'UNKNOWN_ERROR', 500, false)
  }

  // Unknown error
  return new AppError('An unexpected error occurred', 'UNKNOWN_ERROR', 500, false)
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: unknown): string {
  const appError = parseErrorResponse(error)

  const friendlyMessages: Record<string, string> = {
    VALIDATION_ERROR: 'Please check your input and try again.',
    AUTHENTICATION_ERROR: 'Please sign in to continue.',
    AUTHORIZATION_ERROR: "You don't have permission to perform this action.",
    NOT_FOUND: 'The requested resource was not found.',
    CONFLICT: 'This resource already exists.',
    RATE_LIMIT: 'Too many requests. Please try again later.',
    NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
    TIMEOUT: 'Request timed out. Please try again.',
  }

  return friendlyMessages[appError.code] || appError.message
}

/**
 * Handle error with logging and user notification
 */
export function handleError(
  error: unknown,
  context?: string,
  notify: boolean = true
): AppError {
  const appError = parseErrorResponse(error)

  // Log to console in development
  if (import.meta.env.MODE === 'development') {
    console.error(`[Error${context ? ` - ${context}` : ''}]`, {
      message: appError.message,
      code: appError.code,
      statusCode: appError.statusCode,
      stack: appError.stack,
    })
  }

  // Send to Sentry if not operational
  if (!appError.isOperational) {
    captureException(appError, {
      tags: {
        errorCode: appError.code,
        context: context || 'unknown',
      },
    })
  }

  // Notify user if requested
  if (notify) {
    const message = getUserFriendlyMessage(appError)
    // You can integrate with your toast/notification system here
    if (import.meta.env.MODE === 'development') {
      console.log('[User Notification]', message)
    }
  }

  return appError
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    backoffFactor?: number
    shouldRetry?: (error: unknown) => boolean
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    shouldRetry = () => true,
  } = options

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry if we've exhausted attempts
      if (attempt === maxRetries) {
        break
      }

      // Don't retry if error is not retryable
      if (!shouldRetry(error)) {
        break
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelay * Math.pow(backoffFactor, attempt), maxDelay)

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      throw handleError(error, context, false)
    }
  }) as T
}

/**
 * Check if error is a specific type
 */
export function isErrorType(error: unknown, errorClass: typeof AppError): boolean {
  return error instanceof errorClass
}

/**
 * Assert that a condition is true, throw error if not
 */
export function assert(condition: boolean, message: string, ErrorClass = AppError): asserts condition {
  if (!condition) {
    throw new ErrorClass(message)
  }
}

