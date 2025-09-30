import { useState } from 'react'
import { Check, Zap, Crown, Loader2 } from 'lucide-react'
import { SUBSCRIPTION_PLANS, formatPrice } from '../lib/stripe-config'
import { useSubscription } from '../hooks/useSubscription'

interface SubscriptionPlansProps {
  onSelectPlan: (_priceId: string) => void
  loading?: boolean
  selectedPriceId?: string
}

export function SubscriptionPlans({ onSelectPlan, loading, selectedPriceId }: SubscriptionPlansProps) {
  const { subscription, hasUnlimitedWorkouts } = useSubscription()
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Choose Your Plan</h2>
        <p className="mt-2 text-gray-600">
          Unlock unlimited AI-powered workouts tailored to your goals
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const isSelected = selectedPriceId === plan.stripePriceId
          const isHovered = hoveredPlan === plan.id
          const isCurrentPlan = subscription?.priceId === plan.stripePriceId && hasUnlimitedWorkouts
          
          return (
            <div
              key={plan.id}
              className={`
                relative rounded-2xl border-2 p-6 transition-all duration-300 cursor-pointer
                ${plan.popular ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 bg-white'}
                ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                ${isHovered ? 'shadow-lg scale-105' : 'shadow-sm'}
                ${isCurrentPlan ? 'border-green-500 bg-green-50/50' : ''}
                ${loading ? 'pointer-events-none opacity-75' : ''}
              `}
              onMouseEnter={() => setHoveredPlan(plan.id)}
              onMouseLeave={() => setHoveredPlan(null)}
              onClick={() => !loading && !isCurrentPlan && onSelectPlan(plan.stripePriceId)}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Most Popular
                  </div>
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Current Plan
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatPrice(plan.price)}
                  </span>
                  <span className="text-gray-600">/{plan.interval}</span>
                </div>
                

              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Action Button */}
              <button
                className={`
                  w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200
                  ${isCurrentPlan 
                    ? 'bg-green-100 text-green-700 cursor-default' 
                    : plan.popular
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }
                  ${loading && isSelected ? 'opacity-75' : ''}
                `}
                disabled={loading || isCurrentPlan}
              >
                {loading && isSelected ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </div>
                ) : isCurrentPlan ? (
                  'Current Plan'
                ) : (
                  `Get ${plan.name}`
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Free Trial Info */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm">
          <Zap className="w-4 h-4" />
          Start with 5 free workouts • No credit card required
        </div>
      </div>
    </div>
  )
}

export default SubscriptionPlans
