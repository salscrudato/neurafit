import { useState, useEffect, useCallback } from 'react'
import { auth, db } from '../lib/firebase'
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { useSubscription } from './useSubscription'
import { isAdaptivePersonalizationEnabled } from '../config/features'

export interface PreloadedData {
  profile: any | null
  targetIntensity: number
  progressionNote: string
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
    isLoading: true,
    error: null
  })

  const { subscription } = useSubscription()

  // Fetch adaptive intensity based on recent workout feedback
  const fetchAdaptiveIntensity = useCallback(async (uid: string) => {
    try {
      // Get recent workouts with feedback
      const workoutsRef = collection(db, 'users', uid, 'workouts')
      const workoutsQuery = query(workoutsRef, orderBy('timestamp', 'desc'), limit(5))
      const snapshot = await getDocs(workoutsQuery)

      if (snapshot.empty) {
        return { targetIntensity: 1.0, progressionNote: '' }
      }

      // Find the most recent workout with feedback
      let lastFeedback: 'easy' | 'right' | 'hard' | null = null
      let recentCompletionRate = 0.8 // default
      let totalSets = 0
      let completedSets = 0

      snapshot.docs.forEach(doc => {
        const workout = doc.data()

        // Get the most recent feedback
        if (!lastFeedback && workout.feedback) {
          lastFeedback = workout.feedback
        }

        // Calculate completion rate from all recent workouts
        if (workout.exercises && Array.isArray(workout.exercises)) {
          workout.exercises.forEach((exercise: { sets?: number; weights?: Record<string, number | null> }) => {
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

      return { targetIntensity, progressionNote }
    } catch (error) {
      console.error('Error fetching adaptive intensity:', error)
      return { targetIntensity: 1.0, progressionNote: '' }
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
      const [profileResult, adaptiveResult] = await Promise.allSettled([
        // Fetch user profile
        (async () => {
          const userDocRef = doc(db, 'users', uid)
          const snap = await getDoc(userDocRef)
          if (!snap.exists()) {
            throw new Error('Profile not found')
          }
          const profile = snap.data()
          // Basic completeness check
          const complete = !!(profile.experience && profile.goals?.length && profile.personal?.height && profile.personal?.weight)
          if (!complete) {
            throw new Error('Profile incomplete')
          }
          return profile
        })(),
        // Fetch adaptive intensity if enabled
        isAdaptivePersonalizationEnabled() ? fetchAdaptiveIntensity(uid) : Promise.resolve({ targetIntensity: 1.0, progressionNote: '' })
      ])

      // Handle results
      let profile = null
      let targetIntensity = 1.0
      let progressionNote = ''
      let error = null

      if (profileResult.status === 'fulfilled') {
        profile = profileResult.value
      } else {
        error = profileResult.reason?.message || 'Failed to load profile'
      }

      if (adaptiveResult.status === 'fulfilled') {
        targetIntensity = adaptiveResult.value.targetIntensity
        progressionNote = adaptiveResult.value.progressionNote
      } else {
        console.error('Error loading adaptive intensity:', adaptiveResult.reason)
        // Don't set error for adaptive intensity failure, use defaults
      }

      setPreloadedData({
        profile,
        targetIntensity,
        progressionNote,
        isLoading: false,
        error
      })

    } catch (error) {
      console.error('Error preloading workout data:', error)
      setPreloadedData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to preload data'
      }))
    }
  }, [fetchAdaptiveIntensity])

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
          isLoading: false,
          error: 'No user authenticated'
        })
      }
    })

    return unsubscribe
  }, [preloadData])

  // Refresh data when subscription changes (in case limits changed)
  useEffect(() => {
    if (auth.currentUser && subscription) {
      // Don't need to reload profile, just ensure we have latest subscription data
      // The subscription hook already handles this
    }
  }, [subscription])

  return {
    preloadedData,
    refreshPreloadedData: preloadData
  }
}
