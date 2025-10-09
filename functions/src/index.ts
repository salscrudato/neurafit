import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import type { Request, Response } from 'express';
import OpenAI from 'openai';
import { getProgrammingRecommendations } from './lib/exerciseDatabase';
import { generateProfessionalPromptEnhancement } from './lib/promptEnhancements';

// Define the secret
const openaiApiKey = defineSecret('OPENAI_API_KEY');

/**
 * Simple rule-based quality scoring for workouts
 */
function calculateWorkoutQuality(
  workout: {
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
  },
  _userProfile: {
    experience?: string;
    injuries?: string[];
    duration: number;
    goals?: string[];
    equipment?: string[];
    workoutType?: string;
  },
): { overall: number; grade: string } {
  let score = 100;

  // Check minimum exercise count (at least 3 exercises)
  const exerciseCount = workout.exercises.length;
  if (exerciseCount < 3) {
    score -= 20;
  }

  // Check for complete exercise data
  workout.exercises.forEach((ex) => {
    if (!ex.description || ex.description.length < 50) score -= 5;
    if (!ex.formTips || ex.formTips.length < 2) score -= 3;
    if (!ex.safetyTips || ex.safetyTips.length < 1) score -= 3;
    if (!ex.muscleGroups || ex.muscleGroups.length === 0) score -= 2;
  });

  // Check for workout summary
  if (!workout.workoutSummary) {
    score -= 5;
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score));

  // Assign grade
  let grade = 'F';
  if (score >= 95) grade = 'A+';
  else if (score >= 90) grade = 'A';
  else if (score >= 85) grade = 'A-';
  else if (score >= 80) grade = 'B+';
  else if (score >= 75) grade = 'B';
  else if (score >= 70) grade = 'B-';
  else if (score >= 65) grade = 'C+';
  else if (score >= 60) grade = 'C';
  else if (score >= 55) grade = 'C-';
  else if (score >= 50) grade = 'D';

  return { overall: score, grade };
}

/**
 * AI-powered workout generator function
 * - Preserves existing input/output schema for frontend compatibility
 * - Adds structured, evidence-based prompt scaffolding for higher quality plans
 */
