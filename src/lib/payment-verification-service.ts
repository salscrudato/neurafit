/**
 * Payment Status Verification Service
 * Verifies payment status directly with Stripe when webhooks fail
 */

import { httpsCallable } from 'firebase/functions'
import { fns } from './firebase'

interface StripeSubscription {
  id: string
  status: 'active' | 'incomplete' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | string
  customer: string
  latest_invoice?: string
}

interface StripeInvoice {
  id: string
  status: string
  payment_intent?: string
  amount_due?: number
  currency?: string
}

interface StripePaymentIntent {
  id: string
  status: string
  client_secret?: string
  last_payment_error?: { message?: string }
}

interface StripeStatusResponse {
  success: boolean
  subscription?: StripeSubscription
  latestInvoice?: StripeInvoice
  paymentIntent?: StripePaymentIntent
  error?: string
}

export interface PaymentVerificationResult {
  success: boolean
  paymentStatus: 'succeeded' | 'requires_action' | 'requires_payment_method' | 'processing' | 'canceled' | 'unknown'
  subscriptionStatus: 'active' | 'incomplete' | 'trialing' | 'past_due' | 'canceled' | 'unknown'
  requiresAction: boolean
  actionType?: '3d_secure' | 'redirect' | 'other'
  clientSecret?: string
  error?: string
  details?: {
    paymentIntentId?: string
    subscriptionId?: string
    customerId?: string
    amount?: number
    currency?: string
    lastPaymentError?: string
    clientSecret?: string
  }
}

/**
 * Payment Verification Service
 * Provides direct Stripe API verification when webhooks fail
 */
export class PaymentVerificationService {
  
