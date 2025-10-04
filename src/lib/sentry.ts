/**
 * Sentry Error Tracking Configuration
 * 
 * Configures Sentry for error tracking and performance monitoring.
 */

import * as Sentry from '@sentry/react';
import { isProduction, isDevelopment } from './env';

/**
 * Initialize Sentry
 * 
 * Call this once at app startup (in main.tsx)
 */
export function initSentry() {
  // Only initialize in production or if explicitly enabled in development
  const enableSentry = isProduction || import.meta.env['VITE_ENABLE_SENTRY'] === 'true';

  if (!enableSentry) {
    if (isDevelopment) {
      console.log('🔍 Sentry disabled in development');
    }
    return;
  }

  const dsn = import.meta.env['VITE_SENTRY_DSN'];

  if (!dsn) {
    console.warn('⚠️ Sentry DSN not configured. Set VITE_SENTRY_DSN environment variable.');
    return;
  }

  Sentry.init({
    dsn,
    environment: isProduction ? 'production' : 'development',

    // Performance Monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
    ],

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: isProduction ? 0.1 : 1.0,

    // Set sample rate for error events
    sampleRate: 1.0,

    // Release tracking
    release: import.meta.env['VITE_APP_VERSION'] || '1.0.0',

    // Before send hook to filter/modify events
    beforeSend(event, hint) {
      // Filter out certain errors
      const error = hint.originalException;

      // Don't send network errors in development
      if (isDevelopment && error instanceof Error) {
        if (error.message.includes('fetch') || error.message.includes('network')) {
          return null;
        }
      }

      // Filter out Firebase permission errors (these are expected)
      if (error instanceof Error && error.message.includes('permission-denied')) {
        return null;
      }

      // Sanitize sensitive data
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'chrome-extension://',
      'moz-extension://',
      // Network errors
      'NetworkError',
      'Failed to fetch',
      'Load failed',
      // ResizeObserver errors (benign)
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
    ],

    // Don't report errors from certain URLs
    denyUrls: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],
  });

  if (isDevelopment) {
    console.log('✅ Sentry initialized');
  }
}

/**
 * Capture an exception manually
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message manually
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: { id: string; email?: string; username?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

/**
 * Set custom context
 */
export function setContext(name: string, context: Record<string, unknown>) {
  Sentry.setContext(name, context);
}

/**
 * Start a performance transaction (span)
 */
export function startTransaction(name: string, op: string) {
  return Sentry.startSpan({
    name,
    op,
  }, (span) => span);
}

/**
 * Wrap a component with Sentry error boundary
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

/**
 * Sentry profiler for React components
 */
export const SentryProfiler = Sentry.Profiler;

