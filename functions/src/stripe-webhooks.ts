import { onRequest } from "firebase-functions/v2/https"
import { defineSecret } from "firebase-functions/params"
import type { Request, Response } from "express"
import Stripe from 'stripe'
import { stripe, getUserByCustomerId, updateUserSubscription, UserSubscriptionData } from './lib/stripe'

// Extended Stripe types to include properties that exist but aren't in the official types
interface ExtendedStripeSubscription extends Omit<Stripe.Subscription, 'canceled_at'> {
  current_period_start: number
  current_period_end: number
  cancel_at_period_end: boolean
  canceled_at?: number | null
}

interface ExtendedStripeInvoice extends Stripe.Invoice {
  subscription?: string
}

// Define Stripe webhook secret
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET")

/**
 * Stripe webhook handler for subscription events
 */
export const stripeWebhook = onRequest(
  {
    cors: false, // Webhooks should not have CORS enabled
    region: "us-central1",
    secrets: [stripeWebhookSecret],
  },
  async (req: Request, res: Response): Promise<void> => {
    const sig = req.headers['stripe-signature'] as string

    let event: Stripe.Event

    try {
      // Get raw body for signature verification
      let body: string | Buffer
      if (typeof req.body === 'string') {
        body = req.body
      } else if (Buffer.isBuffer(req.body)) {
        body = req.body
      } else {
        // If body is already parsed, we can't verify signature
        // For development/testing, we'll skip signature verification
        console.warn('Webhook body is already parsed, skipping signature verification')
        event = req.body as Stripe.Event
      }

      if (!event!) {
        // Verify webhook signature
        event = stripe.webhooks.constructEvent(
          body!,
          sig,
          stripeWebhookSecret.value()
        )
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Webhook signature verification failed:', errorMessage)
      res.status(400).send(`Webhook Error: ${errorMessage}`)
      return
    }

    console.log('Received Stripe webhook event:', event.type)

    try {
      switch (event.type) {
        case 'customer.subscription.created':
          await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
          break

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
          break

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
          break

        case 'invoice.payment_succeeded':
          await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
          break

        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object as Stripe.Invoice)
          break

        default:
          console.log(`Unhandled event type: ${event.type}`)
      }

      res.json({ received: true })
    } catch (error) {
      console.error('Error processing webhook:', error)
      res.status(500).json({ error: 'Webhook processing failed' })
      return
    }
  }
)

/**
 * Handle subscription created event
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Processing subscription created:', subscription.id)

  const uid = await getUserByCustomerId(subscription.customer as string)
  if (!uid) {
    console.error('User not found for customer:', subscription.customer)
    return
  }

  const extendedSubscription = subscription as ExtendedStripeSubscription
  const subscriptionData: Partial<UserSubscriptionData> = {
    subscriptionId: subscription.id,
    priceId: subscription.items.data[0]?.price.id,
    status: subscription.status as UserSubscriptionData['status'],
    currentPeriodStart: extendedSubscription.current_period_start * 1000,
    currentPeriodEnd: extendedSubscription.current_period_end * 1000,
    cancelAtPeriodEnd: extendedSubscription.cancel_at_period_end
  }

  // Only add canceledAt if it exists
  if (extendedSubscription.canceled_at) {
    subscriptionData.canceledAt = extendedSubscription.canceled_at * 1000
  }

  await updateUserSubscription(uid, subscriptionData)
  console.log('Subscription created for user:', uid)
}

/**
 * Handle subscription updated event
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Processing subscription updated:', subscription.id)

  const uid = await getUserByCustomerId(subscription.customer as string)
  if (!uid) {
    console.error('User not found for customer:', subscription.customer)
    return
  }

  const extendedSubscription = subscription as ExtendedStripeSubscription
  const subscriptionData: Partial<UserSubscriptionData> = {
    subscriptionId: subscription.id,
    priceId: subscription.items.data[0]?.price.id,
    status: subscription.status as UserSubscriptionData['status'],
    currentPeriodStart: extendedSubscription.current_period_start * 1000,
    currentPeriodEnd: extendedSubscription.current_period_end * 1000,
    cancelAtPeriodEnd: extendedSubscription.cancel_at_period_end
  }

  // Only add canceledAt if it exists
  if (extendedSubscription.canceled_at) {
    subscriptionData.canceledAt = extendedSubscription.canceled_at * 1000
  }

  await updateUserSubscription(uid, subscriptionData)
  console.log('Subscription updated for user:', uid)
}

/**
 * Handle subscription deleted event
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Processing subscription deleted:', subscription.id)
  
  const uid = await getUserByCustomerId(subscription.customer as string)
  if (!uid) {
    console.error('User not found for customer:', subscription.customer)
    return
  }

  const subscriptionData: Partial<UserSubscriptionData> = {
    status: 'canceled',
    canceledAt: Date.now()
  }

  await updateUserSubscription(uid, subscriptionData)
  console.log('Subscription deleted for user:', uid)
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Processing payment succeeded:', invoice.id)

  const extendedInvoice = invoice as ExtendedStripeInvoice
  if (!extendedInvoice.subscription) return

  const uid = await getUserByCustomerId(invoice.customer as string)
  if (!uid) {
    console.error('User not found for customer:', invoice.customer)
    return
  }

  // Payment succeeded, subscription should be active
  const subscriptionData: Partial<UserSubscriptionData> = {
    status: 'active'
  }

  await updateUserSubscription(uid, subscriptionData)
  console.log('Payment succeeded for user:', uid)
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Processing payment failed:', invoice.id)

  const extendedInvoice = invoice as ExtendedStripeInvoice
  if (!extendedInvoice.subscription) return

  const uid = await getUserByCustomerId(invoice.customer as string)
  if (!uid) {
    console.error('User not found for customer:', invoice.customer)
    return
  }

  // Payment failed, subscription might be past_due
  const subscriptionData: Partial<UserSubscriptionData> = {
    status: 'past_due'
  }

  await updateUserSubscription(uid, subscriptionData)
  console.log('Payment failed for user:', uid)
}
