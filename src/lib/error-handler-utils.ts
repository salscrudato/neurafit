/**
 * Error Handler Utilities
 * Shared utilities and hooks for error handling
 */

import { ErrorHandler, type ErrorContext } from './errorHandler'

// Create singleton instance
export const errorHandler = new ErrorHandler()

// Convenience functions for common error types
export const handleAuthError = (error: unknown, context?: ErrorContext) =>
  errorHandler.handleAuthError(error, context)

export const handleFirestoreError = (error: unknown, context?: ErrorContext) =>
  errorHandler.handleFirestoreError(error, context)

export const handleNetworkError = (error: unknown, context?: ErrorContext) =>
  errorHandler.handleNetworkError(error, context)

export const handleValidationError = (message: string, field?: string, context?: ErrorContext) =>
  errorHandler.handleValidationError(message, field, context)

// Hook for using error handler in components
export const useErrorHandler = () => {
  return {
    handleError: errorHandler.handle.bind(errorHandler),
    handleAuthError,
    handleFirestoreError,
    handleNetworkError,
    handleValidationError,
    wrapAsync: errorHandler.wrapAsync.bind(errorHandler),
    wrapSync: errorHandler.wrapSync.bind(errorHandler),
    retry: errorHandler.retry.bind(errorHandler),
  }
}

// Error handling utilities
export const errorUtils = {
  isNetworkError: (error: unknown): boolean => {
    if (error instanceof Error) {
      return error.message.includes('network') || 
             error.message.includes('fetch') ||
             error.message.includes('connection')
    }
    return false
  },

  isAuthError: (error: unknown): boolean => {
    if (error instanceof Error) {
      return error.message.includes('auth') ||
             error.message.includes('unauthorized') ||
             error.message.includes('permission')
    }
    return false
  },

  isValidationError: (error: unknown): boolean => {
    if (error instanceof Error) {
      return error.message.includes('validation') ||
             error.message.includes('invalid') ||
             error.message.includes('required')
    }
    return false
  },

  extractErrorMessage: (error: unknown): string => {
    if (error instanceof Error) {
      return error.message
    }
    if (typeof error === 'string') {
      return error
    }
    return 'An unknown error occurred'
  },

  createErrorContext: (
    component?: string,
    action?: string,
    userId?: string,
    metadata?: Record<string, unknown>
  ): ErrorContext => ({
    component,
    action,
    userId,
    timestamp: Date.now(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    metadata
  })
}

// Error retry configuration
export const RETRY_CONFIG = {
  DEFAULT_MAX_ATTEMPTS: 3,
  DEFAULT_DELAY: 1000,
  EXPONENTIAL_BACKOFF: true,
  MAX_DELAY: 10000,
  
  // Specific retry configs for different error types
  NETWORK_ERROR: {
    maxAttempts: 5,
    delay: 2000,
    exponentialBackoff: true
  },
  
  AUTH_ERROR: {
    maxAttempts: 2,
    delay: 1000,
    exponentialBackoff: false
  },
  
  VALIDATION_ERROR: {
    maxAttempts: 1,
    delay: 0,
    exponentialBackoff: false
  }
}

// Error severity levels
export const ErrorSeverity = {
  _LOW: 'low',
  _MEDIUM: 'medium',
  _HIGH: 'high',
  _CRITICAL: 'critical'
} as const

// Error categories
export const ErrorCategory = {
  _NETWORK: 'network',
  _AUTH: 'auth',
  _VALIDATION: 'validation',
  _BUSINESS_LOGIC: 'business_logic',
  _SYSTEM: 'system',
  _USER_INPUT: 'user_input'
} as const

// Error reporting utilities
export const errorReporting = {
  shouldReport: (error: unknown, severity: typeof ErrorSeverity[keyof typeof ErrorSeverity]): boolean => {
    // Don't report low severity errors in production
    if (severity === ErrorSeverity._LOW && process.env.NODE_ENV === 'production') {
      return false
    }

    // Always report critical errors
    if (severity === ErrorSeverity._CRITICAL) {
      return true
    }
    
    // Report based on error type
    if (errorUtils.isNetworkError(error)) {
      return severity !== ErrorSeverity._LOW
    }
    
    return true
  },

  formatErrorForReporting: (
    error: unknown,
    context: ErrorContext,
    severity: typeof ErrorSeverity[keyof typeof ErrorSeverity],
    category: typeof ErrorCategory[keyof typeof ErrorCategory]
  ) => ({
    message: errorUtils.extractErrorMessage(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
    severity,
    category,
    timestamp: Date.now(),
    environment: process.env.NODE_ENV,
    version: process.env.REACT_APP_VERSION || 'unknown'
  })
}
