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
import { Button } from '../design-system/components/Button'
import { Card } from '../design-system/components/Card'
import { MotivationalBanner } from '../components/MotivationalBanner'
import { SubscriptionManager } from '../components/SubscriptionManager'

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 relative">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-slate-200/20 to-blue-200/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-blue-200/20 to-slate-200/20 rounded-full blur-3xl" />
        </div>

        <AppHeader />
        <div className="relative mx-auto max-w-6xl px-6 pt-8">
          <div className="animate-pulse space-y-12">
            {/* Hero skeleton */}
            <div className="h-40 bg-gradient-to-br from-white/90 to-white/70 rounded-3xl shadow-xl shadow-slate-200/40 backdrop-blur-xl border border-white/60"></div>

            {/* Motivational banner skeleton */}
            <div className="h-28 bg-gradient-to-br from-white/90 to-white/70 rounded-3xl shadow-xl shadow-slate-200/40 backdrop-blur-xl border border-white/60"></div>

            {/* Quick actions skeleton */}
            <div>
              <div className="h-8 bg-gradient-to-r from-slate-200/80 to-slate-100/60 rounded-lg w-40 mb-8"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-56 bg-gradient-to-br from-white/90 to-white/70 rounded-2xl shadow-lg shadow-slate-200/30 backdrop-blur-xl border border-white/60"></div>
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
      <section className="relative mx-auto max-w-6xl px-6 pt-8">
        <div className="group relative rounded-3xl border border-white/60 bg-gradient-to-br from-white/95 via-white/85 to-white/75 backdrop-blur-xl p-8 md:p-10 overflow-hidden shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-slate-300/25 transition-all duration-500">
          {/* Enhanced background elements */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-tr from-blue-400/20 via-indigo-400/15 to-purple-400/10 opacity-70 blur-3xl group-hover:opacity-90 transition-opacity duration-500" />
          <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-gradient-to-tr from-slate-400/15 via-gray-400/10 to-blue-400/5 opacity-50 blur-2xl" />

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent leading-tight">
                Welcome back, {firstName}.
              </h1>
              <p className="mt-4 text-slate-600 max-w-2xl text-lg leading-relaxed">
                {dashboardStats?.totalWorkouts === 0
                  ? "Ready to start your fitness journey? Generate your first AI-powered workout below."
                  : "Keep up the momentum! Your personalized workouts are getting smarter with every session."
                }
              </p>
            </div>
          </div>
        </div>
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
      <section className="relative mx-auto max-w-6xl px-6 mt-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-3">Quick Actions</h2>
          <p className="text-slate-600 text-lg">Everything you need to stay on track</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div
            className="group relative cursor-pointer"
            onClick={() => nav('/generate')}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
            <Card
              variant="elevated"
              rounded="xl"
              className="relative p-8 border border-white/60 bg-gradient-to-br from-white/95 to-white/85 backdrop-blur-xl shadow-lg shadow-slate-200/30 hover:shadow-xl hover:shadow-blue-200/20 transition-all duration-500 group-hover:scale-[1.02] group-hover:border-blue-200/50"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow duration-300">
                    <Zap className="h-7 w-7" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-900 transition-colors">Generate Workout</h3>
                    <p className="text-slate-600 leading-relaxed">AI-tailored plans from goals, experience, equipment & injuries.</p>
                  </div>
                </div>
                <Button size="sm" className="ml-4 shadow-md hover:shadow-lg transition-shadow" onClick={() => nav('/generate')}>
                  Start Now
                </Button>
              </div>
            </Card>
          </div>

          <div
            className="group relative cursor-pointer"
            onClick={() => nav('/history')}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-slate-500/10 to-gray-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
            <Card
              variant="elevated"
              rounded="xl"
              className="relative p-8 border border-white/60 bg-gradient-to-br from-white/95 to-white/85 backdrop-blur-xl shadow-lg shadow-slate-200/30 hover:shadow-xl hover:shadow-slate-200/20 transition-all duration-500 group-hover:scale-[1.02] group-hover:border-slate-200/50"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center text-white shadow-lg shadow-slate-500/25 group-hover:shadow-slate-500/40 transition-shadow duration-300">
                    <History className="h-7 w-7" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-slate-800 transition-colors">Workout History</h3>
                    <p className="text-slate-600 leading-relaxed">Auto-saved sessions to review, repeat, and track progress.</p>
                  </div>
                </div>
                <Button size="sm" variant="secondary" className="ml-4 shadow-md hover:shadow-lg transition-shadow" onClick={() => nav('/history')}>
                  View History
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Profile Settings - Compact */}
      <section className="relative mx-auto max-w-6xl px-6 mt-12">
        <div className="group relative cursor-pointer" onClick={() => nav('/profile')}>
          <div className="absolute inset-0 bg-gradient-to-r from-slate-400/5 to-gray-400/5 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
          <div className="relative bg-gradient-to-br from-white/90 via-white/80 to-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white/60 shadow-lg shadow-slate-200/20 hover:shadow-xl hover:shadow-slate-200/30 transition-all duration-500 group-hover:scale-[1.01]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center shadow-lg shadow-slate-500/20">
                  <UserIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-slate-800 transition-colors">Profile Settings</h3>
                  <p className="text-slate-600">Update goals, equipment, or injuries</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="shadow-md hover:shadow-lg transition-shadow" onClick={() => nav('/profile')}>
                Edit Profile
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription Status */}
      <section className="relative mx-auto max-w-6xl px-6 mt-6 mb-12">
        <SubscriptionManager mode="status" />
      </section>

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  )
}