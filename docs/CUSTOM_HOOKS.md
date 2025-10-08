# Custom Hooks Guide

## Overview

NeuraFit uses custom hooks to extract and reuse common logic across components. This improves code organization, testability, and maintainability.

## Available Hooks

### Workout Management

#### `useWorkoutState`

Manages workout state including exercise index, set number, and start time.

```typescript
import { useWorkoutState } from '@/hooks/useWorkoutState'

function ExerciseComponent() {
  const {
    exerciseIndex,
    setExerciseIndex,
    setNumber,
    setSetNumber,
    startTime,
  } = useWorkoutState()

  // Use workout state
  console.log(`Exercise ${exerciseIndex + 1}, Set ${setNumber}`)
}
```

**Returns:**
- `exerciseIndex`: Current exercise index (0-based)
- `setExerciseIndex`: Function to update exercise index
- `setNumber`: Current set number (1-based)
- `setSetNumber`: Function to update set number
- `startTime`: Workout start timestamp

**Features:**
- Automatically loads start time from sessionStorage
- Handles return from rest screen
- Persists state across navigation

---

#### `useWorkoutPlan`

Loads and manages workout plan data from sessionStorage.

```typescript
import { useWorkoutPlan } from '@/hooks/useWorkoutPlan'

function WorkoutComponent() {
  const { plan, exercises, loading, error } = useWorkoutPlan()

  if (loading) return <Loading />
  if (error) return <Error message={error} />

  return (
    <div>
      {exercises.map((exercise, i) => (
        <ExerciseCard key={i} exercise={exercise} />
      ))}
    </div>
  )
}
```

**Returns:**
- `plan`: Full workout plan object
- `exercises`: Array of exercises
- `loading`: Loading state
- `error`: Error message if loading failed

---

#### `useWorkoutProgress`

Calculates workout progress metrics.

```typescript
import { useWorkoutProgress } from '@/hooks/useWorkoutProgress'

function ProgressBar() {
  const progress = useWorkoutProgress(
    exerciseIndex,
    setNumber,
    totalExercises,
    setsPerExercise,
    startTime
  )

  return (
    <div>
      <p>Progress: {progress.progressPercent}%</p>
      <p>Sets: {progress.completedSets}/{progress.totalSets}</p>
      <p>Time: {progress.elapsedTime}s</p>
    </div>
  )
}
```

**Parameters:**
- `exerciseIndex`: Current exercise index (0-based)
- `setNumber`: Current set number (1-based)
- `totalExercises`: Total number of exercises
- `setsPerExercise`: Sets per exercise
- `startTime`: Workout start timestamp

**Returns:**
- `progressPercent`: Overall progress (0-100)
- `completedSets`: Number of completed sets
- `totalSets`: Total number of sets
- `currentExercise`: Current exercise number (1-based)
- `totalExercises`: Total number of exercises
- `elapsedTime`: Elapsed time in seconds

---

#### `useWeightHistory`

Loads and manages weight history for an exercise.

```typescript
import { useWeightHistory } from '@/hooks/useWeightHistory'

function ExerciseCard({ exerciseName }: { exerciseName: string }) {
  const {
    weightHistory,
    recentSessions,
    loading,
    error,
  } = useWeightHistory(exerciseName)

  if (loading) return <Loading />
  if (error) return <Error message={error} />

  return (
    <div>
      <h3>Previous Weights</h3>
      {weightHistory.map((entry, i) => (
        <div key={i}>{entry.weight} lbs</div>
      ))}
    </div>
  )
}
```

**Parameters:**
- `exerciseName`: Name of the exercise

**Returns:**
- `weightHistory`: Array of weight history entries
- `recentSessions`: Array of recent workout sessions
- `loading`: Loading state
- `error`: Error message if loading failed

---

### Dashboard

#### `useDashboardStats`

Calculates dashboard statistics from workout history.

```typescript
import { useDashboardStats } from '@/hooks/useDashboardStats'

function Dashboard() {
  const [workouts, setWorkouts] = useState<WorkoutItem[]>([])
  const stats = useDashboardStats(workouts)

  return (
    <div>
      <StatCard label="Total Workouts" value={stats.totalWorkouts} />
      <StatCard label="This Week" value={stats.weeklyWorkouts} />
      <StatCard label="Consistency" value={`${stats.consistencyScore}%`} />
      <StatCard label="Streak" value={`${stats.recentStreak} days`} />
    </div>
  )
}
```

