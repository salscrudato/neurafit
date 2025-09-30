import { Navigate } from 'react-router-dom'
import { useApp } from '../providers/AppProvider'
import type { ReactNode } from 'react'

// Landing gate at "/"
export function HomeGate({ authPage }: { authPage: ReactNode }) {
  const { authStatus, user } = useApp()

  // Development-only logging for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('[HOME] HomeGate:', authStatus, user?.email || 'no user')
  }

  if (authStatus === 'loading') return <ScreenLoader />
  if (authStatus === 'signedOut') return <>{authPage}</>
  if (authStatus === 'needsOnboarding') return <Navigate to="/onboarding" replace />
  return <Navigate to="/dashboard" replace />
}

// Require any signed-in user
export function RequireAuth({ children }: { children: ReactNode }) {
  const { authStatus } = useApp()

  if (authStatus === 'loading') return <ScreenLoader />
  if (authStatus === 'signedOut') return <Navigate to="/" replace />
  return <>{children}</>
}

// Require completed profile
export function RequireProfile({ children }: { children: ReactNode }) {
  const { authStatus } = useApp()

  if (authStatus === 'loading') return <ScreenLoader />
  if (authStatus === 'signedOut') return <Navigate to="/" replace />
  if (authStatus === 'needsOnboarding') return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

// Simple full-screen loader using Tailwind classes
function ScreenLoader() {
  return (
    <div className="min-h-screen grid place-items-center bg-white">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900 border-r-slate-900" />
    </div>
  )
}