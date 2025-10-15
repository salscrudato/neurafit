import { useState, useEffect, useCallback } from 'react'
import { auth, db } from '../lib/firebase'
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { isAdaptivePersonalizationEnabled } from '../config/features'
import { logger } from '../lib/logger'
import type { UserProfile } from '../types/profile'

export interface RecentWorkout {
  workoutType: string
  timestamp: number
  completionRate?: number
  rpe?: number
  feedback?: 'easy' | 'right' | 'hard'
  exercises: Array<{ name: string }>
}

export interface PreloadedData {
  profile: UserProfile | null
  targetIntensity: number
  progressionNote: string
  recentWorkouts: RecentWorkout[]
  isLoading: boolean
  error: string | null
}

/**
 * Custom hook to pre-load workout generation data in the background
 * This reduces the time needed when the user clicks "Generate Workout"
 */
export function useWorkoutPreload() {
  const [preloadedData, setPreloadedData] = useState<PreloadedData>({
    profile: null,
    targetIntensity: 1.0,
    progressionNote: '',
    recentWorkouts: [],
    isLoading: true,
    error: null
  })

  // Fetch recent workouts and calculate adaptive intensity
  // OPTIMIZED: Fetch last 10 workouts, but only send 5 most recent to OpenAI
  const fetchWorkoutHistory = useCallback(async (uid: string) => {
    try {
      // Get recent workouts with feedback (fetch 10 for better metrics, send 5 to API)
      const workoutsRef = collection(db, 'users', uid, 'workouts')
      const workoutsQuery = query(workoutsRef, orderBy('timestamp', 'desc'), limit(10))
      const snapshot = await getDocs(workoutsQuery)

      if (snapshot.empty) {
        return {
          targetIntensity: 1.0,
          progressionNote: '',
          recentWorkouts: []
        }
      }

      // Build optimized workout history (only essential data)
      const recentWorkouts: RecentWorkout[] = []
      let lastFeedback: 'easy' | 'right' | 'hard' | null = null
      let recentCompletionRate = 0.8 // default
      let totalSets = 0
      let completedSets = 0

      snapshot.docs.forEach(doc => {
        const workout = doc.data()

        // Build workout history entry (optimized for token efficiency)
        const workoutEntry: RecentWorkout = {
          workoutType: workout['workoutType'] || 'Unknown',
          timestamp: workout['timestamp'] || Date.now(),
          completionRate: workout['completionRate'],
          rpe: workout['rpe'],
          feedback: workout['feedback'],
          // Only include exercise names (not full details)
          exercises: (workout['exercises'] || []).map((ex: { name?: string }) => ({
            name: ex.name || 'Unknown Exercise'
          }))
        }
        recentWorkouts.push(workoutEntry)

        // Get the most recent feedback
        if (!lastFeedback && workout['feedback']) {
          lastFeedback = workout['feedback']
        }

        // Calculate completion rate from all recent workouts
        if (workout['exercises'] && Array.isArray(workout['exercises'])) {
          workout['exercises'].forEach((exercise: { sets?: number; weights?: Record<string, number | null> }) => {
            if (exercise.weights && typeof exercise.weights === 'object') {
              const setCount = exercise.sets || Object.keys(exercise.weights).length
              totalSets += setCount

              Object.values(exercise.weights).forEach((weight: number | null) => {
                if (weight !== null) {
                  completedSets++
                }
              })
            } else {
              totalSets += exercise.sets || 0
              completedSets += exercise.sets || 0
            }
          })
        }
      })

      if (totalSets > 0) {
        recentCompletionRate = completedSets / totalSets
      }

      // Calculate target intensity based on feedback and completion rate
      let targetIntensity = 1.0
      let progressionNote = ''

      if (lastFeedback) {
        switch (lastFeedback) {
          case 'easy':
            targetIntensity = Math.min(1.4, 1.0 + 0.15) // Increase difficulty
            progressionNote = 'Increasing intensity based on your recent feedback that workouts felt easy.'
            break
          case 'hard':
            targetIntensity = Math.max(0.6, 1.0 - 0.15) // Decrease difficulty
            progressionNote = 'Reducing intensity based on your recent feedback that workouts felt challenging.'
            break
          case 'right':
            // Adjust slightly based on completion rate
            if (recentCompletionRate < 0.7) {
              targetIntensity = Math.max(0.6, 1.0 - 0.1)
              progressionNote = 'Slightly reducing intensity to improve completion rate.'
            } else if (recentCompletionRate > 0.9) {
              targetIntensity = Math.min(1.4, 1.0 + 0.1)
              progressionNote = 'Slightly increasing intensity based on excellent completion rate.'
            } else {
              progressionNote = 'Maintaining current intensity level based on your feedback.'
            }
            break
        }
      } else if (recentCompletionRate < 0.6) {
        targetIntensity = Math.max(0.6, 1.0 - 0.2)
        progressionNote = 'Reducing intensity to improve workout completion rate.'
      }

      return {
        targetIntensity,
        progressionNote,
        recentWorkouts // Return optimized workout history
      }
    } catch (error) {
      logger.error('Error fetching workout history', error)
      return {
        targetIntensity: 1.0,
        progressionNote: '',
        recentWorkouts: []
      }
    }
  }, [])

  // Pre-load all necessary data
  const preloadData = useCallback(async () => {
    const uid = auth.currentUser?.uid
    if (!uid) {
      setPreloadedData(prev => ({ ...prev, isLoading: false, error: 'No user authenticated' }))
      return
    }

    try {
      setPreloadedData(prev => ({ ...prev, isLoading: true, error: null }))

      // Run profile fetch and adaptive intensity fetch in parallel
      const [profileResult, workoutHistoryResult] = await Promise.allSettled([
        // Fetch user profile
        (async () => {
          const userDocRef = doc(db, 'users', uid)
          const snap = await getDoc(userDocRef)
          if (!snap.exists()) {
            throw new Error('Profile not found')
          }
          const profile = snap.data() as UserProfile
          // Basic completeness check
          const complete = !!(profile.experience && profile.goals?.length && profile.personal?.height && profile.personal?.weight)
          if (!complete) {
            throw new Error('Profile incomplete')
          }
          return profile
        })(),
        // Fetch workout history and adaptive intensity if enabled
        isAdaptivePersonalizationEnabled()
          ? fetchWorkoutHistory(uid)
          : Promise.resolve({ targetIntensity: 1.0, progressionNote: '', recentWorkouts: [] })
      ])

      // Handle results
      let profile: UserProfile | null = null
      let targetIntensity = 1.0
      let progressionNote = ''
      let recentWorkouts: RecentWorkout[] = []
      let error: string | null = null

      if (profileResult.status === 'fulfilled') {
        profile = profileResult.value
      } else {
        error = profileResult.reason?.message || 'Failed to load profile'
      }

      if (workoutHistoryResult.status === 'fulfilled') {
        targetIntensity = workoutHistoryResult.value.targetIntensity
        progressionNote = workoutHistoryResult.value.progressionNote
        recentWorkouts = workoutHistoryResult.value.recentWorkouts
      } else {
        logger.error('Error loading workout history', workoutHistoryResult.reason)
        // Don't set error for workout history failure, use defaults
      }

      setPreloadedData({
        profile,
        targetIntensity,
        progressionNote,
        recentWorkouts,
        isLoading: false,
        error
      })

    } catch (error) {
      logger.error('Error preloading workout data', error)
      setPreloadedData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to preload data'
      }))
    }
  }, [fetchWorkoutHistory])

  // Trigger preload when component mounts or user changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        preloadData()
      } else {
        setPreloadedData({
          profile: null,
          targetIntensity: 1.0,
          progressionNote: '',
          recentWorkouts: [],
          isLoading: false,
          error: 'No user authenticated'
        })
      }
    })

    return unsubscribe
  }, [preloadData])

  return {
    preloadedData,
    refreshPreloadedData: preloadData
  }
}
