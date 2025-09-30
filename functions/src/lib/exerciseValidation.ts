/**
 * Professional exercise validation and safety checking system
 * Ensures AI-generated workouts meet fitness industry standards
 */

export interface ExerciseValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
}

export interface Exercise {
  name: string
  description: string
  sets: number
  reps: number | string
  formTips: string[]
  safetyTips: string[]
  restSeconds: number
  usesWeight: boolean
  muscleGroups?: string[]
  difficulty?: string
}

export interface WorkoutPlan {
  exercises: Exercise[]
  workoutSummary?: {
    totalVolume: string
    primaryFocus: string
    expectedRPE: string
  }
}

// Exercise contraindications based on common injuries
const INJURY_CONTRAINDICATIONS: Record<string, string[]> = {
  'knee': [
    'deep squat', 'lunge', 'jump', 'plyometric', 'box jump', 'burpee',
    'single leg squat', 'pistol squat', 'jump squat', 'split squat'
  ],
  'lower back': [
    'deadlift', 'good morning', 'bent over row', 'overhead press',
    'sit up', 'russian twist', 'toe touch', 'superman'
  ],
  'shoulder': [
    'overhead press', 'behind neck', 'upright row', 'lateral raise',
    'military press', 'handstand', 'pull up', 'dip'
  ],
  'ankle': [
    'jump', 'plyometric', 'calf raise', 'box jump', 'burpee',
    'running', 'sprinting', 'agility'
  ],
  'wrist': [
    'push up', 'plank', 'handstand', 'burpee', 'mountain climber'
  ],
  'neck': [
    'overhead press', 'behind neck', 'headstand', 'neck bridge'
  ]
}

// Minimum rest periods by exercise intensity (seconds) - for future use
// const REST_PERIOD_GUIDELINES = {
//   strength: { min: 120, max: 300 },      // Heavy compound movements
//   hypertrophy: { min: 60, max: 120 },    // Moderate intensity
//   endurance: { min: 30, max: 60 },       // Light/cardio
//   warmup: { min: 15, max: 45 },          // Movement prep
//   cooldown: { min: 30, max: 90 }         // Recovery/stretching
// }

// Experience-appropriate rep ranges - for future use
// const REP_RANGES_BY_EXPERIENCE = {
//   beginner: {
//     strength: '5-8',
//     hypertrophy: '8-12',
//     endurance: '12-15',
//     time: '20-30s'
//   },
//   intermediate: {
//     strength: '3-6',
//     hypertrophy: '6-12',
//     endurance: '12-20',
//     time: '30-45s'
//   },
//   advanced: {
//     strength: '1-5',
//     hypertrophy: '6-15',
//     endurance: '15-25',
//     time: '45-60s'
//   }
// }

/**
 * Validates a complete workout plan for safety and quality
 */
export function validateWorkoutPlan(
  plan: WorkoutPlan,
  userProfile: {
    experience?: string
    injuries?: string[]
    duration: number
    goals?: string[]
  }
): ExerciseValidationResult {
  const result: ExerciseValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: []
  }

  if (!plan.exercises || plan.exercises.length === 0) {
    result.errors.push('Workout must contain at least one exercise')
    result.isValid = false
    return result
  }

  // Validate individual exercises
  plan.exercises.forEach((exercise, index) => {
    const exerciseResult = validateExercise(exercise, userProfile)
    
    if (!exerciseResult.isValid) {
      result.isValid = false
    }
    
    exerciseResult.errors.forEach(error => 
      result.errors.push(`Exercise ${index + 1} (${exercise.name}): ${error}`)
    )
    exerciseResult.warnings.forEach(warning => 
      result.warnings.push(`Exercise ${index + 1} (${exercise.name}): ${warning}`)
    )
    exerciseResult.suggestions.forEach(suggestion => 
      result.suggestions.push(`Exercise ${index + 1} (${exercise.name}): ${suggestion}`)
    )
  })

  // Validate workout structure
  validateWorkoutStructure(plan, userProfile, result)

  // Check for injury contraindications
  validateInjuryCompliance(plan, userProfile.injuries || [], result)

  // Validate time feasibility
  validateTimeFeasibility(plan, userProfile.duration, result)

  return result
}

/**
 * Validates an individual exercise
 */
