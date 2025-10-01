// Security utilities and enhancements
// Provides security hardening, input sanitization, and protection mechanisms

import { ErrorType } from './errorHandler.tsx'
import { errorHandler } from './error-handler-utils'

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyGenerator?: (_context: Record<string, unknown>) => string
}

// Content Security Policy configuration
interface CSPConfig {
  defaultSrc: string[]
  scriptSrc: string[]
  styleSrc: string[]
  imgSrc: string[]
  connectSrc: string[]
  fontSrc: string[]
  objectSrc: string[]
  mediaSrc: string[]
  frameSrc: string[]
}

class SecurityManager {
  private rateLimitStore = new Map<string, { count: number; resetTime: number }>()
  private readonly CSP_NONCE = this.generateNonce()

  constructor() {
    this.setupSecurityHeaders()
    this.setupInputSanitization()
    this.setupRateLimiting()
  }

  // Generate cryptographically secure nonce
  private generateNonce(): string {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  // Setup Content Security Policy
  private setupSecurityHeaders(): void {
    if (typeof document === 'undefined') return

    const cspConfig: CSPConfig = {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Vite in development
        "'unsafe-eval'", // Required for development
        "https://www.googletagmanager.com",
        "https://www.google-analytics.com",
        "https://js.stripe.com",
        `'nonce-${this.CSP_NONCE}'`
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Tailwind
        "https://fonts.googleapis.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https:",
        "https://www.google-analytics.com"
      ],
      connectSrc: [
        "'self'",
        "https://neurafit-ai-2025.firebaseapp.com",
        "https://neurafit-ai-2025.web.app",
        "https://firestore.googleapis.com",
        "https://identitytoolkit.googleapis.com",
        "https://securetoken.googleapis.com",
        "https://api.stripe.com",
        "https://www.google-analytics.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com"
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: [
        "'self'",
        "https://js.stripe.com"
      ]
    }

    // Only apply CSP in production
    if (process.env.NODE_ENV === 'production') {
      const cspString = Object.entries(cspConfig)
        .map(([directive, sources]) => `${this.camelToKebab(directive)} ${sources.join(' ')}`)
        .join('; ')

      const meta = document.createElement('meta')
      meta.httpEquiv = 'Content-Security-Policy'
      meta.content = cspString
      document.head.appendChild(meta)
    }
  }

  // Setup input sanitization
  private setupInputSanitization(): void {
    // Override console methods in production to prevent information leakage
    if (process.env.NODE_ENV === 'production') {
      const originalConsole = { ...console }
      
      console.log = () => {}
      console.info = () => {}
      console.warn = () => {}
      console.error = (message: unknown, ...args: unknown[]) => {
        // Only log sanitized error messages
        if (typeof message === 'string') {
          originalConsole.error(this.sanitizeErrorMessage(message), ...args)
        }
      }
    }
  }

  // Setup client-side rate limiting
  private setupRateLimiting(): void {
    // Clean up expired rate limit entries every minute
    setInterval(() => {
      const now = Date.now()
      for (const [key, data] of this.rateLimitStore.entries()) {
        if (now > data.resetTime) {
          this.rateLimitStore.delete(key)
        }
      }
    }, 60000)
  }

  // Input sanitization methods
  public sanitizeInput(input: string): string {
    if (typeof input !== 'string') return ''
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+=/gi, '') // Remove event handlers
      .replace(/data:/gi, '') // Remove data: URLs
      .substring(0, 1000) // Limit length
  }

  public sanitizeHTML(html: string): string {
    const div = document.createElement('div')
    div.textContent = html
    return div.innerHTML
  }

