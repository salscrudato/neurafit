/**
 * Custom hook for calculating dashboard statistics
 * Extracts stats calculation logic from Dashboard component
 */

import { useMemo } from 'react'
import { convertToDate } from '../utils/timestamp'

export interface WorkoutItem {
  id: string
  workoutType: string
  duration: number
  timestamp: Date | { toDate(): Date } | string
  exercises?: Array<{
    name: string
    sets: number
    reps: string | number
    weights?: Record<number, number | null>
    usesWeight?: boolean
  }>
  completionRate?: number
}

export interface DashboardStats {
  totalWorkouts: number
  weeklyWorkouts: number
  consistencyScore: number
  recentStreak: number
}

/**
 * Calculate dashboard statistics from workout history
 */
export function calculateDashboardStats(workouts: WorkoutItem[]): DashboardStats {
  const now = Date.now()
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000
  const oneDayMs = 24 * 60 * 60 * 1000

  // Total workouts
  const totalWorkouts = workouts.length

  // Weekly workouts (last 7 days)
  const weeklyWorkouts = workouts.filter((w) => {
    const date = convertToDate(w.timestamp)
    return date && date.getTime() >= oneWeekAgo
  }).length

  // Consistency score (workouts per week over last 4 weeks)
  const fourWeeksAgo = now - 28 * 24 * 60 * 60 * 1000
  const recentWorkouts = workouts.filter((w) => {
    const date = convertToDate(w.timestamp)
    return date && date.getTime() >= fourWeeksAgo
  })
  const consistencyScore = Math.min(100, Math.round((recentWorkouts.length / 12) * 100))

  // Recent streak (consecutive days with workouts)
  const sortedWorkouts = [...workouts]
    .map((w) => ({
      ...w,
      date: convertToDate(w.timestamp),
    }))
    .filter((w) => w.date !== null)
    .sort((a, b) => (b.date!.getTime() - a.date!.getTime()))

  let recentStreak = 0
  const currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)

  for (const workout of sortedWorkouts) {
    const workoutDate = new Date(workout.date!)
    workoutDate.setHours(0, 0, 0, 0)

    const daysDiff = Math.floor((currentDate.getTime() - workoutDate.getTime()) / oneDayMs)

    if (daysDiff === recentStreak) {
      recentStreak++
    } else if (daysDiff > recentStreak) {
      break
    }
  }

  return {
    totalWorkouts,
    weeklyWorkouts,
    consistencyScore,
    recentStreak,
  }
}

/**
 * Hook to calculate and memoize dashboard stats
 */
export function useDashboardStats(workouts: WorkoutItem[]): DashboardStats {
  return useMemo(() => calculateDashboardStats(workouts), [workouts])
}

