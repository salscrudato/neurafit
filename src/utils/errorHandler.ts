/**
 * Standardized Error Handler
 * 
 * Provides a consistent interface for error handling across the application.
 * Consolidates error logging, user notifications, and error recovery patterns.
 */

import { logger } from '../lib/logger'
import { ErrorHandler as LibErrorHandler, AppError } from '../lib/errors'
import type { ErrorContext } from '../lib/errors'

/**
 * Standard error handler for async operations
 * 
 * @example
 * const result = await handleAsyncError(
 *   async () => await fetchData(),
 *   { component: 'Dashboard', action: 'fetchWorkouts' }
 * )
 */
export async function handleAsyncError<T>(
  operation: () => Promise<T>,
  context: ErrorContext = {}
): Promise<{ data: T | null; error: AppError | null }> {
  try {
    const data = await operation()
    return { data, error: null }
  } catch (err) {
    const error = LibErrorHandler.handle(err as Error, context)
    return { data: null, error }
  }
}

/**
 * Standard error handler for sync operations
 * 
 * @example
 * const result = handleSyncError(
 *   () => parseData(input),
 *   { component: 'Form', action: 'validateInput' }
 * )
 */
export function handleSyncError<T>(
  operation: () => T,
  context: ErrorContext = {}
): { data: T | null; error: AppError | null } {
  try {
    const data = operation()
    return { data, error: null }
  } catch (err) {
    const error = LibErrorHandler.handle(err as Error, context)
    return { data: null, error }
  }
}

/**
 * Log error without throwing
 * Useful for non-critical errors that shouldn't interrupt user flow
 */
export function logError(error: unknown, context: ErrorContext = {}): void {
  try {
    LibErrorHandler.handle(error as Error, context)
  } catch (err) {
    // Fallback logging if error handler fails
    logger.error('Error handler failed', err as Error, context as Record<string, unknown>)
  }
}

/**
 * Assert condition and throw standardized error if false
 */
export function assertCondition(
  condition: boolean,
  message: string,
  context: ErrorContext = {}
): asserts condition {
  if (!condition) {
    const error = new AppError(
      message,
      'VALIDATION_ERROR',
      'medium',
      message,
      context,
      undefined,
      false
    )
    throw LibErrorHandler.handle(error, context)
  }
}

/**
 * Retry operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    backoffFactor?: number
    context?: ErrorContext
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    context = {}
  } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (err) {
      lastError = err as Error

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelay * Math.pow(backoffFactor, attempt), maxDelay)

      // Log retry attempt
      logger.debug(`Retrying operation (attempt ${attempt + 1}/${maxRetries})`, {
        delay,
        context
      })

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  // All retries failed
  throw LibErrorHandler.handle(lastError!, {
    ...context,
    metadata: { ...context.metadata, retriesExhausted: true, maxRetries }
  })
}

/**
 * Create error handler for React components
 * Returns a function that can be used in catch blocks
 */
export function createComponentErrorHandler(componentName: string) {
  return (error: unknown, action: string = 'unknown') => {
    return LibErrorHandler.handle(error as Error, {
      component: componentName,
      action
    })
  }
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error: unknown): string {
  if (error instanceof AppError) {
    return error.userMessage
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected error occurred. Please try again.'
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.retryable
  }

  // Network errors are typically retryable
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('fetch') ||
      message.includes('connection')
    )
  }

  return false
}

/**
 * Standard error state for React components
 */
export interface ErrorState {
  error: AppError | null
  isError: boolean
  errorMessage: string
}

/**
 * Create initial error state
 */
export function createErrorState(): ErrorState {
  return {
    error: null,
    isError: false,
    errorMessage: ''
  }
}

/**
 * Update error state with new error
 */
export function setErrorState(error: AppError): ErrorState {
  return {
    error,
    isError: true,
    errorMessage: error.userMessage
  }
}

/**
 * Clear error state
 */
export function clearErrorState(): ErrorState {
  return createErrorState()
}

