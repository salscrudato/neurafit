import { useState } from 'react'
import { X, Crown, CheckCircle, Loader2 } from 'lucide-react'
import { PaymentForm } from './PaymentForm'
import { SUBSCRIPTION_PLANS, formatPrice } from '../lib/stripe-config'

interface SimpleSubscriptionProps {
  onClose: () => void
  onSuccess?: () => void
}

export function SimpleSubscription({ onClose, onSuccess }: SimpleSubscriptionProps) {
  const [showPayment, setShowPayment] = useState(false)
  const [loading, setLoading] = useState(false)

  const plan = SUBSCRIPTION_PLANS[0] // Get the single plan

  const handleSelectPlan = () => {
    setShowPayment(true)
  }

  const handlePaymentSuccess = () => {
    setLoading(true)
    // Give a moment for the payment to process
    setTimeout(() => {
      onSuccess?.()
      onClose()
      // Refresh to update subscription status
      window.location.reload()
    }, 2000)
  }

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error)
    // Stay on payment form to allow retry
  }

  const handleBack = () => {
    setShowPayment(false)
  }

  if (showPayment) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Complete Your Subscription</h2>
              <button
                onClick={handleBack}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
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
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              onCancel={handleBack}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Upgrade to Pro</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Unlock Unlimited Workouts
            </h3>
            <p className="text-gray-600 text-sm">
              Get unlimited access to AI-powered workouts tailored to your goals
            </p>
          </div>

          {/* Plan Card */}
          <div className="border-2 border-blue-200 rounded-xl p-4 mb-6 bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="text-center mb-4">
              <h4 className="font-semibold text-gray-900 mb-1">{plan.name}</h4>
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {formatPrice(plan.price)}
              </div>
              <div className="text-sm text-gray-600">per month</div>
            </div>

            <div className="space-y-2">
              {plan.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleSelectPlan}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Subscribe Now
                <Crown className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            Cancel anytime. No long-term commitment.
          </p>
        </div>
      </div>
    </div>
  )
}
