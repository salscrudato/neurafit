/**
 * Firebase Cloud Functions for NeuraFit AI Workout Generator
 * Refactored for better maintainability and modularity
 */

import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import type { Request, Response } from 'express';
import OpenAI from 'openai';

// Import utility modules
import { getProgrammingRecommendations, getExperienceGuidance } from './lib/exerciseDatabase';
import { validateWorkoutPlan } from './lib/exerciseValidation';
import { generateProfessionalPromptEnhancement } from './lib/promptEnhancements';
import { buildWorkoutPrompt, buildSystemMessage, getWorkoutTypeContext, type WorkoutContext } from './lib/promptBuilder';
import { buildEnhancedSystemMessage, buildEnhancedWorkoutPrompt } from './lib/promptBuilder.enhanced';
import { calculateWorkoutQuality } from './lib/qualityScoring';
import { validateAndAdjustDuration } from './lib/durationAdjustment';

// Define the OpenAI API key secret
const openaiApiKey = defineSecret('OPENAI_API_KEY');

// CORS configuration for all deployment URLs
const CORS_ORIGINS = [
  'http://localhost:5173', // local dev
  'https://neurafit-ai-2025.web.app', // Firebase Hosting
  'https://neurafit-ai-2025.firebaseapp.com',
  'https://neurastack.ai', // Custom domain
  'https://www.neurastack.ai', // Custom domain with www
];

/**
 * Main AI-powered workout generator function
 * Generates personalized workouts based on user profile and preferences
 */
