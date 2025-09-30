// src/pages/Generate.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { EQUIPMENT } from '../config/onboarding'
import { isAdaptivePersonalizationEnabled, isIntensityCalibrationEnabled } from '../config/features'
import { logWorkoutGeneratedWithIntensity, logAdaptivePersonalizationError } from '../lib/telemetry'
import { Brain } from 'lucide-react'
import { ProgressiveLoadingBar } from '../components/ProgressiveLoadingBar'
import { useSubscription } from '../session/SubscriptionProvider'
import { UpgradePrompt } from '../components/UpgradePrompt'


const TYPES = [
  'Full Body','Upper Body','Lower Body','Cardio','HIIT','Core Focus',
  'Yoga/Pilates','Circuit','Chest/Triceps','Back/Biceps','Shoulders','Legs/Glutes'
] as const
const DUR = [15, 30, 45, 60, 75, 90] as const

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
  const { canGenerateWorkout, remainingFreeWorkouts, hasUnlimitedWorkouts } = useSubscription()



  // Fetch profile on mount
  useEffect(() => {
    (async () => {
      const uid = auth.currentUser?.uid
      if (!uid) return nav('/') // not signed in (guarded routes should prevent this)
      try {
        const snap = await getDoc(doc(db, 'users', uid))
        if (!snap.exists()) {
          nav('/onboarding'); return
        }
        const p = snap.data() as Profile
        // basic completeness check (align with your SessionProvider rule)
        const complete = !!(p.experience && p.goals?.length && p.personal?.height && p.personal?.weight)
        if (!complete) { nav('/onboarding'); return }
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
    })()
  }, [nav])

  // Fetch adaptive intensity based on recent workout feedback
  const fetchAdaptiveIntensity = async (uid: string) => {
    try {
      // Get recent workouts with feedback
      const workoutsRef = collection(db, 'users', uid, 'workouts')
      const q = query(workoutsRef, orderBy('timestamp', 'desc'), limit(5))
      const snapshot = await getDocs(q)

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
          workout.exercises.forEach((exercise: any) => {
            if (exercise.weights && typeof exercise.weights === 'object') {
              const setCount = exercise.sets || Object.keys(exercise.weights).length
              totalSets += setCount

              Object.values(exercise.weights).forEach((weight: any) => {
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
      logAdaptivePersonalizationError(uid, String(error), 'adaptive_intensity_fetch')
      setTargetIntensity(1.0)
      setProgressionNote('')
    }
  }



  const disabled = !type || !duration || loading || showProgressiveLoading

  async function generate() {
    if (disabled || !profile) return

    // Check subscription limits
    if (!canGenerateWorkout) {
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
          logWorkoutGeneratedWithIntensity(
            uid,
            targetIntensity,
            type,
            duration,
            Boolean(progressionNote)
          )
        }

        sessionStorage.setItem('nf_workout_plan', JSON.stringify({ plan, type, duration }))



        nav('/workout/preview')
      } finally {
        clearTimeout(t)
      }
    }

    // small retry (2 attempts total) for transient failures
    try {
      await fetchOnce()
    } catch (e1: any) {
      try {
        await new Promise(r => setTimeout(r, 1200))
        await fetchOnce()
      } catch (e2: any) {
        // Check if it's a subscription error (402 Payment Required)
        if (e2?.message?.includes('Subscription required') || e2?.status === 402) {
          setShowUpgradePrompt(true)
          return
        }

        setError(
          e2?.name === 'AbortError'
            ? 'The server took too long to respond. Please try again.'
            : (e2?.message || 'Failed to generate. Please try again.')
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
        {/* Hero card */}
        <section className="rounded-3xl border border-blue-100/50 bg-white/70 backdrop-blur-sm p-6 md:p-8 relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-400 opacity-10 blur-3xl" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">Generate your next workout</h1>
          <p className="mt-2 text-gray-600">
            Tailored to your goals, experience, equipment and injuries—powered by GPT-4o-mini.
          </p>
        </section>

        {/* Subscription Status */}
        {!hasUnlimitedWorkouts && (
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
                      Upgrade for unlimited access
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowUpgradePrompt(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors text-sm"
                >
                  Upgrade
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Upgrade Prompt Modal */}
        {showUpgradePrompt && (
          <UpgradePrompt
            variant="modal"
            onUpgrade={() => nav('/subscription')}
            onDismiss={() => setShowUpgradePrompt(false)}
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={[
                    'rounded-xl border px-4 py-3 text-left transition-all duration-200',
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
            <div className="flex flex-wrap gap-2">
              {DUR.map((m) => (
                <button
                  key={m}
                  onClick={() => setDuration(m)}
                  className={[
                    'rounded-full border px-4 py-2 text-sm transition-all duration-200',
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
              <div className="flex flex-wrap gap-2">
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
                      'rounded-full border px-4 py-2 text-sm transition-all duration-200',
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
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm">
            {error}
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
            {loading || showProgressiveLoading ? 'Generating…' : 'Generate workout'}
          </button>
        </div>
      </main>

      {/* Progressive Loading Bar */}
      <ProgressiveLoadingBar
        isVisible={showProgressiveLoading}
        onComplete={() => {
          // Loading bar completes, but we wait for actual API response
          console.log('Loading animation complete')
        }}
        duration={6000} // 6 seconds for a smooth experience
      />
    </div>
  )
}