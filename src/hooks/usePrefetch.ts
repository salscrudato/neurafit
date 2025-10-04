/**
 * Route Prefetching Hook
 * 
 * Prefetches route chunks on hover or idle to improve perceived performance
 * and reduce First Input Delay (FID) for navigation.
 */

import { useEffect, useCallback, useRef } from 'react';

// Map of route paths to their lazy-loaded modules
const routeModules: Record<string, () => Promise<unknown>> = {
  '/generate': () => import('../pages/Generate'),
  '/subscription': () => import('../pages/Subscription'),
  '/history': () => import('../pages/History'),
  '/profile': () => import('../pages/Profile'),
  '/workout/preview': () => import('../pages/workout/Preview'),
  '/workout/run': () => import('../pages/workout/Exercise'),
  '/workout/complete': () => import('../pages/workout/Complete'),
};

// Track which routes have been prefetched
const prefetchedRoutes = new Set<string>();

/**
 * Prefetch a route's code chunk
 */
export function prefetchRoute(path: string): void {
  // Skip if already prefetched
  if (prefetchedRoutes.has(path)) {
    return;
  }

  const moduleLoader = routeModules[path];
  if (!moduleLoader) {
    return;
  }

  // Mark as prefetched immediately to prevent duplicate requests
  prefetchedRoutes.add(path);

  // Prefetch the module
  moduleLoader()
    .then(() => {
      if (import.meta.env.MODE === 'development') {
        console.log(`[PREFETCH] Successfully prefetched: ${path}`);
      }
    })
    .catch((error) => {
      // Remove from set if prefetch failed so it can be retried
      prefetchedRoutes.delete(path);
      console.warn(`[PREFETCH] Failed to prefetch ${path}:`, error);
    });
}

/**
 * Hook to prefetch routes on hover
 */
export function usePrefetchOnHover(path: string) {
  const hasTriggered = useRef(false);

  const handleMouseEnter = useCallback(() => {
    if (!hasTriggered.current) {
      hasTriggered.current = true;
      prefetchRoute(path);
    }
  }, [path]);

  return { onMouseEnter: handleMouseEnter };
}

/**
 * Hook to prefetch routes on idle
 * Uses requestIdleCallback to prefetch during browser idle time
 */
export function usePrefetchOnIdle(paths: string[], delay = 2000) {
  useEffect(() => {
    // Wait for initial delay before starting idle prefetch
    const timeoutId = setTimeout(() => {
      // Use requestIdleCallback if available, otherwise use setTimeout
      const scheduleIdlePrefetch = (callback: () => void) => {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(callback, { timeout: 5000 });
        } else {
          setTimeout(callback, 0);
        }
      };

      // Prefetch each route during idle time
      paths.forEach((path, index) => {
        scheduleIdlePrefetch(() => {
          // Stagger prefetches to avoid blocking
          setTimeout(() => {
            prefetchRoute(path);
          }, index * 100);
        });
      });
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [paths, delay]);
}

/**
 * Hook to prefetch critical routes immediately
 */
export function usePrefetchCritical(paths: string[]) {
  useEffect(() => {
    // Prefetch critical routes after a short delay to not block initial render
    const timeoutId = setTimeout(() => {
      paths.forEach((path) => {
        prefetchRoute(path);
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [paths]);
}

/**
 * Clear prefetch cache (useful for testing)
 */
export function clearPrefetchCache(): void {
  prefetchedRoutes.clear();
}

