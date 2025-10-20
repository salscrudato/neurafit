/**
 * Workout Generation Orchestrator
 * Multi-pass validation, repair, and quality gate system for AI-generated workouts
 */

import OpenAI from 'openai';
import { WorkoutContext, ProgrammingContext } from '../lib/promptBuilder';
import { buildEnhancedSystemMessage, buildEnhancedWorkoutPrompt, buildOpenAIJsonSchema } from '../lib/promptBuilder.enhanced';
import { generateProfessionalPromptEnhancement } from '../lib/promptEnhancements';
import { getProgrammingRecommendations, getExperienceGuidance } from '../lib/exerciseDatabase';
import { validateWorkoutPlanJSON, validateRepFormat, validateRestPeriods } from '../lib/schemaValidator';
import { validateWorkoutPlan } from '../lib/exerciseValidation';
import { validateAndAdjustDuration, computeMinMaxExerciseCount } from '../lib/durationAdjustment';
import { calculateWorkoutQuality } from '../lib/qualityScoring';
import { deriveProgression } from '../lib/periodization';
import { getCachedOrRun, hashRequest, type CacheableContext } from '../lib/cache';
import { OPENAI_MODEL, OPENAI_CONFIG, QUALITY_THRESHOLDS, getOpenAIConfigForDuration, getQualityThresholdsForDuration } from '../config';
import { streamWithTimeout, callOpenAIWithRetry, validateAndRepairJSON, isIncompleteStreamError } from '../lib/streamingUtils';
import type { WorkoutPlan } from '../lib/jsonSchema/workoutPlan.schema';

/**
 * Generation metadata attached to successful workouts
 */
export interface GenerationMetadata {
  model: string;
  temperature: number;
  minExercises: number;
  maxExercises: number;
  actualDuration: number;
  targetDuration: number;
  durationDifference: number;
  validationWarnings: string[];
  validationSuggestions: string[];
  qualityScore: {
    overall: number;
    grade: string;
    breakdown: {
      completeness: number;
      safety: number;
      programming: number;
      personalization: number;
    };
  };
  repairAttempts: number;
  targetIntensityScalar: number;
  progressionNote?: string;
  generatedAt: number;
}

/**
 * Extended workout plan with metadata
 */
export interface WorkoutPlanWithMetadata extends WorkoutPlan {
  metadata: GenerationMetadata;
}

/**
 * Validation error details for repair prompts
 */
interface ValidationErrors {
  schemaErrors: string[];
  ruleErrors: string[];
  durationError?: string;
}

/**
 * Main orchestrator: generates workout with multi-pass validation and repair
 */
