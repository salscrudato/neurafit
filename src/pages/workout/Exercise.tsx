// src/pages/workout/Exercise.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lightbulb, Shield } from 'lucide-react'
import AppHeader from '../../components/AppHeader'

type ExerciseT = {
  name: string
  description?: string      // 3–5 layman sentences (from backend prompt)
  sets: number
  reps: number | string
  formTips?: string[]
  safetyTips?: string[]
  restSeconds?: number
  usesWeight?: boolean      // true if this exercise uses external weights
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

  // Weight tracking state - stores weight for each exercise and set
  const [workoutWeights, setWorkoutWeights] = useState<Record<number, Record<number, number | null>>>(() => {
    const savedWeights = sessionStorage.getItem('nf_workout_weights')
    return savedWeights ? JSON.parse(savedWeights) : {}
  })

  // Update weight for current exercise and set
  // RULE 3: If a set is complete and a weight is entered, the set should be marked as complete and the weight should be stored and displayed
  const updateWeight = (weight: number | null) => {
    setWorkoutWeights(prev => {
      const updated = {
        ...prev,
        [i]: {
          ...prev[i],
          [setNo]: weight
        }
      }
      sessionStorage.setItem('nf_workout_weights', JSON.stringify(updated))
      console.log(`🏋️ Weight entered for set ${setNo} of ${ex.name}:`, weight)
      return updated
    })
  }

  // return-from-rest state
  useEffect(() => {
    const nxt = sessionStorage.getItem('nf_return')
    if (nxt) {
      const { i: ii, setNo: s } = JSON.parse(nxt)
      setI(ii); setSetNo(s)
      sessionStorage.removeItem('nf_return')
    }
  }, [])

  // Clear weight data ONLY when starting a completely fresh workout
  // This should only happen when navigating directly to /workout/run from /workout/preview
  useEffect(() => {
    const isReturningFromRest = sessionStorage.getItem('nf_return')
    const hasWorkoutStartTime = sessionStorage.getItem('nf_workout_start_time')

    console.log('🔍 Weight clearing check - returning from rest:', !!isReturningFromRest, 'i:', i, 'setNo:', setNo, 'hasStartTime:', !!hasWorkoutStartTime)

    // Only clear weights if:
    // 1. Not returning from rest AND
    // 2. At the very beginning (i=0, setNo=1) AND
    // 3. No workout start time (meaning we haven't started the workout yet)
    if (!isReturningFromRest && i === 0 && setNo === 1 && !hasWorkoutStartTime) {
      const hasExistingWeights = sessionStorage.getItem('nf_workout_weights')
      console.log('🔍 Clearing existing weights for fresh workout:', hasExistingWeights)
      if (hasExistingWeights) {
        sessionStorage.removeItem('nf_workout_weights')
        setWorkoutWeights({})
        console.log('🧹 Weight data cleared for fresh workout')
      }

      // Set workout start time to prevent future clearing
      if (!hasWorkoutStartTime) {
        sessionStorage.setItem('nf_workout_start_time', String(Date.now()))
        console.log('⏰ Workout start time set')
      }
    }
  }, []) // Only run once on mount

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
    // RULE 1: If a set is complete regardless of whether or not a weight is entered,
    // the set should be marked as complete
    setWorkoutWeights(prev => {
      const currentWeight = prev[i]?.[setNo]
      const updated = {
        ...prev,
        [i]: {
          ...prev[i],
          // If weight was already entered, keep it; otherwise use 0 to indicate completed set without weight
          [setNo]: currentWeight !== undefined ? currentWeight : 0
        }
      }
      sessionStorage.setItem('nf_workout_weights', JSON.stringify(updated))
      console.log(`✅ Set ${setNo} of ${ex.name} marked as COMPLETE:`, updated[i][setNo])
      return updated
    })

    // more sets remaining in current exercise
    if (setNo < ex.sets) return goRest(i, setNo + 1)
    // move to next exercise
    if (i < list.length - 1) return goRest(i + 1, 1)
    // workout finished
    nav('/workout/complete')
  }

  const skipSet = () => {
    // RULE 2: If a set is skipped, it should be marked as incomplete
    setWorkoutWeights(prev => {
      const updated = {
        ...prev,
        [i]: {
          ...prev[i],
          [setNo]: null // null indicates skipped set (incomplete)
        }
      }
      sessionStorage.setItem('nf_workout_weights', JSON.stringify(updated))
      console.log(`❌ Set ${setNo} of ${ex.name} marked as SKIPPED (incomplete):`, null)
      return updated
    })

    // more sets remaining in current exercise
    if (setNo < ex.sets) return goRest(i, setNo + 1)
    // move to next exercise
    if (i < list.length - 1) return goRest(i + 1, 1)
    // workout finished
    nav('/workout/complete')
  }

  const skipExercise = () => {
    // Mark this exercise as skipped by creating an empty weights object
    setWorkoutWeights(prev => {
      const updated = {
        ...prev,
        [i]: {} // Empty object indicates exercise was skipped
      }
      sessionStorage.setItem('nf_workout_weights', JSON.stringify(updated))
      return updated
    })

    if (i < list.length - 1) return goRest(i + 1, 1, Math.min(30, ex.restSeconds ?? 30))
    nav('/workout/complete')
  }



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-200/30 to-blue-200/30 rounded-full blur-3xl" />
      </div>

      <AppHeader />

      {/* Progress bar */}
      <div className="relative mx-auto max-w-4xl px-5 pt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
          <span>Exercise {i + 1} of {totalExercises}</span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded bg-gray-200">
          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Exercise card */}
      <main className="relative mx-auto max-w-4xl px-5 pb-28">
        <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white/70 backdrop-blur-sm p-6 shadow-lg">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-tr from-blue-400/20 to-indigo-400/20 blur-3xl" />
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{ex.name}</h1>

          {/* chips */}
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Chip>Set {setNo} of {ex.sets}</Chip>
            <Chip>Reps: {ex.reps}</Chip>
            <Chip>Rest: {ex.restSeconds ?? 60}s</Chip>
          </div>

          {/* Weight input for exercises that use weights */}
          {ex.usesWeight && (
            <div className="mt-4">
              <WeightInput
                currentWeight={workoutWeights[i]?.[setNo] || null}
                onWeightChange={updateWeight}
                setNumber={setNo}
              />
            </div>
          )}

          {/* how-to */}
          {ex.description && (
            <p className="mt-4 text-gray-700 leading-relaxed">
              <span className="font-medium">How to do it: </span>{ex.description}
            </p>
          )}

          {/* tips */}
          {Array.isArray(ex.formTips) && ex.formTips.length > 0 && (
            <div className="mt-5">
              <div className="mb-1 font-medium text-blue-700 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" /> Form tips
              </div>
              <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                {ex.formTips.slice(0, 3).map((t, idx) => <li key={idx}>{t}</li>)}
              </ul>
            </div>
          )}
          {Array.isArray(ex.safetyTips) && ex.safetyTips.length > 0 && (
            <div className="mt-4">
              <div className="mb-1 font-medium text-orange-600 flex items-center gap-2">
                <Shield className="h-4 w-4" /> Safety
              </div>
              <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                {ex.safetyTips.slice(0, 3).map((t, idx) => <li key={idx}>{t}</li>)}
              </ul>
            </div>
          )}
        </div>
      </main>

      {/* Sticky controls */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-4xl px-5 py-4 flex items-center justify-between gap-3">
          <button
            onClick={skipExercise}
            className="rounded-xl border border-gray-300 bg-white/70 px-3 py-3 text-gray-700 hover:bg-white hover:border-gray-400 transition-all duration-200 text-sm"
          >
            Skip Exercise
          </button>
          <div className="flex gap-2">
            <button
              onClick={skipSet}
              className="rounded-xl border border-orange-300 bg-orange-50 px-4 py-3 text-orange-700 hover:bg-orange-100 hover:border-orange-400 transition-all duration-200"
            >
              Skip Set
            </button>
            <button
              onClick={completeSet}
              className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 px-6 py-3 font-semibold text-white hover:scale-[1.02] transition-all duration-200 shadow-md"
            >
              Complete Set
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- Small components ---------- */
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-gray-700 text-xs">
      {children}
    </span>
  )
}

