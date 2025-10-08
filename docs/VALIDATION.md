# Data Validation Guide

## Overview

NeuraFit uses Zod for runtime validation of data fetched from Firestore and external sources. This ensures type safety and data integrity throughout the application.

## Quick Start

### Basic Validation

```typescript
import { UserProfileSchema, safeValidate } from '@/schemas'

// Fetch data from Firestore
const docSnap = await getDoc(userDocRef)
const rawData = docSnap.data()

// Validate with safe parsing (returns null on error)
const profile = safeValidate(UserProfileSchema, rawData, 'UserProfile')

if (!profile) {
  // Handle validation error
  console.error('Invalid profile data')
  return
}

// profile is now typed and validated
console.log(profile.experience) // ✅ Type-safe
```

### Strict Validation

```typescript
import { strictValidate, WorkoutItemSchema } from '@/schemas'

try {
  // Throws error if validation fails
  const workout = strictValidate(
    WorkoutItemSchema,
    rawData,
    'WorkoutItem'
  )
  
  // Use validated data
  processWorkout(workout)
} catch (error) {
  // Handle validation error
  console.error('Validation failed:', error.message)
}
```

## Available Schemas

### User Profile

```typescript
import { UserProfileSchema, type UserProfile } from '@/schemas'

const profile = safeValidate(UserProfileSchema, data)
```

**Schema:**
- `experience`: 'Beginner' | 'Intermediate' | 'Advanced'
- `goals`: string[] (min 1)
- `equipment`: string[] (min 1)
- `personal`: { sex, height, weight, age? }
- `injuries?`: { list: string[], notes?: string }
- `createdAt?`: number
- `updatedAt?`: number

### Subscription

```typescript
import { UserSubscriptionSchema, type UserSubscription } from '@/schemas'

const subscription = safeValidate(UserSubscriptionSchema, data)
```

**Schema:**
- `customerId`: string
- `status`: 'active' | 'canceled' | 'trialing' | etc.
- `workoutCount`: number
- `freeWorkoutsUsed`: number
- `freeWorkoutLimit`: number
- Plus optional fields for paid subscriptions

### Workout

```typescript
import { WorkoutItemSchema, type WorkoutItem } from '@/schemas'

const workout = safeValidate(WorkoutItemSchema, data)
```

**Schema:**
- `id`: string
- `workoutType`: string
- `duration`: number (1-7200 seconds)
- `timestamp`: Date | Firestore Timestamp | string
- `exercises?`: Exercise[]
- `completionRate?`: number (0-100)
- `completed?`: boolean
- `rpe?`: number (1-10)

## Validation Helpers

### Safe Validate

Returns validated data or null if validation fails. Logs errors to console.

```typescript
const data = safeValidate(schema, rawData, 'Context')
if (!data) {
  // Handle error
}
```

### Strict Validate

Throws error if validation fails. Use when validation failure should stop execution.

```typescript
try {
  const data = strictValidate(schema, rawData, 'Context')
} catch (error) {
  // Handle error
}
```

### Validate Partial

Validates partial data (useful for updates).

```typescript
const partialData = validatePartial(UserProfileSchema, updates, 'ProfileUpdate')
```

### Is Valid

Check if data matches schema without throwing or logging.

```typescript
if (isValid(UserProfileSchema, data)) {
  // Data is valid
}
```

### Get Validation Errors

Extract user-friendly error messages from Zod errors.

```typescript
try {
  schema.parse(data)
} catch (error) {
  if (error instanceof z.ZodError) {
    const messages = getValidationErrors(error)
    // ['experience: Required', 'goals: Array must contain at least 1 element(s)']
  }
}
```

## Firestore Integration

### Validate Document Data

```typescript
import { validateFirestoreDoc, UserProfileSchema } from '@/schemas'

const docSnap = await getDoc(userDocRef)
if (!docSnap.exists()) {
  return null
}

const profile = validateFirestoreDoc(
  UserProfileSchema,
  docSnap.data(),
  docSnap.id,
  'UserProfile'
)

if (!profile) {
  // Handle invalid data
  return null
}

// Use validated profile
```

### Transform Firestore Timestamps

```typescript
import { transformFirestoreTimestamp } from '@/schemas'

const timestamp = transformFirestoreTimestamp(firestoreTimestamp)
// Returns Date, string, or null
```

