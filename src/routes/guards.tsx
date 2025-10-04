import { Navigate, useLocation } from 'react-router-dom'
import { useApp } from '../providers/app-provider-utils'
import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'

/**
 * Hook to detect and prevent redirect loops
 */
function useRedirectLoopDetection(guardName: string) {
  const location = useLocation()
  const redirectCountRef = useRef(0)
  const lastPathRef = useRef('')

  useEffect(() => {
    // Reset counter if path actually changed
    if (lastPathRef.current !== location.pathname) {
      redirectCountRef.current = 0
      lastPathRef.current = location.pathname
    }
  }, [location.pathname])

  const checkRedirect = (targetPath: string) => {
    // Increment counter
    redirectCountRef.current++

    // If we've redirected too many times, log error and break the loop
    if (redirectCountRef.current > 5) {
      console.error(
        `🔴 Redirect loop detected in ${guardName}! ` +
        `Attempted to redirect to ${targetPath} ${redirectCountRef.current} times. ` +
        `Current path: ${location.pathname}`
      )
      // Reset counter and return false to break the loop
      redirectCountRef.current = 0
      return false
    }

    return true
  }

  return { checkRedirect }
}

// Landing gate at "/"
export function HomeGate({ authPage }: { authPage: ReactNode }) {
  const { authStatus, user } = useApp()
  const location = useLocation()
  const { checkRedirect } = useRedirectLoopDetection('HomeGate')

  // Check if there's a saved destination from a protected route redirect
  const from = (location.state as { from?: string })?.from

  // Development-only logging for debugging
  if (import.meta.env.MODE === 'development') {
    console.log('[HOME] HomeGate:', authStatus, user?.email || 'no user', from ? `(from: ${from})` : '')
  }

  if (authStatus === 'loading') return <ScreenLoader />
  if (authStatus === 'signedOut') return <>{authPage}</>

  if (authStatus === 'needsOnboarding') {
    if (checkRedirect('/onboarding')) {
      // Preserve the intended destination through onboarding
      return <Navigate to="/onboarding" state={{ from }} replace />
    }
  }

  if (authStatus === 'ready') {
    // If there's a saved destination, redirect there instead of dashboard
    const destination = from && from !== '/' ? from : '/dashboard'
    if (checkRedirect(destination)) {
      return <Navigate to={destination} replace />
    }
  }

  // Fallback: show auth page if status is unknown
  return <>{authPage}</>
}

// Require any signed-in user
export function RequireAuth({ children }: { children: ReactNode }) {
  const { authStatus } = useApp()
  const location = useLocation()
  const { checkRedirect } = useRedirectLoopDetection('RequireAuth')

  // Wait for auth to be ready
  if (authStatus === 'loading') return <ScreenLoader />

  // Redirect to home if not signed in, preserving the intended destination
  if (authStatus === 'signedOut') {
    if (checkRedirect('/')) {
      return <Navigate to="/" state={{ from: location.pathname }} replace />
    }
  }

  // Allow access for any authenticated user
  return <>{children}</>
}

// Require completed profile (ready status)
export function RequireProfile({ children }: { children: ReactNode }) {
  const { authStatus } = useApp()
  const location = useLocation()
  const { checkRedirect } = useRedirectLoopDetection('RequireProfile')

  // Wait for auth to be ready
  if (authStatus === 'loading') return <ScreenLoader />

  // Redirect to home if not signed in, preserving the intended destination
  if (authStatus === 'signedOut') {
    if (checkRedirect('/')) {
      return <Navigate to="/" state={{ from: location.pathname }} replace />
    }
  }

  // Redirect to onboarding if profile is incomplete
  if (authStatus === 'needsOnboarding') {
    if (checkRedirect('/onboarding')) {
      return <Navigate to="/onboarding" state={{ from: location.pathname }} replace />
    }
  }

  // Only allow access when status is 'ready'
  if (authStatus === 'ready') {
    return <>{children}</>
  }

  // Fallback: show loader for unknown states
  return <ScreenLoader />
}

// Simple full-screen loader using Tailwind classes
function ScreenLoader() {
  return (
    <div className="min-h-screen grid place-items-center bg-white">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900 border-r-slate-900" />
    </div>
  )
}