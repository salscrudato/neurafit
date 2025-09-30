import { Navigate } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import type { ReactNode } from 'react'

// Landing gate at "/"
export function HomeGate({ authPage }: { authPage: ReactNode }) {
  const { status, user } = useSession()

  // Only log in development for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('[HOME] HomeGate:', status, user?.email || 'no user')
  }

  if (status === 'loading') return <ScreenLoader />
  if (status === 'signedOut') return <>{authPage}</>
  if (status === 'needsOnboarding') return <Navigate to="/onboarding" replace />
  return <Navigate to="/dashboard" replace />
}

// Require any signed-in user
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useSession()
  if (status === 'loading') return <ScreenLoader />
  if (status === 'signedOut') return <Navigate to="/" replace />
  return <>{children}</>
}

// Require completed profile
export function RequireProfile({ children }: { children: ReactNode }) {
  const { status } = useSession()
  if (status === 'loading') return <ScreenLoader />
  if (status === 'signedOut') return <Navigate to="/" replace />
  if (status === 'needsOnboarding') return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

// Simple full-screen loader (Tailwind)
function ScreenLoader() {
  return (
    <div className="min-h-screen grid place-items-center bg-white">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
    </div>
  )
}