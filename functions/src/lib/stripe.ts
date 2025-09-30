import Stripe from 'stripe'
import { getFirestore } from 'firebase-admin/firestore'
import { initializeApp, getApps } from 'firebase-admin/app'

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp()
}

export const db = getFirestore()

// Stripe client will be initialized with the secret key when needed
let stripeClient: Stripe | null = null

export function getStripeClient(secretKey: string): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2025-08-27.basil',
    })
  }
  return stripeClient
}

// Legacy export for backward compatibility - will be removed
export const stripe = new Stripe('sk_test_placeholder', {
  apiVersion: '2025-08-27.basil',
})

// Subscription status mapping from Stripe to our types
export type SubscriptionStatus = 
  | 'active'
  | 'canceled' 
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'trialing'
  | 'unpaid'

export interface UserSubscriptionData {
  customerId: string
  subscriptionId?: string
  priceId?: string
  status: SubscriptionStatus
  currentPeriodStart?: number
  currentPeriodEnd?: number
  cancelAtPeriodEnd?: boolean
  canceledAt?: number
  workoutCount: number
  freeWorkoutsUsed: number
  freeWorkoutLimit: number
  createdAt: number
  updatedAt: number
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
  const stripeInstance = stripeSecretKey ? getStripeClient(stripeSecretKey) : stripe

  try {
    // Check if user already has a customer ID
    const userDoc = await db.collection('users').doc(uid).get()
    const userData = userDoc.data()

    if (userData?.subscription?.customerId) {
      // Verify the customer still exists in Stripe
      try {
        await stripeInstance.customers.retrieve(userData.subscription.customerId)
        return userData.subscription.customerId
      } catch {
        console.log('Customer not found in Stripe, creating new one')
      }
    }

    // Create new customer
    const customer = await stripeInstance.customers.create({
      email,
      name,
      metadata: {
        firebaseUID: uid
      }
    })

    // Initialize subscription data in Firestore
    const subscriptionData: UserSubscriptionData = {
      customerId: customer.id,
      status: 'incomplete',
      workoutCount: 0,
      freeWorkoutsUsed: 0,
      freeWorkoutLimit: 5,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    await db.collection('users').doc(uid).set({
      subscription: subscriptionData
    }, { merge: true })

    return customer.id
  } catch (error) {
    console.error('Error creating/getting customer:', error)
    throw error
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
  const stripeInstance = stripeSecretKey ? getStripeClient(stripeSecretKey) : stripe

  try {
    // First, check for existing subscriptions for this customer
    console.log('Checking for existing subscriptions for customer:', customerId)
    const existingSubscriptions = await stripeInstance.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10
    })

    console.log(`Found ${existingSubscriptions.data.length} existing subscriptions`)

    // Cancel any incomplete subscriptions to avoid conflicts
    for (const sub of existingSubscriptions.data) {
      if (sub.status === 'incomplete' || sub.status === 'incomplete_expired') {
        console.log('Canceling incomplete subscription:', sub.id)
        try {
          await stripeInstance.subscriptions.cancel(sub.id)
        } catch (cancelError) {
          console.warn('Failed to cancel incomplete subscription:', sub.id, cancelError)
        }
      }
    }

    // Check if there's already an active subscription with the same price
    const activeSubscription = existingSubscriptions.data.find(sub =>
      (sub.status === 'active' || sub.status === 'trialing') &&
      sub.items.data.some(item => item.price.id === priceId)
    )

    if (activeSubscription) {
      console.log('Found existing active subscription:', activeSubscription.id)
      return activeSubscription
    }

    console.log('Creating new subscription...')
    console.log('Creating subscription with customer:', customerId, 'price:', priceId)

    const subscription = await stripeInstance.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        firebaseUID: uid
      }
    })

    console.log('Subscription created:', subscription.id, 'status:', subscription.status)

    // Log invoice details for debugging
    const invoice = subscription.latest_invoice as any
    if (invoice) {
      console.log('Invoice:', invoice.id, 'status:', invoice.status)
      console.log('Payment intent on invoice:', invoice.payment_intent ? invoice.payment_intent.id : 'none')
    }

    // If no payment intent exists on the invoice, this might be a zero-amount invoice
    // or there might be an issue with the subscription setup
    if (invoice && !invoice.payment_intent) {
      console.log('No payment intent found on invoice')
      console.log('Invoice amount_due:', invoice.amount_due)
      console.log('Invoice currency:', invoice.currency)
      console.log('Invoice total:', invoice.total)

      // Check if this is a zero-amount invoice (like a trial)
      if (invoice.amount_due === 0) {
        console.log('Zero-amount invoice, no payment intent needed')
        return subscription
      }

      // For non-zero invoices without payment intents, create a payment intent manually
      console.log('Invoice has amount due but no payment intent, creating payment intent manually...')

      try {
        const paymentIntent = await stripeInstance.paymentIntents.create({
          amount: invoice.amount_due,
          currency: invoice.currency,
          customer: customerId,
          payment_method_types: ['card'],
          metadata: {
            invoice_id: invoice.id,
            subscription_id: subscription.id,
            firebaseUID: uid
          }
        })

        console.log('Manual payment intent created:', paymentIntent.id)
        console.log('Payment intent client secret:', paymentIntent.client_secret ? 'present' : 'missing')

        // Return a modified subscription object with the payment intent
        return {
          ...subscription,
          latest_invoice: {
            ...invoice,
            payment_intent: paymentIntent
          }
        } as Stripe.Subscription
      } catch (piError) {
        console.error('Error creating manual payment intent:', piError)
        throw piError
      }
    }

    return subscription
  } catch (error) {
    console.error('Error creating subscription:', error)
    throw error
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
    await db.collection('users').doc(uid).set({
      subscription: {
        ...subscriptionData,
        updatedAt: Date.now()
      }
    }, { merge: true })
  } catch (error) {
    console.error('Error updating user subscription:', error)
    throw error
  }
}

