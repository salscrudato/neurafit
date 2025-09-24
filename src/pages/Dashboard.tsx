// src/pages/Dashboard.tsx
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../lib/firebase'
import { Zap, History, User } from 'lucide-react'
import type { ReactElement } from 'react'

export default function Dashboard() {
  const nav = useNavigate()
  const user = auth.currentUser
  const firstName = useMemo(() => {
    const n = user?.displayName || user?.email || user?.phoneNumber || 'Athlete'
    return String(n).split(' ')[0]
  }, [user])



  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">
      {/* Top bar */}
      <header className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-400 to-cyan-400 shadow-lg ring-1 ring-white/10" />
          <span className="text-lg font-semibold tracking-tight">Neurafit</span>
        </div>
        <button
          onClick={() => nav('/profile')}
          className="text-sm text-white/80 hover:text-white transition"
        >
          Profile
        </button>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8 backdrop-blur-lg relative overflow-hidden">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-tr from-emerald-400 to-cyan-400 opacity-20 blur-3xl" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Welcome back, {firstName}.
          </h1>
          <p className="mt-2 text-white/80">
            Generate a personalized workout in seconds. Smart progressions, form & safety tips, built-in rest timer.
          </p>
        </div>
      </section>

      {/* Quick features */}
      <section className="mx-auto max-w-6xl px-6 mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashCard onClick={() => nav('/generate')}
          title="Generate Workout"
          desc="AI-tailored plans from goals, experience, equipment & injuries."
          gradient="from-fuchsia-400 to-pink-400"
          icon={<Zap className="h-5 w-5" />}
        />
        <DashCard onClick={() => nav('/history')}
          title="Workout History"
          desc="Auto-saved sessions to review, repeat, and track progress."
          gradient="from-cyan-400 to-emerald-400"
          icon={<History className="h-5 w-5" />}
        />
        <DashCard onClick={() => nav('/profile')}
          title="Profile"
          desc="Update goals, equipment, or injuries to keep plans accurate."
          gradient="from-amber-400 to-orange-500"
          icon={<User className="h-5 w-5" />}
        />
      </section>


    </div>
  )
}

/* ---------- Reusable components ---------- */
function DashCard({
  title, desc, icon, gradient, onClick,
}: {
  title: string
  desc: string
  icon: ReactElement
  gradient: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur hover:bg-white/10 transition"
    >
      <div className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-tr ${gradient} opacity-30 blur-2xl`} />
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 text-white">
        {icon}
      </div>
      <div className="font-semibold">{title}</div>
      <p className="mt-1 text-sm text-white/80">{desc}</p>
      <div className="mt-4 text-sm text-emerald-300 opacity-0 group-hover:opacity-100 transition">
        Open →
      </div>
    </button>
  )
}

