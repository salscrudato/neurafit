/**
 * Unified Prompt Building System for AI Workout Generation
 * Consolidated from promptBuilder.ts, promptBuilder.enhanced.ts, and promptEnhancements.ts
 * Simplified for clarity, maintainability, and performance
 */

import { buildOpenAIJsonSchema } from './jsonSchema/workoutPlan.schema';

export interface WorkoutContext {
  experience?: string;
  goals?: string[];
  equipment?: string[];
  personalInfo?: {
    sex?: string;
    heightRange?: string;
    height?: string;
    weightRange?: string;
    weight?: string;
  };
  injuries?: {
    list?: string[];
    notes?: string;
  };
  workoutType?: string;
  duration?: number;
  targetIntensity?: number;
  progressionNote?: string;
  preferenceNotes?: string;
  recentWorkouts?: Array<{
    workoutType: string;
    timestamp: number;
    exercises: Array<{ name: string }>;
  }>;
}

export interface ProgrammingContext {
  sets: [number, number];
  reps: [number, number];
  restSeconds: [number, number];
  intensity: string;
}

/**
 * Export OpenAI JSON Schema builder for use in generation
 */
export { buildOpenAIJsonSchema };

// ============================================================================
// SYSTEM MESSAGE
// ============================================================================

/**
 * Build system message for workout generation
 * Concise, clear instructions for consistent AI output
 */
export function buildSystemMessage(duration: number, workoutType?: string): string {
  const isTimeBasedWorkout = workoutType && ['Cardio', 'Yoga', 'Pilates', 'Core Focus', 'HIIT', 'Abs'].includes(workoutType);
  const repFormat = isTimeBasedWorkout ? 'time format ("30s", "45s", "60s")' : 'rep ranges ("8-12")';

  return `You are an expert personal trainer. Generate a ${duration}-minute ${workoutType || 'Full Body'} workout with ${repFormat}. Use ONLY the available equipment. Output ONLY valid JSON with no markdown.`;
}

// ============================================================================
// WORKOUT PROMPT
// ============================================================================

/**
 * Build workout prompt with client profile and programming guidelines
 */
