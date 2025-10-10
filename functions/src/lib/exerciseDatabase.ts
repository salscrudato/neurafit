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
 * Experience-level adjustments for programming
 * Modifies base programming based on training experience
 */
export interface ExperienceLevelAdjustments {
  volumeMultiplier: number; // Multiplier for total sets
  intensityAdjustment: string; // Adjustment to intensity ranges
  complexityGuidance: string; // Exercise selection guidance
  restAdjustment: number; // Seconds to add/subtract from rest periods
  formEmphasis: string; // Focus areas for form cues
}

export const EXPERIENCE_ADJUSTMENTS: Record<string, ExperienceLevelAdjustments> = {
  beginner: {
    volumeMultiplier: 0.8, // Lower volume for beginners
    intensityAdjustment: 'Use lower end of intensity range (60-75% 1RM)',
    complexityGuidance:
      'Focus on bilateral, stable exercises. Prioritize machines and bodyweight. Avoid complex barbell movements.',
    restAdjustment: 30, // Extra rest for beginners
    formEmphasis:
      'Emphasize proper setup, controlled tempo, and full range of motion. Include detailed breathing cues.',
  },
  intermediate: {
    volumeMultiplier: 1.0, // Standard volume
    intensityAdjustment: 'Use mid-range intensity (70-85% 1RM)',
    complexityGuidance:
      'Include mix of bilateral and unilateral exercises. Free weights and cables. Moderate complexity barbell work.',
    restAdjustment: 0, // Standard rest periods
    formEmphasis:
      'Focus on movement quality, tempo control, and mind-muscle connection. Include technique refinements.',
  },
  advanced: {
    volumeMultiplier: 1.2, // Higher volume for advanced
    intensityAdjustment: 'Use full intensity range (75-95% 1RM)',
    complexityGuidance:
      'Include complex movements, advanced variations, and high-skill exercises. Olympic lifts and plyometrics appropriate.',
    restAdjustment: -15, // Shorter rest for advanced (better recovery)
    formEmphasis:
      'Emphasize advanced techniques, explosive power, and movement efficiency. Include performance optimization cues.',
  },
};

/**
 * Get programming recommendations based on user goals and experience level
 * Returns evidence-based set/rep/rest ranges adjusted for experience
 */
export function getProgrammingRecommendations(
  goals: string[],
  experience: string,
): Partial<ProgrammingGuidelines[keyof ProgrammingGuidelines]> & {
  experienceAdjustments?: ExperienceLevelAdjustments;
} {
  const primaryGoal = goals[0]?.toLowerCase() || 'general health';
  const experienceLevel = experience?.toLowerCase() || 'beginner';

  // Get base programming for goal
  let baseProgramming: Partial<ProgrammingGuidelines[keyof ProgrammingGuidelines]>;

  if (primaryGoal.includes('strength')) {
    baseProgramming = PROGRAMMING_GUIDELINES.strength;
  } else if (primaryGoal.includes('muscle') || primaryGoal.includes('tone')) {
    baseProgramming = PROGRAMMING_GUIDELINES.hypertrophy;
  } else if (primaryGoal.includes('stamina') || primaryGoal.includes('endurance')) {
    baseProgramming = PROGRAMMING_GUIDELINES.endurance;
  } else {
    // Default to hypertrophy for general fitness
    baseProgramming = PROGRAMMING_GUIDELINES.hypertrophy;
  }

  // Get experience-level adjustments
  const experienceAdjustments =
    EXPERIENCE_ADJUSTMENTS[experienceLevel] || EXPERIENCE_ADJUSTMENTS.beginner;

  // Apply experience-level adjustments to rest periods
  const restAdjustment = experienceAdjustments?.restAdjustment || 0;
  const adjustedRestSeconds: [number, number] = [
    Math.max(45, (baseProgramming.restSeconds?.[0] || 60) + restAdjustment),
    Math.max(60, (baseProgramming.restSeconds?.[1] || 120) + restAdjustment),
  ];

  return {
    ...baseProgramming,
    restSeconds: adjustedRestSeconds,
    experienceAdjustments,
  };
}

/**
 * Get experience-specific exercise selection guidance
 */
export function getExperienceGuidance(experience: string): string {
  const experienceLevel = experience?.toLowerCase() || 'beginner';
  const adjustments = EXPERIENCE_ADJUSTMENTS[experienceLevel] || EXPERIENCE_ADJUSTMENTS.beginner;

  if (!adjustments) {
    return '';
  }

  return `\n\nEXPERIENCE-LEVEL GUIDANCE (${experience.toUpperCase()}):
Volume Adjustment: ${adjustments.volumeMultiplier}x standard volume
Intensity: ${adjustments.intensityAdjustment}
Exercise Complexity: ${adjustments.complexityGuidance}
Rest Period Adjustment: ${adjustments.restAdjustment > 0 ? '+' : ''}${adjustments.restAdjustment} seconds
Form Emphasis: ${adjustments.formEmphasis}`;
}