export const generateWorkout = onRequest(
  {
    cors: [
      'http://localhost:5173', // local dev
      'https://neurafit-ai-2025.web.app', // Firebase Hosting
      'https://neurafit-ai-2025.firebaseapp.com',
      'https://neurastack.ai', // Custom domain
      'https://www.neurastack.ai', // Custom domain with www
    ],
    region: 'us-central1',
    secrets: [openaiApiKey],
    timeoutSeconds: 300, // 5 minutes - enough for OpenAI API calls
    memory: '1GiB', // Increased memory for better performance
  },
  async (req: Request, res: Response): Promise<void> => {
    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    try {
      // Initialize OpenAI client with the secret value
      const client = new OpenAI({
        apiKey: openaiApiKey.value(),
      });

      const {
        experience,
        goals,
        equipment,
        personalInfo,
        injuries,
        workoutType,
        duration,
        targetIntensity,
        progressionNote,
        recentWorkouts,
      } = (req.body as {
        experience?: string;
        goals?: string | string[];
        equipment?: string | string[];
        personalInfo?: { sex?: string; heightRange?: string; height?: string; weightRange?: string; weight?: string };
        injuries?: { list?: string[]; notes?: string };
        workoutType?: string;
        duration?: number;
        targetIntensity?: number;
        progressionNote?: string;
        recentWorkouts?: Array<{ workoutType: string; timestamp: number; exercises: Array<{ name: string }> }>;
      }) || {};

      // Use intensity values from frontend (calculated by useWorkoutPreload hook)
      let finalTargetIntensity = targetIntensity || 1.0;
      let finalProgressionNote = progressionNote || '';

      // Filter out undefined values from arrays and ensure string types
      const filteredGoals = Array.isArray(goals)
        ? goals.filter((g): g is string => Boolean(g))
        : [goals].filter((g): g is string => Boolean(g));
      const filteredEquipment = Array.isArray(equipment)
        ? equipment.filter((e): e is string => Boolean(e))
        : [equipment].filter((e): e is string => Boolean(e));

      // Enhanced workout type context with specific exercise examples
      const getWorkoutTypeContext = (type: string) => {
        const contexts: Record<string, string> = {
          'Full Body':
            'Focus: Total body conditioning with balanced muscle group coverage.\nMovement Patterns: Squat, hinge, push, pull, carry.\nExample Exercises: Squats, deadlifts, push-ups, rows, lunges, planks.\nProgramming: 6-12 reps, compound movements prioritized, 2-3 exercises per major muscle group.',
          'Upper Body':
            'Focus: Chest, back, shoulders, arms with push/pull balance.\nMovement Patterns: Horizontal push/pull, vertical push/pull, isolation.\nExample Exercises: Bench press, rows, shoulder press, pull-ups, dips, bicep curls, tricep extensions.\nProgramming: 6-15 reps, balance pushing and pulling movements 1:1 ratio.',
          'Lower Body':
            'Focus: Legs, glutes, calves with knee and hip dominant movements.\nMovement Patterns: Squat, hinge, lunge, single-leg, calf.\nExample Exercises: Squats, deadlifts, lunges, leg press, Romanian deadlifts, calf raises, glute bridges.\nProgramming: 8-15 reps, prioritize compound movements, include unilateral work.',
          Cardio:
            'Focus: Cardiovascular endurance and metabolic conditioning.\nMovement Patterns: Continuous movement, intervals, circuits.\nExample Exercises: Jumping jacks, burpees, mountain climbers, high knees, jump rope, running in place.\nProgramming: Time-based (30-60s work periods), minimal rest (15-30s), bodyweight preferred.',
          'Core Focus':
            'Focus: Abdominals, obliques, lower back, stability.\nMovement Patterns: Anti-extension, anti-rotation, anti-lateral flexion.\nExample Exercises: Planks, dead bugs, bird dogs, pallof press, Russian twists, bicycle crunches.\nProgramming: 10-20 reps or 30-60s holds, focus on control and stability.',
          Push:
            'Focus: Chest, shoulders, triceps with pressing movements.\nMovement Patterns: Horizontal press, vertical press, isolation.\nExample Exercises: Bench press, shoulder press, push-ups, dips, chest flyes, lateral raises, tricep extensions.\nProgramming: 6-12 reps, multiple pressing angles, finish with isolation work.',
          Pull:
            'Focus: Back, biceps, rear delts with pulling movements.\nMovement Patterns: Horizontal pull, vertical pull, isolation.\nExample Exercises: Pull-ups, rows, lat pulldowns, face pulls, bicep curls, rear delt flyes.\nProgramming: 6-12 reps, balance horizontal and vertical pulling, include rear delt work.',
          'Legs/Glutes':
            'Focus: Lower body power, glute development, leg strength.\nMovement Patterns: Hip hinge, squat, lunge, hip thrust.\nExample Exercises: Hip thrusts, Romanian deadlifts, Bulgarian split squats, goblet squats, glute bridges, step-ups.\nProgramming: 8-15 reps, emphasize hip-dominant movements, include glute activation.',
          'Chest/Triceps':
            'Focus: Chest development and tricep strength.\nMovement Patterns: Horizontal press, incline press, tricep extension.\nExample Exercises: Bench press, incline press, push-ups, chest flyes, tricep dips, overhead extensions, close-grip press.\nProgramming: 6-15 reps, multiple chest angles, finish with tricep isolation.',
          'Back/Biceps':
            'Focus: Back width/thickness and bicep size.\nMovement Patterns: Vertical pull, horizontal pull, bicep curl.\nExample Exercises: Pull-ups, rows, lat pulldowns, face pulls, bicep curls, hammer curls, concentration curls.\nProgramming: 6-15 reps, prioritize compound pulling, finish with bicep isolation.',
          Shoulders:
            'Focus: Deltoid development (front, side, rear) and shoulder stability.\nMovement Patterns: Vertical press, lateral raise, rear delt work.\nExample Exercises: Shoulder press, lateral raises, front raises, rear delt flyes, face pulls, Arnold press.\nProgramming: 8-15 reps, hit all three deltoid heads, include rotator cuff work.',
          Arms:
            'Focus: Biceps, triceps, forearms with isolation movements.\nMovement Patterns: Elbow flexion, elbow extension, grip work.\nExample Exercises: Bicep curls, hammer curls, tricep extensions, dips, close-grip press, wrist curls.\nProgramming: 8-15 reps, balance bicep and tricep volume, include different curl/extension variations.',
          Yoga:
            'Focus: Flexibility, mindfulness, balance, breath control.\nMovement Patterns: Flowing sequences, static holds, balance poses.\nExample Exercises: Sun salutations, warrior poses, downward dog, child\'s pose, tree pose, pigeon pose.\nProgramming: 30-90s holds, flowing transitions, focus on breath and alignment.',
          Pilates:
            'Focus: Core strength, stability, control, mind-body connection.\nMovement Patterns: Controlled movements, core engagement, precise execution.\nExample Exercises: Hundred, roll-ups, leg circles, single leg stretch, plank variations, side-lying leg lifts.\nProgramming: 8-15 controlled reps, emphasis on core engagement and breathing.',
        };
        return contexts[type] || contexts['Full Body'];
      };

      // Build comprehensive injury context with explicit contraindications
      const getInjuryContraindications = (injuryList: string[]) => {
        const contraindications: Record<string, { avoid: string[]; alternatives: string[] }> = {
          knee: {
            avoid: [
              'deep squats',
              'lunges',
              'Bulgarian split squats',
              'jump squats',
              'box jumps',
              'burpees',
              'pistol squats',
              'jumping lunges',
              'plyometric exercises',
            ],
            alternatives: [
              'glute bridges',
              'hip thrusts',
              'wall sits (limited depth)',
              'leg press (if available)',
              'step-ups (low height)',
              'seated leg extensions (light weight)',
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
          ankle: {
            avoid: [
              'jumping exercises',
              'box jumps',
              'burpees',
              'calf raises',
              'running',
              'sprinting',
              'agility drills',
              'jump rope',
            ],
            alternatives: [
              'seated exercises',
              'swimming motions',
              'upper body focus',
              'core work',
              'seated bike (if tolerated)',
              'resistance band exercises',
            ],
          },
          wrist: {
            avoid: [
              'push-ups',
              'planks',
              'handstands',
              'burpees',
              'mountain climbers',
              'front squats',
              'clean and jerk',
            ],
            alternatives: [
              'forearm planks',
              'push-ups on fists or handles',
              'dumbbell exercises',
              'cable exercises',
              'machine exercises',
              'leg-focused movements',
            ],
          },
          neck: {
            avoid: [
              'overhead press',
              'behind-the-neck movements',
              'headstands',
              'neck bridges',
              'heavy shrugs',
              'upright rows',
            ],
            alternatives: [
              'neutral spine exercises',
              'supported movements',
              'machine-based exercises',
              'gentle mobility work',
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

      const injuryContext =
        injuries?.list && injuries.list.length > 0
          ? `\n\n🚨 CRITICAL - INJURY CONSIDERATIONS:
User has reported injuries: ${injuries.list.join(', ')}
${injuries.notes ? `Additional context: ${injuries.notes}` : ''}

MANDATORY REQUIREMENTS:
1. STRICTLY AVOID all contraindicated exercises listed below
2. Use ONLY the safe alternatives provided for each injury
3. Prioritize safety over workout variety or intensity
4. Include modifications and regression options in safety tips
5. If unsure about an exercise, choose a safer alternative
${getInjuryContraindications(injuries.list)}`
          : '';

      // Build intensity context if provided
      const intensityContext =
        finalTargetIntensity !== 1.0 || finalProgressionNote
          ? `\n\nINTENSITY GUIDANCE:
- Target intensity scalar: ${finalTargetIntensity.toFixed(2)}x baseline
${finalProgressionNote ? `- Progression note: ${finalProgressionNote}` : ''}
- Adjust sets, reps, or rest periods accordingly`
          : '';

      // Build personal info context for better personalization
      const personalContext = personalInfo
        ? `\n\nPERSONAL PROFILE:
- Gender: ${personalInfo.sex || 'Not specified'}
- Height: ${personalInfo.height || personalInfo.heightRange || 'Not specified'}
- Weight: ${personalInfo.weight || personalInfo.weightRange || 'Not specified'}

PERSONALIZATION CONSIDERATIONS:
- Adjust exercise selection based on body mechanics and anthropometry
- Consider joint stress and loading appropriate for body weight
- Tailor intensity recommendations to individual capacity
- Select exercises that accommodate body proportions and leverage`
        : '';

      // Build workout history context for progression
      const workoutHistoryContext =
        recentWorkouts && recentWorkouts.length > 0
          ? `\n\nRECENT WORKOUT HISTORY:
${recentWorkouts
  .slice(0, 3)
  .map(
    (w, i) =>
      `${i + 1}. ${w.workoutType} (${Math.floor((Date.now() - w.timestamp) / (1000 * 60 * 60 * 24))} days ago)
   Exercises: ${w.exercises.map((e) => e.name).join(', ')}`,
  )
  .join('\n')}

PROGRESSION GUIDANCE:
- Provide variety by avoiding exact repetition of recent exercises
- Progress difficulty appropriately based on workout frequency
- Consider exercise variations that build on previous movements
- Maintain consistency with user's training patterns while adding novelty`
          : '';

      // Quality standards and injury-specific safety guidance
      const qualityGuidelines = generateProfessionalPromptEnhancement({
        injuries: injuries?.list,
      });

      // Evidence-based programming ranges for the primary goal
      const programming = getProgrammingRecommendations(filteredGoals, experience || '');
      const programmingContext = `\n\nEVIDENCE-BASED PROGRAMMING GUIDELINES:
Goal-Specific Parameters:
- Sets: ${programming.sets?.[0]}-${programming.sets?.[1]}
- Reps: ${programming.reps?.[0]}-${programming.reps?.[1]}
- Rest: ${programming.restSeconds?.[0]}-${programming.restSeconds?.[1]} seconds
- Intensity: ${programming.intensity}

CRITICAL REST PERIOD REQUIREMENTS (MUST FOLLOW):
- Compound movements (squats, deadlifts, presses, rows): 120-180 seconds minimum
- Isolation movements (curls, extensions, raises, flyes): 60-90 seconds
- Plyometric/cardio exercises (jumps, sprints, burpees): 45-90 seconds
- Core/stability exercises (planks, holds): 45-60 seconds
- DO NOT use rest periods shorter than these minimums - adequate rest is essential for safety and performance

REP FORMAT STANDARDS:
- Use ranges for strength/hypertrophy: "6-8", "8-12", "10-15"
- Use time for isometric holds: "30s", "45s", "60s" (NOT "Hold for 30 seconds")
- Use "each side" or "per leg" for unilateral exercises: "10-12 each side"`;

      // Calculate time guidance for AI - focus on rest periods as the main time component
      // Work time per set is trivial (~1 min per set including execution), rest is the key factor
      const avgSetsPerExercise = ((programming.sets?.[0] || 3) + (programming.sets?.[1] || 4)) / 2;
      const avgRestPerSet = ((programming.restSeconds?.[0] || 60) + (programming.restSeconds?.[1] || 120)) / 2;

      // Warmup time allocation
      const warmupTimeMinutes = (duration || 30) >= 20 ? 2.5 : 0;
      const availableWorkoutMinutes = (duration || 30) - warmupTimeMinutes;

      const durationGuidance = `\n\n═══════════════════════════════════════════════════════════════
DURATION CONSTRAINT - CRITICAL REQUIREMENT
═══════════════════════════════════════════════════════════════
Total workout time: ${duration} minutes
${warmupTimeMinutes > 0 ? `Warmup allocation: ${warmupTimeMinutes} minutes (1-2 warmup exercises with 1 set each)` : ''}
Available time for main exercises: ${availableWorkoutMinutes.toFixed(1)} minutes

TIME CALCULATION FORMULA (MANDATORY):
For each exercise, calculate time as:
  Time = (sets × 1 minute) + ((sets - 1) × rest_seconds / 60)

Example with ${avgSetsPerExercise.toFixed(0)} sets and ${avgRestPerSet.toFixed(0)}s rest:
  Time = (${avgSetsPerExercise.toFixed(0)} × 1) + (${(avgSetsPerExercise - 1).toFixed(0)} × ${avgRestPerSet.toFixed(0)}/60)
  Time = ${avgSetsPerExercise.toFixed(0)} + ${((avgSetsPerExercise - 1) * avgRestPerSet / 60).toFixed(1)} = ${(avgSetsPerExercise + (avgSetsPerExercise - 1) * avgRestPerSet / 60).toFixed(1)} minutes per exercise

REQUIRED EXERCISE COUNT:
Based on ${availableWorkoutMinutes.toFixed(1)} minutes available and ~${(avgSetsPerExercise + (avgSetsPerExercise - 1) * avgRestPerSet / 60).toFixed(1)} minutes per exercise:
You should generate approximately ${Math.floor(availableWorkoutMinutes / (avgSetsPerExercise + (avgSetsPerExercise - 1) * avgRestPerSet / 60))} main exercises

⚠️  CRITICAL: Calculate the total time for ALL exercises you generate
⚠️  The sum must equal approximately ${duration} minutes (±2 minutes acceptable)
⚠️  DO NOT generate more exercises than can fit in the available time`;

      // Structured prompt with enhanced organization and requirements
      const warmupRequirement =
        (duration || 30) >= 20
          ? `\n\nWARM-UP REQUIREMENT:
- Include 1-2 dynamic warm-up exercises at the beginning
- Choose movements that are low-intensity and mobility-focused
- Select exercises appropriate for the workout type and target muscle groups
- Mark these as difficulty: "beginner" regardless of user's experience level
- Use 1 set of 8-12 reps or 30-45s holds for warm-up exercises`
          : '';

      const prompt = `Create a personalized ${duration}-minute ${workoutType || 'Full Body'} workout for a ${experience || 'Beginner'} level client.

═══════════════════════════════════════════════════════════════
CLIENT PROFILE
═══════════════════════════════════════════════════════════════
Experience Level: ${experience || 'Beginner'}
Primary Goals: ${filteredGoals.join(', ') || 'General Fitness'}
Available Equipment: ${filteredEquipment.join(', ') || 'Bodyweight only'}
Workout Type: ${workoutType || 'Full Body'}
Duration: ${duration} minutes
${getWorkoutTypeContext(workoutType || 'Full Body')}${personalContext}${injuryContext}${intensityContext}${workoutHistoryContext}

═══════════════════════════════════════════════════════════════
PROGRAMMING REQUIREMENTS
═══════════════════════════════════════════════════════════════
${programmingContext}${durationGuidance}${warmupRequirement}

EXERCISE SELECTION REQUIREMENTS:
1. NO DUPLICATE EXERCISES - Each exercise name must be completely unique
2. Use ONLY real, evidence-based exercises with standard names (e.g., "Barbell Back Squat", "Dumbbell Bench Press")
3. Balance muscle groups appropriately:
   - Full Body: Include push, pull, legs, and core movements
   - Upper Body: Balance horizontal/vertical push and pull
   - Lower Body: Balance quad-dominant, hip-dominant, and unilateral movements
4. Vary movement patterns: Different angles, grips, stances, and ranges of motion
5. Progressive ordering: Compound movements first, then isolation, then core/stability
6. Match workout type exactly - don't include leg exercises in an upper body workout

EXERCISE APPROPRIATENESS:
- Beginner: Focus on fundamental movement patterns, bilateral exercises, machine/bodyweight emphasis
- Intermediate: Include unilateral work, free weights, moderate complexity
- Advanced: Complex movements, advanced variations, higher skill requirements
- Consider equipment availability - don't prescribe exercises requiring unavailable equipment
- Respect injury contraindications - NEVER include exercises that stress injured areas

═══════════════════════════════════════════════════════════════
QUALITY STANDARDS
═══════════════════════════════════════════════════════════════
${qualityGuidelines}

Exercise Descriptions (100-150 characters):
- Starting position and setup
- Movement execution with key cues
- Breathing pattern (exhale on exertion)
- Be concise but complete

Form Tips (EXACTLY 3 per exercise):
- Most common technique errors to avoid
- Specific joint alignment cues
- Movement quality focus points
- Each tip should be actionable and specific

Safety Tips (EXACTLY 2 per exercise):
- Primary injury prevention guidance
- Modification or regression option
- Each tip should address a specific safety concern

═══════════════════════════════════════════════════════════════
CRITICAL RULES - MANDATORY COMPLIANCE
═══════════════════════════════════════════════════════════════
1. ✅ Generate 4-6 exercises for ${duration}-minute workouts (minimum 4, maximum 6)
2. ✅ ALL exercise names must be unique - check for duplicates before finalizing
3. ✅ Match workout type exactly (${workoutType || 'Full Body'})
4. ✅ Rest periods: Compound 120-180s, Isolation 60-90s, Cardio/Core 45-60s
5. ✅ If injuries present, STRICTLY AVOID all contraindicated exercises
6. ✅ Rep format: Use "8-12" for ranges, "30s" for time, "10 each side" for unilateral
7. ✅ Difficulty: ALL exercises must have difficulty="${(experience || 'beginner').toLowerCase()}"
8. ✅ usesWeight: true for dumbbells/barbells/kettlebells/bands, false for bodyweight only
9. ✅ Sets: Integer 1-10 (typically 3-4 for main exercises, 1-2 for warmup)
10. ✅ Reps: String format only (never a number)
11. ✅ formTips: Array with EXACTLY 3 strings
12. ✅ safetyTips: Array with EXACTLY 2 strings
13. ✅ muscleGroups: Array with 1-3 specific muscles (e.g., ["quadriceps", "glutes"])
14. ✅ Total workout time must fit within ${duration} minutes (±2 min acceptable)

═══════════════════════════════════════════════════════════════
JSON OUTPUT SCHEMA - STRICT COMPLIANCE REQUIRED
═══════════════════════════════════════════════════════════════
You MUST output valid JSON matching this EXACT schema. All fields are REQUIRED.

{
  "exercises": [
    {
      "name": "Exercise Name (unique, standard name)",
      "description": "Complete description 100-150 chars with setup, execution, breathing",
      "sets": 3,
      "reps": "8-12",
      "formTips": [
        "First form tip - specific and actionable",
        "Second form tip - addresses common error",
        "Third form tip - joint alignment or quality cue"
      ],
      "safetyTips": [
        "First safety tip - injury prevention",
        "Second safety tip - modification option"
      ],
      "restSeconds": 120,
      "usesWeight": true,
      "muscleGroups": ["chest", "triceps"],
      "difficulty": "${(experience || 'beginner').toLowerCase()}"
    }
  ],
  "workoutSummary": {
    "totalVolume": "Calculate total: e.g., '18 sets, 144-216 reps'",
    "primaryFocus": "Describe main focus: e.g., 'Upper body strength with chest and back emphasis'",
    "expectedRPE": "Rate difficulty: e.g., '6-7 out of 10 for ${experience || 'Beginner'} level'"
  }
}

PRE-OUTPUT VALIDATION CHECKLIST:
Before generating output, verify:
✓ Exercise count is 4-6 exercises
✓ ALL exercise names are unique (no duplicates)
✓ ALL exercises match workout type (${workoutType || 'Full Body'})
✓ ALL sets are integers 1-10
✓ ALL reps are strings (not numbers)
✓ ALL formTips arrays have EXACTLY 3 items
✓ ALL safetyTips arrays have EXACTLY 2 items
✓ ALL restSeconds are integers 45-300
✓ ALL usesWeight are boolean true/false
✓ ALL muscleGroups arrays have 1-3 items
✓ ALL difficulty values are "${(experience || 'beginner').toLowerCase()}"
✓ Total time fits ${duration} minutes (±2 min)
✓ No contraindicated exercises for injuries
✓ Equipment matches available equipment

Output the JSON now:`.trim();

      // Use GPT-4o-mini for optimal balance of speed, cost, and JSON reliability
      // Cost: ~$0.00218 per workout vs $0.00145 for gpt-4.1-nano (only $0.73/month difference for 1000 workouts)
      // Benefits: Superior JSON output reliability, better reasoning for complex workout programming
      console.log('⚡ Using GPT-4o-mini for reliable workout generation with excellent JSON output');

      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.2, // Lower temperature for more consistent JSON output and deterministic responses
        max_tokens: 4500, // Sufficient for comprehensive workouts
        response_format: { type: 'json_object' }, // Enforce JSON output format for better reliability
        messages: [
          {
            role: 'system',
            content: 'You are a certified personal trainer (NASM-CPT, CSCS, ACSM-CEP) with expertise in exercise science, periodization, and injury prevention. You create evidence-based, personalized workout programs. You MUST output ONLY valid JSON with no markdown formatting, code blocks, or explanatory text. Follow the exact schema provided in the user prompt.',
          },
          { role: 'user', content: prompt },
        ],
      });

      const text = completion.choices?.[0]?.message?.content ?? '';
      const finishReason = completion.choices?.[0]?.finish_reason;

      // Check if response was truncated due to token limit
      if (finishReason === 'length') {
        throw new Error(
          `AI response was truncated due to token limit. The workout generation was incomplete. Please try a shorter duration or simpler workout type.`
        );
      }

      // Clean JSON text by removing markdown code blocks if present
      const cleanedText = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

      // Validate JSON output
      try {
        const json = JSON.parse(cleanedText) as {
          exercises: {
            name: string;
            description: string;
            sets: number;
            reps: number | string;
            formTips: string[];
            safetyTips: string[];
            restSeconds: number;
            usesWeight: boolean;
            muscleGroups: string[];
            difficulty: string;
          }[];
          workoutSummary: {
            totalVolume: string;
            primaryFocus: string;
            expectedRPE: string;
          };
        };

        // Validate minimum exercise count (at least 3 exercises for any workout)
        const exerciseCount = json.exercises?.length || 0;
        if (exerciseCount < 3) {
          throw new Error(
            `AI generated only ${exerciseCount} exercises but at least 3 are required for a ${duration}-minute workout.`
          );
        }

        // Professional workout validation with rule-based scoring
        const { validateWorkoutPlan } = await import('./lib/exerciseValidation');

        const userProfileForValidation = {
          experience,
          injuries: injuries?.list || [],
          duration: duration || 30,
          goals: filteredGoals,
          equipment: filteredEquipment,
          workoutType,
        };

        const validationResult = validateWorkoutPlan(json, userProfileForValidation);

        // Log validation metrics for monitoring
        if (validationResult.errors.length > 0) {
          console.warn('Workout validation errors:', validationResult.errors);
        }
        if (validationResult.warnings.length > 0) {
          console.info('Workout validation warnings:', validationResult.warnings);
        }

        // Reject workouts with critical safety issues (from rule-based validation)
        if (!validationResult.isValid) {
          console.error('Generated workout failed safety validation:', validationResult.errors);
          res.status(502).json({
            error: 'Generated workout failed safety validation',
            validationErrors: validationResult.errors,
            raw: text,
          });
          return;
        }

        // Simple rule-based quality score
        const qualityScore = calculateWorkoutQuality(json, userProfileForValidation);
        console.info('Workout Quality Score:', qualityScore.overall, 'Grade:', qualityScore.grade);

        // Add metadata to response including validation and quality results
        const response = {
          ...json,
          metadata: {
            targetIntensity: finalTargetIntensity,
            progressionNote: finalProgressionNote || undefined,
            validation: {
              warnings: validationResult.warnings,
              suggestions: validationResult.suggestions,
            },
            qualityScore: {
              overall: qualityScore.overall,
              grade: qualityScore.grade,
              method: 'rule-based',
            },
          },
        };

        res.json(response);
        return;
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        console.error('Original text:', text);
        console.error('Cleaned text:', cleanedText);
        res.status(502).json({ error: 'Bad AI JSON', raw: cleanedText });
        return;
      }
    } catch (e) {
      console.error('Workout generation error', e);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
  },
);

/**
 * Add an exercise to an existing workout
 * Takes the current workout context and generates one additional exercise
 */
export const addExerciseToWorkout = onRequest(
  {
    cors: [
      'http://localhost:5173',
      'https://neurafit-ai-2025.web.app',
      'https://neurafit-ai-2025.firebaseapp.com',
      'https://neurastack.ai',
      'https://www.neurastack.ai',
    ],
    region: 'us-central1',
    secrets: [openaiApiKey],
    timeoutSeconds: 60,
    memory: '512MiB',
  },
  async (req: Request, res: Response) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const {
        currentWorkout,
        workoutType,
        experience,
        goals,
        equipment,
        injuries,
      } = req.body;

      if (!currentWorkout?.exercises || !Array.isArray(currentWorkout.exercises)) {
        res.status(400).json({ error: 'Invalid workout data' });
        return;
      }

      const client = new OpenAI({ apiKey: openaiApiKey.value() });

      const existingExercises = currentWorkout.exercises.map((ex: { name: string }) => ex.name).join(', ');
      const programming = getProgrammingRecommendations(goals || ['General Health'], experience || 'Beginner');

      const prompt = `You are adding ONE additional exercise to an existing ${workoutType || 'Full Body'} workout.

EXISTING EXERCISES IN WORKOUT:
${existingExercises}

CLIENT PROFILE:
- Experience: ${experience || 'Beginner'}
- Goals: ${(goals || ['General Health']).join(', ')}
- Equipment: ${(equipment || ['Bodyweight']).join(', ')}
${injuries?.list?.length > 0 ? `- Injuries: ${injuries.list.join(', ')} - ${injuries.notes || ''}` : ''}

REQUIREMENTS:
1. Generate ONE exercise that complements the existing workout
2. DO NOT duplicate or closely replicate any existing exercises
3. Target muscle groups that are underrepresented in the current workout
4. Follow programming guidelines: ${programming.sets?.[0]}-${programming.sets?.[1]} sets, ${programming.reps?.[0]}-${programming.reps?.[1]} reps, ${programming.restSeconds?.[0]}-${programming.restSeconds?.[1]}s rest
5. Match the difficulty level: ${(experience || 'beginner').toLowerCase()}
6. Avoid contraindicated exercises if injuries are present

OUTPUT ONLY valid JSON (no markdown, no code blocks):
{
  "name": "Exercise Name",
  "description": "Detailed description with setup, execution, and breathing cues (100+ chars)",
  "sets": 3,
  "reps": "8-12",
  "formTips": ["tip1", "tip2", "tip3"],
  "safetyTips": ["safety1", "safety2"],
  "restSeconds": 90,
  "usesWeight": true,
  "muscleGroups": ["muscle1", "muscle2"],
  "difficulty": "${(experience || 'beginner').toLowerCase()}"
}`;

      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are an expert personal trainer. Generate ONE exercise that complements an existing workout. Output ONLY valid JSON with no markdown formatting.',
          },
          { role: 'user', content: prompt },
        ],
      });

      const text = completion.choices[0]?.message?.content?.trim() || '';
      const cleanedText = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

      const exercise = JSON.parse(cleanedText);

      res.status(200).json({ exercise });
    } catch (e) {
      console.error('Add exercise error', e);
      res.status(500).json({ error: 'Failed to add exercise' });
    }
  },
);

