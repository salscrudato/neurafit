/**
 * Subscription system testing utilities
 * Use these functions to test the subscription fixes in development
 */

import { auth, db } from '../lib/firebase'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import type { UserSubscription } from '../types/subscription'
import { waitForSubscriptionActivation, refreshSubscriptionData, broadcastSubscriptionUpdate } from '../lib/subscription-sync'

/**
 * Test subscription synchronization by simulating different states
 */
export class SubscriptionTester {
  private originalSubscription: UserSubscription | null = null

  /**
   * Save the current subscription state for restoration later
   */
  async saveCurrentState(): Promise<void> {
    const user = auth.currentUser
    if (!user) throw new Error('User not authenticated')

    const userDoc = await getDoc(doc(db, 'users', user.uid))
    if (userDoc.exists()) {
      this.originalSubscription = userDoc.data().subscription || null
    }
  }

  /**
   * Restore the original subscription state
   */
  async restoreOriginalState(): Promise<void> {
    const user = auth.currentUser
    if (!user) throw new Error('User not authenticated')

    if (this.originalSubscription) {
      await updateDoc(doc(db, 'users', user.uid), {
        subscription: this.originalSubscription
      })
      console.log('✅ Restored original subscription state')
    }
  }

  /**
   * Simulate an incomplete subscription (payment in progress)
   */
  async simulateIncompleteSubscription(): Promise<void> {
    const user = auth.currentUser
    if (!user) throw new Error('User not authenticated')

    const incompleteSubscription: UserSubscription = {
      customerId: 'cus_test_incomplete',
      subscriptionId: 'sub_test_incomplete',
      status: 'incomplete',
      workoutCount: 0,
      freeWorkoutsUsed: 3,
      freeWorkoutLimit: 5,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    await updateDoc(doc(db, 'users', user.uid), {
      subscription: incompleteSubscription
    })

    console.log('🔄 Simulated incomplete subscription')
  }

  /**
   * Simulate an active subscription
   */
  async simulateActiveSubscription(): Promise<void> {
    const user = auth.currentUser
    if (!user) throw new Error('User not authenticated')

    const activeSubscription: UserSubscription = {
      customerId: 'cus_test_active',
      subscriptionId: 'sub_test_active',
      priceId: 'price_test_monthly',
      status: 'active',
      currentPeriodStart: Date.now() - 86400000, // 1 day ago
      currentPeriodEnd: Date.now() + 2592000000, // 30 days from now
      cancelAtPeriodEnd: false,
      workoutCount: 10,
      freeWorkoutsUsed: 5,
      freeWorkoutLimit: 5,
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now()
    }

    await updateDoc(doc(db, 'users', user.uid), {
      subscription: activeSubscription
    })

    console.log('✅ Simulated active subscription')
    
    // Broadcast the update
    broadcastSubscriptionUpdate(activeSubscription)
  }

  /**
   * Simulate a subscription that just became active (for testing sync)
   */
  async simulateRecentActivation(): Promise<void> {
    await this.simulateIncompleteSubscription()
    
    // Wait a moment, then activate
    setTimeout(async () => {
      await this.simulateActiveSubscription()
      console.log('🎉 Simulated subscription activation after delay')
    }, 3000)
  }

  /**
   * Test the subscription polling mechanism
   */
  async testSubscriptionPolling(): Promise<void> {
    console.log('🧪 Testing subscription polling...')
    
    // Start with incomplete subscription
    await this.simulateIncompleteSubscription()
    
    // Start polling for active status
    const pollingPromise = waitForSubscriptionActivation({
      maxAttempts: 5,
      initialDelay: 1000,
      timeout: 30000
    })

    // Activate subscription after 5 seconds
    setTimeout(async () => {
      console.log('⏰ Activating subscription after delay...')
      await this.simulateActiveSubscription()
    }, 5000)

    try {
      const result = await pollingPromise
      if (result && result.status === 'active') {
        console.log('✅ Subscription polling test passed!')
      } else {
        console.log('❌ Subscription polling test failed - no active subscription found')
      }
    } catch (error) {
      console.error('❌ Subscription polling test failed:', error)
    }
  }

  /**
   * Test subscription refresh functionality
   */
  async testSubscriptionRefresh(): Promise<void> {
    console.log('🧪 Testing subscription refresh...')
    
    await this.simulateActiveSubscription()
    
    const refreshedSubscription = await refreshSubscriptionData()
    
    if (refreshedSubscription && refreshedSubscription.status === 'active') {
      console.log('✅ Subscription refresh test passed!')
    } else {
      console.log('❌ Subscription refresh test failed')
    }
  }

  /**
   * Test service worker message handling
   */
  async testServiceWorkerMessages(): Promise<void> {
    console.log('🧪 Testing service worker messages...')

    try {
      const { notifyServiceWorkerSubscriptionUpdate } = await import('./service-worker-messaging')

      // Test valid subscription update message
      const success = notifyServiceWorkerSubscriptionUpdate('active', { status: 'active' })

      if (success) {
        console.log('✅ Service worker message test passed')
      } else {
        console.log('⚠️ Service worker not available for testing')
      }
    } catch (error) {
      console.error('❌ Service worker message test failed:', error)
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting comprehensive subscription tests...')
    
    try {
      await this.saveCurrentState()
      
      await this.testSubscriptionRefresh()
      await this.testSubscriptionPolling()
      await this.testServiceWorkerMessages()
      
      console.log('✅ All subscription tests completed!')
    } catch (error) {
      console.error('❌ Test suite failed:', error)
    } finally {
      // Restore original state
      setTimeout(async () => {
        await this.restoreOriginalState()
      }, 2000)
    }
  }
}

/**
 * Quick test functions for console use
 */
export const subscriptionTests = {
  /**
   * Test the subscription system - run this in browser console
   */
  async runTests() {
    const tester = new SubscriptionTester()
    await tester.runAllTests()
  },

  /**
   * Simulate payment completion flow
   */
  async simulatePaymentSuccess() {
    const tester = new SubscriptionTester()
    await tester.saveCurrentState()
    await tester.simulateRecentActivation()
    
    // Restore after 30 seconds
    setTimeout(async () => {
      await tester.restoreOriginalState()
    }, 30000)
  },

  /**
   * Force refresh subscription data
   */
  async refreshNow() {
    const result = await refreshSubscriptionData()
    console.log('Refreshed subscription:', result)
    return result
  }
}

// Make available globally for console testing
if (typeof window !== 'undefined') {
  (window as { subscriptionTests?: typeof subscriptionTests }).subscriptionTests = subscriptionTests
}
