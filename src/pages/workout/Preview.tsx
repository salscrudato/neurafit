// src/pages/workout/Preview.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Lightbulb, Shield, ChevronDown, Plus, RefreshCw, Loader2, Trash2 } from 'lucide-react'
import AppHeader from '../../components/AppHeader'
import { trackWorkoutStarted } from '../../lib/firebase-analytics'
import { useWorkoutScrollToTop } from '../../hooks/useScrollToTop'
import { useAppStore } from '../../store'
import { logger } from '../../lib/logger'

type Exercise = {
  name: string
  description?: string
  sets: number
  reps: number | string
  formTips?: string[]
  safetyTips?: string[]
  restSeconds?: number
  usesWeight?: boolean      // true if this exercise uses external weights
  muscleGroups?: string[]   // Primary muscles worked
  difficulty?: string       // "beginner", "intermediate", or "advanced"
}

type Plan = { exercises: Exercise[] }

export default function Preview() {
  const nav = useNavigate()
  const profile = useAppStore(state => state.profile)

  // Scroll to top on mount and route changes
  useWorkoutScrollToTop()

  // Parse saved data and calculate exercises before early return (computed once on mount)
  const [{ saved, parsedData, initialExercises, initialWorkoutContext }] = useState(() => {
    const saved = sessionStorage.getItem('nf_workout_plan')
    const parsedData = saved ? JSON.parse(saved) as {
      plan: Plan & { metadata?: { targetIntensity?: number; progressionNote?: string } };
      type: string;
      duration: number
    } : null
    const initialExercises = Array.isArray(parsedData?.plan?.exercises) ? parsedData.plan.exercises : []

    // Store the initial workout context for adding exercises
    const initialWorkoutContext = {
      exercises: initialExercises,
      type: parsedData?.type,
      duration: parsedData?.duration,
    }

    return { saved, parsedData, initialExercises, initialWorkoutContext }
  })

  // State for modified exercises
  const [exercises, setExercises] = useState<Exercise[]>(initialExercises)
  const [loadingAdd, setLoadingAdd] = useState(false)
  const [swappingIndex, setSwappingIndex] = useState<number | null>(null)
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null)

  // Early return after all hooks
  if (!saved || !parsedData) return <EmptyState />

  const { type, duration } = parsedData

  // Add exercise handler - uses current exercises (may have been modified)
  const handleAddExercise = async () => {
    setLoadingAdd(true)
    try {
      // Validate we have exercises to work with
      if (!exercises || exercises.length === 0) {
        alert('No exercises found in workout. Please try again.')
        return
      }

      const payload = {
        // Use current exercises (may have been swapped/deleted), not initial
        currentWorkout: { exercises },
        workoutType: initialWorkoutContext.type,
        experience: profile?.experience,
        goals: profile?.goals,
        equipment: profile?.equipment,
        injuries: profile?.injuries,
      }

      logger.debug('Adding exercise with payload:', {
        exerciseCount: exercises.length,
        workoutType: initialWorkoutContext.type,
        hasProfile: !!profile,
      })

      const res = await fetch(import.meta.env['VITE_ADD_EXERCISE_FN_URL'] as string, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        const errorMsg = data?.details?.join(', ') || data?.error || `HTTP ${res.status}`
        throw new Error(errorMsg)
      }

      const newExercises = [...exercises, data.exercise]
      setExercises(newExercises)

      // Update session storage
      const updatedPlan = { ...parsedData, plan: { ...parsedData.plan, exercises: newExercises } }
      sessionStorage.setItem('nf_workout_plan', JSON.stringify(updatedPlan))
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to add exercise'
      logger.error('Error adding exercise', error as Error)
      alert(errorMsg)
    } finally {
      setLoadingAdd(false)
    }
  }

  // Delete exercise handler - minimum 3 exercises required
  const handleDeleteExercise = async (index: number) => {
    if (exercises.length <= 3) {
      alert('Cannot delete exercise. Minimum of 3 exercises required.')
      return
    }

    setDeletingIndex(index)
    try {
      const newExercises = exercises.filter((_, i) => i !== index)
      setExercises(newExercises)

      // Update session storage
      const updatedPlan = { ...parsedData, plan: { ...parsedData.plan, exercises: newExercises } }
      sessionStorage.setItem('nf_workout_plan', JSON.stringify(updatedPlan))
    } catch (error) {
      logger.error('Error deleting exercise', error as Error)
      alert('Failed to delete exercise. Please try again.')
    } finally {
      setDeletingIndex(null)
    }
  }

  // Swap exercise handler
  const handleSwapExercise = async (index: number) => {
    setSwappingIndex(index)
    try {
      const res = await fetch(import.meta.env['VITE_SWAP_EXERCISE_FN_URL'] as string, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseToReplace: exercises[index],
          currentWorkout: { exercises },
          workoutType: type,
          experience: profile?.experience,
          goals: profile?.goals,
          equipment: profile?.equipment,
          injuries: profile?.injuries,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        const errorMsg = data?.details?.join(', ') || data?.error || 'Failed to swap exercise'
        throw new Error(errorMsg)
      }

      const newExercises = [...exercises]
      newExercises[index] = data.exercise
      setExercises(newExercises)

      // Update session storage
      const updatedPlan = { ...parsedData, plan: { ...parsedData.plan, exercises: newExercises } }
      sessionStorage.setItem('nf_workout_plan', JSON.stringify(updatedPlan))
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to swap exercise'
      logger.error('Error swapping exercise', error as Error)
      alert(errorMsg)
    } finally {
      setSwappingIndex(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 relative">
      {/* Enhanced Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-400/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/15 to-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-gradient-to-r from-slate-300/10 to-gray-300/10 rounded-full blur-3xl" />
      </div>

      <AppHeader />

      {/* Compact Hero Section */}
      <section className="relative mx-auto max-w-4xl px-4 pt-4">
        <div className="group relative overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br from-white/95 via-white/85 to-white/75 backdrop-blur-xl p-5 md:p-6 shadow-lg shadow-slate-200/30 hover:shadow-xl hover:shadow-slate-300/20 transition-all duration-300">
          {/* Compact background elements */}
          <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-tr from-blue-400/15 via-indigo-400/10 to-purple-400/5 opacity-60 blur-2xl group-hover:opacity-80 transition-opacity duration-300" />

          <div className="relative">
            {/* Compact Workout Title */}
            <h1 style={{ fontSize: '16px' }} className="md:text-sm font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent leading-tight">
              {type} <span className="text-slate-400/60">—</span> {duration} min
            </h1>
          </div>
        </div>
      </section>

      {/* Compact Exercises */}
      <main className="relative mx-auto max-w-4xl px-4 pt-4 pb-24">
        <ol className="space-y-3">
          {exercises.map((ex, i) => (
            <ExerciseItem
              key={i}
              index={i}
              ex={ex}
              onSwap={() => handleSwapExercise(i)}
              onDelete={() => handleDeleteExercise(i)}
              isSwapping={swappingIndex === i}
              isDeleting={deletingIndex === i}
              canDelete={exercises.length > 3}
            />
          ))}
        </ol>

        {/* Add Exercise Button */}
        <div className="mt-4">
          <button
            onClick={handleAddExercise}
            disabled={loadingAdd}
            className="w-full group overflow-hidden rounded-xl border-2 border-dashed border-blue-300 bg-gradient-to-br from-blue-50/80 to-indigo-50/60 backdrop-blur-xl px-4 py-4 hover:border-blue-400 hover:from-blue-100/80 hover:to-indigo-100/60 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-center gap-2 text-blue-600 font-semibold">
              {loadingAdd ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Adding Exercise...</span>
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                  <span>Add Another Exercise</span>
                </>
              )}
            </div>
          </button>
        </div>
      </main>

      {/* Compact Sticky Start Button */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-white/60 bg-gradient-to-r from-white/95 via-white/90 to-white/85 backdrop-blur-xl shadow-xl shadow-slate-300/15 fixed-bottom-safe">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <div className="text-slate-600 hidden md:block text-sm leading-relaxed">
            Tap exercises for tips
          </div>
          <button
            onClick={() => {
              // Clear any existing workout data for a fresh start
              sessionStorage.removeItem('nf_workout_weights')
              sessionStorage.removeItem('nf_return')
              sessionStorage.removeItem('nf_next')
              sessionStorage.removeItem('nf_rest')

              // Store workout start time
              sessionStorage.setItem('nf_workout_start_time', Date.now().toString())

              // Track workout started
              const workoutId = `workout_${Date.now()}`
              trackWorkoutStarted(workoutId)

              nav('/workout/run')
            }}
            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-bold text-white hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/25 hover:scale-105 active:scale-95 transition-all duration-300 shadow-md shadow-blue-500/20 md:px-8 md:py-4 md:gap-3 md:rounded-2xl"
          >
            <Play className="h-5 w-5 md:h-6 md:w-6 group-hover:scale-110 transition-transform duration-200" />
            <span className="md:text-base">Start Workout</span>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Components ---------------- */

function ExerciseItem({
  ex,
  index,
  onSwap,
  onDelete,
  isSwapping,
  isDeleting,
  canDelete,
}: {
  ex: Exercise;
  index: number;
  onSwap: () => void;
  onDelete: () => void;
  isSwapping: boolean;
  isDeleting: boolean;
  canDelete: boolean;
}) {
  const [open, setOpen] = useState(false)

  return (
    <li className="group overflow-hidden rounded-xl border border-white/60 bg-gradient-to-br from-white/95 to-white/85 backdrop-blur-xl shadow-md shadow-slate-200/25 hover:shadow-lg hover:shadow-slate-300/15 transition-all duration-200 active:scale-[0.98]">
      <button
        className="w-full px-3 py-3 text-left flex items-start justify-between gap-3 hover:bg-white/50 transition-colors duration-200"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold flex-shrink-0 shadow-sm shadow-blue-500/25">
              {index + 1}
            </span>
            <h3 style={{ fontSize: '14px' }} className="font-bold text-slate-900 group-hover:text-slate-800 transition-colors truncate leading-tight">
              {ex.name}
            </h3>
          </div>
          <div className="text-xs text-slate-600 ml-9 leading-tight">
            <span className="font-semibold">{ex.sets}</span> sets • <span className="font-semibold">{ex.reps}</span> reps
            {ex.restSeconds ? <span className="ml-2 text-slate-500 hidden sm:inline">• <span className="font-semibold">{ex.restSeconds}s</span></span> : null}
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 text-slate-400 transition-all duration-200 group-hover:text-slate-600 flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-white/60 px-4 py-4 bg-gradient-to-br from-slate-50/80 to-gray-50/60 backdrop-blur-sm">
          {ex.description && <p className="mb-3 leading-relaxed text-slate-700 text-sm">{ex.description}</p>}
          {!!ex.formTips?.length && (
            <div className="mb-3">
              <div className="mb-2 font-bold flex items-center gap-2 text-blue-700 text-sm">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="h-3 w-3 text-white" />
                </div>
                Form Tips
              </div>
              <ul className="space-y-1.5 text-slate-600 ml-8 text-sm">
                {ex.formTips.slice(0,3).map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    <span className="leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!!ex.safetyTips?.length && (
            <div className="mb-3">
              <div className="mb-2 font-bold text-orange-700 flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-3 w-3 text-white" />
                </div>
                Safety Tips
              </div>
              <ul className="space-y-1.5 text-orange-600 ml-8 text-sm">
                {ex.safetyTips.slice(0,3).map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                    <span className="leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-2">
            {/* Swap Exercise Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSwap()
              }}
              disabled={isSwapping}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-slate-100 to-slate-50 border border-slate-200 text-slate-700 font-medium text-sm hover:from-slate-200 hover:to-slate-100 hover:border-slate-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSwapping ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Swapping...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>Swap</span>
                </>
              )}
            </button>

            {/* Delete Exercise Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (canDelete) {
                  onDelete()
                }
              }}
              disabled={!canDelete || isDeleting}
              title={!canDelete ? 'Minimum 3 exercises required' : 'Delete exercise'}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-700 font-medium text-sm hover:from-red-100 hover:to-red-200 hover:border-red-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

function EmptyState() {
  const nav = useNavigate()
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-400/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/15 to-blue-400/20 rounded-full blur-3xl" />
      </div>

      <AppHeader />
      <div className="relative grid place-items-center pt-16 px-4">
        <div className="max-w-sm text-center p-6 rounded-2xl border border-white/60 bg-gradient-to-br from-white/95 to-white/85 backdrop-blur-xl shadow-lg shadow-slate-200/30">
          <h2 className="text-xl font-bold mb-3 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">No plan found</h2>
          <p className="text-slate-600 mb-5 leading-relaxed text-sm">Generate a workout to preview it here.</p>
          <button
            onClick={()=>nav('/generate')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 font-bold hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/25 hover:scale-105 active:scale-95 transition-all duration-300 shadow-md shadow-blue-500/20 w-full justify-center"
          >
            Generate Workout
          </button>
        </div>
      </div>
    </div>
  )
}
