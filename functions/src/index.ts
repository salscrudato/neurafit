import { onRequest } from "firebase-functions/v2/https"
import { defineSecret } from "firebase-functions/params"
import type { Request, Response } from "express"
import OpenAI from "openai"
import { getAdaptiveState, calculateRecentCompletionRate, generateProgressionNote } from "./lib/personalization"
import { incrementWorkoutCount } from "./lib/stripe"

// Export subscription functions
export { stripeWebhook } from "./stripe-webhooks"
export {
  createPaymentIntent,
  cancelUserSubscription,
  reactivateUserSubscription,
  getCustomerPortalUrl,
  getSubscriptionDetails,
  getBillingHistory
} from "./subscription-functions"
export { cleanupSubscriptions } from "./cleanup-subscriptions"


// Define the secret
const openaiApiKey = defineSecret("OPENAI_API_KEY")

/**
 * AI-powered workout generator function
 */
export const generateWorkout = onRequest(
  {
    cors: [
      "http://localhost:5173",                  // local dev
      "https://neurafit-ai-2025.web.app",       // Firebase Hosting
      "https://neurafit-ai-2025.firebaseapp.com"
    ],
    region: "us-central1",
    secrets: [openaiApiKey],
  },
  async (req: Request, res: Response): Promise<void> => {
    // Handle preflight
    if (req.method === "OPTIONS") {
      res.status(204).send("")
      return
    }

    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed")
      return
    }

    try {
      // Initialize OpenAI client with the secret value
      const client = new OpenAI({
        apiKey: openaiApiKey.value(),
      })

      const {
        experience,
        goals,
        equipment,
        personalInfo,
        injuries,
        workoutType,
        duration,
        uid,
        targetIntensity,
        progressionNote,
      } = req.body || {}

      // Check subscription limits if uid is provided
      if (uid) {
        try {
          const { getFirestore } = await import('firebase-admin/firestore')
          const db = getFirestore()

          const userDoc = await db.collection('users').doc(uid).get()
          const userData = userDoc.data()
          const subscription = userData?.subscription

          if (subscription) {
            const isActive = subscription.status === 'active' || subscription.status === 'trialing'
            const freeWorkoutsUsed = subscription.freeWorkoutsUsed || 0
            const freeWorkoutLimit = subscription.freeWorkoutLimit || 5

            // Check if user can generate workout
            if (!isActive && freeWorkoutsUsed >= freeWorkoutLimit) {
              res.status(402).json({
                error: "Subscription required",
                message: "You've used all your free workouts. Please subscribe to continue.",
                freeWorkoutsUsed,
                freeWorkoutLimit
              })
              return
            }
          }
        } catch (error) {
          console.error('Error checking subscription:', error)
          // Continue with workout generation if subscription check fails
        }
      }

      // Handle adaptive personalization
      let finalTargetIntensity = targetIntensity || 1.0
      let finalProgressionNote = progressionNote || ''

      // If uid provided but no targetIntensity, fetch from adaptive state
      if (uid && !targetIntensity) {
        try {
          const adaptiveState = await getAdaptiveState(uid)
          finalTargetIntensity = adaptiveState.difficultyScalar

          // Calculate recent completion rate if not available
          let recentCompletion = adaptiveState.recentCompletionRate
          if (recentCompletion === undefined) {
            recentCompletion = await calculateRecentCompletionRate(uid)
          }

          finalProgressionNote = generateProgressionNote(
            1.0, // baseline
            finalTargetIntensity,
            adaptiveState.lastFeedback
          )
        } catch (error) {
          console.error('Error fetching adaptive state:', error)
          // Continue with defaults
        }
      }

      // Get exercise recommendations, programming guidelines, and professional coaching context
      const { getExerciseRecommendations, getProgrammingRecommendations } = await import('./lib/exerciseDatabase')
      const { generateProfessionalPromptEnhancement } = await import('./lib/promptEnhancements')

      const contextForEnhancements = {
        experience,
        goals: Array.isArray(goals) ? goals : [goals].filter(Boolean),
        equipment: Array.isArray(equipment) ? equipment : [equipment].filter(Boolean),
        injuries: injuries?.list || [],
        workoutType,
        duration,
        targetIntensity: finalTargetIntensity,
        progressionNote: finalProgressionNote
      }

      const exerciseRecommendations = getExerciseRecommendations(contextForEnhancements)
      const programmingGuidelines = getProgrammingRecommendations(
        contextForEnhancements.goals,
        experience || 'Beginner'
      )
      const professionalEnhancements = generateProfessionalPromptEnhancement(contextForEnhancements)

      // Build a structured prompt for GPT with professional fitness programming principles
const prompt = `
You are a NASM-certified personal trainer with 10+ years of experience. Create a ${duration}-minute ${workoutType} workout following evidence-based fitness programming principles.

CLIENT PROFILE:
- Experience: ${experience || "—"}
- Primary Goals: ${Array.isArray(goals) ? goals.join(", ") : goals || "—"}
- Available Equipment: ${Array.isArray(equipment) ? equipment.join(", ") : equipment || "None"}
- Demographics: ${personalInfo?.sex || "—"}, ${personalInfo?.heightRange || personalInfo?.height || "—"}, ${personalInfo?.weightRange || personalInfo?.weight || "—"}
- Injuries/Limitations: ${(injuries?.list?.length ? injuries.list.join(", ") : "None")} ${injuries?.notes ? "(" + injuries.notes + ")" : ""}

EVIDENCE-BASED PROGRAMMING GUIDELINES:
- Sets: ${programmingGuidelines.sets?.[0]}-${programmingGuidelines.sets?.[1]} per exercise
- Reps: ${programmingGuidelines.reps?.[0]}-${programmingGuidelines.reps?.[1]} per set (or specify ranges like "8-12")
- Rest: ${programmingGuidelines.restSeconds?.[0]}-${programmingGuidelines.restSeconds?.[1]} seconds between sets
- Intensity: ${programmingGuidelines.intensity || 'Moderate to challenging'}

CRITICAL REST PERIOD REQUIREMENTS (EXACT VALUES REQUIRED):
- Compound movements (squats, deadlifts, presses): 120-180 seconds (use specific values like 150, 120, 180)
- Isolation exercises: 60-90 seconds (use specific values like 75, 60, 90)
- Cardio/circuit exercises: 45-75 seconds (use specific values like 60, 45, 75)
- Warm-up movements: 20-30 seconds (use specific values like 30, 20, 25)
- Cool-down/stretching: 45-60 seconds (use specific values like 60, 45, 50)
- The restSeconds value you provide will be used EXACTLY as the rest timer
- NEVER use rest periods below 20 seconds except for dynamic warm-up
- Higher intensity exercises need MORE rest, not less

RECOMMENDED EXERCISE CATEGORIES:
${exerciseRecommendations.length > 0 ?
  exerciseRecommendations.slice(0, 8).map(ex =>
    `- ${ex.name} (${ex.category}, ${ex.difficulty}): ${ex.muscleGroups.join(', ')}`
  ).join('\n') :
  '- Use fundamental movement patterns: squat, hinge, push, pull, carry, lunge'
}

ADAPTIVE INTENSITY SCALING:
- Target Intensity: ${finalTargetIntensity.toFixed(2)} (1.0 = baseline, >1.0 = harder, <1.0 = easier)
- Apply evidence-based progressive overload: adjust volume (sets×reps), intensity (load/difficulty), or density (rest periods)
- For beginners: prioritize movement quality over intensity regardless of target
- Never compromise safety for intensity targets
${finalProgressionNote ? `- Progression Context: ${finalProgressionNote}` : ''}

${professionalEnhancements}

PROFESSIONAL PROGRAMMING PRINCIPLES:
1. MOVEMENT QUALITY FIRST: Prioritize proper form and movement patterns over load/intensity
2. PROGRESSIVE OVERLOAD: Apply systematic progression appropriate to experience level
3. INJURY PREVENTION: Include movement prep, avoid contraindicated exercises, provide modifications
4. FUNCTIONAL PATTERNS: Emphasize compound movements and real-world movement patterns
5. RECOVERY INTEGRATION: Include appropriate rest periods and consider workout density
6. INDIVIDUAL ADAPTATION: Scale complexity and intensity to user's current capabilities

WORKOUT STRUCTURE REQUIREMENTS:
- Always include 3-5 minutes of dynamic warm-up (movement prep, activation)
- Structure main work in logical progression (compound → isolation, or by movement pattern)
- Include 2-3 minutes of cool-down/mobility work for sessions >20 minutes
- Balance muscle groups and movement patterns within the session
- For strength goals: 3-6 reps, 3-5 sets, 2-3 min rest
- For hypertrophy: 6-12 reps, 3-4 sets, 60-90s rest
- For endurance: 12+ reps or time-based, 2-3 sets, 30-60s rest

SAFETY & CONTRAINDICATIONS:
- Knee injuries: Avoid deep squats, lunges, high-impact movements
- Lower back: Avoid spinal flexion under load, heavy overhead work
- Shoulder: Avoid overhead pressing, behind-neck movements if impingement history
- Ankle: Modify jumping/plyometric movements, provide low-impact alternatives
- Always provide regression options for complex movements

OUTPUT REQUIREMENTS:
- Output ONLY valid JSON (no markdown, code fences, or additional text)
- Follow this exact schema:
{
  "exercises": [
    {
      "name": string,                    // Clear, specific exercise name
      "description": string,             // 4-6 sentences: setup, execution, key cues, breathing pattern
      "sets": number,                    // Evidence-based set recommendations
      "reps": number | string,           // Specific rep ranges or time (e.g., "8-12" or "45s")
      "formTips": string[],              // 2-3 critical technique cues
      "safetyTips": string[],            // 2-3 injury prevention tips and modifications
      "restSeconds": number,             // CRITICAL: Use exact rest periods from guidelines above - this value is used directly in the app
      "usesWeight": boolean,             // true for external resistance, false for bodyweight
      "muscleGroups": string[],          // Primary muscles worked (for programming balance)
      "difficulty": string               // "beginner", "intermediate", or "advanced"
    }
  ],
  "workoutSummary": {
    "totalVolume": string,               // Brief volume description
    "primaryFocus": string,              // Main training stimulus
    "expectedRPE": string                // Rate of perceived exertion estimate
  }
}

CRITICAL REQUIREMENTS:
- Respect ALL injury limitations - provide alternatives, not just warnings
- Use ONLY available equipment - no substitutions without explicit alternatives
- Scale appropriately for experience level - beginners need simpler movements
- Ensure workout fits time constraint including warm-up and cool-down
- Provide specific rep ranges (e.g., "8-12") rather than single numbers when appropriate
- Include unilateral work for muscle balance when relevant
- Consider energy system demands and fatigue management throughout session
- REST PERIODS ARE CRITICAL: Use the exact rest period guidelines above - these values are used directly in the app timer
- Example rest periods: Squats=150s, Bicep Curls=75s, Jumping Jacks=60s, Arm Circles=30s
`.trim()

      // Call OpenAI
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: "You are a precise fitness coach that only outputs valid JSON.",
          },
          { role: "user", content: prompt },
        ],
      })

      const text = completion.choices?.[0]?.message?.content ?? ""

      // Validate JSON output
      try {
        const json = JSON.parse(text)

        // Professional workout validation and quality scoring
        const { validateWorkoutPlan } = await import('./lib/exerciseValidation')
        const { scoreWorkoutQuality } = await import('./lib/workoutQualityScorer')

        const userProfileForValidation = {
          experience,
          injuries: injuries?.list || [],
          duration,
          goals: Array.isArray(goals) ? goals : [goals].filter(Boolean),
          equipment: Array.isArray(equipment) ? equipment : [equipment].filter(Boolean),
          workoutType
        }

        const validationResult = validateWorkoutPlan(json, userProfileForValidation)
        const qualityScore = scoreWorkoutQuality(json, userProfileForValidation)

        // Log validation and quality metrics for monitoring
        console.info('Workout Quality Score:', qualityScore.overall, qualityScore.breakdown)

        if (validationResult.errors.length > 0) {
          console.warn('Workout validation errors:', validationResult.errors)
        }
        if (validationResult.warnings.length > 0) {
          console.info('Workout validation warnings:', validationResult.warnings)
        }

        // Reject workouts with critical safety issues or very low quality
        if (!validationResult.isValid) {
          console.error('Generated workout failed safety validation:', validationResult.errors)
          res.status(502).json({
            error: "Generated workout failed safety validation",
            validationErrors: validationResult.errors,
            raw: text
          })
          return
        }

        // Warn about low-quality workouts but don't reject (for now)
        if (qualityScore.overall < 60) {
          console.warn('Generated workout has low quality score:', qualityScore.overall, qualityScore.feedback)
        }

        // Add metadata to response including validation and quality results
        const response = {
          ...json,
          metadata: {
            targetIntensity: finalTargetIntensity,
            progressionNote: finalProgressionNote || undefined,
            validation: {
              warnings: validationResult.warnings,
              suggestions: validationResult.suggestions
            },
            qualityScore: {
              overall: qualityScore.overall,
              breakdown: qualityScore.breakdown,
              feedback: qualityScore.feedback,
              recommendations: qualityScore.recommendations
            }
          }
        }

        // Increment workout count after successful generation
        if (uid) {
          try {
            await incrementWorkoutCount(uid)
          } catch (error) {
            console.error('Error incrementing workout count:', error)
            // Don't fail the request if workout count increment fails
          }
        }

        res.json(response)
        return
      } catch (parseError) {
        console.error('JSON parsing error:', parseError)
        res.status(502).json({ error: "Bad AI JSON", raw: text })
        return
      }
    } catch (e) {
      console.error("Workout generation error", e)
      res.status(500).json({ error: "Internal Server Error" })
      return
    }
  }
)