// src/lib/weightHistory.ts
import { auth, db } from './firebase'
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore'

export interface WeightHistory {
  exerciseName: string
  setNumber: number
  weight: number
  timestamp: number
  reps?: number
  date: string
}

export interface WorkoutSession {
  date: string
  exercises: {
    name: string
    sets: { weight: number | null; reps: number; completed: boolean }[]
  }[]
}

/**
 * Fetch weight history for a specific exercise from Firestore
 */
export async function fetchWeightHistory(exerciseName: string, maxSessions = 10): Promise<WeightHistory[]> {
  try {
    const uid = auth.currentUser?.uid
    if (!uid) return []

    console.log(`📊 Fetching weight history for ${exerciseName}`)
    
    const q = query(
      collection(db, 'users', uid, 'workouts'),
      orderBy('timestamp', 'desc'),
      limit(maxSessions)
    )
    
    const snap = await getDocs(q)
    const weightHistory: WeightHistory[] = []

    snap.docs.forEach(doc => {
      const data = doc.data()
      const exercises = data.exercises || []
      const timestamp = data.timestamp?.toMillis() || Date.now()
      const date = new Date(timestamp).toISOString().split('T')[0]

      exercises.forEach((exercise: any) => {
        if (exercise.name === exerciseName && exercise.weights) {
          Object.entries(exercise.weights).forEach(([setNumber, weight]) => {
            if (weight && typeof weight === 'number' && weight > 0) {
              weightHistory.push({
                exerciseName: exercise.name,
                setNumber: parseInt(setNumber),
                weight: weight,
                timestamp,
                reps: exercise.reps,
                date
              })
            }
          })
        }
      })
    })

    // Sort by timestamp descending (most recent first)
    weightHistory.sort((a, b) => b.timestamp - a.timestamp)
    
    console.log(`📈 Found ${weightHistory.length} weight entries for ${exerciseName}`)
    return weightHistory

  } catch (error) {
    console.error('❌ Error fetching weight history:', error)
    return []
  }
}

/**
 * Fetch recent workout sessions for progressive overload analysis
 */
export async function fetchRecentSessions(maxSessions = 8): Promise<WorkoutSession[]> {
  try {
    const uid = auth.currentUser?.uid
    if (!uid) return []

    console.log('📊 Fetching recent workout sessions')
    
    const q = query(
      collection(db, 'users', uid, 'workouts'),
      orderBy('timestamp', 'desc'),
      limit(maxSessions)
    )
    
    const snap = await getDocs(q)
    const sessions: WorkoutSession[] = []

    snap.docs.forEach(doc => {
      const data = doc.data()
      const exercises = data.exercises || []
      const timestamp = data.timestamp?.toMillis() || Date.now()
      const date = new Date(timestamp).toISOString().split('T')[0]

      const sessionExercises = exercises.map((exercise: any) => {
        const sets = []
        const totalSets = exercise.sets || 0
        const weights = exercise.weights || {}
        const reps = typeof exercise.reps === 'number' ? exercise.reps : parseInt(exercise.reps) || 10

        // Create set data for each set
        for (let setNum = 1; setNum <= totalSets; setNum++) {
          const weight = weights[setNum]
          sets.push({
            weight: weight && typeof weight === 'number' ? weight : null,
            reps,
            completed: weight !== null // Consider set completed if weight was entered
          })
        }

        return {
          name: exercise.name,
          sets
        }
      })

      sessions.push({
        date,
        exercises: sessionExercises
      })
    })

    console.log(`📈 Found ${sessions.length} recent sessions`)
    return sessions

  } catch (error) {
    console.error('❌ Error fetching recent sessions:', error)
    return []
  }
}

/**
 * Get the last used weight for a specific exercise and set
 */
export function getLastUsedWeight(weightHistory: WeightHistory[], exerciseName: string, setNumber: number): number | null {
  const relevantWeights = weightHistory
    .filter(w => w.exerciseName === exerciseName && w.setNumber === setNumber)
    .sort((a, b) => b.timestamp - a.timestamp)

  return relevantWeights.length > 0 ? relevantWeights[0].weight : null
}

/**
 * Get progressive overload suggestion based on weight history
 */
export function getProgressiveOverloadSuggestion(
  weightHistory: WeightHistory[], 
  exerciseName: string, 
  setNumber: number
): number | null {
  const lastWeight = getLastUsedWeight(weightHistory, exerciseName, setNumber)
  
  if (!lastWeight) return null

  // Conservative progressive overload: 2.5-5 lbs increase
  const increment = lastWeight < 50 ? 2.5 : 5
  return lastWeight + increment
}

/**
 * Determine if an exercise is likely a barbell exercise for plate calculator
 */
export function isBarbellExercise(exerciseName: string): boolean {
  const barbellKeywords = [
    'squat', 'deadlift', 'bench press', 'row', 'press', 'curl',
    'barbell', 'bb ', 'overhead press', 'military press'
  ]
  
  const lowerName = exerciseName.toLowerCase()
  return barbellKeywords.some(keyword => lowerName.includes(keyword))
}

/**
 * Cache for weight history to avoid repeated API calls
 */
const weightHistoryCache = new Map<string, { data: WeightHistory[]; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function getCachedWeightHistory(exerciseName: string): Promise<WeightHistory[]> {
  const cacheKey = `${auth.currentUser?.uid}-${exerciseName}`
  const cached = weightHistoryCache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  
  const data = await fetchWeightHistory(exerciseName)
  weightHistoryCache.set(cacheKey, { data, timestamp: Date.now() })
  
  return data
}

/**
 * Clear weight history cache (useful when new workout is completed)
 */
export function clearWeightHistoryCache(): void {
  weightHistoryCache.clear()
}
