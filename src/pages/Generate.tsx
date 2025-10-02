// src/pages/Generate.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { auth, db } from '../lib/firebase'
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { EQUIPMENT } from '../config/onboarding'
import { isAdaptivePersonalizationEnabled, isIntensityCalibrationEnabled } from '../config/features'
import { trackCustomEvent } from '../lib/firebase-analytics'
import { Brain } from 'lucide-react'
import { ProgressiveLoadingBar } from '../components/Loading'
import { useSubscription } from '../hooks/useSubscription'
import { subscriptionService } from '../lib/subscriptionService'
import { SubscriptionManager } from '../components/SubscriptionManager'
import { trackWorkoutGenerated, trackFreeTrialLimitReached } from '../lib/firebase-analytics'

// Top 20 workout types organized by popularity (most to least common)
const TYPES = [
  'Full Body',        // Most popular - comprehensive workout
  'Upper Body',       // Very popular - convenient split
  'Lower Body',       // Very popular - leg day
  'Cardio',          // High demand - heart health
  'HIIT',            // Trending - time efficient
  'Core Focus',      // Popular - aesthetic goals
  'Strength',        // Classic - powerlifting focus
  'Circuit',         // Popular - variety and intensity
  'Push',            // Popular split - chest/shoulders/triceps
  'Pull',            // Popular split - back/biceps
  'Legs/Glutes',     // Specific lower body focus
  'Chest/Triceps',   // Classic push split
  'Back/Biceps',     // Classic pull split
  'Shoulders',       // Targeted muscle group
  'Arms',            // Popular aesthetic focus
  'Yoga/Pilates',    // Mind-body connection
  'Functional',      // Movement-based training
  'Mobility',        // Recovery and flexibility
  'Plyometric',      // Athletic performance
  'Rehabilitation'   // Injury recovery/prevention
] as const

// Top 8 most common workout durations (optimized for user preferences)
const DUR = [15, 20, 30, 45, 60, 75, 90, 120] as const

type Profile = {
  experience?: string
  goals?: string[]
  equipment?: string[]
  personal?: { sex?: string; height?: string; weight?: string }
  injuries?: { list?: string[]; notes?: string }
}

