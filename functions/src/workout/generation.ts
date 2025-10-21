/**
 * Workout Generation Engine
 * Generates personalized workouts using AI with simple validation
 */

import OpenAI from 'openai';
import { WorkoutContext, ProgrammingContext, buildSystemMessage, buildWorkoutPrompt, buildOpenAIJsonSchema } from '../lib/promptBuilder';
import { getProgrammingRecommendations } from '../lib/exerciseDatabase';
import { validateWorkoutPlanJSON } from '../lib/schemaValidator';
import { validateAndAdjustDuration } from '../lib/durationAdjustment';
import { OPENAI_MODEL, OPENAI_CONFIG } from '../config';
import type { WorkoutPlan } from '../lib/jsonSchema/workoutPlan.schema';

/**
 * Fill in missing usesWeight values based on exercise name patterns
 * This handles cases where AI doesn't include this optional field
 */
function fillMissingUsesWeight(exercises: WorkoutPlan['exercises']): WorkoutPlan['exercises'] {
  const weightKeywords = ['dumbbell', 'barbell', 'kettlebell', 'weight', 'plate', 'cable', 'machine', 'smith'];

  return exercises.map((exercise) => {
    if (exercise.usesWeight === undefined || exercise.usesWeight === null) {
      const nameLower = exercise.name.toLowerCase();
      const usesWeight = weightKeywords.some((keyword) => nameLower.includes(keyword));
      return { ...exercise, usesWeight };
    }
    return exercise;
  });
}

/**
 * Retry logic for transient errors only
 * Implements exponential backoff for rate limits and server errors
 * Optimized for non-streaming approach with fast response times
 */
