// Common data transformation utilities
// Extracts repeated transformation logic into reusable functions

import type { WorkoutHistoryItem } from '../store'

// Date and time transformations
export const formatTimestamp = (timestamp: number | Date | { toDate(): Date }): string => {
  let date: Date

  if (timestamp instanceof Date) {
    date = timestamp
  } else if (typeof timestamp === 'number') {
    date = new Date(timestamp)
  } else if (timestamp && typeof timestamp.toDate === 'function') {
    date = timestamp.toDate()
  } else {
    return 'Invalid date'
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) {
    return `${hours}h`
  }
  
  return `${hours}h ${remainingMinutes}m`
}

export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`
  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`
  if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  if (seconds > 30) return `${seconds} second${seconds > 1 ? 's' : ''} ago`
  
  return 'Just now'
}

// Weight and measurement transformations
export const formatWeight = (weight: number | null, unit = 'lbs'): string => {
  if (weight === null || weight === undefined) {
    return '-'
  }
  
  if (weight === 0) {
    return 'Bodyweight'
  }
  
  return `${weight} ${unit}`
}

export const formatHeight = (inches: number): string => {
  const feet = Math.floor(inches / 12)
  const remainingInches = inches % 12
  
  if (remainingInches === 0) {
    return `${feet}'`
  }
  
  return `${feet}'${remainingInches}"`
}

export const convertWeight = (weight: number, fromUnit: 'lbs' | 'kg', toUnit: 'lbs' | 'kg'): number => {
  if (fromUnit === toUnit) return weight
  
  if (fromUnit === 'lbs' && toUnit === 'kg') {
    return Math.round((weight * 0.453592) * 10) / 10
  }
  
  if (fromUnit === 'kg' && toUnit === 'lbs') {
    return Math.round((weight * 2.20462) * 10) / 10
  }
  
  return weight
}

// Exercise and workout transformations
export const formatReps = (reps: number | string): string => {
  if (typeof reps === 'number') {
    return reps.toString()
  }
  
  // Handle time-based reps
  const timeMatch = reps.match(/(\d+)\s*(s|sec|seconds?|min|minutes?)/i)
  if (timeMatch) {
    const value = parseInt(timeMatch[1])
    const unit = timeMatch[2].toLowerCase()
    
    if (unit.startsWith('min')) {
      return value === 1 ? '1 min' : `${value} mins`
    } else {
      return value === 1 ? '1 sec' : `${value} secs`
    }
  }
  
  return reps.toString()
}

