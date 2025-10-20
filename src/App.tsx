// src/App.tsx
import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';

import ErrorBoundary from './components/ErrorBoundary';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import { PublicRoute, AuthRoute, ProfileRoute } from './components/RouteWrapper';
import { UpdateToast } from './hooks/useUpdateToast';
import { CacheRecoveryBanner } from './components/CacheRecoveryBanner';
import { logger } from './lib/logger';
import { OfflineIndicator } from './components/OfflineIndicator';

// Lazy-loaded pages for optimal code splitting
const Auth = lazy(() => import('./pages/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Generate = lazy(() => import('./pages/Generate'));
const Preview = lazy(() => import('./pages/workout/Preview'));
const Exercise = lazy(() => import('./pages/workout/Exercise'));
const Rest = lazy(() => import('./pages/workout/Rest'));
const Complete = lazy(() => import('./pages/workout/Complete'));
const History = lazy(() => import('./pages/History'));
const WorkoutDetail = lazy(() => import('./pages/WorkoutDetail'));
const Profile = lazy(() => import('./pages/Profile'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const NotFound = lazy(() => import('./pages/NotFound'));

import { AppProvider } from './providers/AppProvider';
import { HomeGate } from './routes/guards';
import { lockOrientation, preventZoom } from './utils/orientation';
import { usePageTracking } from './hooks/useAnalytics';
import { trackSessionStart } from './lib/firebase-analytics';
import { useRoutePrefetch } from './hooks/useRoutePrefetch';
import { useFocusManagement, useSkipLink } from './hooks/useFocusManagement';

/* ---------------------------------- */
/* Fallback shown while routes load   */
/* ---------------------------------- */
function RouteSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="flex min-h-[40vh] items-center justify-center p-6"
    >
      <div className="w-full max-w-md animate-pulse space-y-4" aria-hidden="true">
        <div className="h-4 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
      <span className="sr-only">Loading content…</span>
    </div>
  );
}

/* ----------------------------------------------------------- */
/* Idle, network-aware warming of *probable next* route chunks */
/* ----------------------------------------------------------- */
interface NetworkInformationLite {
  saveData?: boolean;
  effectiveType?: string;
  downlink?: number;
}

function useWarmupLazyRoutes() {
  const location = useLocation();

  useEffect(() => {
    // Heuristic: only warm on "fast" conditions and when user isn’t saving data
    const connection = (navigator as Navigator & {
      connection?: NetworkInformationLite;
    }).connection;

    const isFast =
      !connection ||
      (connection.saveData !== true &&
        (((connection.effectiveType ?? '4g') === '4g') ||
          (connection.downlink ?? 0) > 2));

    if (!isFast) return;

    // Decide which groups to warm based on current area of app
    // Keep this list small to avoid defeating code-splitting.
    const common = [
      () => import('./pages/Dashboard'),
      () => import('./pages/Generate'),
      () => import('./pages/History'),
    ];

    const workout = [
      () => import('./pages/workout/Preview'),
      () => import('./pages/workout/Exercise'),
      () => import('./pages/workout/Rest'),
      () => import('./pages/workout/Complete'),
    ];

    const nextLoaders =
      location.pathname.startsWith('/workout') || location.pathname === '/generate'
        ? [...common, ...workout]
        : common;

    let cancelled = false;

    const runSequentially = () =>
      nextLoaders.reduce<Promise<void>>(
        (p, loader) =>
          p.then(async () => {
            if (cancelled) return;
            await loader();
          }),
        Promise.resolve()
      );

    const win = window as Window & {
      requestIdleCallback?: (
        cb: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void,
        opts?: { timeout?: number }
      ) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof win.requestIdleCallback === 'function') {
      const id = win.requestIdleCallback(() => void runSequentially(), { timeout: 2500 });
      return () => {
        cancelled = true;
        if (typeof win.cancelIdleCallback === 'function') win.cancelIdleCallback(id);
      };
    } else {
      const t = window.setTimeout(() => void runSequentially(), 1200);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }
  }, [location.pathname]);
}

function AppContent() {
  // Analytics
  usePageTracking();

  // Route prefetch on user intent (hover/focus/etc.)
  useRoutePrefetch();

  // A11y focus mgmt & skip link
  useFocusManagement();
  useSkipLink();

  // Background warmup of likely routes
  useWarmupLazyRoutes();

  // Handle mobile optimizations and analytics on mount
  useEffect(() => {
    const cleanupOrientation = lockOrientation();
    const cleanupZoom = preventZoom();

    trackSessionStart();

    const handleVersionUpdate = () => {
      logger.info('Version update detected by version manager');
    };

    window.addEventListener('versionUpdate', handleVersionUpdate);

    return () => {
      cleanupOrientation();
      cleanupZoom();
      window.removeEventListener('versionUpdate', handleVersionUpdate);
    };
  }, []);

  return (
    <ErrorBoundary level="critical">
      <div className="min-h-screen-mobile">
        {/* Offline Indicator */}
        <OfflineIndicator />

        {/* Cache Recovery Banner */}
        <CacheRecoveryBanner />

        <main id="main-content" role="main" tabIndex={-1}>
          <Suspense fallback={<RouteSkeleton />}>
            <Routes>
              {/* Public legal pages */}
              <Route
                path="/terms"
                element={
                  <RouteErrorBoundary routeName="Terms">
                    <PublicRoute lazy>
                      <Terms />
                    </PublicRoute>
                  </RouteErrorBoundary>
                }
              />
              <Route
                path="/privacy"
                element={
                  <RouteErrorBoundary routeName="Privacy">
                    <PublicRoute lazy>
                      <Privacy />
                    </PublicRoute>
                  </RouteErrorBoundary>
                }
              />

              {/* Landing route: determines user redirection */}
              <Route
                path="/"
                element={
                  <RouteErrorBoundary routeName="Home">
                    <HomeGate authPage={<Auth />} />
                  </RouteErrorBoundary>
                }
              />

              {/* Onboarding: requires authentication but not a complete profile */}
              <Route
                path="/onboarding"
                element={
                  <RouteErrorBoundary routeName="Onboarding">
                    <AuthRoute lazy>
                      <Onboarding />
                    </AuthRoute>
                  </RouteErrorBoundary>
                }
              />

              {/* Protected routes: require completed profile */}
              <Route
                path="/dashboard"
                element={
                  <RouteErrorBoundary routeName="Dashboard">
                    <ProfileRoute lazy>
                      <Dashboard />
                    </ProfileRoute>
                  </RouteErrorBoundary>
                }
              />
              <Route
                path="/generate"
                element={
                  <RouteErrorBoundary routeName="Generate">
                    <ProfileRoute lazy>
                      <Generate />
                    </ProfileRoute>
                  </RouteErrorBoundary>
                }
              />
              <Route
                path="/workout/preview"
                element={
                  <RouteErrorBoundary routeName="Workout Preview">
                    <ProfileRoute lazy>
                      <Preview />
                    </ProfileRoute>
                  </RouteErrorBoundary>
                }
              />
              <Route
                path="/workout/run"
                element={
                  <RouteErrorBoundary routeName="Workout Exercise">
                    <ProfileRoute lazy>
                      <Exercise />
                    </ProfileRoute>
                  </RouteErrorBoundary>
                }
              />
              <Route
                path="/workout/rest"
                element={
                  <RouteErrorBoundary routeName="Workout Rest">
                    <ProfileRoute lazy>
                      <Rest />
                    </ProfileRoute>
                  </RouteErrorBoundary>
                }
              />
              <Route
                path="/workout/complete"
                element={
                  <RouteErrorBoundary routeName="Workout Complete">
                    <ProfileRoute lazy>
                      <Complete />
                    </ProfileRoute>
                  </RouteErrorBoundary>
                }
              />
              <Route
                path="/history"
                element={
                  <RouteErrorBoundary routeName="History">
                    <ProfileRoute lazy>
                      <History />
                    </ProfileRoute>
                  </RouteErrorBoundary>
                }
              />
              <Route
                path="/workout/:workoutId"
                element={
                  <RouteErrorBoundary routeName="Workout Detail">
                    <ProfileRoute lazy>
                      <WorkoutDetail />
                    </ProfileRoute>
                  </RouteErrorBoundary>
                }
              />
              <Route
                path="/profile"
                element={
                  <RouteErrorBoundary routeName="Profile">
                    <ProfileRoute lazy>
                      <Profile />
                    </ProfileRoute>
                  </RouteErrorBoundary>
                }
              />

              {/* Catch-all 404 page */}
              <Route
                path="*"
                element={
                  <RouteErrorBoundary routeName="Not Found">
                    <PublicRoute lazy>
                      <NotFound />
                    </PublicRoute>
                  </RouteErrorBoundary>
                }
              />
            </Routes>
          </Suspense>
        </main>

        {/* Service Worker Update Toast */}
        <UpdateToast />
      </div>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}