/**
 * ENHANCED AI Prompt Engineering System for Workout Generation
 *
 * Design Principles:
 * 1. Chain-of-Thought Reasoning: Guide AI through step-by-step calculation
 * 2. Constraint Satisfaction: Enforce hard constraints (duration, equipment, injuries)
 * 3. Few-Shot Learning: Provide concrete examples for complex scenarios
 * 4. Structured Output: Enforce strict JSON schema compliance
 * 5. Self-Verification: Require AI to validate before outputting
 */

import { WorkoutContext, ProgrammingContext } from './promptBuilder';
import { buildOpenAIJsonSchema } from './jsonSchema/workoutPlan.schema';
import { optimizeWorkoutHistory, buildWorkoutHistorySummary, shouldIncludeWorkoutHistory } from './workoutHistoryOptimizer';

/**
 * Export OpenAI JSON Schema builder for use in generation
 */
export { buildOpenAIJsonSchema };

/**
 * Enhanced system message with cognitive scaffolding (OPTIMIZED for token efficiency)
 * Reduced from ~800 tokens to ~550 tokens (31% reduction)
 * Further optimized for longer workouts (60+ min) to reduce prompt size
 * Emphasizes personalization and quality
 */
export function buildEnhancedSystemMessage(duration: number, workoutType?: string): string {
  const isTimeBasedWorkout = workoutType && ['Cardio', 'Yoga', 'Pilates', 'Core Focus', 'HIIT', 'Abs'].includes(workoutType);

  return `Elite AI fitness coach. Expert in exercise science, periodization, injury prevention, personalization.

🔴 PRIMARY CONSTRAINT: DURATION MUST BE ${duration}±3 MINUTES (${(duration - 3).toFixed(0)}-${(duration + 3).toFixed(0)} min)
This is NON-NEGOTIABLE. Calculate total time before outputting.

CONSTRAINTS (PRIORITY ORDER):
1. Hard: Duration ±3min (PRIMARY), Equipment, Injury contraindications, Safety
2. Soft: Variety, muscle balance, progression, personalization

PERSONALIZATION REQUIREMENTS:
- Adapt exercise selection based on experience level
- Consider recent workout history to avoid repetition
- Match intensity to user's progression trajectory
- Provide modifications for different fitness levels
- Ensure progressive overload opportunities

DURATION BUDGET:
${isTimeBasedWorkout ? `TIME-BASED (${workoutType}): 3-5min/exercise, ${duration}min target: ${Math.floor(duration/4)}-${Math.ceil(duration/3)} exercises` : `STRENGTH: Compound 12-17min, Isolation 5-8min, ${duration}min target: ${Math.floor(duration/10)}-${Math.ceil(duration/6)} exercises`}

EXERCISE SELECTION:
- Match workout type exactly
- Use ONLY available equipment
- Avoid contraindicated exercises
- Unique names only
- Vary exercises from recent history when possible

PROGRAMMING:
- Reps: ${isTimeBasedWorkout ? '"30s","45s","60s"' : '"8-12","6-10"'}
- Rest: compound 120-180s, isolation 60-90s
- Adjust intensity based on experience level

VERIFY:
✓ Duration = ${duration}±3min (CALCULATE: warmup + sum of all exercise times)
✓ Exercise count: ${Math.floor(duration/10)}-${Math.ceil(duration/5)}
✓ Matches workout type
✓ No contraindicated exercises
✓ Only available equipment
✓ Unique names
✓ Required fields: formTips(3), safetyTips(2)
✓ Personalized to user profile

OUTPUT: Valid JSON only, follow exact schema

CRITICAL (IN ORDER OF IMPORTANCE):
1. ⚠️ DURATION MUST BE ${duration}±3 MINUTES - CALCULATE BEFORE OUTPUTTING
2. Never use unavailable equipment
3. Never include contraindicated exercises
4. All names unique
5. Match workout type exactly
6. Personalize to user experience and goals`;
}

/**
 * Enhanced workout prompt with chain-of-thought guidance
 */
