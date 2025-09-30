// Advanced haptic feedback system for NeuraFit
// Provides contextual vibration patterns for different workout actions

import React from 'react'

export interface HapticPattern {
  pattern: readonly number[]
  intensity?: 'light' | 'medium' | 'heavy'
  description: string
}

export const HapticPatterns = {
  // Basic feedback
  tap: {
    pattern: [10],
    intensity: 'light' as const,
    description: 'Light tap feedback'
  },
  
  success: {
    pattern: [50, 50, 100],
    intensity: 'medium' as const,
    description: 'Success confirmation'
  },
  
  error: {
    pattern: [100, 100, 100, 100, 100],
    intensity: 'heavy' as const,
    description: 'Error alert'
  },
  
  // Workout-specific patterns
  setComplete: {
    pattern: [30, 30, 60],
    intensity: 'medium' as const,
    description: 'Set completion feedback'
  },
  
  exerciseComplete: {
    pattern: [50, 50, 100, 50, 150],
    intensity: 'medium' as const,
    description: 'Exercise completion celebration'
  },
  
  workoutComplete: {
    pattern: [100, 100, 200, 100, 200, 100, 300],
    intensity: 'heavy' as const,
    description: 'Workout completion celebration'
  },
  
  restTimer: {
    pattern: [200],
    intensity: 'medium' as const,
    description: 'Rest timer notification'
  },
  
  restAlmostDone: {
    pattern: [50, 50, 50],
    intensity: 'light' as const,
    description: 'Rest almost finished warning'
  },
  
  restComplete: {
    pattern: [100, 50, 100],
    intensity: 'medium' as const,
    description: 'Rest period complete'
  },
  
  // Navigation feedback
  swipeLeft: {
    pattern: [20, 10, 30],
    intensity: 'light' as const,
    description: 'Swipe left navigation'
  },
  
  swipeRight: {
    pattern: [30, 10, 20],
    intensity: 'light' as const,
    description: 'Swipe right navigation'
  },
  
  swipeUp: {
    pattern: [40],
    intensity: 'light' as const,
    description: 'Swipe up action'
  },
  
  swipeDown: {
    pattern: [60],
    intensity: 'light' as const,
    description: 'Swipe down action'
  },
  
  // Weight entry feedback
  weightEntered: {
    pattern: [25, 25, 50],
    intensity: 'light' as const,
    description: 'Weight value entered'
  },
  
  weightIncrement: {
    pattern: [15],
    intensity: 'light' as const,
    description: 'Weight increment/decrement'
  },
  
  // Progress feedback
  progressMilestone: {
    pattern: [80, 50, 120, 50, 80],
    intensity: 'medium' as const,
    description: 'Progress milestone reached'
  },
  
  personalRecord: {
    pattern: [150, 100, 200, 100, 250],
    intensity: 'heavy' as const,
    description: 'Personal record achieved'
  }
} as const

export type HapticPatternName = keyof typeof HapticPatterns

class HapticManager {
  private isSupported: boolean
  private isEnabled: boolean = true
  private lastVibration: number = 0
  private minInterval: number = 50 // Minimum time between vibrations

  constructor() {
    this.isSupported = 'vibrate' in navigator
    
    // Check user preferences
    this.loadPreferences()
  }

  private loadPreferences() {
    const stored = localStorage.getItem('neurafit-haptics-enabled')
    this.isEnabled = stored !== 'false' // Default to enabled
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled
    localStorage.setItem('neurafit-haptics-enabled', enabled.toString())
  }

  public isHapticsEnabled(): boolean {
    return this.isSupported && this.isEnabled
  }

  public vibrate(pattern: HapticPattern | HapticPatternName, force: boolean = false) {
    if (!this.isHapticsEnabled() && !force) {
      return false
    }

    const now = Date.now()
    if (now - this.lastVibration < this.minInterval) {
      return false // Rate limiting
    }

    let hapticPattern: HapticPattern
    
    if (typeof pattern === 'string') {
      hapticPattern = HapticPatterns[pattern]
    } else {
      hapticPattern = pattern
    }

    if (!hapticPattern) {
      console.warn('Unknown haptic pattern:', pattern)
      return false
    }

    try {
      // Use the Vibration API
      navigator.vibrate(hapticPattern.pattern)
      this.lastVibration = now
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔊 Haptic: ${hapticPattern.description}`, hapticPattern.pattern)
      }
      
      return true
    } catch (error) {
      console.warn('Haptic feedback failed:', error)
      return false
    }
  }

  // Convenience methods for common patterns
  public tap() {
    return this.vibrate('tap')
  }

  public success() {
    return this.vibrate('success')
  }

  public error() {
    return this.vibrate('error')
  }

  public setComplete() {
    return this.vibrate('setComplete')
  }

  public exerciseComplete() {
    return this.vibrate('exerciseComplete')
  }

  public workoutComplete() {
    return this.vibrate('workoutComplete')
  }

  public restTimer() {
    return this.vibrate('restTimer')
  }

  public restComplete() {
    return this.vibrate('restComplete')
  }

  public weightEntered() {
    return this.vibrate('weightEntered')
  }

  public swipe(direction: 'left' | 'right' | 'up' | 'down') {
    const patternMap = {
      left: 'swipeLeft',
      right: 'swipeRight',
      up: 'swipeUp',
      down: 'swipeDown'
    } as const
    
    return this.vibrate(patternMap[direction])
  }

  // Create custom patterns
  public createPattern(
    pattern: number[],
    intensity: 'light' | 'medium' | 'heavy' = 'medium',
    description: string = 'Custom pattern'
  ): HapticPattern {
    return {
      pattern,
      intensity,
      description
    }
  }

  // Test haptic feedback
  public test() {
    if (!this.isSupported) {
      alert('Haptic feedback is not supported on this device')
      return
    }

    const testPattern = this.createPattern([100, 100, 200, 100, 300], 'medium', 'Test pattern')
    this.vibrate(testPattern, true)
  }
}

// Singleton instance
export const haptics = new HapticManager()

// React hook for haptic feedback
export function useHaptics() {
  const vibrate = React.useCallback((pattern: HapticPattern | HapticPatternName) => {
    return haptics.vibrate(pattern)
  }, [])

  const setEnabled = React.useCallback((enabled: boolean) => {
    haptics.setEnabled(enabled)
  }, [])

  const isEnabled = React.useCallback(() => {
    return haptics.isHapticsEnabled()
  }, [])

  return {
    vibrate,
    setEnabled,
    isEnabled,
    tap: haptics.tap.bind(haptics),
    success: haptics.success.bind(haptics),
    error: haptics.error.bind(haptics),
    setComplete: haptics.setComplete.bind(haptics),
    exerciseComplete: haptics.exerciseComplete.bind(haptics),
    workoutComplete: haptics.workoutComplete.bind(haptics),
    restTimer: haptics.restTimer.bind(haptics),
    restComplete: haptics.restComplete.bind(haptics),
    weightEntered: haptics.weightEntered.bind(haptics),
    swipe: haptics.swipe.bind(haptics)
  }
}

export default haptics
