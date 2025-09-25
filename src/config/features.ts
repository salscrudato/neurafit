/**
 * Feature flags configuration for NeuraFit
 */

export interface FeatureFlags {
  adaptivePersonalization: {
    enabled: boolean
    enableFeedbackUI: boolean
    enableIntensityCalibration: boolean
    enableTelemetry: boolean
  }
}

export const defaultFeatureFlags: FeatureFlags = {
  adaptivePersonalization: {
    enabled: true,
    enableFeedbackUI: true,
    enableIntensityCalibration: true,
    enableTelemetry: true
  }
}

/**
 * Get feature flags from environment or use defaults
 */
export function getFeatureFlags(): FeatureFlags {
  // In a production app, you might fetch these from a remote config service
  // For now, we'll use environment variables with fallbacks to defaults
  
  const adaptiveEnabled = import.meta.env.VITE_ADAPTIVE_PERSONALIZATION_ENABLED !== 'false'
  const feedbackEnabled = import.meta.env.VITE_ADAPTIVE_FEEDBACK_UI_ENABLED !== 'false'
  const calibrationEnabled = import.meta.env.VITE_ADAPTIVE_CALIBRATION_ENABLED !== 'false'
  const telemetryEnabled = import.meta.env.VITE_ADAPTIVE_TELEMETRY_ENABLED !== 'false'

  return {
    adaptivePersonalization: {
      enabled: adaptiveEnabled,
      enableFeedbackUI: feedbackEnabled,
      enableIntensityCalibration: calibrationEnabled,
      enableTelemetry: telemetryEnabled
    }
  }
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags()
  return flags[feature].enabled
}

/**
 * Check if adaptive personalization is enabled
 */
export function isAdaptivePersonalizationEnabled(): boolean {
  return getFeatureFlags().adaptivePersonalization.enabled
}

/**
 * Check if feedback UI should be shown
 */
export function isFeedbackUIEnabled(): boolean {
  const flags = getFeatureFlags()
  return flags.adaptivePersonalization.enabled && flags.adaptivePersonalization.enableFeedbackUI
}

/**
 * Check if intensity calibration should be shown
 */
export function isIntensityCalibrationEnabled(): boolean {
  const flags = getFeatureFlags()
  return flags.adaptivePersonalization.enabled && flags.adaptivePersonalization.enableIntensityCalibration
}

/**
 * Check if telemetry should be collected
 */
export function isTelemetryEnabled(): boolean {
  const flags = getFeatureFlags()
  return flags.adaptivePersonalization.enabled && flags.adaptivePersonalization.enableTelemetry
}
