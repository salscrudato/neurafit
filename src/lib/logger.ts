/**
 * Centralized logging utility for NeuraFit
 * 
 * Features:
 * - Environment-aware logging (dev only)
 * - Sentry integration for errors
 * - Type-safe logging methods
 * - Performance tracking
 * - Structured logging
 */

import * as Sentry from '@sentry/react'

// Check if we're in development mode
const isDevelopment = import.meta.env.DEV
const isProduction = import.meta.env.PROD

/**
 * Log levels
 */
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const

type LogLevelType = typeof LogLevel[keyof typeof LogLevel]

/**
 * Logger configuration
 */
interface LoggerConfig {
  enableConsole: boolean
  enableSentry: boolean
  minLevel: LogLevelType
}

const config: LoggerConfig = {
  enableConsole: isDevelopment,
  enableSentry: isProduction,
  minLevel: isDevelopment ? LogLevel.DEBUG : LogLevel.WARN,
}

/**
 * Format log message with timestamp and context
 */
function formatMessage(level: LogLevelType, message: string, context?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString()
  const contextStr = context ? ` ${JSON.stringify(context)}` : ''
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
}

/**
 * Logger class
 */
class Logger {
  /**
   * Debug logging - development only
   */
  debug(message: string, context?: Record<string, unknown>): void {
    if (!config.enableConsole) return
    
    if (isDevelopment) {
      console.debug(formatMessage(LogLevel.DEBUG, message, context))
    }
  }

  /**
   * Info logging - development only
   */
  info(message: string, context?: Record<string, unknown>): void {
    if (!config.enableConsole) return
    
    if (isDevelopment) {
      console.info(formatMessage(LogLevel.INFO, message, context))
    }
  }

  /**
   * Warning logging - development + Sentry in production
   */
  warn(message: string, context?: Record<string, unknown>): void {
    if (config.enableConsole && isDevelopment) {
      console.warn(formatMessage(LogLevel.WARN, message, context))
    }

    if (config.enableSentry && isProduction) {
      Sentry.captureMessage(message, {
        level: 'warning',
        extra: context,
      })
    }
  }

  /**
   * Error logging - development + Sentry in production
   */
  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    if (config.enableConsole && isDevelopment) {
      console.error(formatMessage(LogLevel.ERROR, message, context), error)
    }

    if (config.enableSentry) {
      if (error instanceof Error) {
        Sentry.captureException(error, {
          extra: { message, ...context },
        })
      } else {
        Sentry.captureMessage(message, {
          level: 'error',
          extra: { error, ...context },
        })
      }
    }
  }

  /**
   * Log Firebase initialization - silent in production
   */
  firebase(message: string, context?: Record<string, unknown>): void {
    if (isDevelopment) {
      console.log(`🔥 ${message}`, context || '')
    }
  }

  /**
   * Log performance metrics
   */
  performance(metric: string, duration: number, context?: Record<string, unknown>): void {
    if (isDevelopment) {
      console.log(`⚡ ${metric}: ${duration}ms`, context || '')
    }

    // Send to Sentry performance monitoring in production
    if (isProduction) {
      Sentry.addBreadcrumb({
        category: 'performance',
        message: metric,
        level: 'info',
        data: {
          duration,
          ...context,
        },
      })
    }
  }

  /**
   * Log user actions for debugging
   */
  action(action: string, context?: Record<string, unknown>): void {
    if (isDevelopment) {
      console.log(`👤 Action: ${action}`, context || '')
    }

    // Add breadcrumb for Sentry
    Sentry.addBreadcrumb({
      category: 'user-action',
      message: action,
      level: 'info',
      data: context,
    })
  }

  /**
   * Log API calls
   */
  api(method: string, endpoint: string, status?: number, context?: Record<string, unknown>): void {
    if (isDevelopment) {
      const statusEmoji = status && status >= 200 && status < 300 ? '✅' : '❌'
      console.log(`${statusEmoji} API ${method} ${endpoint}`, { status, ...context })
    }

    Sentry.addBreadcrumb({
      category: 'api',
      message: `${method} ${endpoint}`,
      level: status && status >= 400 ? 'error' : 'info',
      data: {
        method,
        endpoint,
        status,
        ...context,
      },
    })
  }

  /**
   * Group logs (development only)
   */
  group(label: string, callback: () => void): void {
    if (!isDevelopment) {
      callback()
      return
    }

    console.group(label)
    try {
      callback()
    } finally {
      console.groupEnd()
    }
  }

  /**
   * Time a function execution
   */
  async time<T>(label: string, fn: () => Promise<T> | T): Promise<T> {
    const startTime = globalThis.performance.now()

    try {
      const result = await fn()
      const duration = globalThis.performance.now() - startTime

      this.performance(label, duration)

      return result
    } catch (error) {
      const duration = globalThis.performance.now() - startTime
      this.error(`${label} failed after ${duration}ms`, error as Error)
      throw error
    }
  }

  /**
   * Assert condition - development only
   */
  assert(condition: boolean, message: string): void {
    if (!isDevelopment) return
    
    if (!condition) {
      console.error(`❌ Assertion failed: ${message}`)
      throw new Error(`Assertion failed: ${message}`)
    }
  }

  /**
   * Table logging - development only
   */
  table(data: unknown): void {
    if (isDevelopment && console.table) {
      console.table(data)
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Export convenience methods
export const { debug, info, warn, error, firebase, performance, action, api, group, time, assert, table } = logger

// Default export
export default logger

