// src/components/RouteWrapper.tsx

/**
 * Route Wrapper Components
 * Simplifies route definitions by providing reusable wrappers
 *
 * Enhancements:
 * - ErrorBoundary now wraps Suspense to catch lazy import errors.
 * - Boundary resets on navigation via location.key (avoids "stuck" error UI).
 * - Optional `fallback` prop to override the loading UI when `lazy` is true.
 * - Guard order preserved: Profile guard implies Auth guard.
 */

import { Suspense, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { PageSkeleton } from './SkeletonLoader';
import ErrorBoundary from './ErrorBoundary';
import { RequireAuth, RequireProfile } from '../routes/guards';

interface RouteWrapperProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireProfile?: boolean;
  /** When true, wraps children in <Suspense>. */
  lazy?: boolean;
  /** Optional custom fallback used when `lazy` is true. */
  fallback?: ReactNode;
}

/**
 * Unified route wrapper that handles common patterns:
 * - Error boundaries (outermost, keyed to navigation)
 * - Authentication guards
 * - Profile completion guards
 * - Optional lazy loading with Suspense (fallback customizable)
 */
export function RouteWrapper({
  children,
  requireAuth = false,
  requireProfile = false,
  lazy = false,
  fallback,
}: RouteWrapperProps) {
  const location = useLocation();

  let content = children;

  // Profile guard (includes auth)
  if (requireProfile) {
    content = <RequireProfile>{content}</RequireProfile>;
  }
  // Auth-only guard (when profile not required)
  else if (requireAuth) {
    content = <RequireAuth>{content}</RequireAuth>;
  }

  // Optional Suspense wrapper
  const maybeSuspense = lazy ? (
    <Suspense fallback={fallback ?? <PageSkeleton />}>{content}</Suspense>
  ) : (
    content
  );

  // Error boundary as the outermost wrapper.
  // Keyed by navigation so the boundary resets when the user routes.
  return (
    <ErrorBoundary key={location.key} level="page">
      {maybeSuspense}
    </ErrorBoundary>
  );
}

/**
 * Convenience wrappers
 */
type SimpleRouteProps = { children: ReactNode; lazy?: boolean; fallback?: ReactNode };

export function PublicRoute({ children, lazy = false, fallback }: SimpleRouteProps) {
  return (
    <RouteWrapper lazy={lazy} fallback={fallback}>
      {children}
    </RouteWrapper>
  );
}

export function AuthRoute({ children, lazy = false, fallback }: SimpleRouteProps) {
  return (
    <RouteWrapper requireAuth lazy={lazy} fallback={fallback}>
      {children}
    </RouteWrapper>
  );
}

export function ProfileRoute({ children, lazy = false, fallback }: SimpleRouteProps) {
  return (
    <RouteWrapper requireProfile lazy={lazy} fallback={fallback}>
      {children}
    </RouteWrapper>
  );
}