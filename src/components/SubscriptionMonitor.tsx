/**
 * Simplified Subscription Monitor
 * Basic subscription status monitoring and refresh functionality
 */

import { useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { useSubscription } from '../hooks/useSubscription'

export function SubscriptionMonitor() {
  const { subscription: _subscription, loading, refreshSubscription } = useSubscription()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showNotification, setShowNotification] = useState(false)

  const _handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshSubscription()
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 3000)
    } catch (error) {
      console.error('Failed to refresh subscription:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Show notification if subscription needs attention
  if (!showNotification || loading) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900">
              Subscription Updated
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Your subscription status has been refreshed.
            </p>
          </div>
          <button
            onClick={() => setShowNotification(false)}
            className="ml-3 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isRefreshing && (
          <div className="mt-3 flex items-center text-sm text-blue-600">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            Refreshing...
          </div>
        )}
      </div>
    </div>
  )
}