export function buildEnhancedWorkoutPrompt(
  context: WorkoutContext,
  programming: ProgrammingContext,
  qualityGuidelines: string,
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

  // Calculate exercise count based on workout type and duration
  const isTimeBasedWorkout = ['Cardio', 'Yoga', 'Pilates', 'Core Focus', 'HIIT', 'Abs'].includes(workoutType);
  
  let avgTimePerExercise: number;
  let minExerciseCount: number;
  let maxExerciseCount: number;

  if (isTimeBasedWorkout) {
    // Time-based: 3-5 minutes per exercise
    avgTimePerExercise = 4;
    minExerciseCount = Math.max(4, Math.floor(duration / 5));
    maxExerciseCount = Math.ceil(duration / 3);
  } else {
    // Strength: 6-15 minutes per exercise depending on rest periods
    const avgRest = (programming.restSeconds[0] + programming.restSeconds[1]) / 2;
    const avgSets = (programming.sets[0] + programming.sets[1]) / 2;
    avgTimePerExercise = avgSets + ((avgSets - 1) * avgRest / 60);
    minExerciseCount = Math.max(4, Math.floor(duration / avgTimePerExercise));
    maxExerciseCount = Math.ceil(duration / (avgTimePerExercise * 0.75));
  }

  const workoutTypeGuidance = getWorkoutTypeGuidance(workoutType);
  const injuryGuidance = buildInjuryGuidance(injuries);
  const durationGuidance = buildDurationGuidance(duration, programming, workoutType, minExerciseCount, maxExerciseCount);

  // For longer workouts (60+ min), reduce verbosity to keep prompt size manageable
  const isLongWorkout = duration >= 60;

  // Optimize workout history for token efficiency
  const workoutHistorySection = context.recentWorkouts && shouldIncludeWorkoutHistory(context.recentWorkouts)
    ? `\n═══════════════════════════════════════════════════════════════
WORKOUT HISTORY (Personalization Data)
═══════════════════════════════════════════════════════════════
${buildWorkoutHistorySummary(optimizeWorkoutHistory(context.recentWorkouts, isLongWorkout ? 3 : 5))}
${context.progressionNote ? `\nProgression Note: ${context.progressionNote}` : ''}`
    : '';

  // Reduce verbosity for longer workouts
  const descriptionGuidance = isLongWorkout
    ? 'Exercise Descriptions (1-2 sentences, 150-250 chars): Starting position and movement execution, Key form cues and breathing pattern'
    : 'Exercise Descriptions (2-3 sentences, 200-300 characters): First sentence: Starting position and setup with key body alignment cues, Second sentence: Movement execution with range of motion and tempo guidance, Third sentence (optional): Breathing pattern (exhale on exertion) and key focus points';

  const prompt = `Generate a PERSONALIZED ${duration}-minute ${workoutType} workout for a ${experience} level client.

═══════════════════════════════════════════════════════════════
CLIENT PROFILE & PERSONALIZATION
═══════════════════════════════════════════════════════════════
Experience: ${experience}
Goals: ${goals.join(', ')}
Equipment: ${equipment.join(', ')}
Workout Type: ${workoutType}
Duration: ${duration} minutes
${context.personalInfo ? `
Personal Info:
- Sex: ${context.personalInfo.sex || 'Not specified'}
- Height: ${context.personalInfo.height || 'Not specified'}
- Weight: ${context.personalInfo.weight || 'Not specified'}` : ''}
${context.preferenceNotes ? `
User Preferences:
${context.preferenceNotes}` : ''}
${workoutHistorySection}

PERSONALIZATION GUIDANCE:
- Adapt exercise difficulty and volume to ${experience} level
- Vary exercises from recent history to maintain engagement
- Consider user's progression trajectory and feedback
- Provide modifications for different fitness levels
- Ensure exercises align with stated goals: ${goals.join(', ')}

${workoutTypeGuidance}
${injuryGuidance}

═══════════════════════════════════════════════════════════════
PROGRAMMING PARAMETERS
═══════════════════════════════════════════════════════════════
Sets: ${programming.sets[0]}-${programming.sets[1]}
Reps: ${isTimeBasedWorkout ? 'TIME-BASED (use "30s", "45s", "60s" format)' : `${programming.reps[0]}-${programming.reps[1]} (use range format like "8-12")`}
Rest: ${programming.restSeconds[0]}-${programming.restSeconds[1]} seconds
Intensity: ${programming.intensity}

${isTimeBasedWorkout ? `🚨 CRITICAL: This is a ${workoutType} workout - ALL exercises MUST use time-based reps (e.g., "30s", "45s", "60s")
DO NOT use rep ranges like "8-12" - use ONLY time format like "45s"` : ''}

${durationGuidance}

═══════════════════════════════════════════════════════════════
QUALITY STANDARDS
═══════════════════════════════════════════════════════════════
${qualityGuidelines}

${descriptionGuidance}

Form Tips (EXACTLY 3):
- Common technique errors to avoid
- Joint alignment cues
- Movement quality focus points

Safety Tips (EXACTLY 2):
- Injury prevention guidance
- Modification or regression option

═══════════════════════════════════════════════════════════════
OUTPUT SCHEMA (STRICT COMPLIANCE REQUIRED)
═══════════════════════════════════════════════════════════════
{
  "exercises": [
    {
      "name": "Exercise Name",
      "description": "${isLongWorkout ? '1-2 sentences, 150-250 chars' : '2-3 sentences, 200-300 chars'}",
      "sets": 3,
      "reps": ${isTimeBasedWorkout ? '"45s"' : '"8-12"'},
      "formTips": ["Tip 1", "Tip 2", "Tip 3"],
      "safetyTips": ["Safety 1", "Safety 2"],
      "restSeconds": ${isTimeBasedWorkout ? '30' : '120'},
      "usesWeight": ${isTimeBasedWorkout ? 'false' : 'true'},
      "muscleGroups": ["muscle1", "muscle2"],
      "difficulty": "${experience.toLowerCase()}"
    }
  ],
  "workoutSummary": {
    "totalVolume": "e.g., '18 sets, 144-216 reps'",
    "primaryFocus": "Main focus",
    "expectedRPE": "e.g., '6-7 out of 10'"
  }
}

BEFORE OUTPUTTING - VERIFY CHECKLIST:
✓ Duration: ${duration} ± 3 minutes (CALCULATE EXACT TOTAL)
✓ Exercise count: ${minExerciseCount}-${maxExerciseCount} exercises
✓ All exercises match ${workoutType} type
✓ No contraindicated exercises for injuries
✓ Only equipment: ${equipment.join(', ')}
✓ All names unique (no duplicates)
✓ All fields present and correct types

Output the JSON now:`;

  return {
    prompt,
    minExerciseCount,
    maxExerciseCount,
  };
}