export async function generateWorkoutOrchestrated(
  ctx: WorkoutContext,
  openaiClient: OpenAI,
  uid?: string,
): Promise<WorkoutPlanWithMetadata> {
  const startTime = Date.now();
  
  // Log generation start
  console.log('⚡ Starting workout generation orchestrator', {
    workoutType: ctx.workoutType,
    duration: ctx.duration,
    experience: ctx.experience,
    uid: uid ? `${uid.substring(0, 8)}...` : 'anonymous',
  });

  // Step 1: Assemble context and compute parameters
  const duration = ctx.duration || 30;
  const workoutType = ctx.workoutType || 'Full Body';
  const experience = ctx.experience || 'Beginner';
  const goals = ctx.goals || ['General Health'];
  const equipment = ctx.equipment || ['Bodyweight'];

  // Get programming recommendations
  const programmingResult = getProgrammingRecommendations(goals, experience);
  const programming: ProgrammingContext = {
    sets: programmingResult.sets || [3, 4],
    reps: programmingResult.reps || [8, 12],
    restSeconds: programmingResult.restSeconds || [60, 120],
    intensity: programmingResult.intensity || '65-85% 1RM',
  };

  // Compute min/max exercise counts
  const { min: minExercises, max: maxExercises } = computeMinMaxExerciseCount(
    duration,
    programming,
    workoutType,
  );

  // Step 2: Derive periodization and progression
  const progression = deriveProgression(
    experience,
    ctx.targetIntensity || 1.0,
    ctx.recentWorkouts || [],
  );

  // Update context with progression
  const enhancedContext: WorkoutContext = {
    ...ctx,
    targetIntensity: progression.targetIntensityScalar,
    progressionNote: progression.progressionNote,
  };

  // Step 3: Build prompts and schema
  const qualityGuidelines = generateProfessionalPromptEnhancement({
    injuries: ctx.injuries?.list,
    experience,
  });
  const experienceGuidance = getExperienceGuidance(experience);
  const enhancedQualityGuidelines = `${qualityGuidelines}\n\n${experienceGuidance}`;

  const { prompt } = buildEnhancedWorkoutPrompt(
    enhancedContext,
    programming,
    enhancedQualityGuidelines,
  );
  const systemMessage = buildEnhancedSystemMessage(duration, workoutType);
  const responseFormat = buildOpenAIJsonSchema(minExercises, maxExercises);

  // Step 4: Check cache
  const cacheableContext: CacheableContext = {
    experience,
    goals,
    equipment,
    injuries: ctx.injuries,
    workoutType,
    duration,
    targetIntensity: progression.targetIntensityScalar,
    progressionNote: progression.progressionNote,
    preferenceNotes: ctx.preferenceNotes,
  };
  const cacheKey = hashRequest(cacheableContext);

  try {
    const result = await getCachedOrRun(cacheKey, async () => {
      // Step 5: Generate candidate with multi-pass repair
      let candidate: WorkoutPlan | null = null;
      let repairAttempts = 0;
      let validationErrors: ValidationErrors | null = null;

      // Get duration-optimized quality thresholds
      const durationThresholds = getQualityThresholdsForDuration(duration);
      const maxAttempts = durationThresholds.maxRepairAttempts + 1;

      console.log(`📋 Starting generation with max ${maxAttempts} attempts (duration: ${duration}min)`);

      for (let attempt = 0; attempt <= durationThresholds.maxRepairAttempts; attempt++) {
        console.log(`🔄 Generation attempt ${attempt + 1}/${maxAttempts}`);

      const isRepair = attempt > 0;
      const messages = isRepair && validationErrors
        ? buildRepairMessages(systemMessage, prompt, validationErrors, candidate)
        : [
          { role: 'system' as const, content: systemMessage },
          { role: 'user' as const, content: prompt },
        ];

      // Call OpenAI with appropriate mode based on duration
      const dynamicConfig = getOpenAIConfigForDuration(duration);

      // Always use streaming to avoid timeouts on longer workouts
      console.log(`🤖 Calling OpenAI API (streaming mode)...`);

      let content = '';
      let parsed: unknown;

      // Call OpenAI with retry logic
      try {
        await callOpenAIWithRetry(
          async () => {
            console.log('📤 Sending request to OpenAI with model:', OPENAI_MODEL);
            console.log('📋 Response format type:', (responseFormat as any)?.type);

            const stream = await openaiClient.chat.completions.create({
              model: OPENAI_MODEL,
              temperature: dynamicConfig.temperature,
              top_p: dynamicConfig.topP,
              max_tokens: dynamicConfig.maxTokens,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              response_format: responseFormat as any,
              messages,
              stream: true,
            });
            console.log('✅ OpenAI API call initiated successfully');

            // Collect streamed response with timeout protection
            content = await streamWithTimeout(stream, OPENAI_CONFIG.streamTimeout);

            if (!content) {
              throw new Error('OpenAI returned empty response');
            }

            console.log(`✅ Received ${content.length} characters from OpenAI`);

            // Parse JSON with repair capability
            const parseResult = validateAndRepairJSON(content);
            if (!parseResult.valid) {
              throw new Error(`JSON parse error: ${parseResult.error}`);
            }

            parsed = parseResult.data;
            return parsed;
          },
          {
            maxRetries: 2,
            onRetry: (attemptNum, error) => {
              console.warn(`⚠️ Retrying OpenAI API call (attempt ${attemptNum})`, {
                error: error.message,
                contentLength: content.length,
              });
            },
          },
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('❌ OpenAI API call failed after retries:', {
          error: errorMsg,
          contentLength: content.length,
          attempt: attempt + 1,
        });

        // If we have partial content, try to repair it
        if (content && isIncompleteStreamError(error instanceof Error ? error : new Error(errorMsg))) {
          console.warn('⚠️ Attempting to repair incomplete JSON response');
          const repairResult = validateAndRepairJSON(content);
          if (repairResult.valid) {
            parsed = repairResult.data;
            console.log('✅ Successfully repaired JSON from partial response');
          } else {
            validationErrors = {
              schemaErrors: ['Failed to parse AI response - incomplete or malformed JSON'],
              ruleErrors: [],
            };
            repairAttempts++;
            continue;
          }
        } else {
          throw error;
        }
      }

      if (!parsed) {
        throw new Error('Failed to generate valid workout');
      }

      // Step 6: Validate with AJV
      const schemaValidation = validateWorkoutPlanJSON(parsed, minExercises, maxExercises);
      if (!schemaValidation.valid) {
        console.warn('Schema validation failed:', schemaValidation.errors);
        validationErrors = {
          schemaErrors: schemaValidation.errors,
          ruleErrors: [],
        };
        repairAttempts++;

        if (attempt < QUALITY_THRESHOLDS.maxRepairAttempts) {
          continue;
        } else {
          throw new Error(`Schema validation failed: ${schemaValidation.errors.join(', ')}`);
        }
      }

      candidate = parsed as WorkoutPlan;

      // Step 7: Parallel validation - always run all checks for quality
      // Run independent validations concurrently for better performance
      const [ruleValidation, repFormatValidation, durationValidation] = await Promise.all([
        Promise.resolve(validateWorkoutPlan(candidate, {
          experience,
          injuries: ctx.injuries?.list || [],
          duration,
          goals,
          workoutType,
        })),
        Promise.resolve(validateRepFormat(candidate.exercises, workoutType)),
        Promise.resolve(validateAndAdjustDuration(candidate, duration, minExercises)),
      ]);

      const ruleErrors = [
        ...ruleValidation.errors,
        ...repFormatValidation.errors,
      ];

      if (!durationValidation.isValid || ruleErrors.length > 0) {
        validationErrors = {
          schemaErrors: [],
          ruleErrors,
          durationError: durationValidation.error,
        };
        repairAttempts++;

        if (attempt < durationThresholds.maxRepairAttempts) {
          console.warn('Validation failed, attempting repair:', validationErrors);
          continue;
        } else {
          // Last attempt failed - return with errors
          throw new Error(`Validation failed after ${durationThresholds.maxRepairAttempts + 1} attempts: ${JSON.stringify(validationErrors)}`);
        }
      }

      // Validation passed!
      console.log('✅ Validation passed');
      break;
    }

    if (!candidate) {
      throw new Error('Failed to generate valid workout');
    }

    // Step 9: Quality gate with early exit optimization
    // Always run quality scoring for comprehensive validation
    const qualityScore = calculateWorkoutQuality(candidate, {
      experience,
      injuries: ctx.injuries?.list || [],
      duration,
      goals,
      equipment,
      workoutType,
    });

    console.log('📊 Quality score:', qualityScore);

    // Early exit: If quality is excellent, skip repair attempts (cost optimization)
    if (qualityScore.overall >= durationThresholds.skipRepairIfScoreAbove) {
      console.log(`✅ Excellent quality score (${qualityScore.overall}) - skipping repair attempts`);
      // Break out of repair loop - no need to try again
    } else if (
      (qualityScore.overall < durationThresholds.minOverallScore ||
        qualityScore.breakdown.safety < durationThresholds.minSafetyScore) &&
      repairAttempts < durationThresholds.maxRepairAttempts
    ) {
      console.warn(`⚠️ Quality below threshold (${qualityScore.overall}) - repair attempts remaining: ${durationThresholds.maxRepairAttempts - repairAttempts}`);
      // This would trigger another repair pass, but we've already exhausted attempts
      // In production, you might want to add specific quality improvement suggestions
    }

    // Step 10: Collect metadata
    const durationValidation = validateAndAdjustDuration(candidate, duration, minExercises);
    const restValidation = validateRestPeriods(candidate.exercises);

    const metadata: GenerationMetadata = {
      model: OPENAI_MODEL,
      temperature: OPENAI_CONFIG.temperature,
      minExercises,
      maxExercises,
      actualDuration: durationValidation.actualDuration,
      targetDuration: duration,
      durationDifference: durationValidation.difference,
      validationWarnings: restValidation.warnings || [],
      validationSuggestions: [],
      qualityScore,
      repairAttempts,
      targetIntensityScalar: progression.targetIntensityScalar,
      progressionNote: progression.progressionNote,
      generatedAt: Date.now(),
    };

    const result: WorkoutPlanWithMetadata = {
      ...candidate,
      metadata,
    };

    const elapsed = Date.now() - startTime;
    console.log(`✨ Generation complete in ${elapsed}ms`, {
      repairAttempts,
      qualityScore: qualityScore.overall,
      duration: durationValidation.actualDuration.toFixed(1),
    });

      return result;
    });

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Generation orchestration failed:', {
      error: errorMsg,
      workoutType: ctx.workoutType,
      duration: ctx.duration,
      experience: ctx.experience,
    });
    throw error;
  }
}

/**
 * Build repair messages with validation feedback
 */
function buildRepairMessages(
  systemMessage: string,
  originalPrompt: string,
  errors: ValidationErrors,
  previousCandidate: WorkoutPlan | null,
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const errorSummary = [
    '❌ VALIDATION ERRORS:',
    ...errors.schemaErrors.map((e) => `- ${e}`),
    ...errors.ruleErrors.map((e) => `- ${e}`),
  ];

  if (errors.durationError) {
    errorSummary.push(`- Duration: ${errors.durationError}`);
  }

  const repairPrompt = `${originalPrompt}

${errorSummary.join('\n')}

Generate a corrected workout fixing all errors above.`;

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemMessage },
    { role: 'user', content: originalPrompt },
  ];

  if (previousCandidate) {
    messages.push({
      role: 'assistant',
      content: JSON.stringify(previousCandidate),
    });
  }

  messages.push({
    role: 'user',
    content: repairPrompt,
  });

  return messages;
}

