// Optimized loading spinner component
// Provides consistent loading states with performance optimizations

import { memo } from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  fullScreen?: boolean
  className?: string
}

const LoadingSpinner = memo(({ 
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

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Loader2 
        className={`${sizeClasses[size]} animate-spin text-blue-600`}
        aria-hidden="true"
      />
      {text && (
        <p className={`${textSizeClasses[size]} text-gray-600 font-medium`}>
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
    <div 
      className="flex items-center justify-center p-8"
      role="status"
      aria-label="Loading"
    >
      {spinner}
    </div>
  )
})

LoadingSpinner.displayName = 'LoadingSpinner'

export default LoadingSpinner
