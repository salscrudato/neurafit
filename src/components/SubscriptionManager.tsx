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
  Calendar
} from 'lucide-react'
import { useSubscription, useSubscriptionStatus } from '../hooks/useSubscription'
import { subscriptionService, formatDate } from '../lib/subscriptionService'
import { PaymentForm } from './PaymentForm'
import { SUBSCRIPTION_PLANS, formatPrice } from '../lib/stripe-config'

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
    try {
      await refreshSubscription()
      if (subscription?.status === 'active' || subscription?.status === 'trialing') {
        onRetry?.()
      }
      setSuccess('Subscription refreshed successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to refresh subscription')
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
      onRefresh={handleRefreshSubscription}
      refreshing={refreshing}
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
          {(isPaymentError || isRecentSubscriber) && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Checking...' : 'Refresh Subscription'}
            </button>
          )}

          {onRetry && !isPaymentError && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Try Again
            </button>
          )}

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

function StatusDisplay({ hasUnlimitedWorkouts, remainingFreeWorkouts, loading, className }: StatusDisplayProps) {
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
              <button onClick={onBack} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
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
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
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
  onRefresh: () => void
  refreshing: boolean
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
  onRefresh,
  refreshing
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
                  ({(subscription as { freeWorkoutsUsed?: number })?.freeWorkoutsUsed || 0}/{(subscription as { freeWorkoutLimit?: number })?.freeWorkoutLimit || 5} free used)
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
        </div>
      </div>
    </div>
  )
}

export default SubscriptionManager