export default function Generate() {
  const nav = useNavigate()
  const [type, setType] = useState<string>()
  const [duration, setDuration] = useState<number>()
  const [equipment, setEquipment] = useState<string[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [showProgressiveLoading, setShowProgressiveLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [targetIntensity, setTargetIntensity] = useState<number>(1.0)
  const [progressionNote, setProgressionNote] = useState<string>('')
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)

  // Subscription hooks
  const { canGenerateWorkout, remainingFreeWorkouts, hasUnlimitedWorkouts, subscription } = useSubscription()

  // Fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      const uid = auth.currentUser?.uid
      if (!uid) {
        nav('/')
        return
      }
      try {
        const userDocRef = doc(db, 'users', uid)
        const snap = await getDoc(userDocRef)
        if (!snap.exists()) {
          nav('/onboarding')
          return
        }
        const p = snap.data() as Profile
        // Basic completeness check (align with your SessionProvider rule)
        const complete = !!(p.experience && p.goals?.length && p.personal?.height && p.personal?.weight)
        if (!complete) {
          nav('/onboarding')
          return
        }
        setProfile(p)
        // Initialize equipment from profile
        setEquipment(p.equipment || [])

        // Fetch recent workout feedback to determine intensity adjustment
        if (isAdaptivePersonalizationEnabled()) {
          await fetchAdaptiveIntensity(uid)
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
        // If there's a permission error, redirect to auth
        nav('/')
      }
    }

    fetchProfile()
  }, [nav])

  // Fetch adaptive intensity based on recent workout feedback
  const fetchAdaptiveIntensity = async (uid: string) => {
    try {
      // Get recent workouts with feedback
      const workoutsRef = collection(db, 'users', uid, 'workouts')
      const workoutsQuery = query(workoutsRef, orderBy('timestamp', 'desc'), limit(5))
      const snapshot = await getDocs(workoutsQuery)

      if (snapshot.empty) {
        setTargetIntensity(1.0)
        setProgressionNote('')
        return
      }

      // Find the most recent workout with feedback
      let lastFeedback: 'easy' | 'right' | 'hard' | null = null
      let recentCompletionRate = 0.8 // default
      let totalSets = 0
      let completedSets = 0

      snapshot.docs.forEach(doc => {
        const workout = doc.data()

        // Get the most recent feedback
        if (!lastFeedback && workout.feedback) {
          lastFeedback = workout.feedback
        }

        // Calculate completion rate from all recent workouts
        if (workout.exercises && Array.isArray(workout.exercises)) {
          workout.exercises.forEach((exercise: { sets?: number; weights?: Record<string, number | null> }) => {
            if (exercise.weights && typeof exercise.weights === 'object') {
              const setCount = exercise.sets || Object.keys(exercise.weights).length
              totalSets += setCount

              Object.values(exercise.weights).forEach((weight: number | null) => {
                if (weight !== null) {
                  completedSets++
                }
              })
            } else {
              totalSets += exercise.sets || 0
              completedSets += exercise.sets || 0
            }
          })
        }
      })

      if (totalSets > 0) {
        recentCompletionRate = completedSets / totalSets
      }

      // Compute target intensity using the same logic as backend
      let newIntensity = 1.0 // baseline

      if (lastFeedback) {
        switch (lastFeedback) {
          case 'easy':
            newIntensity += 0.1
            break
          case 'hard':
            newIntensity -= 0.1
            break
          case 'right':
            newIntensity += 0.02
            break
        }
      }

      // Apply completion rate bias
      if (recentCompletionRate < 0.6) {
        newIntensity -= 0.05
      } else if (recentCompletionRate > 0.9) {
        newIntensity += 0.05
      }

      // Clamp to safe bounds
      newIntensity = Math.max(0.6, Math.min(1.4, newIntensity))

      setTargetIntensity(newIntensity)

      // Generate progression note
      const intensityChange = (newIntensity - 1.0) * 100
      if (lastFeedback) {
        const feedbackText = {
          easy: 'user rated last workout too easy',
          hard: 'user rated last workout too hard',
          right: 'user rated last workout just right'
        }[lastFeedback]

        if (Math.abs(intensityChange) < 1) {
          setProgressionNote(`${feedbackText}; maintain current difficulty level`)
        } else {
          setProgressionNote(
            intensityChange > 0
              ? `${feedbackText}; increase difficulty ~${Math.round(Math.abs(intensityChange))}% safely`
              : `${feedbackText}; decrease difficulty ~${Math.round(Math.abs(intensityChange))}% safely`
          )
        }
      } else {
        setProgressionNote(
          newIntensity > 1.0
            ? `Increase difficulty ~${Math.round((newIntensity - 1.0) * 100)}% safely`
            : newIntensity < 1.0
              ? `Decrease difficulty ~${Math.round((1.0 - newIntensity) * 100)}% safely`
              : 'Maintain baseline difficulty'
        )
      }

    } catch (error) {
      console.error('Error fetching adaptive intensity:', error)
      trackCustomEvent('adaptive_personalization_error', { error: String(error), context: 'adaptive_intensity_fetch' })
      setTargetIntensity(1.0)
      setProgressionNote('')
    }
  }

  const disabled = !type || !duration || loading || showProgressiveLoading

  async function generate() {
    if (disabled || !profile) return

    // Check subscription limits
    if (!canGenerateWorkout) {
      trackFreeTrialLimitReached()
      setShowUpgradePrompt(true)
      return
    }

    setError(null)
    setLoading(true)
    setShowProgressiveLoading(true)

    const uid = auth.currentUser?.uid

    const payload = {
      experience: profile.experience,
      goals: profile.goals,
      equipment: equipment,
      personalInfo: profile.personal,
      injuries: profile.injuries,
      workoutType: type,
      duration,
      uid,
      targetIntensity,
      progressionNote
    }

    const url = import.meta.env.VITE_WORKOUT_FN_URL as string
    const controller = new AbortController()

    const fetchOnce = async () => {
      const t = setTimeout(() => controller.abort(), 60_000) // 60s timeout
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const plan = await res.json()
        if (!plan?.exercises || !Array.isArray(plan.exercises)) {
          throw new Error('Invalid AI response')
        }

        // Log telemetry for workout generation with intensity
        if (uid && isAdaptivePersonalizationEnabled()) {
          trackCustomEvent('workout_generated_with_intensity', {
            target_intensity: targetIntensity,
            workout_type: type,
            duration,
            has_progression_note: Boolean(progressionNote)
          })
        }

        // Track workout generation in Firebase Analytics
        trackWorkoutGenerated(String(hasUnlimitedWorkouts), subscription?.workoutCount || 0)

        sessionStorage.setItem('nf_workout_plan', JSON.stringify({ plan, type, duration }))

        // Wait for loading animation to complete before navigating
        setTimeout(() => {
          nav('/workout/preview')
        }, 1500) // Give time for loading animation to feel complete
      } finally {
        clearTimeout(t)
      }
    }

    // small retry (2 attempts total) for transient failures
    try {
      await fetchOnce()
    } catch {
      try {
        await new Promise(r => setTimeout(r, 1200))
        await fetchOnce()
      } catch (e2) {
        const error = e2 as { message?: string; status?: number; name?: string }
        // Check if it's a subscription error (402 Payment Required)
        if (error?.message?.includes('Subscription required') || error?.status === 402) {
          // Before showing upgrade prompt, try refreshing subscription status
          // This handles cases where payment was completed but subscription status hasn't synced yet
          try {
            console.log('🔄 Payment required error - checking for recent subscription updates...')
            const freshSubscription = await subscriptionService.getSubscription()

            if (freshSubscription && (freshSubscription.status === 'active' || freshSubscription.status === 'trialing')) {
              console.log('✅ Found active subscription after refresh, retrying workout generation...')
              // Retry the workout generation with fresh subscription data
              setTimeout(() => {
                generate()
              }, 1000)
              return
            }
          } catch (refreshError) {
            console.error('Error refreshing subscription data:', refreshError)
          }

          setShowUpgradePrompt(true)
          return
        }

        setError(
          error?.name === 'AbortError'
            ? 'The server took too long to respond. Please try again.'
            : ((e2 as Error)?.message || 'Failed to generate. Please try again.')
        )
      }
    } finally {
      setLoading(false)
      setShowProgressiveLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative safe-area-inset-bottom">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-200/30 to-blue-200/30 rounded-full blur-3xl" />
      </div>

      <AppHeader />

      <main className="relative mx-auto max-w-6xl px-4 sm:px-6 pb-16 pt-6">
        {/* SEO-Optimized Hero Section */}
        <section className="rounded-3xl border border-blue-100/50 bg-white/70 backdrop-blur-sm p-6 md:p-8 relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-400 opacity-10 blur-3xl" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
            AI Workout Generator - Create Custom Fitness Plans
          </h1>
          <p className="mt-3 text-gray-600 text-lg leading-relaxed max-w-3xl">
            Generate <strong>personalized workout plans</strong> instantly with advanced AI technology.
            Tailored to your fitness goals, experience level, available equipment, and any injuries—powered by GPT-4o-mini.
            <span className="text-blue-600 font-semibold">Get your custom training plan in 30 seconds!</span>
          </p>

          {/* SEO benefit highlights */}
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Personalized for your goals</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span>Equipment-based customization</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Injury-safe modifications</span>
            </div>
          </div>
        </section>

        {/* Subscription Status - using unified SubscriptionManager */}
        <SubscriptionManager mode="status" className="mt-6" />

        {/* Legacy Subscription Status - keeping for users with more than 1 workout remaining */}
        {!hasUnlimitedWorkouts && remainingFreeWorkouts > 1 && (
          <section className="mt-6">
            <div className="rounded-2xl border border-blue-200 bg-blue-50/50 backdrop-blur-sm p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{remainingFreeWorkouts}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {remainingFreeWorkouts} free workout{remainingFreeWorkouts === 1 ? '' : 's'} remaining
                    </div>
                    <div className="text-sm text-gray-600">
                      Upgrade to Pro for $10/month
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowUpgradePrompt(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors text-sm"
                >
                  $10/month
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Subscription Upgrade Modal */}
        {showUpgradePrompt && (
          <SubscriptionManager
            mode="plans"
            onClose={() => setShowUpgradePrompt(false)}
            onSuccess={() => {
              // Subscription successful, user can now generate workouts
              setShowUpgradePrompt(false)
            }}
          />
        )}

        {/* Intensity Calibration Indicator */}
        {targetIntensity !== 1.0 && isIntensityCalibrationEnabled() && (
          <section className="mt-6">
            <div className="rounded-2xl border border-blue-200 bg-blue-50/50 backdrop-blur-sm p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                  <Brain className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">
                    Intensity: {targetIntensity > 1.0 ? '+' : ''}{Math.round((targetIntensity - 1.0) * 100)}%
                  </div>
                  {progressionNote && (
                    <div className="text-sm text-gray-600 mt-1 capitalize">
                      {progressionNote}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Options */}
        <section className="mt-8 space-y-6">
          {/* Type */}
          <div className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Workout Type</h3>
              {type && <span className="text-xs text-gray-500">Selected: {type}</span>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={[
                    'rounded-xl border px-3 py-2.5 text-left transition-all duration-200 text-sm font-medium',
                    type === t
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-blue-500 shadow-md scale-[1.02]'
                      : 'bg-white/70 border-gray-200 hover:border-blue-300 hover:bg-white text-gray-700 hover:scale-[1.01]'
                  ].join(' ')}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Duration and Equipment */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Duration */}
            <div className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Duration</h3>
              {duration && <span className="text-xs text-gray-500">{duration} min</span>}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {DUR.map((m) => (
                <button
                  key={m}
                  onClick={() => setDuration(m)}
                  className={[
                    'rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200',
                    duration === m
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-emerald-500 shadow-md scale-[1.02]'
                      : 'bg-white/70 border-gray-200 hover:border-emerald-300 hover:bg-white text-gray-700 hover:scale-[1.01]'
                  ].join(' ')}
                >
                  {m} min
                </button>
              ))}
            </div>

            </div>

            {/* Equipment */}
            <div className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Available Equipment</h3>
                {equipment.length > 0 && <span className="text-xs text-gray-500">{equipment.length} selected</span>}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {EQUIPMENT.map((eq) => (
                  <button
                    key={eq}
                    onClick={() => {
                      setEquipment(prev =>
                        prev.includes(eq)
                          ? prev.filter(e => e !== eq)
                          : [...prev, eq]
                      )
                    }}
                    className={[
                      'rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200 text-left',
                      equipment.includes(eq)
                        ? 'bg-gradient-to-br from-orange-500 to-amber-600 text-white border-orange-500 shadow-md scale-[1.02]'
                        : 'bg-white/70 border-gray-200 hover:border-orange-300 hover:bg-white text-gray-700 hover:scale-[1.01]'
                    ].join(' ')}
                  >
                    {eq}
                  </button>
                ))}
              </div>

            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mt-6">
            <SubscriptionManager
              mode="error"
              error={error}
              onRetry={() => {
                setError(null)
                generate()
              }}
              onClose={() => setShowUpgradePrompt(true)}
              showUpgradeOption={!hasUnlimitedWorkouts}
            />
          </div>
        )}

        {/* Generate CTA */}
        <div className="mt-8 flex justify-center sm:justify-end">
          <button
            onClick={generate}
            disabled={disabled}
            className={[
              'rounded-xl px-8 py-4 font-semibold transition-all duration-300 shadow-sm touch-manipulation min-h-[56px] w-full sm:w-auto',
              disabled
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg hover:scale-105 active:scale-95'
            ].join(' ')}
          >
            {loading || showProgressiveLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Generating…
              </div>
            ) : 'Generate workout'}
          </button>
        </div>
      </main>

      {/* Progressive Loading Bar */}
      <ProgressiveLoadingBar
        isVisible={showProgressiveLoading}
        onComplete={() => {
          // Loading bar animation completed
          console.log('Loading animation complete')
        }}
        text="Generating your personalized workout..."
      />
    </div>
  )
}