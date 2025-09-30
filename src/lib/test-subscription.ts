import { httpsCallable } from 'firebase/functions'
import { fns } from './firebase'

// Test functions for subscription flow
const testSubscriptionActivationFn = httpsCallable(fns, 'testSubscriptionActivation')
const testSubscriptionStatusFn = httpsCallable(fns, 'testSubscriptionStatus')

/**
 * Test subscription activation
 */
export async function testSubscriptionActivation(customerId: string, subscriptionId: string) {
  try {
    const result = await testSubscriptionActivationFn({
      customerId,
      subscriptionId
    })
    return result.data
  } catch (error) {
    console.error('Error testing subscription activation:', error)
    throw error
  }
}

/**
 * Test subscription status
 */
export async function testSubscriptionStatus() {
  try {
    const result = await testSubscriptionStatusFn({})
    return result.data
  } catch (error) {
    console.error('Error testing subscription status:', error)
    throw error
  }
}
