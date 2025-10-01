/**
 * Professional exercise database with evidence-based programming
 * Provides exercise templates and programming guidelines for AI workout generation
 */

export interface ExerciseTemplate {
  name: string;
  category: 'compound' | 'isolation' | 'cardio' | 'mobility' | 'core';
  muscleGroups: string[];
  equipment: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  contraindications: string[];
  description: string;
  formTips: string[];
  safetyTips: string[];
  progressions: string[];
  regressions: string[];
  usesWeight: boolean;
}

export interface ProgrammingGuidelines {
  strength: {
    sets: [number, number];
    reps: [number, number];
    restSeconds: [number, number];
    intensity: string;
  };
  hypertrophy: {
    sets: [number, number];
    reps: [number, number];
    restSeconds: [number, number];
    intensity: string;
  };
  endurance: {
    sets: [number, number];
    reps: [number, number];
    restSeconds: [number, number];
    intensity: string;
  };
}

// Evidence-based programming guidelines by goal
export const PROGRAMMING_GUIDELINES: ProgrammingGuidelines = {
  strength: {
    sets: [3, 6],
    reps: [1, 6],
    restSeconds: [150, 300], // Increased minimum for strength training
    intensity: '85-100% 1RM',
  },
  hypertrophy: {
    sets: [3, 5],
    reps: [6, 12],
    restSeconds: [75, 150], // Increased for better recovery
    intensity: '65-85% 1RM',
  },
  endurance: {
    sets: [2, 4],
    reps: [12, 25],
    restSeconds: [45, 90], // Increased minimum for adequate recovery
    intensity: '40-65% 1RM',
  },
};

