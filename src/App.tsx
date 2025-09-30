import { useEffect, Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import { CriticalErrorBoundary, PageErrorBoundary } from './components/ErrorBoundary'
import LoadingSpinner from './components/LoadingSpinner'

// Eager-loaded critical pages
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'

// Lazy-loaded non-critical pages
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



import { AppProvider } from './providers/AppProvider'
import { HomeGate, RequireAuth, RequireProfile } from './routes/guards'
import { lockOrientation, preventZoom } from './utils/orientation'
import { versionManager } from './utils/version'
import { usePageTracking } from './hooks/useAnalytics'
import { trackSessionStart } from './lib/firebase-analytics'

function AppContent() {
  // Automatically track page views
  usePageTracking()

  // Handle mobile optimizations, version management, and analytics on mount
  useEffect(() => {
    const cleanupOrientation = lockOrientation()
    const cleanupZoom = preventZoom()

    // Track session start with location context
    trackSessionStart()

    // Manage version information
    if (versionManager.isFirstRun()) {
      console.log('First run or updated version detected')
      versionManager.storeVersionInfo()
    }

    // Start periodic version checking in production
    if (process.env.NODE_ENV === 'production') {
      versionManager.startVersionChecking(300000) // 5 minutes
    }

    // Event listener for version updates
    const handleVersionUpdate = () => {
      console.log('Version update detected by version manager')
    }

    window.addEventListener('versionUpdate', handleVersionUpdate)

    // Cleanup on unmount
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

          {/* Landing route: determines user redirection */}
          <Route path="/" element={<HomeGate authPage={<Auth />} />} />

          {/* Onboarding: requires authentication but not a complete profile */}
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

          {/* Protected routes: require completed profile */}
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
                <PageErrorBoundary>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Preview />
                  </Suspense>
                </PageErrorBoundary>
              </RequireProfile>
            }
          />
          <Route
            path="/workout/run"
            element={
              <RequireProfile>
                <PageErrorBoundary>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Exercise />
                  </Suspense>
                </PageErrorBoundary>
              </RequireProfile>
            }
          />
          <Route
            path="/workout/rest"
            element={
              <RequireProfile>
                <PageErrorBoundary>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Rest />
                  </Suspense>
                </PageErrorBoundary>
              </RequireProfile>
            }
          />
          <Route
            path="/workout/complete"
            element={
              <RequireProfile>
                <PageErrorBoundary>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Complete />
                  </Suspense>
                </PageErrorBoundary>
              </RequireProfile>
            }
          />
          <Route
            path="/history"
            element={
              <RequireProfile>
                <PageErrorBoundary>
                  <Suspense fallback={<LoadingSpinner />}>
                    <History />
                  </Suspense>
                </PageErrorBoundary>
              </RequireProfile>
            }
          />
          <Route
            path="/workout/:workoutId"
            element={
              <RequireProfile>
                <PageErrorBoundary>
                  <Suspense fallback={<LoadingSpinner />}>
                    <WorkoutDetail />
                  </Suspense>
                </PageErrorBoundary>
              </RequireProfile>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireProfile>
                <PageErrorBoundary>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Profile />
                  </Suspense>
                </PageErrorBoundary>
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



          {/* Catch-all redirect */}
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