**Parameters:**
- `workouts`: Array of workout items

**Returns:**
- `totalWorkouts`: Total number of workouts
- `weeklyWorkouts`: Workouts in the last 7 days
- `consistencyScore`: Consistency score (0-100)
- `recentStreak`: Current workout streak in days

**Features:**
- Automatically memoized for performance
- Handles various timestamp formats
- Calculates streak based on consecutive days

---

### UI & Interactions

#### `useMicroInteractions`

Provides bounce and shake animations for UI feedback.

```typescript
import { useBounce, useShake } from '@/hooks/useMicroInteractions'

function Button() {
  const { bounceClass, triggerBounce } = useBounce()
  const { shakeClass, triggerShake } = useShake()

  return (
    <button
      className={`${bounceClass} ${shakeClass}`}
      onClick={() => {
        triggerBounce()
        // or triggerShake() for error feedback
      }}
    >
      Click Me
    </button>
  )
}
```

---

#### `useOnlineStatus`

Detects online/offline status.

```typescript
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

function App() {
  const isOnline = useOnlineStatus()

  return (
    <div>
      {!isOnline && <OfflineBanner />}
      <MainContent />
    </div>
  )
}
```

---

### Form Management

#### `useForm`

Comprehensive form state management with validation.

```typescript
import { useForm } from '@/hooks/useForm'

function ProfileForm() {
  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldError,
    reset,
  } = useForm({
    initialValues: {
      name: '',
      email: '',
    },
    validate: (values) => {
      const errors: Record<string, string> = {}
      if (!values.name) errors.name = 'Name is required'
      if (!values.email) errors.email = 'Email is required'
      return errors
    },
    onSubmit: async (values) => {
      await saveProfile(values)
    },
  })

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="name"
        value={values.name}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      {touched.name && errors.name && <Error>{errors.name}</Error>}
      
      <button type="submit" disabled={isSubmitting}>
        Submit
      </button>
    </form>
  )
}
```

---

## Best Practices

### 1. Use Hooks for Reusable Logic

```typescript
// ✅ Good - Extract reusable logic
function useUserData(userId: string) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchUser(userId).then(setUser).finally(() => setLoading(false))
  }, [userId])
  
  return { user, loading }
}

// ❌ Bad - Duplicate logic in components
function Component1() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { /* fetch user */ }, [])
}

function Component2() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { /* fetch user */ }, [])
}
```

### 2. Return Objects, Not Arrays

```typescript
// ✅ Good - Named returns
function useWorkoutState() {
  return { exerciseIndex, setExerciseIndex, setNumber }
}

// ❌ Bad - Positional returns (hard to remember order)
function useWorkoutState() {
  return [exerciseIndex, setExerciseIndex, setNumber]
}
```

### 3. Provide Loading and Error States

```typescript
// ✅ Good - Complete state management
function useData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  return { data, loading, error }
}

// ❌ Bad - Missing error handling
function useData() {
  const [data, setData] = useState(null)
  return { data }
}
```

### 4. Memoize Expensive Calculations

```typescript
// ✅ Good - Memoized calculation
function useDashboardStats(workouts) {
  return useMemo(() => calculateStats(workouts), [workouts])
}

// ❌ Bad - Recalculates on every render
function useDashboardStats(workouts) {
  return calculateStats(workouts)
}
```

### 5. Clean Up Side Effects

```typescript
// ✅ Good - Cleanup function
function useWebSocket(url) {
  useEffect(() => {
    const ws = new WebSocket(url)
    return () => ws.close() // Cleanup
  }, [url])
}

// ❌ Bad - No cleanup
function useWebSocket(url) {
  useEffect(() => {
    const ws = new WebSocket(url)
  }, [url])
}
```

## Testing Custom Hooks

```typescript
import { renderHook, act } from '@testing-library/react'
import { useWorkoutState } from '@/hooks/useWorkoutState'

describe('useWorkoutState', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useWorkoutState())
    
    expect(result.current.exerciseIndex).toBe(0)
    expect(result.current.setNumber).toBe(1)
  })
  
  it('should update exercise index', () => {
    const { result } = renderHook(() => useWorkoutState())
    
    act(() => {
      result.current.setExerciseIndex(2)
    })
    
    expect(result.current.exerciseIndex).toBe(2)
  })
})
```

