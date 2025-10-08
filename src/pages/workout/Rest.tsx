// src/pages/workout/Rest.tsx
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import WorkoutFlowHeader from '../../components/WorkoutFlowHeader'
import { EnhancedRestTimer } from '../../components/EnhancedRestTimer'
import { logger } from '../../lib/logger'
import { useWorkoutScrollToTop } from '../../hooks/useScrollToTop'

export default function Rest() {
  const nav = useNavigate()

  // Scroll to top on mount and route changes
  useWorkoutScrollToTop()

  // Retrieve initial rest time, default to 60 seconds if not set
  const initial = useMemo(() => {
    const storedRest = sessionStorage.getItem('nf_rest')
    return storedRest ? Number(storedRest) : 60
  }, [])

  // Parse next exercise data safely
  const nextExercise = useMemo(() => {
    try {
      const nextRaw = sessionStorage.getItem('nf_next')
      const planRaw = sessionStorage.getItem('nf_workout_plan')

      if (!nextRaw || !planRaw) return undefined

      const next = JSON.parse(nextRaw) as { i: number; setNo: number }
      const plan = JSON.parse(planRaw) as { plan?: { exercises?: { name: string; sets: number; reps: number | string; restSeconds?: number }[] } }
      const ex = plan?.plan?.exercises?.[next.i]

      if (!ex) return undefined

      return {
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        restSeconds: ex.restSeconds
      }
    } catch (error) {
      logger.error('Error parsing next exercise data', { error })
      return undefined
    }
  }, [])

  const handleComplete = () => {
    // Transfer next state to return state for Exercise screen
    const next = sessionStorage.getItem('nf_next')
    if (next) {
      sessionStorage.setItem('nf_return', next)
      sessionStorage.removeItem('nf_next')
    }
    nav('/workout/run')
  }

  return (
    <>
      <WorkoutFlowHeader
        title="Rest Period"
        showBackButton={true}
        onBack={() => nav('/workout/run')}
      />
      <EnhancedRestTimer
        initialSeconds={initial}
        onComplete={handleComplete}
        nextExercise={nextExercise}
      />
    </>
  )
}