/**
 * Unified Subscription Service
 * Consolidates all subscription management functionality into a single, simplified service
 */

import { httpsCallable } from 'firebase/functions'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { auth, db, fns } from './firebase'
import type { UserSubscription } from '../types/subscription'

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
   * Create payment intent for subscription
   */
  async createPaymentIntent(priceId: string): Promise<{ clientSecret: string } | null> {
    try {
      const createPaymentIntentFn = httpsCallable(fns, 'createPaymentIntent')
      const result = await createPaymentIntentFn({ priceId })
      
      const data = result.data as { clientSecret?: string }
      return data.clientSecret ? { clientSecret: data.clientSecret } : null
    } catch (error) {
      console.error('Error creating payment intent:', error)
      return null
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(): Promise<boolean> {
    try {
      const cancelFn = httpsCallable(fns, 'cancelUserSubscription')
      const result = await cancelFn()
      
      const data = result.data as { success?: boolean }
      return data.success || false
    } catch (error) {
      console.error('Error canceling subscription:', error)
      return false
    }
  }

  /**
   * Reactivate subscription
   */
  async reactivateSubscription(): Promise<boolean> {
    try {
      const reactivateFn = httpsCallable(fns, 'reactivateUserSubscription')
      const result = await reactivateFn()
      
      const data = result.data as { success?: boolean }
      return data.success || false
    } catch (error) {
      console.error('Error reactivating subscription:', error)
      return false
    }
  }

  /**
   * Get customer portal URL
   */
  async getCustomerPortalUrl(): Promise<string | null> {
    try {
      const getPortalFn = httpsCallable(fns, 'getCustomerPortalUrl')
      const result = await getPortalFn()
      
      const data = result.data as { url?: string }
      return data.url || null
    } catch (error) {
      console.error('Error getting customer portal URL:', error)
      return null
    }
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
  const limit = subscription.freeWorkoutLimit || 5
  return used < limit
}

export const getRemainingFreeWorkouts = (subscription?: UserSubscription): number => {
  if (!subscription) return 5
  if (subscription.status === 'active' || subscription.status === 'trialing') return Infinity

  const used = subscription.freeWorkoutsUsed || 0
  const limit = subscription.freeWorkoutLimit || 5
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