/**
 * Swap an exercise with a similar alternative
 * Takes the exercise to replace and generates a similar but different exercise
 */
export const swapExercise = onRequest(
  {
    cors: [
      'http://localhost:5173',
      'https://neurafit-ai-2025.web.app',
      'https://neurafit-ai-2025.firebaseapp.com',
      'https://neurastack.ai',
      'https://www.neurastack.ai',
    ],
    region: 'us-central1',
    secrets: [openaiApiKey],
    timeoutSeconds: 60,
    memory: '512MiB',
  },
  async (req: Request, res: Response) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const {
        exerciseToReplace,
        currentWorkout,
        workoutType,
        experience,
        goals,
        equipment,
        injuries,
      } = req.body;

      if (!exerciseToReplace?.name || !currentWorkout?.exercises) {
        res.status(400).json({ error: 'Invalid request data' });
        return;
      }

      const client = new OpenAI({ apiKey: openaiApiKey.value() });

      const otherExercises = currentWorkout.exercises
        .filter((ex: { name: string }) => ex.name !== exerciseToReplace.name)
        .map((ex: { name: string }) => ex.name)
        .join(', ');

      const prompt = `You are replacing an exercise in a ${workoutType || 'Full Body'} workout with a similar alternative.

EXERCISE TO REPLACE:
- Name: ${exerciseToReplace.name}
- Muscle Groups: ${exerciseToReplace.muscleGroups?.join(', ') || 'N/A'}
- Sets: ${exerciseToReplace.sets}, Reps: ${exerciseToReplace.reps}
- Uses Weight: ${exerciseToReplace.usesWeight ? 'Yes' : 'No'}

OTHER EXERCISES IN WORKOUT (DO NOT DUPLICATE):
${otherExercises}

CLIENT PROFILE:
- Experience: ${experience || 'Beginner'}
- Goals: ${(goals || ['General Health']).join(', ')}
- Equipment: ${(equipment || ['Bodyweight']).join(', ')}
${injuries?.list?.length > 0 ? `- Injuries: ${injuries.list.join(', ')} - ${injuries.notes || ''}` : ''}

REQUIREMENTS:
1. Generate ONE exercise that targets the SAME muscle groups as the exercise being replaced
2. Use a DIFFERENT movement pattern or variation
3. DO NOT duplicate the exercise being replaced or any other exercises in the workout
4. Match the same sets/reps/rest scheme as the original exercise
5. Match the difficulty level: ${(experience || 'beginner').toLowerCase()}
6. Respect equipment availability and injury constraints

OUTPUT ONLY valid JSON (no markdown, no code blocks):
{
  "name": "Exercise Name",
  "description": "Detailed description with setup, execution, and breathing cues (100+ chars)",
  "sets": ${exerciseToReplace.sets},
  "reps": "${exerciseToReplace.reps}",
  "formTips": ["tip1", "tip2", "tip3"],
  "safetyTips": ["safety1", "safety2"],
  "restSeconds": ${exerciseToReplace.restSeconds || 90},
  "usesWeight": true,
  "muscleGroups": ["muscle1", "muscle2"],
  "difficulty": "${(experience || 'beginner').toLowerCase()}"
}`;

      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        max_tokens: 800,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are an expert personal trainer. Generate ONE exercise that replaces another while targeting the same muscles. Output ONLY valid JSON with no markdown formatting.',
          },
          { role: 'user', content: prompt },
        ],
      });

      const text = completion.choices[0]?.message?.content?.trim() || '';
      const cleanedText = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

      const exercise = JSON.parse(cleanedText);

      res.status(200).json({ exercise });
    } catch (e) {
      console.error('Swap exercise error', e);
      res.status(500).json({ error: 'Failed to swap exercise' });
    }
  },
);