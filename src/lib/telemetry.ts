import { isTelemetryEnabled } from '../config/features'

/**
 * Telemetry event types for adaptive personalization
 */
export type TelemetryEvent = 
  | 'adaptive_feedback_submitted'
  | 'adaptive_state_updated'
  | 'workout_generated_with_intensity'
  | 'adaptive_personalization_error'

/**
 * Telemetry event data structure
 */
export interface TelemetryEventData {
  event: TelemetryEvent
  uid: string
  timestamp: number
  data: Record<string, any>
}

/**
 * Log a telemetry event
 */
export function logTelemetryEvent(
  event: TelemetryEvent,
  uid: string,
  data: Record<string, any> = {}
): void {
  if (!isTelemetryEnabled()) {
    return
  }

  const eventData: TelemetryEventData = {
    event,
    uid,
    timestamp: Date.now(),
    data: {
      ...data,
      // Remove any PII - only include scalar values and non-identifying data
      userAgent: navigator.userAgent.substring(0, 50), // Truncated for privacy
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      timestamp: new Date().toISOString()
    }
  }

  // Log to console in development
  if (import.meta.env.DEV) {
    console.log('Telemetry Event:', eventData)
  }

  // In production, you would send this to your analytics service
  // For now, we'll just store it locally for debugging
  try {
    const existingEvents = JSON.parse(localStorage.getItem('nf_telemetry_events') || '[]')
    existingEvents.push(eventData)
    
    // Keep only the last 100 events to avoid storage bloat
    if (existingEvents.length > 100) {
      existingEvents.splice(0, existingEvents.length - 100)
    }
    
    localStorage.setItem('nf_telemetry_events', JSON.stringify(existingEvents))
  } catch (error) {
    console.warn('Failed to store telemetry event:', error)
  }
}

/**
 * Log adaptive feedback submission
 */
export function logAdaptiveFeedbackSubmitted(
  uid: string,
  feedback: 'easy' | 'right' | 'hard',
  rpe: number | null,
  completionRate: number
): void {
  logTelemetryEvent('adaptive_feedback_submitted', uid, {
    feedback,
    rpe,
    completionRate: Math.round(completionRate * 100) / 100, // Round to 2 decimal places
    hasRpe: rpe !== null
  })
}

/**
 * Log adaptive state update
 */
export function logAdaptiveStateUpdated(
  uid: string,
  oldScalar: number,
  newScalar: number,
  feedback: 'easy' | 'right' | 'hard',
  completionRate: number
): void {
  logTelemetryEvent('adaptive_state_updated', uid, {
    oldScalar: Math.round(oldScalar * 100) / 100,
    newScalar: Math.round(newScalar * 100) / 100,
    scalarChange: Math.round((newScalar - oldScalar) * 100) / 100,
    feedback,
    completionRate: Math.round(completionRate * 100) / 100
  })
}

/**
 * Log workout generation with intensity
 */
export function logWorkoutGeneratedWithIntensity(
  uid: string,
  targetIntensity: number,
  workoutType: string,
  duration: number,
  hasProgressionNote: boolean
): void {
  logTelemetryEvent('workout_generated_with_intensity', uid, {
    targetIntensity: Math.round(targetIntensity * 100) / 100,
    intensityDelta: Math.round((targetIntensity - 1.0) * 100),
    workoutType,
    duration,
    hasProgressionNote,
    isCalibrated: targetIntensity !== 1.0
  })
}

/**
 * Log adaptive personalization error
 */
export function logAdaptivePersonalizationError(
  uid: string,
  error: string,
  context: string,
  additionalData: Record<string, any> = {}
): void {
  logTelemetryEvent('adaptive_personalization_error', uid, {
    error: error.substring(0, 200), // Truncate error message
    context,
    ...additionalData
  })
}

/**
 * Get stored telemetry events (for debugging)
 */
export function getTelemetryEvents(): TelemetryEventData[] {
  try {
    return JSON.parse(localStorage.getItem('nf_telemetry_events') || '[]')
  } catch {
    return []
  }
}

/**
 * Clear stored telemetry events
 */
export function clearTelemetryEvents(): void {
  localStorage.removeItem('nf_telemetry_events')
}

/**
 * Get telemetry summary for debugging
 */
export function getTelemetrySummary(): Record<string, number> {
  const events = getTelemetryEvents()
  const summary: Record<string, number> = {}
  
  events.forEach(event => {
    summary[event.event] = (summary[event.event] || 0) + 1
  })
  
  return summary
}
