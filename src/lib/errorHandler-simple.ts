// Simplified error handler to avoid circular dependencies during initial setup
// This will be replaced with the full error handler once the app is stable

export const handleAuthError = (error: Error | unknown, context?: Record<string, unknown>) => {
  console.error('Auth error:', error, context)
}

export const handleFirestoreError = (error: Error | unknown, context?: Record<string, unknown>) => {
  console.error('Firestore error:', error, context)
}

export const handleNetworkError = (error: Error | unknown, context?: Record<string, unknown>) => {
  console.error('Network error:', error, context)
}

export const handleValidationError = (message: string, field?: string, context?: Record<string, unknown>) => {
  console.error('Validation error:', message, field, context)
}
