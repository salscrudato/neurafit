/**
 * Firebase Cloud Functions for NeuraFit AI Workout Generator
 * Refactored for better maintainability and modularity
 */

import { initializeApp } from 'firebase-admin/app';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import type { Request, Response } from 'express';
import OpenAI from 'openai';

// Initialize Firebase Admin
initializeApp();

// Import utility modules
import { getWorkoutTypeContext, type WorkoutContext } from './lib/promptBuilder';
import { getProgrammingRecommendations } from './lib/exerciseDatabase';
import { isSimilarExercise, isMinorExerciseVariation } from './lib/exerciseTaxonomy';
import { generateWorkoutOrchestrated } from './workout/generation';
import { FUNCTION_CONFIG, OPENAI_CONFIG } from './config';
import { getExerciseContextValidationErrors } from './lib/exerciseContextValidation';

// CORS configuration for all deployment URLs
const CORS_ORIGINS: string[] = [
  'http://localhost:5173', // local dev
  'https://neurafit-ai-2025.web.app', // Firebase Hosting
  'https://neurafit-ai-2025.firebaseapp.com',
  'https://neurastack.ai', // Custom domain
  'https://www.neurastack.ai', // Custom domain with www
];

// Define the OpenAI API key secret
const openaiApiKey = defineSecret('OPENAI_API_KEY');

/**
 * Main AI-powered workout generator function
 * Generates personalized workouts based on user profile and preferences
 * Uses schema-driven generation with multi-pass validation and repair
 */
