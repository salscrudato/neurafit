// src/pages/Generate.tsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const TYPES = [
  'Full Body','Upper Body','Lower Body','Cardio','Strength','HIIT','Core Focus',
  'Yoga/Pilates','Bodyweight','Push/Pull Split','Circuit','Other'
] as const
const DUR = [15, 30, 45, 60, 75, 90] as const

type Profile = {
  experience?: string
  goals?: string[]
  equipment?: string[]
  personal?: { sex?: string; height?: string; weight?: string }
  injuries?: { list?: string[]; notes?: string }
}

export default function Generate() {
  const nav = useNavigate()
  const [type, setType] = useState<string>()
  const [duration, setDuration] = useState<number>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch profile on mount
  useEffect(() => {
    (async () => {
      const uid = auth.currentUser?.uid
      if (!uid) return nav('/') // not signed in (guarded routes should prevent this)
      try {
        const snap = await getDoc(doc(db, 'users', uid))
        if (!snap.exists()) {
          nav('/onboarding'); return
        }
        const p = snap.data() as Profile
        // basic completeness check (align with your SessionProvider rule)
        const complete = !!(p.experience && p.goals?.length && p.personal?.height && p.personal?.weight)
        if (!complete) { nav('/onboarding'); return }
        setProfile(p)
      } catch (error) {
        console.error('Error fetching profile:', error)
        // If there's a permission error, redirect to auth
        nav('/')
      }
    })()
  }, [nav])

  const disabled = !type || !duration || loading

  const profileSummary = useMemo(() => {
    if (!profile) return ''
    const g = (profile.goals || []).slice(0, 2).join(' • ')
    const eq = (profile.equipment || []).slice(0, 2).join(' • ') || 'Bodyweight'
    return [profile.experience, g, eq].filter(Boolean).join(' • ')
  }, [profile])

  async function generate() {
    if (disabled || !profile) return
    setError(null)
    setLoading(true)

    // Minimal payload
    const payload = {
      experience: profile.experience,
      goals: profile.goals,
      equipment: profile.equipment,
      personalInfo: profile.personal,
      injuries: profile.injuries,
      workoutType: type,
      duration,
    }

    const url = import.meta.env.VITE_WORKOUT_FN_URL as string
    const controller = new AbortController()

    const fetchOnce = async () => {
      const t = setTimeout(() => controller.abort(), 60_000) // 60s timeout
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const plan = await res.json()
        if (!plan?.exercises || !Array.isArray(plan.exercises)) {
          throw new Error('Invalid AI response')
        }
        sessionStorage.setItem('nf_workout_plan', JSON.stringify({ plan, type, duration }))
        nav('/workout/preview')
      } finally {
        clearTimeout(t)
      }
    }

    // small retry (2 attempts total) for transient failures
    try {
      await fetchOnce()
    } catch (e1: any) {
      try {
        await new Promise(r => setTimeout(r, 1200))
        await fetchOnce()
      } catch (e2: any) {
        setError(
          e2?.name === 'AbortError'
            ? 'The server took too long to respond. Please try again.'
            : (e2?.message || 'Failed to generate. Please try again.')
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">
      {/* Top bar */}
      <header className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-400 to-cyan-400 shadow-lg ring-1 ring-white/10" />
          <span className="text-lg font-semibold tracking-tight">Neurafit</span>
        </div>
        <button
          onClick={() => nav('/dashboard')}
          className="text-sm text-white/80 hover:text-white transition"
        >
          Dashboard
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-16">
        {/* Hero card */}
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8 backdrop-blur-lg relative overflow-hidden">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-400 opacity-20 blur-3xl" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Generate your next workout</h1>
          <p className="mt-2 text-white/80">
            Tailored to your goals, experience, equipment and injuries—powered by GPT-4o-mini.
          </p>
          {profile && (
            <div className="mt-3 text-sm text-white/70">
              <span className="opacity-80">Profile: </span>{profileSummary}
              <button
                onClick={() => nav('/profile')}
                className="ml-3 underline decoration-white/30 hover:decoration-white"
              >
                Edit
              </button>
            </div>
          )}
        </section>

        {/* Options */}
        <section className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Type */}
          <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Workout Type</h3>
              {type && <span className="text-xs text-white/70">Selected: {type}</span>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={[
                    'rounded-xl border px-4 py-3 text-left transition',
                    type === t
                      ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                  ].join(' ')}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Duration</h3>
              {duration && <span className="text-xs text-white/70">{duration} min</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {DUR.map((m) => (
                <button
                  key={m}
                  onClick={() => setDuration(m)}
                  className={[
                    'rounded-full border px-4 py-2 text-sm transition',
                    duration === m
                      ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                  ].join(' ')}
                >
                  {m} min
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-white/60">Tip: Short on time? Try 15–30 min HIIT or Core Focus.</p>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-amber-200">
            {error}
          </div>
        )}

        {/* Generate CTA */}
        <div className="mt-8 flex items-center justify-between">
          <div className="text-sm text-white/70">AI will return a set-by-set plan with rest timers and safety tips.</div>
          <button
            onClick={generate}
            disabled={disabled}
            className={[
              'rounded-xl px-6 py-3 font-semibold',
              disabled
                ? 'bg-emerald-500/40 text-white/80 cursor-not-allowed'
                : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
            ].join(' ')}
          >
            {loading ? 'Generating…' : 'Generate workout'}
          </button>
        </div>
      </main>
    </div>
  )
}