/**
 * Comprehensive Subscription Persistence Fix
 * Addresses subscription status not persisting across sessions
 */

import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { auth, db, fns } from './firebase'
import type { UserSubscription } from '../types/subscription'

interface PersistenceOptions {
  forceRefresh?: boolean
  useCache?: boolean
  maxRetries?: number
  retryDelay?: number
}

interface SubscriptionState {
  subscription: UserSubscription | null
  lastUpdated: number
  source: 'firestore' | 'cache' | 'stripe' | 'manual'
  isValid: boolean
}

class SubscriptionPersistenceManager {
  private cache = new Map<string, SubscriptionState>()
  private listeners = new Map<string, () => void>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  private readonly STORAGE_KEY = 'neurafit_subscription_state'

  /**
   * Get subscription with multiple fallback mechanisms
   */
  async getSubscription(options: PersistenceOptions = {}): Promise<UserSubscription | null> {
    const user = auth.currentUser
    if (!user) return null

    const {
      forceRefresh = false,
      useCache = true,
      maxRetries = 3,
      retryDelay = 1000
    } = options

    console.log('🔍 Getting subscription with persistence manager...')

    // Step 1: Check cache first (if not forcing refresh)
    if (!forceRefresh && useCache) {
      const cached = this.getCachedSubscription(user.uid)
      if (cached && cached.isValid) {
        console.log('✅ Using cached subscription:', cached.source)
        return cached.subscription
      }
    }

    // Step 2: Try Firestore
    let attempt = 0
    while (attempt < maxRetries) {
      try {
        const firestoreResult = await this.getFromFirestore(user.uid)
        if (firestoreResult) {
          this.setCachedSubscription(user.uid, firestoreResult, 'firestore')
          this.persistToLocalStorage(user.uid, firestoreResult)
          return firestoreResult
        }
      } catch (error) {
        console.warn(`Firestore attempt ${attempt + 1} failed:`, error)
      }

      attempt++
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    }

    // Step 3: Try Stripe verification as fallback
    try {
      const stripeResult = await this.verifyWithStripe(user.uid)
      if (stripeResult) {
        this.setCachedSubscription(user.uid, stripeResult, 'stripe')
        this.persistToLocalStorage(user.uid, stripeResult)
        return stripeResult
      }
    } catch (error) {
      console.warn('Stripe verification failed:', error)
    }

    // Step 4: Try local storage as last resort
    const localResult = this.getFromLocalStorage(user.uid)
    if (localResult) {
      console.log('⚠️ Using local storage fallback')
      this.setCachedSubscription(user.uid, localResult, 'cache')
      return localResult
    }

    console.warn('❌ All subscription retrieval methods failed')
    return null
  }

  /**
   * Force update subscription in all storage layers
   */
  async forceUpdateSubscription(
    subscriptionId: string,
    updates: Partial<UserSubscription>
  ): Promise<boolean> {
    const user = auth.currentUser
    if (!user) return false

    console.log('🔄 Force updating subscription:', subscriptionId)

    try {
      // Step 1: Update Firestore
      const userDocRef = doc(db, 'users', user.uid)
      await updateDoc(userDocRef, {
        'subscription': {
          ...updates,
          updatedAt: Date.now()
        }
      })

      // Step 2: Update cache
      const updatedSubscription = updates as UserSubscription
      this.setCachedSubscription(user.uid, updatedSubscription, 'manual')

      // Step 3: Update local storage
      this.persistToLocalStorage(user.uid, updatedSubscription)

      // Step 4: Trigger listeners
      this.notifyListeners(user.uid, updatedSubscription)

      console.log('✅ Force update completed successfully')
      return true
    } catch (error) {
      console.error('❌ Force update failed:', error)
      return false
    }
  }

  /**
   * Set up real-time listener with persistence
   */
  setupPersistentListener(uid: string, callback: (_subscription: UserSubscription | null) => void): () => void {
    console.log('🔗 Setting up persistent listener for user:', uid)

    const userDocRef = doc(db, 'users', uid)
    
    const unsubscribe = onSnapshot(
      userDocRef,
      (doc) => {
        const data = doc.data()
        const subscription = data?.subscription as UserSubscription | null

        if (subscription) {
          console.log('📡 Received subscription update:', subscription.status)
          
          // Update cache
          this.setCachedSubscription(uid, subscription, 'firestore')
          
          // Update local storage
          this.persistToLocalStorage(uid, subscription)
          
          // Notify callback
          callback(subscription)
        } else {
          console.log('📡 No subscription data in document')
          callback(null)
        }
      },
      (error) => {
        console.error('❌ Subscription listener error:', error)
        
        // Try to use cached data as fallback
        const cached = this.getCachedSubscription(uid)
        if (cached && cached.isValid) {
          console.log('🔄 Using cached data due to listener error')
          callback(cached.subscription)
        } else {
          callback(null)
        }
      }
    )

    // Store listener for cleanup
    this.listeners.set(uid, unsubscribe)

    return unsubscribe
  }