export function buildWorkoutPrompt(
  context: WorkoutContext,
  programming: ProgrammingContext,
): {
  prompt: string;
  minExerciseCount: number;
  maxExerciseCount: number;
} {
  const duration = context.duration || 30;
  const workoutType = context.workoutType || 'Full Body';
  const experience = context.experience || 'Beginner';
  const goals = context.goals || ['General Health'];
  const equipment = context.equipment || ['Bodyweight'];
  const injuries = context.injuries;

  // Calculate exercise count
  const isTimeBasedWorkout = ['Cardio', 'Yoga', 'Pilates', 'Core Focus', 'HIIT', 'Abs'].includes(workoutType);
  let minExerciseCount: number;
  let maxExerciseCount: number;

  if (isTimeBasedWorkout) {
    minExerciseCount = Math.max(4, Math.floor(duration / 5));
    maxExerciseCount = Math.ceil(duration / 3);
  } else {
    const avgRest = (programming.restSeconds[0] + programming.restSeconds[1]) / 2;
    const avgSets = (programming.sets[0] + programming.sets[1]) / 2;
    const avgTimePerExercise = avgSets + ((avgSets - 1) * avgRest / 60);
    minExerciseCount = Math.max(4, Math.floor(duration / avgTimePerExercise));
    maxExerciseCount = Math.ceil(duration / (avgTimePerExercise * 0.75));
  }

  const workoutTypeGuidance = getWorkoutTypeContext(workoutType);
  const injuryGuidance = buildInjuryGuidance(injuries);
  const repFormat = isTimeBasedWorkout ? 'time format ("30s", "45s", "60s")' : `${programming.reps[0]}-${programming.reps[1]} reps`;

  const prompt = `Generate a ${duration}-minute ${workoutType} workout for a ${experience} client.
Goals: ${goals.join(', ')} | Equipment: ${equipment.join(', ')}${context.preferenceNotes ? ` | Notes: ${context.preferenceNotes}` : ''}
${workoutTypeGuidance}${injuryGuidance}
Programming: ${programming.sets[0]}-${programming.sets[1]} sets, ${repFormat}, ${programming.restSeconds[0]}-${programming.restSeconds[1]}s rest

Generate EXACTLY ${minExerciseCount}-${maxExerciseCount} unique exercises. Each exercise must include: name, detailed description (2-3 sentences with setup, execution, and breathing), 3 form tips, 2 safety tips, sets, reps, rest period, muscle groups, and difficulty level.
CRITICAL: Use ONLY ${equipment.join(', ')}. Reps format: ${isTimeBasedWorkout ? 'time ONLY ("30s", "45s", "60s")' : 'range ONLY ("8-12")'}. Output ONLY valid JSON.`;

  return { prompt, minExerciseCount, maxExerciseCount };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get workout type guidance with exercise examples
 */
export function getWorkoutTypeContext(type: string | undefined): string {
  if (!type) {
    type = 'Full Body';
  }

  const contexts: Record<string, string> = {
    'Full Body': 'Focus: Total body with squat, hinge, push, pull, carry patterns. Example: Squats, deadlifts, push-ups, rows, lunges, planks.',
    'Upper Body': 'Focus: Chest, back, shoulders, arms ONLY. Example: Bench press, rows, shoulder press, pull-ups, curls, tricep extensions.',
    'Lower Body': 'Focus: Legs, glutes, calves ONLY. Example: Squats, deadlifts, lunges, leg press, calf raises, glute bridges.',
    'Legs/Glutes': 'Focus: Hip-dominant glute work. Example: Hip thrusts, Romanian deadlifts, Bulgarian split squats, glute bridges.',
    'Chest/Triceps': 'Focus: Chest pressing + tricep isolation. Example: Bench press, push-ups, chest flyes, tricep dips, overhead extensions.',
    'Back/Biceps': 'Focus: Pulling movements + bicep work. Example: Pull-ups, rows, lat pulldowns, bicep curls, hammer curls.',
    'Shoulders': 'Focus: All three deltoid heads. Example: Shoulder press, lateral raises, front raises, rear delt flyes, face pulls.',
    'Core Focus': 'Focus: Anti-extension, anti-rotation, stability. Example: Planks, dead bugs, bird dogs, pallof press, Russian twists.',
    'Cardio': 'Focus: Cardiovascular endurance. Example: Jumping jacks, burpees, mountain climbers, high knees, jump rope.',
    'HIIT': 'Focus: High-intensity intervals. Example: Burpees, jump squats, box jumps, sprint intervals, battle ropes, kettlebell swings.',
    'Yoga': 'Focus: Flexibility, balance, breath. Example: Sun salutations, warrior poses, downward dog, tree pose, pigeon pose.',
    'Pilates': 'Focus: Core strength and control. Example: Hundred, roll-ups, leg circles, single leg stretch, plank variations.',
  };

  return `\nWORKOUT TYPE: ${type}\n${contexts[type] || contexts['Full Body']}`;
}

/**
 * Build injury safety guidance
 */
function buildInjuryGuidance(injuries?: { list?: string[]; notes?: string }): string {
  if (!injuries?.list || injuries.list.length === 0) return '';

  const contraindications: Record<string, string[]> = {
    knee: ['squats', 'lunges', 'jump squats', 'box jumps', 'burpees'],
    'lower back': ['deadlifts', 'Romanian deadlifts', 'bent-over rows', 'sit-ups'],
    shoulder: ['overhead press', 'military press', 'upright rows'],
  };

  let guidance = 'INJURY CONTRAINDICATIONS:\n';
  injuries.list.forEach((injury) => {
    const avoidList = contraindications[injury.toLowerCase()];
    if (avoidList) {
      guidance += `${injury.toUpperCase()}: AVOID ${avoidList.join(', ')}\n`;
    }
  });

  return guidance;
}
