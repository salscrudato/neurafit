import { onRequest } from "firebase-functions/v2/https"
import { defineSecret } from "firebase-functions/params"
import type { Request, Response } from "express"
import OpenAI from "openai"

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
      } = req.body || {}

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
      "restSeconds": number       // 30–120 recommended
    }
  ]
}
- Respect the user's injuries and only use listed equipment. If "None (Bodyweight)" is present, use bodyweight only.
- Calibrate difficulty to experience and goals. Prefer safe progressions for beginners.
- Keep the plan realistic for the total duration (include warm-up or cool-down when appropriate by naming them as exercises).
- Keep all strings plain text (no bullets, no emojis); keep sentences short and clear.
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
        res.json(json)
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