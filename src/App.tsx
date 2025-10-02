import { useEffect, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { CriticalErrorBoundary } from './components/ErrorBoundary';
import { PublicRoute, AuthRoute, ProfileRoute } from './components/RouteWrapper';
import { SubscriptionMonitor } from './components/SubscriptionMonitor';


// Eager-loaded critical pages
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';

// Lazy-loaded non-critical pages
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Generate = lazy(() => import('./pages/Generate'));
const Preview = lazy(() => import('./pages/workout/Preview'));
const Exercise = lazy(() => import('./pages/workout/Exercise'));
const Rest = lazy(() => import('./pages/workout/Rest'));
const Complete = lazy(() => import('./pages/workout/Complete'));
const History = lazy(() => import('./pages/History'));
const WorkoutDetail = lazy(() => import('./pages/WorkoutDetail'));
const Profile = lazy(() => import('./pages/Profile'));
const Subscription = lazy(() => import('./pages/Subscription'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));

import { AppProvider } from './providers/AppProvider';
import { HomeGate } from './routes/guards';
import { lockOrientation, preventZoom } from './utils/orientation';
import { versionManager } from './utils/version';
import { usePageTracking } from './hooks/useAnalytics';
import { trackSessionStart } from './lib/firebase-analytics';

function AppContent() {
  // Automatically track page views
  usePageTracking();

  // Handle mobile optimizations, version management, and analytics on mount
  useEffect(() => {
    const cleanupOrientation = lockOrientation();
    const cleanupZoom = preventZoom();

    // Track session start with location context
    trackSessionStart();

    // Manage version information
    if (versionManager.isFirstRun()) {
      console.log('First run or updated version detected');
      versionManager.storeVersionInfo();
    }

    // Start periodic version checking in production
    if (process.env.NODE_ENV === 'production') {
      versionManager.startVersionChecking(300000); // 5 minutes
    }

    // Event listener for version updates
    const handleVersionUpdate = () => {
      console.log('Version update detected by version manager');
    };

    window.addEventListener('versionUpdate', handleVersionUpdate);

    // Cleanup on unmount
    return () => {
      cleanupOrientation();
      cleanupZoom();
      versionManager.stopVersionChecking();
      window.removeEventListener('versionUpdate', handleVersionUpdate);
    };
  }, []);

  return (
    <CriticalErrorBoundary>
      <div className="min-h-screen">
        <Routes>
          {/* Public legal pages */}
          <Route path="/terms" element={<PublicRoute lazy><Terms /></PublicRoute>} />
          <Route path="/privacy" element={<PublicRoute lazy><Privacy /></PublicRoute>} />

          {/* Landing route: determines user redirection */}
          <Route path="/" element={<HomeGate authPage={<Auth />} />} />

          {/* Onboarding: requires authentication but not a complete profile */}
          <Route path="/onboarding" element={<AuthRoute lazy><Onboarding /></AuthRoute>} />

          {/* Protected routes: require completed profile */}
          <Route path="/dashboard" element={<ProfileRoute><Dashboard /></ProfileRoute>} />
          <Route path="/generate" element={<ProfileRoute lazy><Generate /></ProfileRoute>} />
          <Route path="/workout/preview" element={<ProfileRoute lazy><Preview /></ProfileRoute>} />
          <Route path="/workout/run" element={<ProfileRoute lazy><Exercise /></ProfileRoute>} />
          <Route path="/workout/rest" element={<ProfileRoute lazy><Rest /></ProfileRoute>} />
          <Route path="/workout/complete" element={<ProfileRoute lazy><Complete /></ProfileRoute>} />
          <Route path="/history" element={<ProfileRoute lazy><History /></ProfileRoute>} />
          <Route path="/workout/:workoutId" element={<ProfileRoute lazy><WorkoutDetail /></ProfileRoute>} />
          <Route path="/profile" element={<ProfileRoute lazy><Profile /></ProfileRoute>} />
          <Route path="/subscription" element={<ProfileRoute lazy><Subscription /></ProfileRoute>} />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Unified Subscription Monitor - Consolidated health monitoring and fixing */}
        <SubscriptionMonitor />
      </div>
    </CriticalErrorBoundary>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}