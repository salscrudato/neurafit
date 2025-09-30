// src/pages/workout/Preview.tsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { List, Hash, Play, Lightbulb, Shield, ChevronDown, Crown } from 'lucide-react'
import AppHeader from '../../components/AppHeader'
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

  // Parse saved data and calculate exercises before early return
  const saved = sessionStorage.getItem('nf_workout_plan')
  const parsedData = saved ? JSON.parse(saved) as {
    plan: Plan & { metadata?: { targetIntensity?: number; progressionNote?: string } };
    type: string;
    duration: number
  } : null
  const exercises = Array.isArray(parsedData?.plan?.exercises) ? parsedData.plan.exercises : []

  // All hooks must be called before early returns
  const totalSets = useMemo(() => {
    return exercises.reduce((s, e) => s + (Number(e.sets) || 0), 0)
  }, [exercises])

  // Early return after all hooks
  if (!saved || !parsedData) return <EmptyState />

  const { type, duration } = parsedData

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-200/30 to-blue-200/30 rounded-full blur-3xl" />
      </div>

      <AppHeader />

      {/* Hero */}
      <section className="relative mx-auto max-w-4xl px-5 pt-6">
        <div className="relative overflow-hidden rounded-3xl border border-blue-100/50 bg-white/70 backdrop-blur-sm p-6 shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-400 opacity-10 blur-3xl" />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
            {type} <span className="text-gray-400">—</span> {duration} min
          </h1>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Badge><List className="h-4 w-4" /> {exercises.length} exercises</Badge>
            <Badge><Hash className="h-4 w-4" /> {totalSets} total sets</Badge>
            {hasUnlimitedWorkouts ? (
              <Badge className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white border-yellow-400">
                <Crown className="h-3 w-3" />
                Pro
              </Badge>
            ) : (
              <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                {remainingFreeWorkouts - 1} free left
              </Badge>
            )}
          </div>
        </div>
      </section>

      {/* Exercises */}
      <main className="relative mx-auto max-w-4xl px-5 pt-6 pb-28">
        <ol className="space-y-3">
          {exercises.map((ex, i) => (
            <ExerciseItem key={i} index={i} ex={ex} />
          ))}
        </ol>
      </main>

      {/* Sticky Start Button */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto max-w-4xl px-5 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-500 hidden sm:block">
            You can tap each exercise to view instructions, form and safety tips.
          </div>
          <button
            onClick={() => {
              // Store workout start time
              sessionStorage.setItem('nf_workout_start_time', Date.now().toString())

              // Track workout started
              const workoutId = `workout_${Date.now()}`
              trackWorkoutStarted(workoutId, exercises.length)

              nav('/workout/run')
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3 font-semibold text-white hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 shadow-sm"
          >
            <Play className="h-5 w-5" /> Start Workout
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
    <li className="overflow-hidden rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
      <button
        className="w-full px-4 py-4 text-left flex items-start justify-between gap-3 hover:bg-white/50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div>
          <div className="font-semibold text-gray-900">
            {index + 1}. {ex.name}
          </div>
          <div className="text-sm text-gray-600">
            Sets: {ex.sets} • Reps: {ex.reps}
            {ex.restSeconds ? <span className="ml-2 text-gray-500">• Rest: {ex.restSeconds}s</span> : null}
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-gray-200 px-4 py-3 text-sm bg-gray-50/50">
          {ex.description && <p className="mb-3 leading-relaxed text-gray-700">{ex.description}</p>}
          {!!ex.formTips?.length && (
            <div className="mb-3">
              <div className="mb-1 font-medium flex items-center gap-2 text-blue-700"><Lightbulb className="h-4 w-4" /> Form tips</div>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                {ex.formTips.slice(0,3).map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
          {!!ex.safetyTips?.length && (
            <div>
              <div className="mb-1 font-medium text-orange-700 flex items-center gap-2"><Shield className="h-4 w-4" /> Safety</div>
              <ul className="list-disc list-inside text-orange-600 space-y-1">
                {ex.safetyTips.slice(0,3).map((t, i) => <li key={i}>{t}</li>)}
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <AppHeader />
      <div className="grid place-items-center pt-20">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-semibold mb-2 text-gray-900">No plan found</h2>
          <p className="text-gray-600 mb-4">Generate a workout to preview it here.</p>
          <button
            onClick={()=>nav('/generate')}
            className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 font-semibold hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-300"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  )
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={className || "inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700"}>
      {children}
    </span>
  )
}

