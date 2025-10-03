/**
 * Unified Subscription Service
 * Consolidates all subscription management functionality into a single, simplified service
 */

import { httpsCallable } from 'firebase/functions'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { auth, db, fns } from './firebase'
import type { UserSubscription } from '../types/subscription'
import { validateSubscriptionDuration } from './stripe-config'

export interface SubscriptionServiceOptions {
  enableCache?: boolean
  cacheTimeout?: number
  maxRetries?: number
}

class SubscriptionService {
  private cache = new Map<string, { data: UserSubscription | null; timestamp: number }>()
  private listeners = new Map<string, () => void>()
  private options: Required<SubscriptionServiceOptions>

  constructor(options: SubscriptionServiceOptions = {}) {
    this.options = {
      enableCache: options.enableCache ?? true,
      cacheTimeout: options.cacheTimeout ?? 300000, // 5 minutes
      maxRetries: options.maxRetries ?? 3
    }
  }

  /**
   * Get subscription data with caching and fallback mechanisms
   */
  async getSubscription(userId?: string): Promise<UserSubscription | null> {
    try {
      const uid = userId || auth.currentUser?.uid
      if (!uid) return null

      // Check cache first
      if (this.options.enableCache) {
        const cached = this.cache.get(uid)
        if (cached && Date.now() - cached.timestamp < this.options.cacheTimeout) {
          return cached.data
        }
      }

      // Fetch from Firestore
      const subscription = await this.fetchFromFirestore(uid)
      
      // Update cache
      if (this.options.enableCache) {
        this.cache.set(uid, { data: subscription, timestamp: Date.now() })
      }

      return subscription
    } catch (error) {
      console.error('Error getting subscription:', error)
      return null
    }
  }

  /**
   * Fetch subscription from Firestore
   */
  private async fetchFromFirestore(uid: string): Promise<UserSubscription | null> {
    try {
      const userDocRef = doc(db, 'users', uid)
      const userDoc = await getDoc(userDocRef)
      
      if (!userDoc.exists()) return null
      
      const userData = userDoc.data()
      return userData.subscription as UserSubscription || null
    } catch (error) {
      console.error('Error fetching from Firestore:', error)
      return null
    }
  }

  /**
   * Set up real-time subscription listener
   */
  async setupListener(
    callback: (_subscription: UserSubscription | null) => void,
    userId?: string
  ): Promise<string> {
    try {
      const uid = userId || auth.currentUser?.uid
      if (!uid) throw new Error('No user ID available')

      const userDocRef = doc(db, 'users', uid)
      const unsubscribe = onSnapshot(
        userDocRef,
        (doc) => {
          if (doc.exists()) {
            const userData = doc.data()
            const subscription = userData.subscription as UserSubscription || null
            
            // Update cache
            if (this.options.enableCache) {
              this.cache.set(uid, { data: subscription, timestamp: Date.now() })
            }
            
            callback(subscription)
          } else {
            callback(null)
          }
        },
        (error) => {
          console.error('Subscription listener error:', error)
          callback(null)
        }
      )

      const listenerId = Math.random().toString(36).substr(2, 9)
      this.listeners.set(listenerId, unsubscribe)
      
      return listenerId
    } catch (error) {
      console.error('Error setting up listener:', error)
      throw error
    }
  }

  /**
   * Remove subscription listener
   */
  removeListener(listenerId: string): void {
    const unsubscribe = this.listeners.get(listenerId)
    if (unsubscribe) {
      unsubscribe()
      this.listeners.delete(listenerId)
    }
  }

  /**
   * Create payment intent for subscription with retry logic
   */
  async createPaymentIntent(priceId: string): Promise<{ clientSecret: string } | null> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        console.log(`Creating payment intent (attempt ${attempt}/${this.options.maxRetries})`)

        const createPaymentIntentFn = httpsCallable(fns, 'createPaymentIntent')
        const result = await createPaymentIntentFn({ priceId })

        const data = result.data as { clientSecret?: string; error?: string }
        if (data.error) throw new Error(data.error)

        if (data.clientSecret) {
          console.log('Payment intent created successfully')
          return { clientSecret: data.clientSecret }
        }

        throw new Error('No client secret returned')
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        console.error(`Payment intent creation attempt ${attempt} failed:`, lastError.message)

