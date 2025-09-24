import { Navigate } from 'react-router-dom'
import { useSession } from '../session/SessionProvider'
import type { ReactNode } from 'react'

// Landing gate at "/"
export function HomeGate({ authPage }: { authPage: ReactNode }) {
  const { status, user, profile } = useSession()

  console.log('HomeGate: Current status:', status)
  console.log('HomeGate: User:', user?.email || 'none')
  console.log('HomeGate: Profile exists:', !!profile)

  if (status === 'loading') {
    console.log('HomeGate: Showing loader')
    return <ScreenLoader />
  }
  if (status === 'signedOut') {
    console.log('HomeGate: Showing auth page')
    return <>{authPage}</>
  }
  if (status === 'needsOnboarding') {
    console.log('HomeGate: Redirecting to onboarding')
    return <Navigate to="/onboarding" replace />
  }
  console.log('HomeGate: Redirecting to dashboard')
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