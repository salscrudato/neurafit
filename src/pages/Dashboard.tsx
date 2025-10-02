// src/pages/Dashboard.tsx
import { useMemo, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../lib/firebase'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { convertToDate } from '../utils/timestamp'
import {
  Zap,
  History,
  User as UserIcon,
  Activity
} from 'lucide-react'
import AppHeader from '../components/AppHeader'
import { DashboardCard } from '../design-system/components/SpecializedCards'
import { Button } from '../design-system/components/Button'
import { Stagger } from '../components/MicroInteractions'
import { MotivationalBanner } from '../components/MotivationalBanner'
import { SubscriptionStatusCard } from '../components/SubscriptionStatusCard'

interface WorkoutItem {
  id: string
  workoutType: string
  duration: number
  timestamp: Date | { toDate(): Date } | string
  exercises?: Array<{
    name: string
    sets: number
    reps: string | number
    weights?: Record<number, number | null>
    usesWeight?: boolean
  }>
  completionRate?: number
}

interface DashboardStats {
  totalWorkouts: number
  weeklyWorkouts: number
  consistencyScore: number
  recentStreak: number
}

export default function Dashboard() {
  const nav = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get current user
  useEffect(() => {
    setUser(auth.currentUser)
  }, [])

  const firstName = useMemo(() => {
    const n = user?.displayName || user?.email || user?.phoneNumber || 'Athlete'
    return String(n).split(' ')[0]
  }, [user])

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const uid = auth.currentUser?.uid
        if (!uid) {
          setError('Not authenticated')
          return
        }

        // Fetch all workouts (assuming reasonable number per user)
        const workoutsRef = collection(db, 'users', uid, 'workouts')
        const workoutsQuery = query(workoutsRef, orderBy('timestamp', 'desc'))
        const workoutsSnap = await getDocs(workoutsQuery)
        const workouts = workoutsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as WorkoutItem[]

        // Calculate dashboard statistics
        if (workouts.length > 0) {
          // Calculate consistency over last 30 days (percentage of active days)
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          const recentWorkouts = workouts.filter(w => convertToDate(w.timestamp) >= thirtyDaysAgo)
          const activeDays = new Set(recentWorkouts.map(w => convertToDate(w.timestamp).toDateString())).size
          const consistencyScore = Math.round((activeDays / 30) * 100)

          // Calculate weekly workouts (count in last 7 days)
          const weekAgo = new Date()
          weekAgo.setDate(weekAgo.getDate() - 7)
          const weeklyWorkouts = workouts.filter(w => convertToDate(w.timestamp) >= weekAgo).length

          // Calculate recent streak
          // Workouts are already sorted newest first from query
          let streak = 0
          let currentDate = new Date()
          for (const workout of workouts) {
            const workoutDate = convertToDate(workout.timestamp)
            if (!workout.timestamp) break

            const daysDiff = Math.floor((currentDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24))
            if (daysDiff <= 1 || (streak === 0 && daysDiff <= 7)) {
              streak++
              currentDate = workoutDate
            } else {
              break
            }
          }

          const totalWorkouts = workouts.length

          setDashboardStats({
            totalWorkouts,
            weeklyWorkouts,
            consistencyScore,
            recentStreak: streak
          })
        } else {
          setDashboardStats({
            totalWorkouts: 0,
            weeklyWorkouts: 0,
            consistencyScore: 0,
            recentStreak: 0
          })
        }
      } catch (err) {
        const error = err as { message?: string }
        console.error('Error fetching dashboard data:', error)
        setError(error.message || 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <AppHeader />
        <div className="relative mx-auto max-w-6xl px-6 pt-6">
          <div className="animate-pulse space-y-8">
            {/* Hero skeleton */}
            <div className="h-32 bg-white/70 rounded-3xl shadow-sm"></div>

            {/* Motivational banner skeleton */}
            <div className="h-24 bg-white/70 rounded-2xl shadow-sm"></div>

            {/* Quick actions skeleton */}
            <div>
              <div className="h-6 bg-white/70 rounded-lg w-32 mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-48 bg-white/70 rounded-xl shadow-sm"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <AppHeader />
        <div className="relative mx-auto max-w-6xl px-6 pt-6">
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 border border-red-100/50 shadow-lg text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Dashboard</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-slate-200/20 to-blue-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-blue-200/20 to-slate-200/20 rounded-full blur-3xl" />
      </div>

      <AppHeader />

      {/* Hero Section */}
      <section className="relative mx-auto max-w-6xl px-6 pt-6">
        <Stagger delay={50}>
          <div className="rounded-3xl border border-slate-200/50 bg-white/80 backdrop-blur-sm p-6 md:p-8 relative overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-tr from-slate-300/30 to-blue-300/30 opacity-60 blur-3xl" />
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
                  Welcome back, {firstName}.
                </h1>
                <p className="mt-2 text-gray-600 max-w-2xl">
                  {dashboardStats?.totalWorkouts === 0
                    ? "Ready to start your fitness journey? Generate your first AI-powered workout below."
                    : "Keep up the momentum! Your personalized workouts are getting smarter with every session."
                  }
                </p>
              </div>

            </div>
          </div>
        </Stagger>
      </section>

      {/* Motivational Banner */}
      {dashboardStats && dashboardStats.totalWorkouts > 0 && (
        <section className="relative mx-auto max-w-6xl px-6 mt-8">
          <MotivationalBanner
            totalWorkouts={dashboardStats.totalWorkouts}
            weeklyWorkouts={dashboardStats.weeklyWorkouts}
            streak={dashboardStats.recentStreak}
            consistencyScore={dashboardStats.consistencyScore}
          />
        </section>
      )}

      {/* Quick Actions */}
      <section className="relative mx-auto max-w-6xl px-6 mt-8">
        <Stagger delay={200}>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Quick Actions</h2>
            <p className="text-gray-600">Everything you need to stay on track</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DashboardCard
              title="Generate Workout"
              description="AI-tailored plans from goals, experience, equipment & injuries."
              icon={<Zap className="h-5 w-5" />}
              action={
                <Button size="sm" onClick={() => nav('/generate')}>
                  Start Now
                </Button>
              }
              interactive
              ripple
              onClick={() => nav('/generate')}
            />

            <DashboardCard
              title="Workout History"
              description="Auto-saved sessions to review, repeat, and track progress."
              icon={<History className="h-5 w-5" />}
              action={
                <Button size="sm" variant="secondary" onClick={() => nav('/history')}>
                  View History
                </Button>
              }
              interactive
              ripple
              onClick={() => nav('/history')}
            />
          </div>
        </Stagger>
      </section>

      {/* Profile Settings - Compact */}
      <section className="relative mx-auto max-w-6xl px-6 mt-8">
        <Stagger delay={250}>
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <UserIcon className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="font-medium text-slate-900">Profile Settings</h3>
                  <p className="text-sm text-slate-600">Update goals, equipment, or injuries</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => nav('/profile')}>
                Edit Profile
              </Button>
            </div>
          </div>
        </Stagger>
      </section>

      {/* Subscription Status */}
      <section className="relative mx-auto max-w-6xl px-6 mt-6 mb-12">
        <Stagger delay={300}>
          <SubscriptionStatusCard />
        </Stagger>
      </section>

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  )
}