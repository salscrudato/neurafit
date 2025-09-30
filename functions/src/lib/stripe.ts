import Stripe from 'stripe'
import { getFirestore } from 'firebase-admin/firestore'
import { initializeApp, getApps } from 'firebase-admin/app'

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  initializeApp()
}

const db = getFirestore()

// Initialize Stripe with secret key (will be set at runtime)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-08-27.basil',
})

export { stripe }

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
  name?: string
): Promise<string> {
  try {
    // Check if user already has a customer ID
    const userDoc = await db.collection('users').doc(uid).get()
    const userData = userDoc.data()
    
    if (userData?.subscription?.customerId) {
      // Verify the customer still exists in Stripe
      try {
        await stripe.customers.retrieve(userData.subscription.customerId)
        return userData.subscription.customerId
      } catch (error) {
        console.log('Customer not found in Stripe, creating new one')
      }
    }

    // Create new customer
    const customer = await stripe.customers.create({
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
  uid: string
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        firebaseUID: uid
      }
    })

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
export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  try {
    return await stripe.subscriptions.update(subscriptionId, {
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
export async function reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  try {
    return await stripe.subscriptions.update(subscriptionId, {
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