function validateExercise(
  exercise: Exercise,
  userProfile: { experience?: string; goals?: string[] }
): ExerciseValidationResult {
  const result: ExerciseValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: []
  }

  // Required fields validation
  if (!exercise.name || exercise.name.trim().length === 0) {
    result.errors.push('Exercise name is required')
    result.isValid = false
  }

  if (!exercise.description || exercise.description.trim().length < 50) {
    result.errors.push('Exercise description must be at least 50 characters with proper technique guidance')
    result.isValid = false
  }

  if (!exercise.sets || exercise.sets < 1 || exercise.sets > 10) {
    result.errors.push('Sets must be between 1 and 10')
    result.isValid = false
  }

  if (!exercise.reps) {
    result.errors.push('Reps specification is required')
    result.isValid = false
  }

  // Rest period validation with exercise-specific requirements
  const exerciseName = exercise.name.toLowerCase()
  let minRestSeconds = 30 // Default minimum
  let maxRestSeconds = 300

  // Determine minimum rest based on exercise type
  if (exerciseName.includes('squat') || exerciseName.includes('deadlift') ||
      exerciseName.includes('press') || exerciseName.includes('row')) {
    minRestSeconds = 120 // Compound movements need more rest
  } else if (exerciseName.includes('curl') || exerciseName.includes('extension') ||
             exerciseName.includes('raise') || exerciseName.includes('fly')) {
    minRestSeconds = 60 // Isolation exercises
  } else if (exerciseName.includes('warm') || exerciseName.includes('mobility')) {
    minRestSeconds = 15 // Warm-up movements
  } else if (exerciseName.includes('plank') || exerciseName.includes('hold')) {
    minRestSeconds = 45 // Isometric exercises
  }

  if (exercise.restSeconds < minRestSeconds) {
    result.warnings.push(`Rest period may be short: ${exercise.restSeconds}s (typical minimum ${minRestSeconds}s for this exercise type)`)
  } else if (exercise.restSeconds > maxRestSeconds) {
    result.warnings.push(`Rest period very long: ${exercise.restSeconds}s (consider ${maxRestSeconds}s maximum)`)
  }

  // Form tips validation
  if (!exercise.formTips || exercise.formTips.length === 0) {
    result.warnings.push('Form tips are highly recommended for exercise safety')
  } else if (exercise.formTips.length > 3) {
    result.suggestions.push('Consider limiting form tips to 3 most critical points for clarity')
  }

  // Safety tips validation
  if (!exercise.safetyTips || exercise.safetyTips.length === 0) {
    result.warnings.push('Safety tips are essential for injury prevention')
  } else if (exercise.safetyTips.length > 3) {
    result.suggestions.push('Consider limiting safety tips to 3 most important points')
  }

  // Experience-appropriate difficulty
  if (userProfile.experience === 'Beginner' && exercise.difficulty === 'advanced') {
    result.warnings.push('Advanced exercise may be too challenging for beginner')
  }

  return result
}

/**
 * Validates overall workout structure and programming
 */
function validateWorkoutStructure(
  plan: WorkoutPlan,
  userProfile: { duration: number; goals?: string[] },
  result: ExerciseValidationResult
): void {
  const exercises = plan.exercises
  const hasWarmup = exercises.some(ex => 
    ex.name.toLowerCase().includes('warm') || 
    ex.name.toLowerCase().includes('mobility') ||
    ex.difficulty === 'beginner'
  )
  
  const hasCooldown = exercises.some(ex => 
    ex.name.toLowerCase().includes('cool') || 
    ex.name.toLowerCase().includes('stretch') ||
    ex.name.toLowerCase().includes('recovery')
  )

  // Warm-up validation
  if (!hasWarmup && userProfile.duration >= 20) {
    result.warnings.push('Workouts 20+ minutes should include warm-up exercises')
  }

  // Cool-down validation
  if (!hasCooldown && userProfile.duration >= 30) {
    result.warnings.push('Workouts 30+ minutes should include cool-down/stretching')
  }

  // Movement pattern balance
  const muscleGroups = exercises
    .flatMap(ex => ex.muscleGroups || [])
    .reduce((acc, group) => {
      acc[group] = (acc[group] || 0) + 1
      return acc
    }, {} as Record<string, number>)

  const pushMovements = (muscleGroups['chest'] || 0) + (muscleGroups['shoulders'] || 0)
  const pullMovements = (muscleGroups['back'] || 0) + (muscleGroups['biceps'] || 0)

  if (pushMovements > 0 && pullMovements === 0) {
    result.warnings.push('Consider adding pulling movements to balance push exercises')
  }
  if (pullMovements > 0 && pushMovements === 0) {
    result.warnings.push('Consider adding pushing movements to balance pull exercises')
  }
}

/**
 * Validates compliance with injury limitations
 */
function validateInjuryCompliance(
  plan: WorkoutPlan,
  injuries: string[],
  result: ExerciseValidationResult
): void {
  if (injuries.length === 0) return

  plan.exercises.forEach((exercise, index) => {
    injuries.forEach(injury => {
      const contraindications = INJURY_CONTRAINDICATIONS[injury.toLowerCase()] || []
      const exerciseName = exercise.name.toLowerCase()
      
      const hasContraindication = contraindications.some(contraindicated => 
        exerciseName.includes(contraindicated)
      )

      if (hasContraindication) {
        result.errors.push(
          `Exercise ${index + 1} (${exercise.name}) may be contraindicated for ${injury} injury`
        )
        result.isValid = false
      }
    })
  })
}

/**
 * Validates workout fits within time constraints
 */
function validateTimeFeasibility(
  plan: WorkoutPlan,
  targetDuration: number,
  result: ExerciseValidationResult
): void {
  let estimatedTime = 0

  plan.exercises.forEach(exercise => {
    // Estimate work time (assuming 3 seconds per rep average)
    let workTime = 0
    if (typeof exercise.reps === 'string') {
      if (exercise.reps.includes('s')) {
        workTime = parseInt(exercise.reps) || 30
      } else {
        workTime = 30 // Default for time-based
      }
    } else {
      workTime = exercise.reps * 3 // 3 seconds per rep estimate
    }

    const totalWorkTime = workTime * exercise.sets
    const totalRestTime = exercise.restSeconds * (exercise.sets - 1)
    
    estimatedTime += totalWorkTime + totalRestTime
  })

  // Convert to minutes
  estimatedTime = Math.ceil(estimatedTime / 60)

  if (estimatedTime > targetDuration * 1.2) {
    result.warnings.push(
      `Estimated workout time (${estimatedTime}min) exceeds target duration (${targetDuration}min) by >20%`
    )
  }

  if (estimatedTime < targetDuration * 0.7) {
    result.suggestions.push(
      `Workout may be shorter than expected (${estimatedTime}min vs ${targetDuration}min target)`
    )
  }
}
