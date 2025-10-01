/**
 * Professional workout quality scoring system
 * Evaluates AI-generated workouts against fitness industry standards
 */

export interface QualityScore {
  overall: number; // 0-100
  breakdown: {
    programming: number; // Evidence-based set/rep/rest schemes
    safety: number; // Injury prevention and contraindications
    progression: number; // Appropriate difficulty scaling
    balance: number; // Movement pattern and muscle group balance
    specificity: number; // Goal alignment and exercise selection
    feasibility: number; // Time and equipment constraints
  };
  feedback: string[];
  recommendations: string[];
}

export interface WorkoutPlan {
  exercises: Array<{
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
  }>;
  workoutSummary?: {
    totalVolume: string;
    primaryFocus: string;
    expectedRPE: string;
  };
}

export interface UserProfile {
  experience?: string;
  goals?: string[];
  equipment?: string[];
  injuries?: string[];
  duration: number;
  workoutType?: string;
}

/**
 * Evaluates workout quality against professional standards
 */
export function scoreWorkoutQuality(workout: WorkoutPlan, userProfile: UserProfile): QualityScore {
  const score: QualityScore = {
    overall: 0,
    breakdown: {
      programming: 0,
      safety: 0,
      progression: 0,
      balance: 0,
      specificity: 0,
      feasibility: 0,
    },
    feedback: [],
    recommendations: [],
  };

  // Score each component
  score.breakdown.programming = scoreProgramming(workout, userProfile, score);
  score.breakdown.safety = scoreSafety(workout, userProfile, score);
  score.breakdown.progression = scoreProgression(workout, userProfile, score);
  score.breakdown.balance = scoreBalance(workout, userProfile, score);
  score.breakdown.specificity = scoreSpecificity(workout, userProfile, score);
  score.breakdown.feasibility = scoreFeasibility(workout, userProfile, score);

  // Calculate overall score (weighted average)
  const weights = {
    programming: 0.2,
    safety: 0.25, // Highest weight - safety first
    progression: 0.15,
    balance: 0.15,
    specificity: 0.15,
    feasibility: 0.1,
  };

  score.overall = Math.round(
    Object.entries(score.breakdown).reduce((total, [key, value]) => {
      return total + value * (weights[key as keyof typeof weights] ?? 0);
    }, 0)
  );

  // Add overall feedback based on score
  if (score.overall >= 90) {
    score.feedback.push('Excellent workout quality - meets professional standards');
  } else if (score.overall >= 80) {
    score.feedback.push('Good workout quality with minor areas for improvement');
  } else if (score.overall >= 70) {
    score.feedback.push('Acceptable workout quality but needs refinement');
  } else {
    score.feedback.push('Workout quality below professional standards - significant improvements needed');
  }

  return score;
}

/**
 * Score evidence-based programming principles
 */
function scoreProgramming(workout: WorkoutPlan, userProfile: UserProfile, score: QualityScore): number {
  let programmingScore = 100;
  const exercises = workout.exercises;

  // Check set/rep schemes and rest periods
  exercises.forEach((exercise) => {
    // Sets validation
    if (exercise.sets < 1 || exercise.sets > 8) {
      programmingScore -= 10;
      score.feedback.push(`${exercise.name}: Unusual set count (${exercise.sets})`);
    }

    // Enhanced rest periods validation based on exercise type
    const exerciseName = exercise.name.toLowerCase();
    let minRestSeconds = 30;
    let optimalRestSeconds = 60;

    // Determine appropriate rest based on exercise type
    if (
      exerciseName.includes('squat') ||
      exerciseName.includes('deadlift') ||
      exerciseName.includes('press') ||
      exerciseName.includes('row')
    ) {
      minRestSeconds = 120;
      optimalRestSeconds = 150;
    } else if (
      exerciseName.includes('curl') ||
      exerciseName.includes('extension') ||
      exerciseName.includes('raise') ||
      exerciseName.includes('fly')
    ) {
      minRestSeconds = 60;
      optimalRestSeconds = 75;
    } else if (exerciseName.includes('jump') || exerciseName.includes('sprint') || exerciseName.includes('burpee')) {
      minRestSeconds = 45;
      optimalRestSeconds = 60;
    }

    if (exercise.restSeconds < minRestSeconds) {
      programmingScore -= 20; // Heavy penalty for inadequate rest
      score.feedback.push(
        `${exercise.name}: Rest period too short (${exercise.restSeconds}s, need ${minRestSeconds}s+)`
      );
    } else if (exercise.restSeconds < optimalRestSeconds) {
      programmingScore -= 10; // Moderate penalty for suboptimal rest
      score.recommendations.push(`${exercise.name}: Consider longer rest (${optimalRestSeconds}s optimal)`);
    } else if (exercise.restSeconds > 300) {
      programmingScore -= 5;
      score.feedback.push(`${exercise.name}: Rest period very long (${exercise.restSeconds}s)`);
    }

    // Rep scheme validation
    if (typeof exercise.reps === 'number') {
      if (exercise.reps < 1 || exercise.reps > 30) {
        programmingScore -= 10;
        score.feedback.push(`${exercise.name}: Rep count outside typical range`);
      }
    } else if (typeof exercise.reps === 'string') {
      // Basic validation for string reps (e.g., "8-12" or "30s")
      if (!/^\d+-\d+$|^\d+s$/.test(exercise.reps)) {
        programmingScore -= 5;
        score.feedback.push(`${exercise.name}: Unusual rep format (${exercise.reps})`);
      }
    }
  });

  // Check for progressive structure
  const hasWarmup = exercises.some(
    (ex) => ex.name.toLowerCase().includes('warm') || ex.difficulty === 'beginner'
  );

  if (!hasWarmup && userProfile.duration >= 20) {
    programmingScore -= 15;
    score.recommendations.push('Include dynamic warm-up for injury prevention');
  }

  return Math.max(0, programmingScore);
}

