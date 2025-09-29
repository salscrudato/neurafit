// src/pages/workout/Rest.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../../components/AppHeader'
import { EnhancedRestTimer } from '../../components/EnhancedRestTimer'

export default function Rest() {
  const nav = useNavigate()

  // Base timer state
  const initial = Number(sessionStorage.getItem('nf_rest') || 60)

  // Next exercise data
  const nextExercise = useMemo(() => {
    try {
      const nextRaw = sessionStorage.getItem('nf_next')
      const planRaw = sessionStorage.getItem('nf_workout_plan')

      if (!nextRaw || !planRaw) return undefined

      const next = JSON.parse(nextRaw) as { i: number; setNo: number }
      const plan = JSON.parse(planRaw) as any
      const ex = plan?.plan?.exercises?.[next.i]

      if (!ex) return undefined

      return {
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        restSeconds: ex.restSeconds
      }
    } catch {
      return undefined
    }
  }, [])

  const handleComplete = () => {
    // Hand off to Exercise screen
    const next = sessionStorage.getItem('nf_next')
    if (next) {
      sessionStorage.setItem('nf_return', next)
      sessionStorage.removeItem('nf_next')
    }
    nav('/workout/run')
  }

  return (
    <>
      <AppHeader />
      <EnhancedRestTimer
        initialSeconds={initial}
        onComplete={handleComplete}
        nextExercise={nextExercise}
      />
    </>
  )
}