async function retryOnTransientError<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const status = (error as Record<string, unknown>)?.status as number | undefined;
      const code = (error as Record<string, unknown>)?.code as string | undefined;
      const errorMsg = lastError.message.toLowerCase();

      // Only retry on transient errors (rate limits, server errors, timeouts)
      const isTransient =
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        code === 'ETIMEDOUT' ||
        code === 'ECONNRESET' ||
        code === 'ECONNREFUSED' ||
        errorMsg.includes('timeout') ||
        errorMsg.includes('rate_limit') ||
        errorMsg.includes('connection');

      if (!isTransient || attempt >= maxRetries) throw lastError;

      // Exponential backoff: 200ms, 400ms, 800ms
      const delayMs = 200 * Math.pow(2, attempt);
      console.warn(`⚠️ Transient error (${status || code}), retry ${attempt + 1}/${maxRetries} after ${delayMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError || new Error('API call failed');
}

/**
 * Generation metadata attached to successful workouts
 */
export interface GenerationMetadata {
  model: string;
  temperature: number;
  actualDuration: number;
  targetDuration: number;
  durationDifference: number;
  repairAttempts: number;
  generatedAt: number;
}

/**
 * Extended workout plan with metadata
 */
export interface WorkoutPlanWithMetadata extends WorkoutPlan {
  metadata: GenerationMetadata;
}

/**
 * Generate personalized workout using AI
 * Simple, robust approach: call AI with clear prompt, validate schema, retry once if needed
 */
export async function generateWorkoutOrchestrated(
  ctx: WorkoutContext,
  openaiClient: OpenAI,
  uid?: string,
): Promise<WorkoutPlanWithMetadata> {
  const startTime = Date.now();

  console.log('⚡ Generating workout', {
    type: ctx.workoutType,
    duration: ctx.duration,
    experience: ctx.experience,
    goals: ctx.goals,
    equipment: ctx.equipment,
    uid: uid ? `${uid.substring(0, 8)}...` : 'anonymous',
    timestamp: new Date().toISOString(),
  });

  // Normalize inputs
  const duration = ctx.duration || 30;
  const workoutType = ctx.workoutType || 'Full Body';
  const experience = ctx.experience || 'Beginner';
  const goals = ctx.goals || ['General Health'];

  // Get programming guidelines
  const programmingResult = getProgrammingRecommendations(goals, experience);
  const programming: ProgrammingContext = {
    sets: programmingResult.sets || [3, 4],
    reps: programmingResult.reps || [8, 12],
    restSeconds: programmingResult.restSeconds || [60, 120],
    intensity: programmingResult.intensity || '65-85% 1RM',
  };

  // Build prompts
  const { prompt, minExerciseCount, maxExerciseCount } = buildWorkoutPrompt(ctx, programming);
  const systemMessage = buildSystemMessage(duration, workoutType);
  const responseFormat = buildOpenAIJsonSchema(minExerciseCount, maxExerciseCount);

  let candidate: WorkoutPlan | undefined;

  // Generate with retry on transient errors only
  try {
    console.log('📤 Generating workout (non-streaming, structured output)');

    // Call OpenAI with structured JSON output (guarantees valid JSON)
    // Non-streaming approach: typically completes in 3-8 seconds
    const response = await retryOnTransientError(async () => {
      return await openaiClient.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: OPENAI_CONFIG.temperature,
        top_p: OPENAI_CONFIG.topP,
        max_tokens: OPENAI_CONFIG.maxTokens,
        frequency_penalty: OPENAI_CONFIG.frequencyPenalty,
        presence_penalty: OPENAI_CONFIG.presencePenalty,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        response_format: responseFormat as any,
        messages: [
          { role: 'system' as const, content: systemMessage },
          { role: 'user' as const, content: prompt },
        ],
        // NO streaming - simpler, more robust, guaranteed valid JSON
      });
    });

    // Extract content (guaranteed valid JSON from structured output)
    const content = response.choices[0]?.message?.content;
    if (!content || content.trim().length === 0) {
      throw new Error('Empty response from OpenAI');
    }

    // Parse JSON (should always succeed with structured output)
    try {
      candidate = JSON.parse(content) as WorkoutPlan;
    } catch (parseError) {
      throw new Error(`JSON parse failed: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

    // Fill in missing usesWeight values before validation
    candidate.exercises = fillMissingUsesWeight(candidate.exercises);

    // Validate schema - trust AI, only fail on critical errors
    const schemaValidation = validateWorkoutPlanJSON(candidate, minExerciseCount, maxExerciseCount);
    if (!schemaValidation.valid) {
      const hasCriticalError = schemaValidation.errors.some(
        (e) => e.includes('Duplicate') || (e.includes('missing required') && !e.includes('usesWeight')),
      );

      if (hasCriticalError) {
        throw new Error(`Critical validation error: ${schemaValidation.errors.join(', ')}`);
      }
      // Accept response despite minor warnings - trust AI output
      if (schemaValidation.errors.length > 0) {
        console.warn('⚠️ Minor validation warnings (accepting):', schemaValidation.errors.slice(0, 2));
      }
    }

    // Validate critical requirements
    if (!candidate?.exercises || candidate.exercises.length === 0) {
      throw new Error('No exercises generated');
    }

    // Validate duration is reasonable (at least 5 minutes)
    const durationValidation = validateAndAdjustDuration(candidate, duration, minExerciseCount);
    if (durationValidation.actualDuration < 5) {
      throw new Error(`Workout duration too short: ${durationValidation.actualDuration.toFixed(1)}min`);
    }

    console.log('✅ Workout generated successfully');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Generation failed:', errorMsg);
    throw error;
  }

  if (!candidate) {
    throw new Error('Failed to generate valid workout');
  }

  // Collect metadata
  const durationValidation = validateAndAdjustDuration(candidate, duration, minExerciseCount);
  const metadata: GenerationMetadata = {
    model: OPENAI_MODEL,
    temperature: OPENAI_CONFIG.temperature,
    actualDuration: durationValidation.actualDuration,
    targetDuration: duration,
    durationDifference: durationValidation.difference,
    repairAttempts: 0, // No repairs needed with structured output
    generatedAt: Date.now(),
  };

  const elapsed = Date.now() - startTime;
  console.log(`✨ Generated in ${elapsed}ms`, {
    exercises: candidate.exercises.length,
    duration: durationValidation.actualDuration.toFixed(1),
    targetDuration: duration,
    durationDiff: durationValidation.difference.toFixed(1),
    model: OPENAI_MODEL,
  });

  return { ...candidate, metadata };
}

