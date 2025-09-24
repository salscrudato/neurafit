// Orientation lock utilities for mobile experience

export const lockOrientation = () => {
  // Try to lock to portrait orientation using the Screen Orientation API
  if ('screen' in window && 'orientation' in window.screen) {
    const screenOrientation = window.screen.orientation as any
    
    if ('lock' in screenOrientation) {
      screenOrientation.lock('portrait').catch((error: any) => {
        console.log('Orientation lock not supported or failed:', error)
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
    const screenOrientation = window.screen.orientation as any
    
    if ('unlock' in screenOrientation) {
      screenOrientation.unlock().catch((error: any) => {
        console.log('Orientation unlock failed:', error)
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
