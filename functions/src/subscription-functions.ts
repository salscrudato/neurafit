import { onCall } from "firebase-functions/v2/https"
import { defineSecret } from "firebase-functions/params"
import { 
  createOrGetCustomer, 
  createSubscription, 
  cancelSubscription, 
  reactivateSubscription,
  stripe 
} from './lib/stripe'

// Define Stripe secret key
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY")

/**
 * Create a payment intent for subscription
 */
export const createPaymentIntent = onCall(
  {
    region: "us-central1",
    secrets: [stripeSecretKey],
  },
  async (request) => {
    const { auth, data } = request
    
    if (!auth) {
      throw new Error('Authentication required')
    }

    const { priceId } = data
    if (!priceId) {
      throw new Error('Price ID is required')
    }

    try {
      // Get or create customer
      const customerId = await createOrGetCustomer(
        auth.uid,
        auth.token.email || '',
        auth.token.name
      )

      // Create subscription
      const subscription = await createSubscription(customerId, priceId, auth.uid)
      
      const invoice = subscription.latest_invoice as any
      const paymentIntent = invoice?.payment_intent

      return {
        subscriptionId: subscription.id,
        clientSecret: paymentIntent?.client_secret,
        customerId
      }
    } catch (error) {
      console.error('Error creating payment intent:', error)
      throw new Error('Failed to create payment intent')
    }
  }
)

/**
 * Cancel user subscription
 */
export const cancelUserSubscription = onCall(
  {
    region: "us-central1",
    secrets: [stripeSecretKey],
  },
  async (request) => {
    const { auth, data } = request
    
    if (!auth) {
      throw new Error('Authentication required')
    }

    const { subscriptionId } = data
    if (!subscriptionId) {
      throw new Error('Subscription ID is required')
    }

    try {
      const subscription = await cancelSubscription(subscriptionId)
      
      return {
        success: true,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: (subscription as any).current_period_end * 1000
      }
    } catch (error) {
      console.error('Error canceling subscription:', error)
      throw new Error('Failed to cancel subscription')
    }
  }
)

/**
 * Reactivate user subscription
 */
export const reactivateUserSubscription = onCall(
  {
    region: "us-central1",
    secrets: [stripeSecretKey],
  },
  async (request) => {
    const { auth, data } = request
    
    if (!auth) {
      throw new Error('Authentication required')
    }

    const { subscriptionId } = data
    if (!subscriptionId) {
      throw new Error('Subscription ID is required')
    }

    try {
      const subscription = await reactivateSubscription(subscriptionId)
      
      return {
        success: true,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        status: subscription.status
      }
    } catch (error) {
      console.error('Error reactivating subscription:', error)
      throw new Error('Failed to reactivate subscription')
    }
  }
)

/**
 * Get customer portal URL for subscription management
 */
export const getCustomerPortalUrl = onCall(
  {
    region: "us-central1",
    secrets: [stripeSecretKey],
  },
  async (request) => {
    const { auth, data } = request
    
    if (!auth) {
      throw new Error('Authentication required')
    }

    const { customerId, returnUrl } = data
    if (!customerId) {
      throw new Error('Customer ID is required')
    }

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl || 'https://neurafit-ai-2025.web.app/profile'
      })
      
      return {
        url: session.url
      }
    } catch (error) {
      console.error('Error creating customer portal session:', error)
      throw new Error('Failed to create customer portal session')
    }
  }
)

/**
 * Get subscription details
 */
export const getSubscriptionDetails = onCall(
  {
    region: "us-central1",
    secrets: [stripeSecretKey],
  },
  async (request) => {
    const { auth, data } = request
    
    if (!auth) {
      throw new Error('Authentication required')
    }

    const { subscriptionId } = data
    if (!subscriptionId) {
      throw new Error('Subscription ID is required')
    }

    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['default_payment_method', 'latest_invoice']
      })
      
      return {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: (subscription as any).current_period_start * 1000,
        currentPeriodEnd: (subscription as any).current_period_end * 1000,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? subscription.canceled_at * 1000 : null,
        priceId: subscription.items.data[0]?.price.id,
        amount: subscription.items.data[0]?.price.unit_amount,
        currency: subscription.items.data[0]?.price.currency,
        interval: subscription.items.data[0]?.price.recurring?.interval
      }
    } catch (error) {
      console.error('Error getting subscription details:', error)
      throw new Error('Failed to get subscription details')
    }
  }
)

/**
 * Get billing history
 */
export const getBillingHistory = onCall(
  {
    region: "us-central1",
    secrets: [stripeSecretKey],
  },
  async (request) => {
    const { auth, data } = request
    
    if (!auth) {
      throw new Error('Authentication required')
    }

    const { customerId, limit = 10 } = data
    if (!customerId) {
      throw new Error('Customer ID is required')
    }

    try {
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit,
        expand: ['data.payment_intent']
      })
      
      return {
        invoices: invoices.data.map(invoice => ({
          id: invoice.id,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: invoice.status,
          description: invoice.description || `Invoice ${invoice.number}`,
          created: invoice.created * 1000,
          invoiceUrl: invoice.hosted_invoice_url,
          pdfUrl: invoice.invoice_pdf
        }))
      }
    } catch (error) {
      console.error('Error getting billing history:', error)
      throw new Error('Failed to get billing history')
    }
  }
)