        if (attempt < this.options.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000) // Exponential backoff, max 5s
          console.log(`Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    console.error('All payment intent creation attempts failed')
    throw lastError || new Error('Failed to create payment intent after all retries')
  }

  /**
   * Cancel subscription with retry logic
   */
  async cancelSubscription(): Promise<boolean> {
    let lastError: Error | null = null

    // First, get the subscription data to retrieve the subscriptionId
    const subscription = await this.getSubscription()
    if (!subscription) {
      throw new Error('No subscription found. Please refresh and try again.')
    }

    if (!subscription.subscriptionId) {
      throw new Error('Subscription ID not found. Unable to cancel subscription.')
    }

    const subscriptionId = subscription.subscriptionId

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        console.log(`Canceling subscription ${subscriptionId} (attempt ${attempt}/${this.options.maxRetries})`)

        const cancelFn = httpsCallable(fns, 'cancelUserSubscription')
        const result = await cancelFn({ subscriptionId })

        const data = result.data as { success?: boolean; error?: string }
        if (data.error) throw new Error(data.error)

        if (data.success) {
          console.log('Subscription cancelled successfully')
          // Clear cache to force refresh
          this.clearCache()
          return true
        }

        throw new Error('Cancellation failed - no success response')
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        console.error(`Subscription cancellation attempt ${attempt} failed:`, lastError.message)

        if (attempt < this.options.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 3000) // Exponential backoff, max 3s
          console.log(`Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    console.error('All subscription cancellation attempts failed')
    throw lastError || new Error('Failed to cancel subscription after all retries')
  }

  /**
   * Reactivate subscription
   */
  async reactivateSubscription(): Promise<boolean> {
    try {
      // First, get the subscription data to retrieve the subscriptionId
      const subscription = await this.getSubscription()
      if (!subscription) {
        throw new Error('No subscription found. Please refresh and try again.')
      }

      if (!subscription.subscriptionId) {
        throw new Error('Subscription ID not found. Unable to reactivate subscription.')
      }

      const subscriptionId = subscription.subscriptionId
      console.log(`Reactivating subscription ${subscriptionId}`)

      const reactivateFn = httpsCallable(fns, 'reactivateUserSubscription')
      const result = await reactivateFn({ subscriptionId })

      const data = result.data as { success?: boolean }

      if (data.success) {
        console.log('Subscription reactivated successfully')
        // Clear cache to force refresh
        this.clearCache()
        return true
      }

      return false
    } catch (error) {
      console.error('Error reactivating subscription:', error)
      throw error instanceof Error ? error : new Error('Failed to reactivate subscription')
    }
  }

  /**
   * Get customer portal URL
   */
  async getCustomerPortalUrl(): Promise<string | null> {
    try {
      const subscription = await this.getSubscription()
      if (!subscription?.customerId) return null

      const getPortalFn = httpsCallable(fns, 'getCustomerPortalUrl')
      const result = await getPortalFn({
        customerId: subscription.customerId,
        returnUrl: window.location.origin + '/profile'
      })

      const data = result.data as { url?: string }
      return data.url || null
    } catch (error) {
      console.error('Error getting customer portal URL:', error)
      return null
    }
  }

  /**
   * Validate subscription data integrity
   */
  validateSubscription(subscription: UserSubscription): boolean {
    // Check required fields
    if (!subscription.customerId && subscription.status !== 'incomplete') {
      console.warn('Subscription missing customer ID')
      return false
    }

    // Validate free workout limits
    if (subscription.freeWorkoutLimit !== 10) {
      console.warn('Subscription has incorrect free workout limit:', subscription.freeWorkoutLimit)
    }

    // Validate workout counts
    if (subscription.freeWorkoutsUsed > subscription.freeWorkoutLimit) {
      console.warn('Free workouts used exceeds limit')
      return false
    }

    return true
  }

  /**
   * Perform subscription health check
   */
  async performHealthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = []

    try {
      const subscription = await this.getSubscription()

      if (!subscription) {
        issues.push('No subscription data found')
        return { healthy: false, issues }
      }

      // Validate subscription data
      if (!this.validateSubscription(subscription)) {
        issues.push('Subscription data validation failed')
      }

      // Check for stale data
      const now = Date.now()
      const lastUpdate = subscription.updatedAt || 0
      const staleThreshold = 24 * 60 * 60 * 1000 // 24 hours

      if (now - lastUpdate > staleThreshold) {
        issues.push('Subscription data is stale (last updated > 24h ago)')
      }

      return { healthy: issues.length === 0, issues }
    } catch (error) {
      issues.push(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return { healthy: false, issues }
    }
  }

