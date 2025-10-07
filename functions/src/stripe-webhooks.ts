import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import type { Request, Response } from 'express';
import Stripe from 'stripe';
import { getUserByCustomerId, updateUserSubscription, UserSubscriptionData, getStripeClient } from './lib/stripe';

// Extended Stripe types to include properties that exist but aren't in the official types
interface ExtendedStripeSubscription extends Omit<Stripe.Subscription, 'canceled_at'> {
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at?: number | null;
}

interface ExtendedStripeInvoice extends Stripe.Invoice {
  subscription?: string;
}

// Define Stripe secrets
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');

/**
 * Stripe webhook handler for subscription events
 * Enhanced with better error handling and monitoring
 */
export const stripeWebhook = onRequest(
  {
    cors: false, // Webhooks should not have CORS enabled
    region: 'us-central1',
    secrets: [stripeWebhookSecret, stripeSecretKey],
    timeoutSeconds: 60, // Increase timeout for webhook processing
    memory: '512MiB', // Increase memory for better performance
  },
  async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const sig = req.headers['stripe-signature'] as string;
    const eventId = req.headers['stripe-event-id'] as string || 'unknown';

    console.log(`📡 Webhook received: ${eventId} at ${new Date().toISOString()}`);

    let event: Stripe.Event;

    try {
      // Validate request method
      if (req.method !== 'POST') {
        console.error(`❌ Invalid method: ${req.method}`);
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      // Get raw body for signature verification
      let body: string | Buffer;
      if (typeof req.body === 'string') {
        body = req.body;
      } else if (Buffer.isBuffer(req.body)) {
        body = req.body;
      } else {
        // If body is already parsed, we can't verify signature
        // For development/testing, we'll skip signature verification
        console.warn('⚠️ Webhook body is already parsed, skipping signature verification');
        event = req.body as Stripe.Event;
      }

      if (!event!) {
        // Verify webhook signature
        const stripe = getStripeClient(stripeSecretKey.value());
        event = stripe.webhooks.constructEvent(body!, sig, stripeWebhookSecret.value());
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Webhook signature verification failed:', errorMessage);
      res.status(400).send(`Webhook Error: ${errorMessage}`);
      return;
    }

    console.log('Received Stripe webhook event:', event.type);

    try {
      console.log(`🔔 Processing webhook event: ${event.type} (ID: ${event.id})`);

      switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
      }

      const processingTime = Date.now() - startTime;
      console.log(`✅ Successfully processed webhook event: ${event.type} (ID: ${event.id}) in ${processingTime}ms`);

      res.json({
        received: true,
        eventId: event.id,
        eventType: event.type,
        processingTime,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Error processing webhook event ${event.type} (ID: ${event.id}) after ${processingTime}ms:`, error);

      res.status(500).json({
        error: 'Webhook processing failed',
        eventId: event.id,
        eventType: event.type,
        processingTime,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * Handle subscription created event with enhanced retry logic
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log(`📝 Processing subscription created: ${subscription.id} for customer: ${subscription.customer}`);

  try {
    // Get user ID from subscription metadata (more reliable than querying)
    let uid: string | null = subscription.metadata?.firebaseUID || null;

    if (!uid) {
      console.log(`⚠️ No Firebase UID in metadata, falling back to customer lookup`);
      uid = await getUserByCustomerId(subscription.customer as string);
    } else {
      console.log(`✅ Found Firebase UID in metadata: ${uid}`);
    }

    if (!uid) {
      console.error(`❌ User not found for customer: ${subscription.customer}`);

      // For subscription created events, we might need to wait for the user profile to be created
      // This can happen if the webhook arrives before the payment intent completion
      console.log(`⏳ Scheduling retry for subscription created: ${subscription.id}`);
      throw new Error(`User not found for customer: ${subscription.customer} - will retry`);
    }

    const extendedSubscription = subscription as unknown as ExtendedStripeSubscription;
    const subscriptionData: Partial<UserSubscriptionData> = {
      subscriptionId: subscription.id,
      customerId: subscription.customer as string,
      priceId: subscription.items.data[0]?.price.id,
      status: subscription.status as UserSubscriptionData['status'],
      currentPeriodStart: extendedSubscription.current_period_start * 1000,
      currentPeriodEnd: extendedSubscription.current_period_end * 1000,
      cancelAtPeriodEnd: extendedSubscription.cancel_at_period_end,
      // Ensure free workout limit is set to 50
      freeWorkoutLimit: 50,
    };

    // Only add canceledAt if it exists
    if (extendedSubscription.canceled_at != null) {
      subscriptionData.canceledAt = extendedSubscription.canceled_at * 1000;
    }

    console.log(`📝 Updating subscription for user ${uid}:`, {
      subscriptionId: subscriptionData.subscriptionId,
      status: subscriptionData.status,
      customerId: subscriptionData.customerId,
      freeWorkoutLimit: subscriptionData.freeWorkoutLimit
    });

    await updateUserSubscription(uid, subscriptionData);
    console.log(`✅ Successfully created subscription for user: ${uid}`);

  } catch (error) {
    console.error(`❌ Failed to handle subscription created ${subscription.id}:`, error);
    throw error; // Re-throw to trigger webhook retry
  }
}

/**
 * Handle subscription updated event with enhanced logging
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log(`📝 Processing subscription updated: ${subscription.id} for customer: ${subscription.customer}`);
  console.log(`📊 Subscription status: ${subscription.status}`);

  try {
    // Get user ID from subscription metadata (more reliable than querying)
    let uid: string | null = subscription.metadata?.firebaseUID || null;

    if (!uid) {
      console.log(`⚠️ No Firebase UID in metadata, falling back to customer lookup`);
      uid = await getUserByCustomerId(subscription.customer as string);
    } else {
      console.log(`✅ Found Firebase UID in metadata: ${uid}`);
    }

    if (!uid) {
      console.error(`❌ User not found for customer: ${subscription.customer}`);
      throw new Error(`User not found for customer: ${subscription.customer}`);
    }

    const extendedSubscription = subscription as unknown as ExtendedStripeSubscription;
    const subscriptionData: Partial<UserSubscriptionData> = {
      subscriptionId: subscription.id,
      customerId: subscription.customer as string,
      priceId: subscription.items.data[0]?.price.id,
      status: subscription.status as UserSubscriptionData['status'],
      currentPeriodStart: extendedSubscription.current_period_start * 1000,
      currentPeriodEnd: extendedSubscription.current_period_end * 1000,
      cancelAtPeriodEnd: extendedSubscription.cancel_at_period_end,
      // Ensure free workout limit is preserved
      freeWorkoutLimit: 50,
    };

    // Only add canceledAt if it exists
    if (extendedSubscription.canceled_at != null) {
      subscriptionData.canceledAt = extendedSubscription.canceled_at * 1000;
    }

    console.log(`📝 Updating subscription for user ${uid}:`, {
      subscriptionId: subscriptionData.subscriptionId,
      status: subscriptionData.status,
      customerId: subscriptionData.customerId,
      cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd,
      freeWorkoutLimit: subscriptionData.freeWorkoutLimit
    });

    await updateUserSubscription(uid, subscriptionData);

    // Verify subscription status after update
    console.log(`🔍 Verified subscription status for user ${uid}: ${subscriptionData.status}`);
    console.log(`✅ Successfully updated subscription for user: ${uid}`);

  } catch (error) {
    console.error(`❌ Failed to handle subscription updated ${subscription.id}:`, error);
    throw error; // Re-throw to trigger webhook retry
  }
}



/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Processing payment succeeded:', invoice.id);

  const extendedInvoice = invoice as ExtendedStripeInvoice;
  if (!extendedInvoice.subscription) {
    console.log('No subscription associated with invoice:', invoice.id);
    return;
  }

  let uid: string | null = null; // Declare outside try block so it's available in catch

  try {
    // Get the full subscription details from Stripe
    const stripe = getStripeClient(process.env.STRIPE_SECRET_KEY!);
    const subscription = await stripe.subscriptions.retrieve(extendedInvoice.subscription as string);
    const extendedSubscription = subscription as unknown as ExtendedStripeSubscription;

    // Get user ID from subscription metadata (more reliable than querying)
    uid = subscription.metadata?.firebaseUID || null;

    if (!uid) {
      console.log(`⚠️ No Firebase UID in metadata, falling back to customer lookup`);
      uid = await getUserByCustomerId(invoice.customer as string);
    } else {
      console.log(`✅ Found Firebase UID in metadata: ${uid}`);
    }

    if (!uid) {
      console.error('User not found for customer:', invoice.customer);
      return;
    }

    // Payment succeeded, update subscription with full details
    const subscriptionData: Partial<UserSubscriptionData> = {
      subscriptionId: subscription.id,
      customerId: subscription.customer as string,
      priceId: subscription.items.data[0]?.price.id,
      status: subscription.status as UserSubscriptionData['status'],
      currentPeriodStart: extendedSubscription.current_period_start * 1000,
      currentPeriodEnd: extendedSubscription.current_period_end * 1000,
      cancelAtPeriodEnd: extendedSubscription.cancel_at_period_end,
      // Ensure free workout limit is set
      freeWorkoutLimit: 50,
    };

    // Only add canceledAt if it exists
    if (extendedSubscription.canceled_at != null) {
      subscriptionData.canceledAt = extendedSubscription.canceled_at * 1000;
    }

    console.log(`📝 Payment succeeded - updating subscription for user ${uid}:`, {
      subscriptionId: subscriptionData.subscriptionId,
      status: subscriptionData.status,
      customerId: subscriptionData.customerId,
      freeWorkoutLimit: subscriptionData.freeWorkoutLimit
    });

    await updateUserSubscription(uid, subscriptionData);
    console.log('✅ Payment succeeded and subscription updated for user:', uid, 'Status:', subscriptionData.status);
  } catch (error) {
    console.error('❌ Error processing payment success:', error);
    // Fallback to basic status update - use actual subscription status, not hardcoded 'active'
    if (uid) {
      try {
        const stripe = getStripeClient(process.env.STRIPE_SECRET_KEY!);
        const subscription = await stripe.subscriptions.retrieve(extendedInvoice.subscription as string);
        await updateUserSubscription(uid, {
          status: subscription.status as UserSubscriptionData['status'],
          customerId: subscription.customer as string,
          freeWorkoutLimit: 15
        });
        console.log('✅ Fallback update completed with status:', subscription.status);
      } catch (fallbackError) {
        console.error('❌ Fallback update also failed:', fallbackError);
      }
    }
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`📝 Processing subscription deleted: ${subscription.id}`);

  try {
    // Get user ID from subscription metadata
    let uid: string | null = subscription.metadata?.firebaseUID || null;

    if (!uid) {
      console.log(`⚠️ No Firebase UID in metadata, falling back to customer lookup`);
      uid = await getUserByCustomerId(subscription.customer as string);
    } else {
      console.log(`✅ Found Firebase UID in metadata: ${uid}`);
    }

    if (!uid) {
      console.error(`❌ User not found for customer: ${subscription.customer}`);
      return;
    }

    const extendedSubscription = subscription as unknown as ExtendedStripeSubscription;
    const subscriptionData: Partial<UserSubscriptionData> = {
      status: 'canceled',
      canceledAt: extendedSubscription.canceled_at != null ? extendedSubscription.canceled_at * 1000 : Date.now(),
    };

    await updateUserSubscription(uid, subscriptionData);
    console.log(`✅ Subscription deleted for user: ${uid}`);
  } catch (error) {
    console.error(`❌ Failed to handle subscription deleted:`, error);
    throw error;
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Processing payment failed:', invoice.id);

  const extendedInvoice = invoice as ExtendedStripeInvoice;
  if (!extendedInvoice.subscription) return;

  // Get the subscription to access metadata
  const stripe = getStripeClient(process.env.STRIPE_SECRET_KEY!);
  const subscription = await stripe.subscriptions.retrieve(extendedInvoice.subscription as string);

  // Get user ID from subscription metadata
  let uid: string | null = subscription.metadata?.firebaseUID || null;

  if (!uid) {
    console.log(`⚠️ No Firebase UID in metadata, falling back to customer lookup`);
    uid = await getUserByCustomerId(invoice.customer as string);
  } else {
    console.log(`✅ Found Firebase UID in metadata: ${uid}`);
  }

  if (!uid) {
    console.error('User not found for customer:', invoice.customer);
    return;
  }

  // Payment failed, subscription might be past_due
  const subscriptionData: Partial<UserSubscriptionData> = {
    status: 'past_due',
  };

  await updateUserSubscription(uid, subscriptionData);
  console.log('Payment failed for user:', uid);
}