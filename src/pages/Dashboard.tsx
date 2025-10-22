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

      {/* Hero Section - Modern Redesign */}
      <section className="relative mx-auto max-w-6xl px-3 xs:px-4 sm:px-6 pt-3 xs:pt-4 sm:pt-5 animate-slide-in-up">
        <div className="relative overflow-hidden rounded-2xl xs:rounded-3xl sm:rounded-[32px]">
          {/* Dynamic gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.2),transparent_60%)]" />
          <div className="absolute -right-32 -top-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />

          {/* Content */}
          <div className="relative p-6 xs:p-8 sm:p-10 md:p-12">
            <div className="flex items-start justify-between gap-4 xs:gap-6">
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl xs:text-4xl sm:text-5xl font-bold tracking-tight text-white leading-tight mb-2 xs:mb-3">
                  Welcome Back
                </h1>
                <p className="text-blue-100 text-base xs:text-lg sm:text-xl leading-relaxed font-medium max-w-2xl">
                  {dashboardStats?.totalWorkouts === 0
                    ? "Ready to start your fitness journey?"
                    : "Keep crushing your goals!"
                  }
                </p>
              </div>
              {/* Decorative icon */}
              <div className="flex-shrink-0 hidden xs:block">
                <div className="w-16 xs:w-20 sm:w-24 h-16 xs:h-20 sm:h-24 rounded-2xl xs:rounded-3xl bg-white/15 backdrop-blur-xl flex items-center justify-center border border-white/20">
                  <Zap className="w-8 xs:w-10 sm:w-12 h-8 xs:h-10 sm:h-12 text-white/80" strokeWidth={1.5} />
                </div>
              </div>
            </div>


          </div>
        </div>
      </section>



      {/* Quick Actions - Modern Grid */}
      <section className="relative mx-auto max-w-6xl px-3 xs:px-4 sm:px-6 mt-6 xs:mt-8 sm:mt-10 animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
        <h2 className="text-xl xs:text-2xl sm:text-3xl font-bold text-gray-900 mb-4 xs:mb-6 sm:mb-8 tracking-tight">
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xs:gap-5 sm:gap-6">
          {/* Generate Workout Card */}
          <div
            className="group relative cursor-pointer touch-manipulation"
            onClick={handleGenerateClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerateClick()}
          >
            <div className="relative h-full rounded-2xl xs:rounded-3xl sm:rounded-[32px] overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 p-6 xs:p-8 sm:p-10 border border-blue-400/30 shadow-xl shadow-blue-500/20 hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-700 active:scale-[0.98] group-hover:-translate-y-1 focus-visible-enhanced">
              {/* Animated background elements */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
              <div className="absolute -right-20 -top-20 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/5 rounded-full blur-2xl" />

              <div className="relative flex flex-col h-full justify-between">
                <div>
                  <div className="w-12 xs:w-14 sm:w-16 h-12 xs:h-14 sm:h-16 rounded-2xl xs:rounded-3xl bg-white/20 backdrop-blur-xl flex items-center justify-center mb-4 xs:mb-6 border border-white/30 group-hover:scale-110 transition-transform duration-500">
                    <Zap className="w-6 xs:w-7 sm:w-8 h-6 xs:h-7 sm:h-8 text-white" strokeWidth={2} />
                  </div>
                  <h3 className="text-xl xs:text-2xl sm:text-3xl font-bold text-white leading-tight mb-2 xs:mb-3">
                    Generate Workout
                  </h3>
                  <p className="text-blue-100 text-sm xs:text-base leading-relaxed font-medium">
                    AI-tailored plans for your goals
                  </p>
                </div>
                <Button
                  size="sm"
                  className="mt-6 xs:mt-8 w-full bg-white text-blue-600 hover:bg-blue-50 shadow-lg hover:shadow-xl transition-all duration-500 font-semibold"
                  onClick={handleGenerateClick}
                >
                  Start Now
                </Button>
              </div>
            </div>
          </div>

          {/* Workout History Card */}
          <div
            className="group relative cursor-pointer touch-manipulation"
            onClick={handleHistoryClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleHistoryClick()}
          >
            <div className="relative h-full rounded-2xl xs:rounded-3xl sm:rounded-[32px] overflow-hidden bg-gradient-to-br from-slate-600 to-slate-700 p-6 xs:p-8 sm:p-10 border border-slate-500/30 shadow-xl shadow-slate-600/20 hover:shadow-2xl hover:shadow-slate-600/30 transition-all duration-700 active:scale-[0.98] group-hover:-translate-y-1 focus-visible-enhanced">
              {/* Animated background elements */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.1),transparent_60%)]" />
              <div className="absolute -right-20 -top-20 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
              <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/[0.02] rounded-full blur-2xl" />

              <div className="relative flex flex-col h-full justify-between">
                <div>
                  <div className="w-12 xs:w-14 sm:w-16 h-12 xs:h-14 sm:h-16 rounded-2xl xs:rounded-3xl bg-white/15 backdrop-blur-xl flex items-center justify-center mb-4 xs:mb-6 border border-white/20 group-hover:scale-110 transition-transform duration-500">
                    <History className="w-6 xs:w-7 sm:w-8 h-6 xs:h-7 sm:h-8 text-white" strokeWidth={2} />
                  </div>
                  <h3 className="text-xl xs:text-2xl sm:text-3xl font-bold text-white leading-tight mb-2 xs:mb-3">
                    Workout History
                  </h3>
                  <p className="text-slate-200 text-sm xs:text-base leading-relaxed font-medium">
                    Review and track progress
                  </p>
                </div>
                <Button
                  size="sm"
                  className="mt-6 xs:mt-8 w-full bg-white/20 text-white hover:bg-white/30 border border-white/30 shadow-lg hover:shadow-xl transition-all duration-500 font-semibold backdrop-blur-xl"
                  onClick={handleHistoryClick}
                >
                  View History
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Profile Settings - Modern Card */}
      <section className="relative mx-auto max-w-6xl px-3 xs:px-4 sm:px-6 mt-6 xs:mt-8 sm:mt-10 mb-6 xs:mb-8 sm:mb-10 pb-6 xs:pb-8 sm:pb-10 animate-slide-in-up" style={{ animationDelay: '0.3s' }}>
        <div className="group relative cursor-pointer touch-manipulation" onClick={handleProfileClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && handleProfileClick()}>
          <div className="relative rounded-2xl xs:rounded-3xl sm:rounded-[32px] overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 p-6 xs:p-8 sm:p-10 border border-emerald-400/30 shadow-xl shadow-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all duration-700 active:scale-[0.98] group-hover:-translate-y-1 focus-visible-enhanced">
            {/* Animated background elements */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
            <div className="absolute -right-20 -top-20 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/5 rounded-full blur-2xl" />

            <div className="relative flex items-center gap-4 xs:gap-6 sm:gap-8">
              <div className="w-14 xs:w-16 sm:w-20 h-14 xs:h-16 sm:h-20 rounded-2xl xs:rounded-3xl bg-white/20 backdrop-blur-xl flex items-center justify-center flex-shrink-0 border border-white/30 group-hover:scale-110 transition-transform duration-500">
                <UserIcon className="w-7 xs:w-8 sm:w-10 h-7 xs:h-8 sm:h-10 text-white" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl xs:text-2xl sm:text-3xl font-bold text-white leading-tight mb-1 xs:mb-2">Profile Settings</h3>
                <p className="text-emerald-100 text-sm xs:text-base leading-relaxed font-medium">Update goals & equipment</p>
              </div>
              <Button
                size="sm"
                className="flex-shrink-0 bg-white text-emerald-600 hover:bg-emerald-50 shadow-lg hover:shadow-xl transition-all duration-500 font-semibold min-h-[44px] xs:min-h-[48px]"
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