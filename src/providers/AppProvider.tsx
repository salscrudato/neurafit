// src/providers/AppProvider.tsx
import { useEffect, type ReactNode, useRef } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAppStore } from '../store';
import { isProfileComplete } from '../session/types';
import type { UserProfile } from '../session/types';
import { ensureUserDocument } from '../lib/user-utils';
import ErrorBoundary from '../components/ErrorBoundary';
import { setUserContext, clearUserContext } from '../lib/sentry';
import { logger } from '../lib/logger';

interface AppProviderProps {
  children: ReactNode;
}

/** Small helper to safely schedule work during idle time (with fallback). */
function scheduleIdle(fn: () => void, timeout = 2000) {
  const w = window as Window & {
    requestIdleCallback?: (
      cb: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void,
      opts?: { timeout?: number }
    ) => number;
  };
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(() => fn(), { timeout });
  } else {
    setTimeout(fn, Math.min(500, timeout));
  }
}

/** Session-scoped profile cache to minimize UI flicker after reloads. */
const PROFILE_CACHE_KEY = (uid: string) => `nf:profile-cache:${uid}`;

function loadCachedProfile(uid: string): UserProfile | null {
  try {
    const raw = sessionStorage.getItem(PROFILE_CACHE_KEY(uid));
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

function saveCachedProfile(uid: string, profile: UserProfile | null) {
  try {
    if (!profile) {
      sessionStorage.removeItem(PROFILE_CACHE_KEY(uid));
    } else {
      sessionStorage.setItem(PROFILE_CACHE_KEY(uid), JSON.stringify(profile));
    }
  } catch {
    /* ignore */
  }
}

export function AppProvider({ children }: AppProviderProps) {
  const {
    setUser,
    setProfile,
    setAuthStatus,
    syncPendingOperations,
    setOnlineStatus,
    updateLastSyncTime,
  } = useAppStore();

  /**
   * Track the current "auth flow" to prevent stale async completions from
   * mutating state after a quick sign-out/sign-in or provider switch.
   */
  const flowIdRef = useRef(0); // increments on each auth change

  // Authentication + profile state
  useEffect(() => {
    let unsubDoc: (() => void) | null = null;
    let unsubAuth: (() => void) | null = null;
    let mounted = true;
    let initTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanupDoc = () => {
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = null;
      }
    };

    const handleAuthChange = async (user: User | null) => {
      // New flow for each auth transition
      const myFlow = ++flowIdRef.current;

      if (!mounted) return;

      logger.debug('🔐 Auth state changed', { email: user?.email ?? 'signed out' });

      // Cancel previous doc listener and any pending init timer
      if (initTimer) {
        clearTimeout(initTimer);
        initTimer = null;
      }
      cleanupDoc();

      // Atomically reset user+profile in store
      setUser(user);
      setProfile(null);

      if (!user) {
        setAuthStatus('signedOut');
        clearUserContext();
        return;
      }

      // Bind Sentry user context
      setUserContext({ id: user.uid, email: user.email ?? undefined });

      // Optimistically hydrate from session cache to reduce flicker
      const cached = loadCachedProfile(user.uid);
      if (cached) {
        setProfile(cached);
        setAuthStatus(isProfileComplete(cached) ? 'ready' : 'needsOnboarding');
      } else {
        // While we prepare Firestore listener, keep UI in a known loading state
        setAuthStatus('loading');
      }

      // Slight defer to allow Firebase to settle any token refresh
      initTimer = setTimeout(async () => {
        if (!mounted || myFlow !== flowIdRef.current) return;

        try {
          // Make sure a base user document exists (idempotent)
          await ensureUserDocument(user);

          // Live profile listener (includes cache → server updates)
          const profileRef = doc(db, 'users', user.uid);

          unsubDoc = onSnapshot(
            profileRef,
            // Data
            (snapshot) => {
              if (!mounted || myFlow !== flowIdRef.current) return;

              if (!snapshot.exists()) {
                setProfile(null);
                setAuthStatus('needsOnboarding');
                saveCachedProfile(user.uid, null);
                return;
              }

              const profile = snapshot.data() as UserProfile;
              setProfile(profile);
              // Persist session cache for snappy subsequent loads
              saveCachedProfile(user.uid, profile);

              const complete = isProfileComplete(profile);
              setAuthStatus(complete ? 'ready' : 'needsOnboarding');
            },
            // Errors
            (error: Error) => {
              const errorCode = (error as { code?: string }).code;
              logger.error('Profile listener error', { code: errorCode, message: String(error) });

              // Permission denied → treat as signed out (likely token invalidated or rules mismatch)
              if (errorCode === 'permission-denied') {
                cleanupDoc();
                setProfile(null);
                setAuthStatus('signedOut');
                clearUserContext();
              }
            }
          );

          // After listener attaches, perform a background sync (best-effort)
          scheduleIdle(async () => {
            if (!mounted || myFlow !== flowIdRef.current) return;
            try {
              await syncPendingOperations();
              if (mounted && myFlow === flowIdRef.current) updateLastSyncTime();
            } catch (syncError) {
              logger.warn('Deferred sync error', { error: String(syncError) });
            }
          });
        } catch (e) {
          logger.error('User initialization error', { error: String(e) });
          if (mounted && myFlow === flowIdRef.current) {
            // Only downgrade to signedOut on clear auth-related errors; otherwise keep cached state
            const code = (e as { code?: string }).code;
            if (code === 'permission-denied' || code === 'unauthenticated') {
              setAuthStatus('signedOut');
              clearUserContext();
            } else {
              // Keep whatever cached profile (if any) and mark as loading to allow retry via snapshot
              setAuthStatus('loading');
            }
          }
        }
      }, 100);
    };

    // Prime state with current user (reduces first-paint flicker)
    try {
      const u = auth.currentUser;
      if (u) {
        setUser(u);
        const cached = loadCachedProfile(u.uid);
        if (cached) {
          setProfile(cached);
          setAuthStatus(isProfileComplete(cached) ? 'ready' : 'needsOnboarding');
        } else {
          setAuthStatus('loading');
        }
      } else {
        setAuthStatus('signedOut');
      }
    } catch {
      // ignore
    }

    // Subscribe to auth state
    unsubAuth = onAuthStateChanged(
      auth,
      (user) => void handleAuthChange(user),
      (err) => {
        logger.error('Auth listener error', { error: String(err) });
        setAuthStatus('signedOut');
        clearUserContext();
      }
    );

    return () => {
      mounted = false;
      if (initTimer) clearTimeout(initTimer);
      if (unsubAuth) unsubAuth();
      cleanupDoc();
    };
  }, [setUser, setProfile, setAuthStatus, syncPendingOperations, updateLastSyncTime]);

  // Online/offline + visibility-aware sync
  useEffect(() => {
    const syncNow = async (reason: string) => {
      logger.debug('🔄 Sync trigger', { reason, online: navigator.onLine });
      if (!navigator.onLine) return;
      try {
        await syncPendingOperations();
        updateLastSyncTime();
      } catch (e) {
        logger.warn('Sync failed', { error: String(e) });
      }
    };

    const onOnline = () => {
      setOnlineStatus(true);
      // Immediately kick a sync; queue to next tick to avoid blocking event loop
      Promise.resolve().then(() => syncNow('online'));
    };

    const onOffline = () => setOnlineStatus(false);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        scheduleIdle(() => void syncNow('visibility'));
      }
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisibility);

    // Initialize online status
    setOnlineStatus(navigator.onLine);
    if (navigator.onLine) scheduleIdle(() => void syncNow('mount'));

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [setOnlineStatus, syncPendingOperations, updateLastSyncTime]);

  // Periodic background sync (lightweight cadence)
  useEffect(() => {
    const intervalMs = 3 * 60 * 1000; // 3 minutes
    const id = setInterval(() => {
      if (navigator.onLine) {
        void syncPendingOperations().then(updateLastSyncTime).catch((e) => {
          logger.warn('Periodic sync failed', { error: String(e) });
        });
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [syncPendingOperations, updateLastSyncTime]);

  // Global error recovery (kept minimal and safe)
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.error('Unhandled promise rejection', { reason: String(event.reason) });
      const reasonCode = (event.reason as { code?: string }).code;
      if (reasonCode === 'permission-denied') {
        setAuthStatus('signedOut');
        clearUserContext();
      }
      event.preventDefault();
    };

    const handleError = (event: ErrorEvent) => {
      logger.error('Global error', { error: String(event.error || event.message) });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [setAuthStatus]);

  return <ErrorBoundary level="component">{children}</ErrorBoundary>;
}