function getWorkoutTypeGuidance(type: string): string {
  const guidance: Record<string, string> = {
    'Full Body': 'Focus: Total body with squat, hinge, push, pull, carry patterns. Example: Squats, deadlifts, push-ups, rows, lunges, planks.',
    'Upper Body': 'Focus: Chest, back, shoulders, arms ONLY. Example: Bench press, rows, shoulder press, pull-ups, curls, tricep extensions.',
    'Lower Body': 'Focus: Legs, glutes, calves ONLY. Example: Squats, deadlifts, lunges, leg press, calf raises, glute bridges.',
    'Legs/Glutes': 'Focus: Hip-dominant glute work. Example: Hip thrusts, Romanian deadlifts, Bulgarian split squats, glute bridges.',
    'Chest/Triceps': 'Focus: Chest pressing + tricep isolation. Example: Bench press, push-ups, chest flyes, tricep dips, overhead extensions.',
    'Back/Biceps': 'Focus: Pulling movements + bicep work. Example: Pull-ups, rows, lat pulldowns, bicep curls, hammer curls.',
    'Shoulders': 'Focus: All three deltoid heads. Example: Shoulder press, lateral raises, front raises, rear delt flyes, face pulls.',
    'Arms': 'Focus: Biceps + triceps isolation. Example: Bicep curls, hammer curls, tricep extensions, dips, close-grip press.',
    'Push': 'Focus: Chest, shoulders, triceps pressing. Example: Bench press, shoulder press, push-ups, dips, lateral raises.',
    'Pull': 'Focus: Back, biceps, rear delts pulling. Example: Pull-ups, rows, lat pulldowns, face pulls, bicep curls.',
    'Core Focus': 'Focus: Anti-extension, anti-rotation, stability. Example: Planks, dead bugs, bird dogs, pallof press, Russian twists.',
    'Abs': 'Focus: Abdominal definition and strength. Example: Crunches, leg raises, bicycle crunches, ab wheel rollouts, cable crunches.',
    'Cardio': 'Focus: Cardiovascular endurance. Example: Jumping jacks, burpees, mountain climbers, high knees, jump rope.',
    'HIIT': 'Focus: High-intensity intervals. Example: Burpees, jump squats, box jumps, sprint intervals, battle ropes, kettlebell swings.',
    'Strength Training': 'Focus: Maximal strength with heavy compounds. Example: Barbell squat, deadlift, bench press, overhead press, weighted pull-ups.',
    'Yoga': 'Focus: Flexibility, balance, breath. Example: Sun salutations, warrior poses, downward dog, tree pose, pigeon pose.',
    'Pilates': 'Focus: Core strength and control. Example: Hundred, roll-ups, leg circles, single leg stretch, plank variations.',
  };
  
  return `\nWORKOUT TYPE: ${type}\n${guidance[type] || guidance['Full Body']}`;
}

