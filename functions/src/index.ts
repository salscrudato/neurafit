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

      // Build a structured prompt for GPT
      // Build a structured prompt for GPT
const prompt = `
You are an AI personal trainer. Create a ${duration}-minute ${workoutType} workout tailored to the user.

User:
- Experience: ${experience || "—"}
- Goals: ${Array.isArray(goals) ? goals.join(", ") : goals || "—"}
- Equipment: ${Array.isArray(equipment) ? equipment.join(", ") : equipment || "None"}
- Sex: ${personalInfo?.sex || "—"}
- Height: ${personalInfo?.heightRange || personalInfo?.height || "—"}
- Weight: ${personalInfo?.weightRange || personalInfo?.weight || "—"}
- Injuries: ${(injuries?.list?.length ? injuries.list.join(", ") : "None")} ${injuries?.notes ? "(" + injuries.notes + ")" : ""}

TRAINING ADJUSTMENT:
- targetIntensity: ${finalTargetIntensity.toFixed(2)} where 1.0 is baseline; >1.0 = harder, <1.0 = easier.
- Safely scale sets/reps/time/load/rest to match targetIntensity; prefer modest increases (≤10%) between sessions unless targetIntensity <0.8 or >1.2.
- Never violate injuries/equipment constraints.
${finalProgressionNote ? `- Note: ${finalProgressionNote}` : ''}

REQUIREMENTS:
- Output ONLY valid JSON (no markdown, no code fences, no prose before/after).
- Match this exact JSON schema:
{
  "exercises": [
    {
      "name": string,
      "description": string,      // 3–5 short sentences in plain English explaining how to perform it (beginner-friendly). Include: start position, the movement, simple body cues, and breathing. Avoid jargon.
      "sets": number,
      "reps": number | string,    // number OR time like "30s"
      "formTips": string[],       // up to 3 concise tips
      "safetyTips": string[],     // up to 3 concise cautions or modifications
      "restSeconds": number,      // 30–120 recommended
      "usesWeight": boolean       // true if this exercise typically uses external weights (dumbbells, barbells, kettlebells, etc.), false for bodyweight exercises
    }
  ]
}
- Respect the user's injuries and only use listed equipment. If "None (Bodyweight)" is present, use bodyweight only.
- Calibrate difficulty to experience and goals. Prefer safe progressions for beginners.
- Keep the plan realistic for the total duration (include warm-up or cool-down when appropriate by naming them as exercises).
- Keep all strings plain text (no bullets, no emojis); keep sentences short and clear.
- Set "usesWeight" to true for exercises that typically use external weights like dumbbells, barbells, kettlebells, medicine balls, etc. Set to false for bodyweight exercises, cardio, stretching, or exercises using resistance bands.
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

        // Add metadata to response
        const response = {
          ...json,
          metadata: {
            targetIntensity: finalTargetIntensity,
            progressionNote: finalProgressionNote || undefined
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
      } catch {
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