// src/pages/workout/Preview.tsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Timer, List, Hash, Play, Lightbulb, Shield, ChevronDown } from 'lucide-react'

type Exercise = {
  name: string
  description?: string
  sets: number
  reps: number | string
  formTips?: string[]
  safetyTips?: string[]
  restSeconds?: number
}

type Plan = { exercises: Exercise[] }

export default function Preview() {
  const nav = useNavigate()
  const saved = sessionStorage.getItem('nf_workout_plan')
  if (!saved) return <EmptyState />

  const { plan, type, duration } = JSON.parse(saved) as { plan: Plan; type: string; duration: number }
  const exercises = Array.isArray(plan?.exercises) ? plan.exercises : []

  const stats = useMemo(() => {
    const totalSets = exercises.reduce((s, e) => s + (Number(e.sets) || 0), 0)
    const totalRests =
      exercises.reduce((s, e) => s + (Math.max(0, (e.sets || 0) - 1)) * (e.restSeconds || 60), 0) // between sets
    // Very rough time proxy: 40s per set unless reps is time-based
    const workSeconds = exercises.reduce((s, e) => {
      const perSet =
        typeof e.reps === 'string' && /\d+\s*(s|sec)/i.test(String(e.reps))
          ? parseInt(String(e.reps)) || 30
          : 40
      return s + (e.sets || 0) * perSet
    }, 0)
    const est = Math.round((workSeconds + totalRests) / 60)
    return { totalSets, est }
  }, [exercises])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">
      {/* Top bar */}
      <header className="mx-auto max-w-4xl px-5 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-emerald-400 to-cyan-400 ring-1 ring-white/10" />
          <span className="font-semibold">Neurafit</span>
        </div>
        <button onClick={()=>nav('/generate')} className="text-sm text-white/80 hover:text-white">Edit selections</button>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-5">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-400 opacity-20 blur-3xl" />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {type} <span className="text-white/70">—</span> {duration} min
          </h1>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-white/80">
            <Badge><List className="h-4 w-4" /> {exercises.length} exercises</Badge>
            <Badge><Hash className="h-4 w-4" /> {stats.totalSets} total sets</Badge>
            <Badge><Timer className="h-4 w-4" /> ~{stats.est} min estimated</Badge>
          </div>
        </div>
      </section>

      {/* Exercises */}
      <main className="mx-auto max-w-4xl px-5 pt-6 pb-28">
        <ol className="space-y-3">
          {exercises.map((ex, i) => (
            <ExerciseItem key={i} index={i} ex={ex} />
          ))}
        </ol>
      </main>

      {/* Sticky Start Button */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto max-w-4xl px-5 py-4 flex items-center justify-between">
          <div className="text-sm text-white/70 hidden sm:block">
            You can tap each exercise to view instructions, form and safety tips.
          </div>
          <button
            onClick={() => nav('/workout/run')}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950 hover:bg-emerald-400 transition"
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
    <li className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <button
        className="w-full px-4 py-4 text-left flex items-start justify-between gap-3"
        onClick={() => setOpen(o => !o)}
      >
        <div>
          <div className="font-semibold">
            {index + 1}. {ex.name}
          </div>
          <div className="text-sm text-white/75">
            Sets: {ex.sets} • Reps: {ex.reps}
            {ex.restSeconds ? <span className="ml-2 text-white/60">• Rest: {ex.restSeconds}s</span> : null}
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-white/10 px-4 py-3 text-sm text-white/85">
          {ex.description && <p className="mb-3 leading-relaxed">{ex.description}</p>}
          {!!ex.formTips?.length && (
            <div className="mb-3">
              <div className="mb-1 font-medium flex items-center gap-2"><Lightbulb className="h-4 w-4" /> Form tips</div>
              <ul className="list-disc list-inside text-white/80 space-y-1">
                {ex.formTips.slice(0,3).map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
          {!!ex.safetyTips?.length && (
            <div>
              <div className="mb-1 font-medium text-amber-300 flex items-center gap-2"><Shield className="h-4 w-4" /> Safety</div>
              <ul className="list-disc list-inside text-amber-200/90 space-y-1">
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
    <div className="min-h-screen grid place-items-center bg-white">
      <div className="max-w-md text-center">
        <h2 className="text-xl font-semibold mb-2">No plan found</h2>
        <p className="text-slate-600 mb-4">Generate a workout to preview it here.</p>
        <button onClick={()=>nav('/generate')} className="rounded-lg bg-slate-900 text-white px-4 py-2">Generate</button>
      </div>
    </div>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
      {children}
    </span>
  )
}

