// src/pages/Dashboard.tsx
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../lib/firebase'
import { Zap, History, User } from 'lucide-react'
// Removed unused ReactElement import
import AppHeader from '../components/AppHeader'
import { DashboardCard } from '../design-system/components/Card'
import { Button } from '../design-system/components/Button'
import { Stagger, Floating } from '../components/MicroInteractions'

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



      {/* Quick Actions */}
      <section className="relative mx-auto max-w-6xl px-6 mt-8">
        <Stagger delay={100}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Floating intensity={5} duration={4000}>
              <DashboardCard
                title="Generate Workout"
                description="AI-tailored plans from goals, experience, equipment & injuries."
                icon={<Zap className="h-5 w-5" />}
                action={
                  <Button size="sm" onClick={() => nav('/generate')}>
                    Start
                  </Button>
                }
                interactive
                ripple
                onClick={() => nav('/generate')}
              />
            </Floating>

            <Floating intensity={8} duration={3500}>
              <DashboardCard
                title="Workout History"
                description="Auto-saved sessions to review, repeat, and track progress."
                icon={<History className="h-5 w-5" />}
                action={
                  <Button size="sm" variant="secondary" onClick={() => nav('/history')}>
                    View
                  </Button>
                }
                interactive
                ripple
                onClick={() => nav('/history')}
              />
            </Floating>

            <Floating intensity={6} duration={4500}>
              <DashboardCard
                title="Profile Settings"
                description="Update goals, equipment, or injuries to keep plans accurate."
                icon={<User className="h-5 w-5" />}
                action={
                  <Button size="sm" variant="outline" onClick={() => nav('/profile')}>
                    Edit
                  </Button>
                }
                interactive
                ripple
                onClick={() => nav('/profile')}
              />
            </Floating>
          </div>
        </Stagger>
      </section>


    </div>
  )
}

// Old DashCard component removed - now using premium design system components