// Core compound movement templates
export const COMPOUND_EXERCISES: ExerciseTemplate[] = [
  {
    name: 'Bodyweight Squat',
    category: 'compound',
    muscleGroups: ['quadriceps', 'glutes', 'hamstrings', 'core'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    contraindications: ['knee'],
    description:
      'Stand with feet shoulder-width apart, toes slightly turned out. Lower your body by pushing hips back and bending knees, keeping chest up and weight on heels. Descend until thighs are parallel to floor. Drive through heels to return to starting position. Breathe in on the way down, out on the way up.',
    formTips: [
      'Keep knees tracking over toes, not caving inward',
      'Maintain neutral spine with chest up throughout movement',
      'Drive through heels, not toes, when standing up',
    ],
    safetyTips: [
      'Stop if you feel knee pain and reduce range of motion',
      'Keep weight evenly distributed across both feet',
      'Start with partial range of motion if mobility is limited',
    ],
    progressions: ['Goblet Squat', 'Jump Squat', 'Single-Leg Squat'],
    regressions: ['Chair-Assisted Squat', 'Wall Squat', 'Partial Range Squat'],
    usesWeight: false,
  },
  {
    name: 'Push-Up',
    category: 'compound',
    muscleGroups: ['chest', 'shoulders', 'triceps', 'core'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    contraindications: ['wrist', 'shoulder'],
    description:
      'Start in plank position with hands slightly wider than shoulders, body in straight line from head to heels. Lower chest toward floor by bending elbows, keeping them at 45-degree angle to body. Push back up to starting position. Breathe in on the way down, out on the way up.',
    formTips: [
      'Maintain straight line from head to heels throughout movement',
      'Keep elbows at 45-degree angle, not flared out to sides',
      'Lower chest to within 2-3 inches of floor for full range',
    ],
    safetyTips: [
      'Modify on knees if unable to maintain proper form',
      'Stop if you feel wrist or shoulder pain',
      'Keep core engaged to prevent lower back sagging',
    ],
    progressions: ['Decline Push-Up', 'Diamond Push-Up', 'Single-Arm Push-Up'],
    regressions: ['Knee Push-Up', 'Incline Push-Up', 'Wall Push-Up'],
    usesWeight: false,
  },
  {
    name: 'Dumbbell Deadlift',
    category: 'compound',
    muscleGroups: ['hamstrings', 'glutes', 'lower back', 'traps'],
    equipment: ['dumbbells'],
    difficulty: 'intermediate',
    contraindications: ['lower back'],
    description:
      'Stand with feet hip-width apart, holding dumbbells at sides. Hinge at hips by pushing butt back, keeping slight bend in knees. Lower dumbbells along legs until you feel stretch in hamstrings. Drive hips forward to return to standing. Breathe in on the way down, out on the way up.',
    formTips: [
      'Keep dumbbells close to legs throughout entire movement',
      'Maintain neutral spine - no rounding or excessive arching',
      'Initiate movement with hip hinge, not knee bend',
    ],
    safetyTips: [
      'Start with light weight to master movement pattern',
      'Stop if you feel lower back pain or rounding',
      'Keep shoulders pulled back and chest up',
    ],
    progressions: ['Romanian Deadlift', 'Single-Leg Deadlift', 'Sumo Deadlift'],
    regressions: ['Dumbbell Rack Pull', 'Kettlebell Deadlift', 'Bodyweight Hip Hinge'],
    usesWeight: true,
  },
];

// Isolation exercise templates
export const ISOLATION_EXERCISES: ExerciseTemplate[] = [
  {
    name: 'Dumbbell Bicep Curl',
    category: 'isolation',
    muscleGroups: ['biceps'],
    equipment: ['dumbbells'],
    difficulty: 'beginner',
    contraindications: ['wrist'],
    description:
      'Stand with feet hip-width apart, holding dumbbells at sides with palms facing forward. Keeping elbows stationary at sides, curl weights up by contracting biceps. Slowly lower back to starting position with control. Breathe out on the way up, in on the way down.',
    formTips: [
      'Keep elbows pinned to sides throughout movement',
      'Control the weight on both up and down phases',
      'Squeeze biceps at the top of the movement',
    ],
    safetyTips: [
      'Avoid swinging or using momentum to lift weight',
      'Start with lighter weight to establish proper form',
      'Stop if you feel elbow or wrist discomfort',
    ],
    progressions: ['Hammer Curl', 'Concentration Curl', '21s Curl'],
    regressions: ['Resistance Band Curl', 'Assisted Curl', 'Partial Range Curl'],
    usesWeight: true,
  },
];

// Cardio exercise templates
export const CARDIO_EXERCISES: ExerciseTemplate[] = [
  {
    name: 'High Knees',
    category: 'cardio',
    muscleGroups: ['quadriceps', 'hip flexors', 'calves'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    contraindications: ['knee', 'ankle'],
    description:
      'Stand tall with feet hip-width apart. Lift one knee up toward chest, then quickly switch to lift other knee. Continue alternating at a rapid pace while pumping arms. Land softly on balls of feet. Maintain steady breathing throughout.',
    formTips: [
      'Lift knees to hip height or as high as comfortable',
      'Stay light on feet with quick, bouncy steps',
      'Keep core engaged and posture upright',
    ],
    safetyTips: [
      'Land softly to reduce impact on joints',
      'Modify by marching in place if high impact is uncomfortable',
      'Stop if you feel knee or ankle pain',
    ],
    progressions: ['High Knees with Resistance Band', 'High Knees to Burpee'],
    regressions: ['Marching in Place', 'Slow High Knees', 'Seated High Knees'],
    usesWeight: false,
  },
];

// Mobility and warm-up templates
export const MOBILITY_EXERCISES: ExerciseTemplate[] = [
  {
    name: 'Arm Circles',
    category: 'mobility',
    muscleGroups: ['shoulders', 'upper back'],
    equipment: ['bodyweight'],
    difficulty: 'beginner',
    contraindications: [],
    description:
      'Stand with feet shoulder-width apart, arms extended out to sides at shoulder height. Make small circles with arms, gradually increasing size. Perform in both forward and backward directions. Keep movements controlled and smooth.',
    formTips: [
      'Start with small circles and gradually increase size',
      'Keep arms straight and parallel to floor',
      'Maintain good posture with shoulders down and back',
    ],
    safetyTips: [
      'Move slowly and controlled, especially if shoulders are tight',
      'Stop if you feel any sharp pain or discomfort',
      'Reduce range of motion if needed',
    ],
    progressions: ['Arm Circles with Light Weights'],
    regressions: ['Seated Arm Circles', 'Smaller Range Arm Circles'],
    usesWeight: false,
  },
];

/**
 * Get exercise recommendations based on user profile and workout goals
 */
export function getExerciseRecommendations(
  userProfile: {
    experience?: string;
    goals?: string[];
    equipment?: string[];
    injuries?: string[];
    workoutType?: string;
  }
): ExerciseTemplate[] {
  const allExercises = [
    ...COMPOUND_EXERCISES,
    ...ISOLATION_EXERCISES,
    ...CARDIO_EXERCISES,
    ...MOBILITY_EXERCISES,
  ];

  return allExercises.filter((exercise) => {
    // Filter by available equipment
    if (userProfile.equipment && userProfile.equipment.length > 0) {
      const hasRequiredEquipment = exercise.equipment.some((eq) =>
        userProfile.equipment!.some(
          (userEq) =>
            userEq.toLowerCase().includes(eq.toLowerCase()) || eq.toLowerCase().includes(userEq.toLowerCase())
        )
      );
      if (!hasRequiredEquipment) return false;
    }

    // Filter by experience level
    if (userProfile.experience?.toLowerCase() === 'beginner' && exercise.difficulty === 'advanced') {
      return false;
    }

    // Filter by injury contraindications
    if (userProfile.injuries && userProfile.injuries.length > 0) {
      const hasContraindication = exercise.contraindications.some((contraindication) =>
        userProfile.injuries!.some((injury) =>
          injury.toLowerCase().includes(contraindication.toLowerCase())
        )
      );
      if (hasContraindication) return false;
    }

    // Filter by workout type
    if (userProfile.workoutType) {
      const workoutType = userProfile.workoutType.toLowerCase();
      if (workoutType.includes('strength') && exercise.category === 'cardio') return false;
      if (workoutType.includes('cardio') && exercise.category === 'isolation') return false;
      if (workoutType.includes('mobility') && exercise.category !== 'mobility') return false;
    }

    return true;
  });
}

/**
 * Get programming recommendations based on goals
 */
export function getProgrammingRecommendations(
  goals: string[],
  _experience: string
): Partial<ProgrammingGuidelines[keyof ProgrammingGuidelines]> {
  const primaryGoal = goals[0]?.toLowerCase() || 'general health';

  if (primaryGoal.includes('strength')) {
    return PROGRAMMING_GUIDELINES.strength;
  } else if (primaryGoal.includes('muscle') || primaryGoal.includes('tone')) {
    return PROGRAMMING_GUIDELINES.hypertrophy;
  } else if (primaryGoal.includes('stamina') || primaryGoal.includes('endurance')) {
    return PROGRAMMING_GUIDELINES.endurance;
  }

  // Default to hypertrophy for general fitness
  return PROGRAMMING_GUIDELINES.hypertrophy;
}