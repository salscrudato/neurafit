// src/pages/Dashboard.tsx
import { useMemo, useEffect, useState, useCallback, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, db } from '../lib/firebase'
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore'
import { convertToDate } from '../utils/timestamp'
import { logger } from '../lib/logger'
import {
  Zap,
  History,
  User as UserIcon,
  Activity
} from 'lucide-react'
import AppHeader from '../components/AppHeader'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { MotivationalBanner } from '../components/MotivationalBanner'
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

// Extract stats calculation outside component - only created once
function calculateDashboardStats(workouts: WorkoutItem[]): DashboardStats {
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

// Constants
const WORKOUTS_PER_PAGE = 20 // Optimal for performance and UX

export default function Dashboard() {
  const nav = useNavigate()
  const [workouts, setWorkouts] = useState<WorkoutItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Prefetch likely next routes on idle
  usePrefetchOnIdle(['/generate', '/history', '/profile'], 3000)

  // Memoized navigation handlers
  const handleGenerateClick = useCallback(() => nav('/generate'), [nav])
  const handleHistoryClick = useCallback(() => nav('/history'), [nav])
  const handleProfileClick = useCallback(() => nav('/profile'), [nav])

  // Calculate dashboard stats (memoized because calculation is expensive with array operations)
  const dashboardStats = useMemo(() => {
    return calculateDashboardStats(workouts)
  }, [workouts])

  // Fetch dashboard data with pagination
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const uid = auth.currentUser?.uid
        if (!uid) {
          setError('Not authenticated')
          return
        }

        // Fetch workouts with pagination (fetch one extra to check if there are more)
        const workoutsRef = collection(db, 'users', uid, 'workouts')
        const workoutsQuery = query(
          workoutsRef,
          orderBy('timestamp', 'desc'),
          limit(WORKOUTS_PER_PAGE + 1)
        )
        const workoutsSnap = await getDocs(workoutsQuery)

        // Map and validate Firestore data with runtime type checking
        const fetchedWorkouts = workoutsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }) as Partial<WorkoutItem> & { id: string })
          .filter((item): item is WorkoutItem => {
            // Runtime validation to ensure data integrity
            return (
              typeof item.workoutType === 'string' &&
              typeof item.duration === 'number' &&
              item.timestamp !== undefined
            )
          })

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
      <div className="min-h-screen bg-white relative">
        {/* Premium Background with Mesh Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(16,185,129,0.08),transparent_50%)]" />

        {/* Animated Mesh Grid */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)',
            backgroundSize: '64px 64px'
          }} />
        </div>

        {/* Floating Orbs */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full blur-3xl animate-float will-change-transform" style={{'--float-intensity': '-20px'} as unknown as CSSProperties} />
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-gradient-to-br from-emerald-400/15 to-teal-500/15 rounded-full blur-3xl animate-float will-change-transform" style={{'--float-intensity': '-30px', animationDelay: '2s'} as unknown as CSSProperties} />

        <AppHeader />
        <div className="relative mx-auto max-w-6xl px-3 xs:px-4 sm:px-6 pt-3 xs:pt-4 sm:pt-5">
          <div className="animate-pulse space-y-4 xs:space-y-5 sm:space-y-6">
            {/* Hero skeleton - Premium */}
            <div className="h-28 xs:h-32 sm:h-36 bg-white/70 backdrop-blur-xl rounded-lg xs:rounded-2xl sm:rounded-[24px] shadow-xl shadow-gray-200/50 border border-gray-200/60">
              <div className="p-4 xs:p-6 sm:p-7 space-y-3 xs:space-y-4">
                <div className="h-7 xs:h-8 sm:h-9 bg-gradient-to-r from-slate-200/70 to-slate-300/50 rounded-lg xs:rounded-xl w-2/3 shadow-sm"></div>
                <div className="h-4 xs:h-5 bg-gradient-to-r from-slate-200/50 to-slate-300/40 rounded-lg w-full max-w-md"></div>
              </div>
            </div>

            {/* Motivational banner skeleton - Premium */}
            <div className="h-24 xs:h-28 sm:h-32 bg-white/70 backdrop-blur-xl rounded-lg xs:rounded-2xl sm:rounded-[24px] shadow-xl shadow-gray-200/50 border border-gray-200/60">
              <div className="p-4 xs:p-6 sm:p-7 flex items-center gap-3 xs:gap-5">
                <div className="w-14 h-14 xs:w-16 xs:h-16 sm:w-18 sm:h-18 bg-gradient-to-br from-slate-200/70 to-slate-300/50 rounded-lg xs:rounded-[20px] shadow-md flex-shrink-0"></div>
                <div className="flex-1 space-y-2 xs:space-y-3">
                  <div className="h-5 xs:h-6 bg-gradient-to-r from-slate-200/70 to-slate-300/50 rounded-lg w-44"></div>
                  <div className="h-3 xs:h-4 bg-gradient-to-r from-slate-200/50 to-slate-300/40 rounded-md w-60"></div>
                </div>
              </div>
            </div>

            {/* Quick actions skeleton - Premium */}
            <div className="space-y-3 xs:space-y-4 sm:space-y-5">
              <div className="h-6 xs:h-7 sm:h-8 bg-gradient-to-r from-slate-200/70 to-slate-300/50 rounded-lg xs:rounded-xl w-40 shadow-sm"></div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 xs:gap-4 sm:gap-5">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-24 xs:h-[100px] sm:h-[108px] bg-white/70 backdrop-blur-xl rounded-lg xs:rounded-2xl sm:rounded-[24px] shadow-xl shadow-gray-200/50 border border-gray-200/60">
                    <div className="p-4 xs:p-6 sm:p-7 flex items-center gap-3 xs:gap-5">
                      <div className="w-14 h-14 xs:w-16 xs:h-16 sm:w-18 sm:h-18 bg-gradient-to-br from-slate-200/70 to-slate-300/50 rounded-lg xs:rounded-[20px] shadow-md flex-shrink-0"></div>
                      <div className="flex-1 space-y-2 xs:space-y-3">
                        <div className="h-5 xs:h-6 bg-gradient-to-r from-slate-200/70 to-slate-300/50 rounded-lg w-40"></div>
                        <div className="h-3 xs:h-4 bg-gradient-to-r from-slate-200/50 to-slate-300/40 rounded-md w-44"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Profile settings skeleton - Premium */}
            <div className="h-24 xs:h-[100px] sm:h-[108px] bg-white/70 backdrop-blur-xl rounded-lg xs:rounded-2xl sm:rounded-[24px] shadow-xl shadow-gray-200/50 border border-gray-200/60">
              <div className="p-4 xs:p-6 sm:p-7 flex items-center gap-3 xs:gap-5">
                <div className="w-14 h-14 xs:w-16 xs:h-16 sm:w-18 sm:h-18 bg-gradient-to-br from-slate-200/70 to-slate-300/50 rounded-lg xs:rounded-[20px] shadow-md flex-shrink-0"></div>
                <div className="flex-1 space-y-2 xs:space-y-3">
                  <div className="h-5 xs:h-6 bg-gradient-to-r from-slate-200/70 to-slate-300/50 rounded-lg w-44"></div>
                  <div className="h-3 xs:h-4 bg-gradient-to-r from-slate-200/50 to-slate-300/40 rounded-md w-52"></div>
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
      <div className="min-h-screen bg-white relative">
        {/* Premium Background with Error Tint */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-red-50/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(239,68,68,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(251,146,60,0.08),transparent_50%)]" />

        <AppHeader />
        <div className="relative mx-auto max-w-2xl px-3 xs:px-4 sm:px-6 pt-12 xs:pt-16 sm:pt-20">
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl xs:rounded-3xl sm:rounded-[32px] p-6 xs:p-10 sm:p-14 border border-gray-200/60 shadow-2xl shadow-red-200/30 text-center">
            {/* Error icon with premium styling */}
            <div className="relative inline-flex items-center justify-center mb-6 xs:mb-8">
              <div className="w-20 xs:w-24 h-20 xs:h-24 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg xs:rounded-2xl sm:rounded-[24px] flex items-center justify-center shadow-xl shadow-red-500/30 flex-shrink-0">
                <Activity className="h-10 xs:h-12 w-10 xs:w-12 text-white" strokeWidth={2} />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg xs:rounded-2xl sm:rounded-[24px] blur-xl opacity-30" />
            </div>

            {/* Error message with premium typography */}
            <h2 className="text-2xl xs:text-3xl sm:text-4xl font-bold text-gray-900 mb-3 xs:mb-4 tracking-tight">Unable to Load Dashboard</h2>
            <p className="text-gray-600 text-sm xs:text-base sm:text-lg mb-8 xs:mb-10 leading-relaxed max-w-md mx-auto font-normal">{error}</p>

            {/* Premium button */}
            <Button
              onClick={() => window.location.reload()}
              className="shadow-xl hover:shadow-2xl transition-all duration-500"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white relative">
      {/* Premium Background with Mesh Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.12),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(16,185,129,0.08),transparent_50%)]" />

      {/* Animated Mesh Grid */}
      <div className="absolute inset-0 opacity-[0.015]">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)',
          backgroundSize: '64px 64px'
        }} />
      </div>

      {/* Floating Orbs - More Subtle and Elegant */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full blur-3xl animate-float will-change-transform" style={{'--float-intensity': '-20px'} as unknown as CSSProperties} />
      <div className="absolute top-1/3 -right-20 w-80 h-80 bg-gradient-to-br from-emerald-400/15 to-teal-500/15 rounded-full blur-3xl animate-float will-change-transform" style={{'--float-intensity': '-30px', animationDelay: '2s'} as unknown as CSSProperties} />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-purple-400/10 to-pink-500/10 rounded-full blur-3xl animate-float will-change-transform" style={{'--float-intensity': '-15px', animationDelay: '4s'} as unknown as CSSProperties} />

      <AppHeader />

      {/* Hero Section - Premium Design */}
      <section className="relative mx-auto max-w-6xl px-3 xs:px-4 sm:px-6 pt-3 xs:pt-4 sm:pt-5 animate-slide-in-up">
        <div className="group relative rounded-lg xs:rounded-2xl sm:rounded-[24px] border border-gray-200/60 bg-white/70 backdrop-blur-xl p-4 xs:p-6 sm:p-7 overflow-hidden shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:shadow-gray-300/30 transition-all duration-700 ease-out">
          {/* Animated gradient overlays */}
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gradient-to-tr from-blue-400/20 via-indigo-400/15 to-purple-400/10 opacity-50 blur-3xl group-hover:opacity-70 transition-opacity duration-700" aria-hidden="true" />
          <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-gradient-to-br from-emerald-300/15 via-teal-300/10 to-transparent opacity-40 blur-3xl group-hover:opacity-60 transition-opacity duration-700" aria-hidden="true" />

          {/* Subtle shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" aria-hidden="true" />

          <div className="relative">
            <div className="flex items-start justify-between gap-3 xs:gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl xs:text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 leading-tight mb-1.5 xs:mb-2 drop-shadow-sm">
                  Welcome Back
                </h1>
                <p className="text-gray-600 text-sm xs:text-base sm:text-lg leading-relaxed font-normal max-w-2xl">
                  {dashboardStats?.totalWorkouts === 0
                    ? "Ready to start your fitness journey?"
                    : "Keep up the momentum!"
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Motivational Banner - Premium */}
      {dashboardStats && dashboardStats.totalWorkouts > 0 && (
        <section className="relative mx-auto max-w-6xl px-3 xs:px-4 sm:px-6 mt-4 xs:mt-5 sm:mt-6 animate-slide-in-up" style={{ animationDelay: '0.1s' }}>
          <DeferredRender
            minHeight="120px"
            placeholder={
              <div className="h-24 xs:h-28 bg-white/70 backdrop-blur-xl rounded-lg xs:rounded-2xl sm:rounded-[24px] shadow-xl shadow-gray-200/50 border border-gray-200/60 animate-pulse" />
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

      {/* Quick Actions - Premium Design */}
      <section className="relative mx-auto max-w-6xl px-3 xs:px-4 sm:px-6 mt-5 xs:mt-6 sm:mt-8 animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
        <h2 className="text-lg xs:text-xl sm:text-2xl font-bold text-gray-900 mb-3 xs:mb-4 sm:mb-5 tracking-tight">
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 xs:gap-4 sm:gap-5">
          <div
            className="group relative cursor-pointer touch-manipulation"
            onClick={handleGenerateClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerateClick()}
          >
            <Card
              variant="elevated"
              rounded="2xl"
              className="relative p-5 xs:p-6 sm:p-8 border border-gray-200/60 bg-white/70 backdrop-blur-xl shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:shadow-blue-200/30 transition-all duration-700 active:scale-[0.99] overflow-hidden group-hover:-translate-y-1 focus-visible-enhanced min-h-[100px] xs:min-h-[110px] sm:min-h-[120px]"
            >
              {/* Animated gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" aria-hidden="true" />

              <div className="relative flex items-center gap-4 xs:gap-5 sm:gap-6">
                <div className="relative flex-shrink-0">
                  <div className="w-14 xs:w-16 sm:w-20 h-14 xs:h-16 sm:h-20 rounded-xl xs:rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/40 group-hover:shadow-2xl group-hover:shadow-blue-500/50 transition-all duration-700 group-hover:scale-110 group-hover:rotate-6">
                    <Zap className="h-7 xs:h-8 sm:h-10 w-7 xs:w-8 sm:w-10 drop-shadow-sm" strokeWidth={2} />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl xs:rounded-2xl sm:rounded-3xl blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-700" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg xs:text-xl sm:text-2xl font-bold text-gray-900 leading-tight tracking-tight">
                    Generate Workout
                  </h3>
                  <p className="text-gray-600 text-sm xs:text-base leading-snug font-normal mt-1">
                    AI-tailored plans for your goals
                  </p>
                </div>
                <Button
                  size="sm"
                  className="haptic-feedback flex-shrink-0 shadow-lg hover:shadow-xl transition-all duration-500 min-h-[44px] xs:min-h-[48px]"
                  onClick={handleGenerateClick}
                >
                  Start
                </Button>
              </div>
            </Card>
          </div>

          <div
            className="group relative cursor-pointer touch-manipulation"
            onClick={handleHistoryClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleHistoryClick()}
          >
            <Card
              variant="elevated"
              rounded="2xl"
              className="relative p-5 xs:p-6 sm:p-8 border border-gray-200/60 bg-white/70 backdrop-blur-xl shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:shadow-gray-300/30 transition-all duration-700 active:scale-[0.99] overflow-hidden group-hover:-translate-y-1 focus-visible-enhanced min-h-[100px] xs:min-h-[110px] sm:min-h-[120px]"
            >
              {/* Animated gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 via-gray-500/5 to-slate-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" aria-hidden="true" />

              <div className="relative flex items-center gap-4 xs:gap-5 sm:gap-6">
                <div className="relative flex-shrink-0">
                  <div className="w-14 xs:w-16 sm:w-20 h-14 xs:h-16 sm:h-20 rounded-xl xs:rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-500 via-slate-600 to-gray-600 flex items-center justify-center text-white shadow-xl shadow-slate-500/40 group-hover:shadow-2xl group-hover:shadow-slate-500/50 transition-all duration-700 group-hover:scale-110 group-hover:rotate-6">
                    <History className="h-7 xs:h-8 sm:h-10 w-7 xs:w-8 sm:w-10 drop-shadow-sm" strokeWidth={2} />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-500 to-gray-600 rounded-xl xs:rounded-2xl sm:rounded-3xl blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-700" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg xs:text-xl sm:text-2xl font-bold text-gray-900 leading-tight tracking-tight">
                    Workout History
                  </h3>
                  <p className="text-gray-600 text-sm xs:text-base leading-snug font-normal mt-1">
                    Review and track progress
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="haptic-feedback flex-shrink-0 shadow-lg hover:shadow-xl transition-all duration-500 min-h-[44px] xs:min-h-[48px]"
                  onClick={handleHistoryClick}
                >
                  View
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Profile Settings - Premium Design */}
      <section className="relative mx-auto max-w-6xl px-3 xs:px-4 sm:px-6 mt-5 xs:mt-6 sm:mt-8 mb-4 xs:mb-5 sm:mb-6 pb-6 xs:pb-8 sm:pb-10 animate-slide-in-up" style={{ animationDelay: '0.3s' }}>
        <div className="group relative cursor-pointer touch-manipulation" onClick={handleProfileClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && handleProfileClick()}>
          <div className="relative bg-white/70 backdrop-blur-xl rounded-lg xs:rounded-2xl sm:rounded-[24px] p-5 xs:p-6 sm:p-8 border border-gray-200/60 shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:shadow-gray-300/30 transition-all duration-700 active:scale-[0.99] overflow-hidden hover:-translate-y-1 focus-visible-enhanced min-h-[100px] xs:min-h-[110px] sm:min-h-[120px]">
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-500/10 via-gray-500/5 to-slate-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" aria-hidden="true" />

            <div className="relative flex items-center gap-4 xs:gap-5 sm:gap-6">
              <div className="relative flex-shrink-0">
                <div className="w-14 xs:w-16 sm:w-20 h-14 xs:h-16 sm:h-20 rounded-xl xs:rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-500 via-slate-600 to-gray-600 flex items-center justify-center shadow-xl shadow-slate-500/40 group-hover:shadow-2xl group-hover:shadow-slate-500/50 transition-all duration-700 group-hover:scale-110 group-hover:rotate-6">
                  <UserIcon className="h-7 xs:h-8 sm:h-10 w-7 xs:w-8 sm:w-10 text-white drop-shadow-sm" strokeWidth={2} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-slate-500 to-gray-600 rounded-xl xs:rounded-2xl sm:rounded-3xl blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-700" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg xs:text-xl sm:text-2xl font-bold text-gray-900 leading-tight tracking-tight">Profile Settings</h3>
                <p className="text-gray-600 text-sm xs:text-base leading-snug font-normal mt-1">Update goals & equipment</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="haptic-feedback flex-shrink-0 shadow-lg hover:shadow-xl transition-all duration-500 min-h-[44px] xs:min-h-[48px]"
                onClick={handleProfileClick}
              >
                Edit
              </Button>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div
          className="fixed bottom-4 xs:bottom-6 sm:bottom-8 left-3 xs:left-4 sm:left-auto right-3 xs:right-4 sm:right-4 bg-gradient-to-r from-red-50 to-red-100/95 border border-red-200/70 text-red-800 px-4 xs:px-6 py-4 xs:py-5 rounded-lg xs:rounded-2xl shadow-2xl shadow-red-200/50 backdrop-blur-xl max-w-sm animate-in slide-in-from-right-5 fade-in duration-500 ring-1 ring-red-300/30"
          style={{
            right: 'max(0.75rem, env(safe-area-inset-right))',
            bottom: 'max(1rem, env(safe-area-inset-bottom))',
            maxWidth: 'calc(100vw - 1.5rem)',
          }}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start gap-3 xs:gap-4">
            <div className="w-5 xs:w-6 h-5 xs:h-6 rounded-full bg-red-500 flex-shrink-0 mt-0.5 shadow-lg shadow-red-500/40">
              <div className="w-full h-full rounded-full bg-red-400 animate-pulse opacity-75"></div>
            </div>
            <p className="text-xs xs:text-sm font-semibold leading-relaxed">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}