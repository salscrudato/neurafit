import { useState } from 'react'
import { AlertTriangle, RefreshCw, CreditCard, Clock } from 'lucide-react'
import { useSubscription } from '../hooks/useSubscription'
import { subscriptionService } from '../lib/subscriptionService'

interface SubscriptionErrorHandlerProps {
  error: string
  onRetry?: () => void
  onUpgrade?: () => void
  showUpgradeOption?: boolean
}

export function SubscriptionErrorHandler({ 
  error, 
  onRetry, 
  onUpgrade, 
  showUpgradeOption = true 
}: SubscriptionErrorHandlerProps) {
  const [refreshing, setRefreshing] = useState(false)
  const { subscription, hasUnlimitedWorkouts } = useSubscription()

  const handleRefreshSubscription = async () => {
    setRefreshing(true)
    try {
      const freshSubscription = await subscriptionService.getSubscription()
      if (freshSubscription && (freshSubscription.status === 'active' || freshSubscription.status === 'trialing')) {
        // Subscription is now active, retry the original action
        onRetry?.()
      }
    } catch (error) {
      console.error('Error refreshing subscription:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const isPaymentError = error.includes('402') || error.includes('Payment Required') || error.includes('Subscription required')
  const isRecentSubscriber = subscription?.updatedAt && (Date.now() - subscription.updatedAt) < 300000 // 5 minutes

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
        <h3 className="font-semibold text-red-900">
          {isPaymentError ? 'Subscription Required' : 'Error'}
        </h3>
      </div>

      <div className="space-y-4">
        <p className="text-red-700 text-sm leading-relaxed">
          {isPaymentError ? (
            hasUnlimitedWorkouts ? (
              'There seems to be an issue with your subscription status. This might be a temporary sync issue.'
            ) : (
              'You need an active subscription to generate unlimited workouts.'
            )
          ) : (
            error
          )}
        </p>

        {isRecentSubscriber && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-yellow-800">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Recent Payment Detected</span>
            </div>
            <p className="text-yellow-700 text-xs mt-1">
              Your payment may still be processing. Try refreshing your subscription status.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {/* Refresh Subscription Button */}
          {(isPaymentError || isRecentSubscriber) && (
            <button
              onClick={handleRefreshSubscription}
              disabled={refreshing}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Checking...' : 'Refresh Subscription'}
            </button>
          )}

          {/* Retry Button */}
          {onRetry && !isPaymentError && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Try Again
            </button>
          )}

          {/* Upgrade Button */}
          {showUpgradeOption && isPaymentError && !hasUnlimitedWorkouts && (
            <button
              onClick={onUpgrade}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all"
            >
              <CreditCard className="w-4 h-4" />
              Upgrade to Pro
            </button>
          )}
        </div>

        {/* Help Text */}
        <div className="text-xs text-gray-600 pt-2 border-t border-red-200">
          <p>
            If you recently completed a payment and are still seeing this error, 
            please wait a few minutes for the system to sync, or try refreshing your subscription status.
          </p>
        </div>
      </div>
    </div>
  )
}

interface SubscriptionStatusBannerProps {
  className?: string
}

export function SubscriptionStatusBanner({ className = '' }: SubscriptionStatusBannerProps) {
  const { hasUnlimitedWorkouts, remainingFreeWorkouts, loading } = useSubscription()

  if (loading || hasUnlimitedWorkouts) {
    return null
  }

  const isLowOnWorkouts = remainingFreeWorkouts <= 1
  const isOutOfWorkouts = remainingFreeWorkouts <= 0

  if (!isLowOnWorkouts) {
    return null
  }

  return (
    <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-yellow-800 font-medium">
            {isOutOfWorkouts ? 'No free workouts remaining' : `${remainingFreeWorkouts} free workout${remainingFreeWorkouts === 1 ? '' : 's'} remaining`}
          </p>
          <p className="text-yellow-700 text-sm mt-1">
            {isOutOfWorkouts 
              ? 'Upgrade to Pro for unlimited AI-powered workouts'
              : 'Upgrade to Pro to continue generating unlimited workouts'
            }
          </p>
        </div>
      </div>
    </div>
  )
}

export default SubscriptionErrorHandler
