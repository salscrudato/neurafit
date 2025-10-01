import { onCall } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { getStripeClient, getUserByCustomerId, updateUserSubscription } from './lib/stripe'
import type Stripe from 'stripe'

// Extended Stripe types to include properties that exist but aren't in the official types
interface ExtendedStripeSubscription extends Omit<Stripe.Subscription, 'canceled_at'> {
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at?: number | null;
}

// Define Stripe secret key
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY')

/**
 * Get subscription status directly from Stripe and compare with Firestore
 */
export const getStripeSubscriptionStatus = onCall(
  {
    region: 'us-central1',
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
      const stripeInstance = getStripeClient(stripeSecretKey.value())
      
      // Get subscription from Stripe
      const subscription = await stripeInstance.subscriptions.retrieve(subscriptionId, {
        expand: ['latest_invoice', 'latest_invoice.payment_intent']
      })

      const extendedSubscription = subscription as unknown as ExtendedStripeSubscription

      console.log(`📊 Stripe subscription ${subscriptionId}:`, {
        status: subscription.status,
        current_period_start: extendedSubscription.current_period_start,
        current_period_end: extendedSubscription.current_period_end,
        latest_invoice: subscription.latest_invoice
      })

      return {
        success: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          priceId: subscription.items.data[0]?.price.id,
          currentPeriodStart: extendedSubscription.current_period_start * 1000,
          currentPeriodEnd: extendedSubscription.current_period_end * 1000,
          cancelAtPeriodEnd: extendedSubscription.cancel_at_period_end,
          latestInvoice: subscription.latest_invoice
        }
      }
    } catch (error) {
      console.error('Error getting Stripe subscription status:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
)

/**
 * Manually sync subscription data from Stripe to Firestore
 */
export const manualSyncSubscription = onCall(
  {
    region: 'us-central1',
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
      const stripeInstance = getStripeClient(stripeSecretKey.value())
      
      // Get subscription from Stripe
      const subscription = await stripeInstance.subscriptions.retrieve(subscriptionId)
      const extendedSubscription = subscription as unknown as ExtendedStripeSubscription

      // Get user ID from customer ID
      const uid = await getUserByCustomerId(subscription.customer as string)
      if (!uid) {
        throw new Error('User not found for customer: ' + subscription.customer)
      }

      // Update Firestore with current Stripe data
      const subscriptionData = {
        subscriptionId: subscription.id,
        priceId: subscription.items.data[0]?.price.id,
        status: subscription.status as 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid',
        currentPeriodStart: extendedSubscription.current_period_start * 1000,
        currentPeriodEnd: extendedSubscription.current_period_end * 1000,
        cancelAtPeriodEnd: extendedSubscription.cancel_at_period_end,
        updatedAt: Date.now()
      }
      
      await updateUserSubscription(uid, subscriptionData)
      
      console.log(`✅ Manually synced subscription ${subscriptionId} for user ${uid}`)
      
      return {
        success: true,
        message: 'Subscription synced successfully',
        subscriptionData
      }
    } catch (error) {
      console.error('Error manually syncing subscription:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
)

/**
 * Check webhook delivery status for a subscription
 */
export const checkWebhookDelivery = onCall(
  {
    region: 'us-central1',
    secrets: [stripeSecretKey],
  },
  async (request) => {
    const { auth, data } = request
    
    if (!auth) {
      throw new Error('Authentication required')
    }

    const { subscriptionId, hours = 1 } = data

    try {
      const stripeInstance = getStripeClient(stripeSecretKey.value())

      // Calculate time range
      const hoursAgo = Math.floor(Date.now() / 1000) - (hours * 60 * 60)

      // Get recent events
      const events = await stripeInstance.events.list({
        limit: 50,
        created: {
          gte: hoursAgo
        },
        types: [
          'customer.subscription.created',
          'customer.subscription.updated',
          'invoice.payment_succeeded',
          'invoice.payment_failed'
        ]
      })

      // Filter events related to this subscription if provided
      let relevantEvents = events.data
      if (subscriptionId) {
        relevantEvents = events.data.filter(event => {
          const obj = event.data.object as unknown as Record<string, unknown>
          return obj.id === subscriptionId || obj.subscription === subscriptionId
        })
      }
      
      console.log(`📊 Found ${relevantEvents.length} webhook events${subscriptionId ? ` for subscription ${subscriptionId}` : ` in last ${hours} hours`}`)
      
      const eventSummary = relevantEvents.map(event => ({
        id: event.id,
        type: event.type,
        created: event.created,
        delivered: event.request?.id ? true : false
      }))
      
      return {
        success: true,
        events: eventSummary,
        totalEvents: relevantEvents.length,
        lastEventTime: relevantEvents.length > 0 ? relevantEvents[0].created * 1000 : null
      }
    } catch (error) {
      console.error('Error checking webhook delivery:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
)

/**
 * Force webhook processing for a subscription
 */
export const forceWebhookProcessing = onCall(
  {
    region: 'us-central1',
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
      const stripeInstance = getStripeClient(stripeSecretKey.value())
      
      // Get subscription from Stripe
      const subscription = await stripeInstance.subscriptions.retrieve(subscriptionId, {
        expand: ['latest_invoice', 'latest_invoice.payment_intent']
      })

      const extendedSubscription = subscription as unknown as ExtendedStripeSubscription

      // Get user ID from customer ID
      const uid = await getUserByCustomerId(subscription.customer as string)
      if (!uid) {
        throw new Error('User not found for customer: ' + subscription.customer)
      }

      console.log(`🔄 Force processing webhook for subscription ${subscriptionId}, status: ${subscription.status}`)

      // Determine the correct status based on Stripe data
      let finalStatus = subscription.status as 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid'

      // If subscription is active or trialing, ensure it's marked as active
      if (subscription.status === 'active' || subscription.status === 'trialing') {
        finalStatus = 'active'
      }

      // Check if payment succeeded on latest invoice
      const latestInvoice = subscription.latest_invoice as Stripe.Invoice | null
      if (latestInvoice && latestInvoice.status === 'paid') {
        finalStatus = 'active'
      }

      // Update Firestore with correct data
      const subscriptionData = {
        subscriptionId: subscription.id,
        priceId: subscription.items.data[0]?.price.id,
        status: finalStatus,
        currentPeriodStart: extendedSubscription.current_period_start * 1000,
        currentPeriodEnd: extendedSubscription.current_period_end * 1000,
        cancelAtPeriodEnd: extendedSubscription.cancel_at_period_end,
        updatedAt: Date.now()
      }
      
      await updateUserSubscription(uid, subscriptionData)
      
      console.log(`✅ Force processed webhook for subscription ${subscriptionId}, final status: ${finalStatus}`)
      
      return {
        success: true,
        message: `Webhook processed successfully, status: ${finalStatus}`,
        subscriptionData
      }
    } catch (error) {
      console.error('Error force processing webhook:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
)

/**
 * Comprehensive subscription debugging
 */
export const debugSubscription = onCall(
  {
    region: 'us-central1',
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
      const stripeInstance = getStripeClient(stripeSecretKey.value())
      
      // Get comprehensive subscription data
      const subscription = await stripeInstance.subscriptions.retrieve(subscriptionId, {
        expand: [
          'latest_invoice',
          'latest_invoice.payment_intent',
          'customer',
          'items.data.price'
        ]
      })

      const extendedSubscription = subscription as unknown as ExtendedStripeSubscription

      // Get recent events
      const events = await stripeInstance.events.list({
        limit: 10,
        types: [
          'customer.subscription.created',
          'customer.subscription.updated',
          'invoice.payment_succeeded',
          'invoice.payment_failed'
        ]
      })

      const relevantEvents = events.data.filter(event => {
        const obj = event.data.object as unknown as Record<string, unknown>
        return obj.id === subscriptionId || obj.subscription === subscriptionId
      })

      // Get user data
      const uid = await getUserByCustomerId(subscription.customer as string)

      const debugInfo = {
        subscription: {
          id: subscription.id,
          status: subscription.status,
          created: subscription.created,
          current_period_start: extendedSubscription.current_period_start,
          current_period_end: extendedSubscription.current_period_end,
          cancel_at_period_end: extendedSubscription.cancel_at_period_end,
          latest_invoice: subscription.latest_invoice
        },
        events: relevantEvents.map(event => ({
          id: event.id,
          type: event.type,
          created: event.created,
          delivered: event.request?.id ? true : false
        })),
        user: {
          uid,
          customerId: subscription.customer
        }
      }
      
      console.log(`🔍 Debug info for subscription ${subscriptionId}:`, debugInfo)
      
      return {
        success: true,
        debugInfo
      }
    } catch (error) {
      console.error('Error debugging subscription:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
)
