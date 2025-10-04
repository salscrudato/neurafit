/**
 * Simplified Loading Components
 */

import React, { memo } from 'react'
import { Loader2, Brain } from 'lucide-react'

// Simple loading spinner
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  fullScreen?: boolean
  className?: string
}

export const LoadingSpinner = memo(({
  size = 'md',
  text,
  fullScreen = false,
  className = ''
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`} role="status" aria-live="polite">
      <Loader2
        className={`${sizeClasses[size]} animate-spin text-blue-600`}
        aria-hidden="true"
      />
      {text && (
        <p className="text-gray-600 font-medium" aria-label={text}>
          {text}
        </p>
      )}
      <span className="sr-only">Loading...</span>
    </div>
  )

  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50"
        role="status"
        aria-label="Loading"
      >
        {spinner}
      </div>
    )
  }

  return (
    <div role="status" aria-label="Loading">
      {spinner}
    </div>
  )
})

LoadingSpinner.displayName = 'LoadingSpinner'

// Simple skeleton component
export function SkeletonBase({
  className = '',
  variant = 'default'
}: {
  className?: string;
  variant?: 'default' | 'text' | 'circular' | 'rectangular';
}) {
  const variantClasses = {
    default: 'rounded',
    text: 'rounded-sm',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  }

  return (
    <div
      className={`animate-pulse bg-gray-200 ${variantClasses[variant]} ${className}`}
      role="status"
      aria-label="Loading content"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

// Enhanced workout generation loading component
interface ProgressiveLoadingBarProps {
  isVisible: boolean
  onComplete?: () => void
  text?: string
}

export function ProgressiveLoadingBar({
  isVisible,
  onComplete: _onComplete,
  text = 'Generating your workout...'
}: ProgressiveLoadingBarProps) {
  if (!isVisible) return null

  return <EnhancedWorkoutLoader text={text} />
}

// Enhanced workout generation loader with AI-themed animations
interface EnhancedWorkoutLoaderProps {
  text?: string
}

export function EnhancedWorkoutLoader({
  text: _text = 'Generating your personalized workout...'
}: EnhancedWorkoutLoaderProps) {
  const [currentMessage, setCurrentMessage] = React.useState(0)

  const messages = React.useMemo(() => [
    'Analyzing your fitness profile...',
    'Selecting optimal exercises...',
    'Calculating perfect intensity...',
    'Personalizing your workout...',
    'Finalizing your training plan...'
  ], [])

  // Cycle through messages every 3.5 seconds to match ~17.5s average API response time
  // This ensures the animation completes one full cycle (5 messages × 3.5s = 17.5s)
  React.useEffect(() => {
    if (import.meta.env.MODE === 'development') {
      console.log('[LOADING] Animation started at:', new Date().toISOString())
    }

    const interval = setInterval(() => {
      setCurrentMessage((prev) => {
        const next = (prev + 1) % messages.length
        if (import.meta.env.MODE === 'development') {
          console.log(`[LOADING] Message ${next + 1}/${messages.length}: ${messages[next]}`)
        }
        return next
      })
    }, 3500)

    return () => {
      clearInterval(interval)
      if (import.meta.env.MODE === 'development') {
        console.log('[LOADING] Animation ended at:', new Date().toISOString())
      }
    }
  }, [messages])
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      {/* Background animated elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-full blur-xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 rounded-full blur-xl animate-pulse delay-500" />
      </div>

      {/* Main loading card */}
      <div className="relative bg-gradient-to-br from-white/95 via-white/90 to-white/95 backdrop-blur-xl rounded-3xl p-8 sm:p-10 max-w-md w-full shadow-2xl shadow-black/20 border border-white/20 animate-breathe">
        {/* Animated border glow */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 blur-sm animate-pulse" />

        <div className="relative text-center space-y-6">
          {/* AI Brain Icon with pulsing animation */}
          <div className="relative mx-auto w-20 h-20 mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 rounded-2xl animate-pulse shadow-lg shadow-blue-500/30" />
            <div className="relative w-full h-full bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
              <Brain className="w-10 h-10 text-white animate-pulse" />
            </div>
            {/* Orbiting dots */}
            <div className="absolute -inset-4">
              <div className="absolute top-0 left-1/2 w-2 h-2 bg-blue-400 rounded-full animate-spin origin-bottom transform -translate-x-1/2" style={{ animationDuration: '3s' }} />
              <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-indigo-400 rounded-full animate-spin origin-top transform -translate-x-1/2" style={{ animationDuration: '3s', animationDelay: '1s' }} />
              <div className="absolute left-0 top-1/2 w-2 h-2 bg-purple-400 rounded-full animate-spin origin-right transform -translate-y-1/2" style={{ animationDuration: '3s', animationDelay: '2s' }} />
            </div>
          </div>

          {/* Enhanced loading text */}
          <div className="space-y-3">
            <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent leading-tight">
              AI is crafting your workout
            </h3>
            <div className="h-12 flex items-center justify-center">
              <p className="text-gray-600 font-medium text-sm sm:text-base leading-relaxed transition-all duration-500 ease-in-out">
                {messages[currentMessage]}
              </p>
            </div>
          </div>

          {/* Futuristic Loading Spinner */}
          <div className="flex justify-center items-center py-6">
            <div className="relative w-24 h-24">
              {/* Outer rotating ring */}
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-indigo-500 animate-spin" style={{ animationDuration: '1.5s' }} />

              {/* Middle rotating ring - opposite direction */}
              <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-purple-500 border-l-pink-500 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />

              {/* Inner pulsing core */}
              <div className="absolute inset-6 rounded-full bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 animate-pulse shadow-lg shadow-blue-500/50" />

              {/* Center dot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-white shadow-lg animate-pulse" />
              </div>

              {/* Orbiting particles */}
              <div className="absolute inset-0">
                <div className="absolute top-0 left-1/2 w-2 h-2 bg-blue-400 rounded-full -translate-x-1/2 animate-ping" style={{ animationDuration: '2s' }} />
                <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-indigo-400 rounded-full -translate-x-1/2 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                <div className="absolute left-0 top-1/2 w-2 h-2 bg-purple-400 rounded-full -translate-y-1/2 animate-ping" style={{ animationDuration: '2s', animationDelay: '1s' }} />
                <div className="absolute right-0 top-1/2 w-2 h-2 bg-pink-400 rounded-full -translate-y-1/2 animate-ping" style={{ animationDuration: '2s', animationDelay: '1.5s' }} />
              </div>
            </div>
          </div>

          {/* Step indicator dots */}
          <div className="flex justify-center items-center space-x-2">
            {messages.map((_, index) => (
              <div
                key={index}
                className={`transition-all duration-500 rounded-full ${
                  index === currentMessage
                    ? 'w-8 h-2 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 shadow-md shadow-blue-500/30'
                    : index < currentMessage
                    ? 'w-2 h-2 bg-gradient-to-r from-blue-400 to-indigo-500'
                    : 'w-2 h-2 bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Motivational message */}
          <div className="pt-2">
            <p className="text-xs text-gray-500 font-medium italic">
              Creating the perfect workout just for you...
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Simple skeleton loaders for common use cases
export function WorkoutHistorySkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <SkeletonBase className="h-6 w-32" variant="text" />
            <SkeletonBase className="h-4 w-20" variant="text" />
          </div>
          <div className="space-y-2">
            <SkeletonBase className="h-4 w-full" variant="text" />
            <SkeletonBase className="h-4 w-3/4" variant="text" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function WorkoutDetailSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonBase className="h-8 w-48" variant="text" />
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border rounded-lg p-4">
            <SkeletonBase className="h-6 w-40 mb-2" variant="text" />
            <SkeletonBase className="h-4 w-24" variant="text" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Default export for backward compatibility
export default LoadingSpinner