export const generateWorkout = onRequest(
  {
    cors: CORS_ORIGINS,
    region: FUNCTION_CONFIG.region,
    secrets: [openaiApiKey],
    timeoutSeconds: FUNCTION_CONFIG.timeoutSeconds,
    memory: FUNCTION_CONFIG.memory,
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
      // Validate request body exists - use empty object as fallback
      if (!req.body) {
        console.warn('Empty request body received, using defaults');
        // Don't fail - continue with defaults
      }

      // Initialize OpenAI client with the secret value and timeout
      const apiKeyValue = openaiApiKey.value();
      if (!apiKeyValue) {
        console.error('OpenAI API key is not set');
        res.status(502).json({
          error: 'AI service configuration error',
          details: 'Please try again later',
        });
        return;
      }

      const client = new OpenAI({
        apiKey: apiKeyValue,
        timeout: OPENAI_CONFIG.timeout, // Use config timeout (180s for all workouts)
      });

      // Extract request body
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
        preferenceNotes,
        uid,
      } = (req.body as {
        experience?: string;
        goals?: string | string[];
        equipment?: string | string[];
        personalInfo?: {
          sex?: string;
          heightRange?: string;
          height?: string;
          weightRange?: string;
          weight?: string;
        };
        injuries?: { list?: string[]; notes?: string };
        workoutType?: string;
        duration?: number;
        targetIntensity?: number;
        progressionNote?: string;
        recentWorkouts?: Array<{
          workoutType: string;
          timestamp: number;
          exercises: Array<{ name: string }>;
          completionRate?: number;
          rpe?: number;
          feedback?: 'easy' | 'right' | 'hard';
        }>;
        preferenceNotes?: string;
        uid?: string;
      }) || {};

      // Validate and provide fallbacks for required fields
      // Use sensible defaults to ensure robustness
      const finalExperience = experience || 'Intermediate';
      const finalWorkoutType = workoutType || 'Full Body';
      const finalDuration = duration || 30;

      if (!finalExperience || !finalWorkoutType || !finalDuration) {
        console.warn('Using fallback values for missing fields', {
          experience: finalExperience,
          workoutType: finalWorkoutType,
          duration: finalDuration,
        });
      }

      // Filter out undefined values from arrays and ensure string types
      const filteredGoals = Array.isArray(goals)
        ? goals.filter((g): g is string => Boolean(g))
        : goals ? [goals].filter((g): g is string => Boolean(g)) : ['General Fitness'];

      const filteredEquipment = Array.isArray(equipment)
        ? equipment.filter((e): e is string => Boolean(e))
        : equipment ? [equipment].filter((e): e is string => Boolean(e)) : ['Bodyweight'];

      // Build workout context with fallbacks
      const workoutContext: WorkoutContext = {
        experience: finalExperience,
        goals: filteredGoals.length > 0 ? filteredGoals : ['General Fitness'],
        equipment: filteredEquipment.length > 0 ? filteredEquipment : ['Bodyweight'],
        personalInfo,
        injuries,
        workoutType: finalWorkoutType,
        duration: Math.max(5, Math.min(finalDuration, 150)), // Clamp between 5-150 minutes
        targetIntensity,
        progressionNote,
        recentWorkouts,
        preferenceNotes,
      };

      console.log('🏋️ Starting workout generation', {
        workoutType,
        duration,
        experience,
        uid: uid ? `${uid.substring(0, 8)}...` : 'anonymous',
      });

      // Use new orchestrated generation with multi-pass validation
      const result = await generateWorkoutOrchestrated(workoutContext, client, uid);

      console.log('✅ Workout generated successfully', {
        exerciseCount: result.exercises?.length || 0,
        targetDuration: result.metadata?.targetDuration,
      });

      // Return workout with metadata
      res.json(result);
      return;
    } catch (e) {
      // Comprehensive error logging
      const errorMessage = e instanceof Error ? e.message : String(e);
      const errorStack = e instanceof Error ? e.stack : '';
      const errorCode = (e as Record<string, unknown>)?.code || 'UNKNOWN';
      const errorStatus = (e as Record<string, unknown>)?.status || 'UNKNOWN';
      const errorType = (e as Record<string, unknown>)?.type || 'UNKNOWN';

      console.error('❌ Workout generation error', {
        message: errorMessage,
        stack: errorStack,
        type: e instanceof Error ? e.constructor.name : typeof e,
        code: errorCode,
        status: errorStatus,
        errorType,
      });

      // Handle specific error types
      if (e instanceof Error) {
        const msg = e.message.toLowerCase();

        // Timeout errors
        if (msg.includes('timeout') || msg.includes('etimedout')) {
          res.status(504).json({
            error: 'Request timeout',
            details: 'Workout generation took too long. Please try again.',
            retryable: true,
          });
          return;
        }

        // Authentication errors
        if (errorStatus === 401 || errorStatus === 403 || msg.includes('unauthorized')) {
          res.status(502).json({
            error: 'AI service configuration error',
            details: 'Please try again later',
            retryable: false,
          });
          return;
        }

        // Rate limiting
        if (errorStatus === 429 || msg.includes('rate_limit')) {
          res.status(429).json({
            error: 'Too many requests',
            details: 'Please wait a moment and try again',
            retryable: true,
          });
          return;
        }

        // Server errors
        if (errorStatus === 500 || errorStatus === 502 || errorStatus === 503 || errorStatus === 504) {
          res.status(502).json({
            error: 'AI service temporarily unavailable',
            details: 'Please try again in a moment',
            retryable: true,
          });
          return;
        }

        // Validation or JSON errors - retryable
        if (msg.includes('validation') || msg.includes('json') || msg.includes('parse')) {
          res.status(500).json({
            error: 'Workout generation error',
            details: 'The generated workout did not meet quality standards. Please try again.',
            retryable: true,
          });
          return;
        }
      }

      // Generic error - always retryable
      res.status(500).json({
        error: 'Workout generation service error',
        details: 'An unexpected error occurred. Please try again in a moment.',
        retryable: true,
      });
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
    cors: CORS_ORIGINS,
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
      const { currentWorkout, workoutType, experience, goals, equipment, injuries } = req.body;

      // Validate request body
      if (!req.body) {
        console.error('Empty request body');
        res.status(400).json({ error: 'Request body is required' });
        return;
      }

      // Validate currentWorkout structure
      if (!currentWorkout) {
        console.error('Missing currentWorkout in request body');
        res.status(400).json({ error: 'currentWorkout is required' });
        return;
      }

      if (!Array.isArray(currentWorkout.exercises)) {
        console.error('currentWorkout.exercises is not an array:', typeof currentWorkout.exercises, currentWorkout.exercises);
        res.status(400).json({ error: 'currentWorkout.exercises must be an array' });
        return;
      }

      if (currentWorkout.exercises.length === 0) {
        console.error('currentWorkout.exercises is empty');
        res.status(400).json({ error: 'currentWorkout must have at least one exercise' });
        return;
      }

      const client = new OpenAI({
        apiKey: openaiApiKey.value(),
        timeout: OPENAI_CONFIG.timeout, // Use config timeout (120s)
      });

      const existingExercises = currentWorkout.exercises.map((ex: { name: string }) => ex.name).join(', ');
      const programming = getProgrammingRecommendations(goals || ['General Health'], experience || 'Beginner');

      // Get workout type context for better exercise matching
      const workoutTypeGuidance = getWorkoutTypeContext(workoutType);

      // Determine if this is a time-based workout
      const isTimeBasedWorkout = workoutType && ['Cardio', 'Yoga', 'Pilates', 'Core Focus', 'HIIT'].includes(workoutType);
      const repFormat = isTimeBasedWorkout ? '"45s" (time format)' : '"8-12" (range format)';
      const repInstruction = isTimeBasedWorkout
        ? '⚠️ CRITICAL: This is a time-based workout - reps MUST use time format like "30s", "45s", "60s" (NOT ranges like "8-12")'
        : 'Use rep range format like "8-12", "6-10", "12-15"';

      const prompt = `You are adding ONE additional exercise to an existing ${workoutType || 'Full Body'} workout.

⚠️ CRITICAL: The exercise you generate MUST be completely different from all existing exercises.

EXISTING EXERCISES IN WORKOUT (ABSOLUTELY DO NOT DUPLICATE OR USE SIMILAR VARIATIONS):
${existingExercises}

CLIENT PROFILE:
- Experience: ${experience || 'Beginner'}
- Goals: ${(goals || ['General Health']).join(', ')}
- Equipment: ${(equipment || ['Bodyweight']).join(', ')}
- Workout Type: ${workoutType || 'Full Body'}
${injuries?.list?.length > 0 ? `- Injuries: ${injuries.list.join(', ')} - ${injuries.notes || ''}` : ''}

WORKOUT TYPE GUIDANCE FOR ${workoutType || 'Full Body'}:
${workoutTypeGuidance}

CRITICAL REQUIREMENTS:
1. Generate ONE exercise that complements the existing workout
2. ⚠️ ABSOLUTELY DO NOT duplicate or use variations of existing exercises
   - If "Dumbbell Bench Press" exists, DO NOT use "Dumbbell Incline Press" or "Dumbbell Close-Grip Press"
   - If "Barbell Row" exists, DO NOT use "Dumbbell Row" or "Cable Row"
   - Choose a COMPLETELY DIFFERENT exercise targeting different movement patterns
3. MUST match the workout type: ${workoutType || 'Full Body'}
   - The exercise MUST align with the workout type guidance above
   - Use the example exercises and movement patterns as reference
   - Upper Body: Only chest, back, shoulders exercises
   - Lower Body: Only legs, glutes, hamstrings, quads exercises
   - Full Body: Balance of upper and lower body
   - Legs/Glutes: Hip-dominant and glute-focused movements
   - Chest/Triceps: Chest pressing and tricep isolation
   - Back/Biceps: Pulling movements and bicep work
   - Shoulders: Deltoid-focused exercises (front, side, rear)
   - Core Focus: Anti-extension, anti-rotation, stability
   - Cardio: Cardiovascular conditioning movements
   - HIIT: High-intensity explosive movements
   - Yoga: Flexibility and balance poses
   - Pilates: Core-focused controlled movements
4. Target muscle groups that are underrepresented in the current workout
5. Follow programming guidelines: ${programming.sets?.[0]}-${programming.sets?.[1]} sets, ${isTimeBasedWorkout ? 'time-based reps (30s, 45s, 60s)' : `${programming.reps?.[0]}-${programming.reps?.[1]} reps`}, ${programming.restSeconds?.[0]}-${programming.restSeconds?.[1]}s rest
6. Match the difficulty level: ${(experience || 'beginner').toLowerCase()}
7. Avoid contraindicated exercises if injuries are present
8. Use ONLY available equipment: ${(equipment || ['Bodyweight']).join(', ')}
9. ⚠️ BEFORE OUTPUTTING: Verify the exercise name is NOT similar to any existing exercise

REP FORMAT REQUIREMENT:
${repInstruction}

ALL FIELDS ARE MANDATORY - OUTPUT ONLY valid JSON (no markdown, no code blocks):
{
  "name": "Exercise Name (MUST be completely unique and different from existing exercises)",
  "description": "Detailed description with setup, execution, and breathing cues (100-150 chars)",
  "sets": 3,
  "reps": ${repFormat},
  "formTips": ["First form tip - specific and actionable", "Second form tip - addresses common error", "Third form tip - joint alignment or quality cue"],
  "safetyTips": ["First safety tip - injury prevention", "Second safety tip - modification option"],
  "restSeconds": 90,
  "usesWeight": ${isTimeBasedWorkout ? 'false' : 'true'},
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
            content:
              'You are an expert personal trainer. Generate ONE exercise that complements an existing workout. The exercise MUST be completely unique and different from all existing exercises - no variations or similar movements. Output ONLY valid JSON with no markdown formatting.',
          },
          { role: 'user', content: prompt },
        ],
      });

      const text = completion.choices[0]?.message?.content?.trim() || '';
      const cleanedText = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

      const exercise = JSON.parse(cleanedText);

      // Validate that the new exercise is not similar to existing ones
      const existingNames = currentWorkout.exercises.map((ex: { name: string }) => ex.name);
      const hasSimilar = existingNames.some((name: string) => isSimilarExercise(name, exercise.name));

      if (hasSimilar) {
        console.warn('Generated exercise is too similar to existing exercises:', exercise.name);
        res.status(400).json({
          error: 'Generated exercise is too similar to existing exercises',
          exercise: exercise.name,
        });
        return;
      }

      // Validate exercise matches workout type, equipment, and rep format
      const contextErrors = getExerciseContextValidationErrors(
        exercise.name,
        exercise.reps,
        workoutType || 'Full Body',
        equipment || ['Bodyweight'],
      );

      if (contextErrors.length > 0) {
        console.warn('Generated exercise failed context validation:', contextErrors);
        res.status(400).json({
          error: 'Generated exercise does not match workout context',
          details: contextErrors,
          exercise: exercise.name,
        });
        return;
      }

      res.status(200).json({ exercise });
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error('Add exercise error:', errorMsg);
      res.status(500).json({
        error: 'Failed to add exercise',
        details: process.env.NODE_ENV === 'development' ? errorMsg : undefined,
      });
    }
  },
);

/**
 * Swap an exercise with a similar alternative
 * Takes the exercise to replace and generates a similar but different exercise
 */
export const swapExercise = onRequest(
  {
    cors: CORS_ORIGINS,
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
      const { exerciseToReplace, currentWorkout, workoutType, experience, goals, equipment, injuries } = req.body;

      if (!exerciseToReplace?.name || !currentWorkout?.exercises) {
        res.status(400).json({ error: 'Invalid request data' });
        return;
      }

      const client = new OpenAI({
        apiKey: openaiApiKey.value(),
        timeout: 90000, // 90 second timeout
      });

      const otherExercises = currentWorkout.exercises
        .filter((ex: { name: string }) => ex.name !== exerciseToReplace.name)
        .map((ex: { name: string }) => ex.name)
        .join(', ');

      // Determine if this is a time-based workout
      const isTimeBasedWorkout = workoutType && ['Cardio', 'Yoga', 'Pilates', 'Core Focus', 'HIIT'].includes(workoutType);
      const repInstruction = isTimeBasedWorkout
        ? '⚠️ CRITICAL: This is a time-based workout - reps MUST use time format like "30s", "45s", "60s" (NOT ranges like "8-12")'
        : 'Use the same rep format as the original exercise';

      const prompt = `You are replacing an exercise in a ${workoutType || 'Full Body'} workout with a similar alternative.

EXERCISE TO REPLACE:
- Name: ${exerciseToReplace.name}
- Muscle Groups: ${exerciseToReplace.muscleGroups?.join(', ') || 'N/A'}
- Sets: ${exerciseToReplace.sets}, Reps: ${exerciseToReplace.reps}
- Rest: ${exerciseToReplace.restSeconds || 90}s
- Uses Weight: ${exerciseToReplace.usesWeight ? 'Yes' : 'No'}

OTHER EXERCISES IN WORKOUT (ABSOLUTELY DO NOT DUPLICATE):
${otherExercises}

CLIENT PROFILE:
- Experience: ${experience || 'Beginner'}
- Goals: ${(goals || ['General Health']).join(', ')}
- Equipment: ${(equipment || ['Bodyweight']).join(', ')}
- Workout Type: ${workoutType || 'Full Body'}
${injuries?.list?.length > 0 ? `- Injuries: ${injuries.list.join(', ')} - ${injuries.notes || ''}` : ''}

CRITICAL REQUIREMENTS:
1. Generate ONE exercise that targets the SAME or SIMILAR muscle groups as "${exerciseToReplace.name}"
2. Use a DIFFERENT movement pattern or equipment (acceptable variations):
   ✅ GOOD SWAPS (different movement pattern or equipment):
   - Barbell Bench Press → Cable Chest Press, Dumbbell Flyes, Push-ups, Dips
   - Barbell Row → Pull-ups, Lat Pulldown, Cable Row, Face Pulls
   - Barbell Squat → Leg Press, Bulgarian Split Squats, Goblet Squats
   - Dumbbell Curl → Cable Curl, Hammer Curl, Concentration Curl

   ❌ BAD SWAPS (too similar - just equipment change):
   - Barbell Bench Press → Dumbbell Bench Press (same movement, different equipment)
   - Barbell Row → Dumbbell Row (same movement, different equipment)
   - Barbell Squat → Dumbbell Squat (same movement, different equipment)

3. ⚠️ ABSOLUTELY DO NOT duplicate "${exerciseToReplace.name}" or any of these exercises: ${otherExercises}
4. MUST match the same sets/reps/rest scheme as the original exercise
5. Match the difficulty level: ${(experience || 'beginner').toLowerCase()}
6. Respect equipment availability: ${(equipment || ['Bodyweight']).join(', ')}
7. Avoid contraindicated exercises if injuries are present
8. The replacement should provide variety while maintaining workout effectiveness
9. ⚠️ BEFORE OUTPUTTING: Verify the exercise is NOT in the existing workout

REP FORMAT REQUIREMENT:
${repInstruction}

ALL FIELDS ARE MANDATORY - OUTPUT ONLY valid JSON (no markdown, no code blocks):
{
  "name": "Exercise Name (MUST be different from ${exerciseToReplace.name} and all other exercises)",
  "description": "Detailed description with setup, execution, and breathing cues (100-150 chars)",
  "sets": ${exerciseToReplace.sets},
  "reps": "${exerciseToReplace.reps}",
  "formTips": ["First form tip - specific and actionable", "Second form tip - addresses common error", "Third form tip - joint alignment or quality cue"],
  "safetyTips": ["First safety tip - injury prevention", "Second safety tip - modification option"],
  "restSeconds": ${exerciseToReplace.restSeconds || 90},
  "usesWeight": ${exerciseToReplace.usesWeight ? 'true' : 'false'},
  "muscleGroups": ["${exerciseToReplace.muscleGroups?.join('", "') || 'muscle1", "muscle2'}"],
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
            content:
              'You are an expert personal trainer. Generate ONE exercise that replaces another while targeting the same muscles but using a DIFFERENT movement pattern. The replacement MUST NOT duplicate any existing exercises. Output ONLY valid JSON with no markdown formatting.',
          },
          { role: 'user', content: prompt },
        ],
      });

      const text = completion.choices[0]?.message?.content?.trim() || '';
      const cleanedText = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

      const exercise = JSON.parse(cleanedText);

      // Validate that the replacement is not similar to existing exercises (except the one being replaced)
      const otherExerciseNames = currentWorkout.exercises
        .filter((ex: { name: string }) => ex.name !== exerciseToReplace.name)
        .map((ex: { name: string }) => ex.name);

      const hasSimilar = otherExerciseNames.some((name: string) => isSimilarExercise(name, exercise.name));

      if (hasSimilar) {
        console.warn('Replacement exercise is too similar to existing exercises:', exercise.name);
        res.status(400).json({
          error: 'Replacement exercise is too similar to existing exercises',
          exercise: exercise.name,
        });
        return;
      }

      // Check that it's not too similar to the original
      // For swaps, we allow different equipment variations (e.g., Cable Chest Press for Barbell Bench Press)
      // but reject minor variations (e.g., Dumbbell Bench Press for Barbell Bench Press)
      const isMinorVariation = isMinorExerciseVariation(exerciseToReplace.name, exercise.name);
      if (isMinorVariation) {
        console.warn('Replacement exercise is a minor variation of original:', exercise.name);
        res.status(400).json({
          error: 'Replacement exercise is too similar to the original exercise - please provide a different movement pattern',
          original: exerciseToReplace.name,
          replacement: exercise.name,
        });
        return;
      }

      // Validate exercise matches workout type, equipment, and rep format
      const contextErrors = getExerciseContextValidationErrors(
        exercise.name,
        exercise.reps,
        workoutType || 'Full Body',
        equipment || ['Bodyweight'],
      );

      if (contextErrors.length > 0) {
        console.warn('Replacement exercise failed context validation:', {
          exercise: exercise.name,
          reps: exercise.reps,
          workoutType,
          equipment,
          errors: contextErrors,
        });
        res.status(400).json({
          error: 'Replacement exercise does not match workout context',
          details: contextErrors,
          exercise: exercise.name,
        });
        return;
      }

      res.status(200).json({ exercise });
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error('Swap exercise error:', errorMsg);
      res.status(500).json({ error: 'Failed to swap exercise' });
    }
  },
);

