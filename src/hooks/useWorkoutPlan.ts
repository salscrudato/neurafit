/**
 * Custom hook for managing workout plan data
 * Extracts workout plan loading and management logic
 */

import { useState, useEffect } from 'react'

export interface Exercise {
  name: string
  description?: string
  sets: number
  reps: number | string
  formTips?: string[]
  safetyTips?: string[]
  restSeconds?: number
  usesWeight?: boolean
  muscleGroups?: string[]
  difficulty?: string
}

export interface WorkoutPlan {
  exercises: Exercise[]
}

export function useWorkoutPlan() {
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('nf_workout_plan')
      if (!saved) {
        setError('No workout plan found')
        setLoading(false)
        return
      }

      const parsedData = JSON.parse(saved) as { plan: WorkoutPlan }
      
      if (!parsedData?.plan?.exercises || !Array.isArray(parsedData.plan.exercises)) {
        setError('Invalid workout plan format')
        setLoading(false)
        return
      }

      setPlan(parsedData.plan)
      setError(null)
    } catch (err) {
      console.error('Error loading workout plan:', err)
      setError('Failed to load workout plan')
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    plan,
    exercises: plan?.exercises || [],
    loading,
    error,
  }
}