  /**
   * Recover from subscription sync issues
   */
  async recoverSubscriptionSync(): Promise<boolean> {
    try {
      console.log('🔄 Attempting subscription sync recovery...')

      const uid = auth.currentUser?.uid
      if (!uid) {
        console.error('No authenticated user for sync recovery')
        return false
      }

      // Clear stale cache
      this.clearCache(uid)

      // Force refresh from Firestore
      const subscription = await this.fetchFromFirestore(uid)

      if (!subscription) {
        console.warn('No subscription found during recovery')
        return false
      }

      // Validate subscription data
      const isValid = this.validateSubscription(subscription)
      if (!isValid) {
        console.warn('Subscription data validation failed during recovery')
        // Could trigger a webhook re-sync here if needed
      }

      console.log('✅ Subscription sync recovery completed')
      return true
    } catch (error) {
      console.error('❌ Subscription sync recovery failed:', error)
      return false
    }
  }

  /**
   * Handle subscription errors with automatic recovery
   */
  async handleSubscriptionError(error: Error, context: string): Promise<void> {
    console.error(`Subscription error in ${context}:`, error)

    // Attempt recovery for specific error types
    if (error.message.includes('subscription') || error.message.includes('sync')) {
      console.log('Attempting automatic recovery...')
      const recovered = await this.recoverSubscriptionSync()

      if (recovered) {
        console.log('✅ Automatic recovery successful')
        return
      }
    }

    // Log error for monitoring
    console.error(`❌ Unrecoverable subscription error in ${context}:`, {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userId: auth.currentUser?.uid
    })
  }

  /**
   * Clear cache for a user
   */
  clearCache(userId?: string): void {
    if (userId) {
      this.cache.delete(userId)
    } else {
      this.cache.clear()
    }
  }

  /**
   * Cleanup all listeners and cache
   */
  cleanup(): void {
    this.listeners.forEach(unsubscribe => unsubscribe())
    this.listeners.clear()
    this.cache.clear()
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService()

// Utility functions for subscription logic
export const canGenerateWorkout = (subscription?: UserSubscription): boolean => {
  if (!subscription) return true // Allow free workouts

  // Active subscription = unlimited workouts
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    return true
  }

  // Free tier - check usage
  const used = subscription.freeWorkoutsUsed || 0
  const limit = subscription.freeWorkoutLimit || 10
  return used < limit
}

export const getRemainingFreeWorkouts = (subscription?: UserSubscription): number => {
  if (!subscription) return 10
  if (subscription.status === 'active' || subscription.status === 'trialing') return Infinity

  const used = subscription.freeWorkoutsUsed || 0
  const limit = subscription.freeWorkoutLimit || 10
  return Math.max(0, limit - used)
}

export const hasUnlimitedWorkouts = (subscription?: UserSubscription): boolean => {
  return subscription?.status === 'active' || subscription?.status === 'trialing'
}

export const isInGracePeriod = (subscription?: UserSubscription): boolean => {
  if (!subscription || !subscription.currentPeriodEnd) return false
  
  const now = Date.now()
  const gracePeriodEnd = subscription.currentPeriodEnd + (7 * 24 * 60 * 60 * 1000) // 7 days
  
  return subscription.status === 'canceled' && now < gracePeriodEnd
}

export const getDaysRemaining = (subscription?: UserSubscription): number => {
  if (!subscription?.currentPeriodEnd) return 0
  
  const now = Date.now()
  const diffMs = subscription.currentPeriodEnd - now
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  
  return Math.max(0, diffDays)
}

export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString()
}

// Subscription duration validation
export const validateSubscriptionPeriod = (subscription?: UserSubscription): boolean => {
  if (!subscription?.currentPeriodStart || !subscription?.currentPeriodEnd) {
    return false
  }

  return validateSubscriptionDuration(
    subscription.currentPeriodStart,
    subscription.currentPeriodEnd
  )
}

export const getSubscriptionDurationDays = (subscription?: UserSubscription): number => {
  if (!subscription?.currentPeriodStart || !subscription?.currentPeriodEnd) {
    return 0
  }

  const durationMs = subscription.currentPeriodEnd - subscription.currentPeriodStart
  return Math.round(durationMs / (24 * 60 * 60 * 1000))
}
