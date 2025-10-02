// src/pages/workout/Preview.tsx
import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { List, Hash, Play, Lightbulb, Shield, ChevronDown, Crown } from 'lucide-react'
import WorkoutFlowHeader from '../../components/WorkoutFlowHeader'
import { useSubscription } from '../../hooks/useSubscription'
import { trackWorkoutStarted } from '../../lib/firebase-analytics'

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
  const { hasUnlimitedWorkouts, remainingFreeWorkouts } = useSubscription()

  // Parse saved data and calculate exercises before early return - memoized to prevent unnecessary re-renders
  const { saved, parsedData, exercises } = useMemo(() => {
    const saved = sessionStorage.getItem('nf_workout_plan')
    const parsedData = saved ? JSON.parse(saved) as {
      plan: Plan & { metadata?: { targetIntensity?: number; progressionNote?: string } };
      type: string;
      duration: number
    } : null
    const exercises = Array.isArray(parsedData?.plan?.exercises) ? parsedData.plan.exercises : []
    return { saved, parsedData, exercises }
  }, [])

  // All hooks must be called before early returns
  const totalSets = useMemo(() => {
    return exercises.reduce((s, e) => s + (Number(e.sets) || 0), 0)
  }, [exercises])

  // Early return after all hooks
  if (!saved || !parsedData) return <EmptyState />

  const { type, duration } = parsedData

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 relative">
      {/* Enhanced Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-400/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/15 to-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-gradient-to-r from-slate-300/10 to-gray-300/10 rounded-full blur-3xl" />
      </div>

      <WorkoutFlowHeader
        title="Workout Preview"
        showBackButton={true}
        onBack={() => nav('/generate')}
      />

      {/* Compact Hero Section */}
      <section className="relative mx-auto max-w-4xl px-4 pt-4">
        <div className="group relative overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br from-white/95 via-white/85 to-white/75 backdrop-blur-xl p-5 md:p-6 shadow-lg shadow-slate-200/30 hover:shadow-xl hover:shadow-slate-300/20 transition-all duration-300">
          {/* Compact background elements */}
          <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-tr from-blue-400/15 via-indigo-400/10 to-purple-400/5 opacity-60 blur-2xl group-hover:opacity-80 transition-opacity duration-300" />

          <div className="relative">
            {/* Compact Workout Title */}
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent leading-tight mb-4">
              {type} <span className="text-slate-400/60">—</span> {duration} min
            </h1>

            {/* Compact Badges */}
            <div className="flex flex-wrap gap-2">
              <CompactBadge variant="primary">
                <List className="h-4 w-4" />
                <span className="font-semibold">{exercises.length}</span>
              </CompactBadge>

              <CompactBadge variant="secondary">
                <Hash className="h-4 w-4" />
                <span className="font-semibold">{totalSets}</span>
              </CompactBadge>

              {hasUnlimitedWorkouts ? (
                <CompactBadge variant="pro">
                  <Crown className="h-3 w-3" />
                  Pro
                </CompactBadge>
              ) : (
                <CompactBadge variant="free">
                  <span className="font-semibold">{remainingFreeWorkouts - 1}</span> left
                </CompactBadge>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Compact Exercises */}
      <main className="relative mx-auto max-w-4xl px-4 pt-4 pb-24">
        <ol className="space-y-3">
          {exercises.map((ex, i) => (
            <ExerciseItem key={i} index={i} ex={ex} />
          ))}
        </ol>
      </main>

      {/* Compact Sticky Start Button */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-white/60 bg-gradient-to-r from-white/95 via-white/90 to-white/85 backdrop-blur-xl shadow-xl shadow-slate-300/15">
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

function ExerciseItem({ ex, index }: { ex: Exercise; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <li className="group overflow-hidden rounded-xl border border-white/60 bg-gradient-to-br from-white/95 to-white/85 backdrop-blur-xl shadow-md shadow-slate-200/25 hover:shadow-lg hover:shadow-slate-300/15 transition-all duration-200 active:scale-[0.98]">
      <button
        className="w-full px-4 py-4 text-left flex items-start justify-between gap-3 hover:bg-white/50 transition-colors duration-200"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold flex-shrink-0 shadow-sm shadow-blue-500/25">
              {index + 1}
            </span>
            <h3 className="font-bold text-slate-900 group-hover:text-slate-800 transition-colors truncate text-base md:text-lg">
              {ex.name}
            </h3>
          </div>
          <div className="text-sm text-slate-600 ml-9">
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
            <div>
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

      <WorkoutFlowHeader
        title="Workout Preview"
        showBackButton={true}
        onBack={() => nav('/generate')}
      />
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

function CompactBadge({
  children,
  variant = 'primary'
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'pro' | 'free'
}) {
  const variants = {
    primary: "inline-flex items-center gap-2 rounded-xl border border-blue-200/50 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2 text-blue-700 shadow-sm shadow-blue-100/40 text-sm font-medium",
    secondary: "inline-flex items-center gap-2 rounded-xl border border-slate-200/50 bg-gradient-to-r from-slate-50 to-gray-50 px-3 py-2 text-slate-700 shadow-sm shadow-slate-100/40 text-sm font-medium",
    pro: "inline-flex items-center gap-2 rounded-xl border border-yellow-300/50 bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-2 text-white font-semibold shadow-sm shadow-yellow-500/20 text-sm",
    free: "inline-flex items-center gap-2 rounded-xl border border-emerald-200/50 bg-gradient-to-r from-emerald-50 to-green-50 px-3 py-2 text-emerald-700 shadow-sm shadow-emerald-100/40 text-sm font-medium"
  }

  return (
    <span className={variants[variant]}>
      {children}
    </span>
  )
}

function EnhancedBadge({
  children,
  variant = 'primary'
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'pro' | 'free'
}) {
  const variants = {
    primary: "inline-flex items-center gap-3 rounded-2xl border border-blue-200/50 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 text-blue-700 shadow-md shadow-blue-100/50 hover:shadow-lg hover:shadow-blue-200/30 transition-all duration-300",
    secondary: "inline-flex items-center gap-3 rounded-2xl border border-slate-200/50 bg-gradient-to-r from-slate-50 to-gray-50 px-4 py-3 text-slate-700 shadow-md shadow-slate-100/50 hover:shadow-lg hover:shadow-slate-200/30 transition-all duration-300",
    pro: "inline-flex items-center gap-3 rounded-2xl border border-yellow-300/50 bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-3 text-white font-semibold shadow-lg shadow-yellow-500/25 hover:shadow-xl hover:shadow-yellow-500/40 transition-all duration-300",
    free: "inline-flex items-center gap-3 rounded-2xl border border-emerald-200/50 bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-3 text-emerald-700 shadow-md shadow-emerald-100/50 hover:shadow-lg hover:shadow-emerald-200/30 transition-all duration-300"
  }

  return (
    <span className={variants[variant]}>
      {children}
    </span>
  )
}

// Keep the old Badge component for backward compatibility
function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={className || "inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700"}>
      {children}
    </span>
  )
}