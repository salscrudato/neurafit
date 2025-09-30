// Standardized error handling system
// Provides consistent error handling patterns and utilities across the app

import React from 'react'
import type { AppError } from '../store'

// Error types and categories
export const ErrorType = {
  AUTH: 'auth',
  NETWORK: 'network',
  VALIDATION: 'validation',
  UNKNOWN: 'unknown'
} as const

export type ErrorTypeValue = typeof ErrorType[keyof typeof ErrorType]

export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const

export type ErrorSeverityValue = typeof ErrorSeverity[keyof typeof ErrorSeverity]

// Error interfaces
export interface ErrorContext {
  userId?: string
  action?: string
  component?: string
  field?: string
  metadata?: Record<string, unknown>
}

export interface ErrorDetails {
  code?: string
  originalError?: Error
  context?: ErrorContext
  severity?: ErrorSeverityValue
  recoverable?: boolean
  retryable?: boolean
}

export interface ErrorHandlerOptions {
  showToUser?: boolean
  logToConsole?: boolean
  reportToService?: boolean
  autoRetry?: boolean
  maxRetries?: number
  retryDelay?: number
}

// Sanitized error messages for production
const SANITIZED_MESSAGES: Record<string, string> = {
  // Auth errors
  'auth/user-not-found': 'No account found with this email address',
  'auth/wrong-password': 'Incorrect password',
  'auth/email-already-in-use': 'An account with this email already exists',
  'auth/weak-password': 'Password must be at least 6 characters',
  'auth/invalid-email': 'Please enter a valid email address',
  'auth/too-many-requests': 'Too many failed attempts. Please try again later',
  'auth/network-request-failed': 'Network error. Please check your connection',
  'auth/popup-blocked': 'Popup was blocked. Please allow popups and try again',
  'auth/popup-closed-by-user': 'Sign-in was cancelled',
  
  // Firestore errors
  'permission-denied': 'You do not have permission to perform this action',
  'not-found': 'The requested data was not found',
  'already-exists': 'This data already exists',
  'resource-exhausted': 'Service is temporarily unavailable. Please try again',
  'deadline-exceeded': 'Request timed out. Please try again',
  'unavailable': 'Service is temporarily unavailable',
  
  // Network errors
  'network-error': 'Network connection error. Please check your internet connection',
  'timeout': 'Request timed out. Please try again',
  'server-error': 'Server error. Please try again later',
  
  // Validation errors
  'validation-error': 'Please check your input and try again',
  'invalid-data': 'Invalid data provided',
  
  // Generic fallbacks
  'unknown-error': 'An unexpected error occurred. Please try again'
}

class ErrorHandler {
  private retryAttempts = new Map<string, number>()
  private readonly MAX_RETRY_ATTEMPTS = 3
  private readonly RETRY_DELAY = 1000 // 1 second

