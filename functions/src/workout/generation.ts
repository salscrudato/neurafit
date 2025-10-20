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
import { streamWithTimeout, callOpenAIWithRetry, validateAndRepairJSON } from '../lib/streamingUtils';
import type { WorkoutPlan } from '../lib/jsonSchema/workoutPlan.schema';

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
    uid: uid ? `${uid.substring(0, 8)}...` : 'anonymous',
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

  let repairAttempts = 0;
  let candidate: WorkoutPlan | undefined;

  // Try generation with one retry
  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      console.log(`📤 Generation attempt ${attempt + 1}/2`);

      let content = '';

      // Call OpenAI with retry logic
      await callOpenAIWithRetry(async () => {
        const stream = await openaiClient.chat.completions.create({
          model: OPENAI_MODEL,
          temperature: OPENAI_CONFIG.temperature,
          top_p: OPENAI_CONFIG.topP,
          max_tokens: OPENAI_CONFIG.maxTokens,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          response_format: responseFormat as any,
          messages: [
            { role: 'system' as const, content: systemMessage },
            { role: 'user' as const, content: prompt },
          ],
          stream: true,
        });

        content = await streamWithTimeout(stream, OPENAI_CONFIG.streamTimeout);
        if (!content) throw new Error('Empty response from OpenAI');

        // Parse and validate JSON
        const parseResult = validateAndRepairJSON(content);
        if (!parseResult.valid) {
          throw new Error(`JSON parse failed: ${parseResult.error}`);
        }

        // Validate schema
        const schemaValidation = validateWorkoutPlanJSON(parseResult.data, minExerciseCount, maxExerciseCount);
        if (!schemaValidation.valid) {
          throw new Error(`Schema validation failed: ${schemaValidation.errors.join(', ')}`);
        }

        candidate = parseResult.data as WorkoutPlan;
      });

      // Validate critical requirements
      if (!candidate?.exercises || candidate.exercises.length === 0) {
        throw new Error('No exercises generated');
      }

      const durationValidation = validateAndAdjustDuration(candidate, duration, minExerciseCount);
      if (durationValidation.actualDuration < 5) {
        throw new Error('Workout duration too short');
      }

      console.log('✅ Workout generated successfully');
      break;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️ Attempt ${attempt + 1} failed:`, errorMsg);

      if (attempt < 1) {
        repairAttempts++;
        continue;
      }

      throw error;
    }
  }

  if (!candidate) {
    throw new Error('Failed to generate valid workout after retries');
  }

  // Collect metadata
  const durationValidation = validateAndAdjustDuration(candidate, duration, minExerciseCount);
  const metadata: GenerationMetadata = {
    model: OPENAI_MODEL,
    temperature: OPENAI_CONFIG.temperature,
    actualDuration: durationValidation.actualDuration,
    targetDuration: duration,
    durationDifference: durationValidation.difference,
    repairAttempts,
    generatedAt: Date.now(),
  };

  const elapsed = Date.now() - startTime;
  console.log(`✨ Complete in ${elapsed}ms`, {
    exercises: candidate.exercises.length,
    duration: durationValidation.actualDuration.toFixed(1),
  });

  return { ...candidate, metadata };
}

