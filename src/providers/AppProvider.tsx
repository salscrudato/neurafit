import { useEffect, type ReactNode } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAppStore } from '../store';
import { isProfileComplete } from '../session/types';
import type { UserProfile } from '../session/types';
import type { UserSubscription } from '../types/subscription';
import { ensureUserDocument } from '../lib/user-utils';
// Subscription service available but not used in this component
import ErrorBoundary from '../components/ErrorBoundary';
import { setUserContext, clearUserContext } from '../lib/sentry';

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const {
    setUser,
    setProfile,
    setAuthStatus,
    setSubscription,
    setSubscriptionLoading,
    syncPendingOperations,
    setOnlineStatus,
    updateLastSyncTime,
  } = useAppStore();

  // Authentication state management with coordinated async operations
  useEffect(() => {
    let unsubDoc: (() => void) | null = null;
    let unsubSubscription: (() => void) | null = null;
    let unsubAuth: (() => void) | null = null;
    let isMounted = true; // Track mount status to prevent race conditions
    let initializationTimeout: NodeJS.Timeout | null = null; // Track timeout for cleanup

    const setupAuthListener = () => {
      unsubAuth = onAuthStateChanged(auth, async (user: User | null) => {
      try {
        if (!isMounted) return; // Prevent updates after unmount

        if (import.meta.env.MODE === 'development') {
          console.log('🔐 Auth state changed:', user?.email || 'signed out');
        }

        // Cleanup existing listeners and pending operations
        if (initializationTimeout) {
          clearTimeout(initializationTimeout);
          initializationTimeout = null;
        }
        unsubDoc?.();
        unsubDoc = null;
        unsubSubscription?.();
        unsubSubscription = null;

        // Update auth state atomically
        setUser(user);
        setProfile(null);
        setSubscription(null);

        if (!user) {
          if (import.meta.env.MODE === 'development') {
            console.log('🔐 No user, setting status to signedOut');
          }
          setAuthStatus('signedOut');
          clearUserContext(); // Clear Sentry user context
          return;
        }

        // Set Sentry user context
        setUserContext({
          id: user.uid,
          email: user.email || undefined,
        });

        // Delay to ensure auth stability - store timeout for cleanup
        initializationTimeout = setTimeout(async () => {
          if (!isMounted) return; // Check again after timeout

          try {
            // Ensure user document exists before setting up listeners
            await ensureUserDocument(user);

            const profileRef = doc(db, 'users', user.uid);
            unsubDoc = onSnapshot(profileRef,
              (snapshot) => {
                if (!isMounted) return; // Prevent updates after unmount

                if (!snapshot.exists()) {
                  setProfile(null);
                  setAuthStatus('needsOnboarding');
                  return;
                }

                const profileData = snapshot.data() as UserProfile;
                setProfile(profileData);
                setAuthStatus(isProfileComplete(profileData) ? 'ready' : 'needsOnboarding');

                // Handle subscription data with robust manager
                if (profileData.subscription) {
                  // Validate subscription data integrity
                  const validatedSubscription = {
                    ...profileData.subscription,
                    freeWorkoutLimit: profileData.subscription.freeWorkoutLimit || 50,
                    workoutCount: profileData.subscription.workoutCount || 0,
                    freeWorkoutsUsed: profileData.subscription.freeWorkoutsUsed || 0,
                    updatedAt: profileData.subscription.updatedAt || Date.now(),
                  };
                  setSubscription(validatedSubscription);
                } else {
                  // Set default subscription if none exists
                  const defaultSubscription: UserSubscription = {
                    customerId: '',
                    status: 'incomplete',
                    workoutCount: 0,
                    freeWorkoutsUsed: 0,
                    freeWorkoutLimit: 50,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  };
                  setSubscription(defaultSubscription);
                }
                setSubscriptionLoading(false);
              },
              (error) => {
                console.error('Profile listener error:', error);

                if (error.code === 'permission-denied') {
                  unsubDoc?.();
                  unsubDoc = null;
                  setProfile(null);
                  setAuthStatus('signedOut');
                }
              }
            );

            // Coordinate async operations sequentially to prevent race conditions
            if (isMounted) {
              try {
                await syncPendingOperations();
                if (isMounted) {
                  updateLastSyncTime();
                }
              } catch (syncError) {
                console.error('Sync operations error:', syncError);
              }
            }
          } catch (error) {
            console.error('User initialization error:', error);
            if (isMounted) {
              setAuthStatus('signedOut');
            }
          }
        }, 100);
      } catch (error) {
        console.error('Auth state change error:', error);
        if (isMounted) {
          setAuthStatus('signedOut');
        }
      }
      });
    };

    setupAuthListener();

    return () => {
      isMounted = false; // Mark as unmounted
      if (initializationTimeout) {
        clearTimeout(initializationTimeout);
      }
      if (unsubAuth) {
        unsubAuth();
      }
      unsubDoc?.();
      unsubSubscription?.();
    };
  }, [
    setUser,
    setProfile,
    setAuthStatus,
    setSubscription,
    setSubscriptionLoading,
    syncPendingOperations,
    updateLastSyncTime,
  ]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
      syncPendingOperations();
    };

    const handleOffline = () => {
      setOnlineStatus(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setOnlineStatus(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStatus, syncPendingOperations]);

  // Periodic sync for pending operations
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (navigator.onLine) {
        syncPendingOperations();
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(syncInterval);
  }, [syncPendingOperations]);



  // Global error recovery
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);

      if (event.reason?.code === 'permission-denied') {
        setAuthStatus('signedOut');
      }

      event.preventDefault();
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);

      if (import.meta.env.MODE === 'production') {
        // Integrate with error tracking service
        console.error('Production error reported:', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error,
        });
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [setAuthStatus]);

  return (
    <ErrorBoundary level="component">
      {children}
    </ErrorBoundary>
  );
}

// Note: useApp hook has been moved to app-provider-utils.ts
// to fix Fast Refresh warnings. Import it from there instead.