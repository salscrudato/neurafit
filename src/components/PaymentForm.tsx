import React, { useState, useEffect } from 'react'
import {
  useStripe,
  useElements,
  PaymentElement,
  Elements
} from '@stripe/react-stripe-js'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { stripePromise, STRIPE_CONFIG } from '../lib/stripe-config'
import { subscriptionService } from '../lib/subscriptionService'
import { trackSubscriptionStarted, trackSubscriptionCompleted } from '../lib/firebase-analytics'


interface PaymentFormProps {
  priceId: string
  onSuccess: () => void
  onError: (_error: string) => void
  onCancel: () => void
  subscriptionId?: string
}

interface PaymentFormInnerProps {
  onSuccess: () => void
  onError: (_error: string) => void
  onCancel: () => void
  subscriptionId?: string
}

function PaymentFormInner({ onSuccess, onError, onCancel, subscriptionId }: PaymentFormInnerProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string>('')
  const [messageType, setMessageType] = useState<'error' | 'success' | 'info'>('info')


  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setLoading(true)
    setMessage('')

    // Track subscription attempt
    trackSubscriptionStarted()

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/profile?payment=success`,
      },
      redirect: 'if_required'
    })

    if (error) {
      let errorMessage = 'Payment failed'

      // Handle specific error types with user-friendly messages
      switch (error.type) {
        case 'card_error':
          switch (error.code) {
            case 'card_declined':
              errorMessage = 'Your card was declined. Please try a different payment method.'
              break
            case 'insufficient_funds':
              errorMessage = 'Insufficient funds. Please check your account balance or try a different card.'
              break
            case 'expired_card':
              errorMessage = 'Your card has expired. Please use a different payment method.'
              break
            case 'incorrect_cvc':
              errorMessage = 'The security code is incorrect. Please check and try again.'
              break
            case 'processing_error':
              errorMessage = 'An error occurred while processing your card. Please try again.'
              break
            default:
              errorMessage = error.message || 'Your card was declined. Please try a different payment method.'
          }
          break
        case 'validation_error':
          errorMessage = error.message || 'Please check your payment information and try again.'
          break
        case 'api_error':
          errorMessage = 'A temporary error occurred. Please try again in a moment.'
          break
        case 'rate_limit_error':
          errorMessage = 'Too many requests. Please wait a moment and try again.'
          break
        default:
          errorMessage = 'An unexpected error occurred. Please try again.'
      }

      setMessage(errorMessage)
      setMessageType('error')
      onError(errorMessage)
      setLoading(false)
      return
    }

    // Payment succeeded - now activate subscription
    setMessage('Payment successful! Activating subscription...')
    setMessageType('success')

    // Track successful subscription
    trackSubscriptionCompleted('stripe_payment_' + Date.now())

    try {
      console.log('🚀 Payment successful!')
      console.log('📊 Subscription ID:', subscriptionId)

      setMessage('Payment successful! Your Pro subscription is now active!')
      setMessageType('success')

      // Wait a moment for any webhooks to process
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Refresh subscription data
      await subscriptionService.getSubscription()

      console.log('✅ Subscription activated successfully')

      setTimeout(() => {
        onSuccess()
      }, 1500)
    } catch (error) {
      console.error('Error during subscription activation:', error)
      setMessage('Payment processed! Your subscription is now active.')
      setMessageType('success')

      setTimeout(() => {
        onSuccess()
      }, 2000)
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
  const [subscriptionId, setSubscriptionId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const initializingRef = React.useRef(false)
  const initializedRef = React.useRef(false)
  const onErrorRef = React.useRef(onError)

  // Keep the error callback ref up to date
  React.useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    // Prevent multiple initializations
    if (initializedRef.current || initializingRef.current) {
      console.log('🚫 Skipping initialization - already initialized or in progress')
      return
    }

    const initializePayment = async () => {
      try {
        if (!priceId) {
          setError('No price ID provided')
          onErrorRef.current('No price ID provided')
          setLoading(false)
          return
        }

        initializingRef.current = true
        setLoading(true)
        const result = await subscriptionService.createPaymentIntent(priceId)
        if (result) {
          setClientSecret(result.clientSecret)
          if (result.subscriptionId) {
            setSubscriptionId(result.subscriptionId)
          }
          initializedRef.current = true
          console.log(`✅ Payment initialized - Client Secret: ${result.clientSecret}, Subscription ID: ${result.subscriptionId || 'N/A'}`)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment'
        setError(errorMessage)
        onErrorRef.current(errorMessage)
      } finally {
        setLoading(false)
        initializingRef.current = false
      }
    }

    initializePayment()
  }, [priceId]) // Only depend on priceId

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
              initializedRef.current = false
              initializingRef.current = false
              // Retry initialization
              const initializePayment = async () => {
                try {
                  initializingRef.current = true
                  const result = await subscriptionService.createPaymentIntent(priceId)
                  if (result) {
                    setClientSecret(result.clientSecret)
                    if (result.subscriptionId) {
                      setSubscriptionId(result.subscriptionId)
                    }
                    initializedRef.current = true
                  }
                } catch (err) {
                  const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment'
                  setError(errorMessage)
                  onErrorRef.current(errorMessage)
                } finally {
                  setLoading(false)
                  initializingRef.current = false
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

  // Create options once with clientSecret - don't change it after Elements is mounted
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