  /**
   * Manual subscription activation for stuck subscriptions
   */
  async manualActivateSubscription(subscriptionId: string): Promise<boolean> {
    console.log('🚀 Manual activation for subscription:', subscriptionId)

    try {
      // Step 1: Force webhook processing
      const forceWebhookFn = httpsCallable(fns, 'forceWebhookProcessing')
      const webhookResult = await forceWebhookFn({ subscriptionId })
      
      if ((webhookResult.data as { success?: boolean }).success) {
        console.log('✅ Webhook processing successful')
        return true
      }

      // Step 2: Manual sync
      const manualSyncFn = httpsCallable(fns, 'manualSyncSubscription')
      const syncResult = await manualSyncFn({ subscriptionId })
      
      if ((syncResult.data as { success?: boolean }).success) {
        console.log('✅ Manual sync successful')
        return true
      }

      // Step 3: Direct Firestore update as last resort
      const user = auth.currentUser
      if (user) {
        const activeSubscription: UserSubscription = {
          subscriptionId,
          customerId: '', // Will be filled by backend
          status: 'active',
          priceId: 'price_1SCzf7QjUU16Imh7y9nLUIvP',
          workoutCount: 0,
          freeWorkoutsUsed: 0,
          freeWorkoutLimit: 5,
          currentPeriodStart: Date.now(),
          currentPeriodEnd: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
          cancelAtPeriodEnd: false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }

        return await this.forceUpdateSubscription(subscriptionId, activeSubscription)
      }

      return false
    } catch (error) {
      console.error('❌ Manual activation failed:', error)
      return false
    }
  }

  // Private helper methods
  private async getFromFirestore(uid: string): Promise<UserSubscription | null> {
    const userDocRef = doc(db, 'users', uid)
    const docSnap = await getDoc(userDocRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data()
      return data.subscription as UserSubscription || null
    }
    
    return null
  }

  private async verifyWithStripe(_uid: string): Promise<UserSubscription | null> {
    try {
      const _getStatusFn = httpsCallable(fns, 'getStripeSubscriptionStatus')
      // This would need the subscription ID - in practice, you'd store this
      // For now, return null as we can't verify without subscription ID
      return null
    } catch (error) {
      console.error('Stripe verification failed:', error)
      return null
    }
  }

  private getCachedSubscription(uid: string): SubscriptionState | null {
    const cached = this.cache.get(uid)
    if (!cached) return null

    const isExpired = Date.now() - cached.lastUpdated > this.CACHE_TTL
    if (isExpired) {
      this.cache.delete(uid)
      return null
    }

    return cached
  }

  private setCachedSubscription(
    uid: string,
    subscription: UserSubscription,
    source: SubscriptionState['source']
  ): void {
    this.cache.set(uid, {
      subscription,
      lastUpdated: Date.now(),
      source,
      isValid: true
    })
  }

  private persistToLocalStorage(uid: string, subscription: UserSubscription): void {
    try {
      const storageData = {
        uid,
        subscription,
        timestamp: Date.now()
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storageData))
    } catch (error) {
      console.warn('Failed to persist to localStorage:', error)
    }
  }

  private getFromLocalStorage(uid: string): UserSubscription | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return null

      const data = JSON.parse(stored)
      if (data.uid !== uid) return null

      // Check if data is not too old (1 hour max)
      const isOld = Date.now() - data.timestamp > 60 * 60 * 1000
      if (isOld) return null

      return data.subscription
    } catch (error) {
      console.warn('Failed to get from localStorage:', error)
      return null
    }
  }

  private notifyListeners(uid: string, subscription: UserSubscription): void {
    // This would notify other components about the update
    window.dispatchEvent(new CustomEvent('subscription-updated', {
      detail: { uid, subscription }
    }))
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear()
    localStorage.removeItem(this.STORAGE_KEY)
    console.log('🗑️ Subscription cache cleared')
  }

  /**
   * Cleanup listeners
   */
  cleanup(): void {
    this.listeners.forEach(unsubscribe => unsubscribe())
    this.listeners.clear()
    this.clearCache()
  }
}

// Export singleton instance
export const subscriptionPersistenceManager = new SubscriptionPersistenceManager()

// Convenience functions
export async function getPersistedSubscription(options?: PersistenceOptions): Promise<UserSubscription | null> {
  return subscriptionPersistenceManager.getSubscription(options)
}

export async function fixStuckSubscription(subscriptionId: string): Promise<boolean> {
  return subscriptionPersistenceManager.manualActivateSubscription(subscriptionId)
}

export function clearSubscriptionCache(): void {
  subscriptionPersistenceManager.clearCache()
}
