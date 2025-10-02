import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import type { Request, Response } from 'express';
import OpenAI from 'openai';
import { getAdaptiveState, calculateRecentCompletionRate, generateProgressionNote } from './lib/personalization';
import { incrementWorkoutCount } from './lib/stripe';

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
export { cleanupSubscriptions } from './cleanup-subscriptions';
export {
  getStripeSubscriptionStatus,
  manualSyncSubscription,
  checkWebhookDelivery,
  forceWebhookProcessing,
  debugSubscription,
} from './subscription-debug';

// Export emergency fix functions
export {
  emergencySubscriptionFix,
  debugAllSubscriptions
} from './emergency-subscription-fix';

// Define the secret
const openaiApiKey = defineSecret('OPENAI_API_KEY');

/**
 * AI-powered workout generator function
 */
export const generateWorkout = onRequest(
  {
    cors: [
      'http://localhost:5173', // local dev
      'https://neurafit-ai-2025.web.app', // Firebase Hosting
      'https://neurafit-ai-2025.firebaseapp.com',
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
        // personalInfo, // Removed for streamlined prompt
        injuries,
        workoutType,
        duration,
        uid,
        targetIntensity,
        progressionNote,
      } = req.body as {
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
      } || {};

      // Run subscription check and adaptive personalization in parallel if uid is provided
      let finalTargetIntensity = targetIntensity || 1.0;
      let finalProgressionNote = progressionNote || '';

      if (uid) {
        try {
          const { getFirestore } = await import('firebase-admin/firestore');
          const db = getFirestore();

          // Run subscription check and adaptive state fetch in parallel
          const [subscriptionResult, adaptiveResult] = await Promise.allSettled([
            // Subscription check
            (async () => {
              const userDoc = await db.collection('users').doc(uid).get();
              const userData = userDoc.data();
              const subscription = userData?.subscription as { status?: string; freeWorkoutsUsed?: number; freeWorkoutLimit?: number } | undefined;

              // Initialize subscription data for new users
              if (!subscription) {
                const initialSubscriptionData = {
                  status: 'incomplete',
                  workoutCount: 0,
                  freeWorkoutsUsed: 0,
                  freeWorkoutLimit: 5,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                };

                await db.collection('users').doc(uid).set(
                  { subscription: initialSubscriptionData },
                  { merge: true }
                );

                console.log('Initialized subscription data for new user:', uid);
                return null; // New user, no limits
              } else {
                const isActive = subscription.status === 'active' || subscription.status === 'trialing';
                const freeWorkoutsUsed = subscription.freeWorkoutsUsed || 0;
                const freeWorkoutLimit = subscription.freeWorkoutLimit || 5;

                // Check if user can generate workout
                if (!isActive && freeWorkoutsUsed >= freeWorkoutLimit) {
                  return {
                    error: 'Subscription required',
                    message: 'You\'ve used all your free workouts. Please subscribe to continue.',
                    freeWorkoutsUsed,
                    freeWorkoutLimit,
                  };
                }
                return null; // User can generate workout
              }
            })(),
            // Adaptive personalization (only if no targetIntensity provided)
            !targetIntensity ? (async () => {
              const adaptiveState = await getAdaptiveState(uid);
              let recentCompletion = adaptiveState.recentCompletionRate;
              if (recentCompletion === undefined) {
                recentCompletion = await calculateRecentCompletionRate(uid);
              }
              return {
                difficultyScalar: adaptiveState.difficultyScalar,
                lastFeedback: adaptiveState.lastFeedback,
                recentCompletion,
              };
            })() : Promise.resolve(null)
          ]);

          // Handle subscription check result
          if (subscriptionResult.status === 'fulfilled' && subscriptionResult.value) {
            res.status(402).json(subscriptionResult.value);
            return;
          }
          if (subscriptionResult.status === 'rejected') {
            console.error('Error checking subscription:', subscriptionResult.reason);
            // Continue with workout generation if subscription check fails
          }

          // Handle adaptive personalization result
          if (adaptiveResult.status === 'fulfilled' && adaptiveResult.value) {
            finalTargetIntensity = adaptiveResult.value.difficultyScalar;
            finalProgressionNote = generateProgressionNote(1.0, finalTargetIntensity, adaptiveResult.value.lastFeedback);
          } else if (adaptiveResult.status === 'rejected') {
            console.error('Error fetching adaptive state:', adaptiveResult.reason);
            // Continue with defaults
          }

        } catch (error) {
          console.error('Error in parallel database operations:', error);
          // Continue with workout generation if database operations fail
        }
      }

      // Streamlined prompt - removed unused imports

      // Filter out undefined values from arrays and ensure string types
      const filteredGoals = Array.isArray(goals)
        ? goals.filter((g): g is string => Boolean(g))
        : [goals].filter((g): g is string => Boolean(g));
      const filteredEquipment = Array.isArray(equipment)
        ? equipment.filter((e): e is string => Boolean(e))
        : [equipment].filter((e): e is string => Boolean(e));

      // Streamlined for professional trainer prompt

      // Professional trainer-optimized prompt for high-quality workouts
      const prompt = `You are a NASM-certified personal trainer. Create a professional ${duration}-minute ${workoutType} workout for ${experience} level.

WORKOUT REQUIREMENTS:
- Equipment: ${filteredEquipment.join(', ') || 'bodyweight only'}
- Goals: ${filteredGoals.join(', ')}
- Duration: MUST fill ${duration} minutes including warm-up and cool-down
- Experience: ${experience} - scale complexity and intensity appropriately
- Injuries/Limitations: ${(injuries?.list?.length ? injuries.list.join(', ') : 'None')} ${injuries?.notes ? '(' + injuries.notes + ')' : ''}

MANDATORY STRUCTURE - FOLLOW EXACTLY:
1. WARM-UP (FIRST 2-3 exercises): Dynamic movements, joint mobility, 30s rest
2. MAIN WORK (4-5 exercises): Progressive difficulty, balanced patterns
3. COOL-DOWN (LAST 1-2 exercises): Static stretches, breathing, 60s rest

WORKOUT TYPE REQUIREMENTS:
- Strength: 3-6 reps, 3-5 sets, 150-180s rest, compound movements
- HIIT: 30s work/15s rest OR 45s work/15s rest, metabolic exercises
- Hypertrophy: 6-12 reps, 3-4 sets, 60-90s rest, muscle focus
- Endurance: 12+ reps, 2-3 sets, 30-60s rest, circuit style

EXAMPLE HIIT STRUCTURE:
- Exercise 1: "HIIT Round 1: Burpees" - 30s work, 15s rest, 8 rounds
- Exercise 2: "HIIT Round 2: Mountain Climbers" - 30s work, 15s rest, 6 rounds

EXERCISE DESCRIPTIONS MUST INCLUDE:
- Equipment setup and starting position
- Step-by-step movement execution
- Breathing pattern (when to inhale/exhale)
- Key muscle activation cues
- Safety considerations

DURATION COMPLIANCE:
- ${duration} minutes TOTAL including warm-up and cool-down
- Calculate: Warm-up (4min) + Main work + Cool-down (3min) = ${duration}min
- Add more exercises or sets to reach target duration

CRITICAL REST PERIODS (use exact values):
- Compound movements: 120-180s (squats=150s, deadlifts=180s, presses=120s)
- Isolation exercises: 60-90s (curls=75s, extensions=60s)
- Cardio/HIIT: 30-60s (burpees=45s, mountain climbers=30s)
- Warm-up: 20-30s (arm circles=30s, leg swings=25s)
- Cool-down: 45-60s (stretches=60s)

INJURY CONSIDERATIONS:
${(injuries?.list?.length ? injuries.list.join(', ') : 'None')} ${injuries?.notes ? '(' + injuries.notes + ')' : ''}
- Provide modifications and alternatives for any limitations
- Never include contraindicated exercises

JSON OUTPUT (EXACT FORMAT):
{
  "exercises": [
    {
      "name": "Specific Exercise Name",
      "description": "Complete setup, execution, breathing, and cues (4-6 sentences)",
      "sets": number,
      "reps": "range or time",
      "formTips": ["3 critical technique points"],
      "safetyTips": ["2-3 injury prevention tips"],
      "restSeconds": exact_number,
      "usesWeight": boolean,
      "muscleGroups": ["primary", "secondary"],
      "difficulty": "${(experience || 'beginner').toLowerCase()}"
    }
  ],
  "workoutSummary": {
    "totalVolume": "detailed volume breakdown",
    "primaryFocus": "specific training adaptation",
    "expectedRPE": "appropriate intensity range"
  }
}

CRITICAL REQUIREMENTS - NON-NEGOTIABLE:
- FIRST 2-3 exercises MUST be warm-up (dynamic movements, joint prep)
- LAST 1-2 exercises MUST be cool-down (stretches, breathing)
- MIDDLE exercises are main work (strength, HIIT, etc.)
- MUST reach exactly ${duration} minutes total duration
- Use ONLY: ${filteredEquipment.join(', ') || 'bodyweight only'}
- Scale for ${experience || 'beginner'}: Beginner=simple, Intermediate=moderate, Advanced=complex
- HIIT MUST use interval timing: 30s work/15s rest or 45s work/15s rest
- Include 7-8 total exercises to properly fill ${duration} minutes
`.trim();

      // Use GPT-3.5-turbo - fastest model for structured generation
      console.log('⚡ Using GPT-3.5-turbo for ultra-fast workout generation');
      const completion = await client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        temperature: 0.3, // Lower temperature for faster, more focused responses
        max_tokens: 1500, // Limit tokens for speed
        messages: [
          {
            role: 'system',
            content: 'Output only valid JSON. Be concise.',
          },
          { role: 'user', content: prompt },
        ],
      });

      const text = completion.choices?.[0]?.message?.content ?? '';

      // Clean JSON text by removing markdown code blocks if present
      const cleanedText = text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();

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
          duration: duration || 30, // Default to 30 minutes if not specified
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

        // Reject workouts with critical safety issues or very low quality
        if (!validationResult.isValid) {
          console.error('Generated workout failed safety validation:', validationResult.errors);
          res.status(502).json({
            error: 'Generated workout failed safety validation',
            validationErrors: validationResult.errors,
            raw: text,
          });
          return;
        }

        // Warn about low-quality workouts but don't reject (for now)
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
            // Don't fail the request if workout count increment fails
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
  }
);