/**
 * Score safety considerations and injury prevention
 */
function scoreSafety(workout: WorkoutPlan, userProfile: UserProfile, score: QualityScore): number {
  let safetyScore = 100;
  const exercises = workout.exercises;
  const injuries = userProfile.injuries || [];

  // Check for injury contraindications
  const contraindications: Record<string, string[]> = {
    knee: ['deep squat', 'lunge', 'jump', 'plyometric'],
    'lower back': ['deadlift', 'good morning', 'bent over row', 'sit up'],
    shoulder: ['overhead press', 'behind neck', 'upright row'],
    ankle: ['jump', 'plyometric', 'calf raise'],
    wrist: ['push up', 'plank', 'handstand'],
    neck: ['overhead press', 'behind neck', 'headstand'],
  };

  injuries.forEach((injury) => {
    const contraindicatedMovements = contraindications[injury.toLowerCase()] || [];
    exercises.forEach((exercise) => {
      const exerciseName = exercise.name.toLowerCase();
      const hasContraindication = contraindicatedMovements.some((movement) => exerciseName.includes(movement));

      if (hasContraindication) {
        safetyScore -= 25;
        score.feedback.push(`${exercise.name}: May be contraindicated for ${injury} injury`);
      }
    });
  });

  // Check for safety tips
  exercises.forEach((exercise) => {
    if (!exercise.safetyTips || exercise.safetyTips.length === 0) {
      safetyScore -= 5;
      score.recommendations.push(`${exercise.name}: Add safety tips for injury prevention`);
    }

    if (!exercise.formTips || exercise.formTips.length === 0) {
      safetyScore -= 5;
      score.recommendations.push(`${exercise.name}: Add form cues for proper technique`);
    }
  });

  return Math.max(0, safetyScore);
}

/**
 * Score progression appropriateness
 */
function scoreProgression(workout: WorkoutPlan, userProfile: UserProfile, score: QualityScore): number {
  let progressionScore = 100;
  const exercises = workout.exercises;
  const experience = userProfile.experience?.toLowerCase() || 'beginner';

  exercises.forEach((exercise) => {
    const difficulty = exercise.difficulty?.toLowerCase() || 'intermediate';

    // Check experience-difficulty alignment
    if (experience === 'beginner' && difficulty === 'advanced') {
      progressionScore -= 20;
      score.feedback.push(`${exercise.name}: Too advanced for beginner level`);
    }

    if (experience === 'expert' && difficulty === 'beginner' && exercises.length < 3) {
      progressionScore -= 10;
      score.recommendations.push('Consider more challenging variations for experienced users');
    }
  });

  return Math.max(0, progressionScore);
}

/**
 * Score movement pattern and muscle group balance
 */
