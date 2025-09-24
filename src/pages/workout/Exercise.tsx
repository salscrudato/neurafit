// src/pages/workout/Exercise.tsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lightbulb, Shield } from 'lucide-react'

type ExerciseT = {
  name: string
  description?: string      // 3–5 layman sentences (from backend prompt)
  sets: number
  reps: number | string
  formTips?: string[]
  safetyTips?: string[]
  restSeconds?: number
}

type PlanT = { exercises: ExerciseT[] }

export default function Exercise() {
  const nav = useNavigate()
  const saved = sessionStorage.getItem('nf_workout_plan')
  if (!saved) return <EmptyState />

  const { plan } = JSON.parse(saved) as { plan: PlanT }
  const list = Array.isArray(plan?.exercises) ? plan.exercises : []
  if (list.length === 0) return <EmptyState />

  const [i, setI] = useState(0)        // exercise index
  const [setNo, setSetNo] = useState(1) // current set (1-based)

  // return-from-rest state
  useEffect(() => {
    const nxt = sessionStorage.getItem('nf_return')
    if (nxt) {
      const { i: ii, setNo: s } = JSON.parse(nxt)
      setI(ii); setSetNo(s)
      sessionStorage.removeItem('nf_return')
    }
  }, [])

  const ex = list[i] as ExerciseT

  const totalExercises = list.length
  const progressPct = useMemo(() => {
    const perExercise = 1 / totalExercises
    const withinExercise = ((setNo - 1) / Math.max(1, ex.sets)) * perExercise
    return Math.min(100, Math.round(((i * perExercise) + withinExercise) * 100))
  }, [i, setNo, ex.sets, totalExercises])

  const goRest = (nextIndex: number, nextSet: number, seconds?: number) => {
    sessionStorage.setItem('nf_rest', String(seconds ?? ex.restSeconds ?? 60))
    sessionStorage.setItem('nf_next', JSON.stringify({ i: nextIndex, setNo: nextSet }))
    nav('/workout/rest')
  }

  const completeSet = () => {
    // more sets remaining in current exercise
    if (setNo < ex.sets) return goRest(i, setNo + 1)
    // move to next exercise
    if (i < list.length - 1) return goRest(i + 1, 1)
    // workout finished
    nav('/workout/complete')
  }

  const skipExercise = () => {
    if (i < list.length - 1) return goRest(i + 1, 1, Math.min(30, ex.restSeconds ?? 30))
    nav('/workout/complete')
  }



  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">
      {/* Top bar */}
      <header className="mx-auto max-w-4xl px-5 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-emerald-400 to-cyan-400 ring-1 ring-white/10" />
            <span className="font-semibold">Neurafit</span>
          </div>
          <button onClick={() => nav('/workout/preview')} className="text-sm text-white/80 hover:text-white">
            Preview
          </button>
        </div>
        {/* progress */}
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-white/70">
            <span>Exercise {i + 1} of {totalExercises}</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded bg-white/10">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </header>

      {/* Exercise card */}
      <main className="mx-auto max-w-4xl px-5 pb-28">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-400 opacity-20 blur-3xl" />
          <h1 className="text-2xl font-bold tracking-tight">{ex.name}</h1>

          {/* chips */}
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Chip>Set {setNo} of {ex.sets}</Chip>
            <Chip>Reps: {ex.reps}</Chip>
            <Chip>Rest: {ex.restSeconds ?? 60}s</Chip>
          </div>

          {/* how-to */}
          {ex.description && (
            <p className="mt-4 text-white/90 leading-relaxed">
              <span className="font-medium">How to do it: </span>{ex.description}
            </p>
          )}

          {/* tips */}
          {Array.isArray(ex.formTips) && ex.formTips.length > 0 && (
            <div className="mt-5">
              <div className="mb-1 font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4" /> Form tips
              </div>
              <ul className="list-disc list-inside text-white/80 text-sm space-y-1">
                {ex.formTips.slice(0, 3).map((t, idx) => <li key={idx}>{t}</li>)}
              </ul>
            </div>
          )}
          {Array.isArray(ex.safetyTips) && ex.safetyTips.length > 0 && (
            <div className="mt-4">
              <div className="mb-1 font-medium text-amber-300 flex items-center gap-2">
                <Shield className="h-4 w-4" /> Safety
              </div>
              <ul className="list-disc list-inside text-amber-200/90 text-sm space-y-1">
                {ex.safetyTips.slice(0, 3).map((t, idx) => <li key={idx}>{t}</li>)}
              </ul>
            </div>
          )}
        </div>
      </main>

      {/* Sticky controls */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto max-w-4xl px-5 py-4 flex items-center justify-between gap-3">
          <button
            onClick={skipExercise}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white/90 hover:bg-white/10"
          >
            Skip
          </button>
          <button
            onClick={completeSet}
            className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Complete Set
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- Small components ---------- */
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1">
      {children}
    </span>
  )
}

function EmptyState() {
  const nav = useNavigate()
  return (
    <div className="min-h-screen grid place-items-center bg-white">
      <div className="max-w-md text-center">
        <h2 className="text-xl font-semibold mb-2">No plan found</h2>
        <p className="text-slate-600 mb-4">Generate a workout to start your session.</p>
        <button onClick={() => nav('/generate')} className="rounded-lg bg-slate-900 text-white px-4 py-2">Generate</button>
      </div>
    </div>
  )
}

