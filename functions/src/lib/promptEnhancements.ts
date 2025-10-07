/**
 * Professional prompt enhancements for AI workout generation
 * Provides coaching expertise and evidence-based guidance
 */

export interface PromptContext {
  experience?: string;
  goals?: string[];
  equipment?: string[];
  injuries?: string[];
  workoutType?: string;
  duration: number;
  targetIntensity: number;
  progressionNote?: string;
}

/**
 * Generate professional coaching context for the AI prompt
 */
export function generateCoachingContext(context: PromptContext): string {
  const coachingPoints: string[] = [];

  // Experience-based coaching
  switch (context.experience) {
  case 'Beginner':
    coachingPoints.push(
      'BEGINNER FOCUS: Prioritize movement quality over intensity. Teach fundamental patterns.',
      'Use 2-3 sets maximum per exercise to prevent overload and allow adaptation.',
      'Include detailed setup and execution cues in descriptions.',
      'Provide clear regression options for challenging movements.'
    );
    break;
  case 'Intermediate':
    coachingPoints.push(
      'INTERMEDIATE FOCUS: Challenge with progressive overload while maintaining form.',
      'Use 3-4 sets per exercise with moderate to challenging loads.',
      'Include advanced technique cues and common mistake corrections.',
      'Introduce movement variations and unilateral work.'
    );
    break;
  case 'Expert':
  case 'Advanced':
    coachingPoints.push(
      'ADVANCED FOCUS: Implement complex movement patterns and high-intensity techniques.',
      'Use 3-6 sets with varied rep ranges and advanced progressions.',
      'Include biomechanical optimization cues and performance tips.',
      'Challenge with compound movements and athletic variations.'
    );
    break;
  }

  // Goal-specific coaching
  context.goals?.forEach((goal) => {
    const goalLower = goal.toLowerCase();

    if (goalLower.includes('strength')) {
      coachingPoints.push(
        'STRENGTH COACHING: Focus on compound movements with 3-6 reps at high intensity.',
        'Emphasize proper bracing, tension, and force production.',
        'Use longer rest periods (2-3 minutes) for full recovery between sets.'
      );
    }

    if (goalLower.includes('muscle') || goalLower.includes('tone')) {
      coachingPoints.push(
        'HYPERTROPHY COACHING: Use 6-12 rep range with moderate loads.',
        'Focus on time under tension and mind-muscle connection.',
        'Include both compound and isolation exercises for complete development.'
      );
    }

    if (goalLower.includes('weight loss')) {
      coachingPoints.push(
        'FAT LOSS COACHING: Incorporate circuit-style training with shorter rest periods.',
        'Emphasize compound movements that burn more calories.',
        'Include metabolic finishers or cardio intervals when appropriate.'
      );
    }

    if (goalLower.includes('stamina') || goalLower.includes('endurance')) {
      coachingPoints.push(
        'ENDURANCE COACHING: Use higher rep ranges (12-20+) with shorter rest.',
        'Focus on movement efficiency and breathing patterns.',
        'Include cardio intervals and circuit training elements.'
      );
    }
  });

  // Injury-specific coaching
  if (context.injuries && context.injuries.length > 0) {
    coachingPoints.push(
      'INJURY CONSIDERATIONS: Modify exercises to work around limitations.',
      'Provide alternative movements that target same muscle groups safely.',
      'Include corrective exercises and mobility work when appropriate.',
      'Emphasize pain-free range of motion and proper movement patterns.'
    );
  }

  return coachingPoints.join('\n- ');
}

/**
 * Generate exercise selection guidelines based on context
 */
export function generateExerciseSelectionGuidelines(context: PromptContext): string {
  const guidelines: string[] = [];

  // Equipment-based selection
  if (!context.equipment || context.equipment.includes('Bodyweight')) {
    guidelines.push(
      'BODYWEIGHT FOCUS: Emphasize fundamental movement patterns.',
      'Use push-up variations, squat patterns, and core stability exercises.',
      'Include plyometric and cardio elements for variety and challenge.'
    );
  }

  if (context.equipment?.includes('Dumbbells')) {
    guidelines.push(
      'DUMBBELL TRAINING: Utilize unilateral work and stabilization challenges.',
      'Include compound movements like dumbbell deadlifts and presses.',
      'Use single-arm variations to challenge core stability.'
    );
  }

  if (context.equipment?.includes('Barbells')) {
    guidelines.push(
      'BARBELL TRAINING: Focus on heavy compound movements.',
      'Include squats, deadlifts, presses, and rows as primary exercises.',
      'Use bilateral loading for maximum strength development.'
    );
  }

  // Workout type specific guidelines
  if (context.workoutType?.toLowerCase().includes('cardio')) {
    guidelines.push(
      'CARDIO STRUCTURE: Maintain elevated heart rate throughout session.',
      'Use interval methods for variety.',
      'Include both steady-state and interval components.'
    );
  }

  return guidelines.join('\n- ');
}

