/**
 * Safety-critical exercise validation system
 * Ensures AI-generated workouts are safe and structurally complete
 */

export interface ExerciseValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface Exercise {
  name: string;
  description: string;
  sets: number;
  reps: number | string;
  formTips: string[];
  safetyTips: string[];
  restSeconds: number;
  usesWeight: boolean;
  muscleGroups?: string[];
  difficulty?: string;
}

export interface WorkoutPlan {
  exercises: Exercise[];
  workoutSummary?: {
    totalVolume: string;
    primaryFocus: string;
    expectedRPE: string;
  };
}

// Exercise contraindications based on common injuries
// These are safety-critical patterns that should be avoided with specific injuries
const INJURY_CONTRAINDICATIONS: Record<string, string[]> = {
  knee: [
    'deep squat',
    'lunge',
    'jump',
    'plyometric',
    'box jump',
    'burpee',
    'single leg squat',
    'pistol squat',
    'jump squat',
    'split squat',
  ],
  'lower back': [
    'deadlift',
    'good morning',
    'bent over row',
    'overhead press',
    'sit up',
    'russian twist',
    'toe touch',
    'superman',
  ],
  shoulder: [
    'overhead press',
    'behind neck',
    'upright row',
    'lateral raise',
    'military press',
    'handstand',
    'pull up',
    'dip',
  ],
  ankle: ['jump', 'plyometric', 'calf raise', 'box jump', 'burpee', 'running', 'sprinting', 'agility'],
  wrist: ['push up', 'plank', 'handstand', 'burpee', 'mountain climber'],
  neck: ['overhead press', 'behind neck', 'headstand', 'neck bridge'],
};

/**
 * Validates a workout plan for safety-critical issues
 * Focuses on injury contraindications and structural completeness
 */
export function validateWorkoutPlan(
  plan: WorkoutPlan,
  userProfile: {
    experience?: string;
    injuries?: string[];
    duration: number;
    goals?: string[];
  },
): ExerciseValidationResult {
  const result: ExerciseValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  };

  // Check for empty workout
  if (!plan.exercises || plan.exercises.length === 0) {
    result.errors.push('Workout must contain at least one exercise');
    result.isValid = false;
    return result;
  }

  // Validate each exercise for required fields
  plan.exercises.forEach((exercise, index) => {
    const exerciseResult = validateExercise(exercise);

    if (!exerciseResult.isValid) {
      result.isValid = false;
    }

    exerciseResult.errors.forEach((error) =>
      result.errors.push(`Exercise ${index + 1} (${exercise.name}): ${error}`),
    );
  });

  // CRITICAL: Check for injury contraindications
  validateInjuryCompliance(plan, userProfile.injuries || [], result);

  return result;
}

/**
 * Validates an individual exercise for required fields
 * Ensures the AI response is structurally complete
 */
function validateExercise(exercise: Exercise): ExerciseValidationResult {
  const result: ExerciseValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  };

  // Required fields validation
  if (!exercise.name || exercise.name.trim().length === 0) {
    result.errors.push('Exercise name is required');
    result.isValid = false;
  }

  if (!exercise.description || exercise.description.trim().length < 50) {
    result.errors.push('Exercise description must be at least 50 characters with proper technique guidance');
    result.isValid = false;
  }

  if (!exercise.sets || exercise.sets < 1 || exercise.sets > 10) {
    result.errors.push('Sets must be between 1 and 10');
    result.isValid = false;
  }

  if (!exercise.reps) {
    result.errors.push('Reps specification is required');
    result.isValid = false;
  }

  if (exercise.restSeconds === undefined || exercise.restSeconds === null) {
    result.errors.push('Rest period is required');
    result.isValid = false;
  }

  return result;
}



/**
 * Validates compliance with injury limitations
 */
function validateInjuryCompliance(
  plan: WorkoutPlan,
  injuries: string[],
  result: ExerciseValidationResult,
): void {
  if (injuries.length === 0) return;

  plan.exercises.forEach((exercise, index) => {
    injuries.forEach((injury) => {
      const contraindications = INJURY_CONTRAINDICATIONS[injury.toLowerCase()] || [];
      const exerciseName = exercise.name.toLowerCase();

      const hasContraindication = contraindications.some((contraindicated) =>
        exerciseName.includes(contraindicated),
      );

      if (hasContraindication) {
        result.errors.push(
          `Exercise ${index + 1} (${exercise.name}) may be contraindicated for ${injury} injury`,
        );
        result.isValid = false;
      }
    });
  });
}

