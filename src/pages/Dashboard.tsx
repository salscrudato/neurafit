// src/pages/Dashboard.tsx
import { useMemo, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../lib/firebase'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { convertToDate } from '../utils/timestamp'
import { logger } from '../lib/logger'
import {
  Zap,
  History,
  User as UserIcon,
  Activity
} from 'lucide-react'
import AppHeader from '../components/AppHeader'
import { Button } from '../design-system/components/Button'
import { Card } from '../design-system/components/Card'
import { MotivationalBanner } from '../components/MotivationalBanner'
import { SubscriptionManager } from '../components/SubscriptionManager'
import { DeferredRender } from '../components/DeferredRender'
import { usePrefetchOnIdle } from '../hooks/usePrefetch'

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

// Memoized stats calculation function
const calculateDashboardStats = (workouts: WorkoutItem[]): DashboardStats => {
  if (workouts.length === 0) {
    return {
      totalWorkouts: 0,
      weeklyWorkouts: 0,
      consistencyScore: 0,
      recentStreak: 0,
    }
  }

  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)

  // Calculate consistency over last 30 days (percentage of active days)
  const recentWorkouts = workouts.filter(w => convertToDate(w.timestamp) >= thirtyDaysAgo)
  const activeDays = new Set(recentWorkouts.map(w => convertToDate(w.timestamp).toDateString())).size
  const consistencyScore = Math.round((activeDays / 30) * 100)

  // Calculate weekly workouts (count in last 7 days)
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

  return {
    totalWorkouts: workouts.length,
    weeklyWorkouts,
    consistencyScore,
    recentStreak: streak,
  }
}

export default function Dashboard() {
  const nav = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [workouts, setWorkouts] = useState<WorkoutItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Prefetch likely next routes on idle
  usePrefetchOnIdle(['/generate', '/history', '/profile'], 3000)

  // Get current user
  useEffect(() => {
    setUser(auth.currentUser)
  }, [])

  // Memoize first name extraction
  const firstName = useMemo(() => {
    const n = user?.displayName || user?.email || user?.phoneNumber || 'Athlete'
    return String(n).split(' ')[0]
  }, [user])

  // Memoize dashboard stats calculation
  const dashboardStats = useMemo(() => {
    return calculateDashboardStats(workouts)
  }, [workouts])

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
        const fetchedWorkouts = workoutsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as WorkoutItem[]

        setWorkouts(fetchedWorkouts)
        logger.debug('Dashboard data loaded', { workoutCount: fetchedWorkouts.length })
      } catch (err) {
        const error = err as { message?: string }
        logger.error('Error fetching dashboard data', err as Error)
        setError(error.message || 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50/80 via-white to-blue-50/20 relative">
        {/* Enhanced background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-100/30 via-indigo-100/20 to-purple-100/10 rounded-full blur-3xl animate-pulse-subtle" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-slate-100/25 via-gray-100/15 to-blue-100/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-blue-50/20 via-transparent to-transparent rounded-full blur-2xl" />
        </div>

        <AppHeader />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-6 sm:pt-8">
          <div className="animate-pulse space-y-10 sm:space-y-12">
            {/* Enhanced hero skeleton */}
            <div className="h-48 sm:h-52 bg-gradient-to-br from-white/95 via-white/90 to-white/85 rounded-3xl shadow-2xl shadow-slate-200/50 backdrop-blur-xl border border-white/70">
              <div className="p-6 sm:p-8 md:p-12 space-y-6">
                <div className="h-8 sm:h-10 bg-gradient-to-r from-slate-200/60 to-slate-300/40 rounded-2xl w-3/4"></div>
                <div className="h-6 bg-gradient-to-r from-slate-200/40 to-slate-300/30 rounded-xl w-full max-w-2xl"></div>
              </div>
            </div>

            {/* Enhanced motivational banner skeleton */}
            <div className="h-32 sm:h-36 bg-gradient-to-br from-white/95 via-white/90 to-white/85 rounded-3xl shadow-2xl shadow-slate-200/50 backdrop-blur-xl border border-white/70">
              <div className="p-6 sm:p-8 flex items-center gap-6">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-200/60 to-slate-300/40 rounded-2xl"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-6 bg-gradient-to-r from-slate-200/60 to-slate-300/40 rounded-xl w-48"></div>
                  <div className="h-4 bg-gradient-to-r from-slate-200/40 to-slate-300/30 rounded-lg w-64"></div>
                </div>
              </div>
            </div>

            {/* Enhanced quick actions skeleton */}
            <div className="space-y-8 sm:space-y-10">
              <div className="space-y-4 text-center sm:text-left">
                <div className="h-8 sm:h-10 bg-gradient-to-r from-slate-200/60 to-slate-300/40 rounded-2xl w-56 mx-auto sm:mx-0"></div>
                <div className="h-6 bg-gradient-to-r from-slate-200/40 to-slate-300/30 rounded-xl w-80 mx-auto sm:mx-0"></div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-40 sm:h-44 bg-gradient-to-br from-white/95 via-white/90 to-white/85 rounded-3xl shadow-2xl shadow-slate-200/50 backdrop-blur-xl border border-white/70"></div>
                ))}
              </div>
            </div>

            {/* Enhanced profile settings skeleton */}
            <div className="h-24 sm:h-28 bg-gradient-to-br from-white/95 via-white/90 to-white/85 rounded-3xl shadow-2xl shadow-slate-200/50 backdrop-blur-xl border border-white/70"></div>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50/80 via-white to-blue-50/20 relative">
      {/* Enhanced background decoration with more subtle gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-100/30 via-indigo-100/20 to-purple-100/10 rounded-full blur-3xl animate-pulse-subtle" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-slate-100/25 via-gray-100/15 to-blue-100/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-blue-50/20 via-transparent to-transparent rounded-full blur-2xl" />
      </div>

      <AppHeader />

      {/* Hero Section with enhanced visual hierarchy */}
      <section className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-6 sm:pt-8">
        <div className="group relative rounded-3xl border border-white/70 bg-gradient-to-br from-white/98 via-white/95 to-white/90 backdrop-blur-xl p-6 sm:p-8 md:p-12 overflow-hidden shadow-2xl shadow-slate-200/50 hover:shadow-3xl hover:shadow-slate-300/30 transition-all duration-700 hover:scale-[1.005]">
          {/* Enhanced background elements with better positioning */}
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-tr from-blue-400/15 via-indigo-400/10 to-purple-400/5 opacity-60 blur-3xl group-hover:opacity-80 group-hover:scale-110 transition-all duration-700" />
          <div className="absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-gradient-to-tr from-slate-400/10 via-gray-400/5 to-blue-400/5 opacity-40 blur-2xl group-hover:opacity-60 transition-all duration-700" />

          {/* Subtle inner glow */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/40 via-transparent to-white/20 pointer-events-none" />

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex-1 space-y-6">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent leading-[1.1] sm:leading-tight">
                Welcome back, {firstName}.
              </h1>
              <p className="text-slate-600/90 max-w-2xl text-base sm:text-lg lg:text-xl leading-relaxed font-medium">
                {dashboardStats?.totalWorkouts === 0
                  ? "Ready to start your fitness journey? Generate your first AI-powered workout below."
                  : "Keep up the momentum! Your personalized workouts are getting smarter with every session."
                }
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Motivational Banner with improved spacing - Deferred rendering */}
      {dashboardStats && dashboardStats.totalWorkouts > 0 && (
        <section className="relative mx-auto max-w-6xl px-4 sm:px-6 mt-8 sm:mt-10">
          <DeferredRender
            minHeight="144px"
            placeholder={
              <div className="h-36 bg-gradient-to-br from-white/95 via-white/90 to-white/85 rounded-3xl shadow-2xl shadow-slate-200/50 backdrop-blur-xl border border-white/70 animate-pulse" />
            }
          >
            <MotivationalBanner
              totalWorkouts={dashboardStats.totalWorkouts}
              weeklyWorkouts={dashboardStats.weeklyWorkouts}
              streak={dashboardStats.recentStreak}
              consistencyScore={dashboardStats.consistencyScore}
            />
          </DeferredRender>
        </section>
      )}

      {/* Quick Actions with enhanced typography and spacing */}
      <section className="relative mx-auto max-w-6xl px-4 sm:px-6 mt-12 sm:mt-16">
        <div className="mb-10 sm:mb-12 text-center sm:text-left">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent mb-4 tracking-tight leading-tight">
            Quick Actions
          </h2>
          <p className="text-slate-600/80 text-lg sm:text-xl font-medium leading-relaxed max-w-2xl">
            Everything you need to stay on track
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
          <div
            className="group relative cursor-pointer"
            onClick={() => nav('/generate')}
          >
            {/* Enhanced glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-purple-500/5 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100" />
            <Card
              variant="elevated"
              rounded="3xl"
              className="relative p-6 sm:p-8 lg:p-10 border border-white/70 bg-gradient-to-br from-white/98 via-white/95 to-white/90 backdrop-blur-xl shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-blue-200/30 transition-all duration-700 group-hover:scale-[1.02] group-hover:border-blue-200/60 group-hover:-translate-y-1"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                <div className="flex items-start space-x-5 flex-1">
                  <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/30 group-hover:shadow-blue-500/50 group-hover:scale-110 transition-all duration-500">
                    <Zap className="h-8 w-8" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-blue-900 transition-colors duration-300 leading-tight">
                      Generate Workout
                    </h3>
                    <p className="text-slate-600/90 leading-relaxed text-base sm:text-lg font-medium">
                      AI-tailored plans from goals, experience, equipment & injuries.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="ml-0 sm:ml-4 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105 self-start sm:self-center"
                  onClick={() => nav('/generate')}
                >
                  Start Now
                </Button>
              </div>
            </Card>
          </div>

          <div
            className="group relative cursor-pointer"
            onClick={() => nav('/history')}
          >
            {/* Enhanced glow effect for history card */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-500/15 via-gray-500/10 to-slate-400/5 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100" />
            <Card
              variant="elevated"
              rounded="3xl"
              className="relative p-6 sm:p-8 lg:p-10 border border-white/70 bg-gradient-to-br from-white/98 via-white/95 to-white/90 backdrop-blur-xl shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-700 group-hover:scale-[1.02] group-hover:border-slate-200/60 group-hover:-translate-y-1"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                <div className="flex items-start space-x-5 flex-1">
                  <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-500 via-slate-600 to-gray-600 flex items-center justify-center text-white shadow-xl shadow-slate-500/30 group-hover:shadow-slate-500/50 group-hover:scale-110 transition-all duration-500">
                    <History className="h-8 w-8" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-slate-700 transition-colors duration-300 leading-tight">
                      Workout History
                    </h3>
                    <p className="text-slate-600/90 leading-relaxed text-base sm:text-lg font-medium">
                      Auto-saved sessions to review, repeat, and track progress.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="ml-0 sm:ml-4 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105 self-start sm:self-center"
                  onClick={() => nav('/history')}
                >
                  View History
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Profile Settings - Enhanced compact design */}
      <section className="relative mx-auto max-w-6xl px-4 sm:px-6 mt-12 sm:mt-16">
        <div className="group relative cursor-pointer" onClick={() => nav('/profile')}>
          <div className="absolute inset-0 bg-gradient-to-r from-slate-400/10 via-gray-400/5 to-slate-300/5 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100" />
          <div className="relative bg-gradient-to-br from-white/95 via-white/90 to-white/85 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-white/70 shadow-xl shadow-slate-200/30 hover:shadow-2xl hover:shadow-slate-200/40 transition-all duration-700 group-hover:scale-[1.01] group-hover:-translate-y-0.5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-500 via-slate-600 to-gray-600 flex items-center justify-center shadow-xl shadow-slate-500/25 group-hover:shadow-slate-500/40 group-hover:scale-110 transition-all duration-500">
                  <UserIcon className="h-7 w-7 text-white" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-slate-700 transition-colors duration-300">Profile Settings</h3>
                  <p className="text-slate-600/90 text-sm sm:text-base font-medium">Update goals, equipment, or injuries</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105 self-start sm:self-center"
                onClick={() => nav('/profile')}
              >
                Edit Profile
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription Status with improved spacing */}
      <section className="relative mx-auto max-w-6xl px-4 sm:px-6 mt-8 sm:mt-10 mb-16 sm:mb-20">
        <SubscriptionManager mode="status" />
      </section>

      {error && (
        <div className="fixed bottom-6 right-6 bg-gradient-to-r from-red-50 to-red-100/90 border border-red-200/60 text-red-800 px-6 py-4 rounded-2xl shadow-2xl shadow-red-200/40 backdrop-blur-xl max-w-sm animate-in slide-in-from-right-5 fade-in duration-500">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-red-500 flex-shrink-0 mt-0.5">
              <div className="w-full h-full rounded-full bg-red-400 animate-ping opacity-75"></div>
            </div>
            <p className="text-sm font-medium leading-relaxed">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}