/**
 * Generate safety and form emphasis based on context
 */
export function generateSafetyEmphasis(context: PromptContext): string {
  const safetyPoints: string[] = [
    'UNIVERSAL SAFETY PRINCIPLES:',
    '- Always prioritize proper form over load or speed',
    '- Include proper breathing cues (exhale on exertion)',
    '- Emphasize controlled movement in both concentric and eccentric phases',
    '- Provide clear setup and alignment cues',
    '- Include modification options for different fitness levels',
  ];

  // Injury-specific safety
  context.injuries?.forEach((injury) => {
    const injuryLower = injury.toLowerCase();

    if (injuryLower.includes('knee')) {
      safetyPoints.push(
        '- KNEE SAFETY: Avoid deep knee flexion, ensure proper tracking',
        '- Modify jumping and pivoting movements',
        '- Include knee-friendly alternatives like wall sits or glute bridges'
      );
    }

    if (injuryLower.includes('back') || injuryLower.includes('spine')) {
      safetyPoints.push(
        '- BACK SAFETY: Maintain neutral spine alignment',
        '- Avoid spinal flexion under load',
        '- Include core activation cues and bracing techniques'
      );
    }

    if (injuryLower.includes('shoulder')) {
      safetyPoints.push(
        '- SHOULDER SAFETY: Avoid overhead movements if impingement present',
        '- Include scapular stability and mobility work',
        '- Modify pressing movements to pain-free ranges'
      );
    }
  });

  // Experience-based safety
  if (context.experience === 'Beginner') {
    safetyPoints.push(
      '- BEGINNER SAFETY: Start with bodyweight or light resistance',
      '- Focus on learning movement patterns before adding load',
      '- Include detailed setup instructions and common mistake warnings'
    );
  }

  return safetyPoints.join('\n');
}

/**
 * Generate progression and regression options
 */
export function generateProgressionGuidance(context: PromptContext): string {
  const progressionPoints: string[] = [
    'PROGRESSION PRINCIPLES:',
    '- Increase difficulty gradually (10% rule)',
    '- Progress complexity before intensity',
    '- Master bodyweight before adding external load',
    '- Use time, range of motion, or stability challenges as progressions',
  ];

  if (context.targetIntensity > 1.1) {
    progressionPoints.push(
      '- INTENSITY INCREASE: User ready for moderate challenge increase',
      '- Add 1-2 reps, reduce rest by 10-15 seconds, or increase range of motion',
      '- Include more challenging exercise variations'
    );
  } else if (context.targetIntensity < 0.9) {
    progressionPoints.push(
      '- INTENSITY DECREASE: User needs recovery or easier variations',
      '- Reduce reps by 2-3, increase rest by 15-30 seconds',
      '- Use regression options and assisted movements'
    );
  }

  progressionPoints.push(
    'REGRESSION OPTIONS:',
    '- Reduce range of motion for mobility limitations',
    '- Use assisted variations (bands, partner, or equipment support)',
    '- Decrease load or switch to bodyweight alternatives',
    '- Modify tempo to slower, more controlled movements'
  );

  return progressionPoints.join('\n- ');
}

/**
 * Generate complete professional coaching prompt enhancement
 */
export function generateProfessionalPromptEnhancement(context: PromptContext): string {
  return `
PROFESSIONAL COACHING EXPERTISE:
- ${generateCoachingContext(context)}

EXERCISE SELECTION STRATEGY:
- ${generateExerciseSelectionGuidelines(context)}

${generateSafetyEmphasis(context)}

${generateProgressionGuidance(context)}

QUALITY STANDARDS:
- Each exercise description must include: setup, execution, key cues, and breathing
- Form tips should address the most common technique errors
- Safety tips must include injury prevention and modification options
- Rest periods should be physiologically appropriate for the training goal
- Exercise difficulty should match user experience level
- Workout structure should follow logical progression (warm-up → main work → cool-down)

PROFESSIONAL LANGUAGE:
- Use clear, instructional language without jargon
- Provide specific, actionable cues
- Include positive reinforcement and motivation
- Address common concerns and mistakes proactively
- Maintain encouraging but authoritative tone throughout
`.trim();
}