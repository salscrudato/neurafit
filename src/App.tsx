import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Auth from './pages/Auth'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Generate from './pages/Generate'
import Preview from './pages/workout/Preview'
import Exercise from './pages/workout/Exercise'
import Rest from './pages/workout/Rest'
import Complete from './pages/workout/Complete'
import History from './pages/History'
import WorkoutDetail from './pages/WorkoutDetail'
import Profile from './pages/Profile'
import TestWorkout from './pages/TestWorkout'
import TestSubscription from './pages/TestSubscription'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import Subscription from './pages/Subscription'
import { CriticalErrorBoundary, PageErrorBoundary } from './components/ErrorBoundary'

import { HomeGate, RequireAuth, RequireProfile } from './routes/guards'
import { lockOrientation, preventZoom } from './utils/orientation'
import { versionManager } from './utils/version'
import { usePageTracking } from './hooks/useAnalytics'
import { trackSessionStart } from './lib/firebase-analytics'

export default function App() {
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

    // Start version checking (check every minute)
    versionManager.startVersionChecking(60000)

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
                <Onboarding />
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
                <Generate />
              </PageErrorBoundary>
            </RequireProfile>
          }
        />
        <Route
          path="/workout/preview"
          element={
            <RequireProfile>
              <Preview />
            </RequireProfile>
          }
        />
        <Route
          path="/workout/run"
          element={
            <RequireProfile>
              <Exercise />
            </RequireProfile>
          }
        />
        <Route
          path="/workout/rest"
          element={
            <RequireProfile>
              <Rest />
            </RequireProfile>
          }
        />
        <Route
          path="/workout/complete"
          element={
            <RequireProfile>
              <Complete />
            </RequireProfile>
          }
        />
        <Route
          path="/history"
          element={
            <RequireProfile>
              <History />
            </RequireProfile>
          }
        />
        <Route
          path="/workout/:workoutId"
          element={
            <RequireProfile>
              <WorkoutDetail />
            </RequireProfile>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireProfile>
              <Profile />
            </RequireProfile>
          }
        />
        <Route
          path="/subscription"
          element={
            <RequireProfile>
              <PageErrorBoundary>
                <Subscription />
              </PageErrorBoundary>
            </RequireProfile>
          }
        />
        <Route
          path="/test-workout"
          element={
            <RequireProfile>
              <TestWorkout />
            </RequireProfile>
          }
        />
        <Route
          path="/test-subscription"
          element={
            <RequireAuth>
              <TestSubscription />
            </RequireAuth>
          }
        />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </CriticalErrorBoundary>
  )
}