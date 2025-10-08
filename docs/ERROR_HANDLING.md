# Error Handling Guide

## Overview

NeuraFit uses a standardized error handling system that provides:
- Consistent error logging and monitoring
- User-friendly error messages
- Automatic error recovery with retry logic
- Error boundaries for React components
- Type-safe error handling

## Quick Start

### Async Operations

```typescript
import { handleAsyncError } from '@/utils/errorHandler'

async function fetchWorkouts() {
  const { data, error } = await handleAsyncError(
    async () => await getWorkouts(userId),
    { component: 'Dashboard', action: 'fetchWorkouts' }
  )

  if (error) {
    // Error is already logged and reported
    setError(error.userMessage)
    return
  }

  // Use data safely
  setWorkouts(data)
}
```

### Sync Operations

```typescript
import { handleSyncError } from '@/utils/errorHandler'

function parseWorkoutData(input: string) {
  const { data, error } = handleSyncError(
    () => JSON.parse(input),
    { component: 'WorkoutParser', action: 'parseJSON' }
  )

  if (error) {
    return null
  }

  return data
}
```

### Retry with Backoff

```typescript
import { retryOperation } from '@/utils/errorHandler'

async function fetchWithRetry() {
  const data = await retryOperation(
    async () => await fetch('/api/workouts'),
    {
      maxRetries: 3,
      initialDelay: 1000,
      context: { component: 'API', action: 'fetchWorkouts' }
    }
  )

  return data
}
```

## Error State Management

### React Component Pattern

```typescript
import { createErrorState, setErrorState, clearErrorState } from '@/utils/errorHandler'

function MyComponent() {
  const [errorState, setErrorStateValue] = useState(createErrorState())

  async function loadData() {
    setErrorStateValue(clearErrorState())

    const { data, error } = await handleAsyncError(
      async () => await fetchData(),
      { component: 'MyComponent', action: 'loadData' }
    )

    if (error) {
      setErrorStateValue(setErrorState(error))
      return
    }

    // Use data
  }

  if (errorState.isError) {
    return <ErrorDisplay message={errorState.errorMessage} />
  }

  return <div>Content</div>
}
```

## Error Boundaries

### Page-Level Error Boundary

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary level="page">
      <YourPage />
    </ErrorBoundary>
  )
}
```

### Component-Level Error Boundary

```typescript
<ErrorBoundary level="component">
  <ComplexComponent />
</ErrorBoundary>
```

## Error Types

### AppError

The base error class with:
- `code`: Error code (AUTH_ERROR, NETWORK_ERROR, etc.)
- `severity`: Error severity (low, medium, high, critical)
- `userMessage`: User-friendly message
- `retryable`: Whether the operation can be retried
- `context`: Additional context (component, action, metadata)

### Creating Custom Errors

```typescript
import { AppError } from '@/lib/errors'

throw new AppError(
  'Failed to generate workout',
  'WORKOUT_GENERATION_ERROR',
  'high',
  'We couldn\'t generate your workout. Please try again.',
  { component: 'Generate', action: 'generateWorkout' },
  originalError,
  true // retryable
)
```

## Best Practices

### 1. Always Provide Context

```typescript
// ✅ Good
const { data, error } = await handleAsyncError(
  operation,
  { component: 'Dashboard', action: 'fetchWorkouts', userId }
)

// ❌ Bad
const { data, error } = await handleAsyncError(operation)
```

### 2. Use Appropriate Error Severity

- **low**: Minor issues, doesn't affect user flow
- **medium**: Affects single feature, user can continue
- **high**: Affects major feature, user experience degraded
- **critical**: App-breaking, requires immediate attention

### 3. Provide User-Friendly Messages

```typescript
// ✅ Good
'We couldn\'t load your workouts. Please check your connection and try again.'

// ❌ Bad
'Error: ECONNREFUSED 127.0.0.1:3000'
```

### 4. Use Error Boundaries for UI Protection

Wrap major sections in error boundaries to prevent full app crashes:

```typescript
<ErrorBoundary level="page">
  <Dashboard />
</ErrorBoundary>
```

### 5. Log Non-Critical Errors

For errors that shouldn't interrupt user flow:

```typescript
import { logError } from '@/utils/errorHandler'

try {
  trackAnalytics(event)
} catch (err) {
  logError(err, { component: 'Analytics', action: 'track' })
  // Continue execution
}
```

## Error Monitoring

All errors are automatically:
1. Logged to console (development)
2. Sent to application logger
3. Reported to Sentry (high/critical severity)
4. Stored in error state (if applicable)

## Testing Error Handling

```typescript
import { handleAsyncError } from '@/utils/errorHandler'

describe('Error Handling', () => {
  it('should handle errors gracefully', async () => {
    const { data, error } = await handleAsyncError(
      async () => { throw new Error('Test error') },
      { component: 'Test' }
    )

    expect(data).toBeNull()
    expect(error).toBeDefined()
    expect(error?.userMessage).toBeTruthy()
  })
})
```

## Common Patterns

### Form Submission

```typescript
async function handleSubmit(values: FormValues) {
  setSubmitting(true)
  setErrorStateValue(clearErrorState())

  const { data, error } = await handleAsyncError(
    async () => await submitForm(values),
    { component: 'ProfileForm', action: 'submit' }
  )

  setSubmitting(false)

  if (error) {
    setErrorStateValue(setErrorState(error))
    return
  }

  // Success handling
  navigate('/success')
}
```

### Data Fetching with Loading State

```typescript
async function loadWorkouts() {
  setLoading(true)
  setErrorStateValue(clearErrorState())

  const { data, error } = await handleAsyncError(
    async () => await fetchWorkouts(userId),
    { component: 'History', action: 'loadWorkouts' }
  )

  setLoading(false)

  if (error) {
    setErrorStateValue(setErrorState(error))
    return
  }

  setWorkouts(data)
}
```

### Optimistic Updates with Rollback

```typescript
async function updateWorkout(id: string, updates: Partial<Workout>) {
  // Optimistic update
  const previousWorkout = workout
  setWorkout({ ...workout, ...updates })

  const { error } = await handleAsyncError(
    async () => await saveWorkout(id, updates),
    { component: 'WorkoutDetail', action: 'update' }
  )

  if (error) {
    // Rollback on error
    setWorkout(previousWorkout)
    setErrorStateValue(setErrorState(error))
  }
}
```