/**
 * Get user by Stripe customer ID
 */
export async function getUserByCustomerId(customerId: string): Promise<string | null> {
  try {
    const usersRef = db.collection('users')
    const query = usersRef.where('subscription.customerId', '==', customerId)
    const snapshot = await query.get()
    
    if (snapshot.empty) {
      return null
    }
    
    return snapshot.docs[0].id
  } catch (error) {
    console.error('Error getting user by customer ID:', error)
    return null
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string, stripeSecretKey?: string): Promise<Stripe.Subscription> {
  const stripeInstance = stripeSecretKey ? getStripeClient(stripeSecretKey) : stripe

  try {
    return await stripeInstance.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    })
  } catch (error) {
    console.error('Error canceling subscription:', error)
    throw error
  }
}

/**
 * Reactivate a subscription
 */
export async function reactivateSubscription(subscriptionId: string, stripeSecretKey?: string): Promise<Stripe.Subscription> {
  const stripeInstance = stripeSecretKey ? getStripeClient(stripeSecretKey) : stripe

  try {
    return await stripeInstance.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false
    })
  } catch (error) {
    console.error('Error reactivating subscription:', error)
    throw error
  }
}

/**
 * Increment workout count for a user
 */
export async function incrementWorkoutCount(uid: string): Promise<void> {
  try {
    const userRef = db.collection('users').doc(uid)
    const userDoc = await userRef.get()
    const userData = userDoc.data()
    
    if (!userData?.subscription) {
      // Initialize subscription data if it doesn't exist
      const subscriptionData: UserSubscriptionData = {
        customerId: '',
        status: 'incomplete',
        workoutCount: 1,
        freeWorkoutsUsed: 1,
        freeWorkoutLimit: 5,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      
      await userRef.set({
        subscription: subscriptionData
      }, { merge: true })
    } else {
      // Increment counters
      const currentSubscription = userData.subscription
      const isActive = currentSubscription.status === 'active' || currentSubscription.status === 'trialing'
      
      await userRef.set({
        subscription: {
          ...currentSubscription,
          workoutCount: (currentSubscription.workoutCount || 0) + 1,
          freeWorkoutsUsed: isActive 
            ? currentSubscription.freeWorkoutsUsed 
            : (currentSubscription.freeWorkoutsUsed || 0) + 1,
          updatedAt: Date.now()
        }
      }, { merge: true })
    }
  } catch (error) {
    console.error('Error incrementing workout count:', error)
    throw error
  }
}
