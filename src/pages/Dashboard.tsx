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
      <div className="min-h-screen bg-gradient-to-br from-slate-50/80 via-white to-blue-50/20 relative">
        {/* Enhanced background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-100/30 via-indigo-100/20 to-purple-100/10 rounded-full blur-3xl animate-pulse-subtle" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-slate-100/25 via-gray-100/15 to-blue-100/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-blue-50/20 via-transparent to-transparent rounded-full blur-2xl" />
        </div>

        <AppHeader />
        <div className="relative mx-auto max-w-6xl px-3 sm:px-4 pt-4 sm:pt-6">
          <div className="animate-pulse space-y-4 sm:space-y-6">
            {/* Compact hero skeleton */}
            <div className="h-32 sm:h-36 bg-tint-blue backdrop-blur-xl rounded-2xl shadow-depth-lg border border-white/70 border-inner">
              <div className="p-4 sm:p-6 space-y-3">
                <div className="h-7 sm:h-8 bg-gradient-to-r from-slate-200/60 to-slate-300/40 rounded-xl w-2/3"></div>
                <div className="h-5 bg-gradient-to-r from-slate-200/40 to-slate-300/30 rounded-lg w-full max-w-xl"></div>
              </div>
            </div>

            {/* Compact motivational banner skeleton */}
            <div className="h-24 sm:h-28 bg-gradient-to-br from-white/95 via-white/90 to-white/85 rounded-2xl shadow-depth-md backdrop-blur-xl border border-white/70 border-inner">
              <div className="p-4 sm:p-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-slate-200/60 to-slate-300/40 rounded-xl"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-gradient-to-r from-slate-200/60 to-slate-300/40 rounded-lg w-40"></div>
                  <div className="h-4 bg-gradient-to-r from-slate-200/40 to-slate-300/30 rounded-md w-48"></div>
                </div>
              </div>
            </div>

            {/* Compact quick actions skeleton */}
            <div className="space-y-4 sm:space-y-5">
              <div className="h-6 sm:h-7 bg-gradient-to-r from-slate-200/60 to-slate-300/40 rounded-xl w-40"></div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-28 sm:h-32 bg-gradient-to-br from-white/95 via-white/90 to-white/85 rounded-2xl shadow-depth-md backdrop-blur-xl border border-white/70 border-inner"></div>
                ))}
              </div>
            </div>

            {/* Compact profile settings skeleton */}
            <div className="h-20 sm:h-24 bg-tint-slate backdrop-blur-xl rounded-2xl shadow-depth-md border border-white/70 border-inner"></div>
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

      {/* Compact Hero Section - Mobile Optimized */}
      <section className="relative mx-auto max-w-6xl px-3 sm:px-4 pt-4 sm:pt-6 animate-stagger-1">
        <div className="group relative rounded-2xl border border-white/70 bg-tint-blue backdrop-blur-xl p-4 sm:p-6 overflow-hidden shadow-depth-lg hover:shadow-depth-lg transition-all duration-300 border-inner">
          {/* Simplified background elements */}
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-tr from-blue-400/15 via-indigo-400/10 to-purple-400/5 opacity-60 blur-2xl" />

          {/* Subtle inner glow */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 via-transparent to-white/20 pointer-events-none" />

          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent leading-tight mb-2">
                  Welcome Back
                </h1>
                <p className="text-slate-600/90 text-sm sm:text-base leading-relaxed font-medium">
                  {dashboardStats?.totalWorkouts === 0
                    ? "Ready to start your fitness journey?"
                    : "Keep up the momentum!"
                  }
                </p>
              </div>
              {hasUnlimitedWorkouts && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-full shadow-md flex-shrink-0">
                  <Crown className="w-4 h-4 text-amber-900" />
                  <span className="text-xs font-bold text-amber-900">Pro</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Compact Motivational Banner */}
      {dashboardStats && dashboardStats.totalWorkouts > 0 && (
        <section className="relative mx-auto max-w-6xl px-3 sm:px-4 mt-4 sm:mt-5 animate-stagger-2">
          <DeferredRender
            minHeight="112px"
            placeholder={
              <div className="h-28 bg-gradient-to-br from-white/95 via-white/90 to-white/85 rounded-2xl shadow-depth-md backdrop-blur-xl border border-white/70 animate-pulse" />
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

      {/* Compact Quick Actions */}
      <section className="relative mx-auto max-w-6xl px-3 sm:px-4 mt-6 sm:mt-8 animate-stagger-3">
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
              className="relative p-4 sm:p-5 border border-white/70 bg-tint-blue backdrop-blur-xl shadow-depth-md hover:shadow-blue-depth transition-all duration-300 active:scale-[0.98] border-inner"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                  <Zap className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1 leading-tight">
                    Generate Workout
                  </h3>
                  <p className="text-slate-600/90 text-xs sm:text-sm leading-snug">
                    AI-tailored plans for your goals
                  </p>
                </div>
                <Button
                  size="sm"
                  className="haptic-feedback flex-shrink-0"
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
              className="relative p-4 sm:p-5 border border-white/70 bg-tint-slate backdrop-blur-xl shadow-depth-md hover:shadow-slate-depth transition-all duration-300 active:scale-[0.98] border-inner"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-slate-500 via-slate-600 to-gray-600 flex items-center justify-center text-white shadow-md">
                  <History className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1 leading-tight">
                    Workout History
                  </h3>
                  <p className="text-slate-600/90 text-xs sm:text-sm leading-snug">
                    Review and track progress
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="haptic-feedback flex-shrink-0"
                  onClick={() => nav('/history')}
                >
                  View
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Compact Profile Settings */}
      <section className="relative mx-auto max-w-6xl px-3 sm:px-4 mt-6 sm:mt-8 animate-stagger-4">
        <div className="group relative cursor-pointer" onClick={() => nav('/profile')}>
          <div className="relative bg-tint-slate backdrop-blur-xl rounded-2xl p-4 sm:p-5 border border-white/70 shadow-depth-md hover:shadow-depth-lg transition-all duration-300 active:scale-[0.98] border-inner">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-slate-500 via-slate-600 to-gray-600 flex items-center justify-center shadow-md flex-shrink-0">
                <UserIcon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1 leading-tight">Profile Settings</h3>
                <p className="text-slate-600/90 text-xs sm:text-sm leading-snug">Update goals & equipment</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="haptic-feedback flex-shrink-0"
                onClick={() => nav('/profile')}
              >
                Edit
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Compact Subscription Status */}
      <section className="relative mx-auto max-w-6xl px-3 sm:px-4 mt-6 sm:mt-8 mb-8 sm:mb-12 animate-stagger-5">
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