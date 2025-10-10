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
    workoutType?: string;
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

  // Check muscle group balance
  validateMuscleGroupBalance(plan, userProfile.workoutType, result);

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

/**
 * Muscle group categories for balance validation
 */
const MUSCLE_GROUP_CATEGORIES = {
  push: ['chest', 'triceps', 'anterior deltoid', 'front deltoid'],
  pull: ['back', 'lats', 'latissimus', 'biceps', 'rear deltoid', 'posterior deltoid', 'traps', 'trapezius'],
  legs: ['quadriceps', 'quads', 'hamstrings', 'glutes', 'gluteus', 'calves', 'gastrocnemius'],
  core: ['abs', 'abdominals', 'obliques', 'core', 'lower back', 'erector spinae'],
  shoulders: ['deltoids', 'delts', 'shoulders', 'lateral deltoid', 'side deltoid'],
};

/**
 * Validates muscle group balance in workout
 * Checks for appropriate distribution based on workout type
 */
function validateMuscleGroupBalance(
  plan: WorkoutPlan,
  workoutType: string | undefined,
  result: ExerciseValidationResult,
): void {
  // Count exercises targeting each muscle group category
  const categoryCount: Record<string, number> = {
    push: 0,
    pull: 0,
    legs: 0,
    core: 0,
    shoulders: 0,
  };

  plan.exercises.forEach((exercise) => {
    const muscleGroups = exercise.muscleGroups?.map((m) => m.toLowerCase()) || [];

    Object.entries(MUSCLE_GROUP_CATEGORIES).forEach(([category, muscles]) => {
      if (muscleGroups.some((mg) => muscles.some((m) => mg.includes(m)))) {
        const currentCount = categoryCount[category];
        if (currentCount !== undefined) {
          categoryCount[category] = currentCount + 1;
        }
      }
    });
  });

  // Validate balance based on workout type
  const type = workoutType?.toLowerCase() || 'full body';

  if (type.includes('full body')) {
    // Full body should have representation from all major categories
    const pushCount = categoryCount.push || 0;
    const pullCount = categoryCount.pull || 0;
    const legsCount = categoryCount.legs || 0;

    if (pushCount === 0) {
      result.warnings.push('Full body workout should include at least one pushing exercise');
    }
    if (pullCount === 0) {
      result.warnings.push('Full body workout should include at least one pulling exercise');
    }
    if (legsCount === 0) {
      result.warnings.push('Full body workout should include at least one leg exercise');
    }

    // Check push/pull balance (should be within 1 exercise of each other)
    const pushPullDiff = Math.abs(pushCount - pullCount);
    if (pushPullDiff > 2) {
      result.warnings.push(
        `Push/pull imbalance detected: ${pushCount} push vs ${pullCount} pull exercises. Consider balancing for injury prevention.`,
      );
    }
  } else if (type.includes('upper body') || type.includes('upper')) {
    // Upper body should balance push and pull
    const pushCount = categoryCount.push || 0;
    const pullCount = categoryCount.pull || 0;
    const legsCount = categoryCount.legs || 0;

    if (pushCount === 0) {
      result.warnings.push('Upper body workout should include pushing exercises');
    }
    if (pullCount === 0) {
      result.warnings.push('Upper body workout should include pulling exercises');
    }

    const pushPullDiff = Math.abs(pushCount - pullCount);
    if (pushPullDiff > 1) {
      result.warnings.push(
        `Push/pull imbalance in upper body workout: ${pushCount} push vs ${pullCount} pull. Aim for 1:1 ratio.`,
      );
    }

    // Upper body shouldn't have leg exercises
    if (legsCount > 0) {
      result.warnings.push('Upper body workout contains leg exercises - may not match user expectations');
    }
  } else if (type.includes('lower body') || type.includes('legs') || type.includes('glutes')) {
    // Lower body should focus on legs
    const legsCount = categoryCount.legs || 0;
    const pushCount = categoryCount.push || 0;
    const pullCount = categoryCount.pull || 0;
    const shouldersCount = categoryCount.shoulders || 0;

    if (legsCount === 0) {
      result.errors.push('Lower body workout must include leg exercises');
      result.isValid = false;
    }

    // Lower body shouldn't have many upper body exercises
    const upperBodyCount = pushCount + pullCount + shouldersCount;
    if (upperBodyCount > legsCount) {
      result.warnings.push(
        'Lower body workout has more upper body exercises than leg exercises - may not match user expectations',
      );
    }
  } else if (type.includes('push')) {
    // Push workout should focus on pushing movements
    const pushCount = categoryCount.push || 0;
    const pullCount = categoryCount.pull || 0;

    if (pushCount === 0) {
      result.errors.push('Push workout must include pushing exercises');
      result.isValid = false;
    }
    if (pullCount > pushCount) {
      result.warnings.push('Push workout has more pulling than pushing exercises');
    }
  } else if (type.includes('pull')) {
    // Pull workout should focus on pulling movements
    const pushCount = categoryCount.push || 0;
    const pullCount = categoryCount.pull || 0;

    if (pullCount === 0) {
      result.errors.push('Pull workout must include pulling exercises');
      result.isValid = false;
    }
    if (pushCount > pullCount) {
      result.warnings.push('Pull workout has more pushing than pulling exercises');
    }
  }

  // General suggestion for core work
  if (categoryCount.core === 0 && plan.exercises.length >= 5) {
    result.suggestions.push('Consider adding core exercises for comprehensive training');
  }
}

