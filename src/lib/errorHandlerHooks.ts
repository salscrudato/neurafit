/**
 * Error Handler Hooks and Utilities
 * Extracted from errorHandler.tsx to fix Fast Refresh warnings
 */

import { ErrorHandler } from './errorHandler'

// Create singleton instance
export const errorHandler = new ErrorHandler()

// Hook for using error handler in components
export const useErrorHandler = () => {
  return {
    handleError: errorHandler.handle.bind(errorHandler),
    handleAuthError: errorHandler.handleAuthError.bind(errorHandler),
    handleFirestoreError: errorHandler.handleFirestoreError.bind(errorHandler),
    handleNetworkError: errorHandler.handleNetworkError.bind(errorHandler),
    handleValidationError: errorHandler.handleValidationError.bind(errorHandler),
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
             error.message.includes('timeout') ||
             error.message.includes('connection')
    }
    return false
  },

  isAuthError: (error: unknown): boolean => {
    if (error instanceof Error) {
      return error.message.includes('auth') ||
             error.message.includes('permission') ||
             error.message.includes('unauthorized')
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

  getErrorMessage: (error: unknown): string => {
    if (error instanceof Error) {
      return error.message
    }
    if (typeof error === 'string') {
      return error
    }
    return 'An unknown error occurred'
  },

  getErrorCode: (error: unknown): string | null => {
    if (error && typeof error === 'object' && 'code' in error) {
      return String(error.code)
    }
    return null
  }
}
