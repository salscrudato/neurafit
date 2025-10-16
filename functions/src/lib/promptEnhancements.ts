/**
 * Simplified prompt enhancements for AI workout generation
 * Focuses on quality standards, injury-specific safety, and experience-level guidance
 */

export interface PromptContext {
  injuries?: string[];
  experience?: string;
}

/**
 * Generate injury-specific safety guidance
 */
function generateInjurySafetyGuidance(injuries?: string[]): string {
  if (!injuries || injuries.length === 0) {
    return '';
  }

  const safetyPoints: string[] = ['\nINJURY-SPECIFIC SAFETY:'];

  injuries.forEach((injury) => {
    const injuryLower = injury.toLowerCase();

    if (injuryLower.includes('knee')) {
      safetyPoints.push(
        '- KNEE SAFETY: Avoid deep knee flexion, ensure proper tracking',
        '- Modify jumping and pivoting movements',
        '- Use knee-friendly alternatives like wall sits or glute bridges',
      );
    }

    if (injuryLower.includes('back') || injuryLower.includes('spine')) {
      safetyPoints.push(
        '- BACK SAFETY: Maintain neutral spine alignment',
        '- Avoid spinal flexion under load',
        '- Include core activation cues and bracing techniques',
      );
    }

    if (injuryLower.includes('shoulder')) {
      safetyPoints.push(
        '- SHOULDER SAFETY: Avoid overhead movements if impingement present',
        '- Include scapular stability and mobility work',
        '- Modify pressing movements to pain-free ranges',
      );
    }

    if (injuryLower.includes('ankle')) {
      safetyPoints.push(
        '- ANKLE SAFETY: Avoid jumping and plyometric movements',
        '- Modify balance and stability exercises',
        '- Use seated or supported alternatives',
      );
    }

    if (injuryLower.includes('wrist')) {
      safetyPoints.push(
        '- WRIST SAFETY: Avoid exercises requiring wrist extension under load',
        '- Use fist position or parallettes for push-ups',
        '- Modify plank variations to forearms',
      );
    }
  });

  return safetyPoints.join('\n');
}

/**
 * Generate experience-specific form and safety guidance
 */
function generateExperienceGuidance(experience?: string): string {
  const level = experience?.toLowerCase() || 'beginner';

  const experienceGuidance: Record<string, string> = {
    beginner: `
BEGINNER-SPECIFIC GUIDANCE:
- Form Tips: Focus on fundamental movement patterns, proper setup, and controlled tempo
  * Include detailed setup instructions (foot placement, grip width, body position)
  * Emphasize slow, controlled movement (3-second eccentric, 1-second concentric)
  * Provide clear breathing cues (exhale on exertion, inhale on return)
  * Highlight common beginner mistakes to avoid
- Safety Tips: Emphasize starting with lighter loads, proper warm-up, and when to stop
  * Always include a regression or easier variation
  * Specify warning signs to stop (sharp pain, dizziness, form breakdown)
  * Recommend starting with bodyweight or light resistance
- Exercise Selection: Prioritize stable, bilateral movements with clear movement patterns
  * Machines and bodyweight exercises preferred over free weights
  * Avoid complex barbell movements requiring extensive coaching
  * Include exercises with built-in stability (e.g., goblet squat vs barbell back squat)`,
    intermediate: `
INTERMEDIATE-SPECIFIC GUIDANCE:
- Form Tips: Focus on movement quality, tempo variations, and mind-muscle connection
  * Include technique refinements and advanced cues
  * Emphasize proper muscle engagement and activation
  * Provide tempo variations for different training effects
  * Address common plateaus and how to overcome them
- Safety Tips: Include load progression guidelines and recovery considerations
  * Specify appropriate load increases (5-10% per week)
  * Include deload recommendations
  * Address overtraining warning signs
- Exercise Selection: Mix of bilateral/unilateral, free weights and cables
  * Include unilateral exercises for balance and stability
  * Free weight variations appropriate
  * Moderate complexity barbell work (squats, deadlifts, presses)`,
    advanced: `
ADVANCED-SPECIFIC GUIDANCE:
- Form Tips: Emphasize advanced techniques, explosive power, and movement efficiency
  * Include performance optimization cues
  * Emphasize rate of force development and power output
  * Provide advanced tempo and intensity techniques
  * Address sport-specific transfer and periodization
- Safety Tips: Focus on injury prevention at high intensities and recovery optimization
  * Include specific warm-up protocols for heavy loads
  * Address joint health and longevity considerations
  * Provide autoregulation guidance (RPE, RIR)
  * Include recovery and deload strategies
- Exercise Selection: Complex movements, advanced variations, high-skill exercises
  * Olympic lift variations appropriate
  * Plyometric and explosive movements
  * Advanced barbell work and complex movement patterns
  * Sport-specific and performance-oriented exercises`,
  };

  const guidance = experienceGuidance[level] || experienceGuidance['beginner'];
  return guidance || '';
}

/**
 * Generate RPE/RIR guidance for intensity prescription
 */
