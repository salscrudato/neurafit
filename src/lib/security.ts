// Simplified Security Utilities
import { handleError } from './errorManager'

class SecurityManager {
  constructor() {
    this.setupBasicSecurity()
  }

  // Basic security setup
  private setupBasicSecurity(): void {
    // Only disable console in production
    if (import.meta.env.PROD) {
      console.log = () => {}
      console.info = () => {}
      console.warn = () => {}
    }
  }

  // Basic input sanitization
  public sanitizeInput(input: string): string {
    if (typeof input !== 'string') return ''

    return input
      .trim()
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
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

      // Only allow http/https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid protocol')
      }

      return parsed.toString()
    } catch {
      return '#'
    }
  }

  // Simple secure API request
  public secureApiRequest(url: string, options: RequestInit = {}): Promise<Response> {
    // Add basic security headers
    const secureOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      credentials: 'same-origin',
    }

    // Validate URL
    const sanitizedUrl = this.sanitizeURL(url)
    if (sanitizedUrl === '#') {
      return Promise.reject(new Error('Invalid URL'))
    }

    return fetch(sanitizedUrl, secureOptions)
      .catch(error => {
        handleError(error)
        throw error
      })
  }

  // Simple storage operations
  public secureSetItem(key: string, value: unknown): void {
    try {
      const sanitizedKey = this.sanitizeInput(key)
      const serializedValue = JSON.stringify(value)
      localStorage.setItem(sanitizedKey, serializedValue)
    } catch (error) {
      handleError(error)
    }
  }

  public secureGetItem<T = unknown>(key: string): T | null {
    try {
      const sanitizedKey = this.sanitizeInput(key)
      const item = localStorage.getItem(sanitizedKey)

      if (!item) return null

      return JSON.parse(item) as T
    } catch {
      return null
    }
  }
}

// Create singleton instance
const securityManager = new SecurityManager()

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
export const useSecurity = () => ({
  sanitizeInput,
  sanitizeHTML,
  sanitizeURL,
  secureApiRequest,
  secureSetItem,
  secureGetItem,
})

// Export the manager instance
export { securityManager }
