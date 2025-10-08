// Simplified validation utilities
import { handleValidationError } from './errorManager'

// Validation result interface
export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

// Email validation
export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = []

  if (!email) {
    errors.push('Email is required')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Please enter a valid email address')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Password validation
export const validatePassword = (password: string): ValidationResult => {
  const errors: string[] = []

  if (!password) {
    errors.push('Password is required')
  } else if (password.length < 6) {
    errors.push('Password must be at least 6 characters long')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// User profile validation
export const validateUserProfile = (profile: Record<string, unknown>): ValidationResult => {
  const errors: string[] = []

  // Experience validation
  if (!profile['experience']) {
    errors.push('Experience level is required')
  } else if (!['Beginner', 'Intermediate', 'Advanced', 'Expert'].includes(profile['experience'] as string)) {
    errors.push('Invalid experience level')
  }

  // Goals validation
  if (!profile['goals'] || !Array.isArray(profile['goals']) || profile['goals'].length === 0) {
    errors.push('At least one fitness goal is required')
  }

  // Personal info validation
  if (!profile['personal']) {
    errors.push('Personal information is required')
  } else {
    const { height, weight } = profile['personal'] as { height?: string | number; weight?: string | number }

    // Height can be a range string (e.g., "<5'0", "5'0–5'5", ">6'5") or a number
    if (!height) {
      errors.push('Height is required')
    } else if (typeof height === 'string') {
      // Validate it's a non-empty string (range values like "<5'0" are valid)
      if (height.trim() === '') {
        errors.push('Valid height is required')
      }
    } else if (typeof height === 'number' && (isNaN(height) || height <= 0)) {
      errors.push('Valid height is required')
    }

    // Weight can be a range string (e.g., "<120lb", "120–149", "240+lb") or a number
    if (!weight) {
      errors.push('Weight is required')
    } else if (typeof weight === 'string') {
      // Validate it's a non-empty string (range values like "<120lb" are valid)
      if (weight.trim() === '') {
        errors.push('Valid weight is required')
      }
    } else if (typeof weight === 'number' && (isNaN(weight) || weight <= 0)) {
      errors.push('Valid weight is required')
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Weight entry validation
export const validateWeight = (weight: unknown): ValidationResult => {
  const errors: string[] = []

  if (weight === null || weight === undefined) {
    // Null/undefined is valid (represents skipped set)
    return { isValid: true, errors }
  }

  const weightNum = parseFloat(weight as string)

  if (isNaN(weightNum)) {
    errors.push('Weight must be a valid number')
  } else if (weightNum < 0) {
    errors.push('Weight cannot be negative')
  } else if (weightNum > 1000) {
    errors.push('Weight seems unreasonably high')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Form validation helper
export const validateForm = (data: Record<string, unknown>, rules: Record<string, (_value: unknown) => ValidationResult>): ValidationResult => {
  const allErrors: string[] = []

  for (const [field, validator] of Object.entries(rules)) {
    const result = validator(data[field])

    if (!result.isValid) {
      allErrors.push(...result.errors.map(error => `${field}: ${error}`))
    }
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  }
}

// Validation middleware for API calls
export const withValidation = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  validator: (_data: unknown) => ValidationResult,
  dataExtractor?: (...args: Parameters<T>) => unknown
): T => {
  return ((...args: Parameters<T>) => {
    const data = dataExtractor ? dataExtractor(...args) : args[0]
    const validation = validator(data)

    if (!validation.isValid) {
      const errorMessage = validation.errors.join(', ')
      handleValidationError(new Error(errorMessage))
      throw new Error(errorMessage)
    }

    return fn(...args)
  }) as T
}
