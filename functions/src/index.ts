/**
 * Firebase Cloud Functions for NeuraFit AI Workout Generator
 * Production-ready backend with robust error handling and AI API best practices
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
import { FUNCTION_CONFIG, OPENAI_CONFIG, OPENAI_MODEL, CORS_ORIGINS, SINGLE_EXERCISE_CONFIG } from './config';
import { buildSingleExerciseSchema } from './lib/jsonSchema/workoutPlan.schema';
import { validateSingleExercise } from './lib/schemaValidator';
import { handleApiError, validateRequestBody } from './lib/errorHandler';

/**
 * Generate a single exercise with validation
 * Simplified: Trust AI output, only validate critical constraints
 */
async function generateSingleExerciseWithValidation(
  prompt: string,
  systemMessage: string,
  client: OpenAI,
  currentWorkout: { exercises: Array<{ name: string }> },
  exerciseToReplace?: { name: string },
): Promise<{ exercise: unknown }> {
  try {
    console.log('📤 Generating single exercise (non-streaming, structured output)');

    // Non-streaming with structured output for guaranteed valid JSON
    const completion = await client.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: OPENAI_CONFIG.temperature,
      max_tokens: 800,
      frequency_penalty: OPENAI_CONFIG.frequencyPenalty,
      presence_penalty: OPENAI_CONFIG.presencePenalty,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response_format: buildSingleExerciseSchema() as any,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt },
      ],
      // NO streaming - simpler, guaranteed valid JSON
    });

    const content = completion.choices[0]?.message?.content?.trim() || '';
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    // Parse JSON (guaranteed valid from structured output)
    let exercise: unknown;
    try {
      exercise = JSON.parse(content);
    } catch (e) {
      throw new Error(`Failed to parse exercise JSON: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Validate schema - only fail on critical errors
    const schemaCheck = validateSingleExercise(exercise);
    if (!schemaCheck.valid) {
      const hasCriticalError = schemaCheck.errors.some(
        (err) => err.includes('missing required') || err.includes('invalid type'),
      );
      if (hasCriticalError) {
        throw new Error(`Schema validation failed: ${schemaCheck.errors.join(', ')}`);
      }
      console.warn('⚠️ Schema validation warnings (accepting):', schemaCheck.errors);
    }

    // Check for duplicates - critical constraint
    const otherExercises = currentWorkout.exercises
      .filter((ex: { name: string }) => !exerciseToReplace || ex.name !== exerciseToReplace.name)
      .map((ex: { name: string }) => ex.name);

    const exerciseName = (exercise as Record<string, unknown>)?.name as string | undefined;
    if (!exerciseName) {
      throw new Error('Generated exercise missing name');
    }

    const hasSimilar = otherExercises.some((name: string) => isSimilarExercise(name, exerciseName));
    if (hasSimilar) {
      throw new Error(`Generated exercise is too similar to existing exercises: ${exerciseName}`);
    }

    console.log('✅ Single exercise generated successfully', { exerciseName });
    return { exercise };
  } catch (error) {
    throw error;
  }
}

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
      // Initialize OpenAI client with the secret value and timeout
      const apiKeyValue = openaiApiKey.value();
      if (!apiKeyValue) {
        console.error('❌ OpenAI API key is not configured');
        res.status(502).json({
          error: 'Service configuration error',
          details: 'Our AI service is temporarily unavailable. Please try again later.',
          retryable: false,
        });
        return;
      }

      // Validate request body exists
      const bodyValidation = validateRequestBody(req.body, []);
      if (!bodyValidation.valid) {
        console.warn('⚠️ Invalid request body:', bodyValidation.error);
        res.status(400).json({
          error: 'Invalid request',
          details: bodyValidation.error,
          retryable: false,
        });
        return;
      }

      const client = new OpenAI({
        apiKey: apiKeyValue,
        timeout: OPENAI_CONFIG.timeout, // Use config timeout (180s for all workouts)
      });

      // Extract and validate request body
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
        workoutType: finalWorkoutType,
        duration: finalDuration,
        experience: finalExperience,
        goals: filteredGoals,
        equipment: filteredEquipment,
        uid: uid ? `${uid.substring(0, 8)}...` : 'anonymous',
        timestamp: new Date().toISOString(),
      });

      // Use orchestrated generation with structured output
      const result = await generateWorkoutOrchestrated(workoutContext, client, uid);

      console.log('✅ Workout generated successfully', {
        exerciseCount: result.exercises?.length || 0,
        targetDuration: result.metadata?.targetDuration,
        actualDuration: result.metadata?.actualDuration,
        durationDifference: result.metadata?.durationDifference,
        generationTime: Date.now() - (result.metadata?.generatedAt || 0),
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
    region: SINGLE_EXERCISE_CONFIG.region,
    secrets: [openaiApiKey],
    timeoutSeconds: SINGLE_EXERCISE_CONFIG.timeoutSeconds,
    memory: SINGLE_EXERCISE_CONFIG.memory,
  },
  async (req: Request, res: Response) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed', retryable: false });
      return;
    }

    try {
      const { currentWorkout, workoutType, experience, goals, equipment, injuries } = req.body;

      // Validate request
      if (!currentWorkout?.exercises || !Array.isArray(currentWorkout.exercises) || currentWorkout.exercises.length === 0) {
        console.warn('⚠️ Invalid add exercise request: missing or empty exercises');
        res.status(400).json({
          error: 'Invalid request',
          details: 'currentWorkout with exercises is required',
          retryable: false,
        });
        return;
      }

      const apiKeyValue = openaiApiKey.value();
      if (!apiKeyValue) {
        console.error('❌ OpenAI API key not configured for add exercise');
        res.status(502).json({
          error: 'Service configuration error',
          details: 'Our AI service is temporarily unavailable. Please try again later.',
          retryable: false,
        });
        return;
      }

      const client = new OpenAI({
        apiKey: apiKeyValue,
        timeout: OPENAI_CONFIG.singleExerciseTimeout,
      });

      const existingExercises = currentWorkout.exercises.map((ex: { name: string }) => ex.name).join(', ');
      const programming = getProgrammingRecommendations(goals || ['General Health'], experience || 'Beginner');
      const workoutTypeGuidance = getWorkoutTypeContext(workoutType);
      const isTimeBasedWorkout = workoutType && ['Cardio', 'Yoga', 'Pilates', 'Core Focus', 'HIIT'].includes(workoutType);

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

OUTPUT ONLY valid JSON with no markdown.`;

      const systemMessage = 'You are an expert personal trainer. Generate ONE exercise that complements an existing workout. The exercise MUST be completely unique and different from all existing exercises - no variations or similar movements. Output ONLY valid JSON.';

      const result = await generateSingleExerciseWithValidation(
        prompt,
        systemMessage,
        client,
        currentWorkout,
      );

      res.status(200).json(result);
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
    region: SINGLE_EXERCISE_CONFIG.region,
    secrets: [openaiApiKey],
    timeoutSeconds: SINGLE_EXERCISE_CONFIG.timeoutSeconds,
    memory: SINGLE_EXERCISE_CONFIG.memory,
  },
  async (req: Request, res: Response) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed', retryable: false });
      return;
    }

    try {
      const { exerciseToReplace, currentWorkout, workoutType, experience, goals, equipment, injuries } = req.body;

      if (!exerciseToReplace?.name || !currentWorkout?.exercises) {
        console.warn('⚠️ Invalid swap exercise request: missing exercise or workout data');
        res.status(400).json({
          error: 'Invalid request',
          details: 'exerciseToReplace and currentWorkout are required',
          retryable: false,
        });
        return;
      }

      const apiKeyValue = openaiApiKey.value();
      if (!apiKeyValue) {
        console.error('❌ OpenAI API key not configured for swap exercise');
        res.status(502).json({
          error: 'Service configuration error',
          details: 'Our AI service is temporarily unavailable. Please try again later.',
          retryable: false,
        });
        return;
      }

      const client = new OpenAI({
        apiKey: apiKeyValue,
        timeout: OPENAI_CONFIG.singleExerciseTimeout,
      });

      const otherExercises = currentWorkout.exercises
        .filter((ex: { name: string }) => ex.name !== exerciseToReplace.name)
        .map((ex: { name: string }) => ex.name)
        .join(', ');

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

OUTPUT ONLY valid JSON with no markdown.`;

      const systemMessage = 'You are an expert personal trainer. Generate ONE exercise that replaces another while targeting the same muscles but using a DIFFERENT movement pattern. The replacement MUST NOT duplicate any existing exercises. Output ONLY valid JSON.';

      const result = await generateSingleExerciseWithValidation(
        prompt,
        systemMessage,
        client,
        currentWorkout,
        exerciseToReplace,
      );

      // Additional check: ensure it's not a minor variation of the original
      const exercise = result.exercise as { name: string };
      const isMinorVariation = isMinorExerciseVariation(exerciseToReplace.name, exercise.name);
      if (isMinorVariation) {
        throw new Error(`Replacement exercise is too similar to the original exercise - please provide a different movement pattern`);
      }

      res.status(200).json(result);
    } catch (e) {
      handleApiError(e, res, 'Swap exercise');
    }
  },
);

