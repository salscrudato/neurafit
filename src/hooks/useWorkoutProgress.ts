/**
 * Custom hook for calculating workout progress
 * Extracts progress calculation logic from Exercise component
 */

export interface WorkoutProgressData {
  progressPercent: number
  completedSets: number
  totalSets: number
  currentExercise: number
  totalExercises: number
  elapsedTime: number
}

export function useWorkoutProgress(
  exerciseIndex: number,
  setNumber: number,
  totalExercises: number,
  setsPerExercise: number,
  startTime: number
): WorkoutProgressData {
  // Calculate progress percentage
  const perExercise = 1 / totalExercises
  const withinExercise = ((setNumber - 1) / Math.max(1, setsPerExercise)) * perExercise
  const progressPercent = Math.min(100, Math.round(((exerciseIndex * perExercise) + withinExercise) * 100))

  // Calculate completed sets
  const completedSets = (exerciseIndex * setsPerExercise) + (setNumber - 1)
  const totalSets = totalExercises * setsPerExercise

  // Calculate elapsed time
  const elapsedTime = Math.floor((Date.now() - startTime) / 1000)

  return {
    progressPercent,
    completedSets,
    totalSets,
    currentExercise: exerciseIndex + 1,
    totalExercises,
    elapsedTime,
  }
}