function buildInjuryGuidance(injuries?: { list?: string[]; notes?: string }): string {
  if (!injuries?.list || injuries.list.length === 0) {
    return '';
  }

  // Import the detailed contraindications from promptBuilder
  const getInjuryContraindications = (injuryList: string[]): string => {
    const contraindications: Record<string, { avoid: string[]; alternatives: string[] }> = {
      knee: {
        avoid: [
          'squats (all variations including goblet, barbell, dumbbell, front, back)',
          'deep squats',
          'goblet squats',
          'barbell squats',
          'dumbbell squats',
          'front squats',
          'back squats',
          'lunges (all variations)',
          'Bulgarian split squats',
          'jump squats',
          'box jumps',
          'burpees',
          'pistol squats',
          'jumping lunges',
          'walking lunges',
          'reverse lunges',
          'step-ups (high)',
          'leg press (heavy)',
          'plyometric exercises',
          'jumping exercises',
          'running',
          'sprinting',
        ],
        alternatives: [
          'glute bridges',
          'hip thrusts',
          'wall sits (limited depth, partial range)',
          'leg press (light weight, limited depth)',
          'step-ups (very low height only)',
          'seated leg extensions (light weight)',
          'hamstring curls',
          'clamshells',
          'side-lying leg raises',
          'standing hip abduction',
        ],
      },
      'lower back': {
        avoid: [
          'deadlifts',
          'Romanian deadlifts',
          'good mornings',
          'bent-over rows',
          'overhead press',
          'sit-ups',
          'Russian twists',
          'toe touches',
          'supermans',
          'hyperextensions',
        ],
        alternatives: [
          'glute bridges',
          'bird dogs',
          'dead bugs',
          'planks',
          'side planks',
          'cable rows (supported)',
          'chest-supported rows',
          'pallof press',
        ],
      },
      shoulder: {
        avoid: [
          'overhead press',
          'military press',
          'behind-the-neck press',
          'upright rows',
          'lateral raises (if painful)',
          'handstand push-ups',
          'dips (if painful)',
          'pull-ups (if impingement)',
        ],
        alternatives: [
          'landmine press',
          'neutral grip dumbbell press',
          'push-ups (modified)',
          'cable chest press',
          'face pulls',
          'band pull-aparts',
          'scapular wall slides',
        ],
      },
    };

    let context = '';
    injuryList.forEach((injury) => {
      const injuryKey = injury.toLowerCase();
      const contraInfo = contraindications[injuryKey];
      if (contraInfo) {
        context += `\n\n⚠️ ${injury.toUpperCase()} INJURY - CRITICAL SAFETY REQUIREMENTS:
DO NOT INCLUDE ANY OF THESE EXERCISES:
${contraInfo.avoid.map((ex) => `  ❌ ${ex}`).join('\n')}

SAFE ALTERNATIVES TO USE INSTEAD:
${contraInfo.alternatives.map((ex) => `  ✅ ${ex}`).join('\n')}`;
      }
    });
    return context;
  };

  return `\n🚨🚨🚨 CRITICAL - INJURY CONTRAINDICATIONS - ABSOLUTE REQUIREMENTS 🚨🚨🚨
Injuries: ${injuries.list.join(', ')}
${injuries.notes ? `Notes: ${injuries.notes}` : ''}

⛔ MANDATORY SAFETY REQUIREMENTS (NON-NEGOTIABLE):
1. STRICTLY AVOID ALL contraindicated exercises listed below - NO EXCEPTIONS
2. DO NOT include ANY exercise that contains words from the "avoid" list
3. DO NOT include variations or modifications of contraindicated exercises
4. Use ONLY safe alternatives and include modifications in safety tips
5. Double-check EVERY exercise name against the contraindication list before including it
${getInjuryContraindications(injuries.list)}

⚠️ VERIFICATION STEP (MANDATORY):
Before outputting your workout, review EACH exercise name and verify it does NOT contain
any words from the contraindicated list above. If it does, REPLACE it with a safe alternative.`;
}

