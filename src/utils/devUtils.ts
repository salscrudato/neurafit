// Development utilities for cleaner console output

export const isDevelopment = process.env.NODE_ENV === 'development'

// Suppress common development warnings that are not actionable
export const suppressDevWarnings = () => {
  if (!isDevelopment) return

  // Store original console methods
  const originalWarn = console.warn
  const originalLog = console.log

  // Filter out known development warnings
  console.warn = (...args) => {
    const message = args.join(' ')

    // Suppress React DevTools message
    if (message.includes('Download the React DevTools')) {
      return
    }

    // Suppress service worker registration messages in development
    if (message.includes('SW registered') || message.includes('SW registration')) {
      return
    }

    // Suppress Stripe HTTPS warning in development
    if (message.includes('You may test your Stripe.js integration over HTTP')) {
      return
    }

    // Suppress performance monitoring warnings in development
    if (message.includes('LCP exceeded budget') ||
        message.includes('FCP exceeded budget') ||
        message.includes('CLS exceeded budget') ||
        message.includes('Slow navigation detected') ||
        message.includes('Slow resource detected') ||
        message.includes('High memory usage detected') ||
        message.includes('Failed to observe') ||
        message.includes('does not exist or isn\'t supported')) {
      return
    }

    // Call original warn for other messages
    originalWarn.apply(console, args)
  }

  console.log = (...args) => {
    const message = args.join(' ')

    // Suppress service worker messages in development
    if (message.includes('SW registered') || message.includes('SW registration')) {
      return
    }

    // Suppress cache clearing messages
    if (message.includes('Clearing cache:')) {
      return
    }

    // Suppress auth state messages (keep only errors)
    if (message.includes('🔐 Auth state:') || message.includes('[HOME] HomeGate:')) {
      return
    }

    // Suppress performance monitoring messages in development
    if (message.includes('LCP exceeded budget') ||
        message.includes('FCP exceeded budget') ||
        message.includes('CLS exceeded budget') ||
        message.includes('Slow navigation detected') ||
        message.includes('Slow resource detected') ||
        message.includes('🚀 Page headers changed') ||
        message.includes('🔄 Cache update detected') ||
        message.includes('🧹 Cleared all cache storage') ||
        message.includes('🧹 Cleared browser storage') ||
        message.includes('Progress:')) {
      return
    }

    // Call original log for other messages
    originalLog.apply(console, args)
  }
}

// Development-only logging
export const devLog = (...args: unknown[]) => {
  if (isDevelopment) {
    console.log(...args)
  }
}

export const devWarn = (...args: unknown[]) => {
  if (isDevelopment) {
    console.warn(...args)
  }
}

export const devError = (...args: unknown[]) => {
  if (isDevelopment) {
    console.error(...args)
  }
}
