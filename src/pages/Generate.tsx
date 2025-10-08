// src/pages/Generate.tsx
import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { auth } from '../lib/firebase'
import { EQUIPMENT } from '../config/onboarding'
import { isAdaptivePersonalizationEnabled, isIntensityCalibrationEnabled } from '../config/features'
import { trackCustomEvent } from '../lib/firebase-analytics'
import { Brain, Clock } from 'lucide-react'
import { ProgressiveLoadingBar } from '../components/Loading'
import { useSubscription } from '../hooks/useSubscription'
import { subscriptionService } from '../lib/subscriptionService'
import { SubscriptionManager } from '../components/SubscriptionManager'
import { trackWorkoutGenerated, trackFreeTrialLimitReached } from '../lib/firebase-analytics'
import { useWorkoutPreload } from '../hooks/useWorkoutPreload'
import { WorkoutGenerationError, TimeoutError, ErrorHandler, retryWithBackoff } from '../lib/errors'
import { dedupedFetch } from '../lib/requestManager'

// Top 14 most common workout types organized by popularity
const TYPES = [
  'Full Body',        // Most popular - comprehensive workout
  'Upper Body',       // Very popular - convenient split
  'Lower Body',       // Very popular - leg day
  'Cardio',          // High demand - heart health
  'Core Focus',      // Popular - aesthetic goals
  'Push',            // Popular split - chest/shoulders/triceps
  'Pull',            // Popular split - back/biceps
  'Legs/Glutes',     // Specific lower body focus
  'Chest/Triceps',   // Classic push split
  'Back/Biceps',     // Classic pull split
  'Shoulders',       // Targeted muscle group
  'Arms',            // Popular aesthetic focus
  'Yoga',            // Mind-body connection - flexibility and mindfulness
  'Pilates',         // Mind-body connection - core strength and stability
] as const

// Top 6 most common workout durations (optimized for user preferences)
const DUR = [15, 30, 45, 60, 75, 90] as const

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
  const [showSlowConnectionWarning, setShowSlowConnectionWarning] = useState(false)

  // Abort controller for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null)

  // Use pre-loaded data hook
  const { preloadedData } = useWorkoutPreload()

  // Subscription hooks
  const { canGenerateWorkout, hasUnlimitedWorkouts, subscription } = useSubscription()

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
          const error = ErrorHandler.normalize(preloadedData.error, {
            component: 'Generate',
            action: 'loadProfile'
          })
          ErrorHandler.handle(error)
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

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

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

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

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

    try {
      // Use retry with backoff for better error handling
      const result = await retryWithBackoff(
        async () => {
          const TIMEOUT_WARNING = 30_000 // Show warning at 30s
          const TIMEOUT_ABORT = 60_000   // Abort at 60s

          const warningTimer = setTimeout(() => {
            setShowSlowConnectionWarning(true)
          }, TIMEOUT_WARNING)

          const abortTimer = setTimeout(() => {
            abortControllerRef.current?.abort()
          }, TIMEOUT_ABORT)

          try {
            // Use deduplicated fetch to prevent duplicate requests
            const cacheKey = `workout-${type}-${duration}-${equipment.join(',')}`

            const plan = await dedupedFetch(
              cacheKey,
              async () => {
                const res = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                  signal: abortControllerRef.current?.signal,
                })

                if (!res.ok) {
                  if (res.status === 402) {
                    throw new WorkoutGenerationError(
                      'Subscription required',
                      'You need an active subscription to generate workouts.',
                      { component: 'Generate', action: 'generateWorkout', userId: uid },
                      undefined,
                      false // Not retryable
                    )
                  }

                  // 502 Bad Gateway - server error, should retry
                  // 503 Service Unavailable - temporary, should retry
                  // 504 Gateway Timeout - timeout, should retry
                  const shouldRetry = [502, 503, 504].includes(res.status)

                  throw new WorkoutGenerationError(
                    `HTTP ${res.status}`,
                    res.status === 502
                      ? 'The workout generation service is temporarily unavailable. Please try again in a moment.'
                      : 'Failed to generate workout. Please try again.',
                    { component: 'Generate', action: 'generateWorkout', userId: uid },
                    undefined,
                    shouldRetry
                  )
                }

                const plan = await res.json()

                if (!plan?.exercises || !Array.isArray(plan.exercises)) {
                  throw new WorkoutGenerationError(
                    'Invalid AI response',
                    'Received invalid workout data. Please try again.',
                    { component: 'Generate', action: 'generateWorkout', userId: uid }
                  )
                }

                return plan
              },
              { cacheTTL: 0 } // Don't cache workout generation
            )

            return plan
          } finally {
            clearTimeout(warningTimer)
            clearTimeout(abortTimer)
          }
        },
        {
          maxRetries: 2,
          baseDelay: 1000,
          onRetry: (attempt, error) => {
            if (import.meta.env.MODE === 'development') {
              console.log(`Retry attempt ${attempt} after error:`, error.message)
            }
          }
        }
      )

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

      sessionStorage.setItem('nf_workout_plan', JSON.stringify({ plan: result, type, duration }))

      // Navigate immediately when workout is ready
      if (import.meta.env.MODE === 'development') {
        console.log('[GENERATE] Workout generated successfully, navigating to preview')
      }

      setLoading(false)
      setShowProgressiveLoading(false)
      setShowSlowConnectionWarning(false)
      nav('/workout/preview')

    } catch (error) {
      // Clear loading states
      setLoading(false)
      setShowProgressiveLoading(false)
      setShowSlowConnectionWarning(false)

      // Handle abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new TimeoutError(
          'Request timed out',
          'The server took too long to respond. Please try again.',
          { component: 'Generate', action: 'generateWorkout', userId: uid }
        )
        ErrorHandler.handle(timeoutError)
        setError(timeoutError.userMessage)
        return
      }

      // Handle subscription errors
      if (error instanceof WorkoutGenerationError && error.code === 'WORKOUT_GENERATION_ERROR') {
        if (error.message.includes('Subscription required')) {
          // Try refreshing subscription status
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
            ErrorHandler.handle(refreshError as Error, {
              component: 'Generate',
              action: 'refreshSubscription'
            })
          }

          setShowUpgradePrompt(true)
          return
        }
      }

      // Handle all other errors
      const appError = ErrorHandler.normalize(error, {
        component: 'Generate',
        action: 'generateWorkout',
        userId: uid
      })

      ErrorHandler.handle(appError)
      setError(appError.userMessage)
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

        {/* Slow Connection Warning */}
        {showSlowConnectionWarning && (
          <div className="fixed inset-x-0 top-20 z-50 flex justify-center px-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 shadow-lg max-w-md animate-slide-in-up">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-yellow-800 mb-1">
                    Taking longer than usual
                  </h3>
                  <p className="text-sm text-yellow-700">
                    Your connection may be slow. We're still working on your workout...
                  </p>
                </div>
              </div>
            </div>
          </div>
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
            <div className="grid grid-cols-2 gap-2">
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