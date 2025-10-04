// Orientation lock utilities for mobile experience
import { logger } from '../lib/logger'

export const lockOrientation = () => {
  // Try to lock to portrait orientation using the Screen Orientation API
  if ('screen' in window && 'orientation' in window.screen) {
    const screenOrientation = window.screen.orientation as { lock?: (_orientation: string) => Promise<void> }

    if ('lock' in screenOrientation && screenOrientation.lock) {
      screenOrientation.lock('portrait').catch((error: { message?: string; name?: string }) => {
        // Only log unexpected errors (not "not supported" errors)
        if (!error.message?.includes('not supported') && error.name !== 'NotSupportedError') {
          logger.debug('Orientation lock failed', { errorName: error.name })
        }
      })
    }
  }
  
  // Fallback: Listen for orientation changes and show warning
  const handleOrientationChange = () => {
    const isLandscape = window.innerWidth > window.innerHeight
    const isMobile = window.innerWidth <= 768
    
    if (isLandscape && isMobile) {
      // Show landscape warning (handled by CSS)
      document.body.classList.add('landscape-warning')
    } else {
      document.body.classList.remove('landscape-warning')
    }
  }
  
  // Listen for orientation changes
  window.addEventListener('orientationchange', handleOrientationChange)
  window.addEventListener('resize', handleOrientationChange)
  
  // Initial check
  handleOrientationChange()
  
  // Return cleanup function
  return () => {
    window.removeEventListener('orientationchange', handleOrientationChange)
    window.removeEventListener('resize', handleOrientationChange)
  }
}

export const unlockOrientation = () => {
  if ('screen' in window && 'orientation' in window.screen) {
    const screenOrientation = window.screen.orientation as unknown as { unlock?: () => Promise<void> }

    if ('unlock' in screenOrientation && screenOrientation.unlock) {
      Promise.resolve(screenOrientation.unlock()).catch((error: { name?: string }) => {
        // Silently handle unlock failures as they're not critical
        if (error.name !== 'NotSupportedError') {
          logger.debug('Orientation unlock failed', { errorName: error.name })
        }
      })
    }
  }
}

// Prevent zoom on double tap (iOS Safari)
export const preventZoom = () => {
  let lastTouchEnd = 0
  
  const preventDoubleTapZoom = (event: TouchEvent) => {
    const now = new Date().getTime()
    if (now - lastTouchEnd <= 300) {
      event.preventDefault()
    }
    lastTouchEnd = now
  }
  
  document.addEventListener('touchend', preventDoubleTapZoom, { passive: false })
  
  return () => {
    document.removeEventListener('touchend', preventDoubleTapZoom)
  }
}
