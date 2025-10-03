import Stripe from 'stripe';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp();
}

export const db = getFirestore();

// Stripe client will be initialized with the secret key when needed
let stripeClient: Stripe | null = null;

export function getStripeClient(secretKey: string): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }
  return stripeClient;
}

// Export the stripe client for use in other modules
export const stripe = stripeClient;

// Subscription status mapping from Stripe to our types
export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'trialing'
  | 'unpaid';

export interface UserSubscriptionData {
  customerId: string;
  subscriptionId?: string;
  priceId?: string;
  status: SubscriptionStatus;
  currentPeriodStart?: number;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: number;
  workoutCount: number;
  freeWorkoutsUsed: number;
  freeWorkoutLimit: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Create or retrieve a Stripe customer for a user
 */
export async function createOrGetCustomer(
  uid: string,
  email: string,
  name?: string,
  stripeSecretKey?: string
): Promise<string> {
  try {
    const stripeInstance = stripeSecretKey ? getStripeClient(stripeSecretKey) : getStripeClient(process.env.STRIPE_SECRET_KEY!);

    // Check if user already has a customer ID
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();

    if (userData?.subscription?.customerId) {
      // Verify the customer still exists in Stripe
      try {
        await stripeInstance.customers.retrieve(userData.subscription.customerId);
        return userData.subscription.customerId;
      } catch (error) {
        console.log('Customer not found in Stripe, creating new one:', error);
      }
    }

    // Create new customer
    const customer = await stripeInstance.customers.create({
      email,
      name,
      metadata: {
        firebaseUID: uid,
      },
    });

    // Initialize subscription data in Firestore
    const subscriptionData: UserSubscriptionData = {
      customerId: customer.id,
      status: 'incomplete',
      workoutCount: 0,
      freeWorkoutsUsed: 0,
      freeWorkoutLimit: 10,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.collection('users').doc(uid).set(
      {
        subscription: subscriptionData,
      },
      { merge: true }
    );

    return customer.id;
  } catch (error) {
    console.error('Error creating/getting customer:', error);
    throw new Error('Failed to create or get Stripe customer');
  }
}

/**
 * Create a subscription for a user
 */
export async function createSubscription(
  customerId: string,
  priceId: string,
  uid: string,
  stripeSecretKey?: string
): Promise<Stripe.Subscription> {
  const stripeInstance = stripeSecretKey ? getStripeClient(stripeSecretKey) : getStripeClient(process.env.STRIPE_SECRET_KEY!);

  try {
    // First, check for existing subscriptions for this customer
    console.log('Checking for existing subscriptions for customer:', customerId);
    const existingSubscriptions = await stripeInstance.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10,
    });

    console.log(`Found ${existingSubscriptions.data.length} existing subscriptions`);

    // Cancel any incomplete subscriptions to avoid conflicts
    for (const sub of existingSubscriptions.data) {
      if (sub.status === 'incomplete' || sub.status === 'incomplete_expired') {
        console.log('Canceling incomplete subscription:', sub.id);
        try {
          await stripeInstance.subscriptions.cancel(sub.id);
        } catch (cancelError) {
          console.warn('Failed to cancel incomplete subscription:', sub.id, cancelError);
        }
      }
    }

    // Check if there's already an active subscription with the same price
    const activeSubscription = existingSubscriptions.data.find(
      (sub) =>
        (sub.status === 'active' || sub.status === 'trialing') &&
        sub.items.data.some((item) => item.price.id === priceId)
    );

    if (activeSubscription) {
      console.log('Found existing active subscription:', activeSubscription.id);
      return activeSubscription;
    }

    console.log('Creating new subscription...');
    console.log('Creating subscription with customer:', customerId, 'price:', priceId);

    const subscription = await stripeInstance.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card']
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        firebaseUID: uid,
      },
      // Ensure automatic tax calculation if needed
      automatic_tax: { enabled: false },
    });

    console.log('Subscription created:', subscription.id, 'status:', subscription.status);

    // Log invoice details for debugging
    const invoice = subscription.latest_invoice as string | Stripe.Invoice | null;
    let expandedInvoice: Stripe.Invoice | null = null;

    if (typeof invoice === 'string') {
      expandedInvoice = await stripeInstance.invoices.retrieve(invoice, {
        expand: ['payment_intent'],
      });
    } else if (invoice) {
      expandedInvoice = invoice;
    }

    if (expandedInvoice) {
      console.log('Invoice:', expandedInvoice.id, 'status:', expandedInvoice.status);
      const invoiceWithPaymentIntent = expandedInvoice as Stripe.Invoice & { payment_intent?: Stripe.PaymentIntent | string };
      console.log(
        'Payment intent on invoice:',
        invoiceWithPaymentIntent.payment_intent
          ? typeof invoiceWithPaymentIntent.payment_intent === 'string'
            ? invoiceWithPaymentIntent.payment_intent
            : invoiceWithPaymentIntent.payment_intent.id
          : 'none'
      );
    }

    // If no payment intent exists on the invoice, this might be a zero-amount invoice
    // or there might be an issue with the subscription setup
    const invoiceWithPaymentIntent = expandedInvoice as Stripe.Invoice & { payment_intent?: Stripe.PaymentIntent | string };
    if (expandedInvoice && !invoiceWithPaymentIntent.payment_intent) {
      console.log('No payment intent found on invoice');
      console.log('Invoice amount_due:', expandedInvoice.amount_due);
      console.log('Invoice currency:', expandedInvoice.currency);
      console.log('Invoice total:', expandedInvoice.total);

      // Check if this is a zero-amount invoice (like a trial)
      if (expandedInvoice.amount_due === 0) {
        console.log('Zero-amount invoice, no payment intent needed');
        return subscription;
      }

      // For non-zero invoices without payment intents, this indicates an issue with subscription setup
      console.log('Invoice has amount due but no payment intent - this should not happen with default_incomplete');
      console.log('Attempting to finalize the invoice to trigger payment intent creation...');

      try {
        // Try to finalize the invoice which should create a payment intent
        const finalizedInvoice = await stripeInstance.invoices.finalizeInvoice(expandedInvoice.id!, {
          expand: ['payment_intent'],
        });

        console.log('Invoice finalized:', finalizedInvoice.id, 'status:', finalizedInvoice.status);

        const finalizedInvoiceWithPI = finalizedInvoice as Stripe.Invoice & { payment_intent?: Stripe.PaymentIntent | string };
        if (finalizedInvoiceWithPI.payment_intent) {
          console.log('Payment intent created after finalization:',
            typeof finalizedInvoiceWithPI.payment_intent === 'string'
              ? finalizedInvoiceWithPI.payment_intent
              : finalizedInvoiceWithPI.payment_intent.id
          );

          // Return the subscription with the finalized invoice
          return {
            ...subscription,
            latest_invoice: finalizedInvoice,
          } as Stripe.Subscription;
        }

        // If still no payment intent, create one manually as last resort
        console.log('Still no payment intent after finalization, creating manually...');
        const paymentIntent = await stripeInstance.paymentIntents.create({
          amount: finalizedInvoice.amount_due,
          currency: finalizedInvoice.currency,
          customer: customerId,
          payment_method_types: ['card'],
          metadata: {
            invoice_id: finalizedInvoice.id || '',
            subscription_id: subscription.id,
            firebaseUID: uid,
          },
        });

        console.log('Manual payment intent created:', paymentIntent.id);

        // Return the subscription with the manual payment intent
        return {
          ...subscription,
          latest_invoice: {
            ...finalizedInvoice,
            payment_intent: paymentIntent,
          },
        } as Stripe.Subscription;

      } catch (piError) {
        console.error('Error handling invoice without payment intent:', piError);
        throw piError;
      }
    }

    return subscription;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw new Error('Failed to create subscription');
  }
}