function buildDurationGuidance(
  duration: number,
  programming: ProgrammingContext,
  workoutType: string,
  minExerciseCount: number,
  maxExerciseCount: number,
): string {
  const isTimeBasedWorkout = ['Cardio', 'Yoga', 'Pilates', 'Core Focus', 'HIIT', 'Abs'].includes(workoutType);

  // Calculate warmup time
  const warmupTime = duration >= 30 ? 2.5 : (duration >= 20 ? 1.5 : 0);
  const availableTime = duration - warmupTime;
  const timePerExercise = (availableTime / ((minExerciseCount + maxExerciseCount) / 2)).toFixed(1);

  if (isTimeBasedWorkout) {
    return `\n⏱️ DURATION CALCULATION (TIME-BASED WORKOUT):
Formula: Time = (sets × work_seconds / 60) + ((sets - 1) × rest_seconds / 60)
Example: 4 sets × 45s work + 30s rest = (4 × 45/60) + (3 × 30/60) = 3 + 1.5 = 4.5 min

Target: ${duration} minutes (±3 min acceptable)
Warmup: ~${warmupTime} min
Available for exercises: ~${availableTime.toFixed(1)} min
Required: ${minExerciseCount}-${maxExerciseCount} exercises
Average per exercise: ~${timePerExercise} min
Typical: 3-5 sets of 30-45s work with 30-45s rest per exercise

🔴 CRITICAL: CALCULATE TOTAL BEFORE OUTPUTTING
Total = warmup + sum of all exercise times
Must equal ${duration} ± 3 minutes (${(duration - 3).toFixed(0)}-${(duration + 3).toFixed(0)} min)`;
  } else {
    const avgSets = (programming.sets[0] + programming.sets[1]) / 2;
    const avgRest = (programming.restSeconds[0] + programming.restSeconds[1]) / 2;
    const timePerExerciseStrength = (availableTime / ((minExerciseCount + maxExerciseCount) / 2)).toFixed(1);

    return `\n⏱️ DURATION CALCULATION (STRENGTH WORKOUT):
Formula: Time = (sets × 1 min) + ((sets - 1) × rest_seconds / 60)
Example: ${avgSets} sets × ${avgRest}s rest = ${avgSets} + (${avgSets - 1} × ${avgRest / 60}) = ${(avgSets + (avgSets - 1) * avgRest / 60).toFixed(1)} min

Target: ${duration} minutes (±3 min acceptable)
Warmup: ~${warmupTime} min
Available for exercises: ~${availableTime.toFixed(1)} min
Required: ${minExerciseCount}-${maxExerciseCount} exercises
Average per exercise: ~${timePerExerciseStrength} min
Compound: 120-180s rest, Isolation: 60-90s rest

🔴 CRITICAL: CALCULATE TOTAL BEFORE OUTPUTTING
Total = warmup + sum of all exercise times
Must equal ${duration} ± 3 minutes (${(duration - 3).toFixed(0)}-${(duration + 3).toFixed(0)} min)`;
  }
}

