/**
 * Route Wrapper Components
 * Simplifies route definitions by providing reusable wrappers
 */

import { Suspense, type ReactNode } from 'react'
import { LoadingSpinner } from './Loading'
import { PageErrorBoundary } from './ErrorBoundary'
import { RequireAuth, RequireProfile } from '../routes/guards'

interface RouteWrapperProps {
  children: ReactNode
  requireAuth?: boolean
  requireProfile?: boolean
  lazy?: boolean
}

/**
 * Unified route wrapper that handles common patterns:
 * - Error boundaries
 * - Authentication guards
 * - Profile completion guards
 * - Lazy loading with suspense
 */
export function RouteWrapper({ 
  children, 
  requireAuth = false, 
  requireProfile = false, 
  lazy = false 
}: RouteWrapperProps) {
  let content = children

  // Wrap with Suspense if lazy loading
  if (lazy) {
    content = (
      <Suspense fallback={<LoadingSpinner />}>
        {content}
      </Suspense>
    )
  }

  // Wrap with PageErrorBoundary
  content = (
    <PageErrorBoundary>
      {content}
    </PageErrorBoundary>
  )

  // Wrap with profile guard if required
  if (requireProfile) {
    content = (
      <RequireProfile>
        {content}
      </RequireProfile>
    )
  }

  // Wrap with auth guard if required (but not if profile is required, as RequireProfile includes auth)
  if (requireAuth && !requireProfile) {
    content = (
      <RequireAuth>
        {content}
      </RequireAuth>
    )
  }

  return <>{content}</>
}

/**
 * Convenience components for common route patterns
 */

// Public route (no auth required)
export function PublicRoute({ children, lazy = false }: { children: ReactNode; lazy?: boolean }) {
  return <RouteWrapper lazy={lazy}>{children}</RouteWrapper>
}

// Auth required route
export function AuthRoute({ children, lazy = false }: { children: ReactNode; lazy?: boolean }) {
  return <RouteWrapper requireAuth lazy={lazy}>{children}</RouteWrapper>
}

// Profile required route (includes auth)
export function ProfileRoute({ children, lazy = false }: { children: ReactNode; lazy?: boolean }) {
  return <RouteWrapper requireProfile lazy={lazy}>{children}</RouteWrapper>
}