## Best Practices

### 1. Always Validate External Data

```typescript
// ✅ Good - Validate Firestore data
const profile = safeValidate(UserProfileSchema, docSnap.data())

// ❌ Bad - Trust external data
const profile = docSnap.data() as UserProfile
```

### 2. Use Appropriate Validation Method

```typescript
// ✅ Safe validation for optional operations
const profile = safeValidate(UserProfileSchema, data)
if (profile) {
  updateUI(profile)
}

// ✅ Strict validation for critical operations
try {
  const profile = strictValidate(UserProfileSchema, data)
  await saveToDatabase(profile)
} catch (error) {
  showError('Invalid profile data')
}
```

### 3. Provide Context

```typescript
// ✅ Good - Provides context for debugging
const profile = safeValidate(
  UserProfileSchema,
  data,
  'Dashboard.fetchProfile'
)

// ❌ Bad - No context
const profile = safeValidate(UserProfileSchema, data)
```

### 4. Handle Validation Errors Gracefully

```typescript
const profile = safeValidate(UserProfileSchema, data, 'Profile')

if (!profile) {
  // Log error (already done by safeValidate)
  // Show user-friendly message
  setError('Unable to load profile. Please try again.')
  // Provide fallback or recovery option
  return
}

// Continue with validated data
```

## Common Patterns

### Fetching and Validating User Profile

```typescript
async function fetchUserProfile(userId: string) {
  try {
    const docRef = doc(db, 'users', userId)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      return null
    }
    
    const profile = validateFirestoreDoc(
      UserProfileSchema,
      docSnap.data(),
      docSnap.id,
      'fetchUserProfile'
    )
    
    return profile
  } catch (error) {
    console.error('Error fetching profile:', error)
    return null
  }
}
```

### Validating Workout History

```typescript
async function fetchWorkoutHistory(userId: string) {
  const q = query(
    collection(db, 'users', userId, 'workouts'),
    orderBy('timestamp', 'desc'),
    limit(20)
  )
  
  const snapshot = await getDocs(q)
  
  const workouts = snapshot.docs
    .map(doc => validateFirestoreDoc(
      WorkoutItemSchema,
      doc.data(),
      doc.id,
      'WorkoutHistory'
    ))
    .filter((workout): workout is WorkoutItem => workout !== null)
  
  return workouts
}
```

### Updating with Partial Validation

```typescript
async function updateProfile(userId: string, updates: Partial<UserProfile>) {
  // Validate partial updates
  const validUpdates = validatePartial(
    UserProfileSchema,
    updates,
    'updateProfile'
  )
  
  if (!validUpdates) {
    throw new Error('Invalid profile updates')
  }
  
  await updateDoc(doc(db, 'users', userId), {
    ...validUpdates,
    updatedAt: Date.now()
  })
}
```

## Testing Validation

```typescript
import { UserProfileSchema, safeValidate } from '@/schemas'

describe('Profile Validation', () => {
  it('should validate complete profile', () => {
    const validProfile = {
      experience: 'Intermediate',
      goals: ['Build Muscle'],
      equipment: ['Dumbbells'],
      personal: {
        sex: 'Male',
        height: '6\'0"',
        weight: '180'
      }
    }
    
    const result = safeValidate(UserProfileSchema, validProfile)
    expect(result).not.toBeNull()
    expect(result?.experience).toBe('Intermediate')
  })
  
  it('should reject invalid profile', () => {
    const invalidProfile = {
      experience: 'Expert', // Invalid value
      goals: [], // Empty array
      equipment: ['Dumbbells'],
      personal: {
        sex: 'Male',
        height: '6\'0"',
        weight: '180'
      }
    }
    
    const result = safeValidate(UserProfileSchema, invalidProfile)
    expect(result).toBeNull()
  })
})
```

## Migration Guide

### Before (No Validation)

```typescript
const docSnap = await getDoc(userDocRef)
const profile = docSnap.data() as UserProfile
// ❌ No runtime validation
```

### After (With Validation)

```typescript
const docSnap = await getDoc(userDocRef)
const profile = validateFirestoreDoc(
  UserProfileSchema,
  docSnap.data(),
  docSnap.id,
  'UserProfile'
)
// ✅ Runtime validation ensures data integrity
```

