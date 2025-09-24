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
import Profile from './pages/Profile'
import { HomeGate, RequireAuth, RequireProfile } from './routes/guards'
import { lockOrientation, preventZoom } from './utils/orientation'

export default function App() {
  // Initialize mobile optimizations
  useEffect(() => {
    const cleanupOrientation = lockOrientation()
    const cleanupZoom = preventZoom()

    return () => {
      cleanupOrientation()
      cleanupZoom()
    }
  }, [])
  return (
    <div className="min-h-screen">
      <Routes>
        {/* Landing: decides where to send user */}
        <Route path="/" element={<HomeGate authPage={<Auth />} />} />

        {/* Onboarding requires sign-in, but not a complete profile */}
        <Route
          path="/onboarding"
          element={
            <RequireAuth>
              <Onboarding />
            </RequireAuth>
          }
        />

        {/* All “real app” routes require a completed profile */}
        <Route
          path="/dashboard"
          element={
            <RequireProfile>
              <Dashboard />
            </RequireProfile>
          }
        />
        <Route
          path="/generate"
          element={
            <RequireProfile>
              <Generate />
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
          path="/profile"
          element={
            <RequireProfile>
              <Profile />
            </RequireProfile>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}