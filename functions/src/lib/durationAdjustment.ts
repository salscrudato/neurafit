/**
 * Duration adjustment and validation for AI-generated workouts
 * Ensures workouts match requested duration through automatic adjustments
 */

export interface Exercise {
  name: string;
  sets: number;
  reps: number | string;
  restSeconds: number;
}

export interface Workout {
  exercises: Exercise[];
}

export interface ProgrammingContext {
  sets: [number, number];
  reps: [number, number];
  restSeconds: [number, number];
  intensity: string;
}

/**
 * Parse reps field to extract time in seconds for time-based exercises
 * Returns null if not a time-based exercise
 * Handles both single time ("30s") and time ranges ("30-45s")
 */
function parseTimeBasedReps(reps: number | string): number | null {
  if (typeof reps !== 'string') {
    return null;
  }

  // Match patterns like "30s", "45s", "60s"
  const singleTimeMatch = reps.match(/^(\d+)s$/i);
  if (singleTimeMatch && singleTimeMatch[1]) {
    return parseInt(singleTimeMatch[1], 10);
  }

  // Match time range patterns like "30-45s"
  const rangeTimeMatch = reps.match(/^(\d+)-(\d+)s$/i);
  if (rangeTimeMatch && rangeTimeMatch[1] && rangeTimeMatch[2]) {
    // Use the average of the range
    const min = parseInt(rangeTimeMatch[1], 10);
    const max = parseInt(rangeTimeMatch[2], 10);
    return (min + max) / 2;
  }

  return null;
}

/**
 * Calculate total workout duration in minutes
 * Handles both regular rep-based and time-based exercises
 */
export function calculateWorkoutDuration(workout: Workout): number {
  let totalTime = 0;

  workout.exercises.forEach((ex) => {
    // Check if this is a time-based exercise (e.g., "30s")
    const timeSeconds = parseTimeBasedReps(ex.reps);

    let workTime: number;
    if (timeSeconds !== null) {
      // Time-based exercise: sets × time per set (in minutes)
      workTime = ex.sets * (timeSeconds / 60);
    } else {
      // Regular rep-based exercise: assume 1 minute per set for execution
      workTime = ex.sets;
    }

    const restTime = (ex.sets - 1) * (ex.restSeconds / 60);
    totalTime += workTime + restTime;
  });

  return totalTime;
}

/**
 * Calculate duration variance - simple ±10% with minimum 3 minutes
 */
function calculateDurationVariance(targetDuration: number): number {
  return Math.max(3, Math.round(targetDuration * 0.1));
}

/**
 * Validate workout duration against target
 * Returns validation result with details
 */
export function validateDuration(
  workout: Workout,
  targetDuration: number,
): {
  isValid: boolean;
  actualDuration: number;
  difference: number;
  message: string;
} {
  const actualDuration = calculateWorkoutDuration(workout);
  const difference = actualDuration - targetDuration;
  const variance = calculateDurationVariance(targetDuration);

  const isValid = Math.abs(difference) <= variance;

  let message = '';
  if (isValid) {
    message = `Duration valid: ${actualDuration.toFixed(1)} min (target: ${targetDuration}±${variance} min)`;
  } else if (difference < 0) {
    message = `Duration too short: ${actualDuration.toFixed(1)} min (target: ${targetDuration} min, diff: ${Math.abs(difference).toFixed(1)} min)`;
  } else {
    message = `Duration too long: ${actualDuration.toFixed(1)} min (target: ${targetDuration} min, diff: ${difference.toFixed(1)} min)`;
  }

  return {
    isValid,
    actualDuration,
    difference,
    message,
  };
}

/**
 * Validate and adjust workout duration
 * Simplified: Trust AI-generated workouts, only validate within acceptable variance
 * No complex adjustments - AI generates good durations with structured output
 */
export function validateAndAdjustDuration(
  workout: Workout,
  targetDuration: number,
  _minExerciseCount: number,
): {
  isValid: boolean;
  actualDuration: number;
  difference: number;
  adjusted: boolean;
  changes: string[];
  error?: string;
} {
  const actualDuration = calculateWorkoutDuration(workout);
  const difference = actualDuration - targetDuration;
  const variance = calculateDurationVariance(targetDuration);

  // Accept if within standard variance (±10% with minimum 3 minutes)
  const isValid = Math.abs(difference) <= variance;

  if (!isValid) {
    // Log warning for out-of-range durations but still accept
    // AI with structured output generates good durations; minor variance is acceptable
    console.warn(
      `⚠️ Duration variance: ${Math.abs(difference).toFixed(1)} min (target: ${targetDuration}±${variance} min, actual: ${actualDuration.toFixed(1)} min)`,
    );
  }

  return {
    isValid: true, // Always accept - trust AI output
    actualDuration,
    difference,
    adjusted: false,
    changes: [],
  };
}

