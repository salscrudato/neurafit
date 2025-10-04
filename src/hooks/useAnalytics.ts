import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '../lib/firebase-analytics'

/**
 * Route metadata for analytics and SEO
 */
interface RouteMetadata {
  screenName: string
  title: string
}

/**
 * Map of routes to their metadata
 */
const ROUTE_METADATA: Record<string, RouteMetadata> = {
  '/': {
    screenName: 'home',
    title: 'NeuraFit - AI-Powered Fitness',
  },
  '/dashboard': {
    screenName: 'dashboard',
    title: 'Dashboard - NeuraFit',
  },
  '/generate': {
    screenName: 'generate_workout',
    title: 'Generate Workout - NeuraFit',
  },
  '/history': {
    screenName: 'workout_history',
    title: 'Workout History - NeuraFit',
  },
  '/profile': {
    screenName: 'profile',
    title: 'Profile - NeuraFit',
  },
  '/subscription': {
    screenName: 'subscription',
    title: 'Subscription - NeuraFit',
  },
  '/onboarding': {
    screenName: 'onboarding',
    title: 'Get Started - NeuraFit',
  },
  '/workout/preview': {
    screenName: 'workout_preview',
    title: 'Workout Preview - NeuraFit',
  },
  '/workout/run': {
    screenName: 'workout_exercise',
    title: 'Exercise - NeuraFit',
  },
  '/workout/rest': {
    screenName: 'workout_rest',
    title: 'Rest - NeuraFit',
  },
  '/workout/complete': {
    screenName: 'workout_complete',
    title: 'Workout Complete - NeuraFit',
  },
  '/terms': {
    screenName: 'terms',
    title: 'Terms of Service - NeuraFit',
  },
  '/privacy': {
    screenName: 'privacy',
    title: 'Privacy Policy - NeuraFit',
  },
}

/**
 * Get route metadata from pathname
 */
function getRouteMetadata(pathname: string): RouteMetadata {
  // Check exact match first
  if (ROUTE_METADATA[pathname]) {
    return ROUTE_METADATA[pathname]
  }

  // Handle dynamic routes
  if (pathname.startsWith('/workout/') && pathname.match(/^\/workout\/[a-zA-Z0-9-]+$/)) {
    return {
      screenName: 'workout_detail',
      title: 'Workout Detail - NeuraFit',
    }
  }

  // Default for unknown routes
  return {
    screenName: 'not_found',
    title: '404 Not Found - NeuraFit',
  }
}

/**
 * Hook to automatically track page views and update document title
 */
export function usePageTracking() {
  const location = useLocation()

  useEffect(() => {
    // Get route metadata
    const metadata = getRouteMetadata(location.pathname)

    // Update document title
    document.title = metadata.title

    // Track page view with screen name
    trackPageView(metadata.screenName, metadata.title)

    // Log in development
    if (import.meta.env.MODE === 'development') {
      console.log('📊 Page tracked:', {
        pathname: location.pathname,
        screenName: metadata.screenName,
        title: metadata.title,
      })
    }
  }, [location])
}
