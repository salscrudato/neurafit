import { useState } from 'react'
import { X, Zap, Crown, ArrowRight } from 'lucide-react'
import { useSubscription, useUpgradePrompt } from '../hooks/useSubscription'
import { formatPrice, SUBSCRIPTION_PLANS } from '../lib/stripe-config'

interface UpgradePromptProps {
  onUpgrade: () => void
  onDismiss?: () => void
  variant?: 'modal' | 'banner' | 'card'
  showDismiss?: boolean
}

export function UpgradePrompt({ 
  onUpgrade, 
  onDismiss, 
  variant = 'card',
  showDismiss = true 
}: UpgradePromptProps) {
  const { remainingFreeWorkouts } = useSubscription()
  const { shouldShowUpgrade, isNearLimit } = useUpgradePrompt()
  const [dismissed, setDismissed] = useState(false)

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  if (dismissed || (!shouldShowUpgrade && !isNearLimit)) {
    return null
  }

  const monthlyPlan = SUBSCRIPTION_PLANS.find(p => p.interval === 'month')

  // Modal variant
  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
          {showDismiss && (
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {shouldShowUpgrade ? 'Upgrade to Continue' : 'Almost Out of Free Workouts'}
            </h3>
            <p className="text-gray-600">
              {shouldShowUpgrade 
                ? "You've used all your free workouts. Upgrade to get unlimited access!"
                : `Only ${remainingFreeWorkouts} free workout${remainingFreeWorkouts === 1 ? '' : 's'} remaining.`
              }
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <Crown className="w-4 h-4 text-yellow-500" />
              Unlimited AI-powered workouts
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <Crown className="w-4 h-4 text-yellow-500" />
              Advanced personalization
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <Crown className="w-4 h-4 text-yellow-500" />
              Progress tracking & analytics
            </div>
          </div>

          <button
            onClick={onUpgrade}
            className="w-full bg-blue-500 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            Upgrade Now
            <ArrowRight className="w-4 h-4" />
          </button>

          {monthlyPlan && (
            <p className="text-center text-sm text-gray-500 mt-3">
              Starting at {formatPrice(monthlyPlan.price)}/month
            </p>
          )}
        </div>
      </div>
    )
  }

  // Banner variant
  if (variant === 'banner') {
    return (
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5" />
            <span className="font-medium">
              {shouldShowUpgrade 
                ? "You've used all your free workouts!"
                : `${remainingFreeWorkouts} free workout${remainingFreeWorkouts === 1 ? '' : 's'} remaining`
              }
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onUpgrade}
              className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              Upgrade Now
            </button>
            {showDismiss && (
              <button
                onClick={handleDismiss}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Card variant (default)
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 relative">
      {showDismiss && (
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      )}
      
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <Zap className="w-6 h-6 text-white" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 mb-1">
            {shouldShowUpgrade ? 'Upgrade to Pro' : 'Running Low on Free Workouts'}
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            {shouldShowUpgrade 
              ? "You've used all your free workouts. Upgrade to get unlimited access to AI-powered workouts!"
              : `You have ${remainingFreeWorkouts} free workout${remainingFreeWorkouts === 1 ? '' : 's'} remaining. Upgrade for unlimited access.`
            }
          </p>
          
          <div className="flex items-center gap-4">
            <button
              onClick={onUpgrade}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              View Plans
              <ArrowRight className="w-4 h-4" />
            </button>
            
            {monthlyPlan && (
              <span className="text-sm text-gray-600">
                From {formatPrice(monthlyPlan.price)}/month
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UpgradePrompt
