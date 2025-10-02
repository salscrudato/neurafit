// Standardized error handling system
// Provides consistent error handling patterns and utilities across the app


import type { AppError } from '../store';
import { useAppStore } from '../store';

// Error types and categories
export const ErrorType = {
  AUTH: 'auth',
  NETWORK: 'network',
  VALIDATION: 'validation',
  UNKNOWN: 'unknown',
} as const;

export type ErrorTypeValue = (typeof ErrorType)[keyof typeof ErrorType];

export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type ErrorSeverityValue = (typeof ErrorSeverity)[keyof typeof ErrorSeverity];

// Error interfaces
export interface ErrorContext {
  userId?: string;
  action?: string;
  component?: string;
  field?: string;
  metadata?: Record<string, unknown>;
  timestamp?: number;
  userAgent?: string;
  url?: string;
}

export interface ErrorDetails {
  code?: string;
  originalError?: Error;
  context?: ErrorContext;
  severity?: ErrorSeverityValue;
  recoverable?: boolean;
  retryable?: boolean;
}

export interface ErrorHandlerOptions {
  showToUser?: boolean;
  logToConsole?: boolean;
  reportToService?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
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
  'unknown-error': 'An unexpected error occurred. Please try again',
};

export class ErrorHandler {
  private retryAttempts = new Map<string, number>();
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  /**
   * Handle an error with consistent processing
   */
  handle(
    error: unknown,
    type: ErrorTypeValue = ErrorType.UNKNOWN,
    details: ErrorDetails = {},
    options: ErrorHandlerOptions = {}
  ): void {
    const errorObj = this.normalizeError(error);
    const errorMessage = errorObj.message;
    const errorCode = this.extractErrorCode(errorObj);

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
        timestamp: Date.now(),
      },
    };

    // Add to store (if available)
    const store = useAppStore.getState();
    const fullAppError: AppError = {
      id: `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      resolved: false,
      ...appError,
    };
    store.addError(fullAppError);

    // Log to console in development
    if (options.logToConsole !== false && process.env.NODE_ENV === 'development') {
      console.error('ErrorHandler:', {
        type,
        message: errorMessage,
        details,
        originalError: error,
      });
    }

    // Report to monitoring service in production
    if (options.reportToService !== false && process.env.NODE_ENV === 'production') {
      this.reportToMonitoringService(fullAppError, errorObj);
    }

    // Handle auto-retry for retryable errors
    if (options.autoRetry && details.retryable && details.context?.action) {
      this.handleAutoRetry(details.context.action, () => {
        // Retry logic would be implemented by the caller
        console.log('Auto-retry not implemented for:', details.context?.action);
      }, options);
    }
  }

  /**
   * Handle Firebase Auth errors specifically
   */
  handleAuthError(error: unknown, context?: ErrorContext): void {
    const errorObj = this.normalizeError(error);
    const errorCode = this.extractErrorCode(errorObj) || 'unknown-auth-error';

    this.handle(errorObj, ErrorType.AUTH, {
      code: errorCode,
      context,
      severity: this.getAuthErrorSeverity(errorCode),
      recoverable: this.isAuthErrorRecoverable(errorCode),
      retryable: this.isAuthErrorRetryable(errorCode),
    });
  }

  /**
   * Handle Firebase Firestore errors specifically
   */
  handleFirestoreError(error: unknown, context?: ErrorContext): void {
    const errorObj = this.normalizeError(error);
    const errorCode = this.extractErrorCode(errorObj) || 'unknown-firestore-error';

    this.handle(errorObj, ErrorType.NETWORK, {
      code: errorCode,
      context,
      severity: this.getFirestoreErrorSeverity(errorCode),
      recoverable: true,
      retryable: this.isFirestoreErrorRetryable(errorCode),
    });
  }

  /**
   * Handle network/fetch errors
   */
  handleNetworkError(error: unknown, context?: ErrorContext): void {
    const errorObj = this.normalizeError(error);
    const isTimeout = errorObj.name === 'AbortError' || errorObj.message.includes('timeout');
    const isNetworkError = !navigator.onLine || errorObj.message.includes('network');

    this.handle(errorObj, ErrorType.NETWORK, {
      code: isTimeout ? 'timeout' : isNetworkError ? 'network-error' : 'server-error',
      context,
      severity: ErrorSeverity.MEDIUM,
      recoverable: true,
      retryable: true,
    });
  }

  /**
   * Handle validation errors
   */
  handleValidationError(message: string, field?: string, context?: ErrorContext): void {
    this.handle(message, ErrorType.VALIDATION, {
      code: 'validation-error',
      context: {
        ...context,
        field,
      },
      severity: ErrorSeverity.LOW,
      recoverable: true,
      retryable: false,
    });
  }

  /**
   * Create an async error handler wrapper
   */
  wrapAsync<T extends (..._args: unknown[]) => Promise<unknown>>(
    fn: T,
    errorType: ErrorTypeValue = ErrorType.UNKNOWN,
    context?: ErrorContext
  ): T {
    return (async (..._args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
      try {
        return (await fn(..._args)) as Awaited<ReturnType<T>>;
      } catch (error) {
        this.handle(error, errorType, { context });
        throw error; // Re-throw for caller to handle
      }
    }) as T;
  }

  /**
   * Create a sync error handler wrapper
   */
  wrapSync<T extends (..._args: unknown[]) => unknown>(
    fn: T,
    errorType: ErrorTypeValue = ErrorType.UNKNOWN,
    context?: ErrorContext
  ): T {
    return ((..._args: Parameters<T>): ReturnType<T> => {
      try {
        return fn(..._args) as ReturnType<T>;
      } catch (error) {
        this.handle(error, errorType, { context });
        throw error; // Re-throw for caller to handle
      }
    }) as T;
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
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === maxAttempts) {
          break;
        }

        // Calculate delay with exponential backoff
        const currentDelay = backoff ? delay * Math.pow(2, attempt - 1) : delay;
        await new Promise((resolve) => setTimeout(resolve, currentDelay));
      }
    }

    throw lastError;
  }

  // Private helper methods
  private normalizeError(error: unknown): Error {
    if (error instanceof Error) return error;
    if (typeof error === 'string') return new Error(error);
    return new Error('Unknown error');
  }

  private extractErrorCode(error: Error): string | undefined {
    if ('code' in error) return (error as { code: string }).code;
    if (error.name === 'AbortError') return 'timeout';
    if (error.message.includes('fetch')) return 'network-error';
    return undefined;
  }

  private sanitizeErrorMessage(message: string, code?: string): string {
    // In production, use sanitized messages
    if (process.env.NODE_ENV === 'production') {
      return SANITIZED_MESSAGES[code || 'unknown-error'] || SANITIZED_MESSAGES['unknown-error'];
    }

    // In development, show original message but remove sensitive info
    return message
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
      .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD]')
      .replace(/\b[A-Za-z0-9]{20,}\b/g, '[TOKEN]');
  }

  private determineSeverity(type: ErrorTypeValue, code?: string): ErrorSeverityValue {
    // Critical errors
    if (type === ErrorType.AUTH && code?.includes('permission-denied')) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity errors
    if (code?.includes('server-error')) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity errors
    if (type === ErrorType.NETWORK) {
      return ErrorSeverity.MEDIUM;
    }

    // Low severity errors
    if (type === ErrorType.VALIDATION) {
      return ErrorSeverity.LOW;
    }

    return ErrorSeverity.MEDIUM;
  }

  private getAuthErrorSeverity(code: string): ErrorSeverityValue {
    const highSeverityAuthErrors = ['auth/user-disabled', 'auth/account-exists-with-different-credential'];

    const lowSeverityAuthErrors = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];

    if (highSeverityAuthErrors.includes(code)) return ErrorSeverity.HIGH;
    if (lowSeverityAuthErrors.includes(code)) return ErrorSeverity.LOW;

    return ErrorSeverity.MEDIUM;
  }

  private getFirestoreErrorSeverity(code: string): ErrorSeverityValue {
    const highSeverityFirestoreErrors = ['permission-denied', 'unauthenticated'];

    const lowSeverityFirestoreErrors = ['not-found'];

    if (highSeverityFirestoreErrors.includes(code)) return ErrorSeverity.HIGH;
    if (lowSeverityFirestoreErrors.includes(code)) return ErrorSeverity.LOW;

    return ErrorSeverity.MEDIUM;
  }

  private isAuthErrorRecoverable(code: string): boolean {
    const unrecoverableAuthErrors = ['auth/user-disabled', 'auth/user-not-found'];

    return !unrecoverableAuthErrors.includes(code);
  }

  private isAuthErrorRetryable(code: string): boolean {
    const retryableAuthErrors = ['auth/network-request-failed', 'auth/timeout'];

    return retryableAuthErrors.includes(code);
  }

  private isFirestoreErrorRetryable(code: string): boolean {
    const retryableFirestoreErrors = ['unavailable', 'deadline-exceeded', 'resource-exhausted'];

    return retryableFirestoreErrors.includes(code);
  }

  private handleAutoRetry(actionKey: string, retryFn: () => void, options: ErrorHandlerOptions): void {
    const attempts = this.retryAttempts.get(actionKey) || 0;
    const maxRetries = options.maxRetries || this.MAX_RETRY_ATTEMPTS;

    if (attempts < maxRetries) {
      this.retryAttempts.set(actionKey, attempts + 1);

      setTimeout(() => {
        retryFn();
      }, options.retryDelay || this.RETRY_DELAY);
    } else {
      this.retryAttempts.delete(actionKey);
    }
  }

  private reportToMonitoringService(error: AppError, originalError: Error): void {
    // In production, this would send to a monitoring service like Sentry
    // For now, we'll just log it
    console.error('Error reported to monitoring service:', {
      error,
      originalError,
      timestamp: Date.now(),
    });
  }
}

// Singleton instance moved to errorHandlerHooks.ts to fix Fast Refresh warnings

// Convenience functions for common error types - moved to separate file to fix Fast Refresh warnings
// Import from errorHandlerUtils.ts instead

// Hooks and utilities moved to errorHandlerHooks.ts to fix Fast Refresh warnings