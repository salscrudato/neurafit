// Update Notification Component
// Shows instant notifications when new app versions are available

import { useState, useEffect } from 'react'
import { RefreshCw, Download, X } from 'lucide-react'
import { versionManager } from '../utils/version'

interface UpdateNotificationProps {
  autoUpdate?: boolean
  showDetails?: boolean
}

export default function UpdateNotification({ 
  autoUpdate = false, 
  showDetails = true 
}: UpdateNotificationProps) {
  const [showNotification, setShowNotification] = useState(false)
  const [updateReason, setUpdateReason] = useState<string>('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [countdown, setCountdown] = useState(10)

  useEffect(() => {
    // Listen for version updates
    const handleVersionUpdate = (event: CustomEvent) => {
      console.log('🚀 Update notification triggered:', event.detail)
      setUpdateReason(event.detail.reason || 'New version available')
      setShowNotification(true)
      
      if (autoUpdate) {
        startCountdown()
      }
    }

    // Listen for cache updates
    const handleCacheUpdate = (event: CustomEvent) => {
      console.log('🧹 Cache update notification triggered:', event.detail)
      setUpdateReason('Cache updated')
      setShowNotification(true)
      
      if (autoUpdate) {
        startCountdown()
      }
    }

    window.addEventListener('versionUpdate', handleVersionUpdate as EventListener)
    window.addEventListener('cacheUpdate', handleCacheUpdate as EventListener)

    return () => {
      window.removeEventListener('versionUpdate', handleVersionUpdate as EventListener)
      window.removeEventListener('cacheUpdate', handleCacheUpdate as EventListener)
    }
  }, [autoUpdate])

  const startCountdown = () => {
    setCountdown(10)
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          handleUpdate()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleUpdate = async () => {
    setIsUpdating(true)
    
    try {
      console.log('🔄 Starting app update...')
      await versionManager.forceReload()
    } catch (error) {
      console.error('Update failed:', error)
      setIsUpdating(false)
    }
  }

  const handleDismiss = () => {
    setShowNotification(false)
    setCountdown(10)
  }

  if (!showNotification) return null

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-2xl p-4 animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <h3 className="font-semibold text-sm">Update Available!</h3>
          </div>
          {!autoUpdate && (
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="mb-4">
          <p className="text-sm text-white/90 mb-2">
            A new version of NeuraFit is ready with improvements and bug fixes.
          </p>
          
          {showDetails && (
            <div className="text-xs text-white/70 bg-white/10 rounded p-2">
              <div>Reason: {updateReason}</div>
              <div>Time: {new Date().toLocaleTimeString()}</div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {autoUpdate ? (
            <div className="flex-1">
              <div className="flex items-center justify-center gap-2 bg-white/20 rounded-lg py-2 px-3">
                <RefreshCw size={16} className={isUpdating ? 'animate-spin' : ''} />
                <span className="text-sm font-medium">
                  {isUpdating ? 'Updating...' : `Auto-update in ${countdown}s`}
                </span>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="flex-1 bg-white/20 hover:bg-white/30 disabled:opacity-50 rounded-lg py-2 px-3 text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Update Now
                  </>
                )}
              </button>
              
              <button
                onClick={handleDismiss}
                className="px-3 py-2 text-sm text-white/80 hover:text-white transition-colors"
              >
                Later
              </button>
            </>
          )}
        </div>

        {/* Progress indicator for auto-update */}
        {autoUpdate && !isUpdating && (
          <div className="mt-3">
            <div className="w-full bg-white/20 rounded-full h-1">
              <div 
                className="bg-white h-1 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${((10 - countdown) / 10) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Hook for using update notifications
export function useUpdateNotification() {
  const [hasUpdate, setHasUpdate] = useState(false)
  const [updateDetails, setUpdateDetails] = useState<any>(null)

  useEffect(() => {
    const handleUpdate = (event: CustomEvent) => {
      setHasUpdate(true)
      setUpdateDetails(event.detail)
    }

    window.addEventListener('versionUpdate', handleUpdate as EventListener)
    window.addEventListener('cacheUpdate', handleUpdate as EventListener)

    return () => {
      window.removeEventListener('versionUpdate', handleUpdate as EventListener)
      window.removeEventListener('cacheUpdate', handleUpdate as EventListener)
    }
  }, [])

  const triggerUpdate = async () => {
    setHasUpdate(false)
    await versionManager.forceReload()
  }

  const dismissUpdate = () => {
    setHasUpdate(false)
    setUpdateDetails(null)
  }

  return {
    hasUpdate,
    updateDetails,
    triggerUpdate,
    dismissUpdate
  }
}

// Styles for the slide-in animation
const styles = `
  @keyframes slide-in-right {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  .animate-slide-in-right {
    animation: slide-in-right 0.3s ease-out;
  }
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = styles
  document.head.appendChild(styleSheet)
}
