// src/pages/workout/Rest.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

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

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); togglePause() }
      if (e.key === 'ArrowRight') { e.preventDefault(); skip() }
      if (e.key === 'ArrowUp') { e.preventDefault(); addSeconds(+15) }
      if (e.key === 'ArrowDown') { e.preventDefault(); addSeconds(-15) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Circular progress
  const r = 54
  const circumference = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(total, sec))
  const progress = total > 0 ? (1 - (clamped / total)) : 1
  const offset = circumference * (1 - progress)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">
      {/* Header */}
      <header className="mx-auto max-w-4xl px-5 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-emerald-400 to-cyan-400 ring-1 ring-white/10" />
          <span className="font-semibold">Neurafit</span>
        </div>
        <button onClick={() => nav('/workout/run')} className="text-sm text-white/80 hover:text-white">
          Back to workout
        </button>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-4xl px-5 pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8 backdrop-blur text-center">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-400 opacity-20 blur-3xl" />
          <h1 className="text-3xl font-bold tracking-tight">Rest</h1>
          <p className="mt-1 text-white/70 text-sm">Auto-continue when the timer ends.</p>

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
                <div className="text-5xl font-mono tabular-nums" aria-live="polite">{Math.max(0, sec)}s</div>
              </div>
            </div>
          </div>

          {/* Next up */}
          <div className="mt-6 inline-flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-left">
            <div className="mt-1 h-6 w-6 grid place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
              <NextIcon />
            </div>
            <div>
              <div className="text-sm text-white/70">Next up</div>
              <div className="font-semibold">{nextName}</div>
              {nextLabel && <div className="text-sm text-white/70">{nextLabel}</div>}
            </div>
          </div>

          {/* Controls */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => addSeconds(-15)}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 hover:bg-white/10"
            >
              −15s
            </button>
            <button
              onClick={togglePause}
              className="rounded-xl bg-emerald-500 px-6 py-2 font-semibold text-slate-950 hover:bg-emerald-400"
            >
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={() => addSeconds(+15)}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 hover:bg-white/10"
            >
              +15s
            </button>
            <button
              onClick={skip}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 hover:bg-white/10"
              title="ArrowRight"
            >
              Skip
            </button>
          </div>

          <div className="mt-3 text-xs text-white/60">
            Shortcuts: Space = Pause/Resume · ↑/+15s · ↓/−15s · → Skip
          </div>
        </div>
      </main>
    </div>
  )
}

/* --------- Inline icon --------- */
function NextIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
    </svg>
  )
}