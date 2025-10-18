/**
 * Rule-based quality scoring for AI-generated workouts
 * Provides objective metrics for workout quality assessment
 */

export interface WorkoutQualityScore {
  overall: number;
  grade: string;
  breakdown: {
    completeness: number;
    safety: number;
    programming: number;
    personalization: number;
  };
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

export interface Workout {
  exercises: Exercise[];
  workoutSummary?: {
    totalVolume: string;
    primaryFocus: string;
    expectedRPE: string;
  };
}

export interface UserProfile {
  experience?: string;
  injuries?: string[];
  duration: number;
  goals?: string[];
  equipment?: string[];
  workoutType?: string;
}

/**
 * Calculate comprehensive workout quality score
 * Emphasizes safety and personalization for best user outcomes
 */
export function calculateWorkoutQuality(
  workout: Workout,
  userProfile: UserProfile,
): WorkoutQualityScore {
  const breakdown = {
    completeness: calculateCompletenessScore(workout),
    safety: calculateSafetyScore(workout, userProfile),
    programming: calculateProgrammingScore(workout, userProfile),
    personalization: calculatePersonalizationScore(workout, userProfile),
  };

  // Weighted average: safety 40% (critical), programming 30%, completeness 20%, personalization 10%
  // Increased safety weight to ensure user protection
  const overall =
    breakdown.safety * 0.40 +
    breakdown.programming * 0.30 +
    breakdown.completeness * 0.20 +
    breakdown.personalization * 0.10;

  const grade = getGrade(overall);

  return {
    overall: Math.round(overall),
    grade,
    breakdown,
  };
}

/**
 * Calculate completeness score (data quality)
 */
function calculateCompletenessScore(workout: Workout): number {
  let score = 100;
  const exerciseCount = workout.exercises.length;

  // Check minimum exercise count (at least 3 exercises)
  if (exerciseCount < 3) {
    score -= 20;
  }

  // Check for complete exercise data
  workout.exercises.forEach((ex) => {
    // Description quality
    if (!ex.description || ex.description.length < 50) score -= 5;
    else if (ex.description.length < 100) score -= 2;

    // Form tips quality
    if (!ex.formTips || ex.formTips.length < 3) score -= 5;
    else if (ex.formTips.some((tip) => tip.length < 20)) score -= 2;

    // Safety tips quality
    if (!ex.safetyTips || ex.safetyTips.length < 2) score -= 5;
    else if (ex.safetyTips.some((tip) => tip.length < 20)) score -= 2;

    // Muscle groups
    if (!ex.muscleGroups || ex.muscleGroups.length === 0) score -= 3;
  });

  // Check for workout summary
  if (!workout.workoutSummary) {
    score -= 10;
  } else {
    if (!workout.workoutSummary.totalVolume) score -= 3;
    if (!workout.workoutSummary.primaryFocus) score -= 3;
    if (!workout.workoutSummary.expectedRPE) score -= 3;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate safety score (injury prevention and appropriate difficulty)
 * Rigorous safety checks to ensure user protection
 */
function calculateSafetyScore(workout: Workout, userProfile: UserProfile): number {
  let score = 100;

  // Check for safety tips in all exercises (CRITICAL)
  workout.exercises.forEach((ex) => {
    if (!ex.safetyTips || ex.safetyTips.length < 2) {
      score -= 8; // Increased penalty for missing safety tips
    } else if (ex.safetyTips.some((tip) => tip.length < 15)) {
      score -= 3; // Penalty for insufficient safety guidance
    }
  });

  // Check difficulty matches experience level (CRITICAL)
  const expectedDifficulty = userProfile.experience?.toLowerCase() || 'beginner';
  workout.exercises.forEach((ex) => {
    if (ex.difficulty && ex.difficulty.toLowerCase() !== expectedDifficulty) {
      score -= 5; // Increased penalty for difficulty mismatch
    }
  });

  // Check for appropriate rest periods (safety-critical)
  workout.exercises.forEach((ex) => {
    if (ex.restSeconds < 30) {
      score -= 15; // Too short, dangerous
    } else if (ex.restSeconds < 45) {
      score -= 8; // Borderline
    } else if (ex.restSeconds > 300) {
      score -= 3; // Excessive rest
    }
  });

  // Check for form tips quality (CRITICAL for safety)
  workout.exercises.forEach((ex) => {
    if (!ex.formTips || ex.formTips.length < 3) {
      score -= 5;
    } else if (ex.formTips.some((tip) => tip.length < 15)) {
      score -= 3; // Penalty for insufficient form guidance
    }
  });

  // Bonus for injury-aware programming (CRITICAL if user has injuries)
  if (userProfile.injuries && userProfile.injuries.length > 0) {
    // If user has injuries, workout should have more safety emphasis
    const avgSafetyTipLength =
      workout.exercises.reduce((sum, ex) => sum + (ex.safetyTips?.join(' ').length || 0), 0) /
      workout.exercises.length;

    if (avgSafetyTipLength > 120) {
      score += 8; // Bonus for detailed safety guidance
    } else if (avgSafetyTipLength > 80) {
      score += 4; // Partial bonus
    }
  }

  // Bonus for form emphasis (helps prevent injuries)
  const avgFormTipLength =
    workout.exercises.reduce((sum, ex) => sum + (ex.formTips?.join(' ').length || 0), 0) /
    workout.exercises.length;

  if (avgFormTipLength > 150) {
    score += 5; // Bonus for detailed form guidance
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate programming score (evidence-based programming principles)
 */
function calculateProgrammingScore(workout: Workout, userProfile: UserProfile): number {
  let score = 100;

  // Check for appropriate set ranges
  workout.exercises.forEach((ex) => {
    if (ex.sets < 1 || ex.sets > 10) {
      score -= 10;
    } else if (ex.sets < 2 || ex.sets > 6) {
      score -= 3;
    }
  });

  // Check for rep specification
  workout.exercises.forEach((ex) => {
    if (!ex.reps) {
      score -= 5;
    }
  });

  // Check for progressive ordering (compound first, isolation later)
  const compoundKeywords = ['squat', 'deadlift', 'press', 'row', 'pull-up', 'chin-up', 'lunge'];
  const isolationKeywords = ['curl', 'extension', 'raise', 'fly', 'flye'];

  let lastCompoundIndex = -1;
  let firstIsolationIndex = workout.exercises.length;

  workout.exercises.forEach((ex, index) => {
    const name = ex.name.toLowerCase();
    if (compoundKeywords.some((keyword) => name.includes(keyword))) {
      lastCompoundIndex = index;
    }
    if (isolationKeywords.some((keyword) => name.includes(keyword)) && index < firstIsolationIndex) {
      firstIsolationIndex = index;
    }
  });

  // Isolation exercises should come after compound exercises
  if (firstIsolationIndex < lastCompoundIndex) {
    score -= 5;
  }

  // Check for muscle group balance
  const muscleGroups = new Set<string>();
  workout.exercises.forEach((ex) => {
    ex.muscleGroups?.forEach((mg) => muscleGroups.add(mg.toLowerCase()));
  });

  const workoutType = userProfile.workoutType?.toLowerCase() || 'full body';
  if (workoutType.includes('full body')) {
    // Full body should hit multiple muscle groups
    if (muscleGroups.size < 4) {
      score -= 10;
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate personalization score (how well it matches user profile)
 */
function calculatePersonalizationScore(workout: Workout, userProfile: UserProfile): number {
  let score = 100;

  // Check exercise count matches duration
  const duration = userProfile.duration || 30;
  const exerciseCount = workout.exercises.length;

  const expectedMinExercises = Math.max(3, Math.floor(duration / 8));
  const expectedMaxExercises = Math.ceil(duration / 4);

  if (exerciseCount < expectedMinExercises) {
    score -= 15; // Too few exercises for duration
  } else if (exerciseCount > expectedMaxExercises) {
    score -= 10; // Too many exercises for duration
  }

  // Check equipment usage matches available equipment
  if (userProfile.equipment) {
    const hasWeightEquipment = userProfile.equipment.some((eq) =>
      ['dumbbells', 'barbells', 'kettlebells', 'resistance bands'].some((w) =>
        eq.toLowerCase().includes(w),
      ),
    );

    if (!hasWeightEquipment) {
      // User only has bodyweight - check if workout respects this
      const weightExercises = workout.exercises.filter((ex) => ex.usesWeight);
      if (weightExercises.length > 0) {
        score -= 20; // Prescribed weight exercises without equipment
      }
    }
  }

  // Check workout type match
  const workoutType = userProfile.workoutType?.toLowerCase() || 'full body';
  const muscleGroups = new Set<string>();
  workout.exercises.forEach((ex) => {
    ex.muscleGroups?.forEach((mg) => muscleGroups.add(mg.toLowerCase()));
  });

  if (workoutType.includes('upper') && Array.from(muscleGroups).some((mg) => mg.includes('quad') || mg.includes('hamstring') || mg.includes('glute'))) {
    score -= 10; // Upper body workout has leg exercises
  }

  if (workoutType.includes('lower') && !Array.from(muscleGroups).some((mg) => mg.includes('quad') || mg.includes('hamstring') || mg.includes('glute'))) {
    score -= 15; // Lower body workout missing leg exercises
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Convert numeric score to letter grade
 */
function getGrade(score: number): string {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 67) return 'D+';
  if (score >= 63) return 'D';
  if (score >= 60) return 'D-';
  return 'F';
}

