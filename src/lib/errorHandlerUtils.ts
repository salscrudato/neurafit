/**
 * Error Handler Utilities
 * Extracted from errorHandler.tsx to fix Fast Refresh warnings
 */

// Network error handler
export const handleNetworkError = (error: Error): void => {
  console.error('Network error:', error)
  // Add network-specific error handling logic here
}

// Authentication error handler
export const handleAuthError = (error: Error): void => {
  console.error('Authentication error:', error)
  // Add auth-specific error handling logic here
}

// Validation error handler
export const handleValidationError = (error: Error): void => {
  console.error('Validation error:', error)
  // Add validation-specific error handling logic here
}

// Generic error handler
export const handleGenericError = (error: Error): void => {
  console.error('Generic error:', error)
  // Add generic error handling logic here
}

// Firebase error handler
export const handleFirebaseError = (error: Error): void => {
  console.error('Firebase error:', error)
  // Add Firebase-specific error handling logic here
}

// Subscription error handler
export const handleSubscriptionError = (error: Error): void => {
  console.error('Subscription error:', error)
  // Add subscription-specific error handling logic here
}

// Critical error handler
export const handleCriticalError = (error: Error): void => {
  console.error('Critical error:', error)
  // Add critical error handling logic here
}