  public sanitizeURL(url: string): string {
    try {
      const parsed = new URL(url)
      
      // Only allow specific protocols
      if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
        throw new Error('Invalid protocol')
      }
      
      // Block suspicious domains
      const suspiciousDomains = ['javascript', 'data', 'vbscript']
      if (suspiciousDomains.some(domain => parsed.hostname.includes(domain))) {
        throw new Error('Suspicious domain')
      }
      
      return parsed.toString()
    } catch {
      console.warn('Invalid URL sanitized:', url)
      return '#'
    }
  }

  // Error message sanitization
  public sanitizeErrorMessage(message: string): string {
    if (process.env.NODE_ENV === 'development') {
      return message
    }

    // Remove sensitive information from error messages
    return message
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
      .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD]')
      .replace(/\b[A-Za-z0-9]{20,}\b/g, '[TOKEN]')
      .replace(/password/gi, '[PASSWORD]')
      .replace(/secret/gi, '[SECRET]')
      .replace(/key/gi, '[KEY]')
      .replace(/token/gi, '[TOKEN]')
      .replace(/api[_-]?key/gi, '[API_KEY]')
      .replace(/firebase/gi, '[SERVICE]')
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]')
  }

  // Rate limiting
  public checkRateLimit(key: string, config: RateLimitConfig): boolean {
    const now = Date.now()
    const data = this.rateLimitStore.get(key)

    if (!data || now > data.resetTime) {
      // Reset or initialize
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      })
      return true
    }

    if (data.count >= config.maxRequests) {
      return false
    }

    data.count++
    return true
  }

  // API request security
  public secureApiRequest(url: string, options: RequestInit = {}): Promise<Response> {
    // Add security headers
    const secureOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...options.headers
      },
      // Ensure credentials are handled securely
      credentials: 'same-origin',
      // Set referrer policy
      referrerPolicy: 'strict-origin-when-cross-origin'
    }

    // Validate URL
    const sanitizedUrl = this.sanitizeURL(url)
    if (sanitizedUrl === '#') {
      return Promise.reject(new Error('Invalid URL'))
    }

    // Apply rate limiting
    const rateLimitKey = `api:${new URL(sanitizedUrl).pathname}`
    if (!this.checkRateLimit(rateLimitKey, {
      windowMs: 60000, // 1 minute
      maxRequests: 60 // 60 requests per minute
    })) {
      return Promise.reject(new Error('Rate limit exceeded'))
    }

    return fetch(sanitizedUrl, secureOptions)
      .catch(error => {
        // Sanitize error before throwing
        const sanitizedError = new Error(this.sanitizeErrorMessage(error.message))
        errorHandler.handle(sanitizedError, ErrorType.NETWORK)
        throw sanitizedError
      })
  }

  // Secure local storage operations
  public secureSetItem(key: string, value: unknown): void {
    try {
      // Sanitize key
      const sanitizedKey = this.sanitizeInput(key)
      
      // Encrypt sensitive data (in a real implementation, use proper encryption)
      const serializedValue = JSON.stringify(value)
      
      // Check storage quota
      if (serializedValue.length > 5 * 1024 * 1024) { // 5MB limit
        throw new Error('Data too large for storage')
      }
      
      localStorage.setItem(sanitizedKey, serializedValue)
    } catch (error) {
      console.warn('Secure storage failed:', error)
      errorHandler.handle(error as Error, ErrorType.UNKNOWN)
    }
  }

  public secureGetItem<T = unknown>(key: string): T | null {
    try {
      const sanitizedKey = this.sanitizeInput(key)
      const item = localStorage.getItem(sanitizedKey)
      
      if (!item) return null
      
      return JSON.parse(item) as T
    } catch (error) {
      console.warn('Secure retrieval failed:', error)
      return null
    }
  }

  // Secure form validation
  public validateFormData(data: Record<string, unknown>, rules: Record<string, (_value: unknown) => boolean>): boolean {
    try {
      for (const [field, validator] of Object.entries(rules)) {
        const value = data[field]
        
        // Sanitize input
        if (typeof value === 'string') {
          data[field] = this.sanitizeInput(value)
        }
        
        // Validate
        if (!validator(data[field])) {
          throw new Error(`Validation failed for field: ${field}`)
        }
      }
      
      return true
    } catch (error) {
      errorHandler.handle(error as Error, ErrorType.VALIDATION)
      return false
    }
  }

  // Security monitoring
  public reportSecurityEvent(event: string, details: Record<string, unknown>): void {
    const securityEvent = {
      event,
      details: this.sanitizeErrorMessage(JSON.stringify(details)),
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    // In production, this would send to a security monitoring service
    console.warn('Security event:', securityEvent)
  }

  // Utility methods
  private camelToKebab(str: string): string {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase()
  }

  // Get security headers for API requests
  public getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    }
  }
}

// Create singleton instance
export const securityManager = new SecurityManager()

// Convenience functions
export const sanitizeInput = (input: string) => securityManager.sanitizeInput(input)
export const sanitizeHTML = (html: string) => securityManager.sanitizeHTML(html)
export const sanitizeURL = (url: string) => securityManager.sanitizeURL(url)
export const secureApiRequest = (url: string, options?: RequestInit) => 
  securityManager.secureApiRequest(url, options)
export const secureSetItem = (key: string, value: unknown) =>
  securityManager.secureSetItem(key, value)
export const secureGetItem = (key: string) => securityManager.secureGetItem(key)

// React hook for security utilities
export const useSecurity = () => {
  return {
    sanitizeInput,
    sanitizeHTML,
    sanitizeURL,
    secureApiRequest,
    secureSetItem,
    secureGetItem,
    validateForm: securityManager.validateFormData.bind(securityManager),
    reportSecurityEvent: securityManager.reportSecurityEvent.bind(securityManager)
  }
}