function WeightInput({
  currentWeight,
  onWeightChange,
  setNumber
}: {
  currentWeight: number | null
  onWeightChange: (weight: number | null) => void
  setNumber: number
}) {
  const [inputValue, setInputValue] = useState(currentWeight?.toString() || '')

  const handleSubmit = () => {
    const weight = inputValue.trim() === '' ? null : parseFloat(inputValue)
    if (weight !== null && (isNaN(weight) || weight < 0)) return // Invalid input
    onWeightChange(weight)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
      ;(e.target as HTMLInputElement).blur()
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium text-gray-900">Weight for Set {setNumber}</div>
          <div className="text-sm text-gray-600">Enter weight in lbs (optional)</div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={handleKeyDown}
            placeholder="0"
            min="0"
            step="0.5"
            className="w-20 rounded-lg border border-gray-200 bg-white px-3 py-2 text-center text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <span className="text-sm text-gray-600">lbs</span>
        </div>
      </div>
      {currentWeight !== null && (
        <div className="mt-2 text-xs text-green-600">
          ✓ {currentWeight} lbs recorded
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  const nav = useNavigate()
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative">
      <AppHeader />
      <div className="relative grid place-items-center pt-20">
        <div className="max-w-md text-center bg-white/70 backdrop-blur-sm border border-gray-200 rounded-3xl p-8 shadow-lg">
          <h2 className="text-xl font-semibold mb-2 text-gray-900">No plan found</h2>
          <p className="text-gray-600 mb-4">Generate a workout to start your session.</p>
          <button
            onClick={() => nav('/generate')}
            className="px-6 py-3 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:scale-[1.02] transition-all duration-200 shadow-md"
          >
            Generate Workout
          </button>
        </div>
      </div>
    </div>
  )
}

