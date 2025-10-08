/**
 * Custom hook for managing weight history
 * Extracts weight history loading and management logic
 */

import { useState, useEffect } from 'react'
import { auth } from '../lib/firebase'
import {
  getCachedWeightHistory,
  fetchRecentSessions,
  type WeightHistory,
  type WorkoutSession,
} from '../lib/weightHistory'
import { logger } from '../lib/logger'

export function useWeightHistory(exerciseName: string) {
  const [weightHistory, setWeightHistory] = useState<WeightHistory[]>([])
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!exerciseName) return

    const loadHistory = async () => {
      setLoading(true)
      setError(null)

      try {
        const uid = auth.currentUser?.uid
        if (!uid) {
          setError('User not authenticated')
          return
        }

        // Load weight history for this exercise
        const history = await getCachedWeightHistory(exerciseName)
        setWeightHistory(history)

        // Load recent workout sessions
        const sessions = await fetchRecentSessions(5)
        setRecentSessions(sessions)

        logger.debug('Weight history loaded', {
          exercise: exerciseName,
          historyCount: history.length,
          sessionsCount: sessions.length,
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load weight history'
        logger.error('Error loading weight history', err as Error, { exerciseName })
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [exerciseName])

  return {
    weightHistory,
    recentSessions,
    loading,
    error,
  }
}

