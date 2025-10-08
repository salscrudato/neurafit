import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import type { Request, Response } from 'express';
import OpenAI from 'openai';
import { incrementWorkoutCount } from './lib/stripe';
import { getProgrammingRecommendations } from './lib/exerciseDatabase';
import { generateProfessionalPromptEnhancement } from './lib/promptEnhancements';

// Export subscription functions
export { stripeWebhook } from './stripe-webhooks';
export {
  createPaymentIntent,
  cancelUserSubscription,
  reactivateUserSubscription,
  getCustomerPortalUrl,
  getSubscriptionDetails,
  getBillingHistory,
} from './subscription-functions';

// Define the secret
const openaiApiKey = defineSecret('OPENAI_API_KEY');

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
        // personalInfo, // intentionally omitted from prompt
        injuries,
        workoutType,
        duration,
        uid,
        targetIntensity,
        progressionNote,
      } = (req.body as {
        experience?: string;
        goals?: string | string[];
        equipment?: string | string[];
        personalInfo?: { sex?: string; heightRange?: string; height?: string; weightRange?: string; weight?: string };
        injuries?: { list?: string[]; notes?: string };
        workoutType?: string;
        duration?: number;
        uid?: string;
        targetIntensity?: number;
        progressionNote?: string;
      }) || {};

      // Use intensity values from frontend (calculated by useWorkoutPreload hook)
      let finalTargetIntensity = targetIntensity || 1.0;
      let finalProgressionNote = progressionNote || '';

      // Initialize subscription data for new users if uid is provided
      if (uid) {
        try {
          const { getFirestore } = await import('firebase-admin/firestore');
          const db = getFirestore();

          const userDoc = await db.collection('users').doc(uid).get();
          const userData = userDoc.data();
          const subscription = userData?.subscription as
            | { status?: string; freeWorkoutsUsed?: number; freeWorkoutLimit?: number }
            | undefined;

          if (!subscription) {
            const initialSubscriptionData = {
              status: 'incomplete',
              workoutCount: 0,
              freeWorkoutsUsed: 0,
              freeWorkoutLimit: 50,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };

            await db.collection('users').doc(uid).set(
              { subscription: initialSubscriptionData },
              { merge: true },
            );

            console.log('Initialized subscription data for new user:', uid);
          }
        } catch (error) {
          console.error('Error initializing subscription:', error);
          // Continue with workout generation even if subscription initialization fails
        }
      }

      // Filter out undefined values from arrays and ensure string types
      const filteredGoals = Array.isArray(goals)
        ? goals.filter((g): g is string => Boolean(g))
        : [goals].filter((g): g is string => Boolean(g));
      const filteredEquipment = Array.isArray(equipment)
        ? equipment.filter((e): e is string => Boolean(e))
        : [equipment].filter((e): e is string => Boolean(e));

      // Workout type context
      const getWorkoutTypeContext = (type: string) => {
        const contexts: Record<string, string> = {
          'Full Body': 'Focus: Total body conditioning. Style: 6-12 reps, compound movements. Equipment: Mixed.',
          'Upper Body': 'Focus: Chest, back, shoulders, arms. Style: 6-15 reps, push/pull balance. Equipment: Weights preferred.',
          'Lower Body': 'Focus: Legs, glutes, calves. Style: 8-15 reps, squats/lunges/deadlifts. Equipment: Weights preferred.',
          Cardio: 'Focus: Cardiovascular endurance. Style: Time-based, continuous movement. Equipment: Bodyweight preferred.',
          'Core Focus': 'Focus: Abdominals, obliques, stability. Style: 10-20 reps, isometric holds. Equipment: Bodyweight.',
          Push: 'Focus: Chest, shoulders, triceps. Style: 6-12 reps, pressing movements. Equipment: Weights preferred.',
          Pull: 'Focus: Back, biceps, rear delts. Style: 6-12 reps, pulling movements. Equipment: Weights preferred.',
          'Legs/Glutes': 'Focus: Lower body power, shape. Style: 8-15 reps, hip-dominant movements. Equipment: Weights preferred.',
          'Chest/Triceps': 'Focus: Chest development, tricep strength. Style: 6-15 reps, pressing focus. Equipment: Weights preferred.',
          'Back/Biceps': 'Focus: Back width/thickness, bicep size. Style: 6-15 reps, pulling focus. Equipment: Weights preferred.',
          Shoulders: 'Focus: Deltoid development, stability. Style: 8-15 reps, multi-angle pressing. Equipment: Weights preferred.',
          Arms: 'Focus: Biceps, triceps, forearms. Style: 8-15 reps, isolation movements. Equipment: Weights preferred.',
          Yoga: 'Focus: Flexibility, mindfulness, balance. Style: 30-90s holds, flowing sequences. Equipment: Bodyweight only.',
          Pilates: 'Focus: Core strength, stability, control. Style: 8-15 controlled reps, precise movements. Equipment: Bodyweight.',
        };
        return contexts[type] || contexts['Full Body'];
      };

      // Build injury context if injuries are present
      const injuryContext =
        injuries?.list && injuries.list.length > 0
          ? `\n\nIMPORTANT - INJURY CONSIDERATIONS:
- User has reported injuries: ${injuries.list.join(', ')}
${injuries.notes ? `- Additional notes: ${injuries.notes}` : ''}
- Avoid exercises that stress these areas
- Provide modifications when appropriate
- Prioritize safety over intensity`
          : '';

      // Build intensity context if provided
      const intensityContext =
        finalTargetIntensity !== 1.0 || finalProgressionNote
          ? `\n\nINTENSITY GUIDANCE:
- Target intensity scalar: ${finalTargetIntensity.toFixed(2)}x baseline
${finalProgressionNote ? `- Progression note: ${finalProgressionNote}` : ''}
- Adjust sets, reps, or rest periods accordingly`
          : '';

      // Quality standards and injury-specific safety guidance
      const qualityGuidelines = generateProfessionalPromptEnhancement({
        injuries: injuries?.list,
      });

      // Evidence-based programming ranges for the primary goal
      const programming = getProgrammingRecommendations(filteredGoals, experience || '');
      const programmingContext = `\n\nPROGRAMMING GUIDELINES: Sets ${programming.sets?.[0]}-${programming.sets?.[1]}, Reps ${programming.reps?.[0]}-${programming.reps?.[1]}, Rest ${programming.restSeconds?.[0]}-${programming.restSeconds?.[1]}s (Intensity: ${programming.intensity}).`;

      // Calculate recommended exercise count based on duration
      // Formula: ~3-4 minutes per exercise (including rest periods)
      const minExercises = Math.max(3, Math.floor((duration || 30) / 5));
      const maxExercises = Math.max(4, Math.ceil((duration || 30) / 3));
      const durationGuidance = `\n\nDURATION CONSTRAINT:
- Total workout time: ${duration} minutes
- Recommended exercise count: ${minExercises}-${maxExercises} exercises
- Account for rest periods between sets (${programming.restSeconds?.[0]}-${programming.restSeconds?.[1]}s per set)
- Ensure the workout fits within the time limit including warm-up considerations`;

      // Structured prompt (keeps original schema & single-session format)
      const prompt = `Create a ${duration}-min ${workoutType || 'Full Body'} workout for ${experience || 'Beginner'} level.

SPECS: Equipment: ${filteredEquipment.join(', ') || 'bodyweight'} | Goals: ${filteredGoals.join(', ') || 'fitness'} | Type: ${workoutType || 'Full Body'}
${getWorkoutTypeContext(workoutType || 'Full Body')}${injuryContext}${intensityContext}

${qualityGuidelines}${programmingContext}${durationGuidance}

RULES:
1. Use evidence-based exercises and standard variations (no fictitious movement names)
2. Match the requested workout type exactly
3. Descriptions: 100+ chars with setup, execution cues, and breathing
4. CRITICAL: Generate the appropriate number of exercises to fit within ${duration} minutes

JSON OUTPUT (no markdown):
{
  "exercises": [{
    "name": "Exercise Name",
    "description": "Step-by-step with breathing cues",
    "sets": 3,
    "reps": "8-12",
    "formTips": ["tip1", "tip2", "tip3"],
    "safetyTips": ["safety1", "safety2"],
    "restSeconds": 60,
    "usesWeight": true,
    "muscleGroups": ["muscle1", "muscle2"],
    "difficulty": "${(experience || 'beginner').toLowerCase()}"
  }],
  "workoutSummary": {
    "totalVolume": "volume estimate",
    "primaryFocus": "focus areas",
    "expectedRPE": "intensity"
  }
}`.trim();

      // Use GPT-4.1-nano for ultra-fast generation with low latency
      console.log('⚡ Using GPT-4.1-nano for ultra-fast workout generation');
      const completion = await client.chat.completions.create({
        model: 'gpt-4.1-nano',
        temperature: 0.4, // Balanced creativity
        max_tokens: 2500, // Sufficient for complete workouts with 6-8 exercises
        messages: [
          {
            role: 'system',
            content:
              'You are an expert certified personal trainer (NASM-CPT, CSCS) with 10+ years of experience. Create dynamic, varied workouts tailored to each request. Use real, evidence-based exercises and standard variations. Output only valid JSON with no markdown formatting or code blocks.',
          },
          { role: 'user', content: prompt },
        ],
      });

      const text = completion.choices?.[0]?.message?.content ?? '';

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

        // Professional workout validation and quality scoring
        const { validateWorkoutPlan } = await import('./lib/exerciseValidation');
        const { scoreWorkoutQuality } = await import('./lib/workoutQualityScorer');

        const userProfileForValidation = {
          experience,
          injuries: injuries?.list || [],
          duration: duration || 30,
          goals: filteredGoals,
          equipment: filteredEquipment,
          workoutType,
        };

        const validationResult = validateWorkoutPlan(json, userProfileForValidation);
        const qualityScore = scoreWorkoutQuality(json, userProfileForValidation);

        // Log validation and quality metrics for monitoring
        console.info('Workout Quality Score:', qualityScore.overall, qualityScore.breakdown);

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

        // Warn about low-quality workouts but don't reject
        if (qualityScore.overall < 60) {
          console.warn('Generated workout has low quality score:', qualityScore.overall, qualityScore.feedback);
        }

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
              breakdown: qualityScore.breakdown,
              feedback: qualityScore.feedback,
              recommendations: qualityScore.recommendations,
            },
          },
        };

        // Increment workout count after successful generation
        if (uid) {
          try {
            await incrementWorkoutCount(uid);
          } catch (error) {
            console.error('Error incrementing workout count:', error);
            // Do not fail the request if workout count increment fails
          }
        }

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