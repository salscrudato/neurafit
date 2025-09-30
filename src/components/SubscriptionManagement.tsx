import { useState } from 'react'
import { 
  CreditCard, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  ExternalLink,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { useSubscription, useSubscriptionStatus } from '../hooks/useSubscription'
import {
  cancelSubscription,
  reactivateSubscription,
  getCustomerPortalUrl,
  formatDate
} from '../lib/subscription'

interface SubscriptionManagementProps {
  onUpgrade?: () => void
}

export function SubscriptionManagement({ onUpgrade }: SubscriptionManagementProps) {
  const { 
    subscription, 
    hasUnlimitedWorkouts, 
    isInGracePeriod, 
    daysRemaining,
    refreshSubscription 
  } = useSubscription()
  const { status, statusColor, description } = useSubscriptionStatus()
  
  const [loading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  const handleCancelSubscription = async () => {
    if (!subscription?.subscriptionId) return
    
    setActionLoading('cancel')
    setError('')
    setSuccess('')
    
    try {
      await cancelSubscription(subscription.subscriptionId)
      setSuccess('Subscription canceled. You\'ll retain access until the end of your billing period.')
      refreshSubscription()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReactivateSubscription = async () => {
    if (!subscription?.subscriptionId) return
    
    setActionLoading('reactivate')
    setError('')
    setSuccess('')
    
    try {
      await reactivateSubscription(subscription.subscriptionId)
      setSuccess('Subscription reactivated successfully!')
      refreshSubscription()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reactivate subscription')
    } finally {
      setActionLoading(null)
    }
  }

  const handleManageBilling = async () => {
    if (!subscription?.customerId) return
    
    setActionLoading('billing')
    setError('')
    
    try {
      const result = await getCustomerPortalUrl(subscription.customerId)
      window.open(result.url, '_blank')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open billing portal')
    } finally {
      setActionLoading(null)
    }
  }

  if (!subscription) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Subscription</h3>
          <p className="text-gray-600 mb-6">
            You're currently using the free plan with 5 free workouts.
          </p>
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-600 transition-colors"
            >
              Upgrade to Pro
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      {/* Subscription Status Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Subscription Status</h3>
          <button
            onClick={refreshSubscription}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Status */}
          <div className="flex items-center gap-3">
            <div className={`
              w-3 h-3 rounded-full
              ${statusColor === 'green' ? 'bg-green-500' : ''}
              ${statusColor === 'yellow' ? 'bg-yellow-500' : ''}
              ${statusColor === 'red' ? 'bg-red-500' : ''}
              ${statusColor === 'blue' ? 'bg-blue-500' : ''}
              ${statusColor === 'gray' ? 'bg-gray-500' : ''}
            `} />
            <div>
              <p className="font-medium text-gray-900">{status}</p>
              <p className="text-sm text-gray-600">{description}</p>
            </div>
          </div>

          {/* Usage */}
          <div>
            <p className="font-medium text-gray-900">Workouts Generated</p>
            <p className="text-sm text-gray-600">
              {subscription.workoutCount || 0} total
              {!hasUnlimitedWorkouts && (
                <span className="ml-2">
                  ({subscription.freeWorkoutsUsed || 0}/{subscription.freeWorkoutLimit || 5} free used)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Billing Period */}
        {subscription.currentPeriodEnd && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>
                {isInGracePeriod ? 'Access until' : 'Next billing'}: {' '}
                {formatDate(subscription.currentPeriodEnd)}
                {daysRemaining > 0 && (
                  <span className="ml-2">({daysRemaining} days)</span>
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage Subscription</h3>
        
        <div className="space-y-3">
          {/* Billing Portal */}
          {subscription.customerId && (
            <button
              onClick={handleManageBilling}
              disabled={actionLoading === 'billing'}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-gray-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Manage Billing</p>
                  <p className="text-sm text-gray-600">Update payment method, view invoices</p>
                </div>
              </div>
              {actionLoading === 'billing' ? (
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              ) : (
                <ExternalLink className="w-5 h-5 text-gray-400" />
              )}
            </button>
          )}

          {/* Cancel/Reactivate */}
          {hasUnlimitedWorkouts && subscription.subscriptionId && (
            <button
              onClick={isInGracePeriod ? handleReactivateSubscription : handleCancelSubscription}
              disabled={actionLoading === 'cancel' || actionLoading === 'reactivate'}
              className={`
                w-full flex items-center justify-between p-4 border rounded-xl transition-colors disabled:opacity-50
                ${isInGracePeriod 
                  ? 'border-green-200 hover:bg-green-50' 
                  : 'border-red-200 hover:bg-red-50'
                }
              `}
            >
              <div className="text-left">
                <p className={`font-medium ${isInGracePeriod ? 'text-green-900' : 'text-red-900'}`}>
                  {isInGracePeriod ? 'Reactivate Subscription' : 'Cancel Subscription'}
                </p>
                <p className={`text-sm ${isInGracePeriod ? 'text-green-600' : 'text-red-600'}`}>
                  {isInGracePeriod 
                    ? 'Resume your subscription and continue unlimited access'
                    : 'Cancel at any time, access continues until period end'
                  }
                </p>
              </div>
              {(actionLoading === 'cancel' || actionLoading === 'reactivate') && (
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              )}
            </button>
          )}

          {/* Upgrade */}
          {!hasUnlimitedWorkouts && onUpgrade && (
            <button
              onClick={onUpgrade}
              className="w-full flex items-center justify-between p-4 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors"
            >
              <div className="text-left">
                <p className="font-medium text-blue-900">Upgrade to Pro</p>
                <p className="text-sm text-blue-600">Get unlimited AI-powered workouts</p>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default SubscriptionManagement
