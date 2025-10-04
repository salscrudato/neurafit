import { useState } from 'react'
import {
  AlertTriangle,
  RefreshCw,
  CreditCard,
  Clock,
  CheckCircle,
  Crown,
  X,
  Loader2,
  ExternalLink,
  Calendar,
  XCircle
} from 'lucide-react'
import { useSubscription, useSubscriptionStatus } from '../hooks/useSubscription'
import { subscriptionService, formatDate } from '../lib/subscriptionService'
import { PaymentForm } from './PaymentForm'
import { SUBSCRIPTION_PLANS, formatPrice } from '../lib/stripe-config'
import { ConfirmModal } from './Modal'
import { announceToScreenReader } from '../lib/accessibility'

// Unified Subscription Manager Component
// Consolidates: SubscriptionErrorHandler, SubscriptionMonitor, SimpleSubscription, 
// SubscriptionManagement, SubscriptionPlans, SubscriptionStatusCard

interface SubscriptionManagerProps {
  mode?: 'error' | 'plans' | 'management' | 'status'
  error?: string
  onRetry?: () => void
  onClose?: () => void
  onSuccess?: () => void
  showUpgradeOption?: boolean
  className?: string
}

export function SubscriptionManager({ 
  mode = 'status',
  error,
  onRetry,
  onClose,
  onSuccess,
  showUpgradeOption = true,
  className = ''
}: SubscriptionManagerProps) {
  const [showPayment, setShowPayment] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const { 
    subscription, 
    hasUnlimitedWorkouts, 
    remainingFreeWorkouts,
    isInGracePeriod,
    daysRemaining,
    loading,
    refreshSubscription 
  } = useSubscription()
  
  const { status, statusColor, description } = useSubscriptionStatus()

  // Helper functions
  async function handleRefreshSubscription() {
    setRefreshing(true)
    setLocalError('')
    announceToScreenReader('Refreshing subscription status', 'polite')
    try {
      await refreshSubscription()
      if (subscription?.status === 'active' || subscription?.status === 'trialing') {
        onRetry?.()
      }
      setSuccess('Subscription refreshed successfully')
      announceToScreenReader('Subscription refreshed successfully', 'polite')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh subscription'
      setLocalError(errorMessage)
      announceToScreenReader(`Error: ${errorMessage}`, 'assertive')
    } finally {
      setRefreshing(false)
    }
  }

  function handlePaymentSuccess() {
    setTimeout(() => {
      onSuccess?.()
      onClose?.()
      window.location.reload()
    }, 2000)
  }

  async function handleManageBilling() {
    if (!subscription?.customerId) return

    setActionLoading('billing')
    setLocalError('')

    try {
      const url = await subscriptionService.getCustomerPortalUrl()
      if (url) window.open(url, '_blank')
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to open billing portal')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleCancelSubscription() {
    if (!subscription?.subscriptionId) {
      setLocalError('Unable to cancel: subscription information not found. Please refresh the page and try again.')
      return
    }

    setActionLoading('cancel')
    setLocalError('')
    setShowCancelConfirm(false)

    try {
      const success = await subscriptionService.cancelSubscription()
      if (success) {
        setSuccess('Your subscription has been cancelled. You\'ll continue to have access until the end of your current billing period.')
        // Refresh subscription data
        await handleRefreshSubscription()
      } else {
        setLocalError('Failed to cancel subscription. Please try again or contact support if the issue persists.')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel subscription'
      console.error('Cancellation error:', err)

      // Provide more helpful error messages
      if (errorMessage.includes('not found')) {
        setLocalError('Unable to find your subscription. Please refresh the page and try again.')
      } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
        setLocalError('Network error. Please check your connection and try again.')
      } else {
        setLocalError(`${errorMessage}. If this problem continues, please contact support.`)
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReactivateSubscription() {
    if (!subscription?.subscriptionId) {
      setLocalError('Unable to reactivate: subscription information not found. Please refresh the page and try again.')
      return
    }

    setActionLoading('reactivate')
    setLocalError('')

    try {
      const success = await subscriptionService.reactivateSubscription()
      if (success) {
        setSuccess('Your subscription has been reactivated! You\'ll continue to have unlimited access.')
        // Refresh subscription data
        await handleRefreshSubscription()
      } else {
        setLocalError('Failed to reactivate subscription. Please try again or contact support if the issue persists.')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reactivate subscription'
      console.error('Reactivation error:', err)

      // Provide more helpful error messages
      if (errorMessage.includes('not found')) {
        setLocalError('Unable to find your subscription. Please refresh the page and try again.')
      } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
        setLocalError('Network error. Please check your connection and try again.')
      } else {
        setLocalError(`${errorMessage}. If this problem continues, please contact support.`)
      }
    } finally {
      setActionLoading(null)
    }
  }

  // Error handling mode
  if (mode === 'error' && error) {
    return <ErrorDisplay 
      error={error}
      subscription={subscription}
      hasUnlimitedWorkouts={hasUnlimitedWorkouts}
      refreshing={refreshing}
      onRefresh={handleRefreshSubscription}
      onRetry={onRetry}
      onUpgrade={() => setShowPayment(true)}
      showUpgradeOption={showUpgradeOption}
    />
  }

  // Plans selection mode
  if (mode === 'plans' || showPayment) {
    return <PlansDisplay
      showPayment={showPayment}
      onSelectPlan={() => setShowPayment(true)}
      onPaymentSuccess={handlePaymentSuccess}
      onPaymentError={(err) => setLocalError(err)}
      onBack={() => setShowPayment(false)}
      onClose={onClose}
    />
  }

  // Management mode
  if (mode === 'management') {
    return <ManagementDisplay
      subscription={subscription}
      status={status}
      statusColor={statusColor}
      description={description}
      hasUnlimitedWorkouts={hasUnlimitedWorkouts}
      isInGracePeriod={isInGracePeriod}
      daysRemaining={daysRemaining}
      actionLoading={actionLoading}
      error={localError}
      success={success}
      onManageBilling={handleManageBilling}
      onCancelSubscription={() => setShowCancelConfirm(true)}
      onReactivateSubscription={handleReactivateSubscription}
      onRefresh={handleRefreshSubscription}
      refreshing={refreshing}
      showCancelConfirm={showCancelConfirm}
      onConfirmCancel={handleCancelSubscription}
      onCancelCancel={() => setShowCancelConfirm(false)}
    />
  }

  // Status display mode (default)
  return <StatusDisplay
    hasUnlimitedWorkouts={hasUnlimitedWorkouts}
    remainingFreeWorkouts={remainingFreeWorkouts}
    loading={loading}
    className={className}
  />
}

// Error Display Component
interface ErrorDisplayProps {
  error: string
  subscription: unknown
  hasUnlimitedWorkouts: boolean
  refreshing: boolean
  onRefresh: () => void
  onRetry?: () => void
  onUpgrade: () => void
  showUpgradeOption: boolean
}

function ErrorDisplay({ 
  error, 
  subscription, 
  hasUnlimitedWorkouts, 
  refreshing, 
  onRefresh, 
  onRetry, 
  onUpgrade, 
  showUpgradeOption 
}: ErrorDisplayProps) {
  const isPaymentError = error.includes('402') || error.includes('Payment Required') || error.includes('Subscription required')
  const isRecentSubscriber = (subscription as { updatedAt?: number })?.updatedAt && (Date.now() - (subscription as { updatedAt: number }).updatedAt) < 300000

  return (
    <div className="group relative rounded-3xl border border-red-200/60 bg-gradient-to-br from-red-50/80 via-red-50/60 to-white/90 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-red-200/30 hover:shadow-2xl hover:shadow-red-200/40 transition-all duration-500 max-w-2xl mx-auto">
      <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-gradient-to-tr from-red-400/20 to-pink-400/10 opacity-50 blur-2xl group-hover:opacity-70 group-hover:scale-110 transition-all duration-500" />

      <div className="relative">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-red-500 via-red-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-xl shadow-red-500/30 group-hover:shadow-red-500/50 group-hover:scale-110 transition-all duration-500">
            <AlertTriangle className="w-7 h-7 text-white" />
          </div>
          <h3 className="font-bold text-xl sm:text-2xl text-red-900 leading-tight">
            {isPaymentError ? 'Subscription Required' : 'Error'}
          </h3>
        </div>

        <div className="space-y-6">
          <p className="text-red-700/90 text-base sm:text-lg leading-relaxed font-medium">
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
            <div className="bg-gradient-to-r from-yellow-50/80 to-amber-50/60 border border-yellow-200/60 rounded-2xl p-4 sm:p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-yellow-800">
                <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full flex items-center justify-center">
                  <Clock className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm sm:text-base font-semibold">Recent Payment Detected</span>
              </div>
              <p className="text-yellow-700/90 text-sm sm:text-base mt-2 leading-relaxed font-medium">
                Your payment may still be processing. Try refreshing your subscription status.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            {(isPaymentError || isRecentSubscriber) && (
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className="flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Checking...' : 'Refresh Subscription'}
              </button>
            )}

            {onRetry && !isPaymentError && (
              <button
                onClick={onRetry}
                className="px-6 py-3 bg-gradient-to-r from-slate-600 to-gray-600 text-white rounded-xl hover:from-slate-700 hover:to-gray-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
              >
                Try Again
              </button>
            )}

            {showUpgradeOption && isPaymentError && !hasUnlimitedWorkouts && (
              <button
                onClick={onUpgrade}
                className="flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
              >
                <CreditCard className="w-5 h-5" />
                Upgrade to Pro
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Status Display Component
interface StatusDisplayProps {
  hasUnlimitedWorkouts: boolean
  remainingFreeWorkouts: number
  loading: boolean
  className: string
}

function StatusDisplay({ hasUnlimitedWorkouts: _hasUnlimitedWorkouts, remainingFreeWorkouts: _remainingFreeWorkouts, loading: _loading, className: _className }: StatusDisplayProps) {
  // Always return null to hide the subscription status cards
  return null
}

// Plans Display Component
interface PlansDisplayProps {
  showPayment: boolean
  onSelectPlan: () => void
  onPaymentSuccess: () => void
  onPaymentError: (_error: string) => void
  onBack: () => void
  onClose?: () => void
}

function PlansDisplay({ showPayment, onSelectPlan, onPaymentSuccess, onPaymentError, onBack, onClose }: PlansDisplayProps) {
  const plan = SUBSCRIPTION_PLANS[0] // Single plan

  if (showPayment) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Complete Payment</h2>
              <button onClick={onBack} className="text-gray-400 hover:text-gray-600" aria-label="Go back to plan selection">
                <X className="w-6 h-6" aria-hidden="true" />
              </button>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Crown className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">{plan.name}</span>
              </div>
              <p className="text-blue-700 text-sm mb-2">{plan.description}</p>
              <p className="text-2xl font-bold text-blue-900">
                {formatPrice(plan.price)}/month
              </p>
            </div>

            <PaymentForm
              priceId={plan.stripePriceId}
              onSuccess={onPaymentSuccess}
              onError={onPaymentError}
              onCancel={onBack}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Upgrade to Pro</h2>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close upgrade dialog">
              <X className="w-6 h-6" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{plan.name}</h3>
          <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {formatPrice(plan.price)}<span className="text-lg font-normal text-gray-600">/month</span>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {plan.features.map((feature, index) => (
            <div key={index} className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span className="text-gray-700">{feature}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onSelectPlan}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2"
        >
          Subscribe Now
          <Crown className="w-4 h-4" />
        </button>

        <p className="text-xs text-gray-500 text-center mt-4">
          Cancel anytime. No long-term commitment.
        </p>
      </div>
    </div>
  )
}

// Management Display Component
interface ManagementDisplayProps {
  subscription: unknown
  status: string
  statusColor: string
  description: string
  hasUnlimitedWorkouts: boolean
  isInGracePeriod: boolean
  daysRemaining: number
  actionLoading: string | null
  error: string
  success: string
  onManageBilling: () => void
  onCancelSubscription: () => void
  onReactivateSubscription: () => void
  onRefresh: () => void
  refreshing: boolean
  showCancelConfirm: boolean
  onConfirmCancel: () => void
  onCancelCancel: () => void
}

function ManagementDisplay({
  subscription,
  status,
  statusColor,
  description,
  hasUnlimitedWorkouts,
  isInGracePeriod,
  daysRemaining,
  actionLoading,
  error,
  success,
  onManageBilling,
  onCancelSubscription,
  onReactivateSubscription,
  onRefresh,
  refreshing,
  showCancelConfirm,
  onConfirmCancel,
  onCancelCancel
}: ManagementDisplayProps) {
  const getStatusColor = (color: string) => {
    const colors = {
      green: 'text-green-600 bg-green-50',
      yellow: 'text-yellow-600 bg-yellow-50',
      red: 'text-red-600 bg-red-50',
      gray: 'text-gray-600 bg-gray-50'
    }
    return colors[color as keyof typeof colors] || colors.gray
  }

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="text-red-800 font-medium">Error</p>
          </div>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800 font-medium">Success</p>
          </div>
          <p className="text-green-700 text-sm mt-1">{success}</p>
        </div>
      )}

      {/* Subscription Overview */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Subscription Status</h3>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(statusColor)}`}>
                {status}
              </span>
            </div>
            <p className="text-sm text-gray-600">{description}</p>
          </div>

          <div>
            <p className="font-medium text-gray-900">Workouts Generated</p>
            <p className="text-sm text-gray-600">
              {(subscription as { workoutCount?: number })?.workoutCount || 0} total
              {!hasUnlimitedWorkouts && (
                <span className="ml-2">
                  ({(subscription as { freeWorkoutsUsed?: number })?.freeWorkoutsUsed || 0}/{(subscription as { freeWorkoutLimit?: number })?.freeWorkoutLimit || 10} free used)
                </span>
              )}
            </p>
          </div>
        </div>

        {(subscription as { currentPeriodEnd?: number })?.currentPeriodEnd && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>
                {isInGracePeriod ? 'Access until' : 'Next billing'}: {' '}
                {formatDate((subscription as { currentPeriodEnd: number }).currentPeriodEnd)}
                {daysRemaining > 0 && (
                  <span className="ml-2">({daysRemaining} days)</span>
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Management Actions */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage Subscription</h3>

        <div className="space-y-3">
          {(subscription as { customerId?: string })?.customerId && (
            <button
              onClick={onManageBilling}
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

          {/* Cancel Subscription Button - only show for active subscriptions */}
          {hasUnlimitedWorkouts && !isInGracePeriod && !(subscription as { cancelAtPeriodEnd?: boolean })?.cancelAtPeriodEnd && (
            <button
              onClick={onCancelSubscription}
              disabled={actionLoading === 'cancel'}
              className="w-full flex items-center justify-between p-4 border border-red-200 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-600" />
                <div className="text-left">
                  <p className="font-medium text-red-900">Cancel Subscription</p>
                  <p className="text-sm text-red-600">Cancel at end of billing period</p>
                </div>
              </div>
              {actionLoading === 'cancel' ? (
                <Loader2 className="w-5 h-5 animate-spin text-red-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
            </button>
          )}

          {/* Reactivate Subscription Button - only show for cancelled subscriptions */}
          {(subscription as { cancelAtPeriodEnd?: boolean })?.cancelAtPeriodEnd && (
            <button
              onClick={onReactivateSubscription}
              disabled={actionLoading === 'reactivate'}
              className="w-full flex items-center justify-between p-4 border border-green-200 rounded-xl hover:bg-green-50 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div className="text-left">
                  <p className="font-medium text-green-900">Reactivate Subscription</p>
                  <p className="text-sm text-green-600">Resume unlimited access</p>
                </div>
              </div>
              {actionLoading === 'reactivate' ? (
                <Loader2 className="w-5 h-5 animate-spin text-green-400" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-400" />
              )}
            </button>
          )}
        </div>

        {/* Cancellation Confirmation Modal */}
        <ConfirmModal
          isOpen={showCancelConfirm}
          onClose={onCancelCancel}
          onConfirm={onConfirmCancel}
          title="Cancel Subscription"
          description={`You'll continue to have access to NeuraFit Pro until ${
            (subscription as { currentPeriodEnd?: number })?.currentPeriodEnd
              ? formatDate((subscription as { currentPeriodEnd: number }).currentPeriodEnd)
              : 'the end of your billing period'
          }. After that, you'll return to the free plan with limited workouts.`}
          confirmText="Yes, Cancel"
          cancelText="Keep Subscription"
          variant="danger"
          loading={actionLoading === 'cancel'}
        />
      </div>
    </div>
  )
}

export default SubscriptionManager
