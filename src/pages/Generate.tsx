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
import { trackWorkoutGenerated } from '../lib/firebase-analytics'
import { useWorkoutPreload } from '../hooks/useWorkoutPreload'
import { WorkoutGenerationError, TimeoutError, ErrorHandler, retryWithBackoff } from '../lib/errors'
import { dedupedFetch } from '../lib/requestManager'

// Top 17 most common workout types organized by category and popularity
const WORKOUT_CATEGORIES = [
  {
    name: 'Full Body & General',
    types: ['Full Body', 'Strength Training']
  },
  {
    name: 'Body Part Splits',
    types: ['Upper Body', 'Lower Body', 'Legs/Glutes', 'Chest/Triceps', 'Back/Biceps', 'Shoulders', 'Arms']
  },
  {
    name: 'Push/Pull Splits',
    types: ['Push', 'Pull']
  },
  {
    name: 'Cardio & Conditioning',
    types: ['Cardio', 'HIIT']
  },
  {
    name: 'Core & Abs',
    types: ['Core Focus', 'Abs']
  },
  {
    name: 'Mind-Body & Recovery',
    types: ['Yoga', 'Pilates']
  }
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
  const [preferenceNotes, setPreferenceNotes] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [showProgressiveLoading, setShowProgressiveLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSlowConnectionWarning, setShowSlowConnectionWarning] = useState(false)

  // Abort controller for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null)

  // Use pre-loaded data hook
  const { preloadedData } = useWorkoutPreload()

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
      progressionNote: preloadedData.progressionNote,
      preferenceNotes: preferenceNotes.trim() || undefined,
      // Send optimized workout history (only last 5 workouts with essential data)
      recentWorkouts: preloadedData.recentWorkouts.slice(0, 5)
    }

    const url = import.meta.env['VITE_WORKOUT_FN_URL'] as string

    try {
      // Use retry with backoff for better error handling
      const result = await retryWithBackoff(
        async () => {
          const TIMEOUT_WARNING = 30_000 // Show warning at 30s
          const TIMEOUT_ABORT = 120_000  // Abort at 120s (2 minutes) - allows for streaming + processing

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
      trackWorkoutGenerated('true', 0)

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
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-100/30 via-indigo-100/20 to-purple-100/10 rounded-full blur-3xl animate-pulse-subtle" aria-hidden="true" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-slate-100/25 via-gray-100/15 to-blue-100/10 rounded-full blur-3xl" aria-hidden="true" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-blue-50/20 via-transparent to-transparent rounded-full blur-2xl" aria-hidden="true" />
      </div>

      <AppHeader />

      <main className="relative mx-auto max-w-6xl px-3 xs:px-4 sm:px-6 pb-16 pt-6 xs:pt-7 sm:pt-8">
        {/* Enhanced Hero Section */}
        <section className="group relative rounded-2xl xs:rounded-3xl border border-white/70 bg-gradient-to-br from-white/98 via-white/95 to-white/90 backdrop-blur-xl p-5 xs:p-8 sm:p-10 md:p-12 overflow-hidden shadow-2xl shadow-slate-200/50 hover:shadow-3xl hover:shadow-slate-300/30 transition-all duration-700 hover:scale-[1.005] hover:-translate-y-1 animate-slide-in-up">
          {/* Enhanced background elements */}
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-tr from-blue-400/15 via-indigo-400/10 to-purple-400/5 opacity-60 blur-3xl group-hover:opacity-80 group-hover:scale-110 transition-all duration-700" aria-hidden="true" />
          <div className="absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-gradient-to-tr from-slate-400/10 via-gray-400/5 to-blue-400/5 opacity-40 blur-2xl group-hover:opacity-60 transition-all duration-700" aria-hidden="true" />

          {/* Subtle inner glow */}
          <div className="absolute inset-0 rounded-2xl xs:rounded-3xl bg-gradient-to-br from-white/40 via-transparent to-white/20 pointer-events-none" aria-hidden="true" />

          <div className="relative space-y-5 xs:space-y-6 sm:space-y-8">
            <div className="space-y-3 xs:space-y-4 sm:space-y-6">
              <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent leading-tight sm:leading-tight">
                AI Workout Generator
              </h1>
            </div>

            <div className="inline-flex items-center gap-2 xs:gap-3 px-4 xs:px-6 py-2 xs:py-3 bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-purple-500/5 rounded-xl xs:rounded-2xl border border-blue-200/30 backdrop-blur-sm">
              <div className="w-2 xs:w-3 h-2 xs:h-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-pulse"></div>
              <span className="text-blue-700 font-semibold text-xs xs:text-sm sm:text-base">Get your custom training plan in 30 seconds!</span>
            </div>

            {/* Enhanced benefit highlights */}
            <div className="flex flex-col xs:flex-row xs:flex-wrap gap-3 xs:gap-4 sm:gap-6">
              <div className="flex items-center gap-2 xs:gap-3 text-xs xs:text-sm sm:text-base text-slate-700/90 font-medium">
                <div className="w-2 xs:w-3 h-2 xs:h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-lg shadow-blue-500/30 flex-shrink-0"></div>
                <span>Personalized for your goals</span>
              </div>
              <div className="flex items-center gap-2 xs:gap-3 text-xs xs:text-sm sm:text-base text-slate-700/90 font-medium">
                <div className="w-2 xs:w-3 h-2 xs:h-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full shadow-lg shadow-emerald-500/30 flex-shrink-0"></div>
                <span>Equipment-based customization</span>
              </div>
              <div className="flex items-center gap-2 xs:gap-3 text-xs xs:text-sm sm:text-base text-slate-700/90 font-medium">
                <div className="w-2 xs:w-3 h-2 xs:h-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full shadow-lg shadow-purple-500/30 flex-shrink-0"></div>
                <span>Injury-safe modifications</span>
              </div>
            </div>
          </div>
        </section>

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

        {/* Enhanced Intensity Calibration Indicator */}
        {preloadedData.targetIntensity !== 1.0 && isIntensityCalibrationEnabled() && (
          <section className="mt-6 xs:mt-8 sm:mt-10 animate-slide-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="group relative rounded-2xl xs:rounded-3xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50/80 via-purple-50/60 to-white/90 backdrop-blur-xl p-5 xs:p-6 sm:p-8 shadow-xl shadow-indigo-200/30 hover:shadow-2xl hover:shadow-indigo-200/40 transition-all duration-500 hover:scale-[1.01] hover:-translate-y-0.5">
              <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-gradient-to-tr from-indigo-400/20 to-purple-400/10 opacity-50 blur-2xl group-hover:opacity-70 group-hover:scale-110 transition-all duration-500" aria-hidden="true" />

              <div className="relative flex items-center gap-3 xs:gap-4 sm:gap-5">
                <div className="w-12 xs:w-14 sm:w-16 h-12 xs:h-14 sm:h-16 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 rounded-lg xs:rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-500/30 group-hover:shadow-indigo-500/50 group-hover:scale-110 transition-all duration-500 flex-shrink-0">
                  <Brain className="h-6 xs:h-7 sm:h-8 w-6 xs:w-7 sm:w-8 text-white" />
                </div>
                <div className="flex-1 space-y-1 xs:space-y-2">
                  <div className="font-bold text-base xs:text-lg sm:text-xl text-gray-900 leading-tight">
                    Intensity: {preloadedData.targetIntensity > 1.0 ? '+' : ''}{Math.round((preloadedData.targetIntensity - 1.0) * 100)}%
                  </div>
                  {preloadedData.progressionNote && (
                    <div className="text-xs xs:text-sm sm:text-base text-gray-600/90 font-medium capitalize leading-relaxed">
                      {preloadedData.progressionNote}
                    </div>
                  )}
                  <div className="text-xs text-indigo-600/80 font-medium">
                    AI-adjusted based on your recent workout feedback
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Options */}
        <section className="mt-6 xs:mt-8 sm:mt-10 space-y-4 xs:space-y-5 sm:space-y-6 animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
          {/* Type */}
          <div className="rounded-lg xs:rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm p-4 xs:p-5 sm:p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Workout Type</h3>
              {type && <span className="text-xs text-gray-500">Selected: {type}</span>}
            </div>

            {/* Categorized Workout Types */}
            <div className="space-y-5">
              {WORKOUT_CATEGORIES.map((category, categoryIndex) => (
                <div key={category.name}>
                  {/* Category Header */}
                  <div className="mb-2.5 flex items-center gap-2">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {category.name}
                    </h4>
                    <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent"></div>
                  </div>

                  {/* Category Types Grid */}
                  <div className={`grid gap-2.5 ${
                    category.types.length === 2
                      ? 'grid-cols-2 md:grid-cols-2'
                      : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                  }`}>
                    {category.types.map((t) => (
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

                  {/* Separator line between categories (except last) */}
                  {categoryIndex < WORKOUT_CATEGORIES.length - 1 && (
                    <div className="mt-4 h-px bg-gray-100"></div>
                  )}
                </div>
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

        {/* Workout Preferences */}
        <section className="mt-6">
          <div className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm p-5 shadow-sm">
            <div className="mb-3">
              <h3 className="font-semibold text-gray-900">Workout Preferences (Optional)</h3>
              <p className="text-xs text-gray-500 mt-1">Add any specific preferences or notes for the AI to consider</p>
            </div>
            <textarea
              value={preferenceNotes}
              onChange={(e) => setPreferenceNotes(e.target.value)}
              placeholder="e.g., I prefer exercises that don't require lying down, focus on unilateral movements, include more core work, etc."
              maxLength={500}
              rows={3}
              className="w-full rounded-lg border border-gray-200 bg-white/90 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {preferenceNotes.length}/500 characters
              </span>
              {preferenceNotes.length > 0 && (
                <button
                  onClick={() => setPreferenceNotes('')}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-800 text-sm">{error}</p>
            <button
              onClick={() => {
                setError(null)
                generate()
              }}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
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