import { useEffect, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

import ErrorBoundary from './components/ErrorBoundary';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import { PublicRoute, AuthRoute, ProfileRoute } from './components/RouteWrapper';
import { UpdateToast } from './hooks/useUpdateToast';
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
// Version management removed for simplicity
import { usePageTracking } from './hooks/useAnalytics';
import { trackSessionStart } from './lib/firebase-analytics';
import { useRoutePrefetch } from './hooks/useRoutePrefetch';
import { useFocusManagement, useSkipLink } from './hooks/useFocusManagement';

function AppContent() {
  // Automatically track page views
  usePageTracking();

  // Automatically prefetch next-hop routes
  useRoutePrefetch();

  // Focus management for accessibility
  useFocusManagement();
  useSkipLink();

  // Handle mobile optimizations, version management, and analytics on mount
  useEffect(() => {
    const cleanupOrientation = lockOrientation();
    const cleanupZoom = preventZoom();

    // Track session start with location context
    trackSessionStart();

    // Version management removed for simplicity

    // Event listener for version updates
    const handleVersionUpdate = () => {
      logger.info('Version update detected by version manager');
    };

    window.addEventListener('versionUpdate', handleVersionUpdate);

    // Add passive event listeners for better scroll performance
    const passiveOptions = { passive: true } as const;

    const handleScroll = () => {
      // Scroll handler (if needed in future)
    };

    const handleTouchMove = () => {
      // Touch move handler (if needed in future)
    };

    window.addEventListener('scroll', handleScroll, passiveOptions);
    window.addEventListener('touchmove', handleTouchMove, passiveOptions);

    // Cleanup on unmount
    return () => {
      cleanupOrientation();
      cleanupZoom();
      window.removeEventListener('versionUpdate', handleVersionUpdate);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return (
    <ErrorBoundary level="critical">
      <div className="min-h-screen-mobile">
        {/* Offline Indicator */}
        <OfflineIndicator />

        <main id="main-content" role="main" tabIndex={-1}>
        <Routes>
          {/* Public legal pages */}
          <Route path="/terms" element={
            <RouteErrorBoundary routeName="Terms">
              <PublicRoute lazy><Terms /></PublicRoute>
            </RouteErrorBoundary>
          } />
          <Route path="/privacy" element={
            <RouteErrorBoundary routeName="Privacy">
              <PublicRoute lazy><Privacy /></PublicRoute>
            </RouteErrorBoundary>
          } />

          {/* Landing route: determines user redirection */}
          <Route path="/" element={
            <RouteErrorBoundary routeName="Home">
              <HomeGate authPage={<Auth />} />
            </RouteErrorBoundary>
          } />

          {/* Onboarding: requires authentication but not a complete profile */}
          <Route path="/onboarding" element={
            <RouteErrorBoundary routeName="Onboarding">
              <AuthRoute lazy><Onboarding /></AuthRoute>
            </RouteErrorBoundary>
          } />

          {/* Protected routes: require completed profile */}
          <Route path="/dashboard" element={
            <RouteErrorBoundary routeName="Dashboard">
              <ProfileRoute lazy><Dashboard /></ProfileRoute>
            </RouteErrorBoundary>
          } />
          <Route path="/generate" element={
            <RouteErrorBoundary routeName="Generate">
              <ProfileRoute lazy><Generate /></ProfileRoute>
            </RouteErrorBoundary>
          } />
          <Route path="/workout/preview" element={
            <RouteErrorBoundary routeName="Workout Preview">
              <ProfileRoute lazy><Preview /></ProfileRoute>
            </RouteErrorBoundary>
          } />
          <Route path="/workout/run" element={
            <RouteErrorBoundary routeName="Workout Exercise">
              <ProfileRoute lazy><Exercise /></ProfileRoute>
            </RouteErrorBoundary>
          } />
          <Route path="/workout/rest" element={
            <RouteErrorBoundary routeName="Workout Rest">
              <ProfileRoute lazy><Rest /></ProfileRoute>
            </RouteErrorBoundary>
          } />
          <Route path="/workout/complete" element={
            <RouteErrorBoundary routeName="Workout Complete">
              <ProfileRoute lazy><Complete /></ProfileRoute>
            </RouteErrorBoundary>
          } />
          <Route path="/history" element={
            <RouteErrorBoundary routeName="History">
              <ProfileRoute lazy><History /></ProfileRoute>
            </RouteErrorBoundary>
          } />
          <Route path="/workout/:workoutId" element={
            <RouteErrorBoundary routeName="Workout Detail">
              <ProfileRoute lazy><WorkoutDetail /></ProfileRoute>
            </RouteErrorBoundary>
          } />
          <Route path="/profile" element={
            <RouteErrorBoundary routeName="Profile">
              <ProfileRoute lazy><Profile /></ProfileRoute>
            </RouteErrorBoundary>
          } />

          {/* Catch-all 404 page */}
          <Route path="*" element={
            <RouteErrorBoundary routeName="Not Found">
              <PublicRoute lazy><NotFound /></PublicRoute>
            </RouteErrorBoundary>
          } />
        </Routes>
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