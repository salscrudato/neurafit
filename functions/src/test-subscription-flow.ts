import { onCall } from "firebase-functions/v2/https"
import { updateUserSubscription } from './lib/stripe'
import { db } from './lib/stripe'

/**
 * Test function to simulate successful subscription activation
 * This helps test the complete subscription flow without relying on webhooks
 */
export const testSubscriptionActivation = onCall(
  {
    region: "us-central1",
  },
  async (request) => {
    const { auth, data } = request
    
    if (!auth) {
      throw new Error('Authentication required')
    }

    const { customerId, subscriptionId } = data
    if (!customerId || !subscriptionId) {
      throw new Error('Customer ID and Subscription ID are required')
    }

    try {
      // Simulate successful subscription activation
      const subscriptionData = {
        subscriptionId: subscriptionId,
        customerId: customerId,
        status: 'active' as const,
        priceId: 'price_1SCzf7QjUU16Imh7y9nLUIvP',
        currentPeriodStart: Date.now(),
        currentPeriodEnd: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days from now
        cancelAtPeriodEnd: false,
        updatedAt: Date.now()
      }

      await updateUserSubscription(auth.uid, subscriptionData)
      
      console.log('Test subscription activation completed for user:', auth.uid)
      
      return {
        success: true,
        message: 'Subscription activated successfully',
        subscriptionData
      }
    } catch (error) {
      console.error('Error in test subscription activation:', error)
      throw new Error('Failed to activate test subscription')
    }
  }
)

/**
 * Test function to verify subscription status and workout limits
 */
export const testSubscriptionStatus = onCall(
  {
    region: "us-central1",
  },
  async (request) => {
    const { auth } = request
    
    if (!auth) {
      throw new Error('Authentication required')
    }

    try {
      const userDoc = await db.collection('users').doc(auth.uid).get()
      const userData = userDoc.data()
      const subscription = userData?.subscription

      if (!subscription) {
        return {
          hasSubscription: false,
          canGenerateWorkout: true, // New users get first workout free
          remainingFreeWorkouts: 5,
          message: 'No subscription found - new user'
        }
      }

      const isActive = subscription.status === 'active' || subscription.status === 'trialing'
      const freeWorkoutsUsed = subscription.freeWorkoutsUsed || 0
      const freeWorkoutLimit = subscription.freeWorkoutLimit || 5
      const canGenerate = isActive || freeWorkoutsUsed < freeWorkoutLimit

      return {
        hasSubscription: true,
        subscription: subscription,
        isActive,
        canGenerateWorkout: canGenerate,
        freeWorkoutsUsed,
        freeWorkoutLimit,
        remainingFreeWorkouts: isActive ? Infinity : Math.max(0, freeWorkoutLimit - freeWorkoutsUsed),
        message: isActive ? 'Active subscription - unlimited workouts' : `Free tier - ${Math.max(0, freeWorkoutLimit - freeWorkoutsUsed)} workouts remaining`
      }
    } catch (error) {
      console.error('Error checking subscription status:', error)
      throw new Error('Failed to check subscription status')
    }
  }
)
