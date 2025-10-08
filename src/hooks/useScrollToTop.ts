import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook that scrolls the window to the top whenever the route changes.
 * Useful for ensuring users start at the top of each new page.
 *
 * Uses useLayoutEffect to ensure scroll happens before browser paint.
 *
 * @param options - Configuration options
 * @param options.behavior - Scroll behavior: 'auto' (instant) or 'smooth'
 * @param options.enabled - Whether scrolling is enabled (default: true)
 */
export function useScrollToTop(options: {
  behavior?: 'auto' | 'smooth';
  enabled?: boolean;
} = {}) {
  const { pathname } = useLocation();
  const { behavior = 'auto', enabled = true } = options;

  // Use layoutEffect to scroll before paint
  useLayoutEffect(() => {
    if (!enabled) return;

    // Save current scroll-behavior
    const htmlScrollBehavior = document.documentElement.style.scrollBehavior;
    const bodyScrollBehavior = document.body.style.scrollBehavior;

    // Temporarily disable smooth scrolling for instant scroll
    if (behavior === 'auto') {
      document.documentElement.style.scrollBehavior = 'auto';
      document.body.style.scrollBehavior = 'auto';
    }

    // Immediate scroll - multiple methods for maximum compatibility
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Restore scroll-behavior
    document.documentElement.style.scrollBehavior = htmlScrollBehavior;
    document.body.style.scrollBehavior = bodyScrollBehavior;

    // Also set with behavior option if smooth
    if (behavior === 'smooth') {
      try {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'smooth'
        });
      } catch {
        // Fallback already handled above
      }
    }
  }, [pathname, behavior, enabled]);

  // Additional effect to handle any async content loading
  useEffect(() => {
    if (!enabled) return;

    const timeoutId = setTimeout(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [pathname, enabled]);
}

/**
 * Hook specifically for workout flow pages that ensures scroll to top
 * on every navigation within the workout flow.
 */
export function useWorkoutScrollToTop() {
  useScrollToTop({ behavior: 'auto', enabled: true });
}