function generateRPEGuidance(experience?: string): string {
  const level = experience?.toLowerCase() || 'beginner';

  const rpeGuidance: Record<string, string> = {
    beginner: `
RPE/RIR GUIDANCE FOR BEGINNERS:
- Target RPE: 5-7 out of 10 (moderate effort, can hold conversation)
- RIR (Reps in Reserve): 3-4 reps left in the tank
- Focus on learning movement patterns, not maximal effort
- If form breaks down, stop the set immediately`,
    intermediate: `
RPE/RIR GUIDANCE FOR INTERMEDIATE:
- Target RPE: 6-8 out of 10 (challenging but sustainable)
- RIR: 2-3 reps left in the tank for main lifts
- Push closer to failure on isolation exercises (RPE 8-9)
- Use autoregulation to adjust daily based on readiness`,
    advanced: `
RPE/RIR GUIDANCE FOR ADVANCED:
- Target RPE: 7-9 out of 10 (high effort, controlled intensity)
- RIR: 1-2 reps for main lifts, 0-1 for accessories
- Periodize intensity: heavy days (RPE 8-9), light days (RPE 6-7)
- Use RPE to manage fatigue and optimize performance`,
  };

  const guidance = rpeGuidance[level];
  if (guidance !== undefined) {
    return guidance;
  }
  const beginnerGuidance = rpeGuidance.beginner;
  if (beginnerGuidance === undefined) {
    throw new Error('Beginner RPE guidance not found');
  }
  return beginnerGuidance;
}

/**
 * Generate tempo prescription guidance (reserved for future use)
 */
// @ts-expect-error - Reserved for future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function generateTempoGuidance(goal?: string): string {
  const primaryGoal = goal?.toLowerCase() || 'general';

  if (primaryGoal.includes('strength')) {
    return `
TEMPO PRESCRIPTION (STRENGTH):
- Eccentric: 2-3 seconds (controlled lowering)
- Pause: 0-1 second (optional pause at bottom)
- Concentric: Explosive (X or 1 second - move weight as fast as possible)
- Format: 2-0-X (e.g., 2 sec down, no pause, explosive up)
- Focus on maximal force production during concentric phase`;
  } else if (primaryGoal.includes('muscle') || primaryGoal.includes('hypertrophy')) {
    return `
TEMPO PRESCRIPTION (HYPERTROPHY):
- Eccentric: 3-4 seconds (slow, controlled lowering for time under tension)
- Pause: 1 second (squeeze at peak contraction)
- Concentric: 1-2 seconds (controlled lifting)
- Format: 3-1-2 (e.g., 3 sec down, 1 sec pause, 2 sec up)
- Maximize time under tension for muscle growth`;
  } else if (primaryGoal.includes('endurance') || primaryGoal.includes('stamina')) {
    return `
TEMPO PRESCRIPTION (ENDURANCE):
- Eccentric: 2 seconds (controlled)
- Pause: 0 seconds (continuous movement)
- Concentric: 1 second (steady pace)
- Format: 2-0-1 (continuous, rhythmic movement)
- Maintain consistent tempo throughout set`;
  } else {
    return `
TEMPO PRESCRIPTION (GENERAL FITNESS):
- Eccentric: 2-3 seconds (controlled lowering)
- Pause: 0-1 second (brief pause)
- Concentric: 1-2 seconds (controlled lifting)
- Format: 2-0-2 (balanced, controlled movement)
- Focus on movement quality and control`;
  }
}

/**
 * Generate exercise ordering guidance
 */
function generateOrderingGuidance(): string {
  return `
EXERCISE ORDERING PRINCIPLES:
1. Compound movements FIRST (squats, deadlifts, presses, rows)
   - Require most energy and neural demand
   - Perform when fresh for optimal performance and safety
2. Assistance exercises SECOND (variations of main lifts)
   - Support main movement patterns
   - Moderate complexity and load
3. Isolation exercises THIRD (curls, extensions, raises)
   - Target specific muscles
   - Lower neural demand
4. Core/finisher exercises LAST (planks, carries, conditioning)
   - Fatigue-resistant muscle groups
   - Can be performed when fatigued

EXAMPLE ORDERING:
- Barbell Back Squat (compound)
- Romanian Deadlift (compound/assistance)
- Leg Press (assistance)
- Leg Curl (isolation)
- Calf Raise (isolation)
- Plank (core)`;
}

/**
 * Generate simplified prompt enhancement with quality standards, injury safety, and experience guidance
 */
export function generateProfessionalPromptEnhancement(context: PromptContext): string {
  const injurySafety = generateInjurySafetyGuidance(context.injuries);
  const experienceGuidance = generateExperienceGuidance(context.experience);
  const rpeGuidance = generateRPEGuidance(context.experience);
  const orderingGuidance = generateOrderingGuidance();

  return `
QUALITY STANDARDS:
- Each exercise description must include: setup, execution, key cues, and breathing
- Form tips should address the most common technique errors (minimum 3 tips)
- Safety tips must include injury prevention and modification options (minimum 2 tips)
- Use clear, instructional language without jargon
- Provide specific, actionable cues${injurySafety}

${experienceGuidance}

${rpeGuidance}

${orderingGuidance}
`.trim();
}