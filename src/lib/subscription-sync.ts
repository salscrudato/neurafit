/**
 * Subscription synchronization utilities for NeuraFit
 * Handles subscription state synchronization after payment completion
 */

import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import type { UserSubscription } from '../types/subscription'
import { notifyServiceWorkerSubscriptionUpdate } from '../utils/service-worker-messaging'

export interface SubscriptionSyncOptions {
  maxAttempts?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  timeout?: number
}

const DEFAULT_SYNC_OPTIONS: Required<SubscriptionSyncOptions> = {
  maxAttempts: 10,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 1.5,
  timeout: 120000 // 2 minutes total timeout
}

/**
 * Poll for subscription status changes after payment completion
 * Uses exponential backoff to check for subscription updates
 */
export async function pollSubscriptionStatus(
  expectedStatus: 'active' | 'trialing' = 'active',
  options: SubscriptionSyncOptions = {}
): Promise<UserSubscription | null> {
  const opts = { ...DEFAULT_SYNC_OPTIONS, ...options }
  const user = auth.currentUser
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  const startTime = Date.now()
  let attempt = 0
  let delay = opts.initialDelay

  while (attempt < opts.maxAttempts) {
    // Check timeout
    if (Date.now() - startTime > opts.timeout) {
      console.warn('Subscription polling timeout reached')
      break
    }

    attempt++
    console.log(`Polling subscription status (attempt ${attempt}/${opts.maxAttempts})`)

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        const subscription = userData.subscription as UserSubscription | undefined

        if (subscription && subscription.status === expectedStatus) {
          console.log('✅ Subscription status updated successfully:', subscription.status)
          return subscription
        }

        console.log(`Subscription status: ${subscription?.status || 'none'}, waiting for: ${expectedStatus}`)

        // Log additional debugging info
        if (subscription) {
          console.log(`📊 Polling attempt ${attempt} - Subscription ID: ${subscription.subscriptionId}`)
          console.log(`📊 Last updated: ${subscription.updatedAt ? new Date(subscription.updatedAt).toISOString() : 'unknown'}`)

          // Check if subscription was updated recently (within last 2 minutes)
          const twoMinutesAgo = Date.now() - (2 * 60 * 1000)
          if (subscription.updatedAt && subscription.updatedAt < twoMinutesAgo) {
            console.log(`⚠️ Subscription hasn't been updated recently. Last update: ${new Date(subscription.updatedAt).toISOString()}`)
          }
        }
      }
    } catch (error) {
      console.error('Error polling subscription status:', error)
    }

    // Wait before next attempt (exponential backoff)
    if (attempt < opts.maxAttempts) {
      console.log(`⏳ Waiting ${delay}ms before next attempt...`)
      await new Promise(resolve => setTimeout(resolve, delay))
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay)
    }
  }

  console.warn('Subscription polling completed without finding expected status')
  return null
}

/**
 * Force refresh subscription data from Firestore
 */
export async function refreshSubscriptionData(): Promise<UserSubscription | null> {
  const user = auth.currentUser
  
  if (!user) {
    console.warn('Cannot refresh subscription: user not authenticated')
    return null
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid))

    if (userDoc.exists()) {
      const userData = userDoc.data()
      if (userData.subscription) {
        console.log(`📊 Current subscription status: ${userData.subscription.status}`)
        console.log(`📊 Subscription details:`, {
          id: userData.subscription.subscriptionId,
          status: userData.subscription.status,
          priceId: userData.subscription.priceId,
          updatedAt: userData.subscription.updatedAt,
          currentPeriodEnd: userData.subscription.currentPeriodEnd
        })
        return userData.subscription as UserSubscription
      }
    }
  } catch (error) {
    console.error('Error refreshing subscription data:', error)
  }

  console.log('📊 No subscription data found')
  return null
}

/**
 * Wait for subscription to become active after payment
 * This is the main function to call after successful payment
 */
export async function waitForSubscriptionActivation(
  options: SubscriptionSyncOptions = {}
): Promise<UserSubscription | null> {
  console.log('🔄 Waiting for subscription activation...')
  
  try {
    // First, try immediate refresh
    const immediateResult = await refreshSubscriptionData()
    if (immediateResult && (immediateResult.status === 'active' || immediateResult.status === 'trialing')) {
      console.log('✅ Subscription already active')
      return immediateResult
    }

    // If not immediately active, start polling
    const polledResult = await pollSubscriptionStatus('active', options)
    
    if (polledResult) {
      // Notify service worker about subscription update
      notifyServiceWorkerSubscriptionUpdate(polledResult.status, polledResult)

      return polledResult
    }

    // If polling didn't work, try one more immediate refresh
    return await refreshSubscriptionData()
  } catch (error) {
    console.error('Error waiting for subscription activation:', error)
    return null
  }
}

/**
 * Check if subscription allows workout generation
 */
export function canGenerateWorkoutWithSubscription(subscription: UserSubscription | null): boolean {
  if (!subscription) return false
  
  // Active or trialing subscriptions allow unlimited workouts
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    return true
  }
  
  // Otherwise check free workout limit
  return subscription.freeWorkoutsUsed < subscription.freeWorkoutLimit
}

/**
 * Broadcast subscription update to all tabs/windows
 */
export function broadcastSubscriptionUpdate(subscription: UserSubscription): void {
  // Use BroadcastChannel if available
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel('neurafit-subscription')
      channel.postMessage({
        type: 'SUBSCRIPTION_UPDATED',
        subscription
      })
      channel.close()
    } catch (error) {
      console.warn('Failed to broadcast subscription update:', error)
    }
  }

  // Also notify service worker
  notifyServiceWorkerSubscriptionUpdate(subscription.status, subscription)
}

/**
 * Listen for subscription updates from other tabs/windows
 */
export function listenForSubscriptionUpdates(
  callback: (_subscription: UserSubscription) => void
): () => void {
  if (typeof BroadcastChannel === 'undefined') {
    return () => {} // No-op cleanup function
  }

  try {
    const channel = new BroadcastChannel('neurafit-subscription')
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SUBSCRIPTION_UPDATED' && event.data?.subscription) {
        callback(event.data.subscription)
      }
    }

    channel.addEventListener('message', handleMessage)
    
    return () => {
      channel.removeEventListener('message', handleMessage)
      channel.close()
    }
  } catch (error) {
    console.warn('Failed to set up subscription update listener:', error)
    return () => {} // No-op cleanup function
  }
}
