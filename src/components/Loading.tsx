/**
 * Simplified Loading Components
 */

import React, { memo } from 'react'
import { Loader2 } from 'lucide-react'

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
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Loader2
        className={`${sizeClasses[size]} animate-spin text-blue-600`}
        aria-hidden="true"
      />
      {text && (
        <p className="text-gray-600 font-medium">
          {text}
        </p>
      )}
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

// Simple progress bar for workout generation
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center">
          <LoadingSpinner size="lg" text={text} />
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
