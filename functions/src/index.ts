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
import { FUNCTION_CONFIG, OPENAI_CONFIG, OPENAI_MODEL } from './config';
import { getExerciseContextValidationErrors } from './lib/exerciseContextValidation';
import { buildSingleExerciseSchema } from './lib/jsonSchema/workoutPlan.schema';
import { validateSingleExercise } from './lib/schemaValidator';
import { handleApiError } from './lib/errorHandler';

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
      handleApiError(e, res, 'Workout generation');
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
        timeout: OPENAI_CONFIG.singleExerciseTimeout, // Use config timeout for single exercise generation
      });

      const existingExercises = currentWorkout.exercises.map((ex: { name: string }) => ex.name).join(', ');
      const programming = getProgrammingRecommendations(goals || ['General Health'], experience || 'Beginner');

      // Get workout type context for better exercise matching
      const workoutTypeGuidance = getWorkoutTypeContext(workoutType);

      // Determine if this is a time-based workout
      const isTimeBasedWorkout = workoutType && ['Cardio', 'Yoga', 'Pilates', 'Core Focus', 'HIIT'].includes(workoutType);
      const repFormat = isTimeBasedWorkout ? '"45s" (time format)' : '"8-12" (range format)';

      const prompt = `Add ONE new exercise to a ${workoutType || 'Full Body'} workout.

EXISTING EXERCISES (DO NOT DUPLICATE):
${existingExercises}

CLIENT: ${experience || 'Beginner'} | Goals: ${(goals || ['General Health']).join(', ')} | Equipment: ${(equipment || ['Bodyweight']).join(', ')}
${injuries?.list?.length > 0 ? `Injuries: ${injuries.list.join(', ')}` : ''}

${workoutTypeGuidance}

REQUIREMENTS:
- COMPLETELY different from existing exercises (different movement pattern)
- Match ${workoutType || 'Full Body'} workout type
- ${programming.sets?.[0]}-${programming.sets?.[1]} sets, ${isTimeBasedWorkout ? 'time format ("30s", "45s", "60s")' : `${programming.reps?.[0]}-${programming.reps?.[1]} reps`}, ${programming.restSeconds?.[0]}-${programming.restSeconds?.[1]}s rest
- ${(experience || 'beginner').toLowerCase()} difficulty
- Use ONLY: ${(equipment || ['Bodyweight']).join(', ')}
${isTimeBasedWorkout ? '- CRITICAL: Use time format ("30s", "45s", "60s") NOT ranges' : ''}

OUTPUT ONLY valid JSON:
{
  "name": "Exercise Name",
  "description": "Setup, execution, breathing cues",
  "sets": 3,
  "reps": ${repFormat},
  "formTips": ["Tip 1", "Tip 2", "Tip 3"],
  "safetyTips": ["Safety 1", "Safety 2"],
  "restSeconds": 90,
  "usesWeight": ${isTimeBasedWorkout ? 'false' : 'true'},
  "muscleGroups": ["muscle1", "muscle2"],
  "difficulty": "${(experience || 'beginner').toLowerCase()}"
}`;

      const completion = await client.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: OPENAI_CONFIG.temperature,
        max_tokens: 800,
        // Use strict JSON Schema for stronger guarantees
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        response_format: buildSingleExerciseSchema() as any,
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

      // Validate against schema for robustness
      const schemaCheck = validateSingleExercise(exercise);
      if (!schemaCheck.valid) {
        console.warn('Generated exercise failed schema validation:', schemaCheck.errors);
        res.status(500).json({
          error: 'Generated exercise failed validation',
          details: schemaCheck.errors,
          retryable: true,
        });
        return;
      }

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
      handleApiError(e, res, 'Add exercise');
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
        timeout: OPENAI_CONFIG.singleExerciseTimeout, // Use config timeout for single exercise generation
      });

      const otherExercises = currentWorkout.exercises
        .filter((ex: { name: string }) => ex.name !== exerciseToReplace.name)
        .map((ex: { name: string }) => ex.name)
        .join(', ');

      // Determine if this is a time-based workout
      const isTimeBasedWorkout = workoutType && ['Cardio', 'Yoga', 'Pilates', 'Core Focus', 'HIIT'].includes(workoutType);

      const prompt = `Replace "${exerciseToReplace.name}" in a ${workoutType || 'Full Body'} workout with a similar alternative.

ORIGINAL: ${exerciseToReplace.name} (${exerciseToReplace.muscleGroups?.join(', ') || 'N/A'}) | ${exerciseToReplace.sets}x${exerciseToReplace.reps}

OTHER EXERCISES (DO NOT DUPLICATE):
${otherExercises}

CLIENT: ${experience || 'Beginner'} | Goals: ${(goals || ['General Health']).join(', ')} | Equipment: ${(equipment || ['Bodyweight']).join(', ')}
${injuries?.list?.length > 0 ? `Injuries: ${injuries.list.join(', ')}` : ''}

REQUIREMENTS:
- Target SAME muscle groups as "${exerciseToReplace.name}"
- Use DIFFERENT movement pattern (not just equipment swap)
- Match: ${exerciseToReplace.sets}x${exerciseToReplace.reps}, ${exerciseToReplace.restSeconds || 90}s rest
- ${(experience || 'beginner').toLowerCase()} difficulty
- Use ONLY: ${(equipment || ['Bodyweight']).join(', ')}
- NOT similar to: ${otherExercises}
${isTimeBasedWorkout ? '- CRITICAL: Use time format ("30s", "45s", "60s") NOT ranges' : ''}

OUTPUT ONLY valid JSON:
{
  "name": "Exercise Name",
  "description": "Setup, execution, breathing cues",
  "sets": ${exerciseToReplace.sets},
  "reps": "${exerciseToReplace.reps}",
  "formTips": ["Tip 1", "Tip 2", "Tip 3"],
  "safetyTips": ["Safety 1", "Safety 2"],
  "restSeconds": ${exerciseToReplace.restSeconds || 90},
  "usesWeight": ${exerciseToReplace.usesWeight ? 'true' : 'false'},
  "muscleGroups": ["${exerciseToReplace.muscleGroups?.join('", "') || 'muscle1", "muscle2'}"],
  "difficulty": "${(experience || 'beginner').toLowerCase()}"
}`;

      const completion = await client.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: OPENAI_CONFIG.temperature,
        max_tokens: 800,
        // Use strict JSON Schema for stronger guarantees
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        response_format: buildSingleExerciseSchema() as any,
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

      // Validate against schema for robustness
      const schemaCheck = validateSingleExercise(exercise);
      if (!schemaCheck.valid) {
        console.warn('Replacement exercise failed schema validation:', schemaCheck.errors);
        res.status(500).json({
          error: 'Replacement exercise failed validation',
          details: schemaCheck.errors,
          retryable: true,
        });
        return;
      }

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
      handleApiError(e, res, 'Swap exercise');
    }
  },
);

