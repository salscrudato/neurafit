// src/pages/workout/Rest.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../../components/AppHeader'

export default function Rest() {
  const nav = useNavigate()

  // Base timer state (allow adjustments)
  const initial = Number(sessionStorage.getItem('nf_rest') || 60)
  const [total, setTotal] = useState<number>(Math.max(1, initial))
  const [sec, setSec] = useState<number>(Math.max(0, initial))
  const [paused, setPaused] = useState(false)

  // Next target (used to display "Next up")
  const nextRaw = sessionStorage.getItem('nf_next')
  const planRaw = sessionStorage.getItem('nf_workout_plan')
  const { nextName, nextLabel } = useMemo(() => {
    try {
      const next = nextRaw ? JSON.parse(nextRaw) as { i: number; setNo: number } : null
      const plan = planRaw ? JSON.parse(planRaw) as any : null
      const ex = plan?.plan?.exercises?.[next?.i ?? 0]
      if (!ex) return { nextName: 'Next exercise', nextLabel: '' }
      return {
        nextName: ex.name || 'Next exercise',
        nextLabel: `Set ${next?.setNo ?? 1} of ${ex.sets ?? '?'}`,
      }
    } catch {
      return { nextName: 'Next exercise', nextLabel: '' }
    }
  }, [nextRaw, planRaw])

  // Interval control
  const intervalRef = useRef<number | null>(null)
  useEffect(() => {
    if (paused) return
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    intervalRef.current = window.setInterval(() => setSec(s => s - 1), 1000)
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    }
  }, [paused])

  // Navigate when done
  useEffect(() => {
    if (sec <= 0) {
      // Hand off to Exercise screen
      const next = sessionStorage.getItem('nf_next')
      if (next) {
        sessionStorage.setItem('nf_return', next)
        sessionStorage.removeItem('nf_next')
      }
      nav('/workout/run')
    }
  }, [sec, nav])

  // Beeps + haptics for last 3 seconds
  const audioCtxRef = useRef<AudioContext | null>(null)
  const beep = (frequency = 880, duration = 120) => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext
      audioCtxRef.current = audioCtxRef.current || new AudioCtx()
      const ctx = audioCtxRef.current
      if (!ctx) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = frequency
      gain.gain.value = 0.07
      osc.connect(gain).connect(ctx.destination)
      osc.start()
      setTimeout(() => { osc.stop(); osc.disconnect(); gain.disconnect() }, duration)
    } catch { /* ignore */ }
  }
  useEffect(() => {
    if (paused) return
    if (sec === 3 || sec === 2 || sec === 1) {
      beep(sec === 1 ? 980 : 820)
      if ('vibrate' in navigator) navigator.vibrate(60)
    }
    document.title = `Rest: ${Math.max(0, sec)}s`
    return () => { document.title = 'Neurafit' }
  }, [sec, paused])

  // Controls
  const addSeconds = (d: number) => {
    setTotal(t => Math.max(1, t + d))
    setSec(s => Math.max(0, s + d))
  }
  const togglePause = () => setPaused(p => !p)
  const skip = () => setSec(0)



  // Circular progress
  const r = 54
  const circumference = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(total, sec))
  const progress = total > 0 ? (1 - (clamped / total)) : 1
  const offset = circumference * (1 - progress)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-200/30 to-blue-200/30 rounded-full blur-3xl" />
      </div>

      <AppHeader />

      {/* Body */}
      <main className="relative mx-auto max-w-4xl px-5 pb-20 pt-6">
        <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white/70 backdrop-blur-sm p-6 md:p-8 shadow-lg text-center">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-tr from-blue-400/20 to-indigo-400/20 blur-3xl" />
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Rest</h1>
          <p className="mt-1 text-gray-600 text-sm">Auto-continue when the timer ends.</p>

          {/* Timer */}
          <div className="mt-6 grid place-items-center">
            <div className="relative h-40 w-40">
              <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
                <circle cx="60" cy="60" r={r} stroke="rgba(255,255,255,0.12)" strokeWidth="10" fill="none" />
                <circle
                  cx="60" cy="60" r={r}
                  stroke="url(#g)"
                  strokeWidth="10" fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-5xl font-mono tabular-nums text-gray-900" aria-live="polite">{Math.max(0, sec)}s</div>
              </div>
            </div>
          </div>

          {/* Next up */}
          <div className="mt-6 inline-flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-left">
            <div className="mt-1 h-6 w-6 grid place-items-center rounded-lg bg-blue-100 ring-1 ring-blue-200">
              <NextIcon />
            </div>
            <div>
              <div className="text-sm text-gray-600">Next up</div>
              <div className="font-semibold text-gray-900">{nextName}</div>
              {nextLabel && <div className="text-sm text-gray-600">{nextLabel}</div>}
            </div>
          </div>

          {/* Controls */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => addSeconds(-15)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              −15s
            </button>
            <button
              onClick={togglePause}
              className="rounded-xl bg-emerald-500 px-6 py-2 font-semibold text-white hover:bg-emerald-400 shadow-sm"
            >
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={() => addSeconds(+15)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              +15s
            </button>
            <button
              onClick={skip}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              Skip
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

/* --------- Inline icon --------- */
function NextIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
    </svg>
  )
}