  /**
   * Verify payment and subscription status for a given subscription
   */
  async verifyPaymentStatus(subscriptionId: string): Promise<PaymentVerificationResult> {
    try {
      console.log(`🔍 Verifying payment status for subscription: ${subscriptionId}`)

      // Get subscription status from Stripe
      const getStatusFn = httpsCallable(fns, 'getStripeSubscriptionStatus')
      const result = await getStatusFn({ subscriptionId })

      const data = result.data as StripeStatusResponse
      if (!data.success) {
        return {
          success: false,
          paymentStatus: 'unknown',
          subscriptionStatus: 'unknown',
          requiresAction: false,
          error: data.error || 'Failed to get subscription status'
        }
      }

      const subscription = data.subscription
      const latestInvoice = data.latestInvoice
      const paymentIntent = data.paymentIntent

      // Analyze payment status
      const verificationResult = this.analyzePaymentStatus(subscription, latestInvoice, paymentIntent)
      
      console.log(`📊 Payment verification result:`, verificationResult)
      return verificationResult

    } catch (error) {
      console.error('Payment verification failed:', error)
      return {
        success: false,
        paymentStatus: 'unknown',
        subscriptionStatus: 'unknown',
        requiresAction: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Analyze payment status from Stripe data
   */
  private analyzePaymentStatus(
    subscription: StripeSubscription,
    latestInvoice: StripeInvoice | null,
    paymentIntent: StripePaymentIntent | null
  ): PaymentVerificationResult {
    
    const result: PaymentVerificationResult = {
      success: true,
      paymentStatus: 'unknown',
      subscriptionStatus: (subscription.status as 'active' | 'incomplete' | 'trialing' | 'past_due' | 'canceled' | 'unknown') || 'unknown',
      requiresAction: false,
      details: {
        subscriptionId: subscription.id,
        customerId: subscription.customer,
      }
    }

    // If subscription is already active, payment succeeded
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      result.paymentStatus = 'succeeded'
      result.subscriptionStatus = subscription.status
      return result
    }

    // If no latest invoice, subscription might be in trial or incomplete
    if (!latestInvoice) {
      if (subscription.status === 'trialing') {
        result.paymentStatus = 'succeeded' // Trial doesn't require payment
        result.subscriptionStatus = 'trialing'
      } else {
        result.paymentStatus = 'unknown'
        result.subscriptionStatus = subscription.status as 'active' | 'incomplete' | 'trialing' | 'past_due' | 'canceled' | 'unknown'
      }
      return result
    }

    // Analyze invoice status
    result.details.amount = latestInvoice.amount_due
    result.details.currency = latestInvoice.currency

    if (latestInvoice.status === 'paid') {
      result.paymentStatus = 'succeeded'
      return result
    }

    if (latestInvoice.status === 'open' && paymentIntent) {
      // Analyze payment intent
      result.details.paymentIntentId = paymentIntent.id
      result.details.clientSecret = paymentIntent.client_secret

      switch (paymentIntent.status) {
        case 'succeeded':
          result.paymentStatus = 'succeeded'
          break
          
        case 'requires_action':
          result.paymentStatus = 'requires_action'
          result.requiresAction = true
          result.actionType = this.determineActionType(paymentIntent)
          break
          
        case 'requires_payment_method':
          result.paymentStatus = 'requires_payment_method'
          result.details.lastPaymentError = paymentIntent.last_payment_error?.message
          break
          
        case 'processing':
          result.paymentStatus = 'processing'
          break
          
        case 'canceled':
          result.paymentStatus = 'canceled'
          break
          
        default:
          result.paymentStatus = 'unknown'
      }
    } else if (latestInvoice.status === 'open') {
      // Invoice is open but no payment intent - might need payment method
      result.paymentStatus = 'requires_payment_method'
    } else {
      // Other invoice statuses
      result.paymentStatus = 'unknown'
    }

    return result
  }

  /**
   * Determine the type of action required for payment
   */
  private determineActionType(paymentIntent: StripePaymentIntent & { next_action?: { type: string } }): '3d_secure' | 'redirect' | 'other' {
    if (paymentIntent.next_action) {
      const nextAction = paymentIntent.next_action
      
      if (nextAction.type === 'use_stripe_sdk') {
        return '3d_secure'
      } else if (nextAction.type === 'redirect_to_url') {
        return 'redirect'
      }
    }
    
    return 'other'
  }

  /**
   * Verify multiple subscriptions at once
   */
  async verifyMultiplePayments(subscriptionIds: string[]): Promise<Map<string, PaymentVerificationResult>> {
    const results = new Map<string, PaymentVerificationResult>()
    
    // Process in parallel but limit concurrency
    const batchSize = 3
    for (let i = 0; i < subscriptionIds.length; i += batchSize) {
      const batch = subscriptionIds.slice(i, i + batchSize)
      const batchPromises = batch.map(async (id) => {
        const result = await this.verifyPaymentStatus(id)
        return { id, result }
      })
      
      const batchResults = await Promise.all(batchPromises)
      batchResults.forEach(({ id, result }) => {
        results.set(id, result)
      })
    }
    
    return results
  }

  /**
   * Get payment recommendations based on verification result
   */
  getPaymentRecommendations(result: PaymentVerificationResult): {
    action: 'none' | 'retry_payment' | 'complete_authentication' | 'update_payment_method' | 'wait' | 'contact_support'
    message: string
    userFriendlyMessage: string
  } {
    
    if (result.paymentStatus === 'succeeded') {
      return {
        action: 'none',
        message: 'Payment succeeded, subscription should be active',
        userFriendlyMessage: 'Your payment was successful!'
      }
    }

    if (result.paymentStatus === 'requires_action') {
      if (result.actionType === '3d_secure') {
        return {
          action: 'complete_authentication',
          message: '3D Secure authentication required',
          userFriendlyMessage: 'Please complete the additional security verification for your payment.'
        }
      } else if (result.actionType === 'redirect') {
        return {
          action: 'complete_authentication',
          message: 'Redirect authentication required',
          userFriendlyMessage: 'Please complete the payment verification process.'
        }
      } else {
        return {
          action: 'complete_authentication',
          message: 'Additional authentication required',
          userFriendlyMessage: 'Please complete the additional verification for your payment.'
        }
      }
    }

    if (result.paymentStatus === 'requires_payment_method') {
      return {
        action: 'update_payment_method',
        message: 'Payment method was declined or invalid',
        userFriendlyMessage: 'Your payment method was declined. Please try a different card or payment method.'
      }
    }

    if (result.paymentStatus === 'processing') {
      return {
        action: 'wait',
        message: 'Payment is still processing',
        userFriendlyMessage: 'Your payment is being processed. This may take a few minutes.'
      }
    }

    if (result.paymentStatus === 'canceled') {
      return {
        action: 'retry_payment',
        message: 'Payment was canceled',
        userFriendlyMessage: 'Your payment was canceled. Please try again.'
      }
    }

    return {
      action: 'contact_support',
      message: `Unknown payment status: ${result.paymentStatus}`,
      userFriendlyMessage: 'There was an issue with your payment. Please contact support for assistance.'
    }
  }

  /**
   * Quick payment health check
   */
  async quickPaymentHealthCheck(subscriptionId: string): Promise<{
    isHealthy: boolean
    needsAttention: boolean
    recommendation: string
  }> {
    try {
      const result = await this.verifyPaymentStatus(subscriptionId)
      const recommendations = this.getPaymentRecommendations(result)

      return {
        isHealthy: result.paymentStatus === 'succeeded',
        needsAttention: ['requires_action', 'requires_payment_method', 'canceled'].includes(result.paymentStatus),
        recommendation: recommendations.userFriendlyMessage
      }
    } catch {
      return {
        isHealthy: false,
        needsAttention: true,
        recommendation: 'Unable to verify payment status. Please try again or contact support.'
      }
    }
  }
}

// Export singleton instance
export const paymentVerificationService = new PaymentVerificationService()

// Export convenience functions
export async function verifyPaymentStatus(subscriptionId: string): Promise<PaymentVerificationResult> {
  return paymentVerificationService.verifyPaymentStatus(subscriptionId)
}

export async function quickPaymentCheck(subscriptionId: string) {
  return paymentVerificationService.quickPaymentHealthCheck(subscriptionId)
}
