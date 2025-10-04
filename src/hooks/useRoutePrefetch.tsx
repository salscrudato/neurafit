/**
 * Route Prefetching Hook
 * 
 * Injects <link rel="prefetch"> tags for next-hop routes to improve navigation performance.
 * Prefetches route chunks based on current location and likely next routes.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Map of routes to their likely next routes
const ROUTE_PREFETCH_MAP: Record<string, string[]> = {
  '/': ['/dashboard', '/onboarding'],
  '/dashboard': ['/generate', '/history', '/profile', '/subscription'],
  '/generate': ['/workout/preview'],
  '/workout/preview': ['/workout/run'],
  '/workout/run': ['/workout/rest', '/workout/complete'],
  '/workout/rest': ['/workout/run'],
  '/workout/complete': ['/dashboard', '/history'],
  '/history': ['/dashboard'],
  '/profile': ['/dashboard'],
  '/subscription': ['/dashboard'],
  '/onboarding': ['/dashboard'],
};

// Map of routes to their module paths
const ROUTE_MODULE_MAP: Record<string, string> = {
  '/onboarding': '/src/pages/Onboarding.tsx',
  '/generate': '/src/pages/Generate.tsx',
  '/workout/preview': '/src/pages/workout/Preview.tsx',
  '/workout/run': '/src/pages/workout/Exercise.tsx',
  '/workout/rest': '/src/pages/workout/Rest.tsx',
  '/workout/complete': '/src/pages/workout/Complete.tsx',
  '/history': '/src/pages/History.tsx',
  '/profile': '/src/pages/Profile.tsx',
  '/subscription': '/src/pages/Subscription.tsx',
};

/**
 * Prefetch a route module
 */
function prefetchRoute(route: string): void {
  const modulePath = ROUTE_MODULE_MAP[route];
  if (!modulePath) return;

  // Create prefetch link
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.as = 'script';
  link.href = modulePath;

  // Check if already prefetched
  const existing = document.querySelector(`link[href="${modulePath}"]`);
  if (existing) return;

  // Add to document head
  document.head.appendChild(link);
}

/**
 * Hook to automatically prefetch next-hop routes
 */
export function useRoutePrefetch() {
  const location = useLocation();

  useEffect(() => {
    // Get likely next routes based on current location
    const nextRoutes = ROUTE_PREFETCH_MAP[location.pathname] || [];

    // Prefetch each route after a short delay
    const timeoutId = setTimeout(() => {
      nextRoutes.forEach((route) => {
        prefetchRoute(route);
      });
    }, 1000); // Wait 1s after navigation to avoid blocking main thread

    return () => clearTimeout(timeoutId);
  }, [location.pathname]);
}

/**
 * Hook to prefetch specific routes on demand
 */
export function usePrefetchRoutes(routes: string[], delay = 0) {
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      routes.forEach((route) => {
        prefetchRoute(route);
      });
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [routes, delay]);
}

/**
 * Prefetch routes on hover (for links)
 */
export function usePrefetchOnHover(route: string) {
  const handleMouseEnter = () => {
    prefetchRoute(route);
  };

  return { onMouseEnter: handleMouseEnter };
}

