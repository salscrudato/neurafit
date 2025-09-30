import { onCall } from "firebase-functions/v2/https"
import { defineSecret } from "firebase-functions/params"
import { getStripeClient } from './lib/stripe'

// Define Stripe secret key
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY")

/**
 * Cleanup incomplete subscriptions for a customer
 */
export const cleanupSubscriptions = onCall(
  {
    region: "us-central1",
    secrets: [stripeSecretKey],
  },
  async (request) => {
    const { auth, data } = request
    
    if (!auth) {
      throw new Error('Authentication required')
    }

    const { customerId } = data
    if (!customerId) {
      throw new Error('Customer ID is required')
    }

    try {
      const stripeInstance = getStripeClient(stripeSecretKey.value())
      
      // Get all subscriptions for the customer
      const subscriptions = await stripeInstance.subscriptions.list({
        customer: customerId,
        status: 'all',
        limit: 100
      })

      console.log(`Found ${subscriptions.data.length} subscriptions for customer ${customerId}`)

      const cleanedUp = []
      
      // Cancel incomplete subscriptions
      for (const subscription of subscriptions.data) {
        if (subscription.status === 'incomplete' || subscription.status === 'incomplete_expired') {
          console.log(`Canceling incomplete subscription: ${subscription.id}`)
          try {
            await stripeInstance.subscriptions.cancel(subscription.id)
            cleanedUp.push(subscription.id)
          } catch (error) {
            console.error(`Failed to cancel subscription ${subscription.id}:`, error)
          }
        }
      }

      return {
        success: true,
        cleanedUp,
        message: `Cleaned up ${cleanedUp.length} incomplete subscriptions`
      }
    } catch (error) {
      console.error('Error cleaning up subscriptions:', error)
      throw new Error('Failed to cleanup subscriptions')
    }
  }
)
