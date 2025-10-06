// src/pages/Generate.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { auth } from '../lib/firebase'
import { EQUIPMENT } from '../config/onboarding'
import { isAdaptivePersonalizationEnabled, isIntensityCalibrationEnabled } from '../config/features'
import { trackCustomEvent } from '../lib/firebase-analytics'
import { Brain } from 'lucide-react'
import { ProgressiveLoadingBar } from '../components/Loading'
import { useSubscription } from '../hooks/useSubscription'
import { subscriptionService } from '../lib/subscriptionService'
import { SubscriptionManager } from '../components/SubscriptionManager'
import { trackWorkoutGenerated, trackFreeTrialLimitReached } from '../lib/firebase-analytics'
import { useWorkoutPreload } from '../hooks/useWorkoutPreload'

// Top 18 most common workout types organized by popularity
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
  'Yoga',            // Mind-body connection - flexibility and mindfulness
  'Pilates',         // Mind-body connection - core strength and stability
  'Functional'       // Movement-based training
] as const

// Top 8 most common workout durations (optimized for user preferences)
const DUR = [15, 20, 30, 45, 60, 75, 90, 120] as const

// Profile type moved to types file for better organization
// type Profile = {
//   experience?: string
//   goals?: string[]
//   equipment?: string[]
//   personal?: { sex?: string; height?: string; weight?: string }
//   injuries?: { list?: string[]; notes?: string }
// }

