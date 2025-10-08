/**
 * Evidence-based programming guidelines for AI workout generation
 * Provides scientifically-backed set/rep/rest ranges based on training goals
 */

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
    restSeconds: [150, 300],
    intensity: '85-100% 1RM',
  },
  hypertrophy: {
    sets: [3, 5],
    reps: [6, 12],
    restSeconds: [75, 150],
    intensity: '65-85% 1RM',
  },
  endurance: {
    sets: [2, 4],
    reps: [12, 25],
    restSeconds: [45, 90],
    intensity: '40-65% 1RM',
  },
};

/**
 * Get programming recommendations based on user goals
 * Returns evidence-based set/rep/rest ranges to guide AI workout generation
 */
export function getProgrammingRecommendations(
  goals: string[],
  _experience: string,
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