/**
 * Update user subscription data in Firestore
 */
export async function updateUserSubscription(
  uid: string,
  subscriptionData: Partial<UserSubscriptionData>
): Promise<void> {
  try {
    console.log(`📝 Updating subscription for user ${uid}:`, subscriptionData);

    // Get current subscription data to preserve important fields
    const userRef = db.collection('users').doc(uid);
    const currentDoc = await userRef.get();
    const currentSubscription = currentDoc.data()?.subscription as UserSubscriptionData || {};

    // Ensure critical fields are preserved and validated
    const updatedSubscription: Partial<UserSubscriptionData> = {
      ...currentSubscription,
      ...subscriptionData,
      // Ensure free workout limit is always 10
      freeWorkoutLimit: 10,
      // Preserve workout counts if not explicitly updated
      workoutCount: subscriptionData.workoutCount ?? currentSubscription.workoutCount ?? 0,
      freeWorkoutsUsed: subscriptionData.freeWorkoutsUsed ?? currentSubscription.freeWorkoutsUsed ?? 0,
      // Always update timestamp
      updatedAt: Date.now(),
      // Preserve creation timestamp
      createdAt: currentSubscription.createdAt ?? Date.now(),
    };

    // Validate subscription period for active subscriptions
    if (updatedSubscription.status === 'active' &&
        updatedSubscription.currentPeriodStart &&
        updatedSubscription.currentPeriodEnd) {
      const duration = updatedSubscription.currentPeriodEnd - updatedSubscription.currentPeriodStart;
      const expectedDuration = 30 * 24 * 60 * 60 * 1000; // 30 days
      const tolerance = 24 * 60 * 60 * 1000; // 1 day tolerance

      if (Math.abs(duration - expectedDuration) > tolerance) {
        console.warn(`⚠️ Subscription period is not exactly 30 days: ${duration / (24 * 60 * 60 * 1000)} days`);
      }
    }

    await userRef.set(
      {
        subscription: updatedSubscription,
      },
      { merge: true }
    );

    console.log(`✅ Successfully updated subscription for user ${uid}:`, {
      status: updatedSubscription.status,
      customerId: updatedSubscription.customerId,
      subscriptionId: updatedSubscription.subscriptionId,
      workoutCount: updatedSubscription.workoutCount,
      freeWorkoutsUsed: updatedSubscription.freeWorkoutsUsed,
    });

    // Verify the update was successful
    const updatedDoc = await userRef.get();
    const updatedData = updatedDoc.data();
    console.log(`🔍 Verified subscription status for user ${uid}:`, updatedData?.subscription?.status);

  } catch (error) {
    console.error(`❌ Error updating user subscription for ${uid}:`, error);
    throw new Error(`Failed to update user subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get user by Stripe customer ID with enhanced lookup
 */
export async function getUserByCustomerId(customerId: string): Promise<string | null> {
  try {
    console.log(`🔍 Looking up user for customer ID: ${customerId}`);

    // First, try to find user by customer ID in subscription
    const usersRef = db.collection('users');
    const query = usersRef.where('subscription.customerId', '==', customerId);
    const snapshot = await query.get();

    if (!snapshot.empty) {
      const userId = snapshot.docs[0].id;
      console.log(`✅ Found user by customer ID: ${userId}`);
      return userId;
    }

    // If not found, try to get customer from Stripe and match by email
    console.log('🔍 Customer ID not found in profiles, checking Stripe for email...');

    try {
      const stripeInstance = getStripeClient(process.env.STRIPE_SECRET_KEY!);
      const customer = await stripeInstance.customers.retrieve(customerId) as Stripe.Customer;

      if (customer.email) {
        console.log(`📧 Found customer email: ${customer.email}`);

        // Look up user by email
        const emailQuery = usersRef.where('email', '==', customer.email);
        const emailSnapshot = await emailQuery.get();

        if (!emailSnapshot.empty) {
          const userId = emailSnapshot.docs[0].id;
          console.log(`✅ Found user by email: ${userId}`);

          // Update the user's profile with the customer ID for future lookups
          await updateUserSubscription(userId, { customerId });
          console.log('📝 Updated user profile with customer ID');

          return userId;
        }
      }
    } catch (stripeError) {
      console.error('Error fetching customer from Stripe:', stripeError);
    }

    console.log(`❌ No user found for customer ID: ${customerId}`);
    return null;
  } catch (error) {
    console.error('Error getting user by customer ID:', error);
    return null;
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  stripeSecretKey?: string
): Promise<Stripe.Subscription> {
  const stripeInstance = stripeSecretKey ? getStripeClient(stripeSecretKey) : getStripeClient(process.env.STRIPE_SECRET_KEY!);

  try {
    return await stripeInstance.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw new Error('Failed to cancel subscription');
  }
}

/**
 * Reactivate a subscription
 */
export async function reactivateSubscription(
  subscriptionId: string,
  stripeSecretKey?: string
): Promise<Stripe.Subscription> {
  const stripeInstance = stripeSecretKey ? getStripeClient(stripeSecretKey) : getStripeClient(process.env.STRIPE_SECRET_KEY!);

  try {
    return await stripeInstance.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    throw new Error('Failed to reactivate subscription');
  }
}

/**
 * Increment workout count for a user
 */
export async function incrementWorkoutCount(uid: string): Promise<void> {
  try {
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (!userData?.subscription) {
      // Initialize subscription data if it doesn't exist
      const subscriptionData: UserSubscriptionData = {
        customerId: '',
        status: 'incomplete',
        workoutCount: 1,
        freeWorkoutsUsed: 1,
        freeWorkoutLimit: 10,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await userRef.set(
        {
          subscription: subscriptionData,
        },
        { merge: true }
      );
    } else {
      // Increment counters
      const currentSubscription = userData.subscription as UserSubscriptionData;
      const isActive = currentSubscription.status === 'active' || currentSubscription.status === 'trialing';

      await userRef.set(
        {
          subscription: {
            ...currentSubscription,
            workoutCount: (currentSubscription.workoutCount || 0) + 1,
            freeWorkoutsUsed: isActive
              ? currentSubscription.freeWorkoutsUsed || 0
              : (currentSubscription.freeWorkoutsUsed || 0) + 1,
            updatedAt: Date.now(),
          },
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.error('Error incrementing workout count:', error);
    throw new Error('Failed to increment workout count');
  }
}