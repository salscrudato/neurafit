/**
 * Offline Indicator Component
 * 
 * Shows a banner when the user is offline and provides
 * helpful information about offline functionality
 */

import React, { useState, useEffect } from 'react'
import { WifiOff, RefreshCw } from 'lucide-react'

interface OfflineIndicatorProps {
  className?: string
}

export const OfflineIndicator = React.memo(function OfflineIndicator({
  className = ''
}: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowReconnected(true)
      
      // Hide reconnected message after 3 seconds
      setTimeout(() => {
        setShowReconnected(false)
      }, 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowReconnected(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Don't render anything if online and not showing reconnected message
  if (isOnline && !showReconnected) {
    return null
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 ${className}`}
      role="alert"
      aria-live="assertive"
    >
      {!isOnline ? (
        <div className="bg-orange-500 text-white px-4 py-3 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <WifiOff className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">You're offline</p>
                <p className="text-xs opacity-90">
                  Some features may be limited. Check your connection.
                </p>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
              aria-label="Retry connection"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-green-500 text-white px-4 py-3 shadow-lg animate-slide-down">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </div>
            <p className="font-medium text-sm">Back online!</p>
          </div>
        </div>
      )}
    </div>
  )
})

/**
 * Offline Error Message Component
 * 
 * Shows a friendly error message when an action fails due to being offline
 */
interface OfflineErrorMessageProps {
  action?: string
  onRetry?: () => void
  className?: string
}

export const OfflineErrorMessage = React.memo(function OfflineErrorMessage({
  action = 'complete this action',
  onRetry,
  className = ''
}: OfflineErrorMessageProps) {
  return (
    <div
      className={`bg-orange-50 border border-orange-200 rounded-lg p-4 ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <WifiOff className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-orange-900 text-sm mb-1">
            No internet connection
          </h3>
          <p className="text-orange-700 text-sm mb-3">
            You need to be online to {action}. Please check your connection and try again.
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

/**
 * Hook to detect online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