function scoreBalance(workout: WorkoutPlan, userProfile: UserProfile, score: QualityScore): number {
  let balanceScore = 100;
  const exercises = workout.exercises;

  // Analyze muscle group distribution
  const muscleGroups: Record<string, number> = {};
  exercises.forEach((exercise) => {
    if (exercise.muscleGroups) {
      exercise.muscleGroups.forEach((group) => {
        muscleGroups[group] = (muscleGroups[group] || 0) + 1;
      });
    }
  });

  // Check push/pull balance
  const pushGroups = ['chest', 'shoulders', 'triceps'];
  const pullGroups = ['back', 'biceps', 'rear delts'];

  const pushCount = pushGroups.reduce((sum, group) => sum + (muscleGroups[group] || 0), 0);
  const pullCount = pullGroups.reduce((sum, group) => sum + (muscleGroups[group] || 0), 0);

  if (pushCount > 0 && pullCount === 0) {
    balanceScore -= 15;
    score.recommendations.push('Add pulling movements to balance pushing exercises');
  }

  if (pullCount > 0 && pushCount === 0) {
    balanceScore -= 15;
    score.recommendations.push('Add pushing movements to balance pulling exercises');
  }

  // Check for lower body inclusion in full-body workouts
  const lowerBodyGroups = ['quadriceps', 'hamstrings', 'glutes', 'calves'];
  const lowerBodyCount = lowerBodyGroups.reduce((sum, group) => sum + (muscleGroups[group] || 0), 0);

  if (userProfile.workoutType?.toLowerCase().includes('full') && lowerBodyCount === 0) {
    balanceScore -= 20;
    score.feedback.push('Full-body workout should include lower body exercises');
  }

  return Math.max(0, balanceScore);
}

/**
 * Score goal specificity and exercise selection
 */
function scoreSpecificity(workout: WorkoutPlan, userProfile: UserProfile, score: QualityScore): number {
  let specificityScore = 100;
  const goals = userProfile.goals || [];
  const exercises = workout.exercises;

  goals.forEach((goal) => {
    const goalLower = goal.toLowerCase();

    if (goalLower.includes('strength')) {
      // Should have compound movements with lower rep ranges
      const hasCompound = exercises.some(
        (ex) =>
          ex.name.toLowerCase().includes('squat') ||
          ex.name.toLowerCase().includes('deadlift') ||
          ex.name.toLowerCase().includes('press')
      );

      if (!hasCompound) {
        specificityScore -= 15;
        score.recommendations.push('Include compound movements for strength goals');
      }
    }

    if (goalLower.includes('cardio') || goalLower.includes('stamina')) {
      // Should have cardio or circuit-style exercises
      const hasCardio = exercises.some(
        (ex) => ex.name.toLowerCase().includes('jump') || ex.name.toLowerCase().includes('run') || ex.restSeconds < 45
      );

      if (!hasCardio) {
        specificityScore -= 15;
        score.recommendations.push('Include cardio elements for endurance goals');
      }
    }
  });

  return Math.max(0, specificityScore);
}

/**
 * Score time and equipment feasibility
 */
function scoreFeasibility(workout: WorkoutPlan, userProfile: UserProfile, score: QualityScore): number {
  let feasibilityScore = 100;
  const exercises = workout.exercises;
  const targetDuration = userProfile.duration;
  const availableEquipment = userProfile.equipment || [];

  // Estimate workout duration
  let estimatedTime = 0;
  exercises.forEach((exercise) => {
    let workTime = 30; // Default seconds per set
    if (typeof exercise.reps === 'number') {
      workTime = exercise.reps * 3; // 3 seconds per rep
    } else if (typeof exercise.reps === 'string') {
      if (exercise.reps.includes('s')) {
        workTime = parseInt(exercise.reps, 10) || 30;
      } else if (exercise.reps.includes('-')) {
        const [min, max] = exercise.reps.split('-').map(Number);
        workTime = ((min + (max ?? min)) / 2) * 3;
      }
    }

    const totalWorkTime = workTime * exercise.sets;
    const totalRestTime = exercise.restSeconds * (exercise.sets - 1);
    estimatedTime += totalWorkTime + totalRestTime;
  });

  estimatedTime = Math.ceil(estimatedTime / 60); // Convert to minutes

  // Check time feasibility
  if (estimatedTime > targetDuration * 1.3) {
    feasibilityScore -= 20;
    score.feedback.push(
      `Estimated time (${estimatedTime}min) significantly exceeds target (${targetDuration}min)`
    );
  }

  if (estimatedTime < targetDuration * 0.6) {
    feasibilityScore -= 10;
    score.recommendations.push(`Workout may be shorter than expected (${estimatedTime}min vs ${targetDuration}min)`);
  }

  // Check equipment requirements
  exercises.forEach((exercise) => {
    if (exercise.usesWeight && availableEquipment.length > 0) {
      const needsEquipment = !availableEquipment.some(
        (eq) =>
          eq.toLowerCase().includes('dumbbell') ||
          eq.toLowerCase().includes('barbell') ||
          eq.toLowerCase().includes('weight')
      );

      if (needsEquipment && !availableEquipment.includes('Bodyweight')) {
        feasibilityScore -= 10;
        score.feedback.push(`${exercise.name}: Requires equipment not in user's list`);
      }
    }
  });

  return Math.max(0, feasibilityScore);
}