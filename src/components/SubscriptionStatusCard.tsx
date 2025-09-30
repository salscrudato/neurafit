import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Crown, 
  CreditCard, 
  Settings, 
  Zap, 
  ExternalLink,
  Loader2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { useSubscription, useSubscriptionStatus } from '../hooks/useSubscription'
import { getCustomerPortalUrl } from '../lib/subscription'
import { Button } from '../design-system/components/Button'

interface SubscriptionStatusCardProps {
  className?: string
}

export function SubscriptionStatusCard({ className }: SubscriptionStatusCardProps) {
  const navigate = useNavigate()
  const { 
    subscription, 
    hasUnlimitedWorkouts, 
    remainingFreeWorkouts,
    isInGracePeriod,
    daysRemaining
  } = useSubscription()
  const { status, statusColor, description } = useSubscriptionStatus()
  
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string>('')

  const handleManageBilling = async () => {
    if (!subscription?.customerId) return
    
    setLoading('billing')
    setError('')
    
    try {
      const { url } = await getCustomerPortalUrl(subscription.customerId)
      window.open(url, '_blank')
    } catch (err) {
      console.error('Error opening billing portal:', err)
      setError('Failed to open billing portal')
    } finally {
      setLoading(null)
    }
  }

  const handleUpgrade = () => {
    navigate('/subscription')
  }

  const handleManageSubscription = () => {
    navigate('/subscription')
  }

  // Get status indicator
  const getStatusIndicator = () => {
    const baseClasses = "w-3 h-3 rounded-full"
    switch (statusColor) {
      case 'green':
        return <div className={`${baseClasses} bg-green-500`} />
      case 'yellow':
        return <div className={`${baseClasses} bg-yellow-500`} />
      case 'red':
        return <div className={`${baseClasses} bg-red-500`} />
      case 'blue':
        return <div className={`${baseClasses} bg-blue-500`} />
      default:
        return <div className={`${baseClasses} bg-gray-500`} />
    }
  }

  // Get primary action based on subscription state
  const getPrimaryAction = () => {
    if (!hasUnlimitedWorkouts) {
      return (
        <Button 
          size="sm" 
          onClick={handleUpgrade}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          <Crown className="w-4 h-4 mr-2" />
          Upgrade
        </Button>
      )
    }

    return (
      <Button 
        size="sm" 
        variant="outline"
        onClick={handleManageSubscription}
      >
        <Settings className="w-4 h-4 mr-2" />
        Manage
      </Button>
    )
  }

  // Get secondary action (billing portal for paid users)
  const getSecondaryAction = () => {
    if (hasUnlimitedWorkouts && subscription?.customerId) {
      return (
        <button
          onClick={handleManageBilling}
          disabled={loading === 'billing'}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
        >
          {loading === 'billing' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CreditCard className="w-4 h-4" />
          )}
          Billing
          <ExternalLink className="w-3 h-3" />
        </button>
      )
    }
    return null
  }

  // Get usage info
  const getUsageInfo = () => {
    if (hasUnlimitedWorkouts) {
      return (
        <div className="flex items-center gap-2 text-sm text-green-700">
          <CheckCircle className="w-4 h-4" />
          <span>Unlimited workouts</span>
        </div>
      )
    }

    if (remainingFreeWorkouts <= 0) {
      return (
        <div className="flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4" />
          <span>No free workouts remaining</span>
        </div>
      )
    }

    if (remainingFreeWorkouts <= 1) {
      return (
        <div className="flex items-center gap-2 text-sm text-yellow-700">
          <AlertTriangle className="w-4 h-4" />
          <span>{remainingFreeWorkouts} free workout remaining</span>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Zap className="w-4 h-4" />
        <span>{remainingFreeWorkouts} free workouts remaining</span>
      </div>
    )
  }

  // Get grace period warning
  const getGracePeriodWarning = () => {
    if (isInGracePeriod && daysRemaining > 0) {
      return (
        <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 px-3 py-2 rounded-lg">
          <AlertTriangle className="w-4 h-4" />
          <span>Access expires in {daysRemaining} day{daysRemaining === 1 ? '' : 's'}</span>
        </div>
      )
    }
    return null
  }

  return (
    <div className={`bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-slate-200/50 shadow-sm ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            {hasUnlimitedWorkouts ? (
              <Crown className="h-5 w-5 text-yellow-600" />
            ) : (
              <Zap className="h-5 w-5 text-slate-600" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {getStatusIndicator()}
              <h3 className="font-medium text-slate-900">{status}</h3>
            </div>
            <p className="text-sm text-slate-600 mb-2">{description}</p>
            {getUsageInfo()}
            {getGracePeriodWarning()}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {getSecondaryAction()}
          {getPrimaryAction()}
        </div>
      </div>

      {error && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  )
}
