// Common validation utilities
// Extracts repeated validation logic into reusable functions

import { handleValidationError } from './errorHandler.tsx'

// Validation result interface
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// Email validation
export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  if (!email) {
    errors.push('Email is required')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Please enter a valid email address')
  } else if (email.length > 254) {
    errors.push('Email address is too long')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Password validation
export const validatePassword = (password: string): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  if (!password) {
    errors.push('Password is required')
  } else {
    if (password.length < 6) {
      errors.push('Password must be at least 6 characters long')
    }
    if (password.length < 8) {
      warnings.push('Consider using a password with at least 8 characters')
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])/.test(password)) {
      warnings.push('Consider including both uppercase and lowercase letters')
    }
    if (!/(?=.*\d)/.test(password)) {
      warnings.push('Consider including at least one number')
    }
    if (!/(?=.*[!@#$%^&*])/.test(password)) {
      warnings.push('Consider including at least one special character')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// User profile validation
export const validateUserProfile = (profile: Record<string, unknown>): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  // Experience validation
  if (!profile.experience) {
    errors.push('Experience level is required')
  } else if (!['Beginner', 'Intermediate', 'Advanced'].includes(profile.experience as string)) {
    errors.push('Invalid experience level')
  }

  // Goals validation
  if (!profile.goals || !Array.isArray(profile.goals) || profile.goals.length === 0) {
    errors.push('At least one fitness goal is required')
  } else if (profile.goals.length > 5) {
    warnings.push('Consider focusing on fewer goals for better results')
  }

  // Personal info validation
  if (!profile.personal) {
    errors.push('Personal information is required')
  } else {
    const { height, weight, sex } = profile.personal as { height?: number; weight?: number; sex?: string }

    if (!height || isNaN(parseFloat(height as unknown as string))) {
      errors.push('Valid height is required')
    } else {
      const heightNum = parseFloat(height as unknown as string)
      if (heightNum < 36 || heightNum > 96) { // 3-8 feet in inches
        errors.push('Height must be between 3 and 8 feet')
      }
    }

    if (!weight || isNaN(parseFloat(weight as unknown as string))) {
      errors.push('Valid weight is required')
    } else {
      const weightNum = parseFloat(weight as unknown as string)
      if (weightNum < 50 || weightNum > 1000) { // Reasonable weight range in lbs
        errors.push('Weight must be between 50 and 1000 pounds')
      }
    }

    if (sex && !['male', 'female', 'other'].includes(sex.toLowerCase())) {
      errors.push('Invalid sex selection')
    }
  }

  // Equipment validation
  if (profile.equipment && Array.isArray(profile.equipment)) {
    if (profile.equipment.length === 0) {
      warnings.push('Consider adding available equipment for better workout recommendations')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Workout data validation
export const validateWorkoutData = (workout: Record<string, unknown>): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  if (!workout) {
    errors.push('Workout data is required')
    return { isValid: false, errors, warnings }
  }

  // Basic structure validation
  if (!workout.exercises || !Array.isArray(workout.exercises)) {
    errors.push('Workout must contain exercises')
  } else {
    if (workout.exercises.length === 0) {
      errors.push('Workout must contain at least one exercise')
    } else if (workout.exercises.length > 20) {
      warnings.push('Workout contains many exercises - consider shorter sessions')
    }

    // Validate each exercise
    (workout.exercises as unknown[]).forEach((exercise: unknown, index: number) => {
      const exerciseErrors = validateExercise(exercise as Record<string, unknown>)
      if (!exerciseErrors.isValid) {
        errors.push(`Exercise ${index + 1}: ${exerciseErrors.errors.join(', ')}`)
      }
      warnings.push(...exerciseErrors.warnings.map(w => `Exercise ${index + 1}: ${w}`))
    })
  }

  // Duration validation
  if (workout.duration && (isNaN(workout.duration as number) || (workout.duration as number) < 5 || (workout.duration as number) > 180)) {
    errors.push('Workout duration must be between 5 and 180 minutes')
  }

  // Type validation
  if (workout.workoutType && typeof workout.workoutType !== 'string') {
    errors.push('Workout type must be a string')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Exercise validation
export const validateExercise = (exercise: Record<string, unknown>): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  if (!exercise) {
    errors.push('Exercise data is required')
    return { isValid: false, errors, warnings }
  }

  // Name validation
  if (!exercise.name || typeof exercise.name !== 'string') {
    errors.push('Exercise name is required')
  } else if (exercise.name.length < 2) {
    errors.push('Exercise name is too short')
  } else if (exercise.name.length > 100) {
    errors.push('Exercise name is too long')
  }

  // Sets validation
  if (!exercise.sets || isNaN(exercise.sets as number)) {
    errors.push('Valid number of sets is required')
  } else {
    const sets = parseInt(exercise.sets as string)
    if (sets < 1 || sets > 10) {
      errors.push('Sets must be between 1 and 10')
    } else if (sets > 6) {
      warnings.push('High number of sets - ensure adequate recovery')
    }
  }

  // Reps validation
  if (!exercise.reps) {
    errors.push('Reps specification is required')
  } else {
    const repsStr = exercise.reps.toString()
    // Allow formats like "8-12", "10", "30s", "1 min"
    if (!/^(\d+(-\d+)?|\d+\s*(s|sec|seconds?|min|minutes?))$/i.test(repsStr)) {
      errors.push('Invalid reps format')
    }
  }

  // Rest time validation
  if (exercise.restSeconds && (isNaN(exercise.restSeconds as number) || (exercise.restSeconds as number) < 0 || (exercise.restSeconds as number) > 600)) {
    errors.push('Rest time must be between 0 and 600 seconds')
  }

  // Safety tips validation
  if (exercise.safetyTips && Array.isArray(exercise.safetyTips)) {
    if (exercise.safetyTips.length === 0) {
      warnings.push('Consider adding safety tips for this exercise')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Weight entry validation
export const validateWeight = (weight: unknown, exerciseName?: string): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  if (weight === null || weight === undefined) {
    // Null/undefined is valid (represents skipped set)
    return { isValid: true, errors, warnings }
  }

  const weightNum = parseFloat(weight as string)
  
  if (isNaN(weightNum)) {
    errors.push('Weight must be a valid number')
  } else {
    if (weightNum < 0) {
      errors.push('Weight cannot be negative')
    } else if (weightNum > 1000) {
      errors.push('Weight seems unreasonably high')
    } else if (weightNum > 500) {
      warnings.push('Very high weight - please verify this is correct')
    }
    
    // Exercise-specific weight validation
    if (exerciseName) {
      const exerciseNameLower = exerciseName.toLowerCase()
      
      // Bodyweight exercises shouldn't have weight
      if (exerciseNameLower.includes('bodyweight') || 
          exerciseNameLower.includes('push-up') ||
          exerciseNameLower.includes('pull-up') ||
          exerciseNameLower.includes('plank')) {
        if (weightNum > 0) {
          warnings.push('This appears to be a bodyweight exercise')
        }
      }
      
      // Small muscle group exercises
      if (exerciseNameLower.includes('lateral raise') ||
          exerciseNameLower.includes('tricep') ||
          exerciseNameLower.includes('bicep curl')) {
        if (weightNum > 100) {
          warnings.push('High weight for this exercise type')
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Subscription data validation
export const validateSubscriptionData = (subscription: Record<string, unknown>): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  if (!subscription) {
    errors.push('Subscription data is required')
    return { isValid: false, errors, warnings }
  }

  // Status validation
  const validStatuses = ['active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid']
  if (!subscription.status || !validStatuses.includes(subscription.status as string)) {
    errors.push('Invalid subscription status')
  }

  // Customer ID validation
  if (!subscription.customerId || typeof subscription.customerId !== 'string') {
    errors.push('Customer ID is required')
  }

  // Workout count validation
  if (subscription.workoutCount !== undefined && 
      (isNaN(subscription.workoutCount as number) || (subscription.workoutCount as number) < 0)) {
    errors.push('Invalid workout count')
  }

  // Free workout limits validation
  if (subscription.freeWorkoutsUsed !== undefined && 
      (isNaN(subscription.freeWorkoutsUsed as number) || (subscription.freeWorkoutsUsed as number) < 0)) {
    errors.push('Invalid free workouts used count')
  }

  if (subscription.freeWorkoutLimit !== undefined && 
      (isNaN(subscription.freeWorkoutLimit as number) || (subscription.freeWorkoutLimit as number) < 0)) {
    errors.push('Invalid free workout limit')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Form validation helper
export const validateForm = (data: Record<string, unknown>, rules: Record<string, (_value: unknown) => ValidationResult>): ValidationResult => {
  const allErrors: string[] = []
  const allWarnings: string[] = []

  for (const [field, validator] of Object.entries(rules)) {
    const result = validator(data[field])
    
    if (!result.isValid) {
      allErrors.push(...result.errors.map(error => `${field}: ${error}`))
    }
    
    allWarnings.push(...result.warnings.map(warning => `${field}: ${warning}`))
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  }
}

// Validation middleware for API calls
export const withValidation = <T extends (..._args: unknown[]) => unknown>(
  fn: T,
  validator: (_data: unknown) => ValidationResult,
  dataExtractor: (..._args: Parameters<T>) => unknown = (..._args) => _args[0]
): T => {
  return ((...args: Parameters<T>) => {
    const data = dataExtractor(...args)
    const validation = validator(data)
    
    if (!validation.isValid) {
      const errorMessage = validation.errors.join(', ')
      handleValidationError(errorMessage, undefined, {
        action: fn.name,
        metadata: { validationErrors: validation.errors, validationWarnings: validation.warnings }
      })
      throw new Error(errorMessage)
    }
    
    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn('Validation warnings:', validation.warnings)
    }
    
    return fn(...args)
  }) as T
}

// Batch validation for arrays
export const validateBatch = <T>(
  items: T[],
  validator: (_item: T) => ValidationResult
): ValidationResult => {
  const allErrors: string[] = []
  const allWarnings: string[] = []

  items.forEach((item, index) => {
    const result = validator(item)
    
    if (!result.isValid) {
      allErrors.push(...result.errors.map(error => `Item ${index + 1}: ${error}`))
    }
    
    allWarnings.push(...result.warnings.map(warning => `Item ${index + 1}: ${warning}`))
  })

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  }
}
