import { onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import Stripe from 'stripe';
import {
  createOrGetCustomer,
  createSubscription,
  cancelSubscription,
  reactivateSubscription,
  getStripeClient,
  updateUserSubscription,
  UserSubscriptionData,
} from './lib/stripe';
import * as functions from 'firebase-functions/v2';

// Extended Stripe types to include properties that exist but aren't in the official types
interface ExtendedStripeSubscription extends Omit<Stripe.Subscription, 'canceled_at'> {
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at?: number | null;
}

interface ExtendedStripeInvoice extends Stripe.Invoice {
  payment_intent?: Stripe.PaymentIntent | string;
}

// Define Stripe secret key
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');

/**
 * Create a payment intent for subscription
 */
export const createPaymentIntent = onCall(
  {
    region: 'us-central1',
    secrets: [stripeSecretKey],
  },
  async (request) => {
    const { auth, data } = request;

    if (!auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const { priceId } = data;
    if (!priceId) {
      throw new functions.https.HttpsError('invalid-argument', 'Price ID is required');
    }

    try {
      // Get or create customer
      const customerId = await createOrGetCustomer(
        auth.uid,
        auth.token.email || '',
        auth.token.name,
        stripeSecretKey.value()
      );

      // Create subscription
      const subscription = await createSubscription(customerId, priceId, auth.uid, stripeSecretKey.value());

      const invoice = subscription.latest_invoice as string | ExtendedStripeInvoice;
      let paymentIntent: Stripe.PaymentIntent | string | undefined;

      if (typeof invoice === 'string') {
        const stripeInstance = getStripeClient(stripeSecretKey.value());
        const fullInvoice = await stripeInstance.invoices.retrieve(invoice, {
          expand: ['payment_intent'],
        });
        paymentIntent = (fullInvoice as ExtendedStripeInvoice).payment_intent;
      } else {
        paymentIntent = invoice?.payment_intent;
      }

      let clientSecret: string | null | undefined;
      if (typeof paymentIntent === 'string') {
        const stripeInstance = getStripeClient(stripeSecretKey.value());
        const pi = await stripeInstance.paymentIntents.retrieve(paymentIntent);
        clientSecret = pi.client_secret;
      } else {
        clientSecret = paymentIntent?.client_secret;
      }

      if (!clientSecret) {
        console.error('No client secret available for subscription:', subscription.id);
        throw new functions.https.HttpsError('internal', 'Payment initialization failed: No client secret available');
      }

      return {
        subscriptionId: subscription.id,
        clientSecret: clientSecret,
        customerId,
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);

      // Extract detailed error information
      let errorMessage = 'Unknown error occurred';
      let errorCode = 'unknown';

      if (error instanceof Error) {
        errorMessage = error.message;

        // Check if it's a Stripe error with additional details
        const stripeError = error as any;
        if (stripeError.type) {
          errorCode = stripeError.code || stripeError.type;
          errorMessage = `${stripeError.type}: ${errorMessage}`;
        }
      }

      console.error('Error details:', { errorMessage, errorCode });
      throw new functions.https.HttpsError('internal', `Failed to create payment intent: ${errorMessage}`);
    }
  }
);

/**
 * Verify and sync subscription status after payment
 * This is needed for local development where webhooks don't work
 */
export const verifySubscriptionStatus = onCall(
  {
    region: 'us-central1',
    secrets: [stripeSecretKey],
    cors: true, // Enable CORS for local development
  },
  async (request) => {
    const { auth, data } = request;

    if (!auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const { subscriptionId } = data;
    if (!subscriptionId) {
      throw new functions.https.HttpsError('invalid-argument', 'Subscription ID is required');
    }

    try {
      console.log(`🔍 Verifying subscription status for user ${auth.uid}, subscription ${subscriptionId}`);

      const stripeInstance = getStripeClient(stripeSecretKey.value());

      // Retrieve the subscription from Stripe
      const subscription = await stripeInstance.subscriptions.retrieve(subscriptionId);
      const extendedSubscription = subscription as unknown as ExtendedStripeSubscription;

      console.log(`📊 Subscription status from Stripe: ${subscription.status}`);

      // Update Firestore with the subscription data
      const subscriptionData: Partial<UserSubscriptionData> = {
        subscriptionId: subscription.id,
        customerId: subscription.customer as string,
        priceId: subscription.items.data[0]?.price.id,
        status: subscription.status as UserSubscriptionData['status'],
        currentPeriodStart: extendedSubscription.current_period_start * 1000,
        currentPeriodEnd: extendedSubscription.current_period_end * 1000,
        cancelAtPeriodEnd: extendedSubscription.cancel_at_period_end,
        freeWorkoutLimit: 50,
      };

      // Only add canceledAt if it exists
      if (extendedSubscription.canceled_at != null) {
        subscriptionData.canceledAt = extendedSubscription.canceled_at * 1000;
      }

      console.log(`📝 Updating Firestore for user ${auth.uid}:`, {
        status: subscriptionData.status,
        currentPeriodEnd: new Date(subscriptionData.currentPeriodEnd!).toISOString(),
      });

      await updateUserSubscription(auth.uid, subscriptionData);

      console.log(`✅ Successfully synced subscription for user ${auth.uid}`);

      return {
        success: true,
        status: subscription.status,
        currentPeriodEnd: subscriptionData.currentPeriodEnd,
      };
    } catch (error) {
      console.error('Error verifying subscription status:', error);
      throw new functions.https.HttpsError('internal', 'Failed to verify subscription status');
    }
  }
);

/**
 * Cancel user subscription
 */
export const cancelUserSubscription = onCall(
  {
    region: 'us-central1',
    secrets: [stripeSecretKey],
  },
  async (request) => {
    const { auth, data } = request;

    if (!auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const { subscriptionId } = data;
    if (!subscriptionId) {
      throw new functions.https.HttpsError('invalid-argument', 'Subscription ID is required');
    }

    try {
      const subscription = await cancelSubscription(subscriptionId, stripeSecretKey.value());
      const extendedSubscription = subscription as unknown as ExtendedStripeSubscription;

      return {
        success: true,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        currentPeriodEnd: extendedSubscription.current_period_end * 1000,
      };
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new functions.https.HttpsError('internal', 'Failed to cancel subscription');
    }
  }
);

/**
 * Reactivate user subscription
 */
export const reactivateUserSubscription = onCall(
  {
    region: 'us-central1',
    secrets: [stripeSecretKey],
  },
  async (request) => {
    const { auth, data } = request;

    if (!auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const { subscriptionId } = data;
    if (!subscriptionId) {
      throw new functions.https.HttpsError('invalid-argument', 'Subscription ID is required');
    }

    try {
      const subscription = await reactivateSubscription(subscriptionId, stripeSecretKey.value());

      return {
        success: true,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        status: subscription.status,
      };
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      throw new functions.https.HttpsError('internal', 'Failed to reactivate subscription');
    }
  }
);

/**
 * Get customer portal URL for subscription management
 */
export const getCustomerPortalUrl = onCall(
  {
    region: 'us-central1',
    secrets: [stripeSecretKey],
  },
  async (request) => {
    const { auth, data } = request;

    if (!auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const { customerId, returnUrl } = data;
    if (!customerId) {
      throw new functions.https.HttpsError('invalid-argument', 'Customer ID is required');
    }

    try {
      const stripeInstance = getStripeClient(stripeSecretKey.value());
      const session = await stripeInstance.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl || 'https://neurafit-ai-2025.web.app/profile',
      });

      return {
        url: session.url,
      };
    } catch (error) {
      console.error('Error creating customer portal session:', error);
      throw new functions.https.HttpsError('internal', 'Failed to create customer portal session');
    }
  }
);

/**
 * Get subscription details
 */
export const getSubscriptionDetails = onCall(
  {
    region: 'us-central1',
    secrets: [stripeSecretKey],
  },
  async (request) => {
    const { auth, data } = request;

    if (!auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const { subscriptionId } = data;
    if (!subscriptionId) {
      throw new functions.https.HttpsError('invalid-argument', 'Subscription ID is required');
    }

    try {
      const stripeInstance = getStripeClient(stripeSecretKey.value());
      const subscription = await stripeInstance.subscriptions.retrieve(subscriptionId, {
        expand: ['default_payment_method', 'latest_invoice'],
      });

      const extendedSubscription = subscription as unknown as ExtendedStripeSubscription;
      if (!subscription.items.data[0]) {
        throw new functions.https.HttpsError('not-found', 'Subscription has no items');
      }

      return {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: extendedSubscription.current_period_start * 1000,
        currentPeriodEnd: extendedSubscription.current_period_end * 1000,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: extendedSubscription.canceled_at ? extendedSubscription.canceled_at * 1000 : null,
        priceId: subscription.items.data[0].price.id,
        amount: subscription.items.data[0].price.unit_amount,
        currency: subscription.items.data[0].price.currency,
        interval: subscription.items.data[0].price.recurring?.interval,
      };
    } catch (error) {
      console.error('Error getting subscription details:', error);
      throw new functions.https.HttpsError('internal', 'Failed to get subscription details');
    }
  }
);

/**
 * Get billing history
 */
export const getBillingHistory = onCall(
  {
    region: 'us-central1',
    secrets: [stripeSecretKey],
  },
  async (request) => {
    const { auth, data } = request;

    if (!auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const { customerId, limit = 10 } = data;
    if (!customerId) {
      throw new functions.https.HttpsError('invalid-argument', 'Customer ID is required');
    }

    if (typeof limit !== 'number' || limit < 1 || limit > 100) {
      throw new functions.https.HttpsError('invalid-argument', 'Limit must be between 1 and 100');
    }

    try {
      const stripeInstance = getStripeClient(stripeSecretKey.value());
      const invoices = await stripeInstance.invoices.list({
        customer: customerId,
        limit,
        expand: ['data.payment_intent'],
      });

      return {
        invoices: invoices.data.map((invoice) => ({
          id: invoice.id,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: invoice.status,
          description: invoice.description || `Invoice ${invoice.number}`,
          created: invoice.created * 1000,
          invoiceUrl: invoice.hosted_invoice_url,
          pdfUrl: invoice.invoice_pdf,
        })),
      };
    } catch (error) {
      console.error('Error getting billing history:', error);
      throw new functions.https.HttpsError('internal', 'Failed to get billing history');
    }
  }
);