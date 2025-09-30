import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '../lib/firebase-analytics'

/**
 * Hook to automatically track page views
 */
export function usePageTracking() {
  const location = useLocation()

  useEffect(() => {
    // Track page view when location changes
    const pageName = getPageNameFromPath(location.pathname)
    trackPageView(pageName, document.title)
  }, [location])
}

/**
 * Convert pathname to readable page name
 */
function getPageNameFromPath(pathname: string): string {
  const pathMap: Record<string, string> = {
    '/': 'Dashboard',
    '/dashboard': 'Dashboard',
    '/generate': 'Generate Workout',
    '/history': 'Workout History',
    '/profile': 'Profile',
    '/subscription': 'Subscription',

    '/onboarding': 'Onboarding',
    '/auth': 'Authentication',
    '/workout/preview': 'Workout Preview',
    '/workout/exercise': 'Exercise',
    '/workout/rest': 'Rest',
    '/workout/complete': 'Workout Complete',
    '/terms': 'Terms of Service',
    '/privacy': 'Privacy Policy'
  }

  // Handle dynamic routes
  if (pathname.startsWith('/workout/')) {
    return 'Workout Session'
  }
  if (pathname.startsWith('/history/')) {
    return 'Workout Detail'
  }

  return pathMap[pathname] || 'Unknown Page'
}
