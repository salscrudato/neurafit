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
