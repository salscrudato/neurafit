import { Navigate, useLocation } from 'react-router-dom'
import { useApp } from '../providers/app-provider-utils'
import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { logger } from '../lib/logger'

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
      logger.error('Redirect loop detected', {
        guard: guardName,
        targetPath,
        redirectCount: redirectCountRef.current,
        currentPath: location.pathname
      })
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
  const { authStatus, user, isGuest } = useApp()
  const location = useLocation()
  const { checkRedirect } = useRedirectLoopDetection('HomeGate')

  // Check if there's a saved destination from a protected route redirect
  const from = (location.state as { from?: string })?.from

  // Log authentication state for debugging
  logger.debug('HomeGate check', {
    authStatus,
    userEmail: user?.email || 'no user',
    isGuest,
    from: from || 'none'
  })

  if (authStatus === 'loading') return <ScreenLoader />
  if (authStatus === 'signedOut') return <>{authPage}</>

  // Guest users go directly to generate page
  if (authStatus === 'guest' && isGuest) {
    if (checkRedirect('/generate')) {
      return <Navigate to="/generate" replace />
    }
  }

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

// Require completed profile (ready status) or guest session
export function RequireProfile({ children }: { children: ReactNode }) {
  const { authStatus, isGuest } = useApp()
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

  // Allow access when status is 'ready' or guest session is active
  if (authStatus === 'ready' || (authStatus === 'guest' && isGuest)) {
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