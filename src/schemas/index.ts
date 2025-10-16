/**
 * Zod Schemas for Runtime Validation
 * 
 * Provides runtime validation for data fetched from Firestore and external sources.
 * Ensures type safety and data integrity throughout the application.
 */

import { z } from 'zod'

// ============================================================================
// User Profile Schemas
// ============================================================================

export const PersonalInfoSchema = z.object({
  sex: z.string().min(1),
  height: z.string().min(1),
  weight: z.string().min(1),
  age: z.string().optional(),
})

export const InjuryInfoSchema = z.object({
  list: z.array(z.string()),
  notes: z.string().optional(),
})

export const UserProfileSchema = z.object({
  experience: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']),
  goals: z.array(z.string()).min(1),
  equipment: z.array(z.string()).min(1),
  personal: PersonalInfoSchema,
  injuries: InjuryInfoSchema.optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
})

export type UserProfile = z.infer<typeof UserProfileSchema>

// ============================================================================
// Workout Schemas
// ============================================================================

export const ExerciseSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  sets: z.number().int().positive().max(10),
  reps: z.union([z.number().int().positive(), z.string()]),
  formTips: z.array(z.string()).optional(),
  safetyTips: z.array(z.string()).optional(),
  restSeconds: z.number().int().nonnegative().max(600),
  usesWeight: z.boolean().optional(),
  muscleGroups: z.array(z.string()).optional(),
  difficulty: z.string().optional(),
  weights: z.record(z.number(), z.number().nullable()).optional(),
})

export const WorkoutSummarySchema = z.object({
  totalVolume: z.string().optional(),
  primaryFocus: z.string().optional(),
  expectedRPE: z.string().optional(),
})

export const WorkoutPlanSchema = z.object({
  exercises: z.array(ExerciseSchema).min(1).max(50),
  workoutSummary: WorkoutSummarySchema.optional(),
})

export const WorkoutItemSchema = z.object({
  id: z.string(),
  workoutType: z.string(),
  duration: z.number().int().positive().max(7200),
  timestamp: z.union([
    z.date(),
    z.object({ toDate: z.function().returns(z.date()) }),
    z.string(),
  ]),
  exercises: z.array(ExerciseSchema).optional(),
  completionRate: z.number().min(0).max(100).optional(),
  completed: z.boolean().optional(),
  completedAt: z.number().optional(),
  feedback: z.string().optional(),
  rpe: z.number().int().min(1).max(10).optional(),
})

export type Exercise = z.infer<typeof ExerciseSchema>
export type WorkoutPlan = z.infer<typeof WorkoutPlanSchema>
export type WorkoutItem = z.infer<typeof WorkoutItemSchema>

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Safely parse and validate data with Zod schema
 * Returns validated data or null if validation fails
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): T | null {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError && import.meta.env.MODE === 'development') {
      console.error(`Validation error${context ? ` in ${context}` : ''}:`, {
        errors: error.errors,
        data,
      })
    }
    return null
  }
}

/**
 * Validate data and throw error if invalid
 * Use this when validation failure should stop execution
 */
export function strictValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = `Validation failed${context ? ` in ${context}` : ''}: ${error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')}`
      throw new Error(errorMessage)
    }
    throw error
  }
}

/**
 * Validate partial data (useful for updates)
 */
export function validatePartial<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  data: unknown,
  context?: string
): Partial<z.infer<z.ZodObject<T>>> | null {
  const partialSchema = schema.partial()
  return safeValidate(partialSchema, data, context) as Partial<z.infer<z.ZodObject<T>>> | null
}

/**
 * Check if data matches schema without throwing
 */
export function isValid<T>(schema: z.ZodSchema<T>, data: unknown): data is T {
  return schema.safeParse(data).success
}

/**
 * Get validation errors as user-friendly messages
 */
export function getValidationErrors(error: z.ZodError): string[] {
  return error.errors.map((e) => {
    const path = e.path.join('.')
    return path ? `${path}: ${e.message}` : e.message
  })
}

// ============================================================================
// Firestore Data Transformers
// ============================================================================

/**
 * Transform Firestore timestamp to Date
 */
export function transformFirestoreTimestamp(
  value: unknown
): Date | string | null {
  if (!value) return null
  
  // Firestore Timestamp with toDate method
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const toDate = (value as { toDate: () => Date }).toDate
    if (typeof toDate === 'function') {
      return toDate()
    }
  }
  
  // Already a Date
  if (value instanceof Date) {
    return value
  }
  
  // ISO string
  if (typeof value === 'string') {
    return value
  }
  
  // Unix timestamp (number)
  if (typeof value === 'number') {
    return new Date(value)
  }
  
  return null
}

/**
 * Validate and transform Firestore document data
 */
export function validateFirestoreDoc<T>(
  schema: z.ZodSchema<T>,
  docData: unknown,
  docId: string,
  context?: string
): T | null {
  if (!docData || typeof docData !== 'object') {
    if (import.meta.env.MODE === 'development') {
      console.error(`Invalid document data for ${docId}`)
    }
    return null
  }

  // Add document ID to data
  const dataWithId = { ...docData, id: docId }

  return safeValidate(schema, dataWithId, context || `Firestore doc ${docId}`)
}