export const formatRestTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`
  }
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (remainingSeconds === 0) {
    return `${minutes}m`
  }
  
  return `${minutes}m ${remainingSeconds}s`
}

interface ExerciseWithWeights {
  name: string
  weights?: Record<string, number | null>
  reps: number | string
  sets: number
  description?: string
  formTips?: string[]
  safetyTips?: string[]
  restSeconds?: number
  usesWeight?: boolean
  muscleGroups?: string[]
  difficulty?: string
}

export const calculateWorkoutVolume = (exercises: ExerciseWithWeights[]): number => {
  return exercises.reduce((total, exercise) => {
    if (!exercise.weights) return total

    const exerciseVolume = Object.values(exercise.weights).reduce((exerciseTotal: number, weight: number | null) => {
      if (weight === null || weight === undefined) return exerciseTotal

      const reps = typeof exercise.reps === 'number' ? exercise.reps : parseInt(String(exercise.reps)) || 10
      return exerciseTotal + (weight * reps)
    }, 0)

    return total + exerciseVolume
  }, 0)
}

export const calculateCompletionRate = (exercises: ExerciseWithWeights[]): number => {
  let totalSets = 0
  let completedSets = 0

  exercises.forEach(exercise => {
    const sets = exercise.sets || 0
    totalSets += sets

    if (exercise.weights) {
      Object.values(exercise.weights).forEach((weight: number | null) => {
        if (weight !== null && weight !== undefined) {
          completedSets++
        }
      })
    }
  })

  return totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0
}

// User profile transformations
export const formatExperienceLevel = (experience: string): string => {
  const levels: Record<string, string> = {
    'Beginner': '🌱 Beginner',
    'Intermediate': '💪 Intermediate',
    'Advanced': '🏆 Advanced'
  }
  
  return levels[experience] || experience
}

export const formatGoals = (goals: string[]): string => {
  if (!goals || goals.length === 0) return 'No goals set'
  
  if (goals.length === 1) return goals[0]
  if (goals.length === 2) return goals.join(' & ')
  
  return `${goals.slice(0, -1).join(', ')} & ${goals[goals.length - 1]}`
}

export const formatEquipment = (equipment: string[]): string => {
  if (!equipment || equipment.length === 0) return 'No equipment'
  
  if (equipment.length === 1) return equipment[0]
  if (equipment.length <= 3) return equipment.join(', ')
  
  return `${equipment.slice(0, 2).join(', ')} & ${equipment.length - 2} more`
}

// Subscription transformations
export const formatSubscriptionStatus = (status: string): { text: string; color: string } => {
  const statusMap: Record<string, { text: string; color: string }> = {
    'active': { text: 'Active', color: 'green' },
    'trialing': { text: 'Trial', color: 'blue' },
    'canceled': { text: 'Canceled', color: 'red' },
    'past_due': { text: 'Past Due', color: 'orange' },
    'incomplete': { text: 'Incomplete', color: 'yellow' },
    'unpaid': { text: 'Unpaid', color: 'red' }
  }
  
  return statusMap[status] || { text: status, color: 'gray' }
}

export const formatPrice = (priceInCents: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase()
  }).format(priceInCents / 100)
}

// Analytics transformations
export const aggregateWorkoutStats = (workouts: WorkoutHistoryItem[]) => {
  if (!workouts || workouts.length === 0) {
    return {
      totalWorkouts: 0,
      totalDuration: 0,
      averageDuration: 0,
      totalVolume: 0,
      averageCompletionRate: 0,
      workoutsByType: {},
      weeklyFrequency: 0
    }
  }
  
  const totalWorkouts = workouts.length
  const totalDuration = workouts.reduce((sum, w) => sum + w.duration, 0)
  const averageDuration = Math.round(totalDuration / totalWorkouts)
  
  const totalVolume = workouts.reduce((sum, w) => sum + calculateWorkoutVolume(w.exercises), 0)
  
  const totalCompletionRate = workouts.reduce((sum, w) => sum + (w.completionRate || 0), 0)
  const averageCompletionRate = Math.round(totalCompletionRate / totalWorkouts)
  
  const workoutsByType = workouts.reduce((acc: Record<string, number>, w) => {
    acc[w.workoutType] = (acc[w.workoutType] || 0) + 1
    return acc
  }, {})
  
  // Calculate weekly frequency (last 4 weeks)
  const fourWeeksAgo = Date.now() - (4 * 7 * 24 * 60 * 60 * 1000)
  const recentWorkouts = workouts.filter(w => w.timestamp > fourWeeksAgo)
  const weeklyFrequency = Math.round((recentWorkouts.length / 4) * 10) / 10
  
  return {
    totalWorkouts,
    totalDuration,
    averageDuration,
    totalVolume,
    averageCompletionRate,
    workoutsByType,
    weeklyFrequency
  }
}

// Data normalization
interface RawWorkoutData {
  id?: string
  timestamp?: number
  workoutType?: string
  duration?: number
  exercises?: ExerciseWithWeights[]
  completionRate?: number
}

interface RawUserProfile {
  experience?: string
  goals?: string[]
  equipment?: string[]
  personal?: {
    age?: number
    weight?: number
    height?: number
    fitnessLevel?: string
    sex?: string
  }
  preferences?: {
    workoutDuration?: number
    restTime?: number
    difficulty?: string
  }
  // Legacy fields for backward compatibility
  sex?: string
  height?: string | number
  weight?: string | number
  injuries?: {
    list?: string[]
    notes?: string
  } | string[]
  injury_details?: string
}

export const normalizeWorkoutData = (rawWorkout: RawWorkoutData): WorkoutHistoryItem => {
  return {
    id: rawWorkout.id || `workout_${Date.now()}`,
    timestamp: rawWorkout.timestamp || Date.now(),
    workoutType: rawWorkout.workoutType || 'General',
    duration: rawWorkout.duration || 0,
    exercises: rawWorkout.exercises || [],
    completionRate: rawWorkout.completionRate || calculateCompletionRate(rawWorkout.exercises || [])
  }
}

export const normalizeUserProfile = (rawProfile: RawUserProfile) => {
  return {
    experience: rawProfile.experience || '',
    goals: Array.isArray(rawProfile.goals) ? rawProfile.goals : [],
    equipment: Array.isArray(rawProfile.equipment) ? rawProfile.equipment : [],
    personal: {
      sex: rawProfile.personal?.sex || rawProfile.sex || '',
      height: rawProfile.personal?.height || rawProfile.height || '',
      weight: rawProfile.personal?.weight || rawProfile.weight || ''
    },
    injuries: {
      list: Array.isArray(rawProfile.injuries) ? rawProfile.injuries :
            (rawProfile.injuries && typeof rawProfile.injuries === 'object' && 'list' in rawProfile.injuries && Array.isArray(rawProfile.injuries.list)) ? rawProfile.injuries.list : [],
      notes: (rawProfile.injuries && typeof rawProfile.injuries === 'object' && 'notes' in rawProfile.injuries && typeof rawProfile.injuries.notes === 'string') ? rawProfile.injuries.notes :
             rawProfile.injury_details || ''
    }
  }
}

// Search and filtering transformations
export const createSearchableText = (workout: WorkoutHistoryItem): string => {
  const exerciseNames = workout.exercises.map(e => e.name).join(' ')
  const workoutType = workout.workoutType
  const date = formatTimestamp(workout.timestamp)
  
  return `${workoutType} ${exerciseNames} ${date}`.toLowerCase()
}

export const filterWorkoutsByDateRange = (
  workouts: WorkoutHistoryItem[],
  startDate: Date,
  endDate: Date
): WorkoutHistoryItem[] => {
  const start = startDate.getTime()
  const end = endDate.getTime()
  
  return workouts.filter(workout => {
    const workoutTime = workout.timestamp
    return workoutTime >= start && workoutTime <= end
  })
}

export const groupWorkoutsByWeek = (workouts: WorkoutHistoryItem[]): Record<string, WorkoutHistoryItem[]> => {
  return workouts.reduce((groups: Record<string, WorkoutHistoryItem[]>, workout) => {
    const date = new Date(workout.timestamp)
    const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay())
    const weekKey = weekStart.toISOString().split('T')[0]
    
    if (!groups[weekKey]) {
      groups[weekKey] = []
    }
    
    groups[weekKey].push(workout)
    return groups
  }, {})
}

// Utility transformations
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .substring(0, 1000) // Limit length
}

export const generateId = (prefix = ''): string => {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}${prefix ? '_' : ''}${timestamp}_${random}`
}

export const debounce = <T extends (..._args: unknown[]) => unknown>(
  func: T,
  wait: number
): (..._args: Parameters<T>) => void => {
  let timeout: NodeJS.Timeout

  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export const throttle = <T extends (..._args: unknown[]) => unknown>(
  func: T,
  limit: number
): (..._args: Parameters<T>) => void => {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}
