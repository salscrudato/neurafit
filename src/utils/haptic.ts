/**
 * Haptic Feedback Utility
 * Provides tactile feedback for mobile interactions
 */

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'

const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 50, 10],
  warning: [20, 100, 20],
  error: [30, 100, 30, 100, 30],
}

/**
 * Trigger haptic feedback on supported devices
 */
export function triggerHaptic(type: HapticType = 'light'): void {
  // Check if vibration API is supported
  if (!('vibrate' in navigator)) {
    return
  }

  const pattern = HAPTIC_PATTERNS[type]
  
  try {
    navigator.vibrate(pattern)
  } catch (error) {
    // Silently fail if vibration is not supported or blocked
    console.debug('Haptic feedback not available:', error)
  }
}

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  return 'vibrate' in navigator
}

/**
 * Cancel any ongoing haptic feedback
 */
export function cancelHaptic(): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(0)
  }
}

