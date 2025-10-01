import React, { useState, useEffect } from 'react'
import {
  useStripe,
  useElements,
  PaymentElement,
  Elements
} from '@stripe/react-stripe-js'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { stripePromise, STRIPE_CONFIG } from '../lib/stripe-config'
import { createPaymentIntent } from '../lib/subscription'
import { trackSubscriptionStarted, trackSubscriptionCompleted } from '../lib/firebase-analytics'
import { subscriptionFixManager } from '../lib/subscription-fix-final'


interface PaymentFormProps {
  priceId: string
  onSuccess: () => void
  onError: (_error: string) => void
  onCancel: () => void
}

interface PaymentFormInnerProps {
  onSuccess: () => void
  onError: (_error: string) => void
  onCancel: () => void
  subscriptionId: string
}

function PaymentFormInner({ onSuccess, onError, onCancel, subscriptionId: propSubscriptionId }: PaymentFormInnerProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string>('')
  const [messageType, setMessageType] = useState<'error' | 'success' | 'info'>('info')
  const [activationMethod, setActivationMethod] = useState<string>('')
  const [localSubscriptionId] = useState<string>('')


  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setLoading(true)
    setMessage('')
    setActivationMethod('')

    // Track subscription attempt
    trackSubscriptionStarted()

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/profile?payment=success`,
      },
      redirect: 'if_required'
    })

    if (error) {
      if (error.type === 'card_error' || error.type === 'validation_error') {
        setMessage(error.message || 'Payment failed')
        setMessageType('error')
        onError(error.message || 'Payment failed')
      } else {
        setMessage('An unexpected error occurred.')
        setMessageType('error')
        onError('An unexpected error occurred.')
      }
      setLoading(false)
      return
    }

    // Payment succeeded - now use robust activation
    setMessage('Payment successful! Activating subscription...')
    setMessageType('success')

    // Track successful subscription
    trackSubscriptionCompleted('stripe_payment_' + Date.now())

    try {
      // Extract subscription ID from payment intent metadata or use stored value
      const currentSubscriptionId = propSubscriptionId || localSubscriptionId || (paymentIntent as { metadata?: { subscription_id?: string } })?.metadata?.subscription_id || ''

      if (!currentSubscriptionId) {
        throw new Error('No subscription ID found')
      }

      console.log(`🚀 Starting robust activation for subscription: ${currentSubscriptionId}`)

      // Use subscription fix manager
      const result = await subscriptionFixManager.fixSubscription(currentSubscriptionId)

      if (result.success) {
        setMessage(`Subscription activated successfully! (${result.method})`)
        setActivationMethod(result.method)
        setMessageType('success')

        console.log(`✅ Subscription activated via ${result.method}`)

        // Small delay to let the UI update
        setTimeout(() => {
          onSuccess()
        }, 1500)
      } else {
        // Even if robust activation fails, the payment succeeded
        setMessage('Payment processed! Your subscription will be activated shortly.')
        setMessageType('info')
        setActivationMethod(result.method)

        console.log(`⚠️ Robust activation failed via ${result.method}: ${result.error}`)

        // Still call onSuccess - user paid successfully
        setTimeout(() => {
          onSuccess()
        }, 3000)
      }
    } catch (error) {
      console.error('Error during robust subscription activation:', error)
      setMessage('Payment processed! Your subscription will be activated shortly.')
      setMessageType('info')

      // Still call onSuccess - payment was successful
      setTimeout(() => {
        onSuccess()
      }, 3000)
    }

    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Element */}
        <div className="p-4 border border-gray-200 rounded-xl bg-white">
          <PaymentElement
            options={{
              layout: 'tabs',
              wallets: {
                applePay: 'never',
                googlePay: 'never'
              }
            }}
          />
        </div>

        {/* Message */}
        {message && (
          <div className={`
            flex items-center gap-2 p-3 rounded-lg text-sm
            ${messageType === 'error' ? 'bg-red-50 text-red-700' : ''}
            ${messageType === 'success' ? 'bg-green-50 text-green-700' : ''}
            ${messageType === 'info' ? 'bg-blue-50 text-blue-700' : ''}
          `}>
            {messageType === 'error' && <AlertCircle className="w-4 h-4" />}
            {messageType === 'success' && <CheckCircle className="w-4 h-4" />}
            <div className="flex-1">
              {message}
              {activationMethod && (
                <div className="text-xs opacity-75 mt-1">
                  Activated via: {activationMethod}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!stripe || loading}
            className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </div>
            ) : (
              'Subscribe'
            )}
          </button>
        </div>
      </form>



      {/* Security Notice */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          🔒 Your payment information is secure and encrypted
        </p>
      </div>


    </div>
  )
}

export function PaymentForm({ priceId, onSuccess, onError, onCancel }: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [subscriptionId, setSubscriptionId] = useState<string>('')

  useEffect(() => {
    // Prevent multiple initializations
    if (clientSecret || error) {
      console.log('🚫 Skipping initialization - already have clientSecret or error')
      return
    }

    const initializePayment = async () => {
      try {
        if (!priceId) {
          setError('No price ID provided')
          onError('No price ID provided')
          setLoading(false)
          return
        }

        setLoading(true)
        const result = await createPaymentIntent(priceId)
        setClientSecret(result.clientSecret)
        setSubscriptionId(result.subscriptionId)

        console.log(`✅ Payment initialized - Subscription ID: ${result.subscriptionId}`)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment'
        setError(errorMessage)
        onError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    initializePayment()
  }, [priceId, clientSecret, error, onError])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-gray-600">Initializing payment...</span>
        </div>

      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="flex items-center justify-center gap-2 text-red-600 mb-4">
          <AlertCircle className="w-6 h-6" />
          <span className="font-medium">Payment initialization failed</span>
        </div>
        <p className="text-gray-600 mb-6">{error}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              setError('')
              setLoading(true)
              // Retry initialization
              const initializePayment = async () => {
                try {
                  const result = await createPaymentIntent(priceId)
                  setClientSecret(result.clientSecret)
                } catch (err) {
                  const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment'
                  setError(errorMessage)
                  onError(errorMessage)
                } finally {
                  setLoading(false)
                }
              }
              initializePayment()
            }}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (!clientSecret) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Unable to initialize payment. Please try again.</p>
        <button
          onClick={onCancel}
          className="mt-4 px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Go Back
        </button>
      </div>
    )
  }

  const options = {
    clientSecret,
    appearance: STRIPE_CONFIG.appearance,
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentFormInner
        onSuccess={onSuccess}
        onError={onError}
        onCancel={onCancel}
        subscriptionId={subscriptionId}
      />
    </Elements>
  )
}

export default PaymentForm
