import { useEffect, Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { CriticalErrorBoundary, PageErrorBoundary } from './components/ErrorBoundary'
import LoadingSpinner from './components/LoadingSpinner'
import UpdateNotification from './components/UpdateNotification'

// Eager load critical pages
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'

// Lazy load non-critical pages for better performance
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Generate = lazy(() => import('./pages/Generate'))
const Preview = lazy(() => import('./pages/workout/Preview'))
const Exercise = lazy(() => import('./pages/workout/Exercise'))
const Rest = lazy(() => import('./pages/workout/Rest'))
const Complete = lazy(() => import('./pages/workout/Complete'))
const History = lazy(() => import('./pages/History'))
const WorkoutDetail = lazy(() => import('./pages/WorkoutDetail'))
const Profile = lazy(() => import('./pages/Profile'))
const Subscription = lazy(() => import('./pages/Subscription'))
const Terms = lazy(() => import('./pages/Terms'))
const Privacy = lazy(() => import('./pages/Privacy'))

// Development/testing pages - only load in development
const TestWorkout = lazy(() =>
  process.env.NODE_ENV === 'development'
    ? import('./pages/TestWorkout')
    : Promise.resolve({ default: () => <Navigate to="/dashboard" replace /> })
)
const TestSubscription = lazy(() =>
  process.env.NODE_ENV === 'development'
    ? import('./pages/TestSubscription')
    : Promise.resolve({ default: () => <Navigate to="/dashboard" replace /> })
)

import { AppProvider } from './providers/AppProvider'
import { HomeGate, RequireAuth, RequireProfile } from './routes/guards'
import { lockOrientation, preventZoom } from './utils/orientation'
import { versionManager } from './utils/version'
import { usePageTracking } from './hooks/useAnalytics'
import { trackSessionStart } from './lib/firebase-analytics'

function AppContent() {
  // Track page views automatically
  usePageTracking()

  // Initialize mobile optimizations and version management
  useEffect(() => {
    const cleanupOrientation = lockOrientation()
    const cleanupZoom = preventZoom()

    // Track session start with location context
    trackSessionStart()

    // Initialize version management
    if (versionManager.isFirstRun()) {
      console.log('First run or updated version detected')
      versionManager.storeVersionInfo()
    }

    // Start aggressive version checking (every 15 seconds)
    versionManager.startVersionChecking(15000)

    // Listen for version updates
    const handleVersionUpdate = () => {
      console.log('Version update detected by version manager')
    }

    window.addEventListener('versionUpdate', handleVersionUpdate)

    return () => {
      cleanupOrientation()
      cleanupZoom()
      versionManager.stopVersionChecking()
      window.removeEventListener('versionUpdate', handleVersionUpdate)
    }
  }, [])
  return (
    <CriticalErrorBoundary>
      <div className="min-h-screen">
        {/* Update notification for instant cache busting */}
        <UpdateNotification autoUpdate={process.env.NODE_ENV === 'production'} />

        <Routes>

        {/* Public legal pages */}
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />

        {/* Landing: decides where to send user */}
        <Route path="/" element={<HomeGate authPage={<Auth />} />} />

        {/* Onboarding requires sign-in, but not a complete profile */}
        <Route
          path="/onboarding"
          element={
            <RequireAuth>
              <PageErrorBoundary>
                <Suspense fallback={<LoadingSpinner />}>
                  <Onboarding />
                </Suspense>
              </PageErrorBoundary>
            </RequireAuth>
          }
        />

        {/* All “real app” routes require a completed profile */}
        <Route
          path="/dashboard"
          element={
            <RequireProfile>
              <PageErrorBoundary>
                <Dashboard />
              </PageErrorBoundary>
            </RequireProfile>
          }
        />
        <Route
          path="/generate"
          element={
            <RequireProfile>
              <PageErrorBoundary>
                <Suspense fallback={<LoadingSpinner />}>
                  <Generate />
                </Suspense>
              </PageErrorBoundary>
            </RequireProfile>
          }
        />
        <Route
          path="/workout/preview"
          element={
            <RequireProfile>
              <Suspense fallback={<LoadingSpinner />}>
                <Preview />
              </Suspense>
            </RequireProfile>
          }
        />
        <Route
          path="/workout/run"
          element={
            <RequireProfile>
              <Suspense fallback={<LoadingSpinner />}>
                <Exercise />
              </Suspense>
            </RequireProfile>
          }
        />
        <Route
          path="/workout/rest"
          element={
            <RequireProfile>
              <Suspense fallback={<LoadingSpinner />}>
                <Rest />
              </Suspense>
            </RequireProfile>
          }
        />
        <Route
          path="/workout/complete"
          element={
            <RequireProfile>
              <Suspense fallback={<LoadingSpinner />}>
                <Complete />
              </Suspense>
            </RequireProfile>
          }
        />
        <Route
          path="/history"
          element={
            <RequireProfile>
              <Suspense fallback={<LoadingSpinner />}>
                <History />
              </Suspense>
            </RequireProfile>
          }
        />
        <Route
          path="/workout/:workoutId"
          element={
            <RequireProfile>
              <Suspense fallback={<LoadingSpinner />}>
                <WorkoutDetail />
              </Suspense>
            </RequireProfile>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireProfile>
              <Suspense fallback={<LoadingSpinner />}>
                <Profile />
              </Suspense>
            </RequireProfile>
          }
        />
        <Route
          path="/subscription"
          element={
            <RequireProfile>
              <PageErrorBoundary>
                <Suspense fallback={<LoadingSpinner />}>
                  <Subscription />
                </Suspense>
              </PageErrorBoundary>
            </RequireProfile>
          }
        />
        <Route
          path="/test-workout"
          element={
            <RequireProfile>
              <Suspense fallback={<LoadingSpinner />}>
                <TestWorkout />
              </Suspense>
            </RequireProfile>
          }
        />
        <Route
          path="/test-subscription"
          element={
            <RequireAuth>
              <Suspense fallback={<LoadingSpinner />}>
                <TestSubscription />
              </Suspense>
            </RequireAuth>
          }
        />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </CriticalErrorBoundary>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}