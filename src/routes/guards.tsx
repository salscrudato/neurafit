// src/routes/guards.tsx
import { Navigate, useLocation, type Location } from 'react-router-dom';
import { useApp } from '../providers/app-provider-utils';
import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import { logger } from '../lib/logger';

/** ---------------------------------------------
 * Utilities
 * ----------------------------------------------*/

/** Build a stable "returnTo" URL (pathname + search + hash). */
function buildReturnTo(loc: Location): string {
  const search = loc.search ?? '';
  const hash = loc.hash ?? '';
  return `${loc.pathname}${search}${hash}` || '/';
}

/**
 * Loop detection persisted in sessionStorage so it survives route unmounts.
 * We treat > MAX_REDIRECTS within WINDOW_MS between the same two routes
 * as a loop and stop redirecting.
 */
function useRedirectLoopDetection(guardName: string) {
  const location = useLocation();
  const STORAGE_KEY = `nf:redir:${guardName}`;

  const checkRedirect = (targetPath: string): boolean => {
    const now = Date.now();
    const WINDOW_MS = 3000;
    const MAX_REDIRECTS = 6;

    type Rec = {
      count: number;
      ts: number;
      from: string;
      to: string;
    };

    let rec: Rec;
    try {
      rec = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null') as Rec | null || {
        count: 0,
        ts: now,
        from: location.pathname,
        to: targetPath,
      };
    } catch {
      rec = { count: 0, ts: now, from: location.pathname, to: targetPath };
    }

    const samePair = rec.from === location.pathname && rec.to === targetPath;
    const withinWindow = now - rec.ts <= WINDOW_MS;

    if (samePair && withinWindow) {
      rec.count += 1;
    } else {
      rec = { count: 1, ts: now, from: location.pathname, to: targetPath };
    }

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rec));

    if (rec.count > MAX_REDIRECTS) {
      logger.error('Redirect loop detected', {
        guard: guardName,
        currentPath: location.pathname,
        targetPath,
        count: rec.count,
      });
      sessionStorage.removeItem(STORAGE_KEY);
      return false;
    }

    return true;
  };

  // Clean up storage when leaving this guard's context
  useEffect(() => {
    return () => {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { checkRedirect };
}

/** Accessible full-screen loader (dark-mode aware, test-friendly). */
function ScreenLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      className="min-h-screen grid place-items-center bg-white dark:bg-slate-900"
      role="status"
      aria-busy="true"
      aria-live="polite"
      data-testid="screen-loader"
    >
      <div
        className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 dark:border-slate-600 border-t-slate-900 dark:border-t-white border-r-slate-900 dark:border-r-white"
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** ---------------------------------------------
 * HomeGate at "/"
 * ----------------------------------------------*/

export function HomeGate({ authPage }: { authPage: ReactNode }) {
  const { authStatus, user, isGuest } = useApp();
  const location = useLocation();
  const { checkRedirect } = useRedirectLoopDetection('HomeGate');

  // Accept `from` when user was bounced here by a guard.
  const from = useMemo(() => {
    const s = location.state as { from?: string } | null;
    return s?.from;
  }, [location.state]);

  logger.debug('HomeGate check', {
    authStatus,
    userEmail: user?.email || 'no user',
    isGuest,
    from: from || 'none',
  });

  if (authStatus === 'loading') return <ScreenLoader />;

  // Not signed in: show the provided auth page (no redirect).
  if (authStatus === 'signedOut') return <>{authPage}</>;

  // Guest users → Generate
  if (authStatus === 'guest' && isGuest) {
    const dest = '/generate';
    if (dest !== location.pathname && checkRedirect(dest)) {
      return <Navigate to={dest} replace />;
    }
    return <ScreenLoader label="Preparing guest session…" />;
  }

  // Needs onboarding → Onboarding (preserve intended destination)
  if (authStatus === 'needsOnboarding') {
    const dest = '/onboarding';
    if (dest !== location.pathname && checkRedirect(dest)) {
      return <Navigate to={dest} state={{ from }} replace />;
    }
    return <ScreenLoader label="Redirecting to onboarding…" />;
  }

  // Ready → go to saved `from` (if present and not "/"), else dashboard
  if (authStatus === 'ready') {
    const preferred = from && from !== '/' ? from : '/dashboard';
    if (preferred !== location.pathname && checkRedirect(preferred)) {
      return <Navigate to={preferred} replace />;
    }
    // Already on destination (or loop guard tripped) — render nothing.
    return null;
  }

  // Fallback: render auth page if state is unknown
  return <>{authPage}</>;
}

/** ---------------------------------------------
 * RequireAuth — any signed-in user
 * ----------------------------------------------*/

export function RequireAuth({ children }: { children: ReactNode }) {
  const { authStatus } = useApp();
  const location = useLocation();
  const { checkRedirect } = useRedirectLoopDetection('RequireAuth');

  // Wait for auth readiness
  if (authStatus === 'loading') return <ScreenLoader />;

  // Bounce unauthenticated users to Home and remember the full return URL
  if (authStatus === 'signedOut') {
    const returnTo = buildReturnTo(location);
    const dest = '/';
    if (dest !== location.pathname && checkRedirect(dest)) {
      return <Navigate to={dest} state={{ from: returnTo }} replace />;
    }
    return <ScreenLoader label="Redirecting to sign in…" />;
  }

  return <>{children}</>;
}

/** ---------------------------------------------
 * RequireProfile — completed profile OR guest session
 * ----------------------------------------------*/

export function RequireProfile({ children }: { children: ReactNode }) {
  const { authStatus, isGuest } = useApp();
  const location = useLocation();
  const { checkRedirect } = useRedirectLoopDetection('RequireProfile');

  if (authStatus === 'loading') return <ScreenLoader />;

  // Not signed in → go Home (preserve returnTo)
  if (authStatus === 'signedOut') {
    const returnTo = buildReturnTo(location);
    const dest = '/';
    if (dest !== location.pathname && checkRedirect(dest)) {
      return <Navigate to={dest} state={{ from: returnTo }} replace />;
    }
    return <ScreenLoader label="Redirecting to sign in…" />;
  }

  // Profile incomplete → Onboarding (preserve returnTo)
  if (authStatus === 'needsOnboarding') {
    const returnTo = buildReturnTo(location);
    const dest = '/onboarding';
    if (dest !== location.pathname && checkRedirect(dest)) {
      return <Navigate to={dest} state={{ from: returnTo }} replace />;
    }
    return <ScreenLoader label="Redirecting to onboarding…" />;
  }

  // Allow when ready OR in guest mode
  if (authStatus === 'ready' || (authStatus === 'guest' && isGuest)) {
    return <>{children}</>;
  }

  // Unknown state — remain safe
  return <ScreenLoader />;
}