/**
 * Custom hook for managing workout state
 * Extracts workout state management logic from Exercise component
 */

import { useState, useEffect } from 'react'

export interface WorkoutStateData {
  exerciseIndex: number
  setNumber: number
  startTime: number
}

export function useWorkoutState() {
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [setNumber, setSetNumber] = useState(1)
  const [startTime, setStartTime] = useState<number>(Date.now())

  // Load workout start time on mount
  useEffect(() => {
    const startTimeStr = sessionStorage.getItem('nf_workout_start_time')
    if (startTimeStr) {
      setStartTime(parseInt(startTimeStr))
    } else {
      // Set start time if not already set
      const now = Date.now()
      sessionStorage.setItem('nf_workout_start_time', now.toString())
      setStartTime(now)
    }
  }, [])

  // Handle return from rest screen
  useEffect(() => {
    const returnData = sessionStorage.getItem('nf_return')
    if (returnData) {
      const { i, setNo } = JSON.parse(returnData)
      setExerciseIndex(i)
      setSetNumber(setNo)
      sessionStorage.removeItem('nf_return')
    }
  }, [])

  return {
    exerciseIndex,
    setExerciseIndex,
    setNumber,
    setSetNumber,
    startTime,
  }
}