  /**
   * Handle an error with consistent processing
   */
  handle(
    error: Error | string,
    type: ErrorTypeValue = ErrorType.UNKNOWN,
    details: ErrorDetails = {},
    options: ErrorHandlerOptions = {}
  ): void {
    const errorMessage = typeof error === 'string' ? error : error.message
    const errorCode = this.extractErrorCode(error)
    
    // Create standardized error object
    const appError: Omit<AppError, 'id' | 'timestamp' | 'resolved'> = {
      type,
      message: this.sanitizeErrorMessage(errorMessage, errorCode),
      details: {
        ...details,
        code: errorCode,
        severity: details.severity || this.determineSeverity(type, errorCode),
        originalMessage: errorMessage,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now()
      }
    }

    // Add to store (if available)
    if (typeof window !== 'undefined' && (window as unknown as { __NEURAFIT_STORE__?: unknown }).__NEURAFIT_STORE__) {
      const store = (window as unknown as { __NEURAFIT_STORE__: { getState: () => { addError: (_error: AppError) => void } } }).__NEURAFIT_STORE__
      const fullAppError: AppError = {
        id: `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: Date.now(),
        resolved: false,
        ...appError
      }
      store.getState().addError(fullAppError)
    }

    // Log to console in development
    if (options.logToConsole !== false && process.env.NODE_ENV === 'development') {
      console.error('ErrorHandler:', {
        type,
        message: errorMessage,
        details,
        originalError: error
      })
    }

    // Report to monitoring service in production
    if (options.reportToService !== false && process.env.NODE_ENV === 'production') {
      const completeError: AppError = {
        ...appError,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        resolved: false
      }
      this.reportToMonitoringService(completeError, error)
    }

    // Handle auto-retry for retryable errors
    if (options.autoRetry && details.retryable && details.context?.action) {
      this.handleAutoRetry(details.context.action, () => {
        // Retry logic would be implemented by the caller
        console.log('Auto-retry not implemented for:', details.context?.action)
      }, options)
    }
  }

  /**
   * Handle Firebase Auth errors specifically
   */
  handleAuthError(error: Error | { code?: string; message?: string } | unknown, context?: ErrorContext): void {
    const errorCode = (error as { code?: string })?.code || 'unknown-auth-error'

    // Convert unknown error to Error type for handle method
    const errorToHandle = error instanceof Error ? error : new Error(String(error))

    this.handle(errorToHandle, ErrorType.AUTH, {
      code: errorCode,
      context,
      severity: this.getAuthErrorSeverity(errorCode),
      recoverable: this.isAuthErrorRecoverable(errorCode),
      retryable: this.isAuthErrorRetryable(errorCode)
    })
  }

  /**
   * Handle Firebase Firestore errors specifically
   */
  handleFirestoreError(error: Error | { code?: string; message?: string } | unknown, context?: ErrorContext): void {
    const errorCode = (error as { code?: string })?.code || 'unknown-firestore-error'

    // Convert unknown error to Error type for handle method
    const errorToHandle = error instanceof Error ? error : new Error(String(error))

    this.handle(errorToHandle, ErrorType.NETWORK, {
      code: errorCode,
      context,
      severity: this.getFirestoreErrorSeverity(errorCode),
      recoverable: true,
      retryable: this.isFirestoreErrorRetryable(errorCode)
    })
  }

  /**
   * Handle network/fetch errors
   */
  handleNetworkError(error: Error | { name?: string; message?: string } | unknown, context?: ErrorContext): void {
    const errorObj = error as { name?: string; message?: string }
    const isTimeout = errorObj.name === 'AbortError' || errorObj.message?.includes('timeout')
    const isNetworkError = !navigator.onLine || errorObj.message?.includes('network')

    // Convert unknown error to Error type for handle method
    const errorToHandle = error instanceof Error ? error : new Error(String(error))

    this.handle(errorToHandle, ErrorType.NETWORK, {
      code: isTimeout ? 'timeout' : isNetworkError ? 'network-error' : 'server-error',
      context,
      severity: ErrorSeverity.MEDIUM,
      recoverable: true,
      retryable: true
    })
  }

  /**
   * Handle validation errors
   */
  handleValidationError(message: string, field?: string, context?: ErrorContext): void {
    this.handle(message, ErrorType.VALIDATION, {
      code: 'validation-error',
      context: {
        ...context,
        field
      },
      severity: ErrorSeverity.LOW,
      recoverable: true,
      retryable: false
    })
  }

  /**
   * Create an async error handler wrapper
   */
  wrapAsync<T extends (..._args: unknown[]) => Promise<unknown>>(
    fn: T,
    errorType: ErrorTypeValue = ErrorType.UNKNOWN,
    context?: ErrorContext
  ): T {
    return (async (...args: Parameters<T>) => {
      try {
        return await fn(...args)
      } catch (error) {
        this.handle(error as Error, errorType, { context })
        throw error // Re-throw for caller to handle
      }
    }) as T
  }

  /**
   * Create a sync error handler wrapper
   */
  wrapSync<T extends (..._args: unknown[]) => unknown>(
    fn: T,
    errorType: ErrorTypeValue = ErrorType.UNKNOWN,
    context?: ErrorContext
  ): T {
    return ((...args: Parameters<T>) => {
      try {
        return fn(...args)
      } catch (error) {
        this.handle(error as Error, errorType, { context })
        throw error // Re-throw for caller to handle
      }
    }) as T
  }

  /**
   * Retry mechanism for failed operations
   */
  async retry<T>(
    operation: () => Promise<T>,
    maxAttempts = this.MAX_RETRY_ATTEMPTS,
    delay = this.RETRY_DELAY,
    backoff = true
  ): Promise<T> {
    let lastError: Error
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxAttempts) {
          break
        }
        
        // Calculate delay with exponential backoff
        const currentDelay = backoff ? delay * Math.pow(2, attempt - 1) : delay
        await new Promise(resolve => setTimeout(resolve, currentDelay))
      }
    }
    
    throw lastError!
  }

  // Private helper methods
  private extractErrorCode(error: Error | string): string {
    if (typeof error === 'string') return 'string-error'
    
    // Firebase errors
    if ('code' in error) return (error as { code: string }).code
    
    // Network errors
    if (error.name === 'AbortError') return 'timeout'
    if (error.message.includes('fetch')) return 'network-error'
    
    return 'unknown-error'
  }

  private sanitizeErrorMessage(message: string, code?: string): string {
    // In production, use sanitized messages
    if (process.env.NODE_ENV === 'production') {
      return SANITIZED_MESSAGES[code || ''] || SANITIZED_MESSAGES['unknown-error']
    }
    
    // In development, show original message but remove sensitive info
    return message
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
      .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD]')
      .replace(/\b[A-Za-z0-9]{20,}\b/g, '[TOKEN]')
  }

  private determineSeverity(type: ErrorTypeValue, code?: string): ErrorSeverityValue {
    // Critical errors
    if (type === ErrorType.AUTH && code?.includes('permission-denied')) {
      return ErrorSeverity.CRITICAL
    }
    
    // High severity errors
    if (code?.includes('server-error')) {
      return ErrorSeverity.HIGH
    }

    // Medium severity errors
    if (type === ErrorType.NETWORK) {
      return ErrorSeverity.MEDIUM
    }

    // Low severity errors
    if (type === ErrorType.VALIDATION) {
      return ErrorSeverity.LOW
    }
    
    return ErrorSeverity.MEDIUM
  }

  private getAuthErrorSeverity(code: string): ErrorSeverityValue {
    const highSeverityAuthErrors = [
      'auth/user-disabled',
      'auth/account-exists-with-different-credential'
    ]
    
    const lowSeverityAuthErrors = [
      'auth/popup-closed-by-user',
      'auth/cancelled-popup-request'
    ]
    
    if (highSeverityAuthErrors.includes(code)) return ErrorSeverity.HIGH
    if (lowSeverityAuthErrors.includes(code)) return ErrorSeverity.LOW
    
    return ErrorSeverity.MEDIUM
  }

  private getFirestoreErrorSeverity(code: string): ErrorSeverityValue {
    const highSeverityFirestoreErrors = [
      'permission-denied',
      'unauthenticated'
    ]
    
    const lowSeverityFirestoreErrors = [
      'not-found'
    ]
    
    if (highSeverityFirestoreErrors.includes(code)) return ErrorSeverity.HIGH
    if (lowSeverityFirestoreErrors.includes(code)) return ErrorSeverity.LOW
    
    return ErrorSeverity.MEDIUM
  }

  private isAuthErrorRecoverable(code: string): boolean {
    const unrecoverableAuthErrors = [
      'auth/user-disabled',
      'auth/user-not-found'
    ]
    
    return !unrecoverableAuthErrors.includes(code)
  }

  private isAuthErrorRetryable(code: string): boolean {
    const retryableAuthErrors = [
      'auth/network-request-failed',
      'auth/timeout'
    ]
    
    return retryableAuthErrors.includes(code)
  }

  private isFirestoreErrorRetryable(code: string): boolean {
    const retryableFirestoreErrors = [
      'unavailable',
      'deadline-exceeded',
      'resource-exhausted'
    ]
    
    return retryableFirestoreErrors.includes(code)
  }

  private handleAutoRetry(
    actionKey: string,
    retryFn: () => void,
    options: ErrorHandlerOptions
  ): void {
    const attempts = this.retryAttempts.get(actionKey) || 0
    const maxRetries = options.maxRetries || this.MAX_RETRY_ATTEMPTS
    
    if (attempts < maxRetries) {
      this.retryAttempts.set(actionKey, attempts + 1)
      
      setTimeout(() => {
        retryFn()
      }, options.retryDelay || this.RETRY_DELAY)
    } else {
      this.retryAttempts.delete(actionKey)
    }
  }

  private reportToMonitoringService(error: AppError, originalError: Error | string): void {
    // In production, this would send to a monitoring service like Sentry
    // For now, we'll just log it
    console.error('Error reported to monitoring service:', {
      error,
      originalError,
      timestamp: Date.now()
    })
  }
}

// Create singleton instance
export const errorHandler = new ErrorHandler()

// Convenience functions for common error types
export const handleAuthError = (error: Error | { code?: string; message?: string } | unknown, context?: ErrorContext) =>
  errorHandler.handleAuthError(error, context)

export const handleFirestoreError = (error: Error | { code?: string; message?: string } | unknown, context?: ErrorContext) =>
  errorHandler.handleFirestoreError(error, context)

export const handleNetworkError = (error: Error | { name?: string; message?: string } | unknown, context?: ErrorContext) =>
  errorHandler.handleNetworkError(error, context)

export const handleValidationError = (message: string, field?: string, context?: ErrorContext) => 
  errorHandler.handleValidationError(message, field, context)

// Higher-order component for error boundary integration
export const withErrorHandler = <P extends object>(
  Component: React.ComponentType<P>,
  errorType: ErrorTypeValue = ErrorType.UNKNOWN,
  context?: ErrorContext
) => {
  return (props: P) => {
    try {
      return <Component {...props} />
    } catch (error) {
      errorHandler.handle(error as Error, errorType, { context })
      throw error // Let error boundary handle it
    }
  }
}

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
    retry: errorHandler.retry.bind(errorHandler)
  }
}