export default function Generate() {
  const nav = useNavigate()
  const [type, setType] = useState<string>()
  const [duration, setDuration] = useState<number>()
  const [equipment, setEquipment] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showProgressiveLoading, setShowProgressiveLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)

  // Use pre-loaded data hook
  const { preloadedData } = useWorkoutPreload()

  // Subscription hooks
  const { canGenerateWorkout, remainingFreeWorkouts, hasUnlimitedWorkouts, subscription } = useSubscription()

  // Handle preloaded data and navigation
  useEffect(() => {
    const uid = auth.currentUser?.uid
    if (!uid) {
      nav('/')
      return
    }

    // Handle preloaded data results
    if (!preloadedData.isLoading) {
      if (preloadedData.error) {
        if (preloadedData.error.includes('not found') || preloadedData.error.includes('incomplete')) {
          nav('/onboarding')
          return
        } else {
          console.error('Error with preloaded data:', preloadedData.error)
          nav('/')
          return
        }
      }

      if (preloadedData.profile) {
        // Initialize equipment from profile
        setEquipment((preloadedData.profile['equipment'] as string[]) || [])
      }
    }
  }, [nav, preloadedData])

  const disabled = !type || !duration || loading || showProgressiveLoading || preloadedData.isLoading || !preloadedData.profile

  async function generate() {
    if (disabled || !preloadedData.profile) return

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
      experience: preloadedData.profile['experience'],
      goals: preloadedData.profile['goals'],
      equipment: equipment,
      personalInfo: preloadedData.profile['personal'],
      injuries: preloadedData.profile['injuries'],
      workoutType: type,
      duration,
      uid,
      targetIntensity: preloadedData.targetIntensity,
      progressionNote: preloadedData.progressionNote
    }

    const url = import.meta.env['VITE_WORKOUT_FN_URL'] as string
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
            target_intensity: preloadedData.targetIntensity,
            workout_type: type,
            duration,
            has_progression_note: Boolean(preloadedData.progressionNote)
          })
        }

        // Track workout generation in Firebase Analytics
        trackWorkoutGenerated(String(hasUnlimitedWorkouts), subscription?.workoutCount || 0)

        sessionStorage.setItem('nf_workout_plan', JSON.stringify({ plan, type, duration }))

        // Navigate immediately when workout is ready
        if (import.meta.env.MODE === 'development') {
          console.log('[GENERATE] Workout generated successfully, navigating to preview')
        }
        setLoading(false)
        setShowProgressiveLoading(false)
        nav('/workout/preview')
      } finally {
        clearTimeout(t)
      }
    }

    // small retry (2 attempts total) for transient failures
    try {
      await fetchOnce()
      // Success - loading states cleared in fetchOnce
    } catch {
      try {
        await new Promise(r => setTimeout(r, 1000)) // Brief delay before retry
        await fetchOnce()
        // Success on retry - loading states cleared in fetchOnce
      } catch (e2) {
        // Clear loading states on error
        setLoading(false)
        setShowProgressiveLoading(false)

        const error = e2 as { message?: string; status?: number; name?: string }
        // Check if it's a subscription error (402 Payment Required)
        if (error?.message?.includes('Subscription required') || error?.status === 402) {
          // Before showing upgrade prompt, try refreshing subscription status
          // This handles cases where payment was completed but subscription status hasn't synced yet
          try {
            if (import.meta.env.MODE === 'development') {
              console.log('🔄 Payment required error - checking for recent subscription updates...')
            }
            const freshSubscription = await subscriptionService.getSubscription()

            if (freshSubscription && (freshSubscription.status === 'active' || freshSubscription.status === 'trialing')) {
              if (import.meta.env.MODE === 'development') {
                console.log('✅ Found active subscription after refresh, retrying workout generation...')
              }
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
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/80 via-white to-blue-50/20 relative safe-area-inset-bottom">
      {/* Enhanced background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-100/30 via-indigo-100/20 to-purple-100/10 rounded-full blur-3xl animate-pulse-subtle" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-slate-100/25 via-gray-100/15 to-blue-100/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-blue-50/20 via-transparent to-transparent rounded-full blur-2xl" />
      </div>

      <AppHeader />

      <main className="relative mx-auto max-w-6xl px-4 sm:px-6 pb-16 pt-6 sm:pt-8">
        {/* Enhanced Hero Section */}
        <section className="group relative rounded-3xl border border-white/70 bg-gradient-to-br from-white/98 via-white/95 to-white/90 backdrop-blur-xl p-6 sm:p-8 md:p-12 overflow-hidden shadow-2xl shadow-slate-200/50 hover:shadow-3xl hover:shadow-slate-300/30 transition-all duration-700 hover:scale-[1.005] hover:-translate-y-1">
          {/* Enhanced background elements */}
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-tr from-blue-400/15 via-indigo-400/10 to-purple-400/5 opacity-60 blur-3xl group-hover:opacity-80 group-hover:scale-110 transition-all duration-700" />
          <div className="absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-gradient-to-tr from-slate-400/10 via-gray-400/5 to-blue-400/5 opacity-40 blur-2xl group-hover:opacity-60 transition-all duration-700" />

          {/* Subtle inner glow */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/40 via-transparent to-white/20 pointer-events-none" />

          <div className="relative space-y-6 sm:space-y-8">
            <div className="space-y-4 sm:space-y-6">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent leading-[1.1] sm:leading-tight">
                AI Workout Generator
              </h1>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-slate-700/90 leading-tight tracking-tight">
                Create Custom Fitness Plans
              </h2>
            </div>

            <p className="text-slate-600/90 text-base sm:text-lg lg:text-xl leading-relaxed font-medium max-w-4xl">
              Generate <strong className="text-slate-800 font-semibold">personalized workout plans</strong> instantly with advanced AI technology.
              Tailored to your fitness goals, experience level, available equipment, and any injuries—powered by OpenAI's GPT-4.1-nano for ultra-fast generation.
            </p>

            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-purple-500/5 rounded-2xl border border-blue-200/30 backdrop-blur-sm">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-pulse"></div>
              <span className="text-blue-700 font-semibold text-sm sm:text-base">Get your custom training plan in 30 seconds!</span>
            </div>

            {/* Enhanced benefit highlights */}
            <div className="flex flex-wrap gap-4 sm:gap-6">
              <div className="flex items-center gap-3 text-sm sm:text-base text-slate-700/90 font-medium">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-lg shadow-blue-500/30"></div>
                <span>Personalized for your goals</span>
              </div>
              <div className="flex items-center gap-3 text-sm sm:text-base text-slate-700/90 font-medium">
                <div className="w-3 h-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full shadow-lg shadow-emerald-500/30"></div>
                <span>Equipment-based customization</span>
              </div>
              <div className="flex items-center gap-3 text-sm sm:text-base text-slate-700/90 font-medium">
                <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full shadow-lg shadow-purple-500/30"></div>
                <span>Injury-safe modifications</span>
              </div>
            </div>
          </div>
        </section>

        {/* Enhanced Subscription Status */}
        <SubscriptionManager mode="status" className="mt-8 sm:mt-10" />

        {/* Enhanced Legacy Subscription Status - keeping for users with more than 1 workout remaining */}
        {!hasUnlimitedWorkouts && remainingFreeWorkouts > 1 && (
          <section className="mt-8 sm:mt-10">
            <div className="group relative rounded-3xl border border-blue-200/60 bg-gradient-to-br from-blue-50/80 via-blue-50/60 to-white/90 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-blue-200/30 hover:shadow-2xl hover:shadow-blue-200/40 transition-all duration-500 hover:scale-[1.01] hover:-translate-y-0.5">
              <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-gradient-to-tr from-blue-400/20 to-indigo-400/10 opacity-50 blur-2xl group-hover:opacity-70 group-hover:scale-110 transition-all duration-500" />

              <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30 group-hover:shadow-blue-500/50 group-hover:scale-110 transition-all duration-500">
                    <span className="text-white font-bold text-lg">{remainingFreeWorkouts}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="font-bold text-lg sm:text-xl text-gray-900 leading-tight">
                      {remainingFreeWorkouts} free workout{remainingFreeWorkouts === 1 ? '' : 's'} remaining
                    </div>
                    <div className="text-sm sm:text-base text-gray-600/90 font-medium">
                      Upgrade to Pro for unlimited AI-powered workouts
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((15 - remainingFreeWorkouts) / 15) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {15 - remainingFreeWorkouts} of 15 free workouts used
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowUpgradePrompt(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 text-sm sm:text-base self-start sm:self-center"
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

        {/* Enhanced Intensity Calibration Indicator */}
        {preloadedData.targetIntensity !== 1.0 && isIntensityCalibrationEnabled() && (
          <section className="mt-8 sm:mt-10">
            <div className="group relative rounded-3xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50/80 via-purple-50/60 to-white/90 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-indigo-200/30 hover:shadow-2xl hover:shadow-indigo-200/40 transition-all duration-500 hover:scale-[1.01] hover:-translate-y-0.5">
              <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-gradient-to-tr from-indigo-400/20 to-purple-400/10 opacity-50 blur-2xl group-hover:opacity-70 group-hover:scale-110 transition-all duration-500" />

              <div className="relative flex items-center gap-5">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/30 group-hover:shadow-indigo-500/50 group-hover:scale-110 transition-all duration-500">
                  <Brain className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="font-bold text-lg sm:text-xl text-gray-900 leading-tight">
                    Intensity: {preloadedData.targetIntensity > 1.0 ? '+' : ''}{Math.round((preloadedData.targetIntensity - 1.0) * 100)}%
                  </div>
                  {preloadedData.progressionNote && (
                    <div className="text-sm sm:text-base text-gray-600/90 font-medium capitalize leading-relaxed">
                      {preloadedData.progressionNote}
                    </div>
                  )}
                  <div className="text-xs sm:text-sm text-indigo-600/80 font-medium">
                    AI-adjusted based on your recent workout feedback
                  </div>
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
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <div className="absolute inset-0 w-5 h-5 border border-white/20 rounded-full animate-pulse"></div>
                </div>
                <span className="font-semibold">Generating AI Workout…</span>
              </div>
            ) : preloadedData.isLoading ? (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
                <span className="font-semibold">Loading Profile…</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                <span className="font-semibold">Generate Workout</span>
              </div>
            )}
          </button>
        </div>
      </main>

      {/* Progressive Loading Bar */}
      <ProgressiveLoadingBar
        isVisible={showProgressiveLoading}
        onComplete={() => {
          // Loading bar animation completed
          if (import.meta.env.MODE === 'development') {
            console.log('Loading animation complete')
          }
        }}
        text="Generating your personalized workout..."
      />
    </div>
  )
}