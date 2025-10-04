// Simplified Error Management System
import type { AppError } from '../store'
import { useAppStore } from '../store'

// Simple error types
export const ErrorType = {
  AUTH: 'auth',
  NETWORK: 'network',
  VALIDATION: 'validation',
  UNKNOWN: 'unknown',
} as const

export type ErrorTypeValue = (typeof ErrorType)[keyof typeof ErrorType]

// User-friendly error messages
const ERROR_MESSAGES: Record<string, string> = {
  // Auth errors
  'auth/user-not-found': 'No account found with this email address',
  'auth/wrong-password': 'Incorrect password',
  'auth/email-already-in-use': 'An account with this email already exists',
  'auth/weak-password': 'Password must be at least 6 characters',
  'auth/invalid-email': 'Please enter a valid email address',
  'auth/too-many-requests': 'Too many failed attempts. Please try again later',
  'auth/network-request-failed': 'Network error. Please check your connection',

  // Network errors
  'network-error': 'Network connection failed. Please check your internet connection',
  'timeout': 'Request timed out. Please try again',
  'server-error': 'Server error. Please try again later',

  // Payment errors
  'subscription-required': 'You need an active subscription to access this feature',
  'payment-failed': 'Payment failed. Please check your payment method',

  // Generic fallback
  'unknown-error': 'An unexpected error occurred. Please try again',
}

class SimpleErrorManager {
  // Main error handling method
  handle(error: unknown, type: ErrorTypeValue = ErrorType.UNKNOWN): void {
    const normalizedError = this.normalizeError(error)
    const errorCode = this.extractErrorCode(normalizedError)
    const userMessage = this.getUserMessage(errorCode, normalizedError.message)

    // Create app error
    const appError: AppError = {
      id: `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      message: userMessage,
      timestamp: Date.now(),
      resolved: false,
      details: {
        code: errorCode,
        originalMessage: normalizedError.message,
        url: window.location.href,
        timestamp: Date.now(),
      },
    }

    // Add to store
    const store = useAppStore.getState()
    store.addError(appError)

    // Log in development
    if (import.meta.env.DEV) {
      console.error('Error:', {
        type,
        code: errorCode,
        message: normalizedError.message,
      })
    }
  }

  // Specific error handlers
  handleAuth = (error: unknown): void => this.handle(error, ErrorType.AUTH)
  handleNetwork = (error: unknown): void => this.handle(error, ErrorType.NETWORK)
  handleValidation = (error: unknown): void => this.handle(error, ErrorType.VALIDATION)

  // Async wrapper with error handling
  async wrapAsync<T>(
    fn: () => Promise<T>,
    errorType: ErrorTypeValue = ErrorType.UNKNOWN
  ): Promise<T | null> {
    try {
      return await fn()
    } catch (error) {
      this.handle(error, errorType)
      return null
    }
  }

  // Utility methods
  getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message
    if (typeof error === 'string') return error
    return 'Unknown error'
  }

  getErrorCode(error: unknown): string | null {
    if (error && typeof error === 'object' && 'code' in error) {
      return String(error.code)
    }
    return null
  }

  // Private helper methods
  private normalizeError(error: unknown): Error {
    if (error instanceof Error) return error
    if (typeof error === 'string') return new Error(error)
    return new Error('Unknown error')
  }

  private extractErrorCode(error: Error): string | undefined {
    if ('code' in error) return (error as { code: string }).code
    if (error.name === 'AbortError') return 'timeout'
    if (error.message.includes('fetch')) return 'network-error'
    if (error.message.includes('402') || error.message.includes('Payment Required')) return 'subscription-required'
    return undefined
  }

  private getUserMessage(code: string | undefined, originalMessage: string): string {
    if (code && ERROR_MESSAGES[code]) {
      return ERROR_MESSAGES[code]
    }

    // In production, use generic message for unknown errors
    if (import.meta.env.PROD) {
      return ERROR_MESSAGES['unknown-error'] || 'An unexpected error occurred'
    }

    // In development, show original message (sanitized)
    return originalMessage
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
      .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD]')
  }
}

// Create singleton instance
const errorManager = new SimpleErrorManager()

// Hook for React components
export const useErrorManager = () => ({
  handleError: errorManager.handle.bind(errorManager),
  handleAuth: errorManager.handleAuth,
  handleNetwork: errorManager.handleNetwork,
  handleValidation: errorManager.handleValidation,
  wrapAsync: errorManager.wrapAsync.bind(errorManager),
  getErrorMessage: errorManager.getErrorMessage.bind(errorManager),
  getErrorCode: errorManager.getErrorCode.bind(errorManager),
})

// Convenience functions
export const handleError = errorManager.handle.bind(errorManager)
export const handleAuthError = errorManager.handleAuth
export const handleNetworkError = errorManager.handleNetwork
export const handleValidationError = errorManager.handleValidation

// Export the manager instance
export { errorManager }
