// src/pages/Dashboard.tsx
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../lib/firebase'
import { Zap, History, User } from 'lucide-react'
import type { ReactElement } from 'react'
import AppHeader from '../components/AppHeader'

export default function Dashboard() {
  const nav = useNavigate()
  const user = auth.currentUser
  const firstName = useMemo(() => {
    const n = user?.displayName || user?.email || user?.phoneNumber || 'Athlete'
    return String(n).split(' ')[0]
  }, [user])



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-200/30 to-blue-200/30 rounded-full blur-3xl" />
      </div>

      <AppHeader />

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 pt-6">
        <div className="rounded-3xl border border-blue-100/50 bg-white/70 backdrop-blur-sm p-6 md:p-8 relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-400 opacity-10 blur-3xl" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
            Welcome back, {firstName}.
          </h1>
          <p className="mt-2 text-gray-600">
            Generate a personalized workout in seconds. Smart progressions, form & safety tips, built-in rest timer.
          </p>
        </div>
      </section>

      {/* Quick features */}
      <section className="relative mx-auto max-w-6xl px-6 mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashCard onClick={() => nav('/generate')}
          title="Generate Workout"
          desc="AI-tailored plans from goals, experience, equipment & injuries."
          gradient="from-blue-400 to-indigo-500"
          icon={<Zap className="h-5 w-5" />}
        />
        <DashCard onClick={() => nav('/history')}
          title="Workout History"
          desc="Auto-saved sessions to review, repeat, and track progress."
          gradient="from-emerald-400 to-teal-500"
          icon={<History className="h-5 w-5" />}
        />
        <DashCard onClick={() => nav('/profile')}
          title="Profile"
          desc="Update goals, equipment, or injuries to keep plans accurate."
          gradient="from-orange-400 to-amber-500"
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
      className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm p-5 text-left hover:bg-white hover:shadow-lg hover:scale-[1.02] transition-all duration-300 shadow-sm"
    >
      <div className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-tr ${gradient} opacity-15 blur-2xl`} />
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/50 text-blue-600">
        {icon}
      </div>
      <div className="font-semibold text-gray-900">{title}</div>
      <p className="mt-1 text-sm text-gray-600">{desc}</p>
      <div className="mt-4 text-sm text-blue-600 opacity-0 group-hover:opacity-100 transition">
        Open →
      </div>
    </button>
  )
}