export const generateWorkout = onRequest(
  {
    cors: CORS_ORIGINS,
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
        }>;
        preferenceNotes?: string;
      }) || {};

      // Use intensity values from frontend (calculated by useWorkoutPreload hook)
      const finalTargetIntensity = targetIntensity || 1.0;
      const finalProgressionNote = progressionNote || '';

      // Filter out undefined values from arrays and ensure string types
      const filteredGoals = Array.isArray(goals)
        ? goals.filter((g): g is string => Boolean(g))
        : [goals].filter((g): g is string => Boolean(g));
      const filteredEquipment = Array.isArray(equipment)
        ? equipment.filter((e): e is string => Boolean(e))
        : [equipment].filter((e): e is string => Boolean(e));

      // Build workout context
      const workoutContext: WorkoutContext = {
        experience,
        goals: filteredGoals,
        equipment: filteredEquipment,
        personalInfo,
        injuries,
        workoutType,
        duration,
        targetIntensity: finalTargetIntensity,
        progressionNote: finalProgressionNote,
        recentWorkouts,
        preferenceNotes,
      };

      // Get programming recommendations with experience-level adjustments
      const programmingResult = getProgrammingRecommendations(
        filteredGoals,
        experience || 'Beginner',
      );

      // Extract programming context (ensure all required fields are present)
      const programming = {
        sets: programmingResult.sets || [3, 4],
        reps: programmingResult.reps || [8, 12],
        restSeconds: programmingResult.restSeconds || [60, 120],
        intensity: programmingResult.intensity || '65-85% 1RM',
      };

      // Generate quality guidelines with injury and experience context
      const qualityGuidelines = generateProfessionalPromptEnhancement({
        injuries: injuries?.list,
        experience,
      });

      // Add experience-level guidance to quality guidelines
      const experienceGuidance = getExperienceGuidance(experience || 'Beginner');
      const enhancedQualityGuidelines = `${qualityGuidelines}\n\n${experienceGuidance}`;

      // Use enhanced prompt system for better AI output
      const useEnhancedPrompts = true; // Feature flag for A/B testing

      let prompt: string;
      let systemMessage: string;
      let minExerciseCount: number;
      let maxExerciseCount: number;

      if (useEnhancedPrompts) {
        // Enhanced AI-engineered prompts with chain-of-thought reasoning
        const enhancedPrompt = buildEnhancedWorkoutPrompt(
          workoutContext,
          programming,
          enhancedQualityGuidelines,
        );
        prompt = enhancedPrompt.prompt;
        minExerciseCount = enhancedPrompt.minExerciseCount;
        maxExerciseCount = enhancedPrompt.maxExerciseCount;
        systemMessage = buildEnhancedSystemMessage(duration || 30, workoutType);
      } else {
        // Original prompt system
        const originalPrompt = buildWorkoutPrompt(
          workoutContext,
          programming,
          enhancedQualityGuidelines,
        );
        prompt = originalPrompt.prompt;
        minExerciseCount = originalPrompt.minExerciseCount;
        maxExerciseCount = originalPrompt.maxExerciseCount;
        systemMessage = buildSystemMessage(duration || 30, workoutType);
      }

      // Log generation start
      console.log('⚡ Generating workout with GPT-4o-mini', {
        duration: duration || 30,
        workoutType: workoutType || 'Full Body',
        experience: experience || 'Beginner',
        exerciseRange: `${minExerciseCount}-${maxExerciseCount}`,
      });

      // Call OpenAI API
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.2, // Lower temperature for more consistent JSON output
        max_tokens: 4500, // Sufficient for comprehensive workouts
        response_format: { type: 'json_object' }, // Enforce JSON output format
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt },
        ],
      });

      const text = completion.choices?.[0]?.message?.content ?? '';
      const finishReason = completion.choices?.[0]?.finish_reason;

      // Check if response was truncated due to token limit
      if (finishReason === 'length') {
        throw new Error(
          'AI response was truncated due to token limit. The workout generation was incomplete. Please try a shorter duration or simpler workout type.',
        );
      }

      // Clean JSON text by removing markdown code blocks if present
      const cleanedText = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

      // Parse and validate JSON output
      try {
        const json = JSON.parse(cleanedText) as {
          exercises: Array<{
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
          }>;
          workoutSummary: {
            totalVolume: string;
            primaryFocus: string;
            expectedRPE: string;
          };
        };

        // Validate minimum exercise count based on duration
        const exerciseCount = json.exercises?.length || 0;
        if (exerciseCount < minExerciseCount) {
          throw new Error(
            `AI generated only ${exerciseCount} exercises but at least ${minExerciseCount} are required for a ${duration || 30}-minute workout.`,
          );
        }

        // Validate and adjust workout duration
        const durationResult = validateAndAdjustDuration(
          json,
          duration || 30,
          minExerciseCount,
        );

        // Log duration validation
        console.log('Duration validation:', {
          actual: durationResult.actualDuration.toFixed(1),
          target: duration || 30,
          diff: durationResult.difference.toFixed(1),
          adjusted: durationResult.adjusted,
        });

        if (durationResult.adjusted) {
          console.log('Duration adjustments:', durationResult.changes);
        }

        // Reject if duration is still too far off (only for extreme cases)
        if (durationResult.error && Math.abs(durationResult.difference) > 10) {
          console.error(durationResult.error);
          throw new Error(durationResult.error);
        } else if (durationResult.error) {
          // Log warning but allow workout through if difference is < 10 minutes
          console.warn('Duration variance warning:', durationResult.error);
        }

        // Professional workout validation with rule-based scoring
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

        // Reject workouts with critical safety issues
        if (!validationResult.isValid) {
          console.error('Generated workout failed safety validation:', validationResult.errors);
          res.status(502).json({
            error: 'Generated workout failed safety validation',
            validationErrors: validationResult.errors,
            raw: text,
          });
          return;
        }

        // Calculate quality score
        const qualityScore = calculateWorkoutQuality(json, userProfileForValidation);
        console.info('Workout Quality Score:', {
          overall: qualityScore.overall,
          grade: qualityScore.grade,
          breakdown: qualityScore.breakdown,
        });

        // Add metadata to response
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
              breakdown: qualityScore.breakdown,
              method: 'rule-based',
            },
            duration: {
              actual: durationResult.actualDuration,
              target: duration || 30,
              adjusted: durationResult.adjusted,
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

      if (!currentWorkout?.exercises || !Array.isArray(currentWorkout.exercises)) {
        res.status(400).json({ error: 'Invalid workout data' });
        return;
      }

      const client = new OpenAI({ apiKey: openaiApiKey.value() });

      const existingExercises = currentWorkout.exercises.map((ex: { name: string }) => ex.name).join(', ');
      const programming = getProgrammingRecommendations(goals || ['General Health'], experience || 'Beginner');

      // Get workout type context for better exercise matching
      const workoutTypeGuidance = getWorkoutTypeContext(workoutType);

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
   - Upper Body: Only chest, back, shoulders, arms exercises
   - Lower Body: Only legs, glutes, hamstrings, quads exercises
   - Full Body: Balance of upper and lower body
   - Legs/Glutes: Hip-dominant and glute-focused movements
   - Chest/Triceps: Chest pressing and tricep isolation
   - Back/Biceps: Pulling movements and bicep work
   - Shoulders: Deltoid-focused exercises (front, side, rear)
   - Arms: Bicep and tricep isolation
   - Push: Pressing movements for chest, shoulders, triceps
   - Pull: Pulling movements for back, biceps, rear delts
   - Core Focus: Anti-extension, anti-rotation, stability
   - Abs: Abdominal-focused exercises
   - Cardio: Cardiovascular conditioning movements
   - HIIT: High-intensity explosive movements
   - Strength Training: Heavy compound lifts
   - Yoga: Flexibility and balance poses
   - Pilates: Core-focused controlled movements
4. Target muscle groups that are underrepresented in the current workout
5. Follow programming guidelines: ${programming.sets?.[0]}-${programming.sets?.[1]} sets, ${programming.reps?.[0]}-${programming.reps?.[1]} reps, ${programming.restSeconds?.[0]}-${programming.restSeconds?.[1]}s rest
6. Match the difficulty level: ${(experience || 'beginner').toLowerCase()}
7. Avoid contraindicated exercises if injuries are present
8. Use ONLY available equipment: ${(equipment || ['Bodyweight']).join(', ')}
9. ⚠️ BEFORE OUTPUTTING: Verify the exercise name is NOT similar to any existing exercise

ALL FIELDS ARE MANDATORY - OUTPUT ONLY valid JSON (no markdown, no code blocks):
{
  "name": "Exercise Name (MUST be completely unique and different from existing exercises)",
  "description": "Detailed description with setup, execution, and breathing cues (100-150 chars)",
  "sets": 3,
  "reps": "8-12",
  "formTips": ["First form tip - specific and actionable", "Second form tip - addresses common error", "Third form tip - joint alignment or quality cue"],
  "safetyTips": ["First safety tip - injury prevention", "Second safety tip - modification option"],
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
            content:
              'You are an expert personal trainer. Generate ONE exercise that complements an existing workout. The exercise MUST be completely unique and different from all existing exercises - no variations or similar movements. Output ONLY valid JSON with no markdown formatting.',
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
2. Use a DIFFERENT movement pattern or variation (not just a minor modification)
   - If replacing "Barbell Bench Press", consider "Dumbbell Flyes", "Push-ups", or "Cable Chest Press" (NOT "Dumbbell Bench Press")
   - If replacing "Barbell Row", consider "Pull-ups", "Lat Pulldown", or "Face Pulls" (NOT "Dumbbell Row")
   - Choose a DIFFERENT exercise type that works the same muscles
3. ⚠️ ABSOLUTELY DO NOT duplicate "${exerciseToReplace.name}" or any of these exercises: ${otherExercises}
4. MUST match the same sets/reps/rest scheme as the original exercise
5. Match the difficulty level: ${(experience || 'beginner').toLowerCase()}
6. Respect equipment availability: ${(equipment || ['Bodyweight']).join(', ')}
7. Avoid contraindicated exercises if injuries are present
8. The replacement should be a true alternative with a different movement pattern
9. ⚠️ BEFORE OUTPUTTING: Verify the exercise is NOT in the existing workout

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

      res.status(200).json({ exercise });
    } catch (e) {
      console.error('Swap exercise error', e);
      res.status(500).json({ error: 'Failed to swap exercise' });
    }
  },
);

