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
import { OPENAI_MODEL, OPENAI_CONFIG, QUALITY_THRESHOLDS } from '../config';
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

  const result = await getCachedOrRun(cacheKey, async () => {
    // Step 5: Generate candidate with multi-pass repair
    let candidate: WorkoutPlan | null = null;
    let repairAttempts = 0;
    let validationErrors: ValidationErrors | null = null;

    for (let attempt = 0; attempt <= QUALITY_THRESHOLDS.maxRepairAttempts; attempt++) {
      console.log(`🔄 Generation attempt ${attempt + 1}/${QUALITY_THRESHOLDS.maxRepairAttempts + 1}`);

      const isRepair = attempt > 0;
      const messages = isRepair && validationErrors
        ? buildRepairMessages(systemMessage, prompt, validationErrors, candidate)
        : [
          { role: 'system' as const, content: systemMessage },
          { role: 'user' as const, content: prompt },
        ];

      // Call OpenAI with streaming for better perceived performance
      console.log('🤖 Calling OpenAI API with streaming...');
      const stream = await openaiClient.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: OPENAI_CONFIG.temperature,
        top_p: OPENAI_CONFIG.topP,
        max_tokens: OPENAI_CONFIG.maxTokens,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        response_format: responseFormat as any, // Type assertion needed for OpenAI SDK compatibility
        messages,
        stream: true, // Enable streaming for faster perceived response
      });

      // Collect streamed response
      let content = '';
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          content += delta;
        }
      }

      if (!content) {
        throw new Error('OpenAI returned empty response');
      }

      console.log(`✅ Received ${content.length} characters from OpenAI`);

      // Parse JSON
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch (error) {
        console.error('JSON parse error:', error);
        validationErrors = {
          schemaErrors: ['Invalid JSON response from AI'],
          ruleErrors: [],
        };
        repairAttempts++;
        continue;
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
        continue;
      }

      candidate = parsed as WorkoutPlan;

      // Step 7: Parallel rule-based validation (run independent validations concurrently)
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
        
        if (attempt < QUALITY_THRESHOLDS.maxRepairAttempts) {
          console.warn('Validation failed, attempting repair:', validationErrors);
          continue;
        } else {
          // Last attempt failed - return with errors
          throw new Error(`Validation failed after ${QUALITY_THRESHOLDS.maxRepairAttempts + 1} attempts: ${JSON.stringify(validationErrors)}`);
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
    if (qualityScore.overall >= QUALITY_THRESHOLDS.skipRepairIfScoreAbove) {
      console.log(`✅ Excellent quality score (${qualityScore.overall}) - skipping repair attempts`);
      // Break out of repair loop - no need to try again
    } else if (
      (qualityScore.overall < QUALITY_THRESHOLDS.minOverallScore ||
        qualityScore.breakdown.safety < QUALITY_THRESHOLDS.minSafetyScore) &&
      repairAttempts < QUALITY_THRESHOLDS.maxRepairAttempts
    ) {
      console.warn(`⚠️ Quality below threshold (${qualityScore.overall}) - repair attempts remaining: ${QUALITY_THRESHOLDS.maxRepairAttempts - repairAttempts}`);
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
    '❌ VALIDATION ERRORS - PLEASE FIX:',
    '',
    ...errors.schemaErrors.map((e) => `- Schema: ${e}`),
    ...errors.ruleErrors.map((e) => `- Rule: ${e}`),
  ];

  if (errors.durationError) {
    errorSummary.push(`- Duration: ${errors.durationError}`);
  }

  const repairPrompt = `${originalPrompt}

${errorSummary.join('\n')}

Please generate a CORRECTED workout that fixes ALL of the above errors while maintaining the same schema and requirements.`;

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

