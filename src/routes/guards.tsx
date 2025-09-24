import { Navigate } from 'react-router-dom'
import { useSession } from '../session/SessionProvider'
import type { ReactNode } from 'react'

// Landing gate at "/"
export function HomeGate({ authPage }: { authPage: ReactNode }) {
  const { status, user, profile } = useSession()

  // Add a visual debug panel in development
  const isDebug = window.location.hostname === 'localhost'

  if (isDebug) {
    console.log('🏠 HomeGate Debug:', {
      status,
      userEmail: user?.email,
      profileExists: !!profile,
      profileComplete: profile ? Object.keys(profile).length : 0
    })
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen grid place-items-center bg-white">
        <div className="text-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900 mx-auto mb-4" />
          {isDebug && <p className="text-sm text-gray-500">Loading auth state...</p>}
        </div>
      </div>
    )
  }

  if (status === 'signedOut') {
    return <>{authPage}</>
  }

  if (status === 'needsOnboarding') {
    if (isDebug) console.log('🏠 HomeGate: Redirecting to onboarding')
    return <Navigate to="/onboarding" replace />
  }

  if (isDebug) console.log('🏠 HomeGate: Redirecting to dashboard')
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