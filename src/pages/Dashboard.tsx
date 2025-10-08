// src/pages/Dashboard.tsx
import { useMemo, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../lib/firebase'
import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { convertToDate } from '../utils/timestamp'
import { logger } from '../lib/logger'
import {
  Zap,
  History,
  User as UserIcon,
  Activity,
  Crown
} from 'lucide-react'
import AppHeader from '../components/AppHeader'
import { Button } from '../design-system/components/Button'
import { Card } from '../design-system/components/Card'
import { MotivationalBanner } from '../components/MotivationalBanner'
import { SubscriptionManager } from '../components/SubscriptionManager'
import { DeferredRender } from '../components/DeferredRender'
import { usePrefetchOnIdle } from '../hooks/usePrefetch'
import { useSubscription } from '../hooks/useSubscription'

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
  const [workouts, setWorkouts] = useState<WorkoutItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get subscription status for Pro badge
  const { hasUnlimitedWorkouts } = useSubscription()

  // Prefetch likely next routes on idle
  usePrefetchOnIdle(['/generate', '/history', '/profile'], 3000)

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 relative">
        {/* Enhanced background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-blue-100/40 via-indigo-100/25 to-purple-100/15 rounded-full blur-3xl animate-pulse-subtle" />
          <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-gradient-to-tr from-slate-100/30 via-gray-100/20 to-blue-100/15 rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-gradient-radial from-indigo-50/30 via-transparent to-transparent rounded-full blur-2xl" />
        </div>

        <AppHeader />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-4 sm:pt-5">
          <div className="animate-pulse space-y-4 sm:space-y-5">
            {/* Hero skeleton - Compact */}
            <div className="h-28 sm:h-32 bg-gradient-to-br from-white/95 via-blue-50/30 to-indigo-50/20 backdrop-blur-xl rounded-2xl shadow-lg border border-white/80">
              <div className="p-4 sm:p-5 space-y-3">
                <div className="h-7 sm:h-8 bg-gradient-to-r from-slate-200/70 to-slate-300/50 rounded-xl w-2/3 shadow-sm"></div>
                <div className="h-5 bg-gradient-to-r from-slate-200/50 to-slate-300/40 rounded-lg w-full max-w-xl"></div>
              </div>
            </div>

            {/* Motivational banner skeleton - Compact */}
            <div className="h-24 sm:h-28 bg-gradient-to-br from-white/95 via-white/90 to-white/85 rounded-2xl shadow-lg backdrop-blur-xl border border-white/80">
              <div className="p-4 sm:p-5 flex items-center gap-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-slate-200/70 to-slate-300/50 rounded-xl shadow-md"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-gradient-to-r from-slate-200/70 to-slate-300/50 rounded-lg w-40"></div>
                  <div className="h-4 bg-gradient-to-r from-slate-200/50 to-slate-300/40 rounded-md w-56"></div>
                </div>
              </div>
            </div>

            {/* Quick actions skeleton - Compact */}
            <div className="space-y-3 sm:space-y-4">
              <div className="h-6 sm:h-7 bg-gradient-to-r from-slate-200/70 to-slate-300/50 rounded-xl w-36 shadow-sm"></div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-[88px] sm:h-[96px] bg-gradient-to-br from-white/95 via-white/90 to-white/85 rounded-2xl shadow-lg backdrop-blur-xl border border-white/80">
                    <div className="p-4 sm:p-5 flex items-center gap-4">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-slate-200/70 to-slate-300/50 rounded-xl shadow-md"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-gradient-to-r from-slate-200/70 to-slate-300/50 rounded-lg w-36"></div>
                        <div className="h-4 bg-gradient-to-r from-slate-200/50 to-slate-300/40 rounded-md w-40"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Profile settings skeleton - Compact */}
            <div className="h-[88px] sm:h-[96px] bg-gradient-to-br from-white/95 via-slate-50/30 to-gray-50/20 backdrop-blur-xl rounded-2xl shadow-lg border border-white/80">
              <div className="p-4 sm:p-5 flex items-center gap-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-slate-200/70 to-slate-300/50 rounded-xl shadow-md"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-gradient-to-r from-slate-200/70 to-slate-300/50 rounded-lg w-40"></div>
                  <div className="h-4 bg-gradient-to-r from-slate-200/50 to-slate-300/40 rounded-md w-48"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 relative">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-red-100/30 via-orange-100/20 to-yellow-100/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-gradient-to-tr from-slate-100/30 via-gray-100/20 to-red-100/15 rounded-full blur-3xl" />
        </div>

        <AppHeader />
        <div className="relative mx-auto max-w-2xl px-4 sm:px-6 pt-12 sm:pt-16">
          <div className="bg-gradient-to-br from-white/95 via-red-50/20 to-orange-50/10 backdrop-blur-xl rounded-3xl p-8 sm:p-12 border border-white/80 shadow-2xl text-center">
            {/* Error icon with enhanced styling */}
            <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/20 ring-4 ring-red-50">
              <Activity className="h-10 w-10 text-red-600" />
            </div>

            {/* Error message with better typography */}
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 tracking-tight">Unable to Load Dashboard</h2>
            <p className="text-slate-600 text-base sm:text-lg mb-8 leading-relaxed max-w-md mx-auto">{error}</p>

            {/* Enhanced button */}
            <Button
              onClick={() => window.location.reload()}
              className="shadow-lg hover:shadow-xl"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 relative">
      {/* Enhanced background decoration with refined gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-blue-100/40 via-indigo-100/25 to-purple-100/15 rounded-full blur-3xl animate-pulse-subtle" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-gradient-to-tr from-slate-100/30 via-gray-100/20 to-blue-100/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-gradient-radial from-indigo-50/30 via-transparent to-transparent rounded-full blur-2xl" />
      </div>

      <AppHeader />

      {/* Hero Section - Compact */}
      <section className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-4 sm:pt-5 animate-stagger-1">
        <div className="group relative rounded-2xl border border-white/80 bg-gradient-to-br from-white/95 via-blue-50/30 to-indigo-50/20 backdrop-blur-xl p-4 sm:p-5 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-500 ease-out">
          {/* Enhanced background elements with better depth */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-tr from-blue-400/20 via-indigo-400/15 to-purple-400/10 opacity-70 blur-3xl group-hover:opacity-90 transition-opacity duration-500" />
          <div className="absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-gradient-to-br from-indigo-300/15 via-blue-300/10 to-transparent opacity-60 blur-2xl" />

          {/* Refined inner glow for premium feel */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/50 via-white/20 to-transparent pointer-events-none" />

          {/* Subtle border highlight */}
          <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/60 pointer-events-none" />

          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent leading-tight mb-1.5 drop-shadow-sm">
                  Welcome Back
                </h1>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium max-w-2xl">
                  {dashboardStats?.totalWorkouts === 0
                    ? "Ready to start your fitness journey?"
                    : "Keep up the momentum!"
                  }
                </p>
              </div>
              {hasUnlimitedWorkouts && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-full shadow-lg shadow-amber-500/30 flex-shrink-0 ring-2 ring-amber-300/50 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-300 hover:scale-105">
                  <Crown className="w-4 h-4 text-amber-900 drop-shadow-sm" />
                  <span className="text-xs sm:text-sm font-bold text-amber-900 tracking-wide">Pro</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Motivational Banner - Compact */}
      {dashboardStats && dashboardStats.totalWorkouts > 0 && (
        <section className="relative mx-auto max-w-6xl px-4 sm:px-6 mt-4 sm:mt-5 animate-stagger-2">
          <DeferredRender
            minHeight="100px"
            placeholder={
              <div className="h-24 bg-gradient-to-br from-white/95 via-white/90 to-white/85 rounded-2xl shadow-lg backdrop-blur-xl border border-white/80 animate-pulse" />
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

      {/* Quick Actions - Compact */}
      <section className="relative mx-auto max-w-6xl px-4 sm:px-6 mt-5 sm:mt-6 animate-stagger-3">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 sm:mb-4 tracking-tight">
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <div
            className="group relative cursor-pointer"
            onClick={() => nav('/generate')}
          >
            <Card
              variant="elevated"
              rounded="2xl"
              className="relative p-4 sm:p-5 border border-white/80 bg-gradient-to-br from-white/95 via-blue-50/30 to-indigo-50/20 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-500 active:scale-[0.98] overflow-hidden group-hover:-translate-y-1"
            >
              {/* Subtle background accent */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative flex items-center gap-4 sm:gap-5">
                <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 group-hover:shadow-xl group-hover:shadow-blue-500/40 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                  <Zap className="h-7 w-7 sm:h-8 sm:w-8 drop-shadow-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1 leading-tight tracking-tight">
                    Generate Workout
                  </h3>
                  <p className="text-slate-600 text-sm leading-snug font-medium">
                    AI-tailored plans for your goals
                  </p>
                </div>
                <Button
                  size="sm"
                  className="haptic-feedback flex-shrink-0 shadow-md hover:shadow-lg"
                  onClick={() => nav('/generate')}
                >
                  Start
                </Button>
              </div>
            </Card>
          </div>

          <div
            className="group relative cursor-pointer"
            onClick={() => nav('/history')}
          >
            <Card
              variant="elevated"
              rounded="2xl"
              className="relative p-4 sm:p-5 border border-white/80 bg-gradient-to-br from-white/95 via-slate-50/30 to-gray-50/20 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-500 active:scale-[0.98] overflow-hidden group-hover:-translate-y-1"
            >
              {/* Subtle background accent */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 via-transparent to-gray-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative flex items-center gap-4 sm:gap-5">
                <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-slate-500 via-slate-600 to-gray-600 flex items-center justify-center text-white shadow-lg shadow-slate-500/30 group-hover:shadow-xl group-hover:shadow-slate-500/40 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                  <History className="h-7 w-7 sm:h-8 sm:w-8 drop-shadow-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1 leading-tight tracking-tight">
                    Workout History
                  </h3>
                  <p className="text-slate-600 text-sm leading-snug font-medium">
                    Review and track progress
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="haptic-feedback flex-shrink-0 shadow-md hover:shadow-lg"
                  onClick={() => nav('/history')}
                >
                  View
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Profile Settings - Compact */}
      <section className="relative mx-auto max-w-6xl px-4 sm:px-6 mt-5 sm:mt-6 animate-stagger-4">
        <div className="group relative cursor-pointer" onClick={() => nav('/profile')}>
          <div className="relative bg-gradient-to-br from-white/95 via-slate-50/30 to-gray-50/20 backdrop-blur-xl rounded-2xl p-4 sm:p-5 border border-white/80 shadow-lg hover:shadow-xl transition-all duration-500 active:scale-[0.98] overflow-hidden hover:-translate-y-1">
            {/* Subtle background accent */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 via-transparent to-gray-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Refined inner glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 via-white/10 to-transparent pointer-events-none" />

            <div className="relative flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-slate-500 via-slate-600 to-gray-600 flex items-center justify-center shadow-lg shadow-slate-500/30 flex-shrink-0 group-hover:shadow-xl group-hover:shadow-slate-500/40 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                <UserIcon className="h-7 w-7 sm:h-8 sm:w-8 text-white drop-shadow-sm" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1 leading-tight tracking-tight">Profile Settings</h3>
                <p className="text-slate-600 text-sm leading-snug font-medium">Update goals & equipment</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="haptic-feedback flex-shrink-0 shadow-md hover:shadow-lg"
                onClick={() => nav('/profile')}
              >
                Edit
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription Status - Compact */}
      <section className="relative mx-auto max-w-6xl px-4 sm:px-6 mt-5 sm:mt-6 mb-6 sm:mb-8 animate-stagger-5">
        <SubscriptionManager mode="status" />
      </section>

      {error && (
        <div className="fixed bottom-8 right-8 bg-gradient-to-r from-red-50 to-red-100/95 border border-red-200/70 text-red-800 px-6 py-5 rounded-2xl shadow-2xl shadow-red-200/50 backdrop-blur-xl max-w-sm animate-in slide-in-from-right-5 fade-in duration-500 ring-1 ring-red-300/30">
          <div className="flex items-start gap-4">
            <div className="w-6 h-6 rounded-full bg-red-500 flex-shrink-0 mt-0.5 shadow-lg shadow-red-500/40">
              <div className="w-full h-full rounded-full bg-red-400 animate-ping opacity-75"></div>
            </div>
            <p className="text-sm font-semibold leading